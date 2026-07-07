import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { queryOne, run } from '@/lib/db';
import { isAdminUser } from '@/lib/admin';
import { PaymentOrchestrator } from '@/lib/payments/orchestrator';

export async function POST(
  request: Request,
  context: any
) {
  try {
    const user = await getSession();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { bookingId } = await context.params;

    // Look up the booking
    const booking = await queryOne<any>(
      `SELECT id, trip_id, booking_status, payment_status, amount FROM public.trip_bookings WHERE id = $1`,
      [bookingId]
    );

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Verify booking is eligible for retry
    if (!['trip_cancelled', 'cancelled', 'refund_pending', 'refund_failed'].includes(booking.booking_status)) {
      return NextResponse.json({ error: 'Booking is not in a cancelled or failed refund state' }, { status: 400 });
    }

    // Reset payment status to pending so it is picked up by orchestration and gateway
    await run(
      `UPDATE public.trip_bookings 
       SET payment_status = 'refund_pending',
           booking_status = CASE WHEN booking_status = 'refund_failed' THEN 'refund_pending' ELSE booking_status END
       WHERE id = $1`,
      [bookingId]
    );

    // Reset any FAILED refund entries back to PENDING for re-processing
    await run(
      `UPDATE payments.refunds SET status = 'PENDING', provider_refund_id = NULL, updated_at = NOW()
       WHERE transaction_id IN (
         SELECT t.transaction_id FROM payments.transactions t
         JOIN payments.orders o ON o.id = t.order_id
         WHERE o.booking_id = $1
       ) AND status IN ('FAILED', 'PENDING')`,
      [bookingId]
    );

    // Call payment orchestrator to process refund
    const refundRes = await PaymentOrchestrator.refundBooking(bookingId, "Admin Manual Retry");
    
    if (refundRes.ok) {
      return NextResponse.json({ success: true, message: 'Refund retry initiated successfully' });
    } else {
      return NextResponse.json({ error: refundRes.error || 'Failed to trigger gateway refund' }, { status: 502 });
    }

  } catch (err: any) {
    console.error('Retry refund error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
