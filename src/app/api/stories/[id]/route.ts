import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin";
import { queryOne, run } from '@/lib/db';
import { notifyStories } from '@/lib/notificationEvents';
import { ensureStoryCompetitionMaintenance, STORY_LIKE_POINT_VALUE } from '@/lib/storyCompetition';

type StoryDetailRow = {
  id: string;
  user_id: string;
  content: string;
  images: string | string[] | null;
  location: string | null;
  trip_id: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  author_name: string;
  author_avatar: string | null;
  author_role: string;
  author_credit_points: string | number;
  author_rank: string | number | null;
  trip_title: string | null;
  trip_destination: string | null;
  is_liked: number | boolean | null;
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const competition = (await ensureStoryCompetitionMaintenance()).window;

    const story = await queryOne<StoryDetailRow>(`
      WITH event_scores AS (
        SELECT s.user_id, COUNT(sl.id)::int AS total_likes,
               COUNT(DISTINCT s.id)::int AS story_count,
               MIN(s.created_at) AS first_post_at
        FROM travel_stories s
        LEFT JOIN story_likes sl ON sl.story_id = s.id AND sl.user_id <> s.user_id AND sl.created_at < $4
        WHERE s.created_at >= $3 AND s.created_at < $4
        GROUP BY s.user_id
      ), ranked_users AS (
        SELECT user_id, (total_likes * ${STORY_LIKE_POINT_VALUE})::numeric AS event_points,
               ROW_NUMBER() OVER (
                 ORDER BY total_likes DESC, story_count DESC, first_post_at ASC, user_id ASC
               ) AS traveler_rank
        FROM event_scores
      )
      SELECT s.id, s.user_id, s.content, s.images, s.location, s.trip_id, s.likes_count, s.comments_count, s.created_at, 
             u.full_name as author_name, 
             u.avatar_url as author_avatar,
             u.role as author_role,
             COALESCE(ru.event_points, 0) as author_credit_points,
             ru.traveler_rank as author_rank,
             t.title as trip_title,
             t.destination as trip_destination,
             (SELECT 1 FROM story_likes WHERE story_id = s.id AND user_id = $1) as is_liked
      FROM travel_stories s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN ranked_users ru ON ru.user_id = s.user_id
      LEFT JOIN trips t ON s.trip_id = t.id
      WHERE s.id = $2
    `, [user.id, id, competition.startsAt.toISOString(), competition.scoringEndsAt.toISOString()]);

    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    try {
      story.images = JSON.parse(typeof story.images === 'string' ? story.images : '[]');
    } catch {
      story.images = [];
    }
    story.is_liked = !!story.is_liked;

    return NextResponse.json({ story });
  } catch (err) {
    console.error("Failed to fetch story details:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const story = await queryOne<{ user_id: string }>(`
      SELECT user_id FROM travel_stories WHERE id = $1
    `, [id]);

    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    const isAuthor = story.user_id === user.id;
    const isAdmin = await isAdminUser(user);

    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ error: "You are not authorized to delete this story" }, { status: 403 });
    }

    await run(`DELETE FROM travel_stories WHERE id = $1`, [id]);
    await notifyStories('deleted', id);

    return NextResponse.json({ success: true, message: "Story deleted successfully" });
  } catch (err) {
    console.error("Failed to delete story:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
