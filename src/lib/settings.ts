import { queryOne } from './db';

export interface AppSettings {
  site_name: string;
  site_tagline: string;
  admin_email: string;
  auto_approve_trips: boolean;
  require_verification: boolean;
  email_notifications: boolean;
  feedback_alerts: boolean;
  new_user_alerts: boolean;
  maintenance_mode: boolean;
  stories_blocked: boolean;
}

// Simple in-memory cache to prevent database reads on every route invocation.
// Caches settings for 60 seconds.
let cachedSettings: AppSettings | null = null;
let cacheExpiry = 0;

/**
 * Read the app settings from the database.
 * Returns parsed booleans for toggle fields.
 */
export async function getAppSettings(): Promise<AppSettings> {
  const now = Date.now();
  if (cachedSettings && now < cacheExpiry) {
    return cachedSettings;
  }

  try {
    const row = await queryOne('SELECT id, site_name, site_tagline, admin_email, auto_approve_trips, require_verification, email_notifications, report_alerts, new_user_alerts, maintenance_mode, stories_blocked, updated_at FROM settings WHERE id = 1') as Record<string, any> | null;

    if (!row) {
      return {
        site_name: 'GoTogether',
        site_tagline: 'Travel Better, Together',
        admin_email: 'admin@gotogethertrip.com',
        auto_approve_trips: false,
        require_verification: true,
        email_notifications: true,
        feedback_alerts: true,
        new_user_alerts: false,
        maintenance_mode: false,
        stories_blocked: false,
      };
    }

    const settings: AppSettings = {
      site_name: row.site_name || 'GoTogether',
      site_tagline: row.site_tagline || 'Travel Better, Together',
      admin_email: row.admin_email || 'admin@gotogethertrip.com',
      auto_approve_trips: !!row.auto_approve_trips,
      require_verification: !!row.require_verification,
      email_notifications: !!row.email_notifications,
      feedback_alerts: !!(row.report_alerts ?? row.feedback_alerts ?? 1),
      new_user_alerts: !!row.new_user_alerts,
      maintenance_mode: !!row.maintenance_mode,
      stories_blocked: !!row.stories_blocked,
    };

    cachedSettings = settings;
    cacheExpiry = now + 60 * 1000; // 60 seconds cache
    return settings;
  } catch (err) {
    console.error('[SETTINGS] Failed to read app settings:', err);
    return cachedSettings || {
      site_name: 'GoTogether',
      site_tagline: 'Travel Better, Together',
      admin_email: 'admin@gotogethertrip.com',
      auto_approve_trips: false,
      require_verification: true,
      email_notifications: true,
      feedback_alerts: true,
      new_user_alerts: false,
      maintenance_mode: false,
      stories_blocked: false,
    };
  }
}

export function invalidateSettingsCache() {
  cachedSettings = null;
  cacheExpiry = 0;
}

