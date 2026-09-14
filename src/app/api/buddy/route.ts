import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { queryOne, run } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { hasCompleteProfile } from '@/lib/profile';
import { invalidateBuddyFeedCache, loadBuddyFeed } from '@/lib/buddyFeed';
import { isValidBuddyDuration } from '@/lib/buddyDuration';
import { parseBuddyGroupTagInput } from '@/lib/buddyGroupTags';

export async function GET(request: Request) {
  try {
    const user = await getSession();
    const mode = new URL(request.url).searchParams.get('view') === 'interests' ? 'interests' : 'discover';
    if (mode === 'interests' && !user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
    return NextResponse.json(await loadBuddyFeed(user, mode), { headers: { 'Cache-Control': 'private, no-store' } });
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

    const compatibilityProfile = await queryOne('SELECT 1 FROM compatibility_profiles WHERE user_id = $1', [user.id]);
    if (!compatibilityProfile) {
      return NextResponse.json({ error: 'Complete your Travel DNA before creating a buddy trip.' }, { status: 403 });
    }

    const body = await request.json();
    const { starting_location, destination, trip_date, duration_days, duration_nights, image_url, traveller_type, group_tags } = body;

    if (typeof starting_location !== 'string' || typeof destination !== 'string' || typeof trip_date !== 'string') {
      return NextResponse.json({ error: 'Starting location, destination, and trip date are required.' }, { status: 400 });
    }
    const normalizedStartingLocation = starting_location.trim();
    const normalizedDestination = destination.trim();
    const normalizedTripDate = trip_date.trim();
    const parsedDurationDays = Number(duration_days);
    const parsedDurationNights = Number(duration_nights);
    if (!normalizedStartingLocation || !normalizedDestination || normalizedStartingLocation.length > 200 || normalizedDestination.length > 200) {
      return NextResponse.json({ error: 'Use valid locations of 200 characters or fewer.' }, { status: 400 });
    }
    if (!isValidBuddyDuration(parsedDurationDays, parsedDurationNights)) {
      return NextResponse.json({ error: 'Nights must be one fewer or one more than days, and cannot be zero.' }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedTripDate)) {
      return NextResponse.json({ error: 'Use a valid trip date.' }, { status: 400 });
    }
    const parsedTripDate = new Date(`${normalizedTripDate}T00:00:00.000Z`);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (Number.isNaN(parsedTripDate.getTime()) || parsedTripDate < today) {
      return NextResponse.json({ error: 'Trip date must be today or in the future.' }, { status: 400 });
    }
    if (image_url !== undefined && image_url !== null && image_url !== '' &&
        (typeof image_url !== 'string' || image_url.length > 2000 || !/^https:\/\//i.test(image_url))) {
      return NextResponse.json({ error: 'Use a valid uploaded trip image.' }, { status: 400 });
    }
    if (traveller_type !== 'solo' && traveller_type !== 'couple' && traveller_type !== 'group') {
      return NextResponse.json({ error: 'Choose solo, couple, or group travel.' }, { status: 400 });
    }
    const parsedGroupTags = parseBuddyGroupTagInput(group_tags);
    if (parsedGroupTags === null) {
      return NextResponse.json({ error: 'Choose up to five valid group interests.' }, { status: 400 });
    }

    const tripId = uuidv4();
    const title = `Trip to ${normalizedDestination}`;
    const description = `Looking for a buddy to travel to ${normalizedDestination} for ${parsedDurationDays} days and ${parsedDurationNights} nights.`;

    await run(`
      INSERT INTO trips (id, organizer_id, title, description, starting_location, destination, start_date, duration_days, duration_nights, image_url, traveller_type, tags, status, trip_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'live', 'buddy')
    `, [tripId,
      user.id,
      title,
      description,
      normalizedStartingLocation,
      normalizedDestination,
      normalizedTripDate,
      parsedDurationDays,
      parsedDurationNights,
      image_url || null,
      traveller_type,
      JSON.stringify(traveller_type === 'group' ? parsedGroupTags : [])]);
    invalidateBuddyFeedCache();

    return NextResponse.json({ success: true, tripId }, { status: 201 });
  } catch (err) {
    console.error('Create buddy trip error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

