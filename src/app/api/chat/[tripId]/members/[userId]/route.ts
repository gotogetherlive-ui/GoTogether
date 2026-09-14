import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getSession } from '@/lib/auth';
import { transaction } from '@/lib/db';
import { notifyAdmins, notifyUser } from '@/lib/notificationEvents';

export async function POST(request: Request, { params }: { params: Promise<{ tripId: string; userId: string }> }) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
    const { tripId, userId } = await params;
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
    if (!body || !['remove', 'report'].includes(body.action) || (body.reason !== undefined && typeof body.reason !== 'string')) return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
    const reason = (body.reason || '').trim();
    if (reason.length > 2000 || (body.action === 'report' && reason.length < 10)) return NextResponse.json({ error: 'Reports need at least 10 characters. Reasons must be 2,000 characters or fewer.' }, { status: 400 });
    if (userId === user.id) return NextResponse.json({ error: 'You cannot take this action on yourself.' }, { status: 400 });

    const result = await transaction(async client => {
      const { rows: [trip] } = await client.query("SELECT id, organizer_id FROM trips WHERE id = $1 AND trip_type = 'buddy' AND status = 'live' AND deleted_at IS NULL FOR UPDATE", [tripId]);
      if (!trip) return { error: 'Trip not found.', status: 404 };
      const { rows: [target] } = await client.query('SELECT id, status, removed_at FROM trip_requests WHERE trip_id = $1 AND requester_id = $2', [tripId, userId]);
      if (body.action === 'remove') {
        if (trip.organizer_id !== user.id) return { error: 'Only the trip organizer can remove travelers.', status: 403 };
        if (!target || target.status !== 'accepted' || target.removed_at) return { error: 'This traveler is no longer an accepted member.', status: 409 };
        await client.query("UPDATE trip_requests SET status = 'rejected', removed_at = NOW(), removal_reason = $1, notification_seen = 0 WHERE id = $2", [reason || null, target.id]);
        await client.query('DELETE FROM trip_participants WHERE trip_id = $1 AND user_id = $2', [tripId, userId]);
        return { status: 200 };
      }
      const { rows: [reporter] } = await client.query('SELECT id FROM trip_participants WHERE trip_id = $1 AND user_id = $2', [tripId, user.id]);
      if (trip.organizer_id !== user.id && !reporter) return { error: 'Only current trip members can report a traveler from this chat.', status: 403 };
      if (userId !== trip.organizer_id && (!target || (target.status !== 'accepted' && !(trip.organizer_id === user.id && target.removed_at)))) return { error: 'This traveler is not part of this trip.', status: 400 };
      const { rows: [existing] } = await client.query("SELECT id FROM reports WHERE reporter_id = $1 AND reported_user_id = $2 AND reported_trip_id = $3 AND status = 'pending'", [user.id, userId, tripId]);
      if (existing) return { error: 'Your report is already awaiting admin review.', status: 409 };
      await client.query('INSERT INTO reports (id, reporter_id, reported_user_id, reported_trip_id, reason) VALUES ($1,$2,$3,$4,$5)', [randomUUID(), user.id, userId, tripId, reason]);
      return { status: 200 };
    });
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
    if (body.action === 'remove') await Promise.all([notifyUser(userId), notifyUser(user.id)]);
    else await notifyAdmins();
    return NextResponse.json({ success: true, message: body.action === 'remove' ? 'Traveler removed successfully. They no longer have access to this trip chat.' : 'Report sent privately to the admin team for review.' });
  } catch (error) {
    console.error('Buddy member moderation failed:', error);
    return NextResponse.json({ error: 'Could not complete this action. Please try again.' }, { status: 500 });
  }
}
