export const BUDDY_GROUP_TAG_OPTIONS = [
  { value: "bike-riding", label: "Bike riding" },
  { value: "hiking", label: "Hiking" },
  { value: "trekking", label: "Trekking" },
  { value: "road-trip", label: "Road trip" },
  { value: "camping", label: "Camping" },
  { value: "backpacking", label: "Backpacking" },
  { value: "photography", label: "Photography" },
  { value: "food-and-culture", label: "Food & culture" },
  { value: "adventure-sports", label: "Adventure sports" },
  { value: "wellness", label: "Wellness" },
] as const;

export type BuddyGroupTag = (typeof BUDDY_GROUP_TAG_OPTIONS)[number]["value"];

export const MAX_BUDDY_GROUP_TAGS = 5;

const allowedTags = new Set<string>(BUDDY_GROUP_TAG_OPTIONS.map((option) => option.value));
const labels = new Map<string, string>(BUDDY_GROUP_TAG_OPTIONS.map((option) => [option.value, option.label]));

function validateTagArray(value: unknown): BuddyGroupTag[] | null {
  if (!Array.isArray(value)) return null;
  const unique = [...new Set(value)];
  if (unique.length > MAX_BUDDY_GROUP_TAGS || unique.some((tag) => typeof tag !== "string" || !allowedTags.has(tag))) {
    return null;
  }
  return unique as BuddyGroupTag[];
}

export function parseBuddyGroupTagInput(value: unknown): BuddyGroupTag[] | null {
  if (value === undefined || value === null) return [];
  return validateTagArray(value);
}

export function parseStoredBuddyGroupTags(value: unknown): BuddyGroupTag[] {
  if (typeof value === "string") {
    try {
      return validateTagArray(JSON.parse(value)) || [];
    } catch {
      return [];
    }
  }
  return validateTagArray(value) || [];
}

export function buddyGroupTagLabel(value: BuddyGroupTag): string {
  return labels.get(value) || value;
}
