import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { getAppSettings } from '@/lib/settings';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const user = await getSession();
    if (!user || user.role !== 'business') {
      return NextResponse.json({ error: 'Not authenticated as a business' }, { status: 401 });
    }

    // Fetch trips organized by this business
    const trips = db.prepare(`
      SELECT id, title, destination, status, created_at, duration_days, duration_nights, tags, brochure_url, image_url, pickup_point, drop_point, b2b_price, b2c_price, start_date, images, registration_closed,
        (SELECT COUNT(*) FROM trip_bookings WHERE trip_id = trips.id) as booking_count
      FROM trips 
      WHERE organizer_id = ? AND trip_type = 'premium'
      ORDER BY created_at DESC
    `).all(user.id);

    return NextResponse.json({ trips });
  } catch (err) {
    console.error('Fetch business trips error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user || user.role !== 'business') {
      return NextResponse.json({ error: 'Not authenticated as a business' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, destination, duration_days, duration_nights, tags, images, brochure_url, pickup_point, drop_point, b2b_price, b2c_price, start_date } = body;

    if (!title || !description || !destination || !duration_days || !images || !images.length || !start_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const tripId = uuidv4();
    const image_url = images[0];

    // Check if auto-approve is enabled for verified businesses
    const settings = getAppSettings();
    const tripStatus = settings.auto_approve_trips ? 'live' : 'pending';

    db.prepare(`
      INSERT INTO trips (id, organizer_id, title, description, destination, duration_days, duration_nights, image_url, images, brochure_url, tags, status, trip_type, pickup_point, drop_point, b2b_price, b2c_price, start_date, notification_seen)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'premium', ?, ?, ?, ?, ?, ?)
    `).run(
      tripId,
      user.id,
      title,
      description,
      destination,
      parseInt(duration_days),
      parseInt(duration_nights || '0'),
      image_url,
      JSON.stringify(images),
      brochure_url || null,
      tags ? JSON.stringify(tags) : '[]',
      tripStatus,
      pickup_point || null,
      drop_point || null,
      b2b_price || null,
      b2c_price || null,
      start_date,
      tripStatus === 'live' ? 1 : 0
    );

    return NextResponse.json({ success: true, tripId }, { status: 201 });
  } catch (err) {
    console.error('Create business trip error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
