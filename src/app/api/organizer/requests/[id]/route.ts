import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { queryOne, transaction } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { notifyUser } from '@/lib/notificationEvents';

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
    const tripRequest = await queryOne(`
      SELECT r.id, r.trip_id, r.requester_id, r.status, t.organizer_id
      FROM trip_requests r
      JOIN trips t ON r.trip_id = t.id
      WHERE r.id = $1
    `, [requestId]) as any;

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
    await transaction(async (client) => {
      // Update request status
      const newStatus = action === 'accept' ? 'accepted' : 'rejected';
      await client.query('UPDATE trip_requests SET status = $1, notification_seen = $2 WHERE id = $3', [newStatus, action === 'accept' ? 0 : 1, requestId]);

      if (action === 'accept') {
        // Check if participant already exists to prevent duplicates
        const existingParticipantResult = await client.query('SELECT id FROM trip_participants WHERE trip_id = $1 AND user_id = $2', [tripRequest.trip_id, tripRequest.requester_id]);
        const existingParticipant = existingParticipantResult.rows[0];

        if (!existingParticipant) {
          // Add to trip participants
          await client.query(`
            INSERT INTO trip_participants (id, trip_id, user_id)
            VALUES ($1, $2, $3)
          `, [uuidv4(), tripRequest.trip_id, tripRequest.requester_id]);
        }
        
        // Also ensure organizer is in the participants list, so they can access the chat
        const organizerParticipantResult = await client.query('SELECT id FROM trip_participants WHERE trip_id = $1 AND user_id = $2', [tripRequest.trip_id, user.id]);
        const organizerParticipant = organizerParticipantResult.rows[0];
        
        if (!organizerParticipant) {
           await client.query(`
            INSERT INTO trip_participants (id, trip_id, user_id)
            VALUES ($1, $2, $3)
          `, [uuidv4(), tripRequest.trip_id, user.id]);
        }
      }
    });

    await notifyUser(tripRequest.requester_id);

    return NextResponse.json({ success: true, message: `Request ${action}ed successfully` });
  } catch (err) {
    console.error('Process request error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
