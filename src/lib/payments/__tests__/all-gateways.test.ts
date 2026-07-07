import { test, describe } from 'node:test';
import assert from 'node:assert';
import { PAYMENT_PROVIDER } from '../domain';
import { getPaymentProviderAdapter } from '../adapters/registry';
import { RazorpayAdapter } from '../adapters/razorpay';
import { CashfreeAdapter } from '../adapters/cashfree';

describe('Multi-Gateway Production Readiness Certification Suite', () => {

  const dummyAccount = {
    id: 'acc_test_123',
    organizer_id: 'org_123',
    provider: PAYMENT_PROVIDER.RAZORPAY,
    ownership_model: 'ORGANIZER_OWNED' as const,
    provider_account_id: 'prov_acc_123',
    linked_account_id: null,
    merchant_id: null,
    beneficiary_id: null,
    is_default: true,
    status: 'active',
    verification_status: 'verified',
    supports_refunds: true,
    supports_settlement: true,
    supports_webhooks: true,
    metadata: null,
    verified_at: new Date().toISOString(),
  };

  test('Registry resolves both gateway adapters properly', () => {
    assert.ok(getPaymentProviderAdapter(PAYMENT_PROVIDER.RAZORPAY) instanceof RazorpayAdapter);
    assert.ok(getPaymentProviderAdapter(PAYMENT_PROVIDER.CASHFREE) instanceof CashfreeAdapter);
  });

  describe('Razorpay Adapter Direct Certification', () => {
    const adapter = new RazorpayAdapter();

    test('Order creation in simulation mode', async () => {
      const res = await adapter.createOrder({
        amount: 10000,
        currency: 'INR',
        receipt: 'rec_123',
        notes: { booking_id: 'b1' },
        mode: 'ORGANIZER_OWNED',
        providerAccount: { ...dummyAccount, provider: PAYMENT_PROVIDER.RAZORPAY },
      });
      assert.ok(res.id);
    });

    test('Checkout verification and webhook parsing', () => {
      const isVerified = adapter.verifyCheckoutPayment({
        providerOrderId: 'order_123',
        providerPaymentId: 'pay_123',
        signature: 'mock_signature',
        mode: 'ORGANIZER_OWNED',
      });
      assert.strictEqual(isVerified, true);

      const parsed = adapter.parseWebhook(
        JSON.stringify({
          event: 'payment.captured',
          payload: {
            payment: { entity: { id: 'pay_123', order_id: 'order_123', amount: 10000, currency: 'INR' } }
          }
        }),
        new Headers()
      );
      assert.strictEqual(parsed.eventType, 'payment.captured');
      assert.strictEqual(parsed.payment?.providerPaymentId, 'pay_123');
    });
  });

  describe('Cashfree Adapter Direct Certification', () => {
    const adapter = new CashfreeAdapter();

    test('Order creation in simulation mode', async () => {
      const res = await adapter.createOrder({
        amount: 15000,
        currency: 'INR',
        receipt: 'cf_rec_123',
        notes: { booking_id: 'b2' },
        mode: 'ORGANIZER_OWNED',
        providerAccount: { ...dummyAccount, provider: PAYMENT_PROVIDER.CASHFREE },
      });
      assert.ok(res.id);
    });

    test('Checkout verification and webhook parsing', () => {
      const isVerified = adapter.verifyCheckoutPayment({
        providerOrderId: 'order_cf_123',
        providerPaymentId: 'pay_cf_123',
        signature: 'mock_signature',
        mode: 'ORGANIZER_OWNED',
      });
      assert.strictEqual(isVerified, true);

      const parsed = adapter.parseWebhook(
        JSON.stringify({
          type: 'PAYMENT_SUCCESS_WEBHOOK',
          data: {
            order: { order_id: 'order_cf_123', order_amount: 150, order_currency: 'INR' },
            payment: { cf_payment_id: 'pay_cf_123', payment_amount: 150 }
          }
        }),
        new Headers()
      );
      assert.strictEqual(parsed.eventType, 'PAYMENT_SUCCESS_WEBHOOK');
      assert.strictEqual(parsed.payment?.providerPaymentId, 'pay_cf_123');
      assert.strictEqual(parsed.payment?.amount, 15000); // 150 INR = 15000 paise
    });

    test('Refund execution in simulation mode', async () => {
      const res = await adapter.refundPayment({
        providerPaymentId: 'order_cf_123',
        amount: 5000,
        notes: { reason: 'Test refund' },
        mode: 'ORGANIZER_OWNED',
      });
      assert.strictEqual(res.status, 'SUCCESS');
      assert.ok(res.refundId);
    });
  });
});
