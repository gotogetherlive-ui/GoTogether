import { Pool, PoolClient } from 'pg';
import { AsyncLocalStorage } from 'node:async_hooks';
import { getDatabaseSsl } from './databaseSsl';
import { parse as parseDatabaseConnectionString } from 'pg-connection-string';

// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
// PostgreSQL Connection Pool
// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

const globalForDb = globalThis as unknown as {
  __pgPool?: Pool;
  __schemaInitialized?: boolean;
  __schemaReady?: Promise<void>;
  __schemaError?: unknown;
  __schemaRetryAt?: number;
};

function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required. Set it to your PostgreSQL connection string.');
  }

  try {
    parseDatabaseConnectionString(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL is not a valid PostgreSQL URL. If the database password contains special characters such as @, #, %, /, ?, :, or spaces, URL-encode the password before deploying.');
  }

  return databaseUrl;
}

function getPool(): Pool {
  if (globalForDb.__pgPool) {
    return globalForDb.__pgPool;
  }

  const pool = new Pool({
    connectionString: getDatabaseUrl(),
    ssl: getDatabaseSsl(),
    max: Math.max(1, parseInt(process.env.PG_POOL_MAX || '5', 10)),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  pool.on('error', (err) => {
    console.error('[PG POOL] Unexpected error on idle client', err);
  });

  globalForDb.__pgPool = pool;
  return pool;
}

const pool = getPool();
const transactionContext = new AsyncLocalStorage<PoolClient>();

function getQueryClient(): Pool | PoolClient {
  return transactionContext.getStore() || pool;
}

function isRuntimeSchemaDdlAllowed(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return ["1", "true", "yes", "on"].includes(String(process.env.ALLOW_RUNTIME_SCHEMA_DDL || "").toLowerCase());
}

// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
// Query Helpers
// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

/** Execute a query and return all rows */
export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  await ensureSchema();
  const result = await getQueryClient().query(sql, params);
  return result.rows;
}

/** Execute a query and return the first row, or null */
export async function queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
  await ensureSchema();
  const result = await getQueryClient().query(sql, params);
  return (result.rows[0] as T) || null;
}

/** Execute a statement (INSERT/UPDATE/DELETE) and return affected row count */
export async function run(sql: string, params?: any[]): Promise<{ rowCount: number }> {
  await ensureSchema();
  const result = await getQueryClient().query(sql, params);
  return { rowCount: result.rowCount || 0 };
}

/** Execute multiple statements inside a transaction */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const activeClient = transactionContext.getStore();
  if (activeClient) return callback(activeClient);

  await ensureSchema();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await transactionContext.run(client, () => callback(client));
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/** Get the raw pool for advanced use cases (e.g. LISTEN/NOTIFY) */
export function getPoolInstance(): Pool {
  return pool;
}

// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
// Schema Initialization
// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

export async function initializeSchema(): Promise<void> {
  if (globalForDb.__schemaInitialized) return;
  if (!isRuntimeSchemaDdlAllowed()) {
    throw new Error("Runtime schema initialization is disabled in production. Run db migrations before starting the app.");
  }

  let client: PoolClient | null = null;
  let lockAcquired = false;
  try {
    client = await pool.connect();
    await client.query("SELECT pg_advisory_lock(hashtext('gotogether_schema_initialization'))");
    lockAcquired = true;

    if (globalForDb.__schemaInitialized) return;
    // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Core Tables Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT,
        full_name TEXT NOT NULL DEFAULT '',
        organizer_slug TEXT,
        role TEXT NOT NULL DEFAULT 'regular' CHECK(role IN ('super_admin', 'business', 'regular')),
        age INTEGER,
        gender TEXT,
        bio TEXT,
        is_verified INTEGER NOT NULL DEFAULT 0,
        google_id TEXT UNIQUE,
        avatar_url TEXT,
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        location_updated_at TIMESTAMPTZ,
        profession TEXT,
        fooding_habit TEXT,
        address TEXT,
        phone_number TEXT,
        last_login_at TIMESTAMPTZ,
        terms_accepted_at TIMESTAMPTZ,
        phone_verified INTEGER DEFAULT 0,
        razorpay_account_id TEXT,
        deleted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS trips (
        id TEXT PRIMARY KEY,
        organizer_id TEXT NOT NULL REFERENCES users(id),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        destination TEXT NOT NULL,
        duration_days INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'live' CHECK(status IN ('pending', 'live', 'rejected', 'deleted')),
        priority_score INTEGER NOT NULL DEFAULT 0,
        is_featured INTEGER NOT NULL DEFAULT 0,
        tags TEXT DEFAULT '[]',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        duration_nights INTEGER DEFAULT 0,
        image_url TEXT,
        trip_type TEXT DEFAULT 'premium',
        brochure_url TEXT,
        pickup_point TEXT,
        drop_point TEXT,
        b2b_price TEXT,
        b2c_price TEXT,
        gotogether_price TEXT,
        notification_seen INTEGER DEFAULT 1,
        start_date TEXT,
        images TEXT,
        starting_location TEXT,
        slug TEXT,
        registration_closed INTEGER DEFAULT 0,
        max_capacity INTEGER,
        rejection_reason TEXT,
        deleted_at TIMESTAMPTZ
      );
    `);
    await client.query(`ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS slug TEXT`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.trip_slug_history (
        id BIGSERIAL PRIMARY KEY,
        trip_id TEXT NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
        old_slug TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Alter trips status check constraint to support cancellation states
    try {
      const constraints = await client.query(`
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'trips'::regclass
          AND contype = 'c'
          AND conname LIKE '%status%'
      `);
      for (const row of constraints.rows) {
        await client.query(`ALTER TABLE public.trips DROP CONSTRAINT IF EXISTS ${row.conname}`);
      }
      await client.query(`
        ALTER TABLE public.trips
        ADD CONSTRAINT trips_status_check
        CHECK (status IN ('pending', 'live', 'rejected', 'deleted', 'cancelling', 'refunds_processing', 'refunds_completed', 'cancelled', 'archived'))
      `);
    } catch (err) {
      console.warn('[DB MIGRATION] Failed to update trips status constraint:', err);
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.trip_cancellations (
        id TEXT PRIMARY KEY,
        trip_id TEXT NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
        cancelled_by TEXT NOT NULL REFERENCES public.users(id),
        reason TEXT NOT NULL,
        reason_type TEXT NOT NULL,
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS trip_requests (
        id TEXT PRIMARY KEY,
        trip_id TEXT NOT NULL REFERENCES trips(id),
        requester_id TEXT NOT NULL REFERENCES users(id),
        candidate_details TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        notification_seen INTEGER DEFAULT 0
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        reporter_id TEXT NOT NULL REFERENCES users(id),
        reported_user_id TEXT REFERENCES users(id),
        reported_trip_id TEXT REFERENCES trips(id),
        reason TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'reviewed')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        notification_seen INTEGER DEFAULT 0
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        site_name TEXT NOT NULL DEFAULT 'GoTogether',
        site_tagline TEXT NOT NULL DEFAULT 'Travel Better, Together',
        admin_email TEXT NOT NULL DEFAULT 'admin@gotogethertrip.com',
        auto_approve_trips INTEGER NOT NULL DEFAULT 0,
        require_verification INTEGER NOT NULL DEFAULT 1,
        email_notifications INTEGER NOT NULL DEFAULT 1,
        report_alerts INTEGER NOT NULL DEFAULT 1,
        new_user_alerts INTEGER NOT NULL DEFAULT 0,
        maintenance_mode INTEGER NOT NULL DEFAULT 0,
        stories_blocked INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Initialize settings if empty
    await client.query(`INSERT INTO settings (id) VALUES (1) ON CONFLICT DO NOTHING`);
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);
    await client.query(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS organizer_slug TEXT`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.organizer_slug_history (
        id BIGSERIAL PRIMARY KEY,
        organizer_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        old_slug TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS razorpay_account_verified_at TIMESTAMPTZ`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ`);
    await client.query(`UPDATE users SET terms_accepted_at = created_at WHERE terms_accepted_at IS NULL AND created_at < NOW() - INTERVAL '5 minutes'`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_enabled INTEGER NOT NULL DEFAULT 0`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS trip_participants (
        id TEXT PRIMARY KEY,
        trip_id TEXT NOT NULL REFERENCES trips(id),
        user_id TEXT NOT NULL REFERENCES users(id),
        joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_read_at TIMESTAMPTZ,
        UNIQUE(trip_id, user_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        trip_id TEXT NOT NULL REFERENCES trips(id),
        sender_id TEXT NOT NULL REFERENCES users(id),
        message TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS business_applications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        company_name TEXT NOT NULL,
        location TEXT NOT NULL,
        phone_number TEXT NOT NULL,
        alternate_email TEXT,
        profile_pic_url TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
        pan_number TEXT,
        pan_photo_url TEXT,
        payment_provider TEXT NOT NULL DEFAULT 'RAZORPAY',
        provider_account_id TEXT,
        provider_account_holder_name TEXT,
        provider_registered_email TEXT,
        provider_registered_phone TEXT,
        razorpay_account_id TEXT,
        razorpay_account_holder_name TEXT,
        razorpay_account_email TEXT,
        razorpay_account_phone TEXT,
        payment_settlement_model TEXT NOT NULL DEFAULT 'organizer_direct',
        payment_terms_accepted INTEGER NOT NULL DEFAULT 0,
        payment_onboarding_status TEXT NOT NULL DEFAULT 'pending_review',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        notification_seen INTEGER DEFAULT 0
      );
    `);

    await client.query(`ALTER TABLE business_applications ADD COLUMN IF NOT EXISTS razorpay_account_holder_name TEXT`);
    await client.query(`ALTER TABLE business_applications ADD COLUMN IF NOT EXISTS razorpay_account_email TEXT`);
    await client.query(`ALTER TABLE business_applications ADD COLUMN IF NOT EXISTS razorpay_account_phone TEXT`);
    await client.query(`ALTER TABLE business_applications ADD COLUMN IF NOT EXISTS payment_settlement_model TEXT NOT NULL DEFAULT 'organizer_direct'`);
    await client.query(`ALTER TABLE business_applications ADD COLUMN IF NOT EXISTS payment_terms_accepted INTEGER NOT NULL DEFAULT 0`);
    await client.query(`ALTER TABLE business_applications ADD COLUMN IF NOT EXISTS payment_onboarding_status TEXT NOT NULL DEFAULT 'pending_review'`);
    await client.query(`ALTER TABLE business_applications ADD COLUMN IF NOT EXISTS payment_provider TEXT NOT NULL DEFAULT 'RAZORPAY'`);
    await client.query(`ALTER TABLE business_applications ADD COLUMN IF NOT EXISTS provider_account_id TEXT`);
    await client.query(`ALTER TABLE business_applications ADD COLUMN IF NOT EXISTS provider_account_holder_name TEXT`);
    await client.query(`ALTER TABLE business_applications ADD COLUMN IF NOT EXISTS provider_registered_email TEXT`);
    await client.query(`ALTER TABLE business_applications ADD COLUMN IF NOT EXISTS provider_registered_phone TEXT`);

    // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Reviews & Audit Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

    await client.query(`
      CREATE TABLE IF NOT EXISTS trip_reviews (
        id TEXT PRIMARY KEY,
        reviewer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reviewee_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
        rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(reviewer_id, reviewee_id, trip_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_audit_log (
        id TEXT PRIMARY KEY,
        admin_id TEXT NOT NULL REFERENCES users(id),
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        details TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ OTP & Verification Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

    await client.query(`
      CREATE TABLE IF NOT EXISTS phone_otps (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        phone_number TEXT NOT NULL,
        otp TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        verified INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS email_otps (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        full_name TEXT NOT NULL,
        age INTEGER,
        password_hash TEXT NOT NULL,
        otp_hash TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(`ALTER TABLE email_otps ADD COLUMN IF NOT EXISTS age INTEGER`);

    // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Feedback & Support Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

    await client.query(`
      CREATE TABLE IF NOT EXISTS feedbacks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        category TEXT NOT NULL CHECK(category IN ('technical', 'trip', 'gotogether')),
        subject TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'solved')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        notification_seen INTEGER DEFAULT 0
      );
    `);

    await client.query(`
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
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Chat Reads Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_chat_reads (
        user_id TEXT NOT NULL REFERENCES users(id),
        trip_id TEXT NOT NULL REFERENCES trips(id),
        last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, trip_id)
      );
    `);

    // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Bookings & Payments Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

    await client.query(`
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
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        notification_seen INTEGER DEFAULT 0,
        cancelled_at TIMESTAMPTZ,
        cancel_reason TEXT,
        user_notification_seen INTEGER DEFAULT 1,
        booking_ref TEXT,
        booking_status TEXT DEFAULT 'pending_payment',
        payment_status TEXT DEFAULT 'pending',
        approval_status TEXT DEFAULT 'awaiting_payment',
        amount INTEGER DEFAULT 0,
        razorpay_order_id TEXT,
        razorpay_payment_id TEXT,
        expires_at TIMESTAMPTZ,
        paid_at TIMESTAMPTZ,
        verified_at TIMESTAMPTZ
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS booking_tickets (
        id TEXT PRIMARY KEY,
        booking_id TEXT NOT NULL REFERENCES trip_bookings(id),
        ticket_number TEXT NOT NULL UNIQUE,
        qr_code_data TEXT NOT NULL,
        generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);


    // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ User Activity & Retention Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬


    await client.query(`
-- GoTogether payment-domain migration
-- Single PostgreSQL database, isolated payments schema.

CREATE SCHEMA IF NOT EXISTS payments;

CREATE TABLE IF NOT EXISTS payments.orders (
  id TEXT PRIMARY KEY,
  order_reference TEXT NOT NULL UNIQUE,
  provider_order_id TEXT UNIQUE,
  provider TEXT NOT NULL,
  booking_id TEXT NOT NULL REFERENCES public.trip_bookings(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  trip_id TEXT NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  organizer_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL CHECK (status IN ('CREATED', 'PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REFUNDED', 'CHARGEBACK')),
  expires_at TIMESTAMPTZ NOT NULL,
  provider_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments.transactions (
  transaction_id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES payments.orders(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_payment_id TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  method TEXT,
  status TEXT NOT NULL CHECK (status IN ('CREATED', 'PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REFUNDED', 'CHARGEBACK')),
  paid_at TIMESTAMPTZ,
  provider_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider, provider_payment_id)
);

CREATE TABLE IF NOT EXISTS payments.refunds (
  refund_id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL REFERENCES payments.transactions(transaction_id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  reason TEXT,
  provider_refund_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED')),
  provider_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider_refund_id)
);

CREATE TABLE IF NOT EXISTS payments.webhook_logs (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  provider_event_id TEXT,
  payload JSONB NOT NULL,
  signature TEXT,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  processing_error TEXT,
  response_status INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS payments.payment_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  provider_event_id TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider, provider_event_id)
);

CREATE TABLE IF NOT EXISTS payments.payment_attempts (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES payments.orders(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments.payment_events_outbox (
  id TEXT PRIMARY KEY,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments.reconciliation_jobs (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED')),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  summary JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments.provider_accounts (
  id TEXT PRIMARY KEY,
  organizer_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  ownership_model TEXT NOT NULL,
  provider_account_id TEXT,
  linked_account_id TEXT,
  merchant_id TEXT,
  beneficiary_id TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending',
  verification_status TEXT NOT NULL DEFAULT 'pending',
  supports_refunds BOOLEAN NOT NULL DEFAULT FALSE,
  supports_settlement BOOLEAN NOT NULL DEFAULT FALSE,
  supports_webhooks BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE payments.orders ADD COLUMN IF NOT EXISTS payment_mode TEXT;
ALTER TABLE payments.orders ADD COLUMN IF NOT EXISTS provider_account_id TEXT;
ALTER TABLE payments.orders ADD COLUMN IF NOT EXISTS platform_commission_amount INTEGER DEFAULT 0;
ALTER TABLE payments.orders ADD COLUMN IF NOT EXISTS settlement_status TEXT;

CREATE INDEX IF NOT EXISTS idx_payments_orders_booking_id ON payments.orders(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_orders_user_id ON payments.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_orders_trip_id ON payments.orders(trip_id);
CREATE INDEX IF NOT EXISTS idx_payments_orders_provider_order ON payments.orders(provider, provider_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_orders_status_expires ON payments.orders(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_payments_transactions_order_id ON payments.transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_transactions_provider_payment ON payments.transactions(provider, provider_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_refunds_transaction_id ON payments.refunds(transaction_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_refunds_transaction_active ON payments.refunds(transaction_id) WHERE status IN ('PENDING', 'PROCESSING', 'SUCCESS');
CREATE INDEX IF NOT EXISTS idx_payments_webhook_logs_provider_event ON payments.webhook_logs(provider, provider_event_id);
CREATE INDEX IF NOT EXISTS idx_payments_webhook_logs_processed ON payments.webhook_logs(processed, created_at);
CREATE INDEX IF NOT EXISTS idx_payments_outbox_unprocessed ON payments.payment_events_outbox(processed_at, created_at);
CREATE INDEX IF NOT EXISTS idx_payments_refunds_pending ON payments.refunds(status, created_at) WHERE status = 'PENDING' AND provider_refund_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_payments_events_unprocessed ON payments.payment_events(processed_at, created_at) WHERE processed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_provider_accounts_organizer ON payments.provider_accounts(organizer_id);
CREATE INDEX IF NOT EXISTS idx_provider_accounts_provider ON payments.provider_accounts(provider, organizer_id);
      CREATE INDEX IF NOT EXISTS idx_provider_accounts_default ON payments.provider_accounts(organizer_id, ownership_model, is_default) WHERE is_default = TRUE;

      CREATE TABLE IF NOT EXISTS payments.provider_health (
        provider TEXT PRIMARY KEY CHECK (provider IN ('RAZORPAY', 'CASHFREE')),
        circuit_state TEXT NOT NULL DEFAULT 'CLOSED' CHECK (circuit_state IN ('CLOSED', 'OPEN', 'HALF_OPEN')),
        success_count INTEGER NOT NULL DEFAULT 0,
        failure_count INTEGER NOT NULL DEFAULT 0,
        total_latency_ms BIGINT NOT NULL DEFAULT 0,
        last_success_at TIMESTAMPTZ,
        last_failure_at TIMESTAMPTZ,
        last_error_message TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      INSERT INTO payments.provider_health (provider)
      VALUES ('RAZORPAY'), ('CASHFREE')
      ON CONFLICT (provider) DO NOTHING;
    `);

    await client.query(`
      ALTER TABLE payments.provider_accounts ADD COLUMN IF NOT EXISTS api_key_enc TEXT;
      ALTER TABLE payments.provider_accounts ADD COLUMN IF NOT EXISTS api_secret_enc TEXT;
      ALTER TABLE payments.provider_accounts ADD COLUMN IF NOT EXISTS webhook_secret_enc TEXT;
      ALTER TABLE business_applications ADD COLUMN IF NOT EXISTS api_key_enc TEXT;
      ALTER TABLE business_applications ADD COLUMN IF NOT EXISTS api_secret_enc TEXT;
      ALTER TABLE business_applications ADD COLUMN IF NOT EXISTS webhook_secret_enc TEXT;

      ALTER TABLE payments.provider_accounts ADD COLUMN IF NOT EXISTS credential_status TEXT DEFAULT 'unverified';
      ALTER TABLE payments.provider_accounts ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
      ALTER TABLE payments.provider_accounts ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;
      ALTER TABLE payments.provider_accounts ADD COLUMN IF NOT EXISTS last_api_check_at TIMESTAMPTZ;
      ALTER TABLE payments.provider_accounts ADD COLUMN IF NOT EXISTS last_webhook_received_at TIMESTAMPTZ;
      ALTER TABLE payments.provider_accounts ADD COLUMN IF NOT EXISTS last_failure_at TIMESTAMPTZ;
      ALTER TABLE payments.provider_accounts ADD COLUMN IF NOT EXISTS verification_error TEXT;
      ALTER TABLE payments.provider_accounts ADD COLUMN IF NOT EXISTS secret_version INTEGER DEFAULT 1;
      ALTER TABLE payments.provider_accounts ADD COLUMN IF NOT EXISTS credential_source TEXT DEFAULT 'onboarding';
      ALTER TABLE payments.provider_accounts ADD COLUMN IF NOT EXISTS rotation_required BOOLEAN DEFAULT FALSE;
    `);

    // Provider Retirement Policy Integrity Check: Restrict deletion of provider accounts referenced by orders
    try {
      const constraintCheck = await client.query(`
        SELECT conname FROM pg_constraint
        WHERE conrelid = 'payments.orders'::regclass
          AND conname = 'fk_orders_provider_account'
      `);
      if (constraintCheck.rows.length === 0) {
        // First delete orphaned order references that don't match provider accounts (if any legacy data exists)
        await client.query(`
          UPDATE payments.orders
          SET provider_account_id = NULL
          WHERE provider_account_id NOT IN (SELECT id FROM payments.provider_accounts)
        `);
        await client.query(`
          ALTER TABLE payments.orders
          ADD CONSTRAINT fk_orders_provider_account
          FOREIGN KEY (provider_account_id) REFERENCES payments.provider_accounts(id)
          ON DELETE RESTRICT
        `);
      }
    } catch (err) {
      console.warn('[DB MIGRATION] Failed to add foreign key constraint fk_orders_provider_account:', err);
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.booking_cancellation_policies (
        id TEXT PRIMARY KEY,
        organizer_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        trip_id TEXT REFERENCES public.trips(id) ON DELETE CASCADE,
        policy_name TEXT NOT NULL,
        free_cancel_before_hours INTEGER NOT NULL DEFAULT 48,
        rules_json JSONB NOT NULL,
        is_refundable BOOLEAN NOT NULL DEFAULT TRUE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT unique_trip_policy UNIQUE(trip_id)
      );

      CREATE TABLE IF NOT EXISTS public.booking_cancellations (
        id TEXT PRIMARY KEY,
        booking_id TEXT NOT NULL REFERENCES public.trip_bookings(id) ON DELETE CASCADE,
        cancelled_by TEXT NOT NULL,
        reason TEXT,
        refund_amount INTEGER NOT NULL DEFAULT 0,
        cancellation_fee INTEGER NOT NULL DEFAULT 0,
        refund_status TEXT NOT NULL,
        refund_id TEXT REFERENCES payments.refunds(refund_id),
        policy_snapshot JSONB NOT NULL,
        cancelled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT unique_booking_cancellation UNIQUE(booking_id)
      );

      UPDATE public.trip_bookings
      SET expires_at = created_at + INTERVAL '12 hours'
      WHERE booking_status IN ('pending_payment', 'payment_processing')
        AND expires_at IS NOT NULL
        AND expires_at < created_at + INTERVAL '12 hours'
        AND created_at + INTERVAL '12 hours' > NOW();

      CREATE TABLE IF NOT EXISTS public.trip_cancellations (
        id TEXT PRIMARY KEY,
        trip_id TEXT NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
        cancelled_by TEXT NOT NULL REFERENCES public.users(id),
        reason TEXT NOT NULL,
        reason_type TEXT NOT NULL,
        message TEXT,
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        metadata JSONB
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_activity (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        activity_date TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, activity_date)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS retention_email_rules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        inactive_days INTEGER NOT NULL DEFAULT 7,
        subject TEXT NOT NULL,
        body_html TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        last_run_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS retention_email_logs (
        id TEXT PRIMARY KEY,
        rule_id TEXT NOT NULL REFERENCES retention_email_rules(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        status TEXT NOT NULL DEFAULT 'sent'
      );
    `);

    // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Admin Accounts Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_accounts (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        added_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        key TEXT PRIMARY KEY,
        window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        request_count INTEGER NOT NULL DEFAULT 0
      );
    `);

    // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Compatibility & Buddy Matching Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

    await client.query(`
      CREATE TABLE IF NOT EXISTS compatibility_profiles (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        food_preference TEXT NOT NULL,
        travel_style TEXT NOT NULL,
        activity_preferences TEXT NOT NULL,
        energy_level TEXT NOT NULL,
        social_personality TEXT NOT NULL,
        cleanliness_preference INTEGER NOT NULL CHECK(cleanliness_preference BETWEEN 1 AND 5),
        drinking_preference TEXT NOT NULL,
        smoking_preference TEXT NOT NULL,
        languages TEXT NOT NULL,
        trip_behavior TEXT NOT NULL,
        ideal_trip_type TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS trip_budgets (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        budget_min INTEGER NOT NULL CHECK(budget_min > 0),
        budget_max INTEGER NOT NULL CHECK(budget_max > 0),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CHECK(budget_min <= budget_max)
      );
    `);

    // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Travel Stories (Social Feed) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

    await client.query(`
      CREATE TABLE IF NOT EXISTS travel_stories (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        images TEXT DEFAULT '[]',
        location TEXT,
        trip_id TEXT REFERENCES trips(id),
        likes_count INTEGER NOT NULL DEFAULT 0,
        comments_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS story_likes (
        id TEXT PRIMARY KEY,
        story_id TEXT NOT NULL REFERENCES travel_stories(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(story_id, user_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS story_comments (
        id TEXT PRIMARY KEY,
        story_id TEXT NOT NULL REFERENCES travel_stories(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Normalize legacy duplicate rows before adding production uniqueness guards.
    await client.query(`
      ALTER TABLE trip_reviews DROP CONSTRAINT IF EXISTS trip_reviews_reviewer_id_trip_id_key;

      DELETE FROM trip_requests a USING trip_requests b
      WHERE a.trip_id = b.trip_id AND a.requester_id = b.requester_id
        AND (a.created_at, a.id) > (b.created_at, b.id);

      DELETE FROM trip_reviews a USING trip_reviews b
      WHERE a.reviewer_id = b.reviewer_id
        AND a.reviewee_id = b.reviewee_id
        AND a.trip_id = b.trip_id
        AND (a.created_at, a.id) > (b.created_at, b.id);

      DELETE FROM booking_tickets a USING booking_tickets b
      WHERE a.booking_id = b.booking_id
        AND (a.generated_at, a.id) > (b.generated_at, b.id);

      UPDATE trip_bookings b SET razorpay_order_id = NULL
      WHERE b.razorpay_order_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM trip_bookings first_booking
          WHERE first_booking.razorpay_order_id = b.razorpay_order_id
            AND (first_booking.created_at, first_booking.id) < (b.created_at, b.id)
        );

      UPDATE trip_bookings b
      SET booking_ref = booking_ref || '-' || UPPER(LEFT(REPLACE(id, '-', ''), 12))
      WHERE booking_ref IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM trip_bookings first_booking
          WHERE first_booking.booking_ref = b.booking_ref
            AND (first_booking.created_at, first_booking.id) < (b.created_at, b.id)
        );

      -- Clean up any existing duplicate active bookings before building index
      DELETE FROM public.trip_bookings a USING public.trip_bookings b
      WHERE a.user_id = b.user_id AND a.trip_id = b.trip_id AND a.trip_date = b.trip_date
        AND a.booking_status IN ('pending_payment', 'payment_processing', 'confirmed')
        AND b.booking_status IN ('pending_payment', 'payment_processing', 'confirmed')
        AND a.id > b.id;

      -- Clean up any duplicate active orders
      DELETE FROM payments.orders a USING payments.orders b
      WHERE a.booking_id = b.booking_id
        AND a.status IN ('CREATED', 'PENDING', 'PROCESSING')
        AND b.status IN ('CREATED', 'PENDING', 'PROCESSING')
        AND a.id > b.id;
    `);

    // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
    // Indices
    // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
      CREATE INDEX IF NOT EXISTS idx_trips_organizer_id ON trips(organizer_id);
      CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
      CREATE INDEX IF NOT EXISTS idx_trips_type ON trips(trip_type);
      CREATE INDEX IF NOT EXISTS idx_trips_status_type ON trips(status, trip_type);
      CREATE INDEX IF NOT EXISTS idx_trips_featured ON trips(is_featured DESC, created_at DESC);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_trips_slug_unique ON public.trips(slug) WHERE slug IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_trip_slug_history_trip_id ON public.trip_slug_history(trip_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_organizer_slug_unique ON public.users(organizer_slug) WHERE organizer_slug IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_organizer_slug_history_organizer_id ON public.organizer_slug_history(organizer_id);
      CREATE INDEX IF NOT EXISTS idx_trip_requests_trip_id ON trip_requests(trip_id);
      CREATE INDEX IF NOT EXISTS idx_trip_requests_requester_id ON trip_requests(requester_id);
      CREATE INDEX IF NOT EXISTS idx_trip_requests_status ON trip_requests(status);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_trip_requests_unique_requester ON trip_requests(trip_id, requester_id);
      CREATE INDEX IF NOT EXISTS idx_trip_requests_notification ON trip_requests(notification_seen, status);
      CREATE INDEX IF NOT EXISTS idx_trip_participants_trip_id ON trip_participants(trip_id);
      CREATE INDEX IF NOT EXISTS idx_trip_participants_user_id ON trip_participants(user_id);
      CREATE INDEX IF NOT EXISTS idx_messages_trip_id ON messages(trip_id);
      CREATE INDEX IF NOT EXISTS idx_messages_trip_created ON messages(trip_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
      CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON feedbacks(status);
      CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
      CREATE INDEX IF NOT EXISTS idx_trip_bookings_trip_id ON trip_bookings(trip_id);
      CREATE INDEX IF NOT EXISTS idx_trip_bookings_user_id ON trip_bookings(user_id);
      CREATE INDEX IF NOT EXISTS idx_trip_bookings_status ON trip_bookings(status);
      CREATE INDEX IF NOT EXISTS idx_trip_bookings_notification ON trip_bookings(notification_seen, cancelled_at);
      CREATE INDEX IF NOT EXISTS idx_user_activity_date ON user_activity(activity_date);
      CREATE INDEX IF NOT EXISTS idx_trip_reviews_reviewer ON trip_reviews(reviewer_id, trip_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_trip_reviews_unique_pair ON trip_reviews(reviewer_id, reviewee_id, trip_id);
      CREATE INDEX IF NOT EXISTS idx_trip_reviews_trip_id ON trip_reviews(trip_id);
      CREATE INDEX IF NOT EXISTS idx_trip_reviews_reviewee_id ON trip_reviews(reviewee_id);
      CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_id ON admin_audit_log(admin_id);
      CREATE INDEX IF NOT EXISTS idx_booking_tickets_booking_id ON booking_tickets(booking_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_tickets_unique_booking ON booking_tickets(booking_id);
      CREATE INDEX IF NOT EXISTS idx_trip_bookings_booking_ref ON trip_bookings(booking_ref);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_trip_bookings_unique_booking_ref ON trip_bookings(booking_ref) WHERE booking_ref IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_trip_bookings_razorpay_order ON trip_bookings(razorpay_order_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_trip_bookings_unique_razorpay_order ON trip_bookings(razorpay_order_id) WHERE razorpay_order_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_trip_bookings_booking_status ON trip_bookings(booking_status);
      CREATE INDEX IF NOT EXISTS idx_trip_bookings_expires_at ON trip_bookings(expires_at);
      CREATE INDEX IF NOT EXISTS idx_compatibility_profiles_user ON compatibility_profiles(user_id);
      CREATE INDEX IF NOT EXISTS idx_trip_budgets_user ON trip_budgets(user_id);
      CREATE INDEX IF NOT EXISTS idx_travel_stories_user ON travel_stories(user_id);
      CREATE INDEX IF NOT EXISTS idx_travel_stories_created ON travel_stories(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_travel_stories_trip ON travel_stories(trip_id);
      CREATE INDEX IF NOT EXISTS idx_story_likes_story ON story_likes(story_id);
      CREATE INDEX IF NOT EXISTS idx_story_likes_user ON story_likes(user_id);
      CREATE INDEX IF NOT EXISTS idx_story_comments_story ON story_comments(story_id);
      CREATE INDEX IF NOT EXISTS idx_story_comments_user ON story_comments(user_id);
      CREATE INDEX IF NOT EXISTS idx_story_comments_created ON story_comments(created_at DESC);

      CREATE UNIQUE INDEX IF NOT EXISTS idx_trip_bookings_user_trip_active
        ON public.trip_bookings(user_id, trip_id, trip_date)
        WHERE booking_status IN ('pending_payment', 'payment_processing', 'confirmed');

      CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_orders_booking_active
        ON payments.orders(booking_id)
        WHERE status IN ('CREATED', 'PENDING', 'PROCESSING');

      CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_transactions_order_success
        ON payments.transactions(order_id)
        WHERE status = 'SUCCESS';
    `);

    // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
    // Seed Data
    // Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

    // Seed super admin account
    const { v4: uuidv4 } = await import('uuid');
    await client.query(
      `INSERT INTO admin_accounts (id, email, added_by)
       VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING`,
      [
        uuidv4(),
        (process.env.SUPER_ADMIN_EMAIL || 'gotogether.live@gmail.com').trim().toLowerCase(),
        'system',
      ]
    );

    // Never create a credentialed administrator automatically. Disable the
    // historical demo account if it remains from an older deployment.
    await client.query(
      `UPDATE users
       SET role = 'regular', password_hash = NULL
       WHERE email = 'admin@gotogethertrip.com'
         AND full_name = 'Alex Admin'`
    );

    console.log('[PG] Schema initialized successfully');
    globalForDb.__schemaInitialized = true;
    globalForDb.__schemaError = undefined;
    globalForDb.__schemaRetryAt = undefined;
  } catch (error: unknown) {
    const code = typeof error === "object" && error && "code" in error
      ? String(error.code)
      : "";
    const message = error instanceof Error ? error.message : String(error);

    if (code === "ECONNREFUSED" || message.includes("ECONNREFUSED")) {
      console.error(
        "[PG DATABASE ERROR] Connection refused. Check that PostgreSQL is running and DATABASE_URL is correct."
      );
    } else {
      console.error("[PG] Schema initialization failed:", error);
    }
    throw error;
  } finally {
    if (client) {
      if (lockAcquired) {
        await client
          .query("SELECT pg_advisory_unlock(hashtext('gotogether_schema_initialization'))")
          .catch(() => undefined);
      }
      client.release();
    }
  }
}

/** Initialize once per process. A failed attempt is cleared so later requests can recover. */
export async function ensureSchema(): Promise<void> {
  if (globalForDb.__schemaInitialized) return;
  if (!isRuntimeSchemaDdlAllowed()) return;

  if (
    globalForDb.__schemaRetryAt &&
    Date.now() < globalForDb.__schemaRetryAt
  ) {
    throw globalForDb.__schemaError ?? new Error("Database initialization is temporarily unavailable");
  }

  if (!globalForDb.__schemaReady) {
    globalForDb.__schemaReady = initializeSchema().catch((error) => {
      globalForDb.__schemaReady = undefined;
      globalForDb.__schemaError = error;
      globalForDb.__schemaRetryAt = Date.now() + 5000;
      throw error;
    });
  }

  await globalForDb.__schemaReady;
}

// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
// Cleanup Helpers
// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

export async function cleanupDeletedTrips(): Promise<void> {
  try {
    const expiredTrips = await query<{ id: string }>(`
      SELECT id FROM trips t
      WHERE status = 'deleted'
        AND t.deleted_at IS NOT NULL
        AND (
          SELECT COUNT(*)
          FROM trip_participants tp
          LEFT JOIN user_chat_reads ucr ON tp.user_id = ucr.user_id AND tp.trip_id = ucr.trip_id
          WHERE tp.trip_id = t.id
            AND (ucr.last_read_at IS NULL OR ucr.last_read_at < t.deleted_at)
        ) = 0
        AND NOW() >= COALESCE(
          (SELECT MAX(last_read_at) FROM user_chat_reads WHERE trip_id = t.id),
          t.deleted_at
        ) + INTERVAL '1 day'
    `);

    if (expiredTrips.length > 0) {
      await transaction(async (client) => {
        for (const trip of expiredTrips) {
          await client.query(`DELETE FROM payments.orders WHERE booking_id IN (SELECT id FROM trip_bookings WHERE trip_id = $1)`, [trip.id]);
          await client.query(`DELETE FROM booking_tickets WHERE booking_id IN (SELECT id FROM trip_bookings WHERE trip_id = $1)`, [trip.id]);
          await client.query('DELETE FROM trip_bookings WHERE trip_id = $1', [trip.id]);
          await client.query('DELETE FROM messages WHERE trip_id = $1', [trip.id]);
          await client.query('DELETE FROM trip_participants WHERE trip_id = $1', [trip.id]);
          await client.query('DELETE FROM trip_requests WHERE trip_id = $1', [trip.id]);
          await client.query('DELETE FROM reports WHERE reported_trip_id = $1', [trip.id]);
          await client.query('DELETE FROM user_chat_reads WHERE trip_id = $1', [trip.id]);
          await client.query('DELETE FROM trip_reviews WHERE trip_id = $1', [trip.id]);
          await client.query('UPDATE travel_stories SET trip_id = NULL WHERE trip_id = $1', [trip.id]);
          await client.query('DELETE FROM trips WHERE id = $1', [trip.id]);
        }
      });
      console.log(`[DB CLEANUP] Permanently deleted ${expiredTrips.length} expired deleted trip(s).`);
    }
  } catch (err) {
    console.error('[DB CLEANUP] Failed to cleanup deleted trips:', err);
  }
}

