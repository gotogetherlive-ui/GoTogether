import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAppSettings } from "@/lib/settings";
import { isAdminUser } from "@/lib/admin";
import { query, queryOne, run } from '@/lib/db';
import { v4 as uuidv4 } from "uuid";
import { rateLimit } from '@/lib/rateLimit';
import { notifyStories } from '@/lib/notificationEvents';
import { validateStoryImages } from '@/lib/storyMedia';

const lastLoginUpdateCache = new Map<string, number>(); // userId -> timestamp

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

    // If stories are blocked by admin and user is not admin, return empty feed with blocked flag
    if (settings.stories_blocked && !isAdmin) {
      return NextResponse.json({
        stories: [],
        nextCursor: null,
        hasMore: false,
        activeUsers: [],
        storiesBlocked: true,
      });
    }

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor") || undefined;
    const filterUserId = searchParams.get("user_id") || undefined;
    const requestedLimit = parseInt(searchParams.get("limit") || "10", 10);
    const limit = Number.isFinite(requestedLimit) ? Math.min(25, Math.max(1, requestedLimit)) : 10;

    let queryStr = `
      SELECT s.id, s.user_id, s.content, s.images, s.location, s.trip_id, s.likes_count, s.comments_count, s.created_at, 
             u.full_name as author_name, 
             u.avatar_url as author_avatar,
             t.title as trip_title,
             t.destination as trip_destination,
             (SELECT 1 FROM story_likes WHERE story_id = s.id AND user_id = $1) as is_liked
      FROM travel_stories s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN trips t ON s.trip_id = t.id
      WHERE 1=1
    `;
    const params: any[] = [user.id];
    let paramIndex = 2;

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

    const rows = await query(queryStr, params) as any[];

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
        images = JSON.parse(story.images || "[]");
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
    const activeUsers = await query(`
      SELECT id, full_name, avatar_url, role,
             (last_login_at >= NOW() - INTERVAL '15 minutes') AS is_online
      FROM users
      WHERE id != $1
      ORDER BY 
        CASE WHEN last_login_at IS NULL THEN 1 ELSE 0 END, 
        last_login_at DESC, 
        created_at DESC
      LIMIT 30
    `, [user.id]) as any[];

    return NextResponse.json({
      stories: parsedStories,
      nextCursor,
      hasMore,
      activeUsers,
      storiesBlocked: false,
    });
  } catch (err) {
    console.error("Failed to fetch stories:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function isProfileComplete(user: any): boolean {
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

    // Limit regular users to 2 posts per day
    if (!isAdmin) {
      const todayDateStr = new Date().toISOString().substring(0, 10);

      const postCount = await queryOne(`
        SELECT COUNT(id) as count 
        FROM travel_stories 
        WHERE user_id = $1 AND created_at::DATE = $2::DATE
      `, [user.id, todayDateStr]) as { count: number };

      if (postCount.count >= 2) {
        return NextResponse.json(
          { error: "You have reached the daily limit of 2 stories. Please try again tomorrow!" },
          { status: 429 }
        );
      }
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

    const storyId = uuidv4();
    const createdAt = new Date().toISOString();

    await run(`
      INSERT INTO travel_stories (id, user_id, content, images, location, trip_id, likes_count, comments_count, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, 0, 0, $7)
    `, [storyId,
      user.id,
      content.trim(),
      JSON.stringify(imageUrls),
      location ? location.trim() : null,
      trip_id || null,
      createdAt
    ]);

    // Retrieve the newly created story
    const newStory = await queryOne(`
      SELECT s.id, s.user_id, s.content, s.images, s.location, s.trip_id, s.likes_count, s.comments_count, s.created_at, 
             u.full_name as author_name, 
             u.avatar_url as author_avatar,
             t.title as trip_title,
             t.destination as trip_destination,
             0 as is_liked
      FROM travel_stories s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN trips t ON s.trip_id = t.id
      WHERE s.id = $1
    `, [storyId]) as any;

    if (newStory) {
      newStory.images = imageUrls;
      newStory.is_liked = false;
    }

    await notifyStories('created', storyId);
    return NextResponse.json({ success: true, story: newStory }, { status: 201 });
  } catch (err) {
    console.error("Failed to create story:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
