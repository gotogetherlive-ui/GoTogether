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
      SELECT t.id, t.title, t.destination, t.status, t.created_at, t.trip_type,
             t.registration_closed,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', r.id, 'requester_id', r.requester_id, 'status', r.status,
                   'created_at', r.created_at, 'candidate_details', r.candidate_details,
                   'full_name', requester.full_name, 'avatar_url', requester.avatar_url,
                   'age', requester.age, 'gender', requester.gender,
                   'profession', requester.profession, 'fooding_habit', requester.fooding_habit
                 )
                 ORDER BY r.created_at DESC
               ) FILTER (WHERE r.id IS NOT NULL),
               '[]'::json
             ) AS requests
      FROM trips t
      LEFT JOIN trip_requests r ON r.trip_id = t.id
      LEFT JOIN users requester ON requester.id = r.requester_id AND requester.deleted_at IS NULL
      WHERE t.organizer_id = $1
        AND t.trip_type = 'buddy'
        AND t.status <> 'deleted'
        AND t.deleted_at IS NULL
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `, [user.id]);

    return NextResponse.json({ trips });
  } catch (err) {
    console.error('Fetch organizer trips error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
