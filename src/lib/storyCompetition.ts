import { queryOne, run, transaction } from '@/lib/db';

const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const STORY_LIKE_POINT_VALUE = 0.25;
export const STORY_EVENT_POST_LIMIT = 2;

export type StoryCompetitionPhase = 'active' | 'featured';

export type StoryCompetitionWindow = {
  eventId: string;
  phase: StoryCompetitionPhase;
  startsAt: Date;
  scoringEndsAt: Date;
  featureEndsAt: Date;
};

export type FeaturedStoryWinner = {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  total_likes: number;
  score: number;
  story_count: number;
};

function toEventId(localSundayMs: number): string {
  const date = new Date(localSundayMs);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getStoryCompetitionWindow(now = new Date()): StoryCompetitionWindow {
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);
  const localMidnightMs = Date.UTC(
    istNow.getUTCFullYear(),
    istNow.getUTCMonth(),
    istNow.getUTCDate(),
  );
  const localSundayMs = localMidnightMs - istNow.getUTCDay() * DAY_MS;

  return {
    eventId: toEventId(localSundayMs),
    phase: istNow.getUTCDay() === 6 ? 'featured' : 'active',
    startsAt: new Date(localSundayMs - IST_OFFSET_MS),
    scoringEndsAt: new Date(localSundayMs + 6 * DAY_MS - IST_OFFSET_MS),
    featureEndsAt: new Date(localSundayMs + 7 * DAY_MS - IST_OFFSET_MS),
  };
}

type WinnerRow = {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  total_likes: string | number;
  score: string | number;
  story_count: string | number;
};

function serializeWinner(row: WinnerRow | null): FeaturedStoryWinner | null {
  if (!row) return null;
  return {
    ...row,
    total_likes: Number(row.total_likes || 0),
    score: Number(row.score || 0),
    story_count: Number(row.story_count || 0),
  };
}

async function loadWinner(window: StoryCompetitionWindow): Promise<FeaturedStoryWinner | null> {
  const winner = await queryOne<WinnerRow>(`
    SELECT w.winner_user_id AS user_id, u.full_name, u.avatar_url,
           w.total_likes, w.score, w.story_count
    FROM story_event_winners w
    JOIN users u ON u.id = w.winner_user_id
    WHERE w.event_id = $1
  `, [window.eventId]);
  return serializeWinner(winner);
}

async function finalizeWinner(window: StoryCompetitionWindow): Promise<FeaturedStoryWinner | null> {
  const existing = await loadWinner(window);
  if (existing) return serializeWinner(existing);

  const winner = await queryOne<WinnerRow>(`
    WITH event_scores AS (
      SELECT s.user_id,
             COUNT(sl.id)::int AS total_likes,
             COUNT(DISTINCT s.id)::int AS story_count,
             MIN(s.created_at) AS first_post_at
      FROM travel_stories s
      LEFT JOIN story_likes sl
        ON sl.story_id = s.id AND sl.user_id <> s.user_id AND sl.created_at < $2
      WHERE s.created_at >= $1 AND s.created_at < $2
      GROUP BY s.user_id
      HAVING COUNT(sl.id) > 0
    )
    SELECT es.user_id, u.full_name, u.avatar_url, es.total_likes, es.story_count,
           (es.total_likes * $3::numeric) AS score
    FROM event_scores es
    JOIN users u ON u.id = es.user_id
    WHERE u.deleted_at IS NULL AND u.role <> 'super_admin'
    ORDER BY es.total_likes DESC, es.story_count DESC, es.first_post_at ASC, es.user_id ASC
    LIMIT 1
  `, [window.startsAt.toISOString(), window.scoringEndsAt.toISOString(), STORY_LIKE_POINT_VALUE]);

  if (!winner) return null;

  await run(`
    INSERT INTO story_event_winners (
      event_id, event_start, scoring_end, winner_user_id, total_likes,
      score, story_count, featured_from, featured_until
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $3, $8)
    ON CONFLICT (event_id) DO NOTHING
  `, [
    window.eventId,
    window.startsAt.toISOString(),
    window.scoringEndsAt.toISOString(),
    winner.user_id,
    Number(winner.total_likes),
    Number(winner.score),
    Number(winner.story_count),
    window.featureEndsAt.toISOString(),
  ]);

  return serializeWinner(winner);
}

type MaintenanceRow = {
  cleanup_completed_at: Date | string;
  winner_finalized_at: Date | string | null;
};

export async function ensureStoryCompetitionMaintenance(now = new Date()) {
  const window = getStoryCompetitionWindow(now);
  let deletedStories = 0;
  let featuredWinner: FeaturedStoryWinner | null = null;
  let state = await queryOne<MaintenanceRow>(`
    SELECT cleanup_completed_at, winner_finalized_at
    FROM story_event_maintenance
    WHERE event_id = $1
  `, [window.eventId]);

  const maintenanceComplete = state && (
    window.phase === 'active' || state.winner_finalized_at
  );
  if (maintenanceComplete) {
    if (window.phase === 'featured') featuredWinner = await loadWinner(window);
    return { window, deletedStories, featuredWinner };
  }

  await transaction(async (client) => {
    await client.query(`SELECT pg_advisory_xact_lock(hashtext('gotogether_story_competition'))`);

    state = await queryOne<MaintenanceRow>(`
      SELECT cleanup_completed_at, winner_finalized_at
      FROM story_event_maintenance
      WHERE event_id = $1
    `, [window.eventId]);

    if (!state) {
      const deletion = await client.query(`
        DELETE FROM travel_stories
        WHERE created_at < $1
      `, [window.startsAt.toISOString()]);
      deletedStories = deletion.rowCount || 0;

      await client.query(`
        INSERT INTO story_event_maintenance (
          event_id, event_start, cleanup_completed_at, created_at, updated_at
        ) VALUES ($1, $2, NOW(), NOW(), NOW())
        ON CONFLICT (event_id) DO NOTHING
      `, [window.eventId, window.startsAt.toISOString()]);
    }

    if (window.phase === 'featured' && !state?.winner_finalized_at) {
      featuredWinner = await finalizeWinner(window);
      await client.query(`
        UPDATE story_event_maintenance
        SET winner_finalized_at = NOW(), updated_at = NOW()
        WHERE event_id = $1 AND winner_finalized_at IS NULL
      `, [window.eventId]);
    }
  });

  if (window.phase === 'featured' && !featuredWinner) {
    featuredWinner = await loadWinner(window);
  }

  return { window, deletedStories, featuredWinner };
}
