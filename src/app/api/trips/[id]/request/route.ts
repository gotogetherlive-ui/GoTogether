import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Wait for params inside API route
    const { id: tripId } = await params;

    // Check if trip exists
    const trip = db.prepare('SELECT id, organizer_id FROM trips WHERE id = ?').get(tripId) as any;
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    if (trip.organizer_id === user.id) {
      return NextResponse.json({ error: 'Cannot request your own trip' }, { status: 400 });
    }

    // Check if already requested
    const existing = db.prepare('SELECT id FROM trip_requests WHERE trip_id = ? AND requester_id = ?').get(tripId, user.id);
    if (existing) {
      return NextResponse.json({ error: 'Already showed interest in this trip' }, { status: 400 });
    }

    // Create the request
    const candidateDetails = JSON.stringify({
      full_name: user.full_name,
      age: user.age,
      gender: user.gender,
      profession: user.profession,
      fooding_habit: user.fooding_habit,
      avatar_url: user.avatar_url,
    });

    const requestId = uuidv4();
    db.prepare(`
      INSERT INTO trip_requests (id, trip_id, requester_id, candidate_details, status)
      VALUES (?, ?, ?, ?, 'pending')
    `).run(requestId, tripId, user.id, candidateDetails);

    return NextResponse.json({ success: true, message: 'Interest shown successfully!' }, { status: 201 });
  } catch (err) {
    console.error('Show interest error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
