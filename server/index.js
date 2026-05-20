import express from 'express';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || '0.0.0.0';
const statuses = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../shared/statuses.json'), 'utf8'));
const allowedStatusIds = new Set(statuses.map((status) => status.id));

app.use(express.json());

let users = [
  createUser('Home'),
  createUser('Guest'),
];

function nowIso() {
  return new Date().toISOString();
}

function createUser(name) {
  return {
    id: randomUUID(),
    name: name.trim(),
    status: 'ok',
    updatedAt: nowIso(),
    autoClearAt: null,
  };
}

function clearExpiredStatuses() {
  const now = Date.now();

  users = users.map((user) => {
    if (user.status === 'dnd' && user.autoClearAt && new Date(user.autoClearAt).getTime() <= now) {
      return {
        ...user,
        status: 'ok',
        updatedAt: nowIso(),
        autoClearAt: null,
      };
    }

    return user;
  });
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    status: user.status,
    updatedAt: user.updatedAt,
    autoClearAt: user.autoClearAt,
  };
}

function getAutoClearAt(status, autoClearMinutes) {
  if (status !== 'dnd') return null;
  if (autoClearMinutes === null || autoClearMinutes === undefined || autoClearMinutes === 'none') {
    return null;
  }

  const minutes = Number(autoClearMinutes);
  if (![30, 60, 120].includes(minutes)) {
    const error = new Error('Auto clear time must be 30, 60, 120, or none.');
    error.status = 400;
    throw error;
  }

  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

app.get('/api/users', (_req, res) => {
  clearExpiredStatuses();
  res.json({ users: users.map(sanitizeUser), statuses });
});

app.post('/api/users', (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name) {
      res.status(400).json({ message: 'Name is required.' });
      return;
    }

    const user = createUser(name);
    users = [...users, user];
    res.status(201).json({ user: sanitizeUser(user) });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/users/:id/status', (req, res, next) => {
  try {
    const { id } = req.params;
    const status = String(req.body?.status || '');

    if (!allowedStatusIds.has(status)) {
      res.status(400).json({ message: 'Unknown status.' });
      return;
    }

    const userIndex = users.findIndex((user) => user.id === id);
    if (userIndex === -1) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    const autoClearAt = getAutoClearAt(status, req.body?.autoClearMinutes);
    const nextUser = {
      ...users[userIndex],
      status,
      updatedAt: nowIso(),
      autoClearAt,
    };

    users = users.map((user, index) => (index === userIndex ? nextUser : user));
    res.json({ user: sanitizeUser(nextUser) });
  } catch (error) {
    next(error);
  }
});

const clientDist = path.resolve(__dirname, '../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  res.status(status).json({
    message: status === 500 ? 'Server error.' : error.message,
  });
});

app.listen(port, host, () => {
  console.log(`HomeStatus Board API listening on http://${host}:${port}`);
});
