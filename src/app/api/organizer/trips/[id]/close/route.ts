import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: tripId } = await params;
    
    // Verify the trip belongs to this user
    const trip = db.prepare('SELECT id, organizer_id, registration_closed FROM trips WHERE id = ?').get(tripId) as any;
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    const isAdmin = user.email === 'gotogether.live@gmail.com' || user.role === 'super_admin';
    if (trip.organizer_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const newStatus = trip.registration_closed === 1 ? 0 : 1;
    db.prepare('UPDATE trips SET registration_closed = ? WHERE id = ?').run(newStatus, tripId);

    return NextResponse.json({ success: true, registration_closed: newStatus });
  } catch (err) {
    console.error('Toggle registration close error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
