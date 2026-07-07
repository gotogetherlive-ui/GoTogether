import { NextResponse } from 'next/server';
import { PAYMENT_PROVIDER, type PaymentProvider } from '@/lib/payments/domain';
import { isPaymentProviderImplemented, normalizePaymentProvider } from '@/lib/payments/provider-config';
import { PaymentService } from '@/lib/payments/payment-service';
import { PaymentOrchestrator } from '@/lib/payments/orchestrator';
import {
  claimPaymentEvent,
  logWebhook,
  markPaymentEventProcessed,
  findProviderAccountByProviderAccountId,
  findProviderAccountByRefundProviderId,
  findProviderAccountById,
  findOrderByProviderOrderId,
} from '@/lib/payments/repository';
import { hashPayload } from '@/lib/payments/utils';
import { run } from '@/lib/db';
import { processOutboxEvents } from '@/lib/payments/outbox';


export async function POST(request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider: rawProvider } = await context.params;
  const provider = normalizePaymentProvider(rawProvider);
  const rawText = await request.text();
  const contentType = request.headers.get('content-type') || '';
  const formPayload = contentType.includes('application/x-www-form-urlencoded')
    ? Object.fromEntries(new URLSearchParams(rawText))
    : null;
  const rawBody = formPayload ? JSON.stringify(formPayload) : rawText;
  const signature = request.headers.get('x-razorpay-signature')
    || request.headers.get('x-webhook-signature')
    || request.headers.get('x-cashfree-signature')
    || (formPayload ? String(formPayload.CHECKSUMHASH || formPayload.checksumhash || formPayload.hash || '') : null);
  const shouldRedirectAfterCallback = request.url.includes('redirect=1');

  if (!provider) {
    await logWebhook({ provider: PAYMENT_PROVIDER.RAZORPAY, eventType: 'unsupported_provider', payload: { provider: rawProvider }, signature, responseStatus: 400, processed: false, error: 'Unsupported provider' });
    return NextResponse.json({ error: 'Unsupported payment provider' }, { status: 400 });
  }

  if (!isPaymentProviderImplemented(provider)) {
    await logWebhook({ provider, eventType: 'provider_not_enabled', payload: { provider: rawProvider }, signature, responseStatus: 501, processed: false, error: 'Payment provider adapter is not implemented' });
    return NextResponse.json({ error: 'Payment provider is not enabled for production' }, { status: 501 });
  }

  let parsed;
  try {
    parsed = PaymentService.parseWebhook(provider, rawBody, request.headers);
  } catch {
    await logWebhook({ provider, eventType: 'invalid_json', payload: { rawBody }, signature, responseStatus: 400, processed: false, error: 'Invalid JSON' });
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  // Resolve ProviderAccount context prior to webhook verification. Prefer the
  // internally stored order/refund account over any account identifier in the
  // webhook body, then reject mismatches for defense in depth.
  let providerAccount = null;
  try {
    const jsonBody = JSON.parse(rawBody);
    const accountId = jsonBody.account_id || jsonBody.merchant_id;
    const payloadAccount = accountId ? await findProviderAccountByProviderAccountId(provider, String(accountId)) : null;

    if (parsed.payment?.providerOrderId) {
      const order = await findOrderByProviderOrderId(provider, parsed.payment.providerOrderId);
      if (order) providerAccount = await findProviderAccountById(order.provider_account_id);
    } else if (parsed.refund?.providerRefundId) {
      providerAccount = await findProviderAccountByRefundProviderId(provider, parsed.refund.providerRefundId);
    }

    if (payloadAccount && providerAccount && payloadAccount.id !== providerAccount.id) {
      await logWebhook({ provider, eventType: parsed.eventType, providerEventId: parsed.providerEventId, payload: parsed.rawEvent, signature, responseStatus: 400, processed: false, error: 'Webhook provider account mismatch' });
      return NextResponse.json({ error: 'Invalid provider account context' }, { status: 400 });
    }

    if (!providerAccount) providerAccount = payloadAccount;
  } catch (err) {
    console.error("Error resolving provider account context for webhook:", err);
  }

  if (!(await PaymentService.verifyWebhook({ provider, rawBody, signature, headers: request.headers, providerAccount }))) {
    await logWebhook({ provider, eventType: parsed.eventType, providerEventId: parsed.providerEventId, payload: parsed.rawEvent, signature, responseStatus: 400, processed: false, error: 'Invalid signature' });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const webhookLogId = await logWebhook({ provider, eventType: parsed.eventType, providerEventId: parsed.providerEventId, payload: parsed.rawEvent, signature, responseStatus: 200, processed: false });
  const eventClaim = await claimPaymentEvent({ provider, providerEventId: parsed.providerEventId, payloadHash: hashPayload(rawBody) });
  if (!eventClaim) {
    await logWebhook({ provider, eventType: parsed.eventType, providerEventId: parsed.providerEventId, payload: { duplicateOf: parsed.providerEventId, webhookLogId }, signature, responseStatus: 200, processed: true });
    return NextResponse.json({ status: 'duplicate_ignored' });
  }
  const eventId = eventClaim.id;

  if (parsed.eventType === 'refund.processed' || parsed.eventType === 'refund.failed') {
    if (!parsed.refund) {
      await logWebhook({ provider, eventType: parsed.eventType, providerEventId: parsed.providerEventId, payload: parsed.rawEvent, signature, responseStatus: 400, processed: false, error: 'Missing refund entity' });
      return NextResponse.json({ error: 'Invalid refund event' }, { status: 400 });
    }

    const refundPayload = {
      providerRefundId: parsed.refund.providerRefundId,
      status: parsed.eventType === 'refund.processed' ? 'processed' as const : 'failed' as const,
      raw: parsed.refund.raw
    };

    try {
      const result = await PaymentOrchestrator.confirmRefund(refundPayload);
      if (!result.ok) {
        throw new Error(result.error);
      }
      await markPaymentEventProcessed(eventId);
      await run(
        `UPDATE payments.webhook_logs
         SET processed = TRUE, response_status = 200, processed_at = NOW()
         WHERE id = $1`,
        [webhookLogId]
      );
      await processOutboxEvents(5).catch(err => {
        console.error("[WEBHOOK OUTBOX PROCESSING ERROR]", err);
      });
      if (shouldRedirectAfterCallback) return NextResponse.redirect(new URL('/dashboard/user', request.url), 303);
      return NextResponse.json({ status: 'processed', eventId });
    } catch (err: any) {
      console.error(`[WEBHOOK REFUND ASYNC ERROR] Event: ${parsed.providerEventId}`, err);
      await run(
        `UPDATE payments.webhook_logs
         SET processed = FALSE, response_status = 500, processing_error = $1::text
         WHERE id = $2`,
        [err?.message || String(err), webhookLogId]
      );
      return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
    }
  }

  if (parsed.eventType === 'refund.created') {
    await markPaymentEventProcessed(eventId);
    await run(
      `UPDATE payments.webhook_logs
       SET processed = TRUE, response_status = 200, processed_at = NOW()
       WHERE id = $1`,
      [webhookLogId]
    );
    return NextResponse.json({ status: 'processed_created', eventId });
  }

  if (parsed.eventType !== 'payment.captured') {
    await markPaymentEventProcessed(eventId);
    await logWebhook({ provider, eventType: parsed.eventType, providerEventId: parsed.providerEventId, payload: parsed.rawEvent, signature, responseStatus: 200, processed: true });
    if (shouldRedirectAfterCallback) return NextResponse.redirect(new URL('/dashboard/user', request.url), 303);
    return NextResponse.json({ status: 'ignored', event: parsed.eventType });
  }

  if (!parsed.payment) {
    await logWebhook({ provider, eventType: parsed.eventType, providerEventId: parsed.providerEventId, payload: parsed.rawEvent, signature, responseStatus: 400, processed: false, error: 'Missing payment entity' });
    return NextResponse.json({ error: 'Invalid payment event' }, { status: 400 });
  }

  // Offload payment confirmation to a background task to keep webhook response fast
  const paymentPayload = {
    provider,
    providerOrderId: parsed.payment.providerOrderId,
    providerPaymentId: parsed.payment.providerPaymentId,
    amount: parsed.payment.amount,
    currency: parsed.payment.currency,
    method: parsed.payment.method,
    rawPayment: parsed.payment.raw,
  };

  try {
    const result = await PaymentOrchestrator.confirmPayment(paymentPayload);
    if (!result.ok) {
      throw new Error(result.error);
    }
    await markPaymentEventProcessed(eventId);
    await run(
      `UPDATE payments.webhook_logs
       SET processed = TRUE, response_status = 200, processed_at = NOW(),
           payload = payload || jsonb_build_object('ticketNumber', $1::text, 'refundRequired', $2::boolean, 'alreadyProcessed', $3::boolean)
       WHERE id = $4`,
      [result.ticketNumber || null, !!result.refundRequired, !!result.alreadyProcessed, webhookLogId]
    );
    // Process enqueued outbox events immediately in the background
    await processOutboxEvents(5).catch(err => {
      console.error("[WEBHOOK OUTBOX PROCESSING ERROR]", err);
    });
    return NextResponse.json({ status: 'processed', eventId });
  } catch (err: any) {
    console.error(`[WEBHOOK ASYNC PROCESSING ERROR] Event: ${parsed.providerEventId}`, err);
    await run(
      `UPDATE payments.webhook_logs
       SET processed = FALSE, response_status = 500, processing_error = $1::text
       WHERE id = $2`,
       [err?.message || String(err), webhookLogId]
    );
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
