import { readStoredChatMessage } from '@/lib/chatServerEncryption';
import { query } from "@/lib/db";

export interface TeamChatTrip {
  id: string;
  title: string;
  destination: string;
  start_date: string | null;
  duration_days: number;
  is_completed: boolean;
  chat_closes_at: string | null;
  is_chat_closed: boolean;
  image_url: string | null;
  organizer_id: string;
  organizer_name: string;
  participant_count: number;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
}

export async function getTeamChatTrips(userId: string): Promise<TeamChatTrip[]> {
  const trips = await query<TeamChatTrip & { last_message_id: string | null; last_sender_id: string | null; last_encryption_version: number }>(`
    SELECT
      t.id, t.title, t.destination, t.start_date, t.duration_days, t.image_url, t.organizer_id,
      CASE
        WHEN NULLIF(t.start_date, '') IS NULL THEN FALSE
        ELSE NULLIF(t.start_date, '')::date + GREATEST(COALESCE(t.duration_days, 1), 1) - 1
          < (NOW() AT TIME ZONE 'Asia/Kolkata')::date
      END AS is_completed,
      ((NULLIF(t.start_date, '')::date + GREATEST(COALESCE(t.duration_days, 1), 1) + 7)::timestamp AT TIME ZONE 'Asia/Kolkata') AS chat_closes_at,
      COALESCE(NOW() >= ((NULLIF(t.start_date, '')::date + GREATEST(COALESCE(t.duration_days, 1), 1) + 7)::timestamp AT TIME ZONE 'Asia/Kolkata'), FALSE) AS is_chat_closed,
      organizer.full_name AS organizer_name,
      (
        SELECT COUNT(DISTINCT member_id)::int
        FROM (
          SELECT t.organizer_id AS member_id
          UNION ALL
          SELECT tp_count.user_id FROM trip_participants tp_count WHERE tp_count.trip_id = t.id
        ) team_members
      ) AS participant_count,
      latest.id AS last_message_id, latest.sender_id AS last_sender_id, latest.encryption_version AS last_encryption_version,
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
      SELECT m.id, m.sender_id, m.encryption_version, m.message, m.created_at
      FROM messages m
      WHERE m.trip_id = t.id
      ORDER BY m.created_at DESC
      LIMIT 1
    ) latest ON TRUE
    WHERE t.trip_type = 'buddy'
      AND t.status = 'live'
      -- A completed trip remains in Team Chat. It becomes read-only seven days after completion.
      AND (
        t.organizer_id = $1
        OR EXISTS (
          SELECT 1 FROM trip_participants tp
          WHERE tp.trip_id = t.id AND tp.user_id = $1
        )
      )
    ORDER BY COALESCE(latest.created_at, t.created_at) DESC
  `, [userId]);
  return trips.map(({ last_message_id, last_sender_id, last_encryption_version, ...trip }) => ({
    ...trip,
    last_message: last_message_id && last_sender_id && trip.last_message !== null ? readStoredChatMessage({ id: last_message_id, trip_id: trip.id, sender_id: last_sender_id, message: trip.last_message, encryption_version: last_encryption_version }) : null,
  }));
}

export async function hasTeamChats(userId: string): Promise<boolean> {
  const rows = await query<{ has_team_chats: boolean }>(`
    SELECT EXISTS (
      SELECT 1
      FROM trips t
      WHERE t.trip_type = 'buddy'
        AND t.status = 'live'
        AND t.deleted_at IS NULL
        AND (
          t.organizer_id = $1
          OR EXISTS (
            SELECT 1 FROM trip_participants tp
            WHERE tp.trip_id = t.id AND tp.user_id = $1
          )
        )
    ) AS has_team_chats
  `, [userId]);
  return rows[0]?.has_team_chats === true;
}
