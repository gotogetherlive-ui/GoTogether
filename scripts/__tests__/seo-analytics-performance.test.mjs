import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const analytics = readFileSync('src/components/GoogleAnalytics.tsx', 'utf8');
const layout = readFileSync('src/app/layout.tsx', 'utf8');
const seo = readFileSync('src/lib/seo.ts', 'utf8');
const tripsPage = readFileSync('src/app/trips/page.tsx', 'utf8');
const sitemap = readFileSync('src/app/sitemap.ts', 'utf8');
const guidePage = readFileSync('src/app/guides/[guideSlug]/page.tsx', 'utf8');

test('Google Analytics initializes once and records App Router navigations', () => {
  assert.ok(layout.includes('send_page_view: false'));
  assert.ok(layout.includes('NEXT_PUBLIC_GA_MEASUREMENT_ID'));
  assert.ok(analytics.includes('usePathname()'));
  assert.ok(analytics.includes('useSearchParams()'));
  assert.ok(analytics.includes('"page_view"'));
  assert.ok(analytics.includes('useReportWebVitals'));
});

test('invalid sitelinks search template is no longer advertised and old URLs redirect', () => {
  assert.ok(!seo.includes('SearchAction'));
  assert.ok(!seo.includes('search_term_string'));
  assert.ok(tripsPage.includes('query === "{search_term_string}"'));
  assert.ok(tripsPage.includes('permanentRedirect("/trips")'));
});

test('the sitemap does not submit pages that explicitly use noindex', () => {
  assert.ok(guidePage.includes('index: false'));
  assert.ok(!sitemap.includes('guidePages.map'));
  assert.ok(!sitemap.includes('destinations.map'));
});

test('sitemap generation is read-only and avoids per-entry slug queries', () => {
  assert.ok(sitemap.includes('t.slug IS NOT NULL'));
  assert.ok(sitemap.includes('u.organizer_slug IS NOT NULL'));
  assert.ok(!sitemap.includes('ensureTripSlug'));
  assert.ok(!sitemap.includes('ensureOrganizerSlug'));
});
