import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { queryOne, run } from '@/lib/db';
import { isAdminUser } from '@/lib/admin';
import { invalidateSettingsCache } from '@/lib/settings';

export async function GET() {
  try {
    const user = await getSession();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rawSettings = await queryOne('SELECT id, site_name, site_tagline, admin_email, auto_approve_trips, require_verification, email_notifications, report_alerts, new_user_alerts, maintenance_mode, stories_blocked, updated_at FROM settings WHERE id = 1', []) as Record<string, any> | undefined;
    
    // Map report_alerts to feedback_alerts for frontend compatibility
    const settings = rawSettings ? {
      ...rawSettings,
      feedback_alerts: rawSettings.report_alerts ?? rawSettings.feedback_alerts ?? 1,
    } : null;
    
    // Also get database stats
    const dbStats = {
      status: 'Online',
      tables: Number((await queryOne("SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'", []) as { count: number | string }).count),
      rls: 'Managed in application authorization',
      storage: 'PostgreSQL'
    };

    return NextResponse.json({ settings, dbStats });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getSession();
    if (!user || !(await isAdminUser(user))) {
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
      maintenance_mode,
      stories_blocked
    } = body;

    // Use report_alerts column in DB (backward compatible)
    await run(`
      UPDATE settings
      SET site_name = COALESCE($1, site_name),
          site_tagline = COALESCE($2, site_tagline),
          admin_email = COALESCE($3, admin_email),
          auto_approve_trips = COALESCE($4, auto_approve_trips),
          require_verification = COALESCE($5, require_verification),
          email_notifications = COALESCE($6, email_notifications),
          report_alerts = COALESCE($7, report_alerts),
          new_user_alerts = COALESCE($8, new_user_alerts),
          maintenance_mode = COALESCE($9, maintenance_mode),
          stories_blocked = COALESCE($10, stories_blocked),
          updated_at = NOW()
      WHERE id = 1
    `, [site_name ?? null,
      site_tagline ?? null,
      admin_email ?? null,
      auto_approve_trips === undefined ? null : auto_approve_trips ? 1 : 0,
      require_verification === undefined ? null : require_verification ? 1 : 0,
      email_notifications === undefined ? null : email_notifications ? 1 : 0,
      feedback_alerts === undefined ? null : feedback_alerts ? 1 : 0,
      new_user_alerts === undefined ? null : new_user_alerts ? 1 : 0,
      maintenance_mode === undefined ? null : maintenance_mode ? 1 : 0,
      stories_blocked === undefined ? null : stories_blocked ? 1 : 0]);

    const rawUpdated = await queryOne('SELECT id, site_name, site_tagline, admin_email, auto_approve_trips, require_verification, email_notifications, report_alerts, new_user_alerts, maintenance_mode, stories_blocked, updated_at FROM settings WHERE id = 1', []) as Record<string, any>;
    const updated = {
      ...rawUpdated,
      feedback_alerts: rawUpdated.report_alerts ?? rawUpdated.feedback_alerts ?? 1,
    };
    invalidateSettingsCache();
    return NextResponse.json({ settings: updated });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
