import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

const ADMIN_EMAIL = 'gotogether.live@gmail.com';

export async function GET() {
  try {
    const user = await getSession();
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const tickets = db.prepare(`
      SELECT st.id, st.full_name, st.email, st.phone, st.category, st.subject, st.message,
             st.status, st.admin_notes, st.notification_seen, st.created_at,
             u.full_name as user_account_name, u.avatar_url as user_avatar,
             u.phone_number as user_phone, u.age as user_age, u.gender as user_gender
      FROM support_tickets st
      LEFT JOIN users u ON st.user_id = u.id
      ORDER BY st.created_at DESC
    `).all();

    return NextResponse.json({ tickets });
  } catch (err) {
    console.error('Admin support tickets error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
