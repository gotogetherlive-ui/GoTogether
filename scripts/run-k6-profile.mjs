#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const cliArgs = process.argv.slice(2);
const profileArg = cliArgs.find((arg) => !arg.startsWith('--'));
const profile = profileArg || process.env.PROFILE || 'smoke';
const inspect = cliArgs.includes('--inspect');
const resultDir = process.env.RESULT_DIR || 'load-test-results';
const target = (process.env.TARGET_URL || process.env.BASE_URL || '').trim();
const allowLocal = ['1', 'true', 'yes', 'on'].includes(String(process.env.ALLOW_LOCAL_LOAD_TEST || '').toLowerCase());

function isLocalTarget(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.local');
  } catch {
    return true;
  }
}

function findK6() {
  const candidates = [
    process.env.K6_BIN,
    'k6',
    'C:\\Program Files\\k6\\k6.exe',
    'C:\\Program Files (x86)\\k6\\k6.exe',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate.includes('\\') || candidate.includes('/')) {
      if (fs.existsSync(candidate)) return candidate;
      continue;
    }
    const probe = spawnSync(process.platform === 'win32' ? 'where.exe' : 'which', [candidate], { encoding: 'utf8' });
    if (probe.status === 0) return candidate;
  }
  return null;
}

if (!inspect && isLocalTarget(target) && !allowLocal) {
  console.error('Refusing to run load test without a non-local TARGET_URL/BASE_URL. Set ALLOW_LOCAL_LOAD_TEST=true only for script debugging, never for capacity claims.');
  process.exit(1);
}

const k6 = findK6();
if (!k6) {
  console.error('k6 binary not found. Install k6 or set K6_BIN to the full k6 executable path.');
  process.exit(1);
}

fs.mkdirSync(resultDir, { recursive: true });

const command = inspect ? 'inspect' : 'run';
const args = [command, '-e', `PROFILE=${profile}`, '-e', `RESULT_DIR=${resultDir}`, 'load/k6/gotogether-production.js'];
const result = spawnSync(k6, args, { stdio: 'inherit', env: process.env, shell: false });
process.exit(result.status ?? 1);
