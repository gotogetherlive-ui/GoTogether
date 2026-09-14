#!/usr/bin/env node

import { loadProductionEnvFiles } from './check-production-env.mjs';

loadProductionEnvFiles(process.env, process.cwd());

function positiveInteger(name, fallback) {
  const raw = String(process.env[name] || fallback).trim();
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < 1) throw new Error(`${name} must be a positive integer`);
  return value;
}

try {
  const workers = positiveInteger('WEB_CONCURRENCY', 4);
  const instances = positiveInteger('APP_INSTANCE_COUNT', 1);
  const poolPerWorker = positiveInteger('PG_POOL_MAX', 5);
  const databaseLimit = process.env.PG_DATABASE_MAX_CONNECTIONS
    ? positiveInteger('PG_DATABASE_MAX_CONNECTIONS', 1)
    : null;
  const listenerConnections = workers * instances;
  const operationalReserve = Math.max(5, Math.ceil((databaseLimit || 50) * 0.2));
  if (poolPerWorker < 2) throw new Error('PG_POOL_MAX must be at least 2 because each worker reserves one pooled connection for realtime notifications');
  const applicationQuerySlots = workers * instances * (poolPerWorker - 1);
  const pooledConnections = workers * instances * poolPerWorker;
  const requiredConnections = pooledConnections + operationalReserve;

  if (databaseLimit !== null && requiredConnections > databaseLimit) {
    throw new Error(
      `Database connection budget is oversubscribed: pools=${pooledConnections}, reserve=${operationalReserve}, limit=${databaseLimit}`,
    );
  }

  console.log(`Capacity configuration: ${instances} application instance(s), ${workers} web workers per instance, ${poolPerWorker} PostgreSQL connections per worker.`);
  console.log(`Application query capacity: ${applicationQuerySlots} slots; ${listenerConnections} additional pooled slots are reserved by realtime listeners.`);
  console.log(`Planned PostgreSQL usage: ${pooledConnections} pooled + ${operationalReserve} operational reserve = ${requiredConnections}.`);
  if (databaseLimit === null) {
    console.warn('Set PG_DATABASE_MAX_CONNECTIONS to make the database connection-budget check enforceable in CI.');
  } else {
    console.log(`Database connection limit: ${databaseLimit}; remaining headroom: ${databaseLimit - requiredConnections}.`);
  }
} catch (error) {
  console.error(`Capacity configuration failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
