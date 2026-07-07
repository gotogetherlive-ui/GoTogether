#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;
const root = process.cwd();
const prefix = process.env.LOAD_TEST_PREFIX || 'loadtest';
const resultDir = process.env.RESULT_DIR || 'load-test-results';
const outputFile = process.env.LOAD_TEST_ENV_FILE || path.join(resultDir, 'load-test.env');
const targetUrl = (process.env.TARGET_URL || process.env.BASE_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || '').trim();
const tripDate = process.env.TRIP_DATE || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
const allowLocal = ['1', 'true', 'yes', 'on'].includes(String(process.env.ALLOW_LOCAL_LOAD_SEED || '').toLowerCase());

function loadEnvFile(file) {
  const fullPath = path.resolve(root, file);
  if (!fs.existsSync(fullPath)) return;
  for (const line of fs.readFileSync(fullPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!process.env[key]) process.env[key] = value;
  }
}

for (const file of ['.env.staging.local', '.env.production.local', '.env.production', '.env.local']) loadEnvFile(file);

function isLocalUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.local');
  } catch {
    return true;
  }
}

function getDatabaseSsl() {
  const explicitMode = process.env.PGSSLMODE?.toLowerCase();
  if (explicitMode === 'disable') return false;
  if (explicitMode && explicitMode !== 'prefer' && explicitMode !== 'allow') {
    return { rejectUnauthorized: explicitMode === 'verify-ca' || explicitMode === 'verify-full' };
  }
  const connectionString = process.env.DATABASE_URL || '';
  try {
    const url = new URL(connectionString);
    if (url.searchParams.has('sslmode')) return undefined;
    if (['localhost', '127.0.0.1', '::1'].includes(url.hostname)) return false;
  } catch {}
  return { rejectUnauthorized: false };
}

function sessionToken() {
  const raw = crypto.randomBytes(32).toString('base64url');
  const hashed = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hashed };
}

function userId(kind) {
  return `${prefix}_${kind}`;
}

function tripId(kind) {
  return `${prefix}_trip_${kind}`;
}

async function upsertUser(client, { id, email, role, fullName, phone }) {
  const passwordHash = await bcrypt.hash(crypto.randomBytes(18).toString('base64url'), 10);
  await client.query(
    `INSERT INTO public.users (id, email, password_hash, full_name, role, is_verified, phone_number, phone_verified)
     VALUES ($1, $2, $3, $4, $5, 1, $6, 1)
     ON CONFLICT (id) DO UPDATE SET
       email = EXCLUDED.email,
       password_hash = EXCLUDED.password_hash,
       full_name = EXCLUDED.full_name,
       role = EXCLUDED.role,
       is_verified = 1,
       phone_number = EXCLUDED.phone_number,
       phone_verified = 1,
       deleted_at = NULL`,
    [id, email, passwordHash, fullName, role, phone],
  );
}

async function upsertTrip(client, { id, organizerId, title, capacity, destination = 'Staging City', chat = false }) {
  await client.query(
    `INSERT INTO public.trips (
       id, organizer_id, title, description, destination, duration_days, status,
       priority_score, is_featured, trip_type, b2b_price, b2c_price, gotogether_price,
       start_date, registration_closed, max_capacity, tags, images
     ) VALUES ($1, $2, $3, $4, $5, 2, 'live', 10, 1, 'premium', '1000', '1000', '1000', $6, 0, $7, '[]', '[]')
     ON CONFLICT (id) DO UPDATE SET
       organizer_id = EXCLUDED.organizer_id,
       title = EXCLUDED.title,
       description = EXCLUDED.description,
       destination = EXCLUDED.destination,
       status = 'live',
       trip_type = 'premium',
       b2b_price = EXCLUDED.b2b_price,
       b2c_price = EXCLUDED.b2c_price,
       gotogether_price = EXCLUDED.gotogether_price,
       start_date = EXCLUDED.start_date,
       registration_closed = 0,
       max_capacity = EXCLUDED.max_capacity,
       deleted_at = NULL`,
    [id, organizerId, title, `${title} generated for safe GoTogether staging load tests.`, destination, tripDate, capacity],
  );

  if (chat) {
    await client.query(
      `INSERT INTO public.messages (id, trip_id, sender_id, message)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [`${id}_msg_seed`, id, organizerId, 'Staging load-test chat seed message.'],
    );
  }
}

async function createSession(client, id) {
  const token = sessionToken();
  await client.query('DELETE FROM public.sessions WHERE user_id = $1 OR expires_at < NOW()', [id]);
  await client.query(
    `INSERT INTO public.sessions (id, user_id, token, expires_at)
     VALUES ($1, $2, $3, NOW() + INTERVAL '7 days')`,
    [`${id}_session`, id, token.hashed],
  );
  return `gt_session=${token.raw}`;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required to seed staging load-test data.');
  if (isLocalUrl(targetUrl) && !allowLocal) {
    throw new Error('Refusing to seed load-test env without a non-local TARGET_URL/BASE_URL. Set ALLOW_LOCAL_LOAD_SEED=true only for local script debugging.');
  }

  const pool = new Pool({ connectionString: databaseUrl, ssl: getDatabaseSsl(), max: 5, connectionTimeoutMillis: 10000 });
  const client = await pool.connect();
  const normalUser = userId('user_primary');
  const secondUser = userId('user_secondary');
  const organizer = userId('organizer');
  const admin = userId('admin');
  const publicTrips = [tripId('public_a'), tripId('public_b'), tripId('public_c')];
  const capacity25 = tripId('capacity_25');
  const capacity100 = tripId('capacity_100');
  const chatTrip = tripId('chat');

  try {
    await client.query('BEGIN');
    await client.query('SELECT 1 FROM public.users LIMIT 1');
    await client.query('SELECT 1 FROM payments.orders LIMIT 1');

    await upsertUser(client, { id: normalUser, email: `${normalUser}@loadtest.gotogether.invalid`, role: 'regular', fullName: 'Load Test User Primary', phone: '9000000001' });
    await upsertUser(client, { id: secondUser, email: `${secondUser}@loadtest.gotogether.invalid`, role: 'regular', fullName: 'Load Test User Secondary', phone: '9000000002' });
    await upsertUser(client, { id: organizer, email: `${organizer}@loadtest.gotogether.invalid`, role: 'business', fullName: 'Load Test Organizer', phone: '9000000003' });
    await upsertUser(client, { id: admin, email: `${admin}@loadtest.gotogether.invalid`, role: 'super_admin', fullName: 'Load Test Admin', phone: '9000000004' });

    await client.query(
      `INSERT INTO public.admin_accounts (id, email, added_by)
       VALUES ($1, $2, 'load-test-seed')
       ON CONFLICT (email) DO NOTHING`,
      [`${admin}_admin_account`, `${admin}@loadtest.gotogether.invalid`],
    );

    await upsertTrip(client, { id: publicTrips[0], organizerId: organizer, title: 'Load Test Public Trip A', capacity: 5000 });
    await upsertTrip(client, { id: publicTrips[1], organizerId: organizer, title: 'Load Test Public Trip B', capacity: 5000 });
    await upsertTrip(client, { id: publicTrips[2], organizerId: organizer, title: 'Load Test Public Trip C', capacity: 5000 });
    await upsertTrip(client, { id: capacity25, organizerId: organizer, title: 'Load Test Capacity 25 Trip', capacity: 25 });
    await upsertTrip(client, { id: capacity100, organizerId: organizer, title: 'Load Test Capacity 100 Trip', capacity: 100 });
    await upsertTrip(client, { id: chatTrip, organizerId: organizer, title: 'Load Test Chat Trip', capacity: 5000, chat: true });

    for (const uid of [normalUser, secondUser]) {
      await client.query(
        `INSERT INTO public.trip_participants (id, trip_id, user_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (trip_id, user_id) DO NOTHING`,
        [`${chatTrip}_${uid}_participant`, chatTrip, uid],
      );
    }

    const userCookie = await createSession(client, normalUser);
    const secondUserCookie = await createSession(client, secondUser);
    const organizerCookie = await createSession(client, organizer);
    const adminCookie = await createSession(client, admin);

    await client.query('COMMIT');

    fs.mkdirSync(resultDir, { recursive: true });
    const envLines = [
      `TARGET_URL=${targetUrl}`,
      `USER_COOKIE=${userCookie}`,
      `SECOND_USER_COOKIE=${secondUserCookie}`,
      `ORGANIZER_COOKIE=${organizerCookie}`,
      `ADMIN_COOKIE=${adminCookie}`,
      `TRIP_IDS=${[...publicTrips, capacity25, capacity100, chatTrip].join(',')}`,
      `CAPACITY_TRIP_ID=${capacity25}`,
      `CAPACITY_25_TRIP_ID=${capacity25}`,
      `CAPACITY_100_TRIP_ID=${capacity100}`,
      `CHAT_TRIP_ID=${chatTrip}`,
      `TRIP_DATE=${tripDate}`,
      `PAYMENT_PROVIDER=${process.env.PAYMENT_PROVIDER || 'RAZORPAY'}`,
      process.env.CRON_SECRET ? `CRON_SECRET=${process.env.CRON_SECRET}` : '# CRON_SECRET intentionally omitted; cron probes will be skipped.',
    ];
    fs.writeFileSync(outputFile, `${envLines.join('\n')}\n`);
    console.log(`Seeded staging load-test data. Env export written to ${outputFile}`);
    console.log('Do not commit the generated env file; it contains live session cookies.');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
