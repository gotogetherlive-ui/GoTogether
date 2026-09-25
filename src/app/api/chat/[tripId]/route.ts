import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query, queryOne, run, transaction } from '@/lib/db';
import { randomUUID } from 'node:crypto';
import { encryptStoredChatMessage, readStoredChatMessage } from '@/lib/chatServerEncryption';

type ChatTrip = {
  id: string;
  title: string;
  organizer_id: string;
  organizer_name: string;
  is_completed: boolean;
  chat_closes_at: string | null;
  is_chat_closed: boolean;
};

async function authorizeChat(tripId: string, userId: string) {
  const trip = await queryOne<ChatTrip>(`
    SELECT t.id, t.title, t.organizer_id, organizer.full_name AS organizer_name,
           CASE
             WHEN NULLIF(t.start_date, '') IS NULL THEN FALSE
             ELSE NULLIF(t.start_date, '')::date + GREATEST(COALESCE(t.duration_days, 1), 1) - 1
               < (NOW() AT TIME ZONE 'Asia/Kolkata')::date
           END AS is_completed,
      ((NULLIF(t.start_date, '')::date + GREATEST(COALESCE(t.duration_days, 1), 1) + 7)::timestamp AT TIME ZONE 'Asia/Kolkata') AS chat_closes_at,
      COALESCE(NOW() >= ((NULLIF(t.start_date, '')::date + GREATEST(COALESCE(t.duration_days, 1), 1) + 7)::timestamp AT TIME ZONE 'Asia/Kolkata'), FALSE) AS is_chat_closed
    FROM trips t
    JOIN users organizer ON organizer.id = t.organizer_id
    WHERE t.id = $1 AND t.trip_type = 'buddy' AND t.status = 'live' AND t.deleted_at IS NULL
    FOR SHARE OF t
  `, [tripId]);
  if (!trip) return null;

  if (trip.organizer_id !== userId) {
    const participant = await queryOne(
      'SELECT id FROM trip_participants WHERE trip_id = $1 AND user_id = $2',
      [tripId, userId]
    );
    if (!participant) return null;
  }

  return trip;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    return await transaction(async () => {
    const { tripId } = await params;
    const trip = await authorizeChat(tripId, user.id);
    if (!trip) return NextResponse.json({ error: 'Unauthorized to view this chat' }, { status: 403 });

    try {
      await run(`
        INSERT INTO user_chat_reads (user_id, trip_id, last_read_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT(user_id, trip_id) DO UPDATE SET last_read_at = NOW()
      `, [user.id, tripId]);
    } catch (err) {
      console.error('Failed to update chat read timestamp:', err);
    }

    const [messages, members] = await Promise.all([
      query(`
        SELECT m.id, m.message, m.created_at, m.sender_id, u.full_name, u.avatar_url, m.encryption_version, m.trip_id
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.trip_id = $1
        ORDER BY m.created_at DESC
        LIMIT 100
      `, [tripId]),
      query<{ id: string; full_name: string; avatar_url: string | null; is_organizer: boolean; is_online: boolean }>(`
        SELECT member.id, member.full_name, member.avatar_url, member.is_organizer,
          EXISTS (SELECT 1 FROM user_chat_reads presence WHERE presence.trip_id = $1 AND presence.user_id = member.id AND presence.last_read_at >= NOW() - INTERVAL '30 seconds') AS is_online
        FROM (
          SELECT u.id, u.full_name, u.avatar_url, TRUE AS is_organizer, 0 AS member_order
          FROM users u
          WHERE u.id = $2 AND u.deleted_at IS NULL
          UNION ALL
          SELECT u.id, u.full_name, u.avatar_url, FALSE AS is_organizer, 1 AS member_order
          FROM trip_participants tp
          JOIN users u ON u.id = tp.user_id
          WHERE tp.trip_id = $1 AND tp.user_id <> $2 AND u.deleted_at IS NULL
        ) member
        ORDER BY member.member_order, LOWER(member.full_name)
      `, [tripId, trip.organizer_id]),
    ]);
    messages.reverse();



    return NextResponse.json({
      messages: messages.map(message => ({ ...message, message: readStoredChatMessage(message) })),
      chat: {
        trip_id: trip.id,
        name: trip.title,
        default_name: trip.title,
        organizer_id: trip.organizer_id,
        organizer_name: trip.organizer_name,
        is_organizer: trip.organizer_id === user.id,
        member_count: members.length,
        online_count: members.filter(member => member.is_online).length,
        members,
        encryption_mode: 'server-managed',
        is_completed: trip.is_completed,
        chat_closes_at: trip.chat_closes_at,
        is_chat_closed: trip.is_chat_closed,
      },
    });
    });
  } catch (err) {
    console.error('Fetch chat messages error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    return await transaction(async () => {
    const { tripId } = await params;
    let body;
    try {
      const raw = await request.text();
      if (raw.length > 16000) throw new Error();
      body = JSON.parse(raw);
    } catch { return NextResponse.json({ error: 'Invalid message' }, { status: 400 }); }
    if (body?.encryption_version === 1) return NextResponse.json({ error: 'Chat was updated. Reload this page before sending.' }, { status: 409 });
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    if (!message || message.length > 2000) return NextResponse.json({ error: 'Messages must contain 1?2,000 characters.' }, { status: 400 });

    const trip = await authorizeChat(tripId, user.id);
    if (!trip) return NextResponse.json({ error: 'Unauthorized to send message' }, { status: 403 });

    if (trip.is_chat_closed) return NextResponse.json({ error: 'This chat closed seven days after the trip ended. It is now read-only.', code: 'CHAT_CLOSED' }, { status: 410 });

    const messageId = randomUUID();
    const ciphertext = encryptStoredChatMessage(message, { id: messageId, trip_id: tripId, sender_id: user.id });
    await run('INSERT INTO messages (id, trip_id, sender_id, message, encryption_version) VALUES ($1,$2,$3,$4,2)', [messageId, tripId, user.id, ciphertext]);
    // PostgreSQL delivers these events only when the message transaction commits.
    // Notify all members in one round trip rather than waiting once per member.
    await run(`
      SELECT pg_notify('gotogether_notifications', json_build_object('type', 'user', 'id', recipients.user_id, 'messageId', $3::text)::text)
      FROM (
        SELECT user_id FROM trip_participants WHERE trip_id = $1 AND user_id <> $2
        UNION SELECT organizer_id FROM trips WHERE id = $1 AND organizer_id <> $2
      ) recipients
    `, [tripId, user.id, messageId]);
    return NextResponse.json({ success: true, messageId });
    });
  } catch (err) {
    console.error('Send chat message error:', err);
    if (err instanceof Error && 'code' in err && err.code === 'CHAT_ENCRYPTION_UNAVAILABLE') {
      return NextResponse.json({ error: 'Chat sending is temporarily unavailable. Please try again later.', code: 'CHAT_ENCRYPTION_UNAVAILABLE' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
