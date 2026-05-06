import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

const ADMIN_EMAIL = 'gotogether.live@gmail.com';

export async function GET(request: Request, context: any) {
  try {
    const user = await getSession();
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: tripId } = await context.params;

    const bookings = db.prepare(`
      SELECT 
        tb.id, tb.male_count, tb.female_count, tb.child_count, tb.names,
        tb.phone_number, tb.alternate_phone_number, tb.trip_date, tb.status, tb.created_at,
        u.full_name as user_name, u.email as user_email, u.avatar_url as user_avatar,
        u.phone_number as user_phone, u.age as user_age, u.gender as user_gender
      FROM trip_bookings tb
      JOIN users u ON tb.user_id = u.id
      WHERE tb.trip_id = ?
      ORDER BY tb.created_at DESC
    `).all(tripId);

    // Mark all bookings for this trip as seen
    db.prepare('UPDATE trip_bookings SET notification_seen = 1 WHERE trip_id = ? AND notification_seen = 0').run(tripId);

    return NextResponse.json({ bookings });
  } catch (err) {
    console.error('Fetch admin trip bookings error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
