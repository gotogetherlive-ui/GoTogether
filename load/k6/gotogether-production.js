import http from 'k6/http';
import { check, sleep } from 'k6';

const baseUrl = (__ENV.TARGET_URL || __ENV.BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const profile = __ENV.PROFILE || 'smoke';

const profiles = {
  smoke: [{ duration: '15s', target: 3 }, { duration: '15s', target: 0 }],
  baseline50: [{ duration: '1m', target: 50 }, { duration: '3m', target: 50 }, { duration: '30s', target: 0 }],
  normal100: [{ duration: '2m', target: 100 }, { duration: '5m', target: 100 }, { duration: '1m', target: 0 }],
  high250: [{ duration: '3m', target: 250 }, { duration: '5m', target: 250 }, { duration: '1m', target: 0 }],
  prescale500: [{ duration: '5m', target: 500 }, { duration: '8m', target: 500 }, { duration: '2m', target: 0 }],
  scale1000: [{ duration: '8m', target: 1000 }, { duration: '10m', target: 1000 }, { duration: '3m', target: 0 }],
  target2000: [{ duration: '12m', target: 2000 }, { duration: '15m', target: 2000 }, { duration: '5m', target: 0 }],
  above2500: [{ duration: '15m', target: 2500 }, { duration: '10m', target: 2500 }, { duration: '5m', target: 0 }],
  spike3000: [{ duration: '2m', target: 3000 }, { duration: '3m', target: 3000 }, { duration: '5m', target: 0 }],
  soak1000: [{ duration: '10m', target: 1000 }, { duration: '2h', target: 1000 }, { duration: '10m', target: 0 }],
  soak2000: [{ duration: '15m', target: 2000 }, { duration: '2h', target: 2000 }, { duration: '15m', target: 0 }],
  contention25: [{ duration: '30s', target: 25 }, { duration: '5m', target: 25 }, { duration: '30s', target: 0 }],
  contention100: [{ duration: '1m', target: 100 }, { duration: '5m', target: 100 }, { duration: '1m', target: 0 }],
  contentionLimited: [{ duration: '1m', target: 20 }, { duration: '10m', target: 20 }, { duration: '1m', target: 0 }],
};

if (!profiles[profile]) throw new Error(`Unknown PROFILE: ${profile}`);

export const options = {
  scenarios: {
    web: {
      executor: 'ramping-vus',
      gracefulRampDown: '30s',
      stages: profiles[profile],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.001'],
    http_req_duration: ['p(95)<1500', 'p(99)<3000'],
    checks: ['rate>0.99'],
  },
  userAgent: 'GoTogether-capacity-test/1.0',
};

const routes = ['/', '/trips', '/trips', '/buddy', '/stories', '/about'];

export default function browsePublicPage() {
  const route = routes[Math.floor(Math.random() * routes.length)];
  const response = http.get(`${baseUrl}${route}`, {
    tags: { route },
    timeout: '10s',
  });
  check(response, {
    'response is successful': (result) => result.status >= 200 && result.status < 400,
  });
  sleep(0.5 + Math.random() * 1.5);
}

export function handleSummary(data) {
  const thresholdsPassed = Object.values(data.metrics).every((metric) =>
    !metric.thresholds || Object.values(metric.thresholds).every((threshold) => threshold.ok)
  );
  const summary = {
    profile,
    target: baseUrl,
    thresholdsPassed,
    httpFailedRate: data.metrics.http_req_failed?.values?.rate ?? null,
    httpRequests: data.metrics.http_reqs?.values?.count ?? 0,
    httpDurationP95Ms: data.metrics.http_req_duration?.values?.['p(95)'] ?? null,
    httpDurationP99Ms: data.metrics.http_req_duration?.values?.['p(99)'] ?? null,
    checkRate: data.metrics.checks?.values?.rate ?? null,
  };
  const outputPath = `${__ENV.RESULT_DIR || 'load-test-results'}/${profile}.json`;
  return {
    [outputPath]: JSON.stringify({ summary }, null, 2),
    stdout: `\nGoTogether ${profile}: ${thresholdsPassed ? 'PASS' : 'FAIL'} | requests=${summary.httpRequests} | p95=${summary.httpDurationP95Ms}ms | failures=${summary.httpFailedRate}\n`,
  };
}
