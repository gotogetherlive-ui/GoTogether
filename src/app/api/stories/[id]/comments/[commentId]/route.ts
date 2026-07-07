import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin";
import { queryOne, run, transaction } from '@/lib/db';
import { notifyStories } from '@/lib/notificationEvents';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: storyId, commentId } = await params;

    // Verify comment exists
    const comment = await queryOne(`
      SELECT user_id, story_id FROM story_comments WHERE id = $1
    `, [commentId]) as any;

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Verify comment belongs to this story
    if (comment.story_id !== storyId) {
      return NextResponse.json({ error: "Comment does not belong to this story" }, { status: 400 });
    }

    const isAuthor = comment.user_id === user.id;
    const isAdmin = await isAdminUser(user);

    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ error: "You are not authorized to delete this comment" }, { status: 403 });
    }

    await transaction(async () => {
      await run(`DELETE FROM story_comments WHERE id = $1`, [commentId]);
      await run(`
        UPDATE travel_stories 
        SET comments_count = GREATEST(0, comments_count - 1) 
        WHERE id = $1
      `, [storyId]);
    });

    await notifyStories('comment_deleted', storyId);
    return NextResponse.json({ success: true, message: "Comment deleted successfully" });
  } catch (err) {
    console.error("Failed to delete story comment:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
