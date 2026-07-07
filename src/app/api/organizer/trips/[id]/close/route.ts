import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { queryOne, run } from '@/lib/db';
import { isAdminUser } from '@/lib/admin';

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
    const trip = await queryOne('SELECT id, organizer_id, status, registration_closed FROM trips WHERE id = $1', [tripId]) as any;
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    if (['cancelling', 'refunds_processing', 'refunds_completed', 'cancelled', 'archived', 'deleted'].includes(trip.status)) {
      return NextResponse.json({ error: 'Cannot toggle registration on a cancelled or cancelling trip' }, { status: 400 });
    }

    const isAdmin = await isAdminUser(user);

    const newStatus = trip.registration_closed === 1 ? 0 : 1;
    await run('UPDATE trips SET registration_closed = $1 WHERE id = $2', [newStatus, tripId]);

    return NextResponse.json({ success: true, registration_closed: newStatus });
  } catch (err) {
    console.error('Toggle registration close error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
