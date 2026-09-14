#!/usr/bin/env node

import fs from "node:fs";
import nextEnv from "@next/env";
import pg from "pg";
import { getDatabaseSsl } from "../src/lib/databaseSsl.js";

const { loadEnvConfig } = nextEnv;
const { Client } = pg;

loadEnvConfig(process.cwd());

const migrationFile = "db/migrations/20260912_buddy_group_travel.sql";

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
    await client.query("SELECT pg_advisory_xact_lock(hashtext('gotogether_buddy_group_travel_migration'))");

    const before = Number((await client.query("SELECT COUNT(*)::text AS count FROM public.trips")).rows[0].count);
    await client.query(sql);
    const after = Number((await client.query("SELECT COUNT(*)::text AS count FROM public.trips")).rows[0].count);
    const constraintDefinition = String((await client.query(`
      SELECT pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
      WHERE conrelid = 'public.trips'::regclass
        AND conname = 'trips_traveller_type_check'
    `)).rows[0]?.definition || "");

    if (before !== after) throw new Error("Trip row count changed unexpectedly");
    if (!constraintDefinition.includes("'group'")) throw new Error("Traveller type constraint does not allow group travel");

    await client.query("COMMIT");
    console.log(`Migration committed safely. Trips preserved: ${after}. Group travel constraint verified.`);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`Buddy group-travel migration failed and was rolled back: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
