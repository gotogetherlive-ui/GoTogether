import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { queryOne, run } from '@/lib/db';
import { isAdminUser } from '@/lib/admin';

export async function GET(request: Request, context: any) {
  try {
    const user = await getSession();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await context.params;

    const feedback = await queryOne(`
      SELECT f.id, f.category, f.subject, f.description, f.status, f.created_at,
             u.id as user_id, u.full_name as user_name, u.email as user_email, 
             u.phone_number as user_phone, u.age as user_age, u.gender as user_gender,
             u.avatar_url as user_avatar
      FROM feedbacks f
      JOIN users u ON f.user_id = u.id
      WHERE f.id = $1
    `, [id]);

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
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();

    if (body.status && ['pending', 'solved'].includes(body.status)) {
      await run('UPDATE feedbacks SET status = $1 WHERE id = $2', [body.status, id]);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('Admin feedback update error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
