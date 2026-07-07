// ─── Buddy Match Engine ──────────────────────────────────────────────
// Pure-function module: takes two user profiles → returns score + breakdown.
// All weights are configurable constants at the top.

// ─── Weight Constants (must sum to 1.0) ──────────────────────────────
export const WEIGHTS: Record<string, number> = {
  travel_style: 0.20,
  activity_preferences: 0.20,
  budget: 0.15,
  food_preference: 0.10,
  social_personality: 0.10,
  energy_level: 0.10,
  trip_behavior: 0.05,
  ideal_trip_type: 0.05,
  smoking_preference: 0.025,
  drinking_preference: 0.025,
};

const LANGUAGE_BONUS_PER_MATCH = 3; // pts per shared language
const LANGUAGE_BONUS_CAP = 15;

// ─── Types ───────────────────────────────────────────────────────────
export interface CompatibilityProfile {
  food_preference: string;
  travel_style: string;
  activity_preferences: string; // JSON array string
  energy_level: string;
  social_personality: string;
  cleanliness_preference: number;
  drinking_preference: string;
  smoking_preference: string;
  languages: string; // JSON array string
  trip_behavior: string;
  ideal_trip_type: string;
}

export interface BudgetProfile {
  budget_min: number;
  budget_max: number;
}

export interface BreakdownItem {
  dimension: string;
  label: string;
  userAValue: string;
  userBValue: string;
  score: number;       // raw 0-100 for this dimension
  weight: number;
  contribution: number; // score * weight
  isMatch: boolean;     // score >= 70
}

export interface MatchResult {
  score: number;
  breakdown: BreakdownItem[];
  commonActivities: string[];
  commonLanguages: string[];
  languageBonus: number;
  cleanlinessGap: number; // absolute diff (tiebreaker)
}

// ─── Ordered Scales ──────────────────────────────────────────────────
const TRAVEL_STYLE_ORDER = ['Luxury', 'Comfort', 'Budget', 'Backpacker'];
const SOCIAL_ORDER = ['Introvert', 'Ambivert', 'Extrovert'];
const ENERGY_ORDER = ['Early Bird', 'Flexible', 'Night Owl'];
const TRIP_BEHAVIOR_ORDER = [
  'Follow schedule strictly',
  'Mostly follow schedule',
  'Flexible',
  'Completely spontaneous',
];
const SMOKING_ORDER = ['No', 'Occasionally', 'Regularly'];
const DRINKING_ORDER = ['Never', 'Occasionally', 'Socially', 'Frequently'];

// ─── Scoring Helpers ─────────────────────────────────────────────────

function orderedScore(a: string, b: string, order: string[], scores: number[]): number {
  const idxA = order.indexOf(a);
  const idxB = order.indexOf(b);
  if (idxA === -1 || idxB === -1) return 50; // unknown → neutral
  const diff = Math.abs(idxA - idxB);
  return diff < scores.length ? scores[diff] : scores[scores.length - 1];
}

function scoreTravelStyle(a: string, b: string): number {
  return orderedScore(a, b, TRAVEL_STYLE_ORDER, [100, 70, 30, 0]);
}

function scoreSocialPersonality(a: string, b: string): number {
  return orderedScore(a, b, SOCIAL_ORDER, [100, 60, 20]);
}

function scoreEnergyLevel(a: string, b: string): number {
  return orderedScore(a, b, ENERGY_ORDER, [100, 60, 20]);
}

function scoreTripBehavior(a: string, b: string): number {
  return orderedScore(a, b, TRIP_BEHAVIOR_ORDER, [100, 70, 40, 20]);
}

function scoreSmoking(a: string, b: string): number {
  return orderedScore(a, b, SMOKING_ORDER, [100, 50, 10]);
}

function scoreDrinking(a: string, b: string): number {
  return orderedScore(a, b, DRINKING_ORDER, [100, 70, 40, 30]);
}

function scoreFoodPreference(a: string, b: string): number {
  if (a === b) return 100;
  // Partial similarity groups
  const vegGroup = new Set(['Veg', 'Jain', 'Vegan']);
  const nonVegGroup = new Set(['Non-Veg', 'Eggetarian']);
  if (vegGroup.has(a) && vegGroup.has(b)) return 60;
  if (nonVegGroup.has(a) && nonVegGroup.has(b)) return 60;
  return 20;
}

function scoreIdealTrip(a: string, b: string): number {
  if (a === b) return 100;
  if (a === 'Balanced' || b === 'Balanced') return 60;
  // Adventure Packed vs Relaxed
  return 20;
}

function parseJsonArray(val: string | string[]): string[] {
  if (Array.isArray(val)) return val;
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function scoreActivities(aRaw: string | string[], bRaw: string | string[]): { score: number; common: string[] } {
  const a = parseJsonArray(aRaw);
  const b = parseJsonArray(bRaw);
  if (a.length === 0 && b.length === 0) return { score: 100, common: [] };
  if (a.length === 0 || b.length === 0) return { score: 0, common: [] };

  const setA = new Set(a.map(s => s.toLowerCase()));
  const setB = new Set(b.map(s => s.toLowerCase()));
  const intersection = [...setA].filter(x => setB.has(x));
  const union = new Set([...setA, ...setB]);

  // Jaccard similarity
  const score = Math.round((intersection.length / union.size) * 100);

  // Return common activities with original casing from user A
  const common = a.filter(item => setB.has(item.toLowerCase()));
  return { score, common };
}

function scoreBudget(a: BudgetProfile | null, b: BudgetProfile | null): number {
  if (!a || !b) return 50; // No budget set → neutral
  const overlapStart = Math.max(a.budget_min, b.budget_min);
  const overlapEnd = Math.min(a.budget_max, b.budget_max);
  if (overlapStart > overlapEnd) return 10; // No overlap but not zero (avoid harsh penalty)

  const overlapLength = overlapEnd - overlapStart;
  const maxSpan = Math.max(a.budget_max, b.budget_max) - Math.min(a.budget_min, b.budget_min);
  if (maxSpan === 0) return 100;
  return Math.round((overlapLength / maxSpan) * 100);
}

function scoreLanguages(aRaw: string | string[], bRaw: string | string[]): { bonus: number; common: string[] } {
  const a = parseJsonArray(aRaw);
  const b = parseJsonArray(bRaw);
  const setB = new Set(b.map(s => s.toLowerCase()));
  const common = a.filter(item => setB.has(item.toLowerCase()));
  const bonus = Math.min(common.length * LANGUAGE_BONUS_PER_MATCH, LANGUAGE_BONUS_CAP);
  return { bonus, common };
}

// ─── Main Matching Function ──────────────────────────────────────────

export function computeMatch(
  profileA: CompatibilityProfile,
  profileB: CompatibilityProfile,
  budgetA: BudgetProfile | null,
  budgetB: BudgetProfile | null,
): MatchResult {
  const breakdown: BreakdownItem[] = [];

  // Travel Style
  const tsScore = scoreTravelStyle(profileA.travel_style, profileB.travel_style);
  breakdown.push({
    dimension: 'travel_style',
    label: 'Travel Style',
    userAValue: profileA.travel_style,
    userBValue: profileB.travel_style,
    score: tsScore,
    weight: WEIGHTS.travel_style,
    contribution: tsScore * WEIGHTS.travel_style,
    isMatch: tsScore >= 70,
  });

  // Activity Preferences
  const actResult = scoreActivities(profileA.activity_preferences, profileB.activity_preferences);
  breakdown.push({
    dimension: 'activity_preferences',
    label: 'Activity Interests',
    userAValue: parseJsonArray(profileA.activity_preferences).join(', '),
    userBValue: parseJsonArray(profileB.activity_preferences).join(', '),
    score: actResult.score,
    weight: WEIGHTS.activity_preferences,
    contribution: actResult.score * WEIGHTS.activity_preferences,
    isMatch: actResult.score >= 70,
  });

  // Budget
  const budgetScore = scoreBudget(budgetA, budgetB);
  breakdown.push({
    dimension: 'budget',
    label: 'Trip Budget',
    userAValue: budgetA ? `₹${budgetA.budget_min.toLocaleString('en-IN')} – ₹${budgetA.budget_max.toLocaleString('en-IN')}` : 'Not set',
    userBValue: budgetB ? `₹${budgetB.budget_min.toLocaleString('en-IN')} – ₹${budgetB.budget_max.toLocaleString('en-IN')}` : 'Not set',
    score: budgetScore,
    weight: WEIGHTS.budget,
    contribution: budgetScore * WEIGHTS.budget,
    isMatch: budgetScore >= 70,
  });

  // Food Preference
  const foodScore = scoreFoodPreference(profileA.food_preference, profileB.food_preference);
  breakdown.push({
    dimension: 'food_preference',
    label: 'Food Preference',
    userAValue: profileA.food_preference,
    userBValue: profileB.food_preference,
    score: foodScore,
    weight: WEIGHTS.food_preference,
    contribution: foodScore * WEIGHTS.food_preference,
    isMatch: foodScore >= 70,
  });

  // Social Personality
  const socialScore = scoreSocialPersonality(profileA.social_personality, profileB.social_personality);
  breakdown.push({
    dimension: 'social_personality',
    label: 'Social Personality',
    userAValue: profileA.social_personality,
    userBValue: profileB.social_personality,
    score: socialScore,
    weight: WEIGHTS.social_personality,
    contribution: socialScore * WEIGHTS.social_personality,
    isMatch: socialScore >= 70,
  });

  // Energy Level
  const energyScore = scoreEnergyLevel(profileA.energy_level, profileB.energy_level);
  breakdown.push({
    dimension: 'energy_level',
    label: 'Energy Level',
    userAValue: profileA.energy_level,
    userBValue: profileB.energy_level,
    score: energyScore,
    weight: WEIGHTS.energy_level,
    contribution: energyScore * WEIGHTS.energy_level,
    isMatch: energyScore >= 70,
  });

  // Trip Behavior
  const behaviorScore = scoreTripBehavior(profileA.trip_behavior, profileB.trip_behavior);
  breakdown.push({
    dimension: 'trip_behavior',
    label: 'Schedule Style',
    userAValue: profileA.trip_behavior,
    userBValue: profileB.trip_behavior,
    score: behaviorScore,
    weight: WEIGHTS.trip_behavior,
    contribution: behaviorScore * WEIGHTS.trip_behavior,
    isMatch: behaviorScore >= 70,
  });

  // Ideal Trip Type
  const idealScore = scoreIdealTrip(profileA.ideal_trip_type, profileB.ideal_trip_type);
  breakdown.push({
    dimension: 'ideal_trip_type',
    label: 'Ideal Trip Type',
    userAValue: profileA.ideal_trip_type,
    userBValue: profileB.ideal_trip_type,
    score: idealScore,
    weight: WEIGHTS.ideal_trip_type,
    contribution: idealScore * WEIGHTS.ideal_trip_type,
    isMatch: idealScore >= 70,
  });

  // Smoking
  const smokingScore = scoreSmoking(profileA.smoking_preference, profileB.smoking_preference);
  breakdown.push({
    dimension: 'smoking_preference',
    label: 'Smoking',
    userAValue: profileA.smoking_preference,
    userBValue: profileB.smoking_preference,
    score: smokingScore,
    weight: WEIGHTS.smoking_preference,
    contribution: smokingScore * WEIGHTS.smoking_preference,
    isMatch: smokingScore >= 70,
  });

  // Drinking
  const drinkingScore = scoreDrinking(profileA.drinking_preference, profileB.drinking_preference);
  breakdown.push({
    dimension: 'drinking_preference',
    label: 'Drinking',
    userAValue: profileA.drinking_preference,
    userBValue: profileB.drinking_preference,
    score: drinkingScore,
    weight: WEIGHTS.drinking_preference,
    contribution: drinkingScore * WEIGHTS.drinking_preference,
    isMatch: drinkingScore >= 70,
  });

  // Languages (bonus, not weighted)
  const langResult = scoreLanguages(profileA.languages, profileB.languages);

  // Cleanliness gap (tiebreaker, not scored)
  const cleanlinessGap = Math.abs(profileA.cleanliness_preference - profileB.cleanliness_preference);

  // Compute final score
  const weightedTotal = breakdown.reduce((sum, item) => sum + item.contribution, 0);
  const rawScore = Math.round(weightedTotal + langResult.bonus);
  const finalScore = Math.min(100, Math.max(0, rawScore));

  return {
    score: finalScore,
    breakdown,
    commonActivities: actResult.common,
    commonLanguages: langResult.common,
    languageBonus: langResult.bonus,
    cleanlinessGap,
  };
}
