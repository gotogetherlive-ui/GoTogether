import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { isAdminUser, isSuperAdmin, SUPER_ADMIN_EMAIL, invalidateAdminCache } from '@/lib/admin';
import { query, queryOne, run } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

/** GET — list all admin accounts */
export async function GET() {
  try {
    const user = await getSession();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const admins = await query('SELECT id, email, added_by, created_at FROM admin_accounts ORDER BY created_at ASC', []);

    return NextResponse.json({ admins, superAdminEmail: SUPER_ADMIN_EMAIL });
  } catch (err) {
    console.error('Admin accounts GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** POST — add a new admin account */
export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!isSuperAdmin(user)) {
      return NextResponse.json({ error: 'Only the super admin can add administrators' }, { status: 403 });
    }

    const { email } = await request.json();
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if already an admin
    const existing = await queryOne('SELECT 1 FROM admin_accounts WHERE email = $1', [normalizedEmail]);
    if (existing) {
      return NextResponse.json({ error: 'This email is already an admin' }, { status: 409 });
    }

    await run('INSERT INTO admin_accounts (id, email, added_by) VALUES ($1, $2, $3)', [uuidv4(), normalizedEmail, user.email]);
    invalidateAdminCache();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Admin accounts POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** DELETE — remove an admin account */
export async function DELETE(request: Request) {
  try {
    const user = await getSession();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Super admin can never be removed
    if (normalizedEmail === SUPER_ADMIN_EMAIL) {
      return NextResponse.json({ error: 'The super admin cannot be removed' }, { status: 403 });
    }

    // Only the super admin can remove other admins
    if (!isSuperAdmin(user)) {
      return NextResponse.json({ error: 'Only the super admin can remove admins' }, { status: 403 });
    }

    await run('DELETE FROM admin_accounts WHERE email = $1', [normalizedEmail]);
    invalidateAdminCache();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Admin accounts DELETE error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
