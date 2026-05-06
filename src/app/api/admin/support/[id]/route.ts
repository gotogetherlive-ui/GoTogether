import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

const ADMIN_EMAIL = 'gotogether.live@gmail.com';

export async function GET(request: Request, context: any) {
  try {
    const user = await getSession();
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await context.params;

    const ticket = db.prepare(`
      SELECT st.id, st.full_name, st.email, st.phone, st.category, st.subject, st.message,
             st.status, st.admin_notes, st.created_at, st.user_id,
             u.full_name as user_account_name, u.email as user_account_email,
             u.avatar_url as user_avatar, u.phone_number as user_phone,
             u.age as user_age, u.gender as user_gender, u.role as user_role,
             u.created_at as user_joined
      FROM support_tickets st
      LEFT JOIN users u ON st.user_id = u.id
      WHERE st.id = ?
    `).get(id);

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    return NextResponse.json({ ticket });
  } catch (err) {
    console.error('Admin support ticket detail error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: any) {
  try {
    const user = await getSession();
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();

    if (body.status && ['open', 'in_progress', 'resolved', 'closed'].includes(body.status)) {
      db.prepare('UPDATE support_tickets SET status = ? WHERE id = ?').run(body.status, id);
    }

    if (body.admin_notes !== undefined) {
      db.prepare('UPDATE support_tickets SET admin_notes = ? WHERE id = ?').run(body.admin_notes, id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Admin support ticket update error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
