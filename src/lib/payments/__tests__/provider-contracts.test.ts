import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { CashfreeAdapter } from '../adapters/cashfree';
import { RazorpayAdapter } from '../adapters/razorpay';

test('Cashfree authenticates standard headers, rejects tampering, and normalizes lifecycle events', () => {
  const previous = process.env.CASHFREE_SECRET_KEY;
  process.env.CASHFREE_SECRET_KEY = 'contract_test_secret';
  try {
    const adapter = new CashfreeAdapter();
    const rawBody = JSON.stringify({ type: 'PAYMENT_SUCCESS_WEBHOOK', data: {
      order: { order_id: 'order_test' }, payment: { cf_payment_id: 12345, payment_amount: 19.95, payment_currency: 'INR' },
    } });
    const timestamp = String(Date.now());
    const signature = crypto.createHmac('sha256', 'contract_test_secret').update(timestamp + rawBody).digest('base64');
    const input = { rawBody, signature, headers: new Headers({ 'x-webhook-timestamp': timestamp }), mode: 'PLATFORM_CONTROLLED' as const };
    assert.equal(adapter.verifyWebhook(input), true);
    assert.equal(adapter.verifyWebhook({ ...input, rawBody: rawBody.replace('19.95', '1.00') }), false);
    assert.equal(adapter.verifyWebhook({ ...input, headers: new Headers() }), false);
    const event = adapter.parseWebhook(rawBody, input.headers);
    assert.equal(event.eventType, 'payment.captured');
    assert.equal(event.payment?.amount, 1995);
    assert.equal(event.payment?.providerPaymentId, '12345');
    for (const [status, expected] of [['SUCCESS', 'refund.processed'], ['CANCELLED', 'refund.failed'], ['PENDING', 'refund.created']]) {
      const refund = adapter.parseWebhook(JSON.stringify({ type: 'REFUND_STATUS_WEBHOOK', data: { refund: {
        cf_refund_id: 23, cf_payment_id: 12345, refund_status: status, refund_amount: 10,
      } } }), new Headers());
      assert.equal(refund.eventType, expected);
    }
    assert.notEqual(adapter.parseWebhook(JSON.stringify({ type: 'PAYMENT_FAILED_WEBHOOK', data: {} }), new Headers()).eventType, 'payment.captured');
  } finally {
    if (previous === undefined) delete process.env.CASHFREE_SECRET_KEY; else process.env.CASHFREE_SECRET_KEY = previous;
  }
});

test('Cashfree refunds address the merchant order and reuse a stable request key; recovery reads real payments', async () => {
  const previous = { ...process.env };
  const originalFetch = global.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  process.env.CASHFREE_APP_ID = 'TEST_contract';
  process.env.CASHFREE_SECRET_KEY = 'contract_test_secret';
  global.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url).endsWith('/payments')) return Response.json([
      { cf_payment_id: 1, payment_status: 'FAILED', payment_amount: 19.95 },
      { cf_payment_id: 2, payment_status: 'SUCCESS', payment_amount: 19.95, payment_currency: 'INR' },
    ]);
    return Response.json({ cf_refund_id: 123, refund_status: 'PENDING' });
  };
  try {
    const adapter = new CashfreeAdapter();
    const request = { providerOrderId: 'merchant_order', providerPaymentId: 'gateway_payment', idempotencyKey: crypto.randomUUID(),
      amount: 1995, notes: { reason: 'Customer cancellation' }, mode: 'PLATFORM_CONTROLLED' as const };
    await adapter.refundPayment(request); await adapter.refundPayment(request);
    assert.ok(calls[0].url.endsWith('/orders/merchant_order/refunds'));
    assert.equal(new Headers(calls[0].init?.headers).get('x-idempotency-key'), request.idempotencyKey);
    assert.equal(calls[0].init?.body, calls[1].init?.body);
    assert.deepEqual(JSON.parse(String(calls[0].init?.body)), { refund_amount: 19.95, refund_id: request.idempotencyKey, refund_note: 'Customer cancellation' });
    const payment = await adapter.fetchSuccessfulPayment('merchant_order');
    assert.equal(payment?.providerPaymentId, '2');
    assert.equal(payment?.amount, 1995);
    await assert.rejects(adapter.refundPayment({ ...request, providerOrderId: undefined }), /order ID/);
  } finally {
    global.fetch = originalFetch;
    for (const key of ['CASHFREE_APP_ID', 'CASHFREE_SECRET_KEY']) {
      if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];
    }
  }
});

test('Razorpay refund retries send the documented idempotency header and the same body', async () => {
  const previous = { ...process.env };
  const originalFetch = global.fetch;
  process.env.RAZORPAY_KEY_ID = 'rzp_contract_test';
  process.env.RAZORPAY_KEY_SECRET = 'contract_test_secret';
  const calls: RequestInit[] = [];
  global.fetch = async (_url, init) => { calls.push(init!); return Response.json({ id: 'rfnd_contract' }); };
  try {
    const request = { providerPaymentId: 'pay_contract', idempotencyKey: crypto.randomUUID(), amount: 1000,
      notes: { refund_id: 'refund_contract' }, mode: 'PLATFORM_CONTROLLED' as const };
    const adapter = new RazorpayAdapter();
    await adapter.refundPayment(request); await adapter.refundPayment(request);
    assert.equal(new Headers(calls[0].headers).get('X-Refund-Idempotency'), request.idempotencyKey);
    assert.equal(calls[0].body, calls[1].body);
  } finally {
    global.fetch = originalFetch;
    for (const key of ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET']) {
      if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];
    }
  }
});
