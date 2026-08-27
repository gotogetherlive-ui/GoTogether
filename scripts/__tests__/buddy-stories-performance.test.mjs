import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const buddyClient = readFileSync('src/app/buddy/BuddyClient.tsx', 'utf8');
const buddyRoute = readFileSync('src/app/api/buddy/route.ts', 'utf8');
const storiesClient = readFileSync('src/app/stories/StoriesClient.tsx', 'utf8');
const storiesRoute = readFileSync('src/app/api/stories/route.ts', 'utf8');

test('FindBuddy defers optional client code and memoizes filtering', () => {
  assert.ok(buddyClient.includes('dynamic(() => import("@/components/CompatibilityWizard")'));
  assert.ok(buddyClient.includes('dynamic(() => import("@/components/BudgetEditor")'));
  assert.ok(buddyClient.includes('await import("@/lib/cloudinaryClient")'));
  assert.ok(buddyClient.includes('const filteredTrips = useMemo('));
  assert.ok(buddyClient.includes('setTrips((currentTrips) =>'));
});

test('buddy API avoids repeated profile and request lookups', () => {
  assert.ok(buddyRoute.includes('LEFT JOIN trip_budgets'));
  assert.ok(buddyRoute.includes('LEFT JOIN trip_requests current_request'));
  assert.ok(buddyRoute.includes('parseStringArray(organizerProfile?.languages)'));
});

test('Stories avoids unnecessary bundle and pagination work', () => {
  assert.ok(storiesClient.includes('await import("@/lib/cloudinaryClient")'));
  assert.ok(storiesClient.includes('dynamic(() => import("@/components/stories/StoryShareSheet")'));
  assert.ok(storiesClient.includes('dynamic(() => import("@/components/stories/TravelerProfileDialog")'));
  assert.ok(storiesClient.includes('Promise.all('));
  assert.ok(storiesClient.includes('include_meta", "0"'));
  assert.ok(storiesRoute.includes('const includeMeta'));
  assert.ok(storiesRoute.includes('rowsPromise'));
  assert.ok(storiesRoute.includes('activeUsersPromise'));
  assert.ok(storiesRoute.includes('currentUserPostCountPromise'));
});
