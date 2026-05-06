import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const user = await getSession();
    const userId = user?.id || '';

    // Location requirements removed    // Fetch all live buddy trips, joining with users table to get organizer details
    // Only exclude my own trips if I'm logged in
    const allTrips = db.prepare(`
      SELECT 
        t.id, t.title, t.description, t.starting_location, t.destination, t.start_date as trip_date, t.duration_days, t.duration_nights, t.image_url, t.status, t.created_at,
        u.id as organizer_id, u.full_name as organizer_name, u.gender as organizer_gender, 
        u.fooding_habit as organizer_fooding_habit, u.profession as organizer_profession, 
        u.age as organizer_age, u.avatar_url as organizer_avatar,
        u.latitude as organizer_lat, u.longitude as organizer_lng,
        (SELECT status FROM trip_requests WHERE trip_id = t.id AND requester_id = ?) as user_request_status
      FROM trips t
      JOIN users u ON t.organizer_id = u.id
      WHERE t.status = 'live' AND t.trip_type = 'buddy'
      ORDER BY t.created_at DESC
    `).all(userId || 'none') as any[];

    const trips = allTrips;

    return NextResponse.json({ trips, currentUserId: userId });
  } catch (err) {
    console.error('Fetch buddy trips error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { starting_location, destination, trip_date, duration_days, duration_nights, image_url } = body;

    if (!starting_location || !destination || !trip_date || !duration_days) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const tripId = uuidv4();
    const title = `Trip to ${destination}`;
    const description = `Looking for a buddy to travel to ${destination} for ${duration_days} days and ${duration_nights || 0} nights.`;

    db.prepare(`
      INSERT INTO trips (id, organizer_id, title, description, starting_location, destination, start_date, duration_days, duration_nights, image_url, status, trip_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'live', 'buddy')
    `).run(
      tripId,
      user.id,
      title,
      description,
      starting_location,
      destination,
      trip_date,
      parseInt(duration_days),
      parseInt(duration_nights || '0'),
      image_url || null
    );

    return NextResponse.json({ success: true, tripId }, { status: 201 });
  } catch (err) {
    console.error('Create buddy trip error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
