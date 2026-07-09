import { query, ensureSchema } from './db';
import type { SessionUser } from './auth';

/**
 * The super admin email — cannot be removed by anyone.
 * This admin can add/remove all other admins.
 */
export const SUPER_ADMIN_EMAIL =
  (process.env.SUPER_ADMIN_EMAIL || 'gotogether.live@gmail.com').trim().toLowerCase();

const ADMIN_CACHE_TTL = 2 * 60 * 1000;
let cachedAdminEmails: Set<string> | null = null;
let adminCacheExpiresAt = 0;

/** Invalidate admin cache (call after adding/removing admins) */
export function invalidateAdminCache() {
  cachedAdminEmails = null;
  adminCacheExpiresAt = 0;
}

async function getAdminEmails(): Promise<Set<string>> {
  const now = Date.now();
  if (cachedAdminEmails && now < adminCacheExpiresAt) {
    return cachedAdminEmails;
  }

  await ensureSchema();
  const rows = await query<{ email: string }>('SELECT email FROM admin_accounts');
  cachedAdminEmails = new Set(rows.map(r => r.email.trim().toLowerCase()));
  adminCacheExpiresAt = now + ADMIN_CACHE_TTL;
  return cachedAdminEmails;
}

/**
 * Check if an email is in the admin_accounts table.
 */
export async function isAdminEmail(email: string): Promise<boolean> {
  const emails = await getAdminEmails();
  return emails.has(email.trim().toLowerCase());
}

/**
 * Check if a user (from session) has admin access.
 * Checks both the admin_accounts table and the super_admin role.
 */
export async function isAdminUser(user: SessionUser | null): Promise<boolean> {
  if (!user) return false;
  if (user.role === 'super_admin') return true;
  return isAdminEmail(user.email);
}

/**
 * Check if a user is the super admin (non-replaceable).
 */
export function isSuperAdmin(user: SessionUser | null): boolean {
  if (!user) return false;
  return user.email.trim().toLowerCase() === SUPER_ADMIN_EMAIL;
}
