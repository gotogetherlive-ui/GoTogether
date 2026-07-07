import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import QRCode from 'qrcode';
import { absoluteUrl } from '@/lib/seo';

export async function GET(request: Request, context: any) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { bookingId } = await context.params;
    const normalizedProfilePhone = (user.phone_number || '').replace(/\D/g, '');
    const booking = await queryOne(`
      SELECT b.id, b.booking_ref, b.booking_status, b.payment_status, b.approval_status,
             b.amount, b.expires_at, b.paid_at, b.verified_at,
             po.provider_order_id as razorpay_order_id,
             pt.provider_payment_id as razorpay_payment_id,
             b.trip_id, b.male_count, b.female_count, b.child_count,
             b.names, b.phone_number, b.alternate_phone_number, b.trip_date,
             t.title as trip_title, t.destination,
             tk.ticket_number, tk.qr_code_data
      FROM trip_bookings b
      JOIN trips t ON b.trip_id = t.id
      LEFT JOIN payments.orders po ON po.booking_id = b.id
      LEFT JOIN payments.transactions pt ON pt.order_id = po.id AND pt.status = 'SUCCESS'
      LEFT JOIN booking_tickets tk ON tk.booking_id = b.id
      WHERE b.id = $1
        AND (
          b.user_id = $2
          OR (
            $3 <> ''
            AND t.organizer_id <> $2
            AND b.booking_status IN ('pending_payment', 'payment_processing')
            AND b.expires_at IS NOT NULL
            AND b.expires_at > NOW()
            AND (
              regexp_replace(COALESCE(b.phone_number, ''), '[^0-9]', '', 'g') = $3
              OR regexp_replace(COALESCE(b.alternate_phone_number, ''), '[^0-9]', '', 'g') = $3
            )
          )
        )
      ORDER BY pt.created_at DESC NULLS LAST
      LIMIT 1
    `, [bookingId, user.id, normalizedProfilePhone]) as any;

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    let qrCodeData = booking.qr_code_data || null;
    let ticketVerificationUrl: string | null = null;
    if (booking.ticket_number) {
      ticketVerificationUrl = absoluteUrl(`/verify-ticket/${encodeURIComponent(booking.ticket_number)}`);
      try {
        qrCodeData = await QRCode.toDataURL(ticketVerificationUrl, { width: 300, margin: 2 });
      } catch {
        qrCodeData = booking.qr_code_data || null;
      }
    }

    return NextResponse.json({
      id: booking.id,
      booking_ref: booking.booking_ref,
      booking_status: booking.booking_status,
      payment_status: booking.payment_status,
      approval_status: booking.approval_status,
      amount: booking.amount,
      expires_at: booking.expires_at,
      paid_at: booking.paid_at,
      verified_at: booking.verified_at,
      trip_title: booking.trip_title,
      destination: booking.destination,
      ticket_number: booking.ticket_number || null,
      qr_code_data: qrCodeData,
      ticket_verification_url: ticketVerificationUrl,
      male_count: booking.male_count || 0,
      female_count: booking.female_count || 0,
      child_count: booking.child_count || 0,
      names: booking.names || "",
      phone_number: booking.phone_number || "",
      alternate_phone_number: booking.alternate_phone_number || "",
      trip_date: booking.trip_date || "",
      total_travelers: (booking.male_count || 0) + (booking.female_count || 0) + (booking.child_count || 0),
    });
  } catch (err) {
    console.error('[BOOKING STATUS] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
