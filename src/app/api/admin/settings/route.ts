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

    const rawSettings = db.prepare('SELECT * FROM settings WHERE id = 1').get() as Record<string, any> | undefined;
    
    // Map report_alerts to feedback_alerts for frontend compatibility
    const settings = rawSettings ? {
      ...rawSettings,
      feedback_alerts: rawSettings.report_alerts ?? rawSettings.feedback_alerts ?? 1,
    } : null;
    
    // Also get database stats
    const dbStats = {
      status: 'Online',
      tables: (db.prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table'").get() as { count: number }).count,
      rls: 'N/A (SQLite)',
      storage: 'Local'
    };

    return NextResponse.json({ settings, dbStats });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getSession();
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      site_name,
      site_tagline,
      admin_email,
      auto_approve_trips,
      require_verification,
      email_notifications,
      feedback_alerts,
      new_user_alerts,
      maintenance_mode
    } = body;

    // Use report_alerts column in DB (backward compatible)
    db.prepare(`
      UPDATE settings
      SET site_name = ?,
          site_tagline = ?,
          admin_email = ?,
          auto_approve_trips = ?,
          require_verification = ?,
          email_notifications = ?,
          report_alerts = ?,
          new_user_alerts = ?,
          maintenance_mode = ?,
          updated_at = datetime('now')
      WHERE id = 1
    `).run(
      site_name,
      site_tagline,
      admin_email,
      auto_approve_trips ? 1 : 0,
      require_verification ? 1 : 0,
      email_notifications ? 1 : 0,
      feedback_alerts ? 1 : 0,
      new_user_alerts ? 1 : 0,
      maintenance_mode ? 1 : 0
    );

    const rawUpdated = db.prepare('SELECT * FROM settings WHERE id = 1').get() as Record<string, any>;
    const updated = {
      ...rawUpdated,
      feedback_alerts: rawUpdated.report_alerts ?? rawUpdated.feedback_alerts ?? 1,
    };
    return NextResponse.json({ settings: updated });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
