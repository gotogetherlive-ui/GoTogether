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

    const feedback = db.prepare(`
      SELECT f.id, f.category, f.subject, f.description, f.status, f.created_at,
             u.id as user_id, u.full_name as user_name, u.email as user_email, 
             u.phone_number as user_phone, u.age as user_age, u.gender as user_gender,
             u.avatar_url as user_avatar
      FROM feedbacks f
      JOIN users u ON f.user_id = u.id
      WHERE f.id = ?
    `).get(id);

    if (!feedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    return NextResponse.json({ feedback });
  } catch (err) {
    console.error('Admin feedback detail error:', err);
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

    if (body.status && ['pending', 'solved'].includes(body.status)) {
      db.prepare('UPDATE feedbacks SET status = ? WHERE id = ?').run(body.status, id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('Admin feedback update error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
