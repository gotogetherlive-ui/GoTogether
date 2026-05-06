import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request, context: any) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: trip_id } = await context.params;
    const body = await request.json();

    const { male_count, female_count, child_count, names, phone_number, alternate_phone_number, trip_date } = body;

    const totalCount = (male_count || 0) + (female_count || 0) + (child_count || 0);

    if (totalCount <= 0) {
      return NextResponse.json({ error: 'At least one passenger is required' }, { status: 400 });
    }

    if (!names || !Array.isArray(names) || names.length !== totalCount) {
      return NextResponse.json({ error: 'Names list must match the total number of passengers' }, { status: 400 });
    }

    if (!phone_number || !trip_date) {
      return NextResponse.json({ error: 'Phone number and trip date are required' }, { status: 400 });
    }

    const bookingId = uuidv4();

    db.prepare(`
      INSERT INTO trip_bookings (id, trip_id, user_id, male_count, female_count, child_count, names, phone_number, alternate_phone_number, trip_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(
      bookingId,
      trip_id,
      user.id,
      male_count || 0,
      female_count || 0,
      child_count || 0,
      JSON.stringify(names),
      phone_number,
      alternate_phone_number || null,
      trip_date
    );

    return NextResponse.json({ success: true, bookingId }, { status: 201 });
  } catch (err) {
    console.error('Booking error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
