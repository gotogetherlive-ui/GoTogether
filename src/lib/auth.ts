import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { queryOne, run, ensureSchema } from './db';

// ─── Password helpers (ASYNC — non-blocking, uses thread pool) ───
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── Session management ──────────────────────────────────────────────
const SESSION_COOKIE = 'gt_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ─── Session Cache (reduces DB lookups by ~80%) ──────────────────────
const SESSION_CACHE_TTL = 30 * 1000; // short TTL avoids repeated DB hits during navigation
const sessionCache = new Map<string, { user: SessionUser; expiresAt: number }>();

// Periodic cleanup of expired cache entries (every 10 minutes)
let cacheCleanupScheduled = false;
function scheduleCacheCleanup() {
  if (cacheCleanupScheduled) return;
  cacheCleanupScheduled = true;
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of sessionCache) {
      if (entry.expiresAt < now) sessionCache.delete(key);
    }
  }, 10 * 60 * 1000);
}

/** Invalidate a specific session from cache */
export function invalidateSessionCache(token: string) {
  sessionCache.delete(token);
}

/** Invalidate all sessions for a user */
export function invalidateUserSessions(userId: string) {
  for (const [key, entry] of sessionCache) {
    if (entry.user.id === userId) sessionCache.delete(key);
  }
}

export interface SessionUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  age: number | null;
  gender: string | null;
  bio: string | null;
  profession: string | null;
  fooding_habit: string | null;
  address: string | null;
  phone_number: string | null;
  phone_verified: number;
  is_verified: number;
  google_id: string | null;
  avatar_url: string | null;
  latitude: number | null;
  longitude: number | null;
  location_updated_at: string | null;
  last_login_at?: string | null;
  terms_accepted_at?: string | null;
  created_at: string;
  razorpay_account_id?: string | null;
}

export async function createSession(userId: string): Promise<string> {
  await ensureSchema();
  const token = crypto.randomBytes(32).toString('base64url');
  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

  // Clean up expired sessions without signing out other active devices.
  await run('DELETE FROM sessions WHERE expires_at < NOW()');

  // Create new session
  await run(
    'INSERT INTO sessions (id, user_id, token, expires_at) VALUES ($1, $2, $3, $4)',
    [sessionId, userId, hashSessionToken(token), expiresAt]
  );

  // Update last_login_at
  try {
    await run('UPDATE users SET last_login_at = NOW() WHERE id = $1', [userId]);
  } catch (err) {
    console.error('Failed to update last_login_at', err);
  }

  // Log daily active user entry
  try {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD in IST
    await run(
      'INSERT INTO user_activity (id, user_id, activity_date) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [uuidv4(), userId, today]
    );
  } catch (err) {
    console.error('Failed to log DAU entry', err);
  }

  // Set cookie
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_MS / 1000,
    priority: 'high',
  });

  return token;
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    await ensureSchema();
    if (process.env.NODE_ENV === 'test' && (global as any).mockSessionUser) {
      return (global as any).mockSessionUser;
    }
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE);

    if (!sessionCookie?.value) {
      return null;
    }

    const token = sessionCookie.value;
    const tokenHash = hashSessionToken(token);

    // ─── Check cache first ───
    scheduleCacheCleanup();
    const cached = sessionCache.get(token);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.user;
    }

    // ─── Cache miss — hit DB ───
    const session = await queryOne<{ user_id: string; expires_at: string }>(
      'SELECT user_id, expires_at FROM sessions WHERE token = $1',
      [tokenHash]
    );

    if (!session) {
      sessionCache.delete(token);
      return null;
    }

    // Check expiry
    if (new Date(session.expires_at) < new Date()) {
      await run('DELETE FROM sessions WHERE token = $1', [tokenHash]);
      sessionCache.delete(token);
      return null;
    }

    const user = await queryOne<SessionUser>(
      `SELECT id, email, full_name, role, age, gender, bio, profession,
              fooding_habit, address, phone_number, phone_verified, is_verified,
              google_id, avatar_url, latitude, longitude, location_updated_at,
              last_login_at, terms_accepted_at, created_at, razorpay_account_id
       FROM users
       WHERE id = $1 AND deleted_at IS NULL`,
      [session.user_id]
    );

    if (!user) {
      sessionCache.delete(token);
      return null;
    }

    // ─── Store in cache ───
    sessionCache.set(token, {
      user,
      expiresAt: Date.now() + SESSION_CACHE_TTL,
    });

    return user;
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE);

  if (sessionCookie?.value) {
    await run('DELETE FROM sessions WHERE token = $1', [hashSessionToken(sessionCookie.value)]);
    // Invalidate cache
    invalidateSessionCache(sessionCookie.value);
  }

  cookieStore.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
