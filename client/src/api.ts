import type { StatusId, UsersResponse, UserStatus } from './types';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message || 'Request failed.');
  }

  return response.json() as Promise<T>;
}

export function fetchUsers() {
  return request<UsersResponse>('/api/users');
}

export function createUser(name: string) {
  return request<{ user: UserStatus }>('/api/users', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function updateStatus(id: string, status: StatusId, autoClearMinutes: 'none' | 30 | 60 | 120 = 'none') {
  return request<{ user: UserStatus }>(`/api/users/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, autoClearMinutes }),
  });
}
