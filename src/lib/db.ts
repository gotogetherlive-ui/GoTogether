import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'gotogether.db');

// Use a global singleton to prevent multiple connections during build
const globalForDb = globalThis as unknown as { __db?: Database.Database };

function getDb(): Database.Database {
  if (globalForDb.__db) {
    return globalForDb.__db;
  }

  const db = new Database(dbPath);

  // Enable WAL mode for better concurrent access and set busy timeout
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.pragma('foreign_keys = ON');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      full_name TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'regular' CHECK(role IN ('super_admin', 'business', 'regular')),
      age INTEGER,
      gender TEXT,
      bio TEXT,
      is_verified INTEGER NOT NULL DEFAULT 0,
      google_id TEXT UNIQUE,
      avatar_url TEXT,
      latitude REAL,
      longitude REAL,
      location_updated_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS trips (
      id TEXT PRIMARY KEY,
      organizer_id TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      destination TEXT NOT NULL,
      duration_days INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'live' CHECK(status IN ('pending', 'live', 'rejected')),
      priority_score INTEGER NOT NULL DEFAULT 0,
      is_featured INTEGER NOT NULL DEFAULT 0,
      tags TEXT DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS trip_requests (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL REFERENCES trips(id),
      requester_id TEXT NOT NULL REFERENCES users(id),
      candidate_details TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      reporter_id TEXT NOT NULL REFERENCES users(id),
      reported_user_id TEXT REFERENCES users(id),
      reported_trip_id TEXT REFERENCES trips(id),
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'reviewed')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      site_name TEXT NOT NULL DEFAULT 'GoTogether',
      site_tagline TEXT NOT NULL DEFAULT 'Travel Better, Together',
      admin_email TEXT NOT NULL DEFAULT 'admin@gotogether.com',
      auto_approve_trips INTEGER NOT NULL DEFAULT 0,
      require_verification INTEGER NOT NULL DEFAULT 1,
      email_notifications INTEGER NOT NULL DEFAULT 1,
      report_alerts INTEGER NOT NULL DEFAULT 1,
      new_user_alerts INTEGER NOT NULL DEFAULT 0,
      maintenance_mode INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS trip_participants (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL REFERENCES trips(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      joined_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(trip_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL REFERENCES trips(id),
      sender_id TEXT NOT NULL REFERENCES users(id),
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS business_applications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      company_name TEXT NOT NULL,
      location TEXT NOT NULL,
      phone_number TEXT NOT NULL,
      alternate_email TEXT,
      profile_pic_url TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Initialize settings if empty
  db.exec(`
    INSERT OR IGNORE INTO settings (id) VALUES (1);
  `);

  // Safely add new columns — SQLite does not support IF NOT EXISTS for columns
  try { db.exec("ALTER TABLE users ADD COLUMN profession TEXT"); } catch { /* column already exists */ }
  try { db.exec("ALTER TABLE users ADD COLUMN fooding_habit TEXT"); } catch { /* column already exists */ }
  try { db.exec("ALTER TABLE users ADD COLUMN address TEXT"); } catch { /* column already exists */ }
  try { db.exec("ALTER TABLE trips ADD COLUMN duration_nights INTEGER DEFAULT 0"); } catch { /* column already exists */ }
  try { db.exec("ALTER TABLE trips ADD COLUMN image_url TEXT"); } catch { /* column already exists */ }
  try { db.exec("ALTER TABLE trips ADD COLUMN trip_type TEXT DEFAULT 'premium'"); } catch { /* column already exists */ }
  try { db.exec("ALTER TABLE trips ADD COLUMN brochure_url TEXT"); } catch { /* column already exists */ }
  try { db.exec("ALTER TABLE trips ADD COLUMN pickup_point TEXT"); } catch { /* column already exists */ }
  try { db.exec("ALTER TABLE trips ADD COLUMN drop_point TEXT"); } catch { /* column already exists */ }
  try { db.exec("ALTER TABLE trips ADD COLUMN b2b_price TEXT"); } catch { /* column already exists */ }
  try { db.exec("ALTER TABLE trips ADD COLUMN b2c_price TEXT"); } catch { /* column already exists */ }
  try { db.exec("ALTER TABLE trips ADD COLUMN gotogether_price TEXT"); } catch { /* column already exists */ }
  try { db.exec("ALTER TABLE trips ADD COLUMN start_date TEXT"); } catch { /* column already exists */ }
  try { db.exec("ALTER TABLE trips ADD COLUMN images TEXT"); } catch { /* column already exists */ }
  try { db.exec("ALTER TABLE users ADD COLUMN phone_number TEXT"); } catch { /* column already exists */ }
  try { db.exec("ALTER TABLE users ADD COLUMN last_login_at TEXT"); } catch { /* column already exists */ }
  try { db.exec("ALTER TABLE trip_participants ADD COLUMN last_read_at TEXT"); } catch { /* column already exists */ }
  try { db.exec("ALTER TABLE trip_requests ADD COLUMN notification_seen INTEGER DEFAULT 0"); } catch { /* column already exists */ }
  try { db.exec("ALTER TABLE trips ADD COLUMN notification_seen INTEGER DEFAULT 1"); } catch { /* column already exists */ }
  try { db.exec("ALTER TABLE feedbacks ADD COLUMN notification_seen INTEGER DEFAULT 0"); } catch { /* column already exists */ }
  try { db.exec("ALTER TABLE reports ADD COLUMN notification_seen INTEGER DEFAULT 0"); } catch { /* column already exists */ }
  try { db.exec("ALTER TABLE business_applications ADD COLUMN notification_seen INTEGER DEFAULT 0"); } catch { /* column already exists */ }
  try { db.exec("ALTER TABLE trip_bookings ADD COLUMN notification_seen INTEGER DEFAULT 0"); } catch { /* column already exists */ }
  try { db.exec("ALTER TABLE users ADD COLUMN phone_verified INTEGER DEFAULT 0"); } catch { /* column already exists */ }
  try { db.exec("ALTER TABLE trips ADD COLUMN starting_location TEXT"); } catch { /* column already exists */ }
  try { db.exec("ALTER TABLE trips ADD COLUMN registration_closed INTEGER DEFAULT 0"); } catch { /* column already exists */ }

  db.exec(`
    CREATE TABLE IF NOT EXISTS phone_otps (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      phone_number TEXT NOT NULL,
      otp TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS feedbacks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      category TEXT NOT NULL CHECK(category IN ('technical', 'trip', 'gotogether')),
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'solved')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS user_chat_reads (
      user_id TEXT NOT NULL REFERENCES users(id),
      trip_id TEXT NOT NULL REFERENCES trips(id),
      last_read_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, trip_id)
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS trip_bookings (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL REFERENCES trips(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      male_count INTEGER NOT NULL DEFAULT 0,
      female_count INTEGER NOT NULL DEFAULT 0,
      child_count INTEGER NOT NULL DEFAULT 0,
      names TEXT NOT NULL,
      phone_number TEXT NOT NULL,
      alternate_phone_number TEXT,
      trip_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS email_otps (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      full_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      otp_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      category TEXT NOT NULL CHECK(category IN ('general', 'safety', 'billing', 'account', 'trip', 'other')),
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'resolved', 'closed')),
      admin_notes TEXT,
      notification_seen INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Seed default super_admin if no users exist
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    const { v4: uuidv4 } = require('uuid');
    const bcrypt = require('bcryptjs');
    const hashedPassword = bcrypt.hashSync('admin123', 10);

    db.prepare(`
      INSERT OR IGNORE INTO users (id, email, password_hash, full_name, role, is_verified)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'admin@gotogether.com',
      hashedPassword,
      'Alex Admin',
      'super_admin',
      1
    );
  }

  globalForDb.__db = db;
  return db;
}

const db = getDb();
export default db;
