import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query, queryOne, run } from '@/lib/db';
import { sendBusinessTripCancelledEmail } from '@/lib/email';
import { notifyUser } from '@/lib/notificationEvents';

// DELETE — soft-delete a business trip
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user || user.role !== 'business') {
      return NextResponse.json({ error: 'Not authenticated as a business' }, { status: 401 });
    }

    const { id } = await params;

    // Check if the trip exists and belongs to this business
    const trip = await queryOne('SELECT organizer_id, title, status FROM trips WHERE id = $1', [id]) as any;
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    if (trip.organizer_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (trip.status === 'deleted') {
      return NextResponse.json({ error: 'Trip is already removed' }, { status: 400 });
    }

    const activeBooking = await queryOne(`
      SELECT id FROM public.trip_bookings
      WHERE trip_id = $1 
        AND booking_status IN ('confirmed', 'payment_processing', 'refund_pending', 'trip_cancelled')
        AND cancelled_at IS NULL
      LIMIT 1
    `, [id]);
    if (activeBooking) {
      return NextResponse.json(
        { error: 'This trip has active or pending bookings. Cancel or refund them first.' },
        { status: 409 }
      );
    }

    const pendingRefund = await queryOne(`
      SELECT r.refund_id 
      FROM payments.refunds r
      JOIN payments.transactions t ON t.transaction_id = r.transaction_id
      JOIN payments.orders o ON o.id = t.order_id
      WHERE o.trip_id = $1 
        AND r.status IN ('PENDING', 'PROCESSING')
      LIMIT 1
    `, [id]);
    if (pendingRefund) {
      return NextResponse.json(
        { error: 'This trip has pending or processing refunds. Please wait for reconciliation to complete.' },
        { status: 409 }
      );
    }

    // Find all bookings for this trip that are not yet cancelled
    const bookings = await query(`
      SELECT b.id, b.user_id, u.email, u.full_name
      FROM trip_bookings b
      JOIN users u ON b.user_id = u.id
      WHERE b.trip_id = $1 AND b.cancelled_at IS NULL
    `, [id]) as { id: string; user_id: string; email: string; full_name: string }[];

    // Soft-delete the trip
    await run("UPDATE trips SET status = 'deleted', deleted_at = NOW() WHERE id = $1", [id]);

    // Cancel all active bookings and set user_notification_seen to 0
    await run(`
      UPDATE trip_bookings
      SET cancelled_at = NOW(),
          cancel_reason = 'Trip cancelled by organizer',
          booking_status = CASE WHEN booking_status IN ('confirmed', 'pending_payment', 'payment_processing') THEN 'cancelled' ELSE booking_status END,
          payment_status = CASE WHEN payment_status IN ('pending', 'processing') THEN 'failed' ELSE payment_status END,
          user_notification_seen = 0
      WHERE trip_id = $1 AND cancelled_at IS NULL
    `, [id]);

    // Send emails and trigger SSE notifications for all booked users
    for (const booking of bookings) {
      // Send email asynchronously
      sendBusinessTripCancelledEmail({
        to: booking.email,
        userName: booking.full_name,
        organizerName: user.full_name || 'The Organizer',
        tripTitle: trip.title,
      }).catch(err => console.error(`Failed to send cancellation email to ${booking.email}:`, err));

      // Trigger SSE notification event for the user
      void notifyUser(booking.user_id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete business trip error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
