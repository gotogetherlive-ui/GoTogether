import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query, queryOne, run } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

type ChatTrip = {
  id: string;
  title: string;
  organizer_id: string;
  organizer_name: string;
};

async function authorizeChat(tripId: string, userId: string) {
  const trip = await queryOne<ChatTrip>(`
    SELECT t.id, t.title, t.organizer_id, organizer.full_name AS organizer_name
    FROM trips t
    JOIN users organizer ON organizer.id = t.organizer_id
    WHERE t.id = $1 AND t.trip_type = 'buddy' AND t.status = 'live'
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

    const { tripId } = await params;
    const trip = await authorizeChat(tripId, user.id);
    if (!trip) return NextResponse.json({ error: 'Unauthorized to view this chat' }, { status: 403 });

    const [messages, members] = await Promise.all([
      query(`
        SELECT m.id, m.message, m.created_at, m.sender_id, u.full_name, u.avatar_url
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.trip_id = $1
        ORDER BY m.created_at DESC
        LIMIT 100
      `, [tripId]),
      query<{ id: string; full_name: string; avatar_url: string | null; is_organizer: boolean }>(`
        SELECT member.id, member.full_name, member.avatar_url, member.is_organizer
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

    try {
      await run(`
        INSERT INTO user_chat_reads (user_id, trip_id, last_read_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT(user_id, trip_id) DO UPDATE SET last_read_at = NOW()
      `, [user.id, tripId]);
    } catch (err) {
      console.error('Failed to update chat read timestamp:', err);
    }

    return NextResponse.json({
      messages,
      chat: {
        trip_id: trip.id,
        name: trip.title,
        default_name: trip.title,
        organizer_id: trip.organizer_id,
        organizer_name: trip.organizer_name,
        is_organizer: trip.organizer_id === user.id,
        member_count: members.length,
        members,
      },
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

    const { tripId } = await params;
    const body = await request.json();
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message) return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    if (message.length > 2000) return NextResponse.json({ error: 'Message must be 2000 characters or fewer' }, { status: 400 });

    const trip = await authorizeChat(tripId, user.id);
    if (!trip) return NextResponse.json({ error: 'Unauthorized to send message' }, { status: 403 });

    const messageId = uuidv4();
    await run('INSERT INTO messages (id, trip_id, sender_id, message) VALUES ($1, $2, $3, $4)', [messageId, tripId, user.id, message]);
    return NextResponse.json({ success: true, messageId });
  } catch (err) {
    console.error('Send chat message error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
