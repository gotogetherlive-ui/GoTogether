import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query, run } from '@/lib/db';
import { isAdminUser } from '@/lib/admin';

export async function GET(request: Request, context: any) {
  try {
    const user = await getSession();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: tripId } = await context.params;

    const bookings = await query(`
      SELECT 
        tb.id, tb.male_count, tb.female_count, tb.child_count, tb.names,
        tb.phone_number, tb.alternate_phone_number, tb.trip_date, tb.status, tb.created_at,
        tb.booking_status, tb.payment_status, tb.amount,
        u.full_name as user_name, u.email as user_email, u.avatar_url as user_avatar,
        u.phone_number as user_phone, u.age as user_age, u.gender as user_gender,
        COALESCE(bc.refund_status, LOWER(ref.status)) as refund_status,
        COALESCE(bc.refund_amount, ref.amount) as refund_amount
      FROM trip_bookings tb
      JOIN users u ON tb.user_id = u.id
      LEFT JOIN LATERAL (
        SELECT id
        FROM payments.orders po_latest
        WHERE po_latest.booking_id = tb.id
        ORDER BY po_latest.created_at DESC
        LIMIT 1
      ) po ON TRUE
      LEFT JOIN LATERAL (
        SELECT transaction_id
        FROM payments.transactions pt_latest
        WHERE pt_latest.order_id = po.id AND pt_latest.status = 'SUCCESS'
        ORDER BY pt_latest.paid_at DESC NULLS LAST, pt_latest.created_at DESC
        LIMIT 1
      ) pt ON TRUE
      LEFT JOIN LATERAL (
        SELECT refund_status, refund_amount
        FROM booking_cancellations bc_latest
        WHERE bc_latest.booking_id = tb.id
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
      WHERE tb.trip_id = $1
      ORDER BY tb.created_at DESC
    `, [tripId]);

    // Mark all bookings for this trip as seen
    await run('UPDATE trip_bookings SET notification_seen = 1 WHERE trip_id = $1 AND notification_seen = 0', [tripId]);

    return NextResponse.json({ bookings });
  } catch (err) {
    console.error('Fetch admin trip bookings error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
