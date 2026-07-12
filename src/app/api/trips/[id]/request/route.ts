import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { hasCompleteProfile } from '@/lib/profile';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasCompleteProfile(user)) {
      return NextResponse.json({ error: 'Complete your profile before showing interest in buddy trips.' }, { status: 403 });
    }

    const compatibilityProfile = await queryOne('SELECT 1 FROM compatibility_profiles WHERE user_id = $1', [user.id]);
    if (!compatibilityProfile) {
      return NextResponse.json({ error: 'Complete your Travel DNA before showing interest in buddy trips.' }, { status: 403 });
    }

    // Wait for params inside API route
    const { id: tripId } = await params;

    // Check if trip exists
    const trip = await queryOne(`
      SELECT id, organizer_id
      FROM trips
      WHERE id = $1
        AND status = 'live'
        AND trip_type = 'buddy'
        AND (
          NULLIF(start_date, '') IS NULL
          OR (NULLIF(start_date, '')::date + INTERVAL '1 day') > (NOW() AT TIME ZONE 'Asia/Kolkata')
        )
    `, [tripId]) as any;
    if (!trip) {
      return NextResponse.json({ error: 'Buddy trip not found or unavailable' }, { status: 404 });
    }

    if (trip.organizer_id === user.id) {
      return NextResponse.json({ error: 'Cannot request your own trip' }, { status: 400 });
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
    const created = await queryOne<{ id: string }>(`
      INSERT INTO trip_requests (id, trip_id, requester_id, candidate_details, status)
      VALUES ($1, $2, $3, $4, 'pending')
      ON CONFLICT (trip_id, requester_id) DO NOTHING
      RETURNING id
    `, [requestId, tripId, user.id, candidateDetails]);

    if (!created) {
      return NextResponse.json({ error: 'You have already shown interest in this trip' }, { status: 409 });
    }

    return NextResponse.json({ success: true, message: 'Interest shown successfully!' }, { status: 201 });
  } catch (err) {
    console.error('Show interest error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

