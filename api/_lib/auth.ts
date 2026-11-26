import crypto from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

export const CURRENT_SESSION_EPOCH = 'ERISE_2026_HMAC_V3';
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type UserRole = 'admin' | 'head_projects' | 'head_organization' | 'head_media';

export interface SessionUser {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  roleTitle: string;
  department: 'All' | 'Projects' | 'Organization' | 'Media';
  email: string;
  avatar?: string;
}

export interface SignedSessionPayload {
  user: SessionUser;
  epoch: string;
  iat: number;
  exp: number;
  jti: string;
}

interface CredentialRecord {
  id: string;
  name: string;
  username: string;
  aliases: string[];
  salt: string;
  passwordHash: string;
  role: UserRole;
  roleTitle: string;
  department: 'All' | 'Projects' | 'Organization' | 'Media';
  email: string;
  avatar?: string;
}

function getSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SECRET_KEY;
  if (!secret || secret.length < 16) {
    throw new Error('ADMIN_SESSION_SECRET (or SUPABASE_SECRET_KEY) must be configured on the server');
  }
  return crypto.createHash('sha256').update(`erise-hmac:${secret}`).digest('hex');
}

function getServerCredentials(): CredentialRecord[] {
  return [
    {
      id: 'super-admin',
      name: 'E.R.I.S.E. Administrator',
      username: 'erise_admin',
      aliases: ['erise_admin', 'admin', 'president'],
      salt: process.env.SUPER_ADMIN_SALT || 'erise_salt_super_alpha982_2026',
      passwordHash: process.env.SUPER_ADMIN_PASSWORD_HASH || '47649377eaa9986440667d4b2c783370bd720e90d7bbbda38ad6d22165e313e4',
      role: 'admin',
      roleTitle: 'Club Administrator',
      department: 'All',
      email: 'erise.club@hns-re2sd.dz',
    },
    {
      id: 'head-projects',
      name: 'Ayoub Berbache',
      username: 'ayoub_berbache',
      aliases: ['ayoub_berbache', 'ayoub berbache', 'ayoub', 'head_projects', 'berbache ayoub', 'head of projects'],
      salt: process.env.HEAD_PROJECTS_SALT || 'erise_salt_proj_kinetics74_2026',
      passwordHash: process.env.HEAD_PROJECTS_PASSWORD_HASH || '245c68a9395875404754e94a5bfa2e4ff6473dbb9896d778ed8721fd04de2deb',
      role: 'head_projects',
      roleTitle: 'Head of Projects',
      department: 'Projects',
      email: 'a.berbache@hns-re2sd.dz',
      avatar: '/team-assets/Ayoub.jpg',
    },
    {
      id: 'head-organization',
      name: 'Ahmed Amine Helali',
      username: 'ahmed_amine_helali',
      aliases: ['ahmed_amine_helali', 'ahmed amine helali', 'ahmed', 'head_organization', 'helali ahmed', 'head of organization'],
      salt: process.env.HEAD_ORGANIZATION_SALT || 'erise_salt_org_logistics563_2026',
      passwordHash: process.env.HEAD_ORGANIZATION_PASSWORD_HASH || 'b693eccfba56c3b412d531a047acbeca2d7bfa6aa6d2f6fb6e1d1e517f444189',
      role: 'head_organization',
      roleTitle: 'Head of Organization',
      department: 'Organization',
      email: 'aa.helali@hns-re2sd.dz',
    },
    {
      id: 'head-media',
      name: 'Matriche Abderrahmane',
      username: 'matriche_abderrahmane',
      aliases: ['matriche_abderrahmane', 'matriche abderrahmane', 'matriche', 'abderrahmane', 'head_media', 'abderrahmane matriche', 'head of media'],
      salt: process.env.HEAD_MEDIA_SALT || 'erise_salt_media_lumiere89_2026',
      passwordHash: process.env.HEAD_MEDIA_PASSWORD_HASH || 'a7c178c980c2743c35a572ce71a8a519ad226912d9f09a9c5fb3f66674bf38c1',
      role: 'head_media',
      roleTitle: 'Head of Media',
      department: 'Media',
      email: 'a.matriche@hns-re2sd.dz',
    },
  ];
}

function hashSaltedSha256(password: string, salt: string): string {
  return crypto.createHash('sha256').update(`${salt}:${password}:${salt}`).digest('hex');
}

function safeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a.toLowerCase(), 'utf8');
  const bufB = Buffer.from(b.toLowerCase(), 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function authenticateCredentials(usernameInput: string, passwordInput: string): SessionUser | null {
  const cleanUser = (usernameInput || '').trim().toLowerCase();
  const cleanPass = (passwordInput || '').trim();
  if (!cleanPass) return null;

  const records = getServerCredentials();

  // If username provided, check matching account first; if omitted/auto-portal, check all hashes
  for (const rec of records) {
    const userMatches =
      !cleanUser ||
      cleanUser === rec.username.toLowerCase() ||
      rec.aliases.some(a => a.toLowerCase() === cleanUser);

    if (userMatches) {
      const candidateHash = hashSaltedSha256(cleanPass, rec.salt);
      if (safeEqualHex(candidateHash, rec.passwordHash)) {
        return {
          id: rec.id,
          name: rec.name,
          username: rec.username,
          role: rec.role,
          roleTitle: rec.roleTitle,
          department: rec.department,
          email: rec.email,
          avatar: rec.avatar,
        };
      }
    }
  }

  return null;
}

export function signSessionToken(user: SessionUser): { token: string; payload: SignedSessionPayload } {
  const now = Date.now();
  const payload: SignedSessionPayload = {
    user,
    epoch: CURRENT_SESSION_EPOCH,
    iat: now,
    exp: now + SESSION_MAX_AGE_MS,
    jti: crypto.randomBytes(16).toString('hex'),
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encodedPayload)
    .digest('base64url');

  return { token: `${encodedPayload}.${sig}`, payload };
}

export function verifySignedToken(tokenStr: string): SignedSessionPayload | null {
  if (!tokenStr || typeof tokenStr !== 'string') return null;
  const parts = tokenStr.split('.');
  if (parts.length !== 2) return null;

  const [encodedPayload, providedSig] = parts;
  if (!encodedPayload || !providedSig) return null;

  try {
    const expectedSig = crypto
      .createHmac('sha256', getSessionSecret())
      .update(encodedPayload)
      .digest('base64url');

    const a = Buffer.from(providedSig, 'utf8');
    const b = Buffer.from(expectedSig, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }

    const parsed: SignedSessionPayload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8')
    );

    if (!parsed || parsed.epoch !== CURRENT_SESSION_EPOCH) return null;
    if (!parsed.exp || Date.now() > parsed.exp) return null;
    if (!parsed.user || (parsed.user.role !== 'admin' && !parsed.user.role.startsWith('head_'))) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function verifyAdminAuth(req: any): SignedSessionPayload | null {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (!authHeader || typeof authHeader !== 'string') return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') return null;
  return verifySignedToken(parts[1]);
}

export function applySecurityCors(req: any, res: any, methods = 'GET, POST, PUT, DELETE, OPTIONS'): void {
  const allowedRaw = process.env.ALLOWED_ORIGINS || 'https://erise-scientific-club.site,https://www.erise-scientific-club.site';
  const allowed = allowedRaw.split(',').map(s => s.trim()).filter(Boolean);
  const origin = req.headers?.origin;

  if (origin && (allowed.includes(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('X-Content-Type-Options', 'nosniff');
}

export async function logAuditEvent(
  supabase: SupabaseClient,
  session: SignedSessionPayload,
  action: string,
  targetTable?: string,
  targetId?: string | number,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await supabase.from('audit_logs').insert([{
      actor_username: session.user.username,
      actor_role: session.user.role,
      action,
      target_table: targetTable || null,
      target_id: targetId !== undefined ? String(targetId) : null,
      metadata: metadata || {},
    }]);
  } catch {
    // Do not block primary admin action if audit table hasn't been migrated yet
  }
}
