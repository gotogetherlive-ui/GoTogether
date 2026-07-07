import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Fetch trips organized by this user
    const trips = await query(`
      SELECT id, title, destination, status, created_at, trip_type, registration_closed 
      FROM trips 
      WHERE organizer_id = $1 AND trip_type = 'buddy'
      ORDER BY created_at DESC
    `, [user.id]);

    // For each trip, fetch requests
    const tripsWithRequests = await Promise.all(trips.map(async (trip: any) => {
      const requests = await query(`
        SELECT r.id, r.requester_id, r.status, r.created_at, r.candidate_details,
               u.full_name, u.avatar_url, u.age, u.gender, u.profession, u.fooding_habit
        FROM trip_requests r
        JOIN users u ON r.requester_id = u.id
        WHERE r.trip_id = $1
        ORDER BY r.created_at DESC
      `, [trip.id]);
      
      return { ...trip, requests };
    }));

    return NextResponse.json({ trips: tripsWithRequests });
  } catch (err) {
    console.error('Fetch organizer trips error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
