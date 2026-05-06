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

    const reports = db.prepare(`
      SELECT 
        r.id, r.reason as subject, r.status, r.created_at as created,
        ru.full_name as reporter,
        rpu.full_name as reported_user,
        rpt.title as reported_trip
      FROM reports r
      LEFT JOIN users ru ON r.reporter_id = ru.id
      LEFT JOIN users rpu ON r.reported_user_id = rpu.id
      LEFT JOIN trips rpt ON r.reported_trip_id = rpt.id
      ORDER BY r.created_at DESC
    `).all() as { 
      id: string; 
      subject: string; 
      status: string; 
      created: string; 
      reporter: string; 
      reported_user: string | null;
      reported_trip: string | null;
    }[];

    const formattedReports = reports.map(r => ({
      ...r,
      type: r.reported_trip ? "Trip Report" : "User Report",
      reportedEntity: r.reported_trip || r.reported_user || "Unknown",
      severity: r.status === "pending" ? "high" : "low" // Mock severity logic
    }));

    return NextResponse.json({ reports: formattedReports });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
