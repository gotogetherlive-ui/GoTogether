import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { queryOne, run } from '@/lib/db';
import { isAdminUser } from '@/lib/admin';
import { parseInrToPaise } from '@/lib/money';

export async function PATCH(request: Request, context: any) {
  try {
    const user = await getSession();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();
    
    if (body.action === 'status') {
      if (!['pending', 'live', 'rejected', 'deleted'].includes(body.status)) {
        return NextResponse.json({ error: 'Invalid trip status' }, { status: 400 });
      }
      if (body.gotogether_price && parseInrToPaise(body.gotogether_price) <= 0) {
        return NextResponse.json({ error: 'Invalid GoTogether price' }, { status: 400 });
      }
      if (body.gotogether_price) {
        await run('UPDATE trips SET status = $1, gotogether_price = $2, notification_seen = 0 WHERE id = $3', [body.status, body.gotogether_price, id]);
      } else {
        await run('UPDATE trips SET status = $1, notification_seen = 0 WHERE id = $2', [body.status, id]);
      }
      return NextResponse.json({ success: true });
    }
    if (body.action === 'feature') {
      await run('UPDATE trips SET is_featured = $1 WHERE id = $2', [body.is_featured ? 1 : 0, id]);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: any) {
  try {
    const user = await getSession();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await context.params;
    
    const paidBooking = await queryOne(`
      SELECT id FROM trip_bookings
      WHERE trip_id = $1 AND booking_status = 'confirmed' AND cancelled_at IS NULL
      LIMIT 1
    `, [id]);
    if (paidBooking) {
      return NextResponse.json({ error: 'Refund active paid bookings before deleting this trip' }, { status: 409 });
    }
    await run("UPDATE trips SET status = 'deleted', deleted_at = NOW() WHERE id = $1", [id]);
    
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete trip error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
