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

    // Real counts from DB
    const totalUsers = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
    const liveTrips = (db.prepare("SELECT COUNT(*) as count FROM trips WHERE status = 'live'").get() as { count: number }).count;
    const pendingTrips = (db.prepare("SELECT COUNT(*) as count FROM trips WHERE status = 'pending'").get() as { count: number }).count;
    const activeReports = (db.prepare("SELECT COUNT(*) as count FROM reports WHERE status = 'pending'").get() as { count: number }).count;
    const pendingFeedbacks = (db.prepare("SELECT COUNT(*) as count FROM feedbacks WHERE status = 'pending'").get() as { count: number }).count;
    let openSupportTickets = 0;
    try { openSupportTickets = (db.prepare("SELECT COUNT(*) as count FROM support_tickets WHERE status IN ('open', 'in_progress')").get() as { count: number }).count; } catch { /* table might not exist yet */ }

    // Recent users (last 5)
    const recentUsers = db.prepare(
      "SELECT id, full_name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 5"
    ).all() as { id: string; full_name: string; email: string; role: string; created_at: string }[];

    // Recent trips (last 5)
    const recentTrips = db.prepare(
      `SELECT t.id, t.title, t.destination, t.status, t.created_at, u.full_name as organizer
       FROM trips t
       LEFT JOIN users u ON t.organizer_id = u.id
       ORDER BY t.created_at DESC LIMIT 5`
    ).all() as { id: string; title: string; destination: string; status: string; created_at: string; organizer: string }[];

    // Recent reports (last 5)
    const recentReports = db.prepare(
      `SELECT r.id, r.reason, r.status, r.created_at,
              ru.full_name as reporter_name,
              rpu.full_name as reported_user_name
       FROM reports r
       LEFT JOIN users ru ON r.reporter_id = ru.id
       LEFT JOIN users rpu ON r.reported_user_id = rpu.id
       ORDER BY r.created_at DESC LIMIT 5`
    ).all() as { id: string; reason: string; status: string; created_at: string; reporter_name: string; reported_user_name: string }[];

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
