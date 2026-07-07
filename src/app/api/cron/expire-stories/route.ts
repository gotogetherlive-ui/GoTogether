import { NextResponse } from "next/server";
import { query, run, transaction } from '@/lib/db';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';

const STORY_RETENTION_DAYS = 7;

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    // Find stories older than the retention window. Likes/comments are removed by cascade.
    const expiredStories = await query(`
      SELECT id FROM travel_stories
      WHERE created_at < NOW() - ($1::int * INTERVAL '1 day')
    `, [STORY_RETENTION_DAYS]) as { id: string }[];

    const count = expiredStories.length;

    if (count > 0) {
      await transaction(async () => {
        await run(`
          DELETE FROM travel_stories
          WHERE created_at < NOW() - ($1::int * INTERVAL '1 day')
        `, [STORY_RETENTION_DAYS]);
      });
      console.log(`[CRON] Expired and purged ${count} travel stories.`);
    }

    return NextResponse.json({
      success: true,
      retentionDays: STORY_RETENTION_DAYS,
      expiredCount: count,
      message: count > 0 ? `Purged ${count} expired stories` : "No expired stories to purge",
    });
  } catch (err) {
    console.error("Failed to run expire-stories cron job:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
