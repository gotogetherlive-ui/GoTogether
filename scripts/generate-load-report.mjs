#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const resultDir = process.env.RESULT_DIR || process.argv[2] || 'load-test-results';
const outFile = path.join(resultDir, 'production-load-report.md');
const stableProfiles = [
  ['smoke', 5],
  ['baseline50', 50],
  ['normal100', 100],
  ['high250', 250],
  ['prescale500', 500],
  ['scale1000', 1000],
  ['target2000', 2000],
];
const peakProfiles = [...stableProfiles, ['above2500', 2500], ['spike3000', 3000]];
const allProfiles = [...new Set([...peakProfiles.map(([name]) => name), 'soak1000', 'soak2000', 'contention25', 'contention100', 'contentionLimited'])];

function readArtifact(profile) {
  const file = path.join(resultDir, `${profile}.json`);
  if (!fs.existsSync(file)) return { profile, file, exists: false, passed: false };
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    const summary = parsed.summary || parsed;
    const failedRate = Number(summary.httpFailedRate ?? summary.http5xxRate ?? 1);
    const passed = summary.thresholdsPassed === true && Number.isFinite(failedRate) && failedRate < 0.001;
    return { profile, file, exists: true, passed, summary };
  } catch (error) {
    return { profile, file, exists: true, passed: false, parseError: String(error?.message || error) };
  }
}

function fmt(value, fallback = 'N/A') {
  return value === null || value === undefined || Number.isNaN(value) ? fallback : String(value);
}

function pct(rate) {
  if (rate === null || rate === undefined || Number.isNaN(Number(rate))) return 'N/A';
  return `${(Number(rate) * 100).toFixed(4)}%`;
}

function commitSha() {
  try {
    const head = fs.readFileSync(path.join(process.cwd(), '.git', 'HEAD'), 'utf8').trim();
    if (!head.startsWith('ref:')) return head.slice(0, 12);
    const ref = head.slice(5).trim();
    return fs.readFileSync(path.join(process.cwd(), '.git', ref), 'utf8').trim().slice(0, 12);
  } catch {
    return process.env.GIT_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || 'unknown';
  }
}

const artifacts = Object.fromEntries(allProfiles.map((profile) => [profile, readArtifact(profile)]));
let stableConcurrentUsers = 0;
for (const [profile, vus] of stableProfiles) {
  if (artifacts[profile]?.passed) stableConcurrentUsers = vus;
  else break;
}
let peakConcurrentUsers = stableConcurrentUsers;
for (const [profile, vus] of peakProfiles) {
  if (artifacts[profile]?.passed) peakConcurrentUsers = Math.max(peakConcurrentUsers, vus);
}

const target2000 = artifacts.target2000;
const above2500 = artifacts.above2500;
const stableArtifact = [...stableProfiles].reverse().find(([profile, vus]) => vus === stableConcurrentUsers && artifacts[profile]?.passed)?.[0];
const stableSummary = stableArtifact ? artifacts[stableArtifact].summary : null;
const bookingOvercapacity = Object.values(artifacts).some((artifact) => Number(artifact.summary?.bookingOvercapacityRate || 0) > 0);
const chatLeakage = Object.values(artifacts).some((artifact) => Number(artifact.summary?.chatLeakageRate || 0) > 0);
const notificationLeakage = Object.values(artifacts).some((artifact) => Number(artifact.summary?.notificationLeakageRate || 0) > 0);
const adminBypass = Object.values(artifacts).some((artifact) => Number(artifact.summary?.adminBypassRate || 0) > 0);
const blockers = [];
if (!target2000.exists) blockers.push('target2000.json is missing; 2000-user capacity is not proven.');
else if (!target2000.passed) blockers.push('target2000 did not pass k6 thresholds.');
if (!above2500.exists) blockers.push('above2500.json is missing; above-target capacity is not proven.');
for (const name of ['db-metrics.png', 'app-metrics.png', 'error-logs.txt', 'slow-queries.txt']) {
  if (!fs.existsSync(path.join(resultDir, name))) blockers.push(`${name} is missing from load-test evidence.`);
}
if (bookingOvercapacity) blockers.push('booking overcapacity signal was observed in k6 artifacts.');
if (chatLeakage) blockers.push('chat leakage signal was observed in k6 artifacts.');
if (notificationLeakage) blockers.push('notification leakage signal was observed in k6 artifacts.');
if (adminBypass) blockers.push('admin bypass signal was observed in k6 artifacts.');

const report = `# GoTogether Production Load Report

## 1. Executive Summary

Load Test Status: ${target2000.exists ? (target2000.passed ? 'PARTIAL' : 'FAIL') : 'NOT RUN'}

2000-user support is ${target2000.passed ? 'supported by retained k6 threshold evidence, pending infrastructure metric review' : 'not proven'}.

## 2. Infrastructure Tested

TARGET_URL: ${fmt(target2000.summary?.target || process.env.TARGET_URL)}
Commit SHA: ${commitSha()}
Hosting provider: ${fmt(process.env.LOAD_TEST_HOSTING_PROVIDER)}
Region: ${fmt(process.env.LOAD_TEST_REGION)}
Number of app instances: ${fmt(process.env.LOAD_TEST_APP_INSTANCES)}
CPU per app instance: ${fmt(process.env.LOAD_TEST_APP_CPU)}
RAM per app instance: ${fmt(process.env.LOAD_TEST_APP_RAM)}
Autoscaling: ${fmt(process.env.LOAD_TEST_AUTOSCALING)}
Load balancer: ${fmt(process.env.LOAD_TEST_LOAD_BALANCER)}
CDN: ${fmt(process.env.LOAD_TEST_CDN)}
PostgreSQL provider: ${fmt(process.env.LOAD_TEST_DB_PROVIDER)}
PostgreSQL CPU/RAM: ${fmt(process.env.LOAD_TEST_DB_SIZE)}
PostgreSQL max connections: ${fmt(process.env.LOAD_TEST_DB_MAX_CONNECTIONS)}
Connection pooler/PgBouncer: ${fmt(process.env.LOAD_TEST_POOLER)}
Redis/cache: ${fmt(process.env.LOAD_TEST_REDIS)}
Queue system: ${fmt(process.env.LOAD_TEST_QUEUE)}
Cloudinary mode: ${fmt(process.env.LOAD_TEST_CLOUDINARY_MODE)}
Email provider mode: ${fmt(process.env.LOAD_TEST_EMAIL_MODE)}
Payment provider mode: ${fmt(process.env.LOAD_TEST_PAYMENT_MODE)}
Monitoring/logging stack: ${fmt(process.env.LOAD_TEST_MONITORING)}

## 3. Commit SHA

${commitSha()}

## 4. Env Validation Result

Not inferred from this report. Attach the output of \`npm run check-production-env\` from the staging config.

## 5. Migration Result

Not inferred from this report. Attach the output of \`npm run db:migrate:check\`.

## 6. Regression Test Result

Not inferred from this report. Attach \`npm test\` output.

## 7. DB-Backed Booking Concurrency Result

Not inferred from this report. Attach \`npm run test:bookings\` output.

## 8. k6 Profiles Executed

${allProfiles.map((profile) => `- ${profile}: ${artifacts[profile].exists ? (artifacts[profile].passed ? 'PASS' : 'FAIL') : 'NOT RUN'}`).join('\n')}

## 9. target2000 Result

${target2000.exists ? JSON.stringify(target2000.summary, null, 2) : 'NOT RUN'}

## 10. above2500 Result

${above2500.exists ? JSON.stringify(above2500.summary, null, 2) : 'NOT RUN'}

## 11. Spike Result

${artifacts.spike3000.exists ? JSON.stringify(artifacts.spike3000.summary, null, 2) : 'NOT RUN'}

## 12. Soak Result

soak1000: ${artifacts.soak1000.exists ? (artifacts.soak1000.passed ? 'PASS' : 'FAIL') : 'NOT RUN'}
soak2000: ${artifacts.soak2000.exists ? (artifacts.soak2000.passed ? 'PASS' : 'FAIL') : 'NOT RUN'}

## 13. Bottlenecks

Primary Bottleneck: unknown unless infrastructure metrics are attached.

## 14. Fixes Applied

None inferred from retained load artifacts.

## 15. Retest Results

See profile list above.

## 16. Stable Concurrent Users Proven

${stableConcurrentUsers}

## 17. Peak Concurrent Users Proven

${peakConcurrentUsers}

## 18. Recommended Safe Launch Limit

${stableConcurrentUsers > 0 ? Math.floor(stableConcurrentUsers * 0.7) : 0}

## 19. Remaining Blockers

${blockers.length ? blockers.map((blocker) => `- ${blocker}`).join('\n') : '- None from k6 artifacts; confirm external infrastructure metrics before certification.'}

## 20. Final Classification

\`\`\`txt
Application Readiness: ${target2000.passed && blockers.length === 0 ? 'Production Ready' : 'Staging Ready'}
Load Test Status: ${target2000.exists ? (target2000.passed ? 'PARTIAL' : 'FAIL') : 'NOT RUN'}
Stable Concurrent Users Proven: ${stableConcurrentUsers}
Peak Concurrent Users Proven: ${peakConcurrentUsers}
2000 Concurrent Users Supported: ${target2000.passed && blockers.length === 0 ? 'YES' : 'NO'}
2500 Concurrent Users Supported: ${above2500.passed && blockers.length === 0 ? 'YES' : 'NO'}
Recommended Safe Launch Limit: ${stableConcurrentUsers > 0 ? Math.floor(stableConcurrentUsers * 0.7) : 0}
p95 Latency At Stable Load: ${fmt(stableSummary?.p95LatencyMs, 'N/A')} ms
p99 Latency At Stable Load: ${fmt(stableSummary?.p99LatencyMs, 'N/A')} ms
5xx Error Rate At Stable Load: ${pct(stableSummary?.httpFailedRate)}
Booking Overcapacity Observed: ${bookingOvercapacity ? 'YES' : 'NO'}
DB Pool Exhaustion Observed: unknown
Memory Leak Observed: unknown
Primary Bottleneck: unknown
Capacity Confidence: ${target2000.passed && blockers.length === 0 ? 'MEDIUM' : 'LOW'}
Production Certification: NO
\`\`\`
`;

fs.mkdirSync(resultDir, { recursive: true });
fs.writeFileSync(outFile, report);
console.log(report);
