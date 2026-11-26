import { z } from 'zod';
import {
  applySecurityCors,
  authenticateCredentials,
  signSessionToken,
  verifyAdminAuth,
} from './_lib/auth';

const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 3 * 60 * 1000;

const LoginSchema = z.object({
  action: z.enum(['login', 'verify', 'logout']).default('login'),
  username: z.string().max(120).optional().default(''),
  password: z.string().min(1).max(200).optional(),
});

export default async function handler(req: any, res: any) {
  applySecurityCors(req, res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const parsed = LoginSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid authentication payload' });
  }

  const { action, username, password } = parsed.data;

  if (action === 'verify') {
    const session = verifyAdminAuth(req);
    if (!session) return res.status(401).json({ valid: false });
    return res.status(200).json({ valid: true, user: session.user, exp: session.exp });
  }

  if (action === 'logout') {
    return res.status(200).json({ success: true });
  }

  const clientIp =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  const record = loginAttempts.get(clientIp);
  if (record && record.lockedUntil > Date.now()) {
    const waitSec = Math.ceil((record.lockedUntil - Date.now()) / 1000);
    return res.status(429).json({
      error: `Too many failed attempts. Try again in ${waitSec}s.`,
      lockoutSeconds: waitSec,
    });
  }

  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  try {
    const user = authenticateCredentials(username, password);
    if (!user) {
      const nextCount = (record?.count || 0) + 1;
      const lockedUntil = nextCount >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : 0;
      loginAttempts.set(clientIp, { count: nextCount >= MAX_ATTEMPTS ? 0 : nextCount, lockedUntil });
      return res.status(401).json({
        error: 'Invalid credentials',
        attemptsRemaining: Math.max(0, MAX_ATTEMPTS - nextCount),
        lockoutSeconds: lockedUntil ? Math.ceil(LOCKOUT_MS / 1000) : 0,
      });
    }

    loginAttempts.delete(clientIp);
    const { token, payload } = signSessionToken(user);

    return res.status(200).json({
      success: true,
      token,
      user: payload.user,
      epoch: payload.epoch,
      createdAt: payload.iat,
      expiresAt: payload.exp,
    });
  } catch (err: any) {
    console.error('Auth error:', err);
    return res.status(500).json({ error: err.message || 'Authentication service error' });
  }
}
