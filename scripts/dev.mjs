import { spawn } from 'node:child_process';

const commands = [
  {
    name: 'api',
    command: process.execPath,
    args: ['server/index.js'],
    env: { PORT: process.env.API_PORT || '3001' },
  },
  {
    name: 'web',
    command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args: ['run', 'dev:client', '--', '--host', '0.0.0.0'],
    env: { VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || '' },
  },
];

let shuttingDown = false;
const children = [];

function shutdown(code = 0) {
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
  setTimeout(() => process.exit(code), 100);
}

for (const { name, command, args, env } of commands) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    stdio: ['inherit', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (chunk) => process.stdout.write(`[${name}] ${chunk}`));
  child.stderr.on('data', (chunk) => process.stderr.write(`[${name}] ${chunk}`));
  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    console.error(`[${name}] exited with ${signal || code}`);
    shutdown(code || 1);
  });

  children.push(child);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
