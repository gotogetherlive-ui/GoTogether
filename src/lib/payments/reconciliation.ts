import { query, queryOne, run } from "@/lib/db";
import { PAYMENT_MODE, PAYMENT_STATUS } from "./domain";
import { PaymentOrchestrator } from "./orchestrator";
import { getPaymentProviderAdapter } from "./adapters/registry";
import { findProviderAccountById, markPaymentEventProcessed } from "./repository";
import { processOutboxEvents } from "./outbox";

export async function reconcilePayments() {
  const summary = {
    webhookEventsReprocessed: 0,
    ordersSynced: 0,
    bookingsConfirmed: 0,
    expiredBookings: 0,
    outboxEventsProcessed: 0,
    outboxEventsFailed: 0,
    errors: [] as string[],
  };

  // 1. Reprocess stuck webhook events
  try {
    const stuckEvents = await query<{ id: string; provider: string; provider_event_id: string }>(
      `SELECT e.id, e.provider, e.provider_event_id
       FROM payments.payment_events e
       WHERE e.processed_at IS NULL
         AND e.created_at < NOW() - INTERVAL '2 minutes'
       LIMIT 10`
    );

    for (const event of stuckEvents) {
      try {
        const webhookLog = await queryOne<{ payload: any }>(
          `SELECT payload FROM payments.webhook_logs
           WHERE provider = $1 AND provider_event_id = $2
           ORDER BY created_at DESC LIMIT 1`,
          [event.provider, event.provider_event_id]
        );

        if (webhookLog?.payload) {
          const parsed = getPaymentProviderAdapter(event.provider as any).parseWebhook(
            JSON.stringify(webhookLog.payload),
            new Headers()
          );

          if (parsed.payment) {
            const result = await PaymentOrchestrator.confirmPayment({
              provider: event.provider as any,
              providerOrderId: parsed.payment.providerOrderId,
              providerPaymentId: parsed.payment.providerPaymentId,
              amount: parsed.payment.amount,
              currency: parsed.payment.currency,
              method: parsed.payment.method,
              rawPayment: parsed.payment.raw,
            });

            if (result.ok) {
              await markPaymentEventProcessed(event.id);
              summary.webhookEventsReprocessed++;
            }
          }
        }
      } catch (err: any) {
        summary.errors.push(`Stuck event ${event.provider_event_id} failed: ${err.message}`);
      }
    }
  } catch (err: any) {
    summary.errors.push(`Webhook reprocessing query failed: ${err.message}`);
  }

  // 2. Sync stuck/pending orders with Gateway API
  try {
    const pendingOrders = await query<{
      id: string;
      provider: string;
      provider_order_id: string;
      provider_account_id: string | null;
      payment_mode: string | null;
    }>(
      `SELECT id, provider, provider_order_id, provider_account_id, payment_mode
       FROM payments.orders
       WHERE status IN ('CREATED', 'PENDING', 'PROCESSING')
         AND created_at < NOW() - INTERVAL '5 minutes'
         AND expires_at > NOW()
       LIMIT 10`
    );

    for (const order of pendingOrders) {
      if (!order.provider_order_id) continue;
      try {
        const adapter = getPaymentProviderAdapter(order.provider as any);
        if (adapter.fetchOrderStatus) {
          const providerAccount = await findProviderAccountById(order.provider_account_id);
          if (order.payment_mode === PAYMENT_MODE.ORGANIZER_OWNED && !providerAccount) {
            summary.errors.push(`Order sync ${order.provider_order_id} skipped: organizer provider account missing`);
            continue;
          }

          const res = await adapter.fetchOrderStatus(order.provider_order_id, providerAccount);
          if (res) {
            if (res.status === PAYMENT_STATUS.SUCCESS) {
              // Confirm the payment
              const providerPaymentId = (res.raw as any).payments?.items?.[0]?.id || `sync_${order.provider_order_id}`;
              await PaymentOrchestrator.confirmPayment({
                provider: order.provider as any,
                providerOrderId: order.provider_order_id,
                providerPaymentId,
                amount: (res.raw as any).amount || 0,
                currency: (res.raw as any).currency || "INR",
                method: (res.raw as any).payments?.items?.[0]?.method || "synced",
                rawPayment: res.raw,
              });
              summary.ordersSynced++;
            } else if (res.status === PAYMENT_STATUS.FAILED) {
              await run(
                `UPDATE payments.orders SET status = 'FAILED', updated_at = NOW() WHERE id = $1`,
                [order.id]
              );
              summary.ordersSynced++;
            }
          }
        }
      } catch (err: any) {
        summary.errors.push(`Order sync ${order.provider_order_id} failed: ${err.message}`);
      }
    }
  } catch (err: any) {
    summary.errors.push(`Order sync query failed: ${err.message}`);
  }

  // 3. Auto-confirm bookings that paid but got stuck
  try {
    const stuckBookings = await query<{ id: string; booking_ref: string; provider_order_id: string; provider_payment_id: string; amount: number; currency: string; provider: string }>(
      `SELECT b.id, b.booking_ref, o.provider_order_id, t.provider_payment_id, t.amount, t.currency, t.provider
       FROM public.trip_bookings b
       JOIN payments.orders o ON o.booking_id = b.id
       JOIN payments.transactions t ON t.order_id = o.id
       WHERE b.booking_status IN ('pending_payment', 'payment_processing')
         AND t.status = 'SUCCESS'
       LIMIT 10`
    );

    for (const b of stuckBookings) {
      try {
        await PaymentOrchestrator.confirmPayment({
          provider: b.provider as any,
          providerOrderId: b.provider_order_id,
          providerPaymentId: b.provider_payment_id,
          amount: b.amount,
          currency: b.currency,
          method: "reconciliation_forced",
          rawPayment: { forced_reconciliation: true },
        });
        summary.bookingsConfirmed++;
      } catch (err: any) {
        summary.errors.push(`Booking confirm ${b.booking_ref} failed: ${err.message}`);
      }
    }
  } catch (err: any) {
    summary.errors.push(`Stuck bookings query failed: ${err.message}`);
  }

  // 4. Auto-expire expired bookings
  try {
    const expiredCount = await PaymentOrchestrator.expireBookings();
    summary.expiredBookings = expiredCount;
  } catch (err: any) {
    summary.errors.push(`Booking expiration failed: ${err.message}`);
  }

  // 5. Process pending Transactional Outbox Events (Emails/Notifications)
  try {
    const outboxRes = await processOutboxEvents(20);
    summary.outboxEventsProcessed = outboxRes.processed;
    summary.outboxEventsFailed = outboxRes.failed;
    if (outboxRes.errors.length) {
      summary.errors.push(...outboxRes.errors);
    }
  } catch (err: any) {
    summary.errors.push(`Outbox processing failed: ${err.message}`);
  }

  // Record reconciliation job status
  try {
    const jobId = Math.random().toString(36).substring(2, 15);
    await run(
      `INSERT INTO payments.reconciliation_jobs (id, status, started_at, finished_at, summary)
       VALUES ($1, 'SUCCESS', NOW() - INTERVAL '1 second', NOW(), $2::jsonb)`,
      [jobId, JSON.stringify(summary)]
    );
  } catch (err) {
    console.error("Failed to log reconciliation job status:", err);
  }

  return summary;
}


