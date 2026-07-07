import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { queryOne, run } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { trip_id, reviewee_id, rating, comment } = await request.json();

    if (!trip_id || !reviewee_id || !rating) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be 1–5' }, { status: 400 });
    }
    if (comment && (typeof comment !== 'string' || comment.length > 2000)) {
      return NextResponse.json({ error: 'Review comment is too long' }, { status: 400 });
    }
    const limit = await rateLimit(`review:${user.id}`, 20, 24 * 60 * 60 * 1000);
    if (!limit.allowed) return NextResponse.json({ error: 'Review rate limit reached' }, { status: 429 });
    if (user.id === reviewee_id) {
      return NextResponse.json({ error: 'Cannot review yourself' }, { status: 400 });
    }
    const tripTiming = await queryOne<{ start_date: string | null }>('SELECT start_date FROM trips WHERE id = $1', [trip_id]);
    if (!tripTiming || !tripTiming.start_date || new Date(tripTiming.start_date) >= new Date()) {
      return NextResponse.json({ error: 'Reviews can only be submitted after the trip has started' }, { status: 400 });
    }

    // Verify reviewer was a participant — buddy trips use trip_participants,
    // premium trips use trip_bookings (approved + not cancelled)
    const isBuddyParticipant = await queryOne('SELECT 1 FROM trip_participants WHERE trip_id = $1 AND user_id = $2', [trip_id, user.id]);
    const isPremiumParticipant = await queryOne("SELECT 1 FROM trip_bookings WHERE trip_id = $1 AND user_id = $2 AND status = 'approved' AND cancelled_at IS NULL", [trip_id, user.id]);
    const isOrganizer = await queryOne('SELECT 1 FROM trips WHERE id = $1 AND organizer_id = $2', [trip_id, user.id]);

    if (!isBuddyParticipant && !isPremiumParticipant && !isOrganizer) {
      return NextResponse.json({ error: 'You were not a participant in this trip' }, { status: 403 });
    }

    // Verify reviewee was also part of the trip
    const revieweeParticipant = await queryOne('SELECT 1 FROM trip_participants WHERE trip_id = $1 AND user_id = $2', [trip_id, reviewee_id]);
    const revieweePremiumParticipant = await queryOne("SELECT 1 FROM trip_bookings WHERE trip_id = $1 AND user_id = $2 AND status = 'approved' AND cancelled_at IS NULL", [trip_id, reviewee_id]);
    const revieweeOrganizer = await queryOne('SELECT 1 FROM trips WHERE id = $1 AND organizer_id = $2', [trip_id, reviewee_id]);

    if (!revieweeParticipant && !revieweePremiumParticipant && !revieweeOrganizer) {
      return NextResponse.json({ error: 'Reviewee was not part of this trip' }, { status: 400 });
    }

    // Upsert: one review per reviewer per trip
    const existing = await queryOne('SELECT id FROM trip_reviews WHERE reviewer_id = $1 AND reviewee_id = $2 AND trip_id = $3', [user.id, reviewee_id, trip_id]);

    if (existing) {
      await run('UPDATE trip_reviews SET rating = $1, comment = $2 WHERE reviewer_id = $3 AND reviewee_id = $4 AND trip_id = $5', [rating, comment || null, user.id, reviewee_id, trip_id]);
    } else {
      await run('INSERT INTO trip_reviews (id, reviewer_id, reviewee_id, trip_id, rating, comment) VALUES ($1, $2, $3, $4, $5, $6)', [uuidv4(), user.id, reviewee_id, trip_id, rating, comment || null]);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Review submit error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
