import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import db from './db';

// ─── Password helpers ────────────────────────────────────────────────
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hashSync(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compareSync(password, hash);
}

// ─── Session management ──────────────────────────────────────────────
const SESSION_COOKIE = 'gt_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

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
  created_at: string;
}

export async function createSession(userId: string): Promise<string> {
  const token = uuidv4();
  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

  // Clean up expired sessions for this user
  db.prepare('DELETE FROM sessions WHERE user_id = ? OR expires_at < datetime(\'now\')').run(userId);

  // Create new session
  db.prepare(
    'INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)'
  ).run(sessionId, userId, token, expiresAt);

  // Update last_login_at
  try {
    db.prepare('UPDATE users SET last_login_at = datetime("now") WHERE id = ?').run(userId);
  } catch (err) {
    console.error('Failed to update last_login_at', err);
  }

  // Set cookie
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_MS / 1000,
  });

  return token;
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE);

    if (!sessionCookie?.value) {
      return null;
    }

    const session = db.prepare(
      'SELECT user_id, expires_at FROM sessions WHERE token = ?'
    ).get(sessionCookie.value) as { user_id: string; expires_at: string } | undefined;

    if (!session) {
      return null;
    }

    // Check expiry
    if (new Date(session.expires_at) < new Date()) {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(sessionCookie.value);
      return null;
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(session.user_id) as SessionUser | undefined;
    return user || null;
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE);

  if (sessionCookie?.value) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(sessionCookie.value);
  }

  cookieStore.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
