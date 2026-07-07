import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { isAdminUser } from '@/lib/admin';

export async function GET() {
  try {
    const user = await getSession();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const trips = await query(`
      SELECT t.id, t.title, t.status, t.is_featured, t.destination, t.description,
             t.duration_days, t.duration_nights, t.pickup_point, t.drop_point,
             t.b2b_price, t.b2c_price, t.gotogether_price, t.image_url, t.brochure_url, t.created_at,
             u.full_name as organizer_name, u.role as organizer_role, u.email as organizer_email,
             (SELECT COUNT(*) FROM trip_bookings WHERE trip_id = t.id) as booking_count
      FROM trips t
      JOIN users u ON t.organizer_id = u.id
      WHERE t.trip_type = 'premium' AND t.status <> 'deleted'
      ORDER BY t.created_at DESC
    `, []);

    return NextResponse.json({ trips });
  } catch (err) {
    console.error("GET /api/admin/trips error:", err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
