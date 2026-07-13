import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { queryOne } from '@/lib/db';
import { ensureStoryCompetitionMaintenance, STORY_LIKE_POINT_VALUE } from '@/lib/storyCompetition';

type ProfileRow = {
  id: string;
  full_name: string;
  role: string;
  age: number | null;
  gender: string | null;
  bio: string | null;
  profession: string | null;
  fooding_habit: string | null;
  avatar_url: string | null;
  created_at: string;
  credit_points: string | number;
  traveler_rank: string | number | null;
  story_count: string | number;
  total_likes: string | number;
  username: string;
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const competitionState = await ensureStoryCompetitionMaintenance();
    const competition = competitionState.window;

    const profile = await queryOne<ProfileRow>(`
      WITH event_scores AS (
        SELECT s.user_id, COUNT(sl.id)::int AS total_likes,
               COUNT(DISTINCT s.id)::int AS story_count,
               MIN(s.created_at) AS first_post_at
        FROM travel_stories s
        LEFT JOIN story_likes sl ON sl.story_id = s.id AND sl.user_id <> s.user_id AND sl.created_at < $3
        WHERE s.created_at >= $2 AND s.created_at < $3
        GROUP BY s.user_id
      ), ranked_users AS (
        SELECT user_id, total_likes, story_count,
               (total_likes * ${STORY_LIKE_POINT_VALUE})::numeric AS event_points,
               ROW_NUMBER() OVER (
                 ORDER BY total_likes DESC, story_count DESC, first_post_at ASC, user_id ASC
               ) AS traveler_rank
        FROM event_scores
      )
      SELECT u.id, u.full_name, u.role, u.age, u.gender, u.bio, u.profession, u.fooding_habit, u.avatar_url, u.created_at,
             COALESCE(r.event_points, 0) AS credit_points,
             r.traveler_rank,
             COALESCE(r.story_count, 0) AS story_count,
             COALESCE(r.total_likes, 0) AS total_likes,
             LOWER(REGEXP_REPLACE(u.full_name, '[^a-zA-Z0-9]+', '', 'g')) || '-' || LEFT(u.id, 6) AS username
      FROM users u
      LEFT JOIN ranked_users r ON r.user_id = u.id
      WHERE u.id = $1
    `, [id, competition.startsAt.toISOString(), competition.scoringEndsAt.toISOString()]);

    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (err) {
    console.error("Failed to fetch user profile:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
