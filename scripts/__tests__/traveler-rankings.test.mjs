import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const competition = readFileSync('src/lib/storyCompetition.ts', 'utf8');
const migration = readFileSync('db/migrations/20260713_traveler_like_events.sql', 'utf8');
const storiesRoute = readFileSync('src/app/api/stories/route.ts', 'utf8');
const likeRoute = readFileSync('src/app/api/stories/[id]/like/route.ts', 'utf8');
const rankingsRoute = readFileSync('src/app/api/traveler-rankings/route.ts', 'utf8');
const storiesClient = readFileSync('src/app/stories/StoriesClient.tsx', 'utf8');
const seo = readFileSync('src/lib/seo.ts', 'utf8');
const manifest = readFileSync('src/app/manifest.ts', 'utf8');
const nextConfig = readFileSync('next.config.ts', 'utf8');

test('competition uses Asia/Kolkata weeks with Sunday-Friday scoring and Saturday featuring', () => {
  assert.ok(competition.includes('IST_OFFSET_MS = 330 * 60 * 1000'));
  assert.ok(competition.includes("getUTCDay() === 6 ? 'featured' : 'active'"));
  assert.ok(competition.includes('scoringEndsAt: new Date(localSundayMs + 6 * DAY_MS - IST_OFFSET_MS)'));
  assert.ok(competition.includes('featureEndsAt: new Date(localSundayMs + 7 * DAY_MS - IST_OFFSET_MS)'));
});

test('each received like is worth one quarter point and self-likes are rejected', () => {
  assert.ok(competition.includes('STORY_LIKE_POINT_VALUE = 0.25'));
  assert.ok(rankingsRoute.includes('COUNT(sl.id)::int AS total_likes'));
  assert.ok(rankingsRoute.includes('es.total_likes * ${STORY_LIKE_POINT_VALUE}'));
  assert.ok(likeRoute.includes('story.user_id === user.id'));
  assert.ok(likeRoute.toLowerCase().includes('cannot score your own'));
});

test('a traveler can publish at most two posts while the event is active', () => {
  assert.ok(competition.includes('STORY_EVENT_POST_LIMIT = 2'));
  assert.ok(storiesRoute.includes("competitionWindow.phase !== 'active'"));
  assert.ok(storiesRoute.includes('Number(postCount.count) >= STORY_EVENT_POST_LIMIT'));
  assert.ok(storiesRoute.includes('pg_advisory_xact_lock'));
  assert.ok(storiesRoute.includes('already used both posts'));
});

test('ranking totals likes across both posts and uses deterministic tie breakers', () => {
  assert.ok(rankingsRoute.includes('GROUP BY s.user_id'));
  assert.ok(rankingsRoute.includes('ORDER BY es.total_likes DESC, es.story_count DESC, es.first_post_at ASC, u.id ASC'));
  assert.ok(rankingsRoute.includes("role <> 'super_admin'"));
});

test('Saturday winner is snapshotted for one day and old posts reset on Sunday', () => {
  assert.ok(migration.includes('CREATE TABLE IF NOT EXISTS public.story_event_winners'));
  assert.ok(competition.includes('INSERT INTO story_event_winners'));
  assert.ok(competition.includes('DELETE FROM travel_stories'));
  assert.ok(competition.includes('WHERE created_at < $1'));
  assert.ok(storiesClient.includes('Saturday features the winner'));
  assert.ok(storiesClient.includes('all event posts reset on Sunday'));
});

test('publishing no longer awards legacy credits', () => {
  assert.ok(!storiesRoute.includes('INSERT INTO traveler_credit_ledger'));
  assert.ok(migration.includes('DELETE FROM public.traveler_credit_ledger'));
  assert.ok(migration.includes('UPDATE public.users SET credit_points = 0'));
});

test('event maintenance is idempotent and does not mutate global credits per request', () => {
  assert.ok(migration.includes('CREATE TABLE IF NOT EXISTS public.story_event_maintenance'));
  assert.ok(competition.includes('FROM story_event_maintenance'));
  assert.ok(competition.includes('winner_finalized_at'));
  assert.ok(!competition.includes('UPDATE users SET credit_points'));
  assert.ok(!competition.includes('DELETE FROM traveler_credit_ledger'));
});

test('all score queries exclude self-likes and posting rules apply to every account', () => {
  assert.ok(rankingsRoute.includes('sl.user_id <> s.user_id'));
  assert.ok(competition.includes('sl.user_id <> s.user_id'));
  assert.ok(!storiesRoute.includes("if (!isAdmin && competitionWindow.phase !== 'active')"));
  assert.ok(storiesRoute.includes('STORY_EVENT_POST_LIMIT_REACHED'));
});

test('favicon and install manifest consistently use the SVG application icon', () => {
  assert.ok(existsSync('src/app/icon.svg'));
  assert.ok(manifest.includes('src: "/icon.svg"'));
  assert.ok(!seo.includes('/favicon.ico'));
  assert.ok(nextConfig.includes("source: '/favicon.ico'"));
  assert.ok(nextConfig.includes("destination: '/icon.svg'"));
  assert.ok(nextConfig.includes('permanent: true'));
});
