import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin";
import { queryOne, run } from '@/lib/db';
import { notifyStories } from '@/lib/notificationEvents';

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

    const story = await queryOne(`
      SELECT s.id, s.user_id, s.content, s.images, s.location, s.trip_id, s.likes_count, s.comments_count, s.created_at, 
             u.full_name as author_name, 
             u.avatar_url as author_avatar,
             t.title as trip_title,
             t.destination as trip_destination,
             (SELECT 1 FROM story_likes WHERE story_id = s.id AND user_id = $1) as is_liked
      FROM travel_stories s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN trips t ON s.trip_id = t.id
      WHERE s.id = $2
    `, [user.id, id]) as any;

    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    try {
      story.images = JSON.parse(story.images || "[]");
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

    const story = await queryOne(`
      SELECT user_id FROM travel_stories WHERE id = $1
    `, [id]) as any;

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
