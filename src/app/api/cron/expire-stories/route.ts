import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from '@/lib/cronAuth';
import { ensureStoryCompetitionMaintenance } from '@/lib/storyCompetition';
import { notifyStories } from '@/lib/notificationEvents';

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await ensureStoryCompetitionMaintenance();
    if (result.deletedStories > 0) await notifyStories('event_reset');

    return NextResponse.json({
      success: true,
      eventId: result.window.eventId,
      phase: result.window.phase,
      deletedStories: result.deletedStories,
      featuredWinner: result.featuredWinner,
      message: result.deletedStories > 0
        ? `Reset the feed and removed ${result.deletedStories} previous-event stories`
        : 'Story competition maintenance completed',
    });
  } catch (err) {
    console.error("Failed to run expire-stories cron job:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
