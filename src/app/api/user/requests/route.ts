import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Fetch trips the user has requested to join
    const requests = db.prepare(`
      SELECT 
        r.id as request_id, r.status as request_status, r.created_at as requested_at,
        t.id as trip_id, t.title, t.destination, t.duration_days,
        u.full_name as organizer_name
      FROM trip_requests r
      JOIN trips t ON r.trip_id = t.id
      JOIN users u ON t.organizer_id = u.id
      WHERE r.requester_id = ?
      ORDER BY r.created_at DESC
    `).all(user.id);

    // Fetch premium trips the user has booked
    const bookings = db.prepare(`
      SELECT 
        b.id as booking_id, b.status as booking_status, b.created_at as booked_at,
        b.male_count, b.female_count, b.child_count, b.names, b.phone_number, b.trip_date,
        t.id as trip_id, t.title, t.destination, t.duration_days, t.image_url,
        u.full_name as organizer_name
      FROM trip_bookings b
      JOIN trips t ON b.trip_id = t.id
      JOIN users u ON t.organizer_id = u.id
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC
    `).all(user.id);

    return NextResponse.json({ requests, bookings });
  } catch (err) {
    console.error('Fetch user requests error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
