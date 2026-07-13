import { transaction } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { PaymentOrchestrator } from "./orchestrator";
import { CancellationPolicyEngine } from "./cancellation-policy-engine";

export class BookingCancellationService {
  /**
   * Evaluates, locks, and executes cancellation for a booking, processing refund if applicable.
   */
  static async cancelBooking(input: {
    bookingId: string;
    cancelledBy: "user" | "organizer" | "admin" | "system";
    reason?: string | null;
    userId?: string | null; // check user permission for user/organizer
    forceRefundAmount?: number | null; // admin override
  }): Promise<{
    ok: boolean;
    status: number;
    error?: string;
    refundInitiated?: boolean;
    refundPending?: boolean;
    refundError?: string | null;
    refundAmount?: number;
    cancellationFee?: number;
    bookingId?: string;
    travelerEmail?: string;
    travelerName?: string;
    organizerEmail?: string;
    organizerName?: string;
    tripTitle?: string;
    tripDate?: string;
    bookingRef?: string;
    travelerCount?: number;
  }> {
    try {
      // 1. Transaction block for atomic db status locks, seat releases, outbox triggers
      const result = await transaction(async (client) => {
        // Acquire lock on the booking row first to prevent race conditions
        const lock = await client.query(
          `SELECT id FROM public.trip_bookings WHERE id = $1 FOR UPDATE`,
          [input.bookingId]
        );
        if (lock.rows.length === 0) {
          throw { status: 404, message: "Booking not found" };
        }

        // Fetch booking details without applying FOR UPDATE to nullable left joined tables
        const booking = await client.query(
          `SELECT b.id, b.user_id, b.trip_id, b.status, b.booking_status, b.payment_status,
                  b.amount, b.cancelled_at, b.trip_date, b.booking_ref,
                  b.male_count, b.female_count, b.child_count,
                  t.title as trip_title, t.organizer_id, t.start_date as trip_start_date, t.max_capacity,
                  u.email as traveler_email, u.full_name as traveler_name,
                  org.email as organizer_email, org.full_name as organizer_name,
                  pt.provider_payment_id as razorpay_payment_id
           FROM public.trip_bookings b
           JOIN public.trips t ON b.trip_id = t.id
           JOIN public.users u ON b.user_id = u.id
           JOIN public.users org ON t.organizer_id = org.id
           LEFT JOIN payments.orders po ON po.booking_id = b.id
           LEFT JOIN payments.transactions pt ON pt.order_id = po.id AND pt.status = 'SUCCESS'
           WHERE b.id = $1`,
          [input.bookingId]
        ).then(res => res.rows[0]);

        if (!booking) {
          throw { status: 404, message: "Booking not found" };
        }

        // Authorization checks
        if (input.cancelledBy === "user" && booking.user_id !== input.userId) {
          throw { status: 403, message: "Forbidden: You can only cancel your own bookings" };
        }
        if (input.cancelledBy === "organizer" && booking.organizer_id !== input.userId) {
          throw { status: 403, message: "Forbidden: You can only cancel bookings for your own trips" };
        }

        // Transition states validation
        if (booking.cancelled_at || booking.booking_status === "cancelled") {
          throw { status: 400, message: "Booking is already cancelled" };
        }

        const allowedStates = ["pending_payment", "confirmed", "payment_processing", "cancellation_requested", "refund_pending", "refund_processing", "refund_failed"];
        if (!allowedStates.includes(booking.booking_status)) {
          throw { status: 400, message: `Cannot cancel booking in ${booking.booking_status} state` };
        }

        // Evaluate refund/fees via policy engine. Unpaid/pending bookings never incur a cancellation fee.
        const policyResult = CancellationPolicyEngine.calculateRefund(
          { amount: booking.amount || 0, trip_date: booking.trip_date || booking.trip_start_date }
        );
        const hasSuccessfulPayment = booking.booking_status === "confirmed" && !!booking.razorpay_payment_id;
        if (!hasSuccessfulPayment) {
          policyResult.refundAmount = 0;
          policyResult.cancellationFee = 0;
          policyResult.refundPercentage = 0;
          policyResult.allowed = true;
          policyResult.message = "No payment was captured for this booking.";
        }

        // Support Admin amount overrides
        if (input.cancelledBy === "admin" && input.forceRefundAmount !== undefined && input.forceRefundAmount !== null) {
          const parsed = Math.floor(input.forceRefundAmount);
          policyResult.refundAmount = parsed;
          policyResult.cancellationFee = Math.max(0, (booking.amount || 0) - parsed);
          policyResult.refundPercentage = Math.floor((parsed / (booking.amount || 1)) * 100);
          policyResult.allowed = true;
        }

        // Block cancellation if policy rules forbid it (unless forced by admin/system, or booking is unpaid)
        if (!policyResult.allowed && input.cancelledBy !== "admin" && input.cancelledBy !== "system" && booking.booking_status !== "pending_payment") {
          throw { status: 400, message: policyResult.message };
        }

        const needsRefund = booking.booking_status === "confirmed" && policyResult.refundAmount > 0 && booking.razorpay_payment_id;
        const nextBookingStatus = needsRefund ? "refund_pending" : "cancelled";
        const nextPaymentStatus = needsRefund ? "refund_pending" : "failed";

        // Save cancellation logs
        await client.query(
          `INSERT INTO public.booking_cancellations (
            id, booking_id, cancelled_by, reason, refund_amount, cancellation_fee, refund_status, policy_snapshot
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
           ON CONFLICT (booking_id) DO NOTHING`,
          [
            uuidv4(),
            booking.id,
            input.cancelledBy,
            input.reason || null,
            policyResult.refundAmount,
            policyResult.cancellationFee,
            needsRefund ? "pending" : "no_refund",
            JSON.stringify({
              policy_name: "GoTogether Standard Cancellation Policy",
              free_cancel_before_hours: 72,
              is_refundable: true,
              rules_evaluated: policyResult.rules,
              refund_percentage: policyResult.refundPercentage,
              message: policyResult.message
            })
          ]
        );

        // Update booking fields
        await client.query(
          `UPDATE public.trip_bookings
           SET cancelled_at = NOW(),
               cancel_reason = $1,
               status = 'rejected',
               booking_status = $2,
               payment_status = $3,
               notification_seen = 0
           WHERE id = $4`,
          [input.reason || `Cancelled by ${input.cancelledBy}`, nextBookingStatus, nextPaymentStatus, booking.id]
        );

        // Invalidate tickets
        await client.query(
          `UPDATE public.booking_tickets SET generated_at = NOW() - INTERVAL '1 day' WHERE booking_id = $1`,
          [booking.id]
        );

        // Release reserved seats capacity
        if (booking.max_capacity) {
          const confirmed = await client.query(
            `SELECT COALESCE(SUM(male_count + female_count + child_count), 0) as total
             FROM public.trip_bookings WHERE trip_id = $1 AND booking_status = 'confirmed' AND cancelled_at IS NULL`,
            [booking.trip_id]
          ).then(res => Number(res.rows[0]?.total || 0));

          if (confirmed < booking.max_capacity) {
            await client.query(`UPDATE public.trips SET registration_closed = 0 WHERE id = $1`, [booking.trip_id]);
          }
        }

        // Outbox event triggers
        await client.query(
          `INSERT INTO payments.payment_events_outbox (id, aggregate_type, aggregate_id, event_type, payload)
           VALUES ($1, 'cancellation', $2, 'BookingCancelled', $3::jsonb)`,
          [uuidv4(), booking.id, JSON.stringify({
            bookingId: booking.id,
            tripId: booking.trip_id,
            refundAmount: policyResult.refundAmount,
            cancellationFee: policyResult.cancellationFee,
            cancelledBy: input.cancelledBy,
            reason: input.reason
          })]
        );

        if (needsRefund) {
          await client.query(
            `INSERT INTO payments.payment_events_outbox (id, aggregate_type, aggregate_id, event_type, payload)
             VALUES ($1, 'refund', $2, 'RefundInitiated', $3::jsonb)`,
            [uuidv4(), booking.id, JSON.stringify({
              bookingId: booking.id,
              refundAmount: policyResult.refundAmount,
              reason: input.reason
            })]
          );
        }

        return booking;
      });

      // 2. Perform external Refund processing outside transaction block
      const currentStatus = result.booking_status;
      const policyResult = CancellationPolicyEngine.calculateRefund(
        { amount: result.amount || 0, trip_date: result.trip_date || result.trip_start_date }
      );
      const hasSuccessfulPayment = result.booking_status === "confirmed" && !!result.razorpay_payment_id;
      if (!hasSuccessfulPayment) {
        policyResult.refundAmount = 0;
        policyResult.cancellationFee = 0;
        policyResult.refundPercentage = 0;
        policyResult.allowed = true;
        policyResult.message = "No payment was captured for this booking.";
      }

      if (input.cancelledBy === "admin" && input.forceRefundAmount !== undefined && input.forceRefundAmount !== null) {
        policyResult.refundAmount = input.forceRefundAmount;
      }

      const needsRefund = currentStatus === "confirmed" && policyResult.refundAmount > 0 && result.razorpay_payment_id;

      let refundInitiated = false;
      let refundError: string | null = null;

      if (needsRefund) {
        // Trigger payment provider adapter refund call
        const refundResult = await PaymentOrchestrator.refundBooking(
          result.id,
          input.reason || `Cancelled by ${input.cancelledBy}`,
          policyResult.refundAmount
        );

        if (refundResult.ok) {
          refundInitiated = true;
        } else {
          refundError = refundResult.error || "Gateway refund error";
        }
      }

      return {
        ok: true,
        status: 200,
        refundInitiated,
        refundPending: needsRefund && !refundInitiated,
        refundError,
        refundAmount: policyResult.refundAmount,
        cancellationFee: policyResult.cancellationFee,
        bookingId: result.id,
        travelerEmail: result.traveler_email,
        travelerName: result.traveler_name,
        organizerEmail: result.organizer_email,
        organizerName: result.organizer_name,
        tripTitle: result.trip_title,
        tripDate: result.trip_date || result.trip_start_date,
        bookingRef: result.booking_ref,
        travelerCount: (result.male_count || 0) + (result.female_count || 0) + (result.child_count || 0)
      };

    } catch (err: any) {
      console.error("BookingCancellationService error:", err);
      return {
        ok: false,
        status: err.status || 500,
        error: err.message || "Internal server error"
      };
    }
  }
}

