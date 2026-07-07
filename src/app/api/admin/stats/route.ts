import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { queryOne, query } from '@/lib/db';
import { isAdminUser } from '@/lib/admin';

export async function GET() {
  try {
    const user = await getSession();

    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Real counts from DB (excluding soft-deleted/anonymized users)
    const totalUsers = (await queryOne('SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL', []) as { count: number }).count;
    const liveTrips = (await queryOne("SELECT COUNT(*) as count FROM trips WHERE status = 'live'", []) as { count: number }).count;
    const pendingTrips = (await queryOne("SELECT COUNT(*) as count FROM trips WHERE status = 'pending'", []) as { count: number }).count;
    const activeReports = (await queryOne("SELECT COUNT(*) as count FROM reports WHERE status = 'pending'", []) as { count: number }).count;
    const pendingFeedbacks = (await queryOne("SELECT COUNT(*) as count FROM feedbacks WHERE status = 'pending'", []) as { count: number }).count;
    let openSupportTickets = 0;
    try { openSupportTickets = (await queryOne("SELECT COUNT(*) as count FROM support_tickets WHERE status IN ('open', 'in_progress')", []) as { count: number }).count; } catch { /* table might not exist yet */ }

    // Recent users (last 5, excluding soft-deleted/anonymized users)
    const recentUsers = await query("SELECT id, full_name, email, role, created_at FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 5", []) as { id: string; full_name: string; email: string; role: string; created_at: string }[];

    // Recent trips (last 5, excluding soft-deleted trips)
    const recentTrips = await query(`SELECT t.id, t.title, t.destination, t.status, t.created_at, u.full_name as organizer
       FROM trips t
       LEFT JOIN users u ON t.organizer_id = u.id
       WHERE t.status <> 'deleted'
       ORDER BY t.created_at DESC LIMIT 5`, []) as { id: string; title: string; destination: string; status: string; created_at: string; organizer: string }[];

    // Recent reports (last 5)
    const recentReports = await query(`SELECT r.id, r.reason, r.status, r.created_at,
              ru.full_name as reporter_name,
              rpu.full_name as reported_user_name
       FROM reports r
       LEFT JOIN users ru ON r.reporter_id = ru.id
       LEFT JOIN users rpu ON r.reported_user_id = rpu.id
       ORDER BY r.created_at DESC LIMIT 5`, []) as { id: string; reason: string; status: string; created_at: string; reporter_name: string; reported_user_name: string }[];

    return NextResponse.json({
      stats: { totalUsers, liveTrips, pendingTrips, activeReports, pendingFeedbacks, openSupportTickets },
      recentUsers,
      recentTrips,
      recentReports,
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
