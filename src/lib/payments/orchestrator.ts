import type { SessionUser } from "@/lib/auth";
import {
  acknowledgeFrontendPayment,
  confirmPaymentFromWebhook,
  createBookingPaymentOrder,
  expirePendingPaymentBookings,
  getLatestPaymentForBooking,
  processPendingRefunds,
  publicPaymentStatus,
  requestBookingRefund,
} from "./service";
import type { PaymentProvider } from "./domain";
import { transaction } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export interface ConfirmWebhookPaymentInput {
  provider: PaymentProvider;
  providerOrderId: string;
  providerPaymentId: string;
  amount: number;
  currency?: string;
  method?: string | null;
  rawPayment: unknown;
}

export class PaymentOrchestrator {
  static startBooking(user: SessionUser, rawBody: unknown) {
    return createBookingPaymentOrder(user, rawBody);
  }

  static verifyPayment(user: SessionUser, body: unknown) {
    return acknowledgeFrontendPayment(user, body);
  }

  static confirmPayment(input: ConfirmWebhookPaymentInput) {
    return confirmPaymentFromWebhook(input);
  }

  static refundBooking(bookingId: string, reason: string, overrideAmount?: number | null) {
    return requestBookingRefund(bookingId, reason, overrideAmount);
  }

  static expireBookings() {
    return expirePendingPaymentBookings();
  }

  static processRefundRetries(limit?: number) {
    return processPendingRefunds(limit);
  }

  static getPaymentStatus(bookingId: string) {
    return getLatestPaymentForBooking(bookingId);
  }

  static toPublicPaymentStatus(status: string) {
    return publicPaymentStatus(status);
  }

  static async confirmRefund(input: { providerRefundId: string; status: 'processed' | 'failed'; raw: unknown }) {
    return transaction(async (client) => {
      const refund = await client.query(
        `SELECT r.refund_id, o.booking_id, tb.booking_status, tb.trip_id
         FROM payments.refunds r
         JOIN payments.transactions pt ON r.transaction_id = pt.transaction_id
         JOIN payments.orders o ON pt.order_id = o.id
         JOIN public.trip_bookings tb ON o.booking_id = tb.id
         WHERE r.provider_refund_id = $1 FOR UPDATE`,
        [input.providerRefundId]
      ).then(res => res.rows[0]);

      if (!refund) return { ok: false, error: "Refund not found" };

      const nextStatus = input.status === "processed" ? "SUCCESS" : "FAILED";
      const cancellationStatus = input.status === "processed" ? "success" : "failed";
      // Determine if this booking is part of an organizer-initiated trip cancellation.
      // After a failed refund retry, booking_status is 'refund_failed', not 'trip_cancelled',
      // so we also check the trip's status to preserve the trip_cancelled semantics.
      const isTripCancellation = refund.booking_status === "trip_cancelled" 
        || refund.booking_status === "refund_failed";
      const nextBookingStatus = input.status === "processed"
        ? (isTripCancellation ? "trip_cancelled" : "cancelled")
        : "refund_failed";
      const nextPaymentStatus = input.status === "processed" ? "refunded" : "refund_failed";

      // 1. Update refunds table
      await client.query(
        `UPDATE payments.refunds SET status = $1, provider_response = $2::jsonb, updated_at = NOW() WHERE refund_id = $3`,
        [nextStatus, JSON.stringify(input.raw), refund.refund_id]
      );

      // 2. Update cancellations table
      await client.query(
        `UPDATE public.booking_cancellations SET refund_status = $1, updated_at = NOW() WHERE booking_id = $2`,
        [cancellationStatus, refund.booking_id]
      );

      // 3. Update bookings table
      await client.query(
        `UPDATE public.trip_bookings SET booking_status = $1, payment_status = $2, notification_seen = 0 WHERE id = $3`,
        [nextBookingStatus, nextPaymentStatus, refund.booking_id]
      );

      // 4. Enqueue Outbox events
      await client.query(
        `INSERT INTO payments.payment_events_outbox (id, aggregate_type, aggregate_id, event_type, payload)
         VALUES ($1, 'refund', $2, $3, $4::jsonb)`,
        [uuidv4(), refund.booking_id, input.status === "processed" ? "RefundCompleted" : "RefundFailed", JSON.stringify({
          bookingId: refund.booking_id,
          refundId: refund.refund_id,
          providerRefundId: input.providerRefundId
        })]
      );

      // 5. If this booking is part of an organizer trip cancellation, check if all bookings are processed
      const trip = await client.query(
        `SELECT status FROM public.trips WHERE id = $1 FOR UPDATE`,
        [refund.trip_id]
      ).then(res => res.rows[0]);

      if (trip && trip.status === 'refunds_processing') {
        const remainingCount = await client.query(
          `SELECT COUNT(id) as count 
           FROM public.trip_bookings 
           WHERE trip_id = $1 
             AND booking_status IN ('trip_cancelled', 'refund_failed')
             AND payment_status IN ('refund_pending', 'refund_failed')`,
          [refund.trip_id]
        ).then(res => Number(res.rows[0]?.count || 0));

        if (remainingCount === 0) {
          await client.query(
            `UPDATE public.trips SET status = 'cancelled' WHERE id = $1`,
            [refund.trip_id]
          );
          await client.query(
            `UPDATE public.trip_cancellations SET completed_at = NOW() WHERE trip_id = $1`,
            [refund.trip_id]
          );
          await client.query(
            `INSERT INTO payments.payment_events_outbox (id, aggregate_type, aggregate_id, event_type, payload)
             VALUES ($1, 'trip', $2, 'TripCancellationCompleted', $3::jsonb)`,
            [uuidv4(), refund.trip_id, JSON.stringify({ tripId: refund.trip_id })]
          );
        }
      }

      return { ok: true };
    });
  }
}
