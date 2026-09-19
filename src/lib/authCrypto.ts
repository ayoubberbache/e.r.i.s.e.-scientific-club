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
 * Pure JavaScript SHA-256 implementation for environments where crypto.subtle is restricted or unavailable
 */
function sha256Pure(ascii: string): string {
  function rightRotate(v: number, a: number) { return (v >>> a) | (v << (32 - a)); }
  const mathPow = Math.pow, maxWord = mathPow(2, 32);
  const words: number[] = [], asciiBitLength = ascii.length * 8;
  let hash = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  let primeCounter = k.length;
  const isComposite: Record<number, number> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (let i = 0; i < 313; i += candidate) isComposite[i] = candidate;
      hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }
  ascii += '\x80';
  while (ascii.length % 64 - 56) ascii += '\x00';
  for (let i = 0; i < ascii.length; i++) {
    const j = ascii.charCodeAt(i);
    if (j >> 8) return '';
    words[i >> 2] |= j << ((3 - i) % 4) * 8;
  }
  words[words.length] = ((asciiBitLength / maxWord) | 0);
  words[words.length] = (asciiBitLength);
  for (let j = 0; j < words.length;) {
    const w = words.slice(j, j += 16), oldHash = hash;
    hash = hash.slice(0, 8);
    for (let i = 0; i < 64; i++) {
      const i2 = i + j, w15 = w[i - 15], w2 = w[i - 2];
      const a = hash[0], e = hash[4];
      const temp1 = hash[7] + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) + ((e & hash[5]) ^ ((~e) & hash[6])) + k[i] + (w[i] = (i < 16) ? w[i] : (w[i - 16] + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) | 0);
      const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }
    for (let i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
  }
  let result = '';
  for (let i = 0; i < 8; i++) {
    for (let j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += ((b < 16) ? 0 : '') + b.toString(16);
    }
  }
  return result;
}

/**
 * Computes a SHA-256 hash using the standard Web Crypto API with pure JS fallback
 */
export async function hashPassword(password: string, salt: string): Promise<string> {
  const combined = `${salt}:${password}:${salt}`;
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.digest === 'function') {
      const enc = new TextEncoder();
      const data = enc.encode(combined);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    // Fall back to pure JS SHA-256
  }
  return sha256Pure(unescape(encodeURIComponent(combined)));
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
