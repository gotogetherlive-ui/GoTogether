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

    const feedbacks = db.prepare(`
      SELECT f.id, f.category, f.subject, f.description, f.status, f.created_at,
             u.full_name as user_name, u.email as user_email, u.phone_number as user_phone
      FROM feedbacks f
      JOIN users u ON f.user_id = u.id
      ORDER BY f.created_at DESC
    `).all();

    return NextResponse.json({ feedbacks });
  } catch (err) {
    console.error('Admin feedbacks error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
