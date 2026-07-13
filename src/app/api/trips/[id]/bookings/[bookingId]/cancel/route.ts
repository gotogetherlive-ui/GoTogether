import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { sendBookingCancelledToOrganizer } from '@/lib/email';
import { notifyUser, notifyAdmins } from '@/lib/notificationEvents';
import { BookingCancellationService } from '@/lib/payments/cancellation-service';
import { CancellationPolicyEngine } from '@/lib/payments/cancellation-policy-engine';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; bookingId: string }> }
) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { bookingId } = await params;

    const booking = await queryOne(`
      SELECT b.id, b.user_id, b.trip_id, b.amount, b.trip_date, b.booking_status, b.payment_status,
             t.start_date as trip_start_date, t.organizer_id,
             pt.provider_payment_id
      FROM trip_bookings b
      JOIN trips t ON b.trip_id = t.id
      LEFT JOIN payments.orders po ON po.booking_id = b.id
      LEFT JOIN payments.transactions pt ON pt.order_id = po.id AND pt.status = 'SUCCESS'
      WHERE b.id = $1
    `, [bookingId]) as any;

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    if (booking.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const policyResult = CancellationPolicyEngine.calculateRefund(
      { amount: booking.amount || 0, trip_date: booking.trip_date || booking.trip_start_date }
    );

    const hasSuccessfulPayment = booking.booking_status === "confirmed" && !!booking.provider_payment_id;
    if (!hasSuccessfulPayment) {
      policyResult.refundPercentage = 0;
      policyResult.refundAmount = 0;
      policyResult.cancellationFee = 0;
      policyResult.allowed = true;
      policyResult.message = "No payment was captured for this booking.";
    }

    return NextResponse.json({
      allowed: policyResult.allowed,
      refundPercentage: policyResult.refundPercentage,
      refundAmount: policyResult.refundAmount,
      cancellationFee: policyResult.cancellationFee,
      message: policyResult.message,
      refundEta: "5-7 business days",
    });
  } catch (err) {
    console.error('Fetch cancellation details error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; bookingId: string }> }
) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { bookingId } = await params;
    const body = await request.json().catch(() => ({}));
    const cancel_reason = body.cancel_reason || null;

    const result = await BookingCancellationService.cancelBooking({
      bookingId,
      cancelledBy: "user",
      reason: cancel_reason,
      userId: user.id
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    // Trigger organizer email asynchronously
    if (result.travelerEmail) {
      try {
        await sendBookingCancelledToOrganizer({
          to: result.organizerEmail!,
          organizerName: result.organizerName!,
          tripTitle: result.tripTitle!,
          tripDate: result.tripDate!,
          bookingRef: result.bookingRef!,
          travelerName: result.travelerName!,
          travelerCount: result.travelerCount!,
          amountRefunded: result.refundInitiated ? (result.refundAmount! / 100) : 0,
          cancelReason: cancel_reason || 'Cancelled by traveler',
        });
      } catch (mailErr) {
        console.error('[CANCEL MAIL ERROR] Failed to email organizer:', mailErr);
      }
    }

    // Send dashboard push signals
    try {
      notifyUser(user.id);
      notifyAdmins();
    } catch (err) {
      console.error('Failed to emit cancel notifications:', err);
    }

    return NextResponse.json({
      success: true,
      refunded: result.refundInitiated,
      refund_pending: result.refundPending,
      refund_error: result.refundError
    });
  } catch (err) {
    console.error('Cancel booking error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

