import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  try {
    const messages = await query(`
      SELECT m.id, m.trip_id,
             u.full_name AS sender_name, t.title AS trip_title
      FROM messages m JOIN users u ON u.id = m.sender_id
      JOIN trips t ON t.id = m.trip_id
      WHERE m.sender_id <> $1 AND m.created_at >= NOW() - INTERVAL '2 minutes'
        AND t.trip_type = 'buddy' AND t.status = 'live' AND t.deleted_at IS NULL
        AND (t.organizer_id = $1 OR EXISTS (
          SELECT 1 FROM trip_participants p WHERE p.trip_id = t.id AND p.user_id = $1
        ))
      ORDER BY m.created_at DESC, m.id DESC LIMIT 50
    `, [user.id]);
    return NextResponse.json({ messages: messages.reverse().map(row => ({ id: row.id, trip_id: row.trip_id, sender_name: row.sender_name, trip_title: row.trip_title, preview: 'Encrypted message received' })) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Chat notification fallback failed:', error);
    return NextResponse.json({ error: 'Could not load chat notifications' }, { status: 500 });
  }
}
