import { query, queryOne } from "@/lib/db";
import { computeMatch, type BudgetProfile, type CompatibilityProfile } from "@/lib/matchEngine";
import type { SessionUser } from "@/lib/auth";
import { AsyncTtlCache } from "@/lib/asyncTtlCache";
import { parseStoredBuddyGroupTags } from "@/lib/buddyGroupTags";

type UserCompatibilityRow = CompatibilityProfile & {
  budget_min: number | string | null;
  budget_max: number | string | null;
};

type BuddyTripRow = {
  id: string;
  title: string;
  description: string;
  destination: string;
  starting_location: string;
  trip_date: string;
  duration_days: number;
  duration_nights: number;
  traveller_type: "solo" | "couple" | "group";
  tags: string | string[] | null;
  image_url: string | null;
  organizer_id: string;
  organizer_name: string;
  organizer_gender: string | null;
  organizer_fooding_habit: string | null;
  organizer_profession: string | null;
  organizer_age: number | null;
  organizer_avatar: string | null;
  user_request_status: string | null;
  removal_reason: string | null;
  registration_closed: number | string | null;
  accepted_count: number | string | null;
};

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value !== "string" || !value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

const anonymousBuddyFeedCache = new AsyncTtlCache<string, Awaited<ReturnType<typeof loadBuddyFeedUncached>>>(10_000, 1);

async function loadBuddyFeedUncached(user: SessionUser | null, mode: 'discover' | 'interests' = 'discover') {
  const userId = user?.id || "";
  let userProfile: UserCompatibilityRow | null = null;
  let userBudget: BudgetProfile | null = null;

  const compatibilityPromise = user
    ? queryOne<UserCompatibilityRow>(
        `SELECT cp.food_preference, cp.travel_style, cp.activity_preferences, cp.energy_level,
                cp.social_personality, cp.cleanliness_preference, cp.drinking_preference,
                cp.smoking_preference, cp.languages, cp.trip_behavior, cp.ideal_trip_type,
                tb.budget_min, tb.budget_max
         FROM compatibility_profiles cp
         LEFT JOIN trip_budgets tb ON tb.user_id = cp.user_id
         WHERE cp.user_id = $1`,
        [user.id],
      )
    : Promise.resolve(null);

  const tripsPromise = query<BuddyTripRow>(`
    SELECT
      t.id, t.title, t.description, t.starting_location, t.destination, t.start_date as trip_date,
      t.duration_days, t.duration_nights, t.image_url, t.tags, COALESCE(t.traveller_type, 'solo') as traveller_type,
      t.status, t.registration_closed, t.created_at,
      u.id as organizer_id, u.full_name as organizer_name, u.gender as organizer_gender,
      u.fooding_habit as organizer_fooding_habit, u.profession as organizer_profession,
      u.age as organizer_age, u.avatar_url as organizer_avatar,
      CASE WHEN current_request.removed_at IS NOT NULL THEN 'removed' ELSE current_request.status END as user_request_status,
      current_request.removal_reason,
      (SELECT COUNT(*)::int FROM trip_requests WHERE trip_id = t.id AND status = 'accepted') as accepted_count
    FROM trips t
    JOIN users u ON t.organizer_id = u.id
    LEFT JOIN trip_requests current_request ON current_request.trip_id = t.id AND current_request.requester_id = $1
    WHERE t.trip_type = 'buddy' AND t.status <> 'deleted' AND t.deleted_at IS NULL
      AND (($2::boolean AND (current_request.status IN ('pending', 'accepted') OR current_request.removed_at IS NOT NULL))
        OR (NOT $2::boolean AND current_request.removed_at IS NULL AND t.status = 'live' AND COALESCE(current_request.status, '') NOT IN ('pending', 'accepted')))
      AND ($2::boolean OR
        NULLIF(t.start_date, '') IS NULL
        OR (NULLIF(t.start_date, '')::date + INTERVAL '1 day') > (NOW() AT TIME ZONE 'Asia/Kolkata')
      )
    ORDER BY
      CASE WHEN $2::boolean THEN CASE
        WHEN NULLIF(t.start_date, '') IS NULL OR NULLIF(t.start_date, '')::date >= (NOW() AT TIME ZONE 'Asia/Kolkata')::date THEN 0
        ELSE 1 END ELSE 0 END,
      CASE WHEN $2::boolean AND current_request.status = 'accepted' THEN 0 WHEN $2::boolean THEN 1 ELSE 0 END,
      CASE WHEN $2::boolean THEN current_request.created_at END DESC NULLS LAST,
      t.created_at DESC
    LIMIT $3
  `, [userId || "none", mode === 'interests', mode === 'interests' ? null : 100]);

  const [compatibility, allTrips] = await Promise.all([compatibilityPromise, tripsPromise]);
  userProfile = compatibility;
  if (userProfile?.budget_min != null && userProfile.budget_max != null) {
    userBudget = { budget_min: Number(userProfile.budget_min), budget_max: Number(userProfile.budget_max) };
  }

  const organizerIds = [...new Set(allTrips.map((trip) => trip.organizer_id).filter(Boolean))];
  const profileRows = organizerIds.length
    ? await query<(CompatibilityProfile & BudgetProfile & { user_id: string })>(`
        SELECT cp.user_id, cp.food_preference, cp.travel_style, cp.activity_preferences, cp.energy_level,
               cp.social_personality, cp.cleanliness_preference, cp.drinking_preference,
               cp.smoking_preference, cp.languages, cp.trip_behavior, cp.ideal_trip_type,
               cp.created_at, cp.updated_at, tb.budget_min, tb.budget_max
        FROM compatibility_profiles cp
        LEFT JOIN trip_budgets tb ON tb.user_id = cp.user_id
        WHERE cp.user_id = ANY($1::text[])
      `, [organizerIds])
    : [];
  const profileMap = new Map(profileRows.map((profile) => [profile.user_id, profile]));

  const trips = allTrips.map((trip) => {
    const organizerProfile = profileMap.get(trip.organizer_id);
    let match_score = 0;
    let match_breakdown: ReturnType<typeof computeMatch>["breakdown"] = [];
    let common_activities: string[] = [];
    let common_languages: string[] = [];

    if (userProfile && organizerProfile && trip.organizer_id !== userId) {
      const organizerBudget = organizerProfile.budget_min != null && organizerProfile.budget_max != null
        ? { budget_min: Number(organizerProfile.budget_min), budget_max: Number(organizerProfile.budget_max) }
        : null;
      const result = computeMatch(userProfile, organizerProfile, userBudget, organizerBudget);
      match_score = result.score;
      match_breakdown = result.breakdown;
      common_activities = result.commonActivities;
      common_languages = result.commonLanguages;
    }

    return {
      ...trip,
      registration_closed: Number(trip.registration_closed ?? 0),
      accepted_count: Number(trip.accepted_count ?? 0),
      match_score,
      match_breakdown,
      common_activities,
      common_languages,
      organizer_travel_style: organizerProfile?.travel_style || null,
      organizer_food_pref: organizerProfile?.food_preference || trip.organizer_fooding_habit || null,
      organizer_languages: parseStringArray(organizerProfile?.languages),
      organizer_energy: organizerProfile?.energy_level || null,
      organizer_social: organizerProfile?.social_personality || null,
      group_tags: trip.traveller_type === "group" ? parseStoredBuddyGroupTags(trip.tags) : [],
    };
  });

  if (userProfile && mode === 'discover') trips.sort((a, b) => b.match_score - a.match_score);

  return {
    trips,
    currentUserId: userId,
    hasCompatibilityProfile: Boolean(userProfile),
    compatibilityProfile: userProfile,
    budget: userBudget,
  };
}

export function invalidateBuddyFeedCache(): void {
  anonymousBuddyFeedCache.clear();
}

export async function loadBuddyFeed(user: SessionUser | null, mode: 'discover' | 'interests' = 'discover') {
  if (user) return loadBuddyFeedUncached(user, mode);
  return anonymousBuddyFeedCache.get("anonymous", () => loadBuddyFeedUncached(null));
}
