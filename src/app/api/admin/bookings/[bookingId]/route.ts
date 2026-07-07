import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { isAdminUser } from '@/lib/admin';
import { queryOne } from '@/lib/db';
import { BookingCancellationService } from '@/lib/payments/cancellation-service';
import { notifyUser, notifyAdmins } from '@/lib/notificationEvents';

export async function GET(request: Request, context: any) {
  try {
    const user = await getSession();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { bookingId } = await context.params;

    // Support partial booking-ID lookups (the admin UI shows a truncated ref)
    const searchId = bookingId.toLowerCase();

    const booking = await queryOne(`
      SELECT
        tb.id as booking_id, tb.status, tb.created_at as booked_at,
        tb.male_count, tb.female_count, tb.child_count, tb.names,
        tb.phone_number, tb.alternate_phone_number, tb.trip_date,
        tb.cancelled_at, tb.cancel_reason,
        tb.booking_status, tb.payment_status, tb.amount,
        po.provider_order_id as razorpay_order_id, pt.provider_payment_id as razorpay_payment_id, tb.booking_ref,
        t.id as trip_id, t.title as trip_title, t.destination, t.duration_days,
        t.status as trip_status, t.image_url, t.pickup_point, t.drop_point,
        t.b2c_price, t.b2b_price, t.gotogether_price, t.start_date,
        u.id as user_id, u.full_name as user_name, u.email as user_email,
        u.phone_number as user_phone, u.age as user_age, u.gender as user_gender,
        u.avatar_url as user_avatar,
        org.full_name as organizer_name, org.email as organizer_email
      FROM trip_bookings tb
      JOIN trips t ON tb.trip_id = t.id
      JOIN users u ON tb.user_id = u.id
      JOIN users org ON t.organizer_id = org.id
      LEFT JOIN payments.orders po ON po.booking_id = tb.id
      LEFT JOIN payments.transactions pt ON pt.order_id = po.id AND pt.status = 'SUCCESS'
      WHERE LOWER(tb.id) = $1 OR LOWER(tb.id) LIKE $2
      LIMIT 1
    `, [searchId, searchId + '%']) as any;

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    return NextResponse.json({ booking });
  } catch (err) {
    console.error('Admin booking lookup error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request, context: any) {
  try {
    const user = await getSession();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { bookingId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const { cancel_reason, force_refund_amount } = body;

    const result = await BookingCancellationService.cancelBooking({
      bookingId,
      cancelledBy: "admin",
      reason: cancel_reason || "Force-cancelled by Admin",
      forceRefundAmount: typeof force_refund_amount === 'number' ? force_refund_amount : null
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    try {
      notifyUser(result.bookingId!);
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
    console.error('Admin force cancel booking error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
