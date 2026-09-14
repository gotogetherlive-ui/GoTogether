import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { isAdminUser } from '@/lib/admin';
import { query, queryOne } from '@/lib/db';
import { notifyAdmins, notifyUser } from '@/lib/notificationEvents';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !(await isAdminUser(session))) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    const introductions = await query(`SELECT b.*, u.email AS user_email FROM business_introductions b
      JOIN users u ON u.id = b.user_id
      ORDER BY CASE WHEN b.status = 'pending' THEN 0 ELSE 1 END, b.created_at DESC`);
    return NextResponse.json({ introductions }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Business introductions review list failed:', error);
    return NextResponse.json({ error: 'Could not load business introductions.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session || !(await isAdminUser(session))) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
    if (!body || typeof body.id !== 'string' || !['approve', 'reject'].includes(body.action) || (body.note !== undefined && typeof body.note !== 'string') || (body.note?.length || 0) > 1000) {
      return NextResponse.json({ error: 'Invalid review details.' }, { status: 400 });
    }
    const introduction = await queryOne<{ user_id: string; status: string }>(
      `UPDATE business_introductions SET status = $1, review_note = $2, reviewed_by = $3,
       reviewed_at = NOW(), notification_seen = 1 WHERE id = $4 AND status = 'pending' RETURNING user_id, status`,
      [body.action === 'approve' ? 'approved' : 'rejected', body.note?.trim() || null, session.id, body.id]);
    if (!introduction) return NextResponse.json({ error: 'This request has already been reviewed or no longer exists. Refresh the list.' }, { status: 409 });
    await Promise.all([notifyAdmins(), notifyUser(introduction.user_id)]);
    return NextResponse.json({ success: true, status: introduction.status });
  } catch (error) {
    console.error('Business introduction review failed:', error);
    return NextResponse.json({ error: 'Could not save your decision.' }, { status: 500 });
  }
}
