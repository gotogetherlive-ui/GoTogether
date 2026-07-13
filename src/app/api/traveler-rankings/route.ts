import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { getTravelerLevel } from '@/lib/travelerRank';
import {
  ensureStoryCompetitionMaintenance,
  STORY_EVENT_POST_LIMIT,
  STORY_LIKE_POINT_VALUE,
} from '@/lib/storyCompetition';

type RankingRow = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  credit_points: string | number;
  story_count: string | number;
  total_likes: string | number;
  rank: string | number;
};

function serializeRanking(row: RankingRow | null) {
  if (!row) return null;
  const creditPoints = Number(row.credit_points || 0);
  return {
    ...row,
    credit_points: creditPoints,
    story_count: Number(row.story_count || 0),
    total_likes: Number(row.total_likes || 0),
    rank: Number(row.rank),
    level: getTravelerLevel(creditPoints).name,
  };
}

export async function GET(request: Request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const requestedLimit = Number.parseInt(searchParams.get("limit") || "10", 10);
    const limit = Number.isFinite(requestedLimit) ? Math.min(25, Math.max(3, requestedLimit)) : 10;
    const competitionState = await ensureStoryCompetitionMaintenance();
    const competition = competitionState.window;

    const rankedSql = `
      WITH event_scores AS (
        SELECT s.user_id, COUNT(sl.id)::int AS total_likes,
          COUNT(DISTINCT s.id)::int AS story_count,
          MIN(s.created_at) AS first_post_at
        FROM travel_stories s
        LEFT JOIN story_likes sl ON sl.story_id = s.id AND sl.user_id <> s.user_id AND sl.created_at < $2
        WHERE s.created_at >= $1 AND s.created_at < $2
        GROUP BY s.user_id
      ), ranked_travelers AS (
        SELECT u.id, u.full_name, u.avatar_url, u.role,
          (es.total_likes * ${STORY_LIKE_POINT_VALUE})::numeric AS credit_points,
          es.total_likes, es.story_count,
          ROW_NUMBER() OVER (
            ORDER BY es.total_likes DESC, es.story_count DESC, es.first_post_at ASC, u.id ASC
          ) AS rank
        FROM event_scores es
        JOIN users u ON u.id = es.user_id
        WHERE u.deleted_at IS NULL AND u.role <> 'super_admin'
      )
    `;

    const [leaders, current] = await Promise.all([
      query<RankingRow>(`${rankedSql} SELECT * FROM ranked_travelers ORDER BY rank ASC LIMIT $3`, [competition.startsAt.toISOString(), competition.scoringEndsAt.toISOString(), limit]),
      queryOne<RankingRow>(`${rankedSql} SELECT * FROM ranked_travelers WHERE id = $3`, [competition.startsAt.toISOString(), competition.scoringEndsAt.toISOString(), user.id]),
    ]);

    return NextResponse.json({
      leaders: leaders.map(serializeRanking),
      current: serializeRanking(current),
      rules: {
        like_point_value: STORY_LIKE_POINT_VALUE,
        post_limit: STORY_EVENT_POST_LIMIT,
        description: 'Every like received across both event posts earns 0.25 ranking points.',
      },
      event: {
        id: competition.eventId,
        phase: competition.phase,
        startsAt: competition.startsAt.toISOString(),
        scoringEndsAt: competition.scoringEndsAt.toISOString(),
        featureEndsAt: competition.featureEndsAt.toISOString(),
        featuredWinner: competitionState.featuredWinner,
      },
    });
  } catch (error) {
    console.error("Failed to fetch traveler rankings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
