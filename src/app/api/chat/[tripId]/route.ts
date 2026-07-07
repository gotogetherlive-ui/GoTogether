import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query, queryOne, run } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { tripId } = await params;

    // Verify user is a participant or organizer
    const participant = await queryOne(
      'SELECT id FROM trip_participants WHERE trip_id = $1 AND user_id = $2',
      [tripId, user.id]
    );

    const trip = await queryOne('SELECT organizer_id FROM trips WHERE id = $1', [tripId]) as any;

    if (!participant && (!trip || trip.organizer_id !== user.id)) {
      return NextResponse.json({ error: 'Unauthorized to view this chat' }, { status: 403 });
    }

    // Fetch messages (limit to 100 most recent for performance)
    const messages = await query(`
      SELECT m.id, m.message, m.created_at, m.sender_id, u.full_name, u.avatar_url
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.trip_id = $1
      ORDER BY m.created_at DESC
      LIMIT 100
    `, [tripId]);
    messages.reverse();

    // Update last_read_at for this user and trip
    try {
      await run(`
        INSERT INTO user_chat_reads (user_id, trip_id, last_read_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT(user_id, trip_id) DO UPDATE SET last_read_at = NOW()
      `, [user.id, tripId]);
    } catch (err) {
      console.error('Failed to update chat read timestamp:', err);
    }

    return NextResponse.json({ messages });
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
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { tripId } = await params;
    const body = await request.json();
    const { message } = body;

    if (!message || message.trim() === '') {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    // Verify user is a participant or organizer
    const participant = await queryOne(
      'SELECT id FROM trip_participants WHERE trip_id = $1 AND user_id = $2',
      [tripId, user.id]
    );

    const trip = await queryOne('SELECT organizer_id FROM trips WHERE id = $1', [tripId]) as any;

    if (!participant && (!trip || trip.organizer_id !== user.id)) {
      return NextResponse.json({ error: 'Unauthorized to send message' }, { status: 403 });
    }

    // Insert message
    const messageId = uuidv4();
    await run(`
      INSERT INTO messages (id, trip_id, sender_id, message)
      VALUES ($1, $2, $3, $4)
    `, [messageId, tripId, user.id, message]);

    return NextResponse.json({ success: true, messageId });
  } catch (err) {
    console.error('Send chat message error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
