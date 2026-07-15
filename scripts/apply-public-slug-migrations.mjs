#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import nextEnv from "@next/env";
import pg from "pg";
import { getDatabaseSsl } from "../src/lib/databaseSsl.js";

const { loadEnvConfig } = nextEnv;
const { Client } = pg;

loadEnvConfig(process.cwd());

const migrationFiles = [
  "20260702_public_trip_slugs.sql",
  "20260702_public_organizer_slugs.sql",
];

function loadMigration(file) {
  const fullPath = path.join(process.cwd(), "db", "migrations", file);
  const sql = fs.readFileSync(fullPath, "utf8");
  if (/\b(?:DROP\s+(?:TABLE|SCHEMA|DATABASE)|TRUNCATE|DELETE\s+FROM)\b/i.test(sql)) {
    throw new Error(`${file} contains a destructive statement and will not be applied`);
  }
  return sql;
}

async function tableCounts(client) {
  const { rows: [counts] } = await client.query(`
    SELECT
      (SELECT COUNT(*)::bigint FROM public.trips) AS trips,
      (SELECT COUNT(*)::bigint FROM public.users) AS users
  `);
  return { trips: Number(counts.trips), users: Number(counts.users) };
}

async function verifyMigration(client, before) {
  const after = await tableCounts(client);
  if (before.trips !== after.trips || before.users !== after.users) {
    throw new Error(`row-count mismatch detected (before=${JSON.stringify(before)}, after=${JSON.stringify(after)})`);
  }

  const { rows: [verification] } = await client.query(`
    SELECT
      (SELECT COUNT(*)::bigint FROM public.trips WHERE slug IS NULL) AS trips_without_slug,
      (SELECT COUNT(*)::bigint FROM public.users
        WHERE organizer_slug IS NULL
          AND deleted_at IS NULL
          AND role IN ('business', 'super_admin')) AS organizers_without_slug,
      to_regclass('public.trip_slug_history') IS NOT NULL AS trip_history_exists,
      to_regclass('public.organizer_slug_history') IS NOT NULL AS organizer_history_exists,
      to_regclass('public.idx_trips_slug_unique') IS NOT NULL AS trip_slug_index_exists,
      to_regclass('public.idx_users_organizer_slug_unique') IS NOT NULL AS organizer_slug_index_exists
  `);

  const failed = Object.entries(verification).filter(([key, value]) =>
    key.endsWith("_without_slug") ? Number(value) !== 0 : value !== true
  );
  if (failed.length) {
    throw new Error(`migration verification failed: ${failed.map(([key]) => key).join(", ")}`);
  }

  return after;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

  const migrations = migrationFiles.map((file) => ({ file, sql: loadMigration(file) }));
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: getDatabaseSsl(process.env),
  });

  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext('gotogether_public_slug_migrations'))");
    const before = await tableCounts(client);

    for (const migration of migrations) {
      process.stdout.write(`Applying ${migration.file}... `);
      await client.query(migration.sql);
      console.log("done");
    }

    const after = await verifyMigration(client, before);
    await client.query("COMMIT");
    console.log(`Public slug migrations committed safely. Row counts preserved: ${after.trips} trips, ${after.users} users.`);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`Public slug migration failed and was rolled back: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
