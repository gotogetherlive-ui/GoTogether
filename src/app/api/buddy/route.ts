import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query, queryOne, run } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { computeMatch, type CompatibilityProfile, type BudgetProfile } from '@/lib/matchEngine';
import { hasCompleteProfile } from '@/lib/profile';

export async function GET() {
  try {
    const user = await getSession();
    const userId = user?.id || '';

    let hasCompatibilityProfile = false;
    let userProfile: CompatibilityProfile | null = null;
    let userBudget: BudgetProfile | null = null;

    if (user) {
      userProfile = await queryOne<CompatibilityProfile>(
        'SELECT user_id, food_preference, travel_style, activity_preferences, energy_level, social_personality, cleanliness_preference, drinking_preference, smoking_preference, languages, trip_behavior, ideal_trip_type, created_at, updated_at FROM compatibility_profiles WHERE user_id = $1',
        [user.id]
      );
      hasCompatibilityProfile = !!userProfile;
      userBudget = await queryOne<BudgetProfile>(
        'SELECT budget_min, budget_max FROM trip_budgets WHERE user_id = $1',
        [user.id]
      );
    }

    const allTrips = await query(`
      SELECT
        t.id, t.title, t.description, t.starting_location, t.destination, t.start_date as trip_date,
        t.duration_days, t.duration_nights, t.image_url, t.status, t.registration_closed, t.created_at,
        u.id as organizer_id, u.full_name as organizer_name, u.gender as organizer_gender,
        u.fooding_habit as organizer_fooding_habit, u.profession as organizer_profession,
        u.age as organizer_age, u.avatar_url as organizer_avatar,
        (SELECT status FROM trip_requests WHERE trip_id = t.id AND requester_id = $1) as user_request_status,
        (SELECT COUNT(*)::int FROM trip_requests WHERE trip_id = t.id AND status = 'accepted') as accepted_count
      FROM trips t
      JOIN users u ON t.organizer_id = u.id
      WHERE t.status = 'live' AND t.trip_type = 'buddy'
        AND (
          NULLIF(t.start_date, '') IS NULL
          OR (NULLIF(t.start_date, '')::date + INTERVAL '1 day') > (NOW() AT TIME ZONE 'Asia/Kolkata')
        )
      ORDER BY t.created_at DESC
      LIMIT 100
    `, [userId || 'none']) as any[];

    const organizerIds = [...new Set(allTrips.map((trip) => trip.organizer_id).filter(Boolean))];
    const profileRows = organizerIds.length
      ? await query<(CompatibilityProfile & BudgetProfile & { user_id: string })>(`
          SELECT cp.user_id, cp.food_preference, cp.travel_style, cp.activity_preferences, cp.energy_level, cp.social_personality, cp.cleanliness_preference, cp.drinking_preference, cp.smoking_preference, cp.languages, cp.trip_behavior, cp.ideal_trip_type, cp.created_at, cp.updated_at, tb.budget_min, tb.budget_max
          FROM compatibility_profiles cp
          LEFT JOIN trip_budgets tb ON tb.user_id = cp.user_id
          WHERE cp.user_id = ANY($1::text[])
        `, [organizerIds])
      : [];

    const profileMap = new Map(profileRows.map((profile) => [profile.user_id, profile]));

    const trips = allTrips.map((trip) => {
      const organizerProfile = profileMap.get(trip.organizer_id);
      let match_score = 0;
      let match_breakdown: ReturnType<typeof computeMatch>['breakdown'] = [];
      let common_activities: string[] = [];
      let common_languages: string[] = [];

      if (userProfile && organizerProfile && trip.organizer_id !== userId) {
        const organizerBudget = organizerProfile.budget_min && organizerProfile.budget_max
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
        organizer_languages: organizerProfile?.languages || null,
        organizer_energy: organizerProfile?.energy_level || null,
        organizer_social: organizerProfile?.social_personality || null,
      };
    });

    if (userProfile) {
      trips.sort((a, b) => b.match_score - a.match_score);
    }

    return NextResponse.json({ trips, currentUserId: userId, hasCompatibilityProfile });
  } catch (err) {
    console.error('Fetch buddy trips error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (!hasCompleteProfile(user)) {
      return NextResponse.json({ error: 'Complete your profile before creating a buddy trip.' }, { status: 403 });
    }

    const body = await request.json();
    const { starting_location, destination, trip_date, duration_days, duration_nights, image_url } = body;

    if (!starting_location || !destination || !trip_date || !duration_days) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if ([starting_location, destination, image_url || ''].some((value) => typeof value !== 'string' || value.length > 500)) {
      return NextResponse.json({ error: 'Invalid or oversized trip details' }, { status: 400 });
    }

    const tripId = uuidv4();
    const title = `Trip to ${destination}`;
    const description = `Looking for a buddy to travel to ${destination} for ${duration_days} days and ${duration_nights || 0} nights.`;

    await run(`
      INSERT INTO trips (id, organizer_id, title, description, starting_location, destination, start_date, duration_days, duration_nights, image_url, status, trip_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'live', 'buddy')
    `, [tripId,
      user.id,
      title,
      description,
      starting_location,
      destination,
      trip_date,
      parseInt(duration_days),
      parseInt(duration_nights || '0'),
      image_url || null]);

    return NextResponse.json({ success: true, tripId }, { status: 201 });
  } catch (err) {
    console.error('Create buddy trip error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

