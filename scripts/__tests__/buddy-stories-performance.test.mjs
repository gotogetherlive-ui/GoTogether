import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const buddyClient = readFileSync('src/app/buddy/BuddyClient.tsx', 'utf8');
const buddyRoute = readFileSync('src/app/api/buddy/route.ts', 'utf8');
const buddyFeed = readFileSync('src/lib/buddyFeed.ts', 'utf8');
const buddyPage = readFileSync('src/app/buddy/page.tsx', 'utf8');
const buddyGroupTags = readFileSync('src/lib/buddyGroupTags.ts', 'utf8');
const buddyEditRoute = readFileSync('src/app/api/buddy/[id]/route.ts', 'utf8');
const footer = readFileSync('src/components/Footer.tsx', 'utf8');
const storiesClient = readFileSync('src/app/stories/StoriesClient.tsx', 'utf8');
const storiesRoute = readFileSync('src/app/api/stories/route.ts', 'utf8');
const storiesPage = readFileSync('src/app/stories/page.tsx', 'utf8');
const tripsPage = readFileSync('src/app/trips/page.tsx', 'utf8');
const loadProfile = readFileSync('load/k6/gotogether-production.js', 'utf8');
const capacityCheck = readFileSync('scripts/check-capacity-config.mjs', 'utf8');
const packageJson = readFileSync('package.json', 'utf8');

test('FindBuddy defers optional client code and memoizes filtering', () => {
  assert.ok(buddyClient.includes('dynamic(() => import("@/components/CompatibilityWizard")'));
  assert.ok(buddyClient.includes('dynamic(() => import("@/components/BudgetEditor")'));
  assert.ok(buddyClient.includes('await import("@/lib/cloudinaryClient")'));
  assert.ok(buddyClient.includes('const filteredTrips = useMemo('));
  assert.ok(buddyClient.includes('setTrips((currentTrips) =>'));
});

test('buddy API avoids repeated profile and request lookups', () => {
  assert.ok(buddyRoute.includes('loadBuddyFeed'));
  assert.ok(buddyFeed.includes('LEFT JOIN trip_budgets'));
  assert.ok(buddyFeed.includes('LEFT JOIN trip_requests current_request'));
  assert.ok(buddyFeed.includes('parseStringArray(organizerProfile?.languages)'));
  assert.ok(buddyFeed.includes('anonymousBuddyFeedCache'));
  assert.ok(buddyFeed.includes('AsyncTtlCache'));
  assert.ok(buddyPage.includes('initialData={initialData}'));
});

test('Find Buddy group travel tags are bounded, persisted, and editable', () => {
  assert.ok(buddyClient.includes('value="group"'));
  assert.ok(buddyClient.includes('<GroupTagPicker'));
  assert.ok(buddyClient.includes('trip.group_tags.map'));
  assert.ok(buddyRoute.includes('parseBuddyGroupTagInput'));
  assert.ok(buddyRoute.includes("traveller_type === 'group'"));
  assert.ok(buddyEditRoute.includes('parseStoredBuddyGroupTags'));
  assert.ok(buddyFeed.includes('parseStoredBuddyGroupTags(trip.tags)'));
  assert.match(buddyGroupTags, /MAX_BUDDY_GROUP_TAGS = 5/);
  assert.ok(buddyGroupTags.includes('bike-riding'));
});

test('footer contact support remains available to administrators', () => {
  assert.ok(footer.includes('{isAdmin && adminLinks.map'));
  assert.ok(footer.includes('<FooterSupportButton '));
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
  assert.ok(storiesPage.includes('initialFeed={initialFeed}'));
  assert.ok(storiesClient.includes('useState<Story[]>(initialFeed?.stories || [])'));
  assert.ok(storiesClient.includes('Math.random() * 1650'));
});

test('public discovery reads are coalesced and the capacity suite reaches 4000 users', () => {
  assert.ok(tripsPage.includes('new AsyncTtlCache'));
  assert.ok(tripsPage.includes('loadTripsPage('));
  assert.match(loadProfile, /target4000/);
  assert.match(loadProfile, /spike4000/);
  assert.match(loadProfile, /discardResponseBodies:\s*true/);
  assert.match(capacityCheck, /APP_INSTANCE_COUNT/);
  assert.match(capacityCheck, /\* 0\.2/);
  assert.match(packageJson, /release:check[^\n]+check:capacity/);
});
