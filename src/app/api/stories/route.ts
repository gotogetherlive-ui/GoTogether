import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAppSettings } from "@/lib/settings";
import { isAdminUser } from "@/lib/admin";
import { query, queryOne, run, transaction } from '@/lib/db';
import { v4 as uuidv4 } from "uuid";
import { rateLimit } from '@/lib/rateLimit';
import { notifyStories } from '@/lib/notificationEvents';
import { validateStoryImages } from '@/lib/storyMedia';
import {
  ensureStoryCompetitionMaintenance,
  STORY_EVENT_POST_LIMIT,
  STORY_LIKE_POINT_VALUE,
} from '@/lib/storyCompetition';

const lastLoginUpdateCache = new Map<string, number>(); // userId -> timestamp

type ProfileFields = {
  full_name?: string | null;
  phone_number?: string | null;
  age?: number | null;
  gender?: string | null;
  profession?: string | null;
  fooding_habit?: string | null;
};

type StoryRow = {
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

type ActiveUserRow = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  credit_points: string | number;
  traveler_rank: string | number | null;
  is_online: boolean;
};

export async function GET(req: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Lazily update activity (throttled in memory to prevent database write contention)
    try {
      const lastUpdated = lastLoginUpdateCache.get(user.id);
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      if (!lastUpdated || lastUpdated < fiveMinutesAgo) {
        await run(`
          UPDATE users 
          SET last_login_at = NOW() 
          WHERE id = $1 AND (last_login_at IS NULL OR last_login_at < NOW() - INTERVAL '5 minutes')
        `, [user.id]);
        lastLoginUpdateCache.set(user.id, Date.now());
        // Prevent memory leaks
        if (lastLoginUpdateCache.size > 100000) {
          lastLoginUpdateCache.clear();
        }
      }
    } catch (err) {
      console.error('Failed to log lazy stories activity:', err);
    }

    const settings = await getAppSettings();
    const isAdmin = await isAdminUser(user);
    const competitionState = await ensureStoryCompetitionMaintenance();
    const competitionWindow = competitionState.window;

    // If stories are blocked by admin and user is not admin, return empty feed with blocked flag
    if (settings.stories_blocked && !isAdmin) {
      return NextResponse.json({
        stories: [],
        nextCursor: null,
        hasMore: false,
        activeUsers: [],
        storiesBlocked: true,
        competition: {
          eventId: competitionWindow.eventId,
          phase: competitionWindow.phase,
          startsAt: competitionWindow.startsAt.toISOString(),
          scoringEndsAt: competitionWindow.scoringEndsAt.toISOString(),
          featureEndsAt: competitionWindow.featureEndsAt.toISOString(),
          postLimit: STORY_EVENT_POST_LIMIT,
          pointPerLike: STORY_LIKE_POINT_VALUE,
          currentUserPosts: 0,
          featuredWinner: competitionState.featuredWinner,
        },
      });
    }

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor") || undefined;
    const filterUserId = searchParams.get("user_id") || undefined;
    const requestedLimit = parseInt(searchParams.get("limit") || "10", 10);
    const limit = Number.isFinite(requestedLimit) ? Math.min(25, Math.max(1, requestedLimit)) : 10;

    let queryStr = `
      WITH event_scores AS (
        SELECT s.user_id, COUNT(sl.id)::int AS total_likes,
               COUNT(DISTINCT s.id)::int AS story_count,
               MIN(s.created_at) AS first_post_at
        FROM travel_stories s
        LEFT JOIN story_likes sl ON sl.story_id = s.id AND sl.user_id <> s.user_id AND sl.created_at < $3
        WHERE s.created_at >= $2 AND s.created_at < $3
        GROUP BY s.user_id
      ), ranked_users AS (
        SELECT user_id, total_likes,
               (total_likes * ${STORY_LIKE_POINT_VALUE})::numeric AS event_points,
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
      LEFT JOIN ranked_users ru ON ru.user_id = u.id
      LEFT JOIN trips t ON s.trip_id = t.id
      WHERE s.created_at >= $2 AND s.created_at < $3
    `;
    const params: Array<string | number> = [user.id, competitionWindow.startsAt.toISOString(), competitionWindow.scoringEndsAt.toISOString()];
    let paramIndex = 4;

    if (cursor) {
      queryStr += ` AND s.created_at < $${paramIndex}`;
      params.push(cursor);
      paramIndex++;
    }
    if (filterUserId) {
      queryStr += ` AND s.user_id = $${paramIndex}`;
      params.push(filterUserId);
      paramIndex++;
    }

    queryStr += ` ORDER BY s.created_at DESC LIMIT $${paramIndex}`;
    params.push(limit + 1);

    const rows = await query<StoryRow>(queryStr, params);

    let nextCursor: string | null = null;
    const hasMore = rows.length > limit;
    const stories = hasMore ? rows.slice(0, limit) : rows;

    if (hasMore && stories.length > 0) {
      nextCursor = stories[stories.length - 1].created_at;
    }

    // Parse image JSON array for each story
    const parsedStories = stories.map((story) => {
      let images = [];
      try {
        images = JSON.parse(typeof story.images === 'string' ? story.images : '[]');
      } catch {
        images = [];
      }
      return {
        ...story,
        images,
        is_liked: !!story.is_liked,
      };
    });

    // Fetch recently active users to show at the top of the feed (Instagram-style) — includes everyone
    const activeUsers = await query<ActiveUserRow>(`
      WITH event_scores AS (
        SELECT s.user_id, COUNT(sl.id)::int AS total_likes,
               COUNT(DISTINCT s.id)::int AS story_count,
               MIN(s.created_at) AS first_post_at
        FROM travel_stories s
        LEFT JOIN story_likes sl ON sl.story_id = s.id AND sl.user_id <> s.user_id AND sl.created_at < $3
        WHERE s.created_at >= $2 AND s.created_at < $3
        GROUP BY s.user_id
      ), ranked_users AS (
        SELECT user_id, total_likes,
               (total_likes * ${STORY_LIKE_POINT_VALUE})::numeric AS event_points,
               ROW_NUMBER() OVER (
                 ORDER BY total_likes DESC, story_count DESC, first_post_at ASC, user_id ASC
               ) AS traveler_rank
        FROM event_scores
      )
      SELECT u.id, u.full_name, u.avatar_url, u.role, COALESCE(ru.event_points, 0) as credit_points,
             ru.traveler_rank,
             (last_login_at >= NOW() - INTERVAL '15 minutes') AS is_online
      FROM users u
      LEFT JOIN ranked_users ru ON ru.user_id = u.id
      WHERE u.id != $1 AND u.deleted_at IS NULL
      ORDER BY 
        CASE WHEN u.last_login_at IS NULL THEN 1 ELSE 0 END,
        u.last_login_at DESC,
        u.created_at DESC
      LIMIT 30
    `, [user.id, competitionWindow.startsAt.toISOString(), competitionWindow.scoringEndsAt.toISOString()]);

    const currentUserPostCount = await queryOne<{ count: string | number }>(`
      SELECT COUNT(*) AS count
      FROM travel_stories
      WHERE user_id = $1 AND created_at >= $2 AND created_at < $3
    `, [user.id, competitionWindow.startsAt.toISOString(), competitionWindow.scoringEndsAt.toISOString()]);

    return NextResponse.json({
      stories: parsedStories,
      nextCursor,
      hasMore,
      activeUsers,
      storiesBlocked: false,
      competition: {
        eventId: competitionWindow.eventId,
        phase: competitionWindow.phase,
        startsAt: competitionWindow.startsAt.toISOString(),
        scoringEndsAt: competitionWindow.scoringEndsAt.toISOString(),
        featureEndsAt: competitionWindow.featureEndsAt.toISOString(),
        postLimit: STORY_EVENT_POST_LIMIT,
        pointPerLike: STORY_LIKE_POINT_VALUE,
        currentUserPosts: Number(currentUserPostCount?.count || 0),
        featuredWinner: competitionState.featuredWinner,
      },
    });
  } catch (err) {
    console.error("Failed to fetch stories:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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

export async function POST(req: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await getAppSettings();
    const isAdmin = await isAdminUser(user);
    const competitionState = await ensureStoryCompetitionMaintenance();
    const competitionWindow = competitionState.window;

    if (settings.stories_blocked && !isAdmin) {
      return NextResponse.json(
        { error: "Posting stories is temporarily disabled by the administrator." },
        { status: 403 }
      );
    }

    // Block posting if profile is incomplete
    if (!isAdmin && !isProfileComplete(user)) {
      return NextResponse.json(
        { error: "Please complete your profile in the Dashboard to post stories." },
        { status: 403 }
      );
    }

    if (competitionWindow.phase !== 'active') {
      return NextResponse.json(
        { error: 'This event has ended. The winner is being featured today; the next event starts Sunday.' },
        { status: 403 },
      );
    }

    // Each traveler may publish at most two posts across the entire event.
    const postCount = await queryOne(`
      SELECT COUNT(id) as count
      FROM travel_stories
      WHERE user_id = $1 AND created_at >= $2 AND created_at < $3
    `, [user.id, competitionWindow.startsAt.toISOString(), competitionWindow.scoringEndsAt.toISOString()]) as { count: number };

    if (Number(postCount.count) >= STORY_EVENT_POST_LIMIT) {
      return NextResponse.json(
        { error: 'You have already used both posts for this event. Likes from both posts count toward your rank.' },
        { status: 409 }
      );
    }

    const body = await req.json();

    const { content, images, location, trip_id } = body;

    if (!content || typeof content !== "string" || content.trim() === "") {
      return NextResponse.json({ error: "Story content is required" }, { status: 400 });
    }
    if (content.trim().length > 3000 || (location && (typeof location !== 'string' || location.length > 200))) {
      return NextResponse.json({ error: 'Story content is too long' }, { status: 400 });
    }
    const createLimit = await rateLimit(`story:create:${user.id}`, 5, 24 * 60 * 60 * 1000);
    if (!createLimit.allowed) return NextResponse.json({ error: 'Story posting limit reached' }, { status: 429 });

    const imageValidation = validateStoryImages(images, { nodeEnv: process.env.NODE_ENV }) as { ok: boolean; error?: string; images?: string[] };
    if (!imageValidation.ok) {
      return NextResponse.json({ error: imageValidation.error }, { status: 400 });
    }
    const imageUrls: string[] = imageValidation.images || [];

    const insertionWindow = (await ensureStoryCompetitionMaintenance()).window;
    if (insertionWindow.phase !== 'active') {
      throw new Error('STORY_EVENT_CLOSED');
    }

    const storyId = uuidv4();
    const createdAt = new Date().toISOString();

    await transaction(async (client) => {
      await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`story-event-posts:${user.id}`]);
      const lockedCount = await client.query<{ count: string }>(`
        SELECT COUNT(id)::text AS count
        FROM travel_stories
        WHERE user_id = $1 AND created_at >= $2 AND created_at < $3
      `, [user.id, insertionWindow.startsAt.toISOString(), insertionWindow.scoringEndsAt.toISOString()]);

      if (Number(lockedCount.rows[0]?.count || 0) >= STORY_EVENT_POST_LIMIT) {
        throw new Error('STORY_EVENT_POST_LIMIT_REACHED');
      }

      await client.query(`
        INSERT INTO travel_stories (id, user_id, content, images, location, trip_id, likes_count, comments_count, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, 0, 0, $7)
      `, [storyId, user.id, content.trim(), JSON.stringify(imageUrls), location ? location.trim() : null, trip_id || null, createdAt]);
    });

    // Retrieve the newly created story
    const newStory = await queryOne<StoryRow>(`
      SELECT s.id, s.user_id, s.content, s.images, s.location, s.trip_id, s.likes_count, s.comments_count, s.created_at, 
             u.full_name as author_name, 
             u.avatar_url as author_avatar,
             u.role as author_role,
             0::numeric as author_credit_points,
             NULL::bigint as author_rank,
             t.title as trip_title,
             t.destination as trip_destination,
             0 as is_liked
      FROM travel_stories s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN trips t ON s.trip_id = t.id
      WHERE s.id = $1
    `, [storyId]);

    if (newStory) {
      newStory.images = imageUrls;
      newStory.is_liked = false;
    }

    await notifyStories('created', storyId);
    const updatedPostCount = await queryOne<{ count: string | number }>(`
      SELECT COUNT(*) AS count FROM travel_stories
      WHERE user_id = $1 AND created_at >= $2 AND created_at < $3
    `, [user.id, insertionWindow.startsAt.toISOString(), insertionWindow.scoringEndsAt.toISOString()]);

    return NextResponse.json({
      success: true,
      story: newStory,
      competition: { currentUserPosts: Number(updatedPostCount?.count || 0) },
    }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === 'STORY_EVENT_POST_LIMIT_REACHED') {
      return NextResponse.json(
        { error: 'You have already used both posts for this event. Likes from both posts count toward your rank.' },
        { status: 409 },
      );
    }
    if (err instanceof Error && err.message === 'STORY_EVENT_CLOSED') {
      return NextResponse.json(
        { error: 'This event has ended. The winner is being featured today; the next event starts Sunday.' },
        { status: 403 },
      );
    }
    console.error("Failed to create story:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
