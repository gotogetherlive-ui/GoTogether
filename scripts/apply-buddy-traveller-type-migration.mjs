#!/usr/bin/env node

import fs from "node:fs";
import nextEnv from "@next/env";
import pg from "pg";
import { getDatabaseSsl } from "../src/lib/databaseSsl.js";

const { loadEnvConfig } = nextEnv;
const { Client } = pg;

loadEnvConfig(process.cwd());

const migrationFile = "db/migrations/20260827_buddy_traveller_type.sql";

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
    await client.query("SELECT pg_advisory_xact_lock(hashtext('gotogether_buddy_traveller_type_migration'))");

    const before = Number((await client.query("SELECT COUNT(*)::text AS count FROM public.trips")).rows[0].count);
    await client.query(sql);
    const after = Number((await client.query("SELECT COUNT(*)::text AS count FROM public.trips")).rows[0].count);

    const columnExists = Number((await client.query(`
      SELECT COUNT(*)::text AS count
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'trips'
        AND column_name = 'traveller_type'
    `)).rows[0].count);
    const invalidBuddyRows = Number((await client.query(`
      SELECT COUNT(*)::text AS count
      FROM public.trips
      WHERE trip_type = 'buddy'
        AND traveller_type IS NULL
    `)).rows[0].count);

    if (before !== after) throw new Error("Trip row count changed unexpectedly");
    if (columnExists !== 1) throw new Error("Expected traveller_type column was not created");
    if (invalidBuddyRows !== 0) throw new Error("Buddy trips without traveller_type remain");

    await client.query("COMMIT");
    console.log(`Migration committed safely. Trips preserved: ${after}. Buddy traveller types verified.`);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`Buddy traveller-type migration failed and was rolled back: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
