import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

const ADMIN_EMAIL = 'gotogether.live@gmail.com';

export async function PATCH(request: Request, context: any) {
  try {
    const user = await getSession();
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();
    
    if (body.action === 'verify') {
      db.prepare('UPDATE users SET is_verified = 1 WHERE id = ?').run(id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: any) {
  try {
    const user = await getSession();
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await context.params;
    
    // Check if trying to delete super admin
    const targetUser = db.prepare('SELECT email FROM users WHERE id = ?').get(id) as { email: string } | undefined;
    if (targetUser?.email === ADMIN_EMAIL) {
       return NextResponse.json({ error: 'Cannot delete super admin' }, { status: 400 });
    }

    // SQLite foreign keys (ON DELETE CASCADE) will handle sessions, trips, trip_requests.
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
