import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { createUser, fetchUsers, updateStatus } from './api';
import { autoClearOptions, statuses, statusMeta } from './statusConfig';
import type { AutoClearOption, StatusDefinition, StatusId, UserStatus } from './types';

const dateFormatter = new Intl.DateTimeFormat('ja-JP', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

const scheduleFormatter = new Intl.DateTimeFormat('ja-JP', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function formatUpdatedAt(value: string) {
  return dateFormatter.format(new Date(value));
}

function formatSchedule(value: string) {
  return scheduleFormatter.format(new Date(value));
}

function App() {
  const [users, setUsers] = useState<UserStatus[]>([]);
  const [newUserName, setNewUserName] = useState('');
  const [autoClearByUser, setAutoClearByUser] = useState<Record<string, AutoClearOption['value']>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const loadUsers = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);

    try {
      const data = await fetchUsers();
      setUsers(data.users);
      setLastSyncedAt(new Date());
      setError(null);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : '読み込みに失敗しました。');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers(true);
    const timer = window.setInterval(() => {
      void loadUsers(false);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [loadUsers]);

  const userCountText = useMemo(() => `${users.length}人`, [users.length]);

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newUserName.trim();
    if (!name) return;

    setIsSaving(true);
    try {
      const result = await createUser(name);
      setUsers((current) => [...current, result.user]);
      setNewUserName('');
      setError(null);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'ユーザーを追加できませんでした。');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusChange(user: UserStatus, status: StatusId) {
    const autoClearMinutes = status === 'dnd' ? autoClearByUser[user.id] ?? 30 : 'none';
    setIsSaving(true);

    try {
      const result = await updateStatus(user.id, status, autoClearMinutes);
      setUsers((current) => current.map((item) => (item.id === user.id ? result.user : item)));
      setError(null);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : '状態を更新できませんでした。');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <h1>HomeStatus Board</h1>
          <p>同じWi-Fiの端末から、今の状態をすぐ確認できます。</p>
        </div>
        <div className="sync-panel" aria-live="polite">
          <span>{userCountText}</span>
          <small>{lastSyncedAt ? `${formatUpdatedAt(lastSyncedAt)} 更新` : '同期中'}</small>
        </div>
      </header>

      <section className="create-panel" aria-label="ユーザー追加">
        <form onSubmit={handleCreateUser}>
          <label htmlFor="user-name">ユーザー名</label>
          <div className="create-row">
            <input
              id="user-name"
              type="text"
              value={newUserName}
              onChange={(event) => setNewUserName(event.target.value)}
              placeholder="例: Kenta"
              maxLength={32}
            />
            <button type="submit" disabled={isSaving || !newUserName.trim()}>
              追加
            </button>
          </div>
        </form>
      </section>

      {error && <p className="error-message">{error}</p>}

      <section className="status-grid" aria-busy={isLoading}>
        {isLoading ? (
          <div className="empty-state">読み込み中...</div>
        ) : users.length === 0 ? (
          <div className="empty-state">ユーザーを追加してください。</div>
        ) : (
          users.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              autoClearValue={autoClearByUser[user.id] ?? 30}
              onAutoClearChange={(value) =>
                setAutoClearByUser((current) => ({
                  ...current,
                  [user.id]: value,
                }))
              }
              onStatusChange={(status) => void handleStatusChange(user, status)}
            />
          ))
        )}
      </section>
    </main>
  );
}

type UserCardProps = {
  user: UserStatus;
  autoClearValue: AutoClearOption['value'];
  onAutoClearChange: (value: AutoClearOption['value']) => void;
  onStatusChange: (status: StatusId) => void;
};

function UserCard({ user, autoClearValue, onAutoClearChange, onStatusChange }: UserCardProps) {
  const activeStatus = statuses.find((status) => status.id === user.status) ?? statuses[0];
  const meta = statusMeta[user.status];

  return (
    <article className={`user-card user-card--${meta.tone}`}>
      <div className="card-topline">
        <div>
          <h2>{user.name}</h2>
          <p>{meta.helper}</p>
        </div>
        <div className="status-mark" aria-hidden="true">
          {meta.icon}
        </div>
      </div>

      <div className="current-status">
        <span>現在</span>
        <strong>{activeStatus.label}</strong>
      </div>

      <dl className="time-list">
        <div>
          <dt>最終更新</dt>
          <dd>{formatUpdatedAt(user.updatedAt)}</dd>
        </div>
        <div>
          <dt>自動解除</dt>
          <dd>{user.autoClearAt ? formatSchedule(user.autoClearAt) : '予定なし'}</dd>
        </div>
      </dl>

      <StatusControls activeStatus={activeStatus} onStatusChange={onStatusChange} />

      <label className="auto-clear-control">
        <span>Don’t disturb の自動解除</span>
        <select
          value={autoClearValue}
          onChange={(event) => {
            const value = event.target.value;
            onAutoClearChange(value === 'none' ? 'none' : (Number(value) as 30 | 60 | 120));
          }}
        >
          {autoClearOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </article>
  );
}

type StatusControlsProps = {
  activeStatus: StatusDefinition;
  onStatusChange: (status: StatusId) => void;
};

function StatusControls({ activeStatus, onStatusChange }: StatusControlsProps) {
  return (
    <div className="status-controls" aria-label="状態切替">
      {statuses.map((status) => (
        <button
          key={status.id}
          type="button"
          className={`status-button status-button--${statusMeta[status.id].tone}`}
          aria-pressed={activeStatus.id === status.id}
          onClick={() => onStatusChange(status.id)}
        >
          <span aria-hidden="true">{statusMeta[status.id].icon}</span>
          {status.label}
        </button>
      ))}
    </div>
  );
}

export default App;
