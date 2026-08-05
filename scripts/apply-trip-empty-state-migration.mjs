#!/usr/bin/env node

import fs from "node:fs";
import nextEnv from "@next/env";
import pg from "pg";
import { getDatabaseSsl } from "../src/lib/databaseSsl.js";

const { loadEnvConfig } = nextEnv;
const { Client } = pg;

loadEnvConfig(process.cwd());

const migrationFile = "db/migrations/20260805_trip_empty_state_settings.sql";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

  const sql = fs.readFileSync(migrationFile, "utf8");
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: getDatabaseSsl(process.env),
  });

  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext('gotogether_trip_empty_state_migration'))");

    const before = Number((await client.query("SELECT COUNT(*)::text AS count FROM public.settings")).rows[0].count);
    await client.query(sql);
    const after = Number((await client.query("SELECT COUNT(*)::text AS count FROM public.settings")).rows[0].count);
    const columns = Number((await client.query(`
      SELECT COUNT(*)::text AS count
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'settings'
        AND column_name IN ('trips_empty_title', 'trips_empty_message')
    `)).rows[0].count);

    if (before !== after) throw new Error("Settings row count changed unexpectedly");
    if (columns !== 2) throw new Error("Expected settings columns were not created");

    await client.query("COMMIT");
    console.log(`Migration committed safely. Settings rows preserved: ${after}. Verified columns: ${columns}.`);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`Trip empty-state migration failed and was rolled back: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
