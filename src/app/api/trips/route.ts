import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function GET() {
  try {
    const user = await getSession();
    const userId = user?.id || '';

    // Fetch all live business/admin trips
    const trips = db.prepare(`
      SELECT 
        t.id, t.title, t.description, t.destination, t.duration_days, t.duration_nights, t.image_url, t.status, t.created_at, t.is_featured,
        u.id as organizer_id, u.full_name as organizer_name, u.role as organizer_role, u.avatar_url as organizer_avatar
      FROM trips t
      JOIN users u ON t.organizer_id = u.id
      WHERE t.status = 'live' AND t.trip_type = 'premium'
      ORDER BY t.is_featured DESC, t.created_at DESC
    `).all();

    return NextResponse.json({ trips });
  } catch (err) {
    console.error('Fetch premium trips error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
