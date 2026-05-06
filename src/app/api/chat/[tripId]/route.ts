import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
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
    const participant = db.prepare(
      'SELECT id FROM trip_participants WHERE trip_id = ? AND user_id = ?'
    ).get(tripId, user.id);

    const trip = db.prepare('SELECT organizer_id FROM trips WHERE id = ?').get(tripId) as any;

    if (!participant && (!trip || trip.organizer_id !== user.id)) {
      return NextResponse.json({ error: 'Unauthorized to view this chat' }, { status: 403 });
    }

    // Fetch messages
    const messages = db.prepare(`
      SELECT m.id, m.message, m.created_at, m.sender_id, u.full_name, u.avatar_url
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.trip_id = ?
      ORDER BY m.created_at ASC
    `).all(tripId);

    // Update last_read_at for this user and trip
    try {
      db.prepare(`
        INSERT INTO user_chat_reads (user_id, trip_id, last_read_at)
        VALUES (?, ?, datetime('now'))
        ON CONFLICT(user_id, trip_id) DO UPDATE SET last_read_at = datetime('now')
      `).run(user.id, tripId);
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
    const participant = db.prepare(
      'SELECT id FROM trip_participants WHERE trip_id = ? AND user_id = ?'
    ).get(tripId, user.id);

    const trip = db.prepare('SELECT organizer_id FROM trips WHERE id = ?').get(tripId) as any;

    if (!participant && (!trip || trip.organizer_id !== user.id)) {
      return NextResponse.json({ error: 'Unauthorized to send message' }, { status: 403 });
    }

    // Insert message
    const messageId = uuidv4();
    db.prepare(`
      INSERT INTO messages (id, trip_id, sender_id, message)
      VALUES (?, ?, ?, ?)
    `).run(messageId, tripId, user.id, message);

    return NextResponse.json({ success: true, messageId });
  } catch (err) {
    console.error('Send chat message error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
