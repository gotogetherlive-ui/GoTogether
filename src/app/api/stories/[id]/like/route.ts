import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAppSettings } from "@/lib/settings";
import { isAdminUser } from "@/lib/admin";
import { queryOne, run, transaction } from '@/lib/db';
import { notifyStories } from '@/lib/notificationEvents';
import { v4 as uuidv4 } from "uuid";
import { rateLimit } from '@/lib/rateLimit';

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

    if (settings.stories_blocked && !isAdmin) {
      return NextResponse.json({ error: "Interactions are temporarily disabled." }, { status: 403 });
    }

    if (!isAdmin && !isProfileComplete(user)) {
      return NextResponse.json({ error: "Please complete your profile in the Dashboard to like stories." }, { status: 403 });
    }
    const limit = await rateLimit(`story:like:${user.id}`, 120, 60 * 60 * 1000);
    if (!limit.allowed) return NextResponse.json({ error: 'Like rate limit reached' }, { status: 429 });


    const { id } = await params;

    // Verify story exists
    const story = await queryOne("SELECT id FROM travel_stories WHERE id = $1", [id]);
    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }


    let isLiked = false;
    let newLikesCount = 0;

    // Execute like/unlike in a transaction to keep counts synced
    await transaction(async () => {
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

      const updatedStory = await queryOne("SELECT likes_count FROM travel_stories WHERE id = $1", [id]) as any;
      newLikesCount = updatedStory?.likes_count || 0;
    });

    await notifyStories('liked', id);

    return NextResponse.json({
      success: true,
      liked: isLiked,
      likesCount: newLikesCount,
    });
  } catch (err) {
    console.error("Failed to toggle like on story:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}