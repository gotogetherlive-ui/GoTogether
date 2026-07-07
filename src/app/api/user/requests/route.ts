import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';
import QRCode from 'qrcode';
import { absoluteUrl } from '@/lib/seo';

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const normalizedProfilePhone = (user.phone_number || '').replace(/\D/g, '');

    // Fetch trips the user has requested to join
    const requests = await query(`
      SELECT 
        r.id as request_id, r.status as request_status, r.created_at as requested_at,
        t.id as trip_id, t.slug as trip_slug, t.title, t.destination, t.duration_days,
        u.full_name as organizer_name
      FROM trip_requests r
      JOIN trips t ON r.trip_id = t.id
      JOIN users u ON t.organizer_id = u.id
      WHERE r.requester_id = $1
      ORDER BY r.created_at DESC
    `, [user.id]);

    const bookings = await query(`
      SELECT 
        b.id as booking_id,
        b.status as legacy_status,
        b.approval_status,
        CASE
          WHEN b.booking_status IN ('pending_payment', 'payment_processing')
            AND b.expires_at IS NOT NULL
            AND b.expires_at < NOW()
          THEN 'expired'
          ELSE b.booking_status
        END as booking_status,
        b.payment_status,
        b.amount,
        b.expires_at,
        b.cancelled_at,
        b.cancel_reason,
        b.booking_ref,
        bt.ticket_number,
        bt.qr_code_data,
        COALESCE(po.provider_order_id, b.razorpay_order_id) as razorpay_order_id,
        COALESCE(pt.provider_payment_id, b.razorpay_payment_id) as razorpay_payment_id,
        b.created_at as booked_at,
        b.male_count, b.female_count, b.child_count, b.names, b.phone_number, b.trip_date,
        t.id as trip_id, t.slug as trip_slug, t.title, t.destination, t.duration_days, t.image_url,
        u.full_name as organizer_name,
        COALESCE(bc.refund_status, LOWER(ref.status)) as refund_status,
        COALESCE(bc.refund_amount, ref.amount) as refund_amount,
        bc.cancellation_fee,
        COALESCE(bc.cancelled_at, b.cancelled_at) as cancellation_date,
        tc.reason_type as trip_cancel_reason_type,
        tc.reason as trip_cancel_reason
      FROM trip_bookings b
      JOIN trips t ON b.trip_id = t.id
      JOIN users u ON t.organizer_id = u.id
      LEFT JOIN LATERAL (
        SELECT id, provider_order_id
        FROM payments.orders po_latest
        WHERE po_latest.booking_id = b.id
        ORDER BY po_latest.created_at DESC
        LIMIT 1
      ) po ON TRUE
      LEFT JOIN LATERAL (
        SELECT transaction_id, provider_payment_id
        FROM payments.transactions pt_latest
        WHERE pt_latest.order_id = po.id AND pt_latest.status = 'SUCCESS'
        ORDER BY pt_latest.paid_at DESC NULLS LAST, pt_latest.created_at DESC
        LIMIT 1
      ) pt ON TRUE
      LEFT JOIN LATERAL (
        SELECT ticket_number, qr_code_data
        FROM booking_tickets bt_latest
        WHERE bt_latest.booking_id = b.id
        ORDER BY bt_latest.generated_at DESC
        LIMIT 1
      ) bt ON TRUE
      LEFT JOIN LATERAL (
        SELECT refund_status, refund_amount, cancellation_fee, cancelled_at
        FROM booking_cancellations bc_latest
        WHERE bc_latest.booking_id = b.id
        ORDER BY bc_latest.cancelled_at DESC NULLS LAST
        LIMIT 1
      ) bc ON TRUE
      LEFT JOIN LATERAL (
        SELECT status, amount
        FROM payments.refunds ref_latest
        WHERE ref_latest.transaction_id = pt.transaction_id
        ORDER BY ref_latest.created_at DESC
        LIMIT 1
      ) ref ON TRUE
      LEFT JOIN LATERAL (
        SELECT reason_type, reason
        FROM public.trip_cancellations tc_latest
        WHERE tc_latest.trip_id = t.id
        ORDER BY tc_latest.started_at DESC NULLS LAST
        LIMIT 1
      ) tc ON TRUE
      WHERE (
        b.user_id = $1
        OR (
          $2 <> ''
          AND t.organizer_id <> $1
          AND b.booking_status IN ('pending_payment', 'payment_processing')
          AND b.expires_at IS NOT NULL
          AND b.expires_at > NOW()
          AND (
            regexp_replace(COALESCE(b.phone_number, ''), '[^0-9]', '', 'g') = $2
            OR regexp_replace(COALESCE(b.alternate_phone_number, ''), '[^0-9]', '', 'g') = $2
          )
        )
      )
        AND NOT (
          b.booking_status IN ('pending_payment', 'payment_processing')
          AND (b.expires_at IS NULL OR b.expires_at < NOW())
        )
      ORDER BY b.created_at DESC
    `, [user.id, normalizedProfilePhone]);

    const bookingsWithVerificationQr = await Promise.all(bookings.map(async (booking: any) => {
      if (!booking.ticket_number) return booking;
      const verificationUrl = absoluteUrl(`/verify-ticket/${encodeURIComponent(booking.ticket_number)}`);
      try {
        return {
          ...booking,
          qr_code_data: await QRCode.toDataURL(verificationUrl, { width: 300, margin: 2 }),
          ticket_verification_url: verificationUrl,
        };
      } catch {
        return { ...booking, ticket_verification_url: verificationUrl };
      }
    }));

    return NextResponse.json({ requests, bookings: bookingsWithVerificationQr });
  } catch (err) {
    console.error('Fetch user requests error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


