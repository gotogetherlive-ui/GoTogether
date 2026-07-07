import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const user = await getSession();
    const { tripId } = await params;

    const reviews = await query(`
      SELECT r.id, r.rating, r.comment, r.created_at,
             reviewer.full_name as reviewer_name, reviewer.avatar_url as reviewer_avatar,
             reviewee.full_name as reviewee_name, reviewee.id as reviewee_id,
             CASE WHEN r.reviewer_id = $1 THEN 1 ELSE 0 END as is_mine
      FROM trip_reviews r
      JOIN users reviewer ON r.reviewer_id = reviewer.id
      JOIN users reviewee ON r.reviewee_id = reviewee.id
      WHERE r.trip_id = $2
      ORDER BY r.created_at DESC
    `, [user?.id || '', tripId]);

    const avgRating = reviews.length
      ? (reviews as any[]).reduce((s, r) => s + r.rating, 0) / reviews.length
      : null;

    return NextResponse.json({ reviews, avgRating });
  } catch (err) {
    console.error('Fetch reviews error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
