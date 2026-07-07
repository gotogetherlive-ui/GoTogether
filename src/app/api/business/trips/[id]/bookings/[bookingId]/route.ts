import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { queryOne, run } from '@/lib/db';
import { isAdminUser } from '@/lib/admin';

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
    const trip = await queryOne('SELECT id, organizer_id FROM trips WHERE id = $1', [tripId]) as any;
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    const isAdmin = await isAdminUser(user);
    if (trip.organizer_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Verify booking exists and belongs to this trip
    const booking = await queryOne(`
      SELECT b.id, b.status, b.booking_status, b.payment_status,
             EXISTS (SELECT 1 FROM payments.orders po WHERE po.booking_id = b.id) as has_payment_order
      FROM trip_bookings b
      WHERE b.id = $1 AND b.trip_id = $2
    `, [bookingId, tripId]) as any;
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.has_payment_order) {
      return NextResponse.json(
        { error: 'Paid bookings are managed by the payment and cancellation workflow.' },
        { status: 409 }
      );
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    await run('UPDATE trip_bookings SET status = $1 WHERE id = $2', [newStatus, bookingId]);

    return NextResponse.json({ success: true, status: newStatus });
  } catch (err) {
    console.error('Booking status update error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
