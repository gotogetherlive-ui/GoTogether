import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const buddyClient = readFileSync('src/app/buddy/BuddyClient.tsx', 'utf8');
const storiesClient = readFileSync('src/app/stories/StoriesClient.tsx', 'utf8');
const storyShareSheet = readFileSync('src/components/stories/StoryShareSheet.tsx', 'utf8');

test('FindBuddy presents a professional search flow without removing matching controls', () => {
  assert.ok(buddyClient.includes('Find a travel buddy'));
  assert.ok(buddyClient.includes('Search available trips'));
  assert.ok(buddyClient.includes('filteredTrips.length'));
  assert.ok(buddyClient.includes('clearFilters'));
  assert.ok(buddyClient.includes('View match details'));
  assert.ok(buddyClient.includes('Solo Traveller'));
});

test('Stories keeps its social features in the redesigned community feed', () => {
  assert.ok(storiesClient.includes('Stories from the road.'));
  assert.ok(storiesClient.includes('Your story'));
  assert.ok(storiesClient.includes('Create a travel story'));
  assert.ok(storiesClient.includes('handleToggleLike'));
  assert.ok(storiesClient.includes('handleToggleCommentsSection'));
  assert.ok(storiesClient.includes('handleShareStory'));
  assert.ok(storiesClient.includes('handleCarouselNext'));
  assert.ok(storiesClient.includes('Linked Trip'));
});

test('Stories share sheet retains professional multi-channel sharing', () => {
  assert.ok(storyShareSheet.includes('Send this travel moment'));
  assert.ok(storyShareSheet.includes('onOpenTarget("whatsapp")'));
  assert.ok(storyShareSheet.includes('onOpenTarget("x")'));
  assert.ok(storyShareSheet.includes('onOpenTarget("facebook")'));
  assert.ok(storiesClient.includes('copyStoryLink(shareStory)'));
});
