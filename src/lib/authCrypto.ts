/**
 * Server-Verified HMAC Session Manager
 * Passwords & hashes are strictly verified on the server (`/api/auth`) and never shipped in the client bundle.
 */

export const SESSION_STORAGE_KEY = 'erise_auth_session_v3';
export const CURRENT_SESSION_EPOCH = 'ERISE_2026_HMAC_V3';

export type AuthUserRole = 'admin' | 'head_projects' | 'head_organization' | 'head_media';

export interface AuthSessionUser {
  id: string;
  name: string;
  username: string;
  role: AuthUserRole;
  roleTitle: string;
  department: 'All' | 'Projects' | 'Organization' | 'Media';
  email: string;
  avatar?: string;
}

export interface StoredAuthSession {
  token: string;
  user: AuthSessionUser;
  epoch: string;
  createdAt: number;
  expiresAt: number;
}

export async function loginWithServer(username: string, password: string): Promise<StoredAuthSession> {
  const res = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', username, password }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success || !data.token || !data.user) {
    throw new Error(data.error || 'Authentication failed');
  }

  const session: StoredAuthSession = {
    token: data.token,
    user: data.user,
    epoch: data.epoch || CURRENT_SESSION_EPOCH,
    createdAt: data.createdAt || Date.now(),
    expiresAt: data.expiresAt || Date.now() + 24 * 60 * 60 * 1000,
  };

  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  return session;
}

export function getStoredSession(): StoredAuthSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed: StoredAuthSession = JSON.parse(raw);
    if (!parsed?.token || !parsed?.user || parsed.epoch !== CURRENT_SESSION_EPOCH) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    if (Date.now() > parsed.expiresAt) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

export function getAuthHeader(): Record<string, string> {
  const session = getStoredSession();
  return session?.token ? { Authorization: `Bearer ${session.token}` } : {};
}

export function clearAuthSession(): void {
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
}
