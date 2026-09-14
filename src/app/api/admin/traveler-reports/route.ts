import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { isAdminUser } from '@/lib/admin';
import { query, queryOne } from '@/lib/db';
import { notifyAdmins } from '@/lib/notificationEvents';

export async function GET() {
  const user = await getSession();
  if (!user || !(await isAdminUser(user))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const reports = await query(`SELECT r.id, r.reason, r.status, r.created_at, r.reported_trip_id,
    reporter.full_name AS reporter_name, target.full_name AS traveler_name, t.title AS trip_title
    FROM reports r JOIN users reporter ON reporter.id = r.reporter_id
    JOIN users target ON target.id = r.reported_user_id LEFT JOIN trips t ON t.id = r.reported_trip_id
    ORDER BY CASE WHEN r.status = 'pending' THEN 0 ELSE 1 END, r.created_at DESC`);
  return NextResponse.json({ reports }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function PATCH(request: Request) {
  const user = await getSession();
  if (!user || !(await isAdminUser(user))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }); }
  if (!body || typeof body.id !== 'string') return NextResponse.json({ error: 'Report ID required' }, { status: 400 });
  const report = await queryOne("UPDATE reports SET status = 'reviewed', notification_seen = 1 WHERE id = $1 AND status = 'pending' RETURNING id", [body.id]);
  if (!report) return NextResponse.json({ error: 'Report was already reviewed or was not found.' }, { status: 409 });
  await notifyAdmins();
  return NextResponse.json({ success: true });
}
