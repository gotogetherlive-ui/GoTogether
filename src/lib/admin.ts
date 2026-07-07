import { query, ensureSchema } from './db';
import type { SessionUser } from './auth';

/**
 * The super admin email — cannot be removed by anyone.
 * This admin can add/remove all other admins.
 */
export const SUPER_ADMIN_EMAIL =
  (process.env.SUPER_ADMIN_EMAIL || 'gotogether.live@gmail.com').trim().toLowerCase();

// ─── Admin Email Cache (refreshed every 2 minutes) ──────────────────
// Admin list rarely changes, cache it to avoid a DB query per request.
/** Invalidate admin cache (call after adding/removing admins) */
export function invalidateAdminCache() {
  // Retained for API compatibility; authorization now reads PostgreSQL directly.
}

async function getAdminEmails(): Promise<Set<string>> {
  await ensureSchema();
  const rows = await query<{ email: string }>('SELECT email FROM admin_accounts');
  return new Set(rows.map(r => r.email.trim().toLowerCase()));
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
