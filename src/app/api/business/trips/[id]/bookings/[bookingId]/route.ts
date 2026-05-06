import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; bookingId: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: tripId, bookingId } = await params;
    const body = await request.json();
    const { action } = body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Verify the trip belongs to this user
    const trip = db.prepare('SELECT id, organizer_id FROM trips WHERE id = ?').get(tripId) as any;
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    const isAdmin = user.email === 'gotogether.live@gmail.com' || user.role === 'super_admin';
    if (trip.organizer_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Verify booking exists and belongs to this trip
    const booking = db.prepare('SELECT id, status FROM trip_bookings WHERE id = ? AND trip_id = ?').get(bookingId, tripId) as any;
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    db.prepare('UPDATE trip_bookings SET status = ? WHERE id = ?').run(newStatus, bookingId);

    return NextResponse.json({ success: true, status: newStatus });
  } catch (err) {
    console.error('Booking status update error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
