import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import QRCode from 'qrcode';
import { absoluteUrl } from '@/lib/seo';

export async function GET(request: Request, context: any) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookingId } = await context.params;

    const booking = await queryOne(`
      SELECT b.id, b.booking_ref, b.booking_status, b.payment_status,
             b.amount, b.trip_id, b.user_id, b.male_count, b.female_count, b.child_count,
             b.names, b.phone_number, b.trip_date, b.paid_at, pt.provider_payment_id as razorpay_payment_id,
             t.title as trip_title, t.destination, t.pickup_point, t.drop_point,
             t.start_date, t.duration_days, t.duration_nights,
             org.full_name as organizer_name, org.email as organizer_email,
             org.phone_number as organizer_phone,
             tk.ticket_number, tk.qr_code_data, tk.generated_at as ticket_generated_at
      FROM trip_bookings b
      JOIN trips t ON b.trip_id = t.id
      JOIN users org ON t.organizer_id = org.id
      LEFT JOIN booking_tickets tk ON tk.booking_id = b.id
      LEFT JOIN payments.orders po ON po.booking_id = b.id
      LEFT JOIN payments.transactions pt ON pt.order_id = po.id AND pt.status = 'SUCCESS'
      WHERE b.id = $1 AND b.user_id = $2
    `, [bookingId, user.id]) as any;

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.booking_status !== 'confirmed') {
      return NextResponse.json({ error: 'Booking is not confirmed yet' }, { status: 400 });
    }

    let passengerNames: string[] = [];
    try { passengerNames = JSON.parse(booking.names); } catch { /* fallback */ }

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
      booking_ref: booking.booking_ref,
      ticket_number: booking.ticket_number,
      qr_code_data: qrCodeData,
      ticket_verification_url: ticketVerificationUrl,
      trip: {
        title: booking.trip_title,
        destination: booking.destination,
        pickup_point: booking.pickup_point,
        drop_point: booking.drop_point,
        start_date: booking.start_date,
        duration_days: booking.duration_days,
        duration_nights: booking.duration_nights,
        trip_date: booking.trip_date,
      },
      travelers: {
        male_count: booking.male_count,
        female_count: booking.female_count,
        child_count: booking.child_count,
        names: passengerNames,
        phone_number: booking.phone_number,
      },
      organizer: {
        name: booking.organizer_name,
        email: booking.organizer_email,
        phone: booking.organizer_phone,
      },
      payment: {
        amount: booking.amount / 100,
        razorpay_payment_id: booking.razorpay_payment_id,
        paid_at: booking.paid_at,
      },
      ticket_generated_at: booking.ticket_generated_at,
    });

  } catch (err) {
    console.error('[TICKET] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

