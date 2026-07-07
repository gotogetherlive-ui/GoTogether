import { query, queryOne, run } from "@/lib/db";
import {
  sendBookingConfirmedToTraveler,
  sendBookingConfirmedToOrganizer,
  sendNewBookingNotificationEmail,
} from "@/lib/email";

export async function processOutboxEvents(limit = 10) {
  const summary = {
    processed: 0,
    failed: 0,
    errors: [] as string[],
  };

  try {
    const events = await query<{ id: string; event_type: string; payload: any }>(
      `SELECT id, event_type, payload
       FROM payments.payment_events_outbox
       WHERE processed_at IS NULL
       ORDER BY created_at ASC
       LIMIT $1`,
      [limit]
    );

    for (const event of events) {
      try {
        const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
        
        if (event.event_type === "booking_created") {
          const booking = await queryOne<any>(
            `SELECT b.id, b.names,
                    t.title as trip_title,
                    u.full_name as traveler_name,
                    org.full_name as organizer_name, org.email as organizer_email
             FROM public.trip_bookings b
             JOIN public.trips t ON b.trip_id = t.id
             JOIN public.users u ON b.user_id = u.id
             JOIN public.users org ON t.organizer_id = org.id
             WHERE b.id = $1`,
            [payload.bookingId]
          );

          if (booking) {
            let passengerNames: string[] = [];
            try {
              passengerNames = JSON.parse(booking.names);
            } catch {
              passengerNames = String(booking.names || "").split(",").map(n => n.trim()).filter(Boolean);
            }

            await sendNewBookingNotificationEmail({
              to: booking.organizer_email,
              organizerName: booking.organizer_name,
              tripTitle: booking.trip_title,
              bookerName: booking.traveler_name,
              passengerCount: passengerNames.length,
            });
          }
        } else if (event.event_type === "booking_confirmed") {
          const booking = await queryOne<any>(
            `SELECT b.id, b.booking_ref, b.amount, b.trip_date, b.names, b.phone_number as traveler_phone,
                    t.title as trip_title, t.destination, t.pickup_point,
                    u.full_name as traveler_name, u.email as traveler_email,
                    org.full_name as organizer_name, org.email as organizer_email, org.phone_number as organizer_phone,
                    bt.ticket_number
             FROM public.trip_bookings b
             JOIN public.trips t ON b.trip_id = t.id
             JOIN public.users u ON b.user_id = u.id
             JOIN public.users org ON t.organizer_id = org.id
             LEFT JOIN public.booking_tickets bt ON bt.booking_id = b.id
             WHERE b.id = $1`,
            [payload.bookingId]
          );

          if (booking) {
            let passengerNames: string[] = [];
            try {
              passengerNames = JSON.parse(booking.names);
            } catch {
              passengerNames = String(booking.names || "").split(",").map(n => n.trim()).filter(Boolean);
            }

            // Send confirmation email to traveler
            await sendBookingConfirmedToTraveler({
              to: booking.traveler_email,
              userName: booking.traveler_name,
              tripTitle: booking.trip_title,
              tripDate: booking.trip_date,
              pickupLocation: booking.pickup_point || "",
              destination: booking.destination,
              bookingId: booking.booking_ref || booking.id,
              ticketNumber: payload.ticketNumber || booking.ticket_number || "",
              organizerName: booking.organizer_name,
              organizerPhone: booking.organizer_phone,
              amountPaid: Number(booking.amount) / 100, // convert paise to INR
              razorpayPaymentId: payload.paymentId || "",
            });

            // Send confirmation email to organizer
            await sendBookingConfirmedToOrganizer({
              to: booking.organizer_email,
              organizerName: booking.organizer_name,
              tripTitle: booking.trip_title,
              tripDate: booking.trip_date,
              pickupLocation: booking.pickup_point || "",
              destination: booking.destination,
              bookingId: booking.booking_ref || booking.id,
              travelerName: booking.traveler_name,
              travelerAge: null,
              travelerGender: null,
              travelerFoodPref: null,
              travelerProfession: null,
              travelerPhone: booking.traveler_phone || "",
              travelerEmail: booking.traveler_email,
              travelerCount: passengerNames.length,
              passengerNames,
              amountPaid: Number(booking.amount) / 100,
              razorpayPaymentId: payload.paymentId || "",
            });
          }
        } else if (
          // Cancellation & refund lifecycle events — these are informational audit trail entries.
          // Traveler notifications for these events are dispatched via SSE (notifyUser) in the cancel route,
          // and email notifications via sendBusinessTripCancelledEmail in the trip deletion route.
          // Mark them as processed so they don't accumulate in the outbox.
          event.event_type === "BookingCancelled" ||
          event.event_type === "RefundInitiated" ||
          event.event_type === "RefundCompleted" ||
          event.event_type === "RefundFailed" ||
          event.event_type === "TripCancellationStarted" ||
          event.event_type === "TripCancellationCompleted"
        ) {
          // Lifecycle events — processed (notifications handled elsewhere)
        }

        // Mark outbox event processed
        await run(
          `UPDATE payments.payment_events_outbox SET processed_at = NOW() WHERE id = $1`,
          [event.id]
        );
        summary.processed++;
      } catch (err: any) {
        summary.failed++;
        summary.errors.push(`Failed to process event ${event.id}: ${err.message}`);
      }
    }
  } catch (err: any) {
    summary.errors.push(`Failed to fetch outbox events: ${err.message}`);
  }

  return summary;
}
