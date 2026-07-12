import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

if (!process.env.TEST_DATABASE_URL && process.env.DATABASE_URL) {
  process.env.TEST_DATABASE_URL = process.env.DATABASE_URL;
}

if (!process.env.TEST_DATABASE_URL) {
  try {
    process.loadEnvFile('.env.local');
    process.env.TEST_DATABASE_URL ||= process.env.DATABASE_URL;
  } catch {
    // A clear configuration error is emitted below.
  }
}

if (!process.env.TEST_DATABASE_URL) {
  console.error('TEST_DATABASE_URL is required for payment tests.');
  process.exit(1);
}

let databaseUrl;
try {
  databaseUrl = new URL(process.env.TEST_DATABASE_URL);
} catch {
  console.error('TEST_DATABASE_URL must be a valid PostgreSQL URL.');
  process.exit(1);
}

const localHosts = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
if (!localHosts.has(databaseUrl.hostname)) {
  console.error('Payment tests are destructive and only run against a local database whose name ends in _test.');
  process.exit(1);
}

if (!databaseUrl.pathname.slice(1).endsWith('_test')) {
  databaseUrl.pathname = '/gotogether_test';
}

const testDirectory = resolve('src/lib/payments/__tests__');
const testFiles = readdirSync(testDirectory)
  .filter((name) => name.endsWith('.test.ts'))
  .sort()
  .map((name) => resolve(testDirectory, name));

const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', '--test-concurrency=1', ...testFiles], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    NODE_ENV: 'test',
    DATABASE_URL: databaseUrl.toString(),
    RESEND_API_KEY: process.env.RESEND_API_KEY || 're_test_only',
  },
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);