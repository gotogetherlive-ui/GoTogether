import { query } from "@/lib/db";

export interface TeamChatTrip {
  id: string;
  title: string;
  destination: string;
  start_date: string | null;
  image_url: string | null;
  organizer_id: string;
  organizer_name: string;
  participant_count: number;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
}

export async function getTeamChatTrips(userId: string): Promise<TeamChatTrip[]> {
  return query<TeamChatTrip>(`
    SELECT
      t.id, t.title, t.destination, t.start_date, t.image_url, t.organizer_id,
      organizer.full_name AS organizer_name,
      (
        SELECT COUNT(DISTINCT member_id)::int
        FROM (
          SELECT t.organizer_id AS member_id
          UNION ALL
          SELECT tp_count.user_id FROM trip_participants tp_count WHERE tp_count.trip_id = t.id
        ) team_members
      ) AS participant_count,
      latest.message AS last_message,
      latest.created_at AS last_message_at,
      (
        SELECT COUNT(*)::int
        FROM messages unread
        WHERE unread.trip_id = t.id
          AND unread.sender_id <> $1
          AND unread.created_at > COALESCE(
            (SELECT reads.last_read_at FROM user_chat_reads reads WHERE reads.user_id = $1 AND reads.trip_id = t.id),
            TIMESTAMPTZ 'epoch'
          )
      ) AS unread_count
    FROM trips t
    JOIN users organizer ON organizer.id = t.organizer_id
    LEFT JOIN LATERAL (
      SELECT m.message, m.created_at
      FROM messages m
      WHERE m.trip_id = t.id
      ORDER BY m.created_at DESC
      LIMIT 1
    ) latest ON TRUE
    WHERE t.trip_type = 'buddy'
      AND t.status = 'live'
      AND (
        t.organizer_id = $1
        OR EXISTS (
          SELECT 1 FROM trip_participants tp
          WHERE tp.trip_id = t.id AND tp.user_id = $1
        )
      )
    ORDER BY COALESCE(latest.created_at, t.created_at) DESC
  `, [userId]);
}