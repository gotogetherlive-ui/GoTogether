import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(request: Request, context: any) {
  try {
    const user = await getSession();
    if (!user || user.role !== 'business') {
      return NextResponse.json({ error: 'Not authenticated as a business' }, { status: 401 });
    }

    const { id: tripId } = await context.params;

    // Verify the trip belongs to this business user
    const trip = db.prepare('SELECT id FROM trips WHERE id = ? AND organizer_id = ?').get(tripId, user.id) as any;
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found or not owned by you' }, { status: 404 });
    }

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

    // Mark all as seen for this trip
    db.prepare('UPDATE trip_bookings SET notification_seen = 1 WHERE trip_id = ? AND notification_seen = 0').run(tripId);

    return NextResponse.json({ bookings });
  } catch (err) {
    console.error('Fetch business trip bookings error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
