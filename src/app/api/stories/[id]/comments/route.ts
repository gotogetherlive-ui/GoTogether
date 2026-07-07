import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAppSettings } from "@/lib/settings";
import { isAdminUser } from "@/lib/admin";
import { query, queryOne, run, transaction } from '@/lib/db';
import { notifyStories } from '@/lib/notificationEvents';
import { v4 as uuidv4 } from "uuid";
import { rateLimit } from '@/lib/rateLimit';

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

    // Verify story exists
    const story = await queryOne("SELECT id FROM travel_stories WHERE id = $1", [id]);
    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    const comments = await query(`
      SELECT c.id, c.story_id, c.user_id, c.content, c.created_at, 
             u.full_name as author_name, 
             u.avatar_url as author_avatar
      FROM story_comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.story_id = $1
      ORDER BY c.created_at ASC
      LIMIT 100
    `, [id]) as any[];

    return NextResponse.json({ comments });
  } catch (err) {
    console.error("Failed to fetch story comments:", err);
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
      return NextResponse.json({ error: "Please complete your profile in the Dashboard to post comments." }, { status: 403 });
    }


    const { id } = await params;
    const body = await req.json();
    const { content } = body;


    if (!content || typeof content !== "string" || content.trim() === "") {
      return NextResponse.json({ error: "Comment content is required" }, { status: 400 });
    }
    if (content.trim().length > 1000) {
      return NextResponse.json({ error: 'Comment is too long' }, { status: 400 });
    }
    const limit = await rateLimit(`story:comment:${user.id}`, 30, 60 * 60 * 1000);
    if (!limit.allowed) return NextResponse.json({ error: 'Comment rate limit reached' }, { status: 429 });

    // Verify story exists
    const story = await queryOne("SELECT id FROM travel_stories WHERE id = $1", [id]);
    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    const commentId = uuidv4();
    const createdAt = new Date().toISOString();

    let newComment: any = null;

    await transaction(async () => {
      await run(`
        INSERT INTO story_comments (id, story_id, user_id, content, created_at)
        VALUES ($1, $2, $3, $4, $5)
      `, [commentId, id, user.id, content.trim(), createdAt]);

      await run(`
        UPDATE travel_stories 
        SET comments_count = comments_count + 1 
        WHERE id = $1
      `, [id]);

      newComment = await queryOne(`
        SELECT c.id, c.story_id, c.user_id, c.content, c.created_at, 
               u.full_name as author_name, 
               u.avatar_url as author_avatar
        FROM story_comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.id = $1
      `, [commentId]);
    });

    await notifyStories('commented', id);
    return NextResponse.json({ success: true, comment: newComment }, { status: 201 });
  } catch (err) {
    console.error("Failed to create story comment:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}