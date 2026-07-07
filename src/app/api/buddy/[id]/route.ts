import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query, queryOne, run } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { sendBuddyTripEditedEmail, sendBuddyTripCancelledEmail } from '@/lib/email';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { starting_location, destination, start_date, trip_date, duration_days, duration_nights, image_url } = body;
    const finalStartDate = start_date || trip_date;

    if (
      (starting_location === undefined || starting_location === null || starting_location.trim() === '') &&
      (destination === undefined || destination === null || destination.trim() === '') &&
      (finalStartDate === undefined || finalStartDate === null || finalStartDate.trim() === '') &&
      (duration_days === undefined || duration_days === null || duration_days.toString().trim() === '') &&
      (duration_nights === undefined || duration_nights === null || duration_nights.toString().trim() === '') &&
      (image_url === undefined)
    ) {
      return NextResponse.json({ error: 'At least one field must be provided' }, { status: 400 });
    }

    // Check if the trip exists and belongs to the user
    const trip = await queryOne('SELECT organizer_id, title, starting_location, destination, start_date, duration_days, duration_nights, image_url FROM trips WHERE id = $1', [id]) as any;
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    if (trip.organizer_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Merge old and new values
    const updatedStartingLocation = (starting_location !== undefined && starting_location !== null && starting_location.trim() !== '') ? starting_location.trim() : trip.starting_location;
    const updatedDestination = (destination !== undefined && destination !== null && destination.trim() !== '') ? destination.trim() : trip.destination;
    const updatedStartDate = (finalStartDate !== undefined && finalStartDate !== null && finalStartDate.trim() !== '') ? finalStartDate.trim() : trip.start_date;
    
    const updatedDurationDays = (duration_days !== undefined && duration_days !== null && parseInt(duration_days) > 0) ? parseInt(duration_days) : trip.duration_days;
    const updatedDurationNights = (duration_nights !== undefined && duration_nights !== null && parseInt(duration_nights) >= 0) ? parseInt(duration_nights) : trip.duration_nights;
    const updatedImageUrl = (image_url !== undefined) ? (image_url === '' ? null : image_url) : trip.image_url;

    // Update the trip dates, locations, and title
    const title = `Trip to ${updatedDestination}`;
    await run(`
      UPDATE trips 
      SET starting_location = $1, destination = $2, start_date = $3, title = $4, duration_days = $5, duration_nights = $6, image_url = $7
      WHERE id = $8
    `, [updatedStartingLocation, updatedDestination, updatedStartDate, title, updatedDurationDays, updatedDurationNights, updatedImageUrl, id]);

    // Find all accepted participants
    const participants = await query(`
      SELECT u.id, u.email, u.full_name
      FROM trip_participants tp
      JOIN users u ON tp.user_id = u.id
      WHERE tp.trip_id = $1 AND tp.user_id != $2
    `, [id, user.id]) as { id: string; email: string; full_name: string }[];

    if (participants.length > 0) {
      // 1. Insert a system message into the chat room
      const systemMessage = `[SYSTEM] Trip details have been updated:\nDestination: ${updatedDestination}\nStart Date: ${updatedStartDate || 'Not specified'}\nStarting Location: ${updatedStartingLocation || 'Not specified'}\nDuration: ${updatedDurationDays} Days / ${updatedDurationNights} Nights`;
      await run(`
        INSERT INTO messages (id, trip_id, sender_id, message)
        VALUES ($1, $2, $3, $4)
      `, [uuidv4(), id, user.id, systemMessage]);

      // 2. Send email to each participant (fire-and-forget)
      const newDetails = {
        starting_location: updatedStartingLocation || 'Not specified',
        destination: updatedDestination || 'Not specified',
        start_date: updatedStartDate || 'Not specified',
      };

      for (const participant of participants) {
        sendBuddyTripEditedEmail({
          to: participant.email,
          userName: participant.full_name,
          organizerName: user.full_name || user.email,
          tripTitle: trip.title,
          newDetails,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Update buddy trip error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    // Check if the trip exists and belongs to the user
    const trip = await queryOne('SELECT organizer_id, title FROM trips WHERE id = $1', [id]) as any;
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    if (trip.organizer_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Soft-delete by setting status to 'deleted' and setting deleted_at timestamp
    await run("UPDATE trips SET status = 'deleted', deleted_at = NOW() WHERE id = $1", [id]);

    // Find all accepted participants
    const participants = await query(`
      SELECT u.id, u.email, u.full_name
      FROM trip_participants tp
      JOIN users u ON tp.user_id = u.id
      WHERE tp.trip_id = $1 AND tp.user_id != $2
    `, [id, user.id]) as { id: string; email: string; full_name: string }[];

    if (participants.length > 0) {
      // 1. Insert a system message into the chat room
      const systemMessage = `[SYSTEM] This trip has been cancelled by the organizer.`;
      await run(`
        INSERT INTO messages (id, trip_id, sender_id, message)
        VALUES ($1, $2, $3, $4)
      `, [uuidv4(), id, user.id, systemMessage]);

      // 2. Send cancellation email to each participant
      for (const participant of participants) {
        sendBuddyTripCancelledEmail({
          to: participant.email,
          userName: participant.full_name,
          organizerName: user.full_name || user.email,
          tripTitle: trip.title,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete buddy trip error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
