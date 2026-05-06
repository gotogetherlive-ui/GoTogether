import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

const ADMIN_EMAIL = 'gotogether.live@gmail.com';

export async function PATCH(request: Request, context: any) {
  try {
    const user = await getSession();
    if (!user || (user.email !== ADMIN_EMAIL && user.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();
    
    if (body.action === 'status') {
      if (body.gotogether_price) {
        db.prepare('UPDATE trips SET status = ?, gotogether_price = ?, notification_seen = 0 WHERE id = ?').run(body.status, body.gotogether_price, id);
      } else {
        db.prepare('UPDATE trips SET status = ?, notification_seen = 0 WHERE id = ?').run(body.status, id);
      }
      return NextResponse.json({ success: true });
    }
    if (body.action === 'feature') {
      db.prepare('UPDATE trips SET is_featured = ? WHERE id = ?').run(body.is_featured ? 1 : 0, id);
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
    if (!user || (user.email !== ADMIN_EMAIL && user.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await context.params;
    
    // Clean up all related data before deleting the trip
    db.prepare('DELETE FROM trip_bookings WHERE trip_id = ?').run(id);
    db.prepare('DELETE FROM messages WHERE trip_id = ?').run(id);
    db.prepare('DELETE FROM trip_participants WHERE trip_id = ?').run(id);
    db.prepare('DELETE FROM trip_requests WHERE trip_id = ?').run(id);
    db.prepare('DELETE FROM reports WHERE reported_trip_id = ?').run(id);
    db.prepare('DELETE FROM user_chat_reads WHERE trip_id = ?').run(id);
    db.prepare('DELETE FROM trips WHERE id = ?').run(id);
    
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete trip error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
