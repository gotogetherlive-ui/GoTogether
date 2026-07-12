import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { queryOne, run } from '@/lib/db';

const VALID_FOOD = ['Any', 'Veg', 'Non-Veg', 'Vegan', 'Jain', 'Eggetarian'];
const VALID_TRAVEL_STYLE = ['Luxury', 'Comfort', 'Budget', 'Backpacker'];
const VALID_ENERGY = ['Early Bird', 'Flexible', 'Night Owl'];
const VALID_SOCIAL = ['Introvert', 'Ambivert', 'Extrovert'];
const VALID_DRINKING = ['Never', 'Occasionally', 'Socially', 'Frequently'];
const VALID_SMOKING = ['No', 'Occasionally', 'Regularly'];
const VALID_TRIP_BEHAVIOR = ['Follow schedule strictly', 'Mostly follow schedule', 'Flexible', 'Completely spontaneous'];
const VALID_IDEAL_TRIP = ['Adventure Packed', 'Relaxed', 'Balanced'];
const VALID_ACTIVITIES = ['Adventure', 'Trekking', 'Sightseeing', 'Photography', 'Wildlife', 'Party / Nightlife', 'Spiritual', 'Historical Places', 'Food Exploration', 'Relaxation'];
const VALID_LANGUAGES = ['English', 'Hindi', 'Bengali', 'Tamil', 'Telugu', 'Marathi', 'Punjabi', 'Gujarati', 'Kannada', 'Malayalam', 'Odia', 'Assamese', 'Urdu', 'Other'];

function validateProfile(body: any): string | null {
  if (!VALID_FOOD.includes(body.food_preference)) return 'Invalid food preference';
  if (!VALID_TRAVEL_STYLE.includes(body.travel_style)) return 'Invalid travel style';
  if (!VALID_ENERGY.includes(body.energy_level)) return 'Invalid energy level';
  if (!VALID_SOCIAL.includes(body.social_personality)) return 'Invalid social personality';
  if (!VALID_DRINKING.includes(body.drinking_preference)) return 'Invalid drinking preference';
  if (!VALID_SMOKING.includes(body.smoking_preference)) return 'Invalid smoking preference';
  if (!VALID_TRIP_BEHAVIOR.includes(body.trip_behavior)) return 'Invalid trip behavior';
  if (!VALID_IDEAL_TRIP.includes(body.ideal_trip_type)) return 'Invalid ideal trip type';

  if (typeof body.cleanliness_preference !== 'number' || body.cleanliness_preference < 1 || body.cleanliness_preference > 5) {
    return 'Cleanliness must be between 1 and 5';
  }

  // Activities — must be array, each item valid
  if (!Array.isArray(body.activity_preferences) || body.activity_preferences.length === 0) {
    return 'Select at least one activity';
  }
  for (const act of body.activity_preferences) {
    if (!VALID_ACTIVITIES.includes(act)) return `Invalid activity: ${act}`;
  }

  // Languages — must be array, each item valid
  if (!Array.isArray(body.languages) || body.languages.length === 0) {
    return 'Select at least one language';
  }
  for (const lang of body.languages) {
    if (!VALID_LANGUAGES.includes(lang)) return `Invalid language: ${lang}`;
  }

  return null;
}

// GET — check if profile exists, return it
export async function GET() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const profile = await queryOne('SELECT user_id, food_preference, travel_style, activity_preferences, energy_level, social_personality, cleanliness_preference, drinking_preference, smoking_preference, languages, trip_behavior, ideal_trip_type, created_at, updated_at FROM compatibility_profiles WHERE user_id = $1', [user.id]) as any;
    const budget = await queryOne('SELECT user_id, budget_min, budget_max, updated_at FROM trip_budgets WHERE user_id = $1', [user.id]) as any;

    return NextResponse.json({
      hasProfile: !!profile,
      profile: profile || null,
      budget: budget || null,
    });
  } catch (err) {
    console.error('Get compatibility profile error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST — create new compatibility profile (onboarding)
export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    // Check if profile already exists
    const existing = await queryOne('SELECT 1 FROM compatibility_profiles WHERE user_id = $1', [user.id]);
    if (existing) {
      return NextResponse.json({ error: 'Profile already exists. Use PUT to update.' }, { status: 409 });
    }

    const body = await request.json();
    const error = validateProfile(body);
    if (error) return NextResponse.json({ error }, { status: 400 });

    await run(`
      INSERT INTO compatibility_profiles (
        user_id, food_preference, travel_style, activity_preferences,
        energy_level, social_personality, cleanliness_preference,
        drinking_preference, smoking_preference, languages,
        trip_behavior, ideal_trip_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [user.id,
      body.food_preference,
      body.travel_style,
      JSON.stringify(body.activity_preferences),
      body.energy_level,
      body.social_personality,
      body.cleanliness_preference,
      body.drinking_preference,
      body.smoking_preference,
      JSON.stringify(body.languages),
      body.trip_behavior,
      body.ideal_trip_type,
    ]);

    // Also save budget if provided during onboarding
    if (body.budget_min && body.budget_max) {
      const min = parseInt(body.budget_min);
      const max = parseInt(body.budget_max);
      if (min > 0 && max > 0 && min <= max) {
        await run(`
          INSERT INTO trip_budgets (user_id, budget_min, budget_max, updated_at)
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT (user_id) DO UPDATE SET budget_min = EXCLUDED.budget_min, budget_max = EXCLUDED.budget_max, updated_at = EXCLUDED.updated_at
        `, [user.id, min, max]);
      }
    }

    const profile = await queryOne('SELECT user_id, food_preference, travel_style, activity_preferences, energy_level, social_personality, cleanliness_preference, drinking_preference, smoking_preference, languages, trip_behavior, ideal_trip_type, created_at, updated_at FROM compatibility_profiles WHERE user_id = $1', [user.id]);
    const budget = await queryOne('SELECT user_id, budget_min, budget_max, updated_at FROM trip_budgets WHERE user_id = $1', [user.id]);

    return NextResponse.json({ success: true, profile, budget }, { status: 201 });
  } catch (err) {
    console.error('Create compatibility profile error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT — update existing profile
export async function PUT(request: Request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const existing = await queryOne('SELECT 1 FROM compatibility_profiles WHERE user_id = $1', [user.id]);
    if (!existing) {
      return NextResponse.json({ error: 'No profile found. Use POST to create.' }, { status: 404 });
    }

    const body = await request.json();
    const error = validateProfile(body);
    if (error) return NextResponse.json({ error }, { status: 400 });

    await run(`
      UPDATE compatibility_profiles SET
        food_preference = $1,
        travel_style = $2,
        activity_preferences = $3,
        energy_level = $4,
        social_personality = $5,
        cleanliness_preference = $6,
        drinking_preference = $7,
        smoking_preference = $8,
        languages = $9,
        trip_behavior = $10,
        ideal_trip_type = $11,
        updated_at = NOW()
      WHERE user_id = $12
    `, [body.food_preference,
      body.travel_style,
      JSON.stringify(body.activity_preferences),
      body.energy_level,
      body.social_personality,
      body.cleanliness_preference,
      body.drinking_preference,
      body.smoking_preference,
      JSON.stringify(body.languages),
      body.trip_behavior,
      body.ideal_trip_type,
      user.id,
    ]);

    const profile = await queryOne('SELECT user_id, food_preference, travel_style, activity_preferences, energy_level, social_personality, cleanliness_preference, drinking_preference, smoking_preference, languages, trip_behavior, ideal_trip_type, created_at, updated_at FROM compatibility_profiles WHERE user_id = $1', [user.id]);
    return NextResponse.json({ success: true, profile });
  } catch (err) {
    console.error('Update compatibility profile error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
