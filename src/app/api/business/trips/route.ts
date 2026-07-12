import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query, run } from '@/lib/db';
import { getAppSettings } from '@/lib/settings';
import { v4 as uuidv4 } from 'uuid';
import { parseInrToPaise } from '@/lib/money';
import { uniqueTripSlug } from '@/lib/slugs';

export async function GET() {
  try {
    const user = await getSession();
    if (!user || user.role !== 'business') {
      return NextResponse.json({ error: 'Not authenticated as a business' }, { status: 401 });
    }

    const trips = await query(`
      SELECT id, title, destination, status, created_at, duration_days, duration_nights, tags, brochure_url, image_url, pickup_point, drop_point, b2b_price, b2c_price, start_date, images, registration_closed,
        (SELECT COUNT(*) FROM trip_bookings WHERE trip_id = trips.id) as booking_count
      FROM trips 
      WHERE organizer_id = $1 AND trip_type = 'premium' AND status <> 'deleted'
      ORDER BY created_at DESC
    `, [user.id]);

    const providerAccount = await query(`
      SELECT provider, credential_status, last_verified_at, last_webhook_received_at, rotation_required, metadata
      FROM payments.provider_accounts
      WHERE organizer_id = $1 AND is_default = TRUE
      LIMIT 1
    `, [user.id]).then(res => res[0] || null);

    return NextResponse.json({ trips, providerAccount });
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
    const { title, description, destination, duration_days, duration_nights, tags, images, brochure_url, pickup_point, drop_point, b2b_price, b2c_price, start_date, max_capacity } = body;

    if (typeof title !== 'string' || typeof description !== 'string' || typeof destination !== 'string' || !title.trim() || !description.trim() || !destination.trim() || !duration_days || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (title.length > 160 || description.length > 10000 || destination.length > 200 || images.length > 8) {
      return NextResponse.json({ error: 'Trip details exceed allowed limits' }, { status: 400 });
    }
    if (!Number.isInteger(Number(duration_days)) || Number(duration_days) < 1 || Number(duration_days) > 365 || !Number.isInteger(Number(duration_nights || 0)) || Number(duration_nights || 0) < 0) {
      return NextResponse.json({ error: 'Invalid trip duration' }, { status: 400 });
    }
    if (parseInrToPaise(b2c_price) <= 0 || parseInrToPaise(b2b_price) <= 0) {
      return NextResponse.json({ error: 'Invalid trip price' }, { status: 400 });
    }
    const formattedStartDate = start_date && String(start_date).trim() ? String(start_date).trim() : null;
    if (formattedStartDate) {
      const tripDate = new Date(`${formattedStartDate}T00:00:00.000Z`);
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      if (Number.isNaN(tripDate.getTime()) || tripDate < today) {
        return NextResponse.json({ error: 'Trip start date must be today or in the future' }, { status: 400 });
      }
    }
    const parsedCapacity = max_capacity === undefined || max_capacity === null || max_capacity === '' ? null : Number(max_capacity);
    if (parsedCapacity !== null && (!Number.isInteger(parsedCapacity) || parsedCapacity <= 0 || parsedCapacity > 10000)) {
      return NextResponse.json({ error: 'Invalid trip capacity' }, { status: 400 });
    }
    if (!images.every((image: unknown) => typeof image === 'string' && (/^https:\/\/res\.cloudinary\.com\//.test(image) || /^data:image\/(jpeg|png|webp|gif|svg\+xml);base64,/.test(image)))) {
      return NextResponse.json({ error: 'Invalid trip image' }, { status: 400 });
    }
    if (process.env.NODE_ENV === 'production' && !images.every((image: unknown) => typeof image === 'string' && /^https:\/\/res\.cloudinary\.com\//.test(image))) {
      return NextResponse.json({ error: 'Trip images must be uploaded before creating a production trip' }, { status: 400 });
    }

    const tripId = uuidv4();
    const image_url = images[0];
    const slug = await uniqueTripSlug(title, destination, tripId);

    // Check if auto-approve is enabled for verified businesses
    const settings = await getAppSettings();
    const tripStatus = settings.auto_approve_trips ? 'live' : 'pending';

    await run(`
      INSERT INTO trips (id, organizer_id, title, slug, description, destination, duration_days, duration_nights, image_url, images, brochure_url, tags, status, trip_type, pickup_point, drop_point, b2b_price, b2c_price, start_date, max_capacity, notification_seen)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'premium', $14, $15, $16, $17, $18, $19, $20)
    `, [
      tripId,
      user.id,
      title,
      slug,
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
      formattedStartDate,
      parsedCapacity,
      tripStatus === 'live' ? 1 : 0
    ]);

    return NextResponse.json({ success: true, tripId }, { status: 201 });
  } catch (err) {
    console.error('Create business trip error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


