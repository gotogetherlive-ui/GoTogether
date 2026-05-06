import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id: requestId } = await params;
    const body = await request.json();
    const { action } = body; // 'accept' or 'reject'

    if (!action || !['accept', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Check if the request exists and the current user is the organizer of the trip
    const tripRequest = db.prepare(`
      SELECT r.id, r.trip_id, r.requester_id, r.status, t.organizer_id
      FROM trip_requests r
      JOIN trips t ON r.trip_id = t.id
      WHERE r.id = ?
    `).get(requestId) as any;

    if (!tripRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (tripRequest.organizer_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (tripRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Request is already processed' }, { status: 400 });
    }

    // Begin transaction to ensure data integrity
    const processRequest = db.transaction(() => {
      // Update request status
      const newStatus = action === 'accept' ? 'accepted' : 'rejected';
      db.prepare('UPDATE trip_requests SET status = ?, notification_seen = 1 WHERE id = ?').run(newStatus, requestId);

      if (action === 'accept') {
        // Check if participant already exists to prevent duplicates
        const existingParticipant = db.prepare(
          'SELECT id FROM trip_participants WHERE trip_id = ? AND user_id = ?'
        ).get(tripRequest.trip_id, tripRequest.requester_id);

        if (!existingParticipant) {
          // Add to trip participants
          db.prepare(`
            INSERT INTO trip_participants (id, trip_id, user_id)
            VALUES (?, ?, ?)
          `).run(uuidv4(), tripRequest.trip_id, tripRequest.requester_id);
        }
        
        // Also ensure organizer is in the participants list, so they can access the chat
        const organizerParticipant = db.prepare(
          'SELECT id FROM trip_participants WHERE trip_id = ? AND user_id = ?'
        ).get(tripRequest.trip_id, user.id);
        
        if (!organizerParticipant) {
           db.prepare(`
            INSERT INTO trip_participants (id, trip_id, user_id)
            VALUES (?, ?, ?)
          `).run(uuidv4(), tripRequest.trip_id, user.id);
        }
      }
    });

    processRequest();

    return NextResponse.json({ success: true, message: `Request ${action}ed successfully` });
  } catch (err) {
    console.error('Process request error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
