import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { queryOne, query, run } from '@/lib/db';

export async function GET(request: Request, context: any) {
  try {
    const user = await getSession();
    if (!user || user.role !== 'business') {
      return NextResponse.json({ error: 'Not authenticated as a business' }, { status: 401 });
    }

    const { id: tripId } = await context.params;

    // Verify the trip belongs to this business user
    const trip = await queryOne('SELECT id FROM trips WHERE id = $1 AND organizer_id = $2', [tripId, user.id]) as any;
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found or not owned by you' }, { status: 404 });
    }

    const bookings = await query(`
      SELECT 
        tb.id, tb.male_count, tb.female_count, tb.child_count, tb.names, 
        tb.phone_number, tb.alternate_phone_number, tb.trip_date, tb.status, tb.created_at,
        tb.booking_status, tb.payment_status, tb.amount, tb.booking_ref,
        COALESCE(po.provider_order_id, tb.razorpay_order_id) as razorpay_order_id,
        COALESCE(pt.provider_payment_id, tb.razorpay_payment_id) as razorpay_payment_id,
        t.registration_closed,
        u.full_name as user_name, u.email as user_email, u.avatar_url as user_avatar,
        u.phone_number as user_phone, u.age as user_age, u.gender as user_gender
      FROM trip_bookings tb
      JOIN trips t ON tb.trip_id = t.id
      JOIN users u ON tb.user_id = u.id
      LEFT JOIN LATERAL (
        SELECT id, provider_order_id
        FROM payments.orders po_latest
        WHERE po_latest.booking_id = tb.id
        ORDER BY po_latest.created_at DESC
        LIMIT 1
      ) po ON TRUE
      LEFT JOIN LATERAL (
        SELECT provider_payment_id
        FROM payments.transactions pt_latest
        WHERE pt_latest.order_id = po.id AND pt_latest.status = 'SUCCESS'
        ORDER BY pt_latest.paid_at DESC NULLS LAST, pt_latest.created_at DESC
        LIMIT 1
      ) pt ON TRUE
      WHERE tb.trip_id = $1
      ORDER BY tb.created_at DESC
    `, [tripId]);

    // Mark all as seen for this trip
    await run('UPDATE trip_bookings SET notification_seen = 1 WHERE trip_id = $1 AND notification_seen = 0', [tripId]);

    return NextResponse.json({ bookings });
  } catch (err) {
    console.error('Fetch business trip bookings error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
