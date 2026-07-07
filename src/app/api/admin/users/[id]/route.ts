import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { run, queryOne } from '@/lib/db';
import { isAdminUser, isSuperAdmin } from '@/lib/admin';
import { invalidateUserSessions } from '@/lib/auth';

export async function PATCH(request: Request, context: any) {
  try {
    const user = await getSession();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();
    
    if (body.action === 'verify') {
      await run('UPDATE users SET is_verified = 1 WHERE id = $1', [id]);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: any) {
  try {
    const user = await getSession();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await context.params;
    
    // Check if trying to delete super admin
    const targetUser = await queryOne('SELECT email FROM users WHERE id = $1', [id]) as { email: string } | undefined;
    if (targetUser && isSuperAdmin({ ...user, email: targetUser.email })) {
       return NextResponse.json({ error: 'Cannot delete super admin' }, { status: 400 });
    }

    await run('DELETE FROM sessions WHERE user_id = $1', [id]);
    await run(`
      UPDATE users SET
        email = 'deleted+' || id || '@invalid.gotogether.local',
        password_hash = NULL,
        full_name = 'Deleted User',
        role = 'regular',
        age = NULL, gender = NULL, bio = NULL, avatar_url = NULL,
        latitude = NULL, longitude = NULL, address = NULL,
        phone_number = NULL, razorpay_account_id = NULL,
        deleted_at = NOW()
      WHERE id = $1
    `, [id]);
    invalidateUserSessions(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
