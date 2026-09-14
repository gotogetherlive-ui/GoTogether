import fs from 'node:fs';
import nextEnv from '@next/env';
import pg from 'pg';
import { getDatabaseSsl } from '../src/lib/databaseSsl.js';

nextEnv.loadEnvConfig(process.cwd());

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: getDatabaseSsl(process.env), connectionTimeoutMillis: 10000 });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('gotogether_business_introductions_migration'))");
    await client.query(fs.readFileSync('db/migrations/20260912_business_introductions.sql', 'utf8'));
    await client.query('SELECT id, user_id, status, notification_seen FROM business_introductions LIMIT 0');
    await client.query('COMMIT');
    console.log('Business introductions migration applied and verified.');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally { await client.end(); }
}

main().catch(error => {
  console.error('Business introductions migration failed:', error instanceof Error ? error.message : 'Unknown error');
  process.exitCode = 1;
});
