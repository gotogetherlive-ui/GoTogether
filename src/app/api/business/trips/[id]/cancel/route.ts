import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { transaction } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { PaymentOrchestrator } from '@/lib/payments/orchestrator';
import { notifyUser, notifyAdmins } from '@/lib/notificationEvents';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user || user.role !== 'business') {
      return NextResponse.json({ error: 'Not authenticated as a business' }, { status: 401 });
    }

    const { id: tripId } = await params;
    const body = await request.json().catch(() => ({}));
    const { reason_type: reasonType, reason } = body;

    if (!reasonType || !reason) {
      return NextResponse.json({ error: 'Missing reason_type or reason' }, { status: 400 });
    }

    const result = await transaction(async (client) => {
      // 1. Lock trip and verify owner/status
      // Use pg_advisory_xact_lock to prevent concurrent cancellation operations on the same trip
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [tripId]);

      const trip = await client.query(
        `SELECT id, organizer_id, status, title FROM public.trips WHERE id = $1 FOR UPDATE`,
        [tripId]
      ).then(res => res.rows[0]);

      if (!trip) {
        throw { status: 404, message: "Trip not found" };
      }

      if (trip.organizer_id !== user.id) {
        throw { status: 403, message: "Not authorized to cancel this trip" };
      }

      if (['cancelling', 'refunds_processing', 'refunds_completed', 'cancelled', 'archived', 'deleted'].includes(trip.status)) {
        throw { status: 400, message: "Trip is already cancelled or cancelling" };
      }

      // 2. Insert immutable trip cancellation audit log
      const cancellationId = uuidv4();
      await client.query(
        `INSERT INTO public.trip_cancellations (id, trip_id, cancelled_by, reason, reason_type, started_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [cancellationId, tripId, user.id, reason, reasonType]
      );

      // 3. Move trip to CANCELLING state
      await client.query(
        `UPDATE public.trips SET status = 'cancelling', registration_closed = 1 WHERE id = $1`,
        [tripId]
      );

      // 4. Publish outbox event
      await client.query(
        `INSERT INTO payments.payment_events_outbox (id, aggregate_type, aggregate_id, event_type, payload)
         VALUES ($1, 'trip', $2, 'TripCancellationStarted', $3::jsonb)`,
        [uuidv4(), tripId, JSON.stringify({ tripId, title: trip.title, reasonType, reason, cancelledBy: user.id })]
      );

      // 5. Lock and Query active bookings separately to avoid FOR UPDATE outer join issues in pg
      await client.query(
        `SELECT id FROM public.trip_bookings 
         WHERE trip_id = $1 
           AND booking_status IN ('confirmed', 'payment_processing', 'refund_pending')
           AND cancelled_at IS NULL
         FOR UPDATE`,
        [tripId]
      );

      const bookings = await client.query(
        `SELECT b.id, b.user_id, b.amount, b.booking_ref,
                pt.transaction_id, pt.provider, pt.provider_payment_id, po.provider_account_id
         FROM public.trip_bookings b
         LEFT JOIN payments.orders po ON po.booking_id = b.id
         LEFT JOIN payments.transactions pt ON pt.order_id = po.id AND pt.status = 'SUCCESS'
         WHERE b.trip_id = $1 
           AND b.booking_status IN ('confirmed', 'payment_processing', 'refund_pending')
           AND b.cancelled_at IS NULL`,
        [tripId]
      ).then(res => res.rows);

      const refundBookings: Array<{
        bookingId: string;
        userId: string;
      }> = [];

      for (const booking of bookings) {
        // Update booking fields
        await client.query(
          `UPDATE public.trip_bookings
           SET booking_status = 'trip_cancelled',
               payment_status = 'refund_pending',
               cancelled_at = NOW(),
               cancel_reason = 'ORGANIZER_CANCELLED_TRIP',
               status = 'rejected',
               user_notification_seen = 0
           WHERE id = $1`,
          [booking.id]
        );

        // Invalidate tickets
        await client.query(
          `UPDATE public.booking_tickets SET generated_at = NOW() - INTERVAL '1 day' WHERE booking_id = $1`,
          [booking.id]
        );

        // If paid, create refund intent
        if (booking.transaction_id) {
          const refundId = uuidv4();
          await client.query(
            `INSERT INTO payments.refunds (refund_id, transaction_id, amount, reason, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, 'PENDING', NOW(), NOW())`,
            [refundId, booking.transaction_id, booking.amount, `Trip Cancelled: ${reasonType}`]
          );

          // Enqueue outbox event for this refund
          await client.query(
            `INSERT INTO payments.payment_events_outbox (id, aggregate_type, aggregate_id, event_type, payload)
             VALUES ($1, 'refund', $2, 'RefundInitiated', $3::jsonb)`,
            [uuidv4(), booking.id, JSON.stringify({ bookingId: booking.id, refundAmount: booking.amount, reason: `Trip Cancelled: ${reason}` })]
          );

          refundBookings.push({ bookingId: booking.id, userId: booking.user_id });
        }
      }

      if (refundBookings.length === 0) {
        // If there are no refunds to process, transition directly to cancelled
        await client.query(
          `UPDATE public.trips SET status = 'cancelled' WHERE id = $1`,
          [tripId]
        );
        await client.query(
          `UPDATE public.trip_cancellations SET completed_at = NOW() WHERE trip_id = $1`,
          [tripId]
        );
      } else {
        // Update trip to refunds_processing
        await client.query(
          `UPDATE public.trips SET status = 'refunds_processing' WHERE id = $1`,
          [tripId]
        );
      }

      return { tripId, title: trip.title, bookingsCount: bookings.length, refundBookings };
    });

    // 6. Asynchronously initiate refunds via gateway for small batches (<= 5 bookings)
    // For larger volumes, we rely on the background worker/cron to process the enqueued PENDING refund records.
    // This prevents memory/socket exhaustion, gateway rate limits, and request timeouts.
    if (result.refundBookings.length > 0) {
      if (result.refundBookings.length <= 5) {
        (async () => {
          for (const rb of result.refundBookings) {
            try {
              await PaymentOrchestrator.refundBooking(rb.bookingId, `Organizer Cancelled Trip: ${reasonType}`);
              void notifyUser(rb.userId);
            } catch (err) {
              console.error(`[ORGANIZER CANCEL] Gateway refund trigger failed for booking ${rb.bookingId}:`, err);
            }
          }
          notifyAdmins();
        })();
      } else {
        // Large-scale trip cancellation: send immediate notifications to users,
        // but let the asynchronous cron worker process the actual refunds in batch.
        (async () => {
          for (const rb of result.refundBookings) {
            try {
              void notifyUser(rb.userId);
            } catch (err) {
              console.error(`[ORGANIZER CANCEL] Notification trigger failed for booking ${rb.bookingId}:`, err);
            }
          }
          notifyAdmins();
        })();
      }
    }

    return NextResponse.json({ success: true, message: `Trip cancellation started. Affected bookings: ${result.bookingsCount}` });

  } catch (err: any) {
    console.error('Organizer cancel trip error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: err.status || 500 });
  }
}
