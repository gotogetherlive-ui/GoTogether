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

    const [counts, recentUsers, recentTrips, recentReports] = await Promise.all([
      queryOne<{
        total_users: number; live_trips: number; pending_trips: number;
        active_reports: number; pending_feedbacks: number; open_support_tickets: number;
      }>(`
        SELECT
          (SELECT COUNT(*)::int FROM users WHERE deleted_at IS NULL) AS total_users,
          (SELECT COUNT(*)::int FROM trips WHERE status = 'live') AS live_trips,
          (SELECT COUNT(*)::int FROM trips WHERE status = 'pending') AS pending_trips,
          (SELECT COUNT(*)::int FROM reports WHERE status = 'pending') AS active_reports,
          (SELECT COUNT(*)::int FROM feedbacks WHERE status = 'pending') AS pending_feedbacks,
          (SELECT COUNT(*)::int FROM support_tickets WHERE status IN ('open', 'in_progress')) AS open_support_tickets
      `),
      query("SELECT id, full_name, email, role, created_at FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 5", []) as Promise<{ id: string; full_name: string; email: string; role: string; created_at: string }[]>,
      query(`SELECT t.id, t.title, t.destination, t.status, t.created_at, u.full_name as organizer
       FROM trips t
       LEFT JOIN users u ON t.organizer_id = u.id
       WHERE t.status <> 'deleted'
       ORDER BY t.created_at DESC LIMIT 5`, []) as Promise<{ id: string; title: string; destination: string; status: string; created_at: string; organizer: string }[]>,
      query(`SELECT r.id, r.reason, r.status, r.created_at,
              ru.full_name as reporter_name,
              rpu.full_name as reported_user_name
       FROM reports r
       LEFT JOIN users ru ON r.reporter_id = ru.id
       LEFT JOIN users rpu ON r.reported_user_id = rpu.id
       ORDER BY r.created_at DESC LIMIT 5`, []) as Promise<{ id: string; reason: string; status: string; created_at: string; reporter_name: string; reported_user_name: string }[]>,
    ]);

    return NextResponse.json({
      stats: {
        totalUsers: counts?.total_users || 0,
        liveTrips: counts?.live_trips || 0,
        pendingTrips: counts?.pending_trips || 0,
        activeReports: counts?.active_reports || 0,
        pendingFeedbacks: counts?.pending_feedbacks || 0,
        openSupportTickets: counts?.open_support_tickets || 0,
      },
      recentUsers,
      recentTrips,
      recentReports,
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
