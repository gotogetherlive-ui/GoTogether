import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const runtimeSchema = readFileSync('src/lib/db.ts', 'utf8');
const migration = readFileSync('db/migrations/20260713_trips_updated_at.sql', 'utf8');
const tripPage = readFileSync('src/app/trips/[tripSlug]/page.tsx', 'utf8');
const sitemap = readFileSync('src/app/sitemap.ts', 'utf8');

test('trip updated_at is guaranteed wherever public queries select it', () => {
  assert.ok(tripPage.includes("to_jsonb(t)->>'updated_at'"));
  assert.ok(sitemap.includes("to_jsonb(t)->>'updated_at'"));
  assert.ok(runtimeSchema.includes('ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS updated_at'));
  assert.ok(migration.includes('ADD COLUMN IF NOT EXISTS updated_at'));
});

test('trip updates maintain updated_at automatically', () => {
  assert.ok(runtimeSchema.includes('CREATE TRIGGER trg_trips_updated_at'));
  assert.ok(migration.includes('BEFORE UPDATE ON public.trips'));
  assert.ok(migration.includes('NEW.updated_at = NOW()'));
});
