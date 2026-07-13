import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAppSettings } from "@/lib/settings";
import { isAdminUser } from "@/lib/admin";
import { queryOne, run, transaction } from '@/lib/db';
import { notifyStories } from '@/lib/notificationEvents';
import { v4 as uuidv4 } from "uuid";
import { rateLimit } from '@/lib/rateLimit';
import { ensureStoryCompetitionMaintenance, STORY_LIKE_POINT_VALUE } from '@/lib/storyCompetition';

type ProfileFields = {
  full_name?: string | null;
  phone_number?: string | null;
  age?: number | null;
  gender?: string | null;
  profession?: string | null;
  fooding_habit?: string | null;
};

function isProfileComplete(user: ProfileFields): boolean {
  return !!(
    user.full_name?.trim() &&
    user.phone_number?.trim() &&
    user.age &&
    user.gender &&
    user.profession &&
    user.fooding_habit
  );
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await getAppSettings();
    const isAdmin = await isAdminUser(user);
    const competitionState = await ensureStoryCompetitionMaintenance();
    const competition = competitionState.window;

    if (settings.stories_blocked && !isAdmin) {
      return NextResponse.json({ error: "Interactions are temporarily disabled." }, { status: 403 });
    }

    if (competition.phase !== 'active') {
      return NextResponse.json({ error: 'Scoring is closed while the event winner is featured.' }, { status: 403 });
    }

    if (!isAdmin && !isProfileComplete(user)) {
      return NextResponse.json({ error: "Please complete your profile in the Dashboard to like stories." }, { status: 403 });
    }
    const limit = await rateLimit(`story:like:${user.id}`, 120, 60 * 60 * 1000);
    if (!limit.allowed) return NextResponse.json({ error: 'Like rate limit reached' }, { status: 429 });


    const { id } = await params;

    // Verify story exists
    const story = await queryOne<{ id: string; user_id: string }>(`
      SELECT id, user_id FROM travel_stories
      WHERE id = $1 AND created_at >= $2 AND created_at < $3
    `, [id, competition.startsAt.toISOString(), competition.scoringEndsAt.toISOString()]);
    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    if (story.user_id === user.id) {
      return NextResponse.json({ error: 'You cannot score your own competition post.' }, { status: 403 });
    }


    let isLiked = false;
    let newLikesCount = 0;

    // Execute like/unlike in a transaction to keep counts synced
    await transaction(async () => {
      const lockedStory = await queryOne(`
        SELECT id FROM travel_stories WHERE id = $1 FOR UPDATE
      `, [id]);
      if (!lockedStory) throw new Error('STORY_NOT_FOUND');

      const existingLike = await queryOne("SELECT id FROM story_likes WHERE story_id = $1 AND user_id = $2", [id, user.id]);

      if (existingLike) {
        await run("DELETE FROM story_likes WHERE story_id = $1 AND user_id = $2", [id, user.id]);
        await run("UPDATE travel_stories SET likes_count = GREATEST(0, likes_count - 1) WHERE id = $1", [id]);
        isLiked = false;
      } else {
        await run("INSERT INTO story_likes (id, story_id, user_id) VALUES ($1, $2, $3)", [uuidv4(), id, user.id]);
        await run("UPDATE travel_stories SET likes_count = likes_count + 1 WHERE id = $1", [id]);
        isLiked = true;
      }

      const updatedStory = await queryOne<{ likes_count: number }>("SELECT likes_count FROM travel_stories WHERE id = $1", [id]);
      newLikesCount = updatedStory?.likes_count || 0;
    });

    await notifyStories('liked', id);

    const authorScore = await queryOne<{ total_likes: string | number; score: string | number }>(`
      SELECT COUNT(sl.id)::int AS total_likes,
             (COUNT(sl.id) * $4::numeric) AS score
      FROM travel_stories s
      LEFT JOIN story_likes sl ON sl.story_id = s.id AND sl.user_id <> s.user_id AND sl.created_at < $3
      WHERE s.user_id = $1 AND s.created_at >= $2 AND s.created_at < $3
    `, [story.user_id, competition.startsAt.toISOString(), competition.scoringEndsAt.toISOString(), STORY_LIKE_POINT_VALUE]);

    return NextResponse.json({
      success: true,
      liked: isLiked,
      likesCount: newLikesCount,
      authorScore: Number(authorScore ? authorScore.score : 0),
      authorTotalLikes: Number(authorScore ? authorScore.total_likes : 0),
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'STORY_NOT_FOUND') {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }
    console.error("Failed to toggle like on story:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
