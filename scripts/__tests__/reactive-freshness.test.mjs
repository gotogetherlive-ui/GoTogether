import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sessionSource = readFileSync('src/components/SessionProvider.tsx', 'utf8');
const dashboardSource = readFileSync('src/app/dashboard/DashboardClient.tsx', 'utf8');
const navbarSource = readFileSync('src/components/Navbar.tsx', 'utf8');
const storiesSource = readFileSync('src/app/stories/StoriesClient.tsx', 'utf8');
const chatSource = readFileSync('src/app/chat/[tripId]/page.tsx', 'utf8');

test('profile save updates dashboard and the shared session using saved response fields', () => {
  assert.match(dashboardSource, /const updated = data\.profile/);
  assert.match(dashboardSource, /setProfile\(updated\)/);
  assert.match(dashboardSource, /updateSessionUser\(\{/);
  assert.doesNotMatch(dashboardSource, /updateSessionUser\(form\)/);
});

test('profile session merge cannot accept authorization-critical fields', () => {
  const safeType = sessionSource.match(/export type SessionProfileUpdate =[\s\S]*?>>;/)?.[0] || '';
  assert.match(safeType, /full_name/);
  assert.match(safeType, /avatar_url/);
  assert.doesNotMatch(safeType, /\brole\b|is_admin|is_verified|session|token/);
});

test('logout clears shared state and broadcasts only a non-sensitive signal', () => {
  assert.match(navbarSource, /setSessionSignedOut\(\)/);
  assert.match(sessionSource, /setUser\(null\)/);
  const eventLiteral = sessionSource.match(/const event = \{ type, timestamp: Date\.now\(\), sourceId: sourceIdRef\.current \}/)?.[0] || '';
  assert.ok(eventLiteral);
  assert.doesNotMatch(eventLiteral, /user|email|token|cookie|otp/i);
});

test('cross-tab events reconcile with the server and ignore the originating tab', () => {
  assert.match(sessionSource, /event\.sourceId === sourceIdRef\.current/);
  assert.match(sessionSource, /void refreshSession\(\)/);
  assert.match(sessionSource, /new BroadcastChannel\(SESSION_CHANNEL\)/);
  assert.match(sessionSource, /window\.addEventListener\("storage"/);
});

test('latest session refresh generation wins and stale requests are aborted', () => {
  assert.match(sessionSource, /generation !== requestGenerationRef\.current/);
  assert.match(sessionSource, /refreshControllerRef\.current\?\.abort\(\)/);
  assert.match(sessionSource, /mountedRef\.current/);
});

test('stories SSE closes, reconnects with bounded backoff, and reconciles on recovery', () => {
  assert.match(storiesSource, /source\.close\(\)/);
  assert.match(storiesSource, /retryDelay = Math\.min\(retryDelay \* 2, 30000\)/);
  assert.match(storiesSource, /if \(destroyed \|\| es \|\| retryTimer\) return/);
  assert.match(storiesSource, /if \(hasConnected\) void fetchStoriesRef\.current\(true\)/);
  assert.match(storiesSource, /window\.addEventListener\("focus", reconcile\)/);
  assert.match(storiesSource, /clearTimeout\(retryTimer\)/);
});

test('chat aborts overlapping and unmounted requests and rejects stale responses', () => {
  assert.match(chatSource, /messagesControllerRef\.current\?\.abort\(\)/);
  assert.match(chatSource, /generation !== messagesRequestGenerationRef\.current/);
  assert.match(chatSource, /signal: controller\.signal/);
  assert.match(chatSource, /\+\+messagesRequestGenerationRef\.current/);
});
