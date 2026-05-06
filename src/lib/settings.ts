import db from './db';

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
}

/**
 * Read the app settings from the database.
 * Returns parsed booleans for toggle fields.
 */
export function getAppSettings(): AppSettings {
  const row = db.prepare('SELECT * FROM settings WHERE id = 1').get() as Record<string, any> | undefined;

  if (!row) {
    // Return safe defaults if settings row doesn't exist
    return {
      site_name: 'GoTogether',
      site_tagline: 'Travel Better, Together',
      admin_email: 'admin@gotogether.com',
      auto_approve_trips: false,
      require_verification: true,
      email_notifications: true,
      feedback_alerts: true,
      new_user_alerts: false,
      maintenance_mode: false,
    };
  }

  return {
    site_name: row.site_name || 'GoTogether',
    site_tagline: row.site_tagline || 'Travel Better, Together',
    admin_email: row.admin_email || 'admin@gotogether.com',
    auto_approve_trips: !!row.auto_approve_trips,
    require_verification: !!row.require_verification,
    email_notifications: !!row.email_notifications,
    feedback_alerts: !!(row.report_alerts ?? row.feedback_alerts ?? 1),
    new_user_alerts: !!row.new_user_alerts,
    maintenance_mode: !!row.maintenance_mode,
  };
}
