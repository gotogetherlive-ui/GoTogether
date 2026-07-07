#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migrationsDir = path.join(root, 'db', 'migrations');
const errors = [];
const warnings = [];

function fail(message) {
  errors.push(message);
}

if (!fs.existsSync(migrationsDir)) {
  fail('db/migrations directory is missing');
} else {
  const files = fs.readdirSync(migrationsDir).filter((file) => file.endsWith('.sql')).sort();
  if (!files.length) fail('No SQL migration files found in db/migrations');

  const requiredMigrationFiles = [
    '20260624_payments_schema.sql',
    '20260624_organizer_payment_readiness.sql',
    '20260625_multi_provider_organizer_payment_profile.sql',
    '20260625_payment_strategy_layer.sql',
    '20260626_razorpay_marketplace_provider_accounts.sql',
  ];
  for (const requiredFile of requiredMigrationFiles) {
    if (!files.includes(requiredFile)) fail(`Required migration ${requiredFile} is missing`);
  }

  const seenPrefixes = new Set();
  for (const file of files) {
    if (!/^\d{8}_[a-z0-9_]+\.sql$/i.test(file)) {
      fail(`${file} does not follow YYYYMMDD_name.sql naming`);
    }
    const prefix = file.slice(0, 8);
    if (seenPrefixes.has(file)) fail(`${file} is duplicated`);
    seenPrefixes.add(prefix);

    const fullPath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(fullPath, 'utf8');
    if (!sql.trim()) fail(`${file} is empty`);
    if (/DROP\s+(SCHEMA|DATABASE)\b/i.test(sql)) fail(`${file} contains DROP SCHEMA/DATABASE`);
    if (/TRUNCATE\b/i.test(sql)) warnings.push(`${file} contains TRUNCATE; verify this is intentional before production`);
    if (/CREATE\s+(TABLE|INDEX|UNIQUE\s+INDEX)\b/i.test(sql) && !/IF\s+NOT\s+EXISTS/i.test(sql)) {
      warnings.push(`${file} has CREATE statements without IF NOT EXISTS; check idempotency`);
    }
  }

  const dbSource = fs.readFileSync(path.join(root, 'src', 'lib', 'db.ts'), 'utf8');
  if (!dbSource.includes('Runtime schema initialization is disabled in production')) {
    fail('Runtime schema DDL production guard is missing from src/lib/db.ts');
  }
  if (!dbSource.includes('ALLOW_RUNTIME_SCHEMA_DDL')) {
    fail('Runtime schema DDL escape hatch must be explicit and auditable');
  }
  if (!/export async function ensureSchema\(\)[\s\S]*!isRuntimeSchemaDdlAllowed\(\)[\s\S]*return/.test(dbSource)) {
    fail('ensureSchema must not run schema initialization automatically in production runtime');
  }
  const requiredGuards = [
    'idx_trip_bookings_user_trip_active',
    'idx_payments_orders_booking_active',
    'idx_payments_transactions_order_success',
    'idx_trip_requests_unique_requester',
    'idx_booking_tickets_unique_booking',
  ];
  for (const guard of requiredGuards) {
    if (!dbSource.includes(guard) && !files.some((file) => fs.readFileSync(path.join(migrationsDir, file), 'utf8').includes(guard))) {
      fail(`Missing database guard ${guard}`);
    }
  }
}

if (warnings.length) {
  console.warn('Migration check warnings:');
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (errors.length) {
  console.error('Migration check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Migration check passed.');