// Security & Authentication Helper: Cryptographic Salted Hashing & Session Invalidation
import type { DepartmentHeadUser } from '../types/portals';

export const SESSION_STORAGE_KEY = 'erise_admin_auth_v2';
export const CURRENT_SESSION_EPOCH = 'ERISE_REVOKED_2026_09_V2';
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface AuthSession {
  user: DepartmentHeadUser;
  epoch: string;
  createdAt: number;
  expiresAt: number;
  token: string;
}

/**
 * Computes a SHA-256 hash using the standard Web Crypto API
 */
export async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}:${password}:${salt}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Constant-time string comparison helper to prevent timing attacks
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Verifies a candidate password against a salted SHA-256 hash
 */
export async function verifyPasswordHash(
  candidatePassword: string,
  salt: string,
  expectedHash: string
): Promise<boolean> {
  try {
    const computed = await hashPassword(candidatePassword, salt);
    return timingSafeEqual(computed.toLowerCase(), expectedHash.toLowerCase());
  } catch (err) {
    console.error('Password hash verification failed:', err);
    return false;
  }
}

/**
 * Generates an unpredictable cryptographic hex token
 */
export function generateRandomToken(bytes = 32): string {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Wipes all legacy insecure sessions from all connected devices
 */
export function clearLegacySessions(): void {
  try {
    localStorage.removeItem('erise_admin_session');
    localStorage.removeItem('erise_user_role');
    localStorage.removeItem('erise_user_data');
  } catch (e) {
    // Ignore storage quota or access errors
  }
}

/**
 * Saves a new authenticated session signed with the current epoch
 */
export async function saveAuthSession(user: DepartmentHeadUser): Promise<AuthSession> {
  clearLegacySessions();

  const now = Date.now();
  const token = generateRandomToken(32);
  const session: AuthSession = {
    user,
    epoch: CURRENT_SESSION_EPOCH,
    createdAt: now,
    expiresAt: now + SESSION_MAX_AGE_MS,
    token,
  };

  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  return session;
}

/**
 * Retrieves and validates the current session.
 * If the session is from an older epoch, expired, or corrupted, it is purged.
 */
export function getValidAuthSession(): AuthSession | null {
  clearLegacySessions();

  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    const session: AuthSession = JSON.parse(raw);

    // Validate epoch (instantly invalidates all older/legacy sessions)
    if (!session || session.epoch !== CURRENT_SESSION_EPOCH) {
      clearAuthSession();
      return null;
    }

    // Validate expiration
    if (!session.expiresAt || Date.now() > session.expiresAt) {
      clearAuthSession();
      return null;
    }

    // Validate structure
    if (!session.user || !session.token) {
      clearAuthSession();
      return null;
    }

    return session;
  } catch (err) {
    clearAuthSession();
    return null;
  }
}

/**
 * Completely clears current session
 */
export function clearAuthSession(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    clearLegacySessions();
  } catch (e) {}
}
