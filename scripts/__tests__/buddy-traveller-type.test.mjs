import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync('db/migrations/20260827_buddy_traveller_type.sql', 'utf8');
const runtimeSchema = readFileSync('src/lib/db.ts', 'utf8');
const buddyRoute = readFileSync('src/app/api/buddy/route.ts', 'utf8');
const buddyUpdateRoute = readFileSync('src/app/api/buddy/[id]/route.ts', 'utf8');
const buddyClient = readFileSync('src/app/buddy/BuddyClient.tsx', 'utf8');

test('buddy traveller type is persisted with a backwards-compatible migration', () => {
  assert.ok(migration.includes('ADD COLUMN IF NOT EXISTS traveller_type'));
  assert.ok(migration.includes("WHERE trip_type = 'buddy'"));
  assert.ok(migration.includes("traveller_type IN ('solo', 'couple')"));
  assert.ok(runtimeSchema.includes('ADD COLUMN IF NOT EXISTS traveller_type'));
  assert.ok(runtimeSchema.includes('ADD CONSTRAINT trips_traveller_type_check'));
});

test('buddy create and edit endpoints validate traveller type', () => {
  for (const source of [buddyRoute, buddyUpdateRoute]) {
    assert.ok(source.includes("traveller_type !== 'solo'"));
    assert.ok(source.includes("traveller_type !== 'couple'"));
  }
  assert.ok(buddyRoute.includes('INSERT INTO trips'));
  assert.ok(buddyUpdateRoute.includes('traveller_type = $8'));
});

test('FindBuddy form and cards expose both traveller tags', () => {
  assert.ok(buddyClient.includes('Solo Traveller'));
  assert.ok(buddyClient.includes('Couple Travelling'));
  assert.ok(buddyClient.includes('name="traveller_type"'));
});

test('FindBuddy can filter trips by traveller type', () => {
  assert.ok(buddyClient.includes('filterTravellerType'));
  assert.ok(buddyClient.includes('aria-label="Filter by traveller type"'));
  assert.ok(buddyClient.includes('trip.traveller_type === filterTravellerType'));
  assert.ok(buddyClient.includes('matchesGender && matchesTravellerType'));
});
