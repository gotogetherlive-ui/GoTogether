import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { run, queryOne } from '@/lib/db';
import { PAYMENT_PROVIDER, BOOKING_STATUS } from '../domain';
import {
  createBookingPaymentOrder,
  confirmPaymentFromWebhook,
} from '../service';
import { PaymentOrchestrator } from '../orchestrator';
import { getPaymentProviderAdapter } from '../adapters/registry';
import { v4 as uuidv4 } from 'uuid';
import { POST as cancelTripHandler } from '@/app/api/business/trips/[id]/cancel/route';
import { DELETE as deleteTripHandler } from '@/app/api/business/trips/[id]/route';
import { POST as adminRetryRefundHandler } from '@/app/api/admin/bookings/[bookingId]/retry-refund/route';
import { SecretManager } from '../secret-manager';

describe('GoTogether Organizer Trip Cancellation & Refund Suite', () => {
  let travelerUser: { id: string; email: string; full_name: string };
  let organizerUser: { id: string; email: string; full_name: string };
  let tripId: string;
  let bookingId: string;

  let originalCreateOrder: any;
  let originalRefundPayment: any;

  before(async () => {
    Reflect.set(process.env, 'NODE_ENV', 'test');
    // Clean all tables referencing trips/users to avoid constraint violations
    await run('DELETE FROM public.booking_tickets');
    await run('DELETE FROM public.booking_cancellations');
    await run('DELETE FROM public.trip_cancellations');
    await run('DELETE FROM payments.refunds');
    await run('DELETE FROM payments.transactions');
    await run('DELETE FROM payments.orders');
    await run('DELETE FROM payments.provider_accounts');
    await run('DELETE FROM public.trip_bookings');
    await run('DELETE FROM public.trip_requests');
    await run('DELETE FROM public.trip_participants');
    await run('DELETE FROM public.user_chat_reads');
    await run('DELETE FROM public.messages');
    await run('DELETE FROM public.reports');
    await run('DELETE FROM public.trip_reviews');
    await run('UPDATE public.travel_stories SET trip_id = NULL WHERE trip_id IS NOT NULL');
    await run('DELETE FROM public.trips');
    await run('DELETE FROM public.business_applications');
    await run('DELETE FROM public.admin_audit_log');
    await run('DELETE FROM public.support_tickets');
    await run('DELETE FROM public.feedbacks');
    await run('DELETE FROM public.rate_limits');
    await run('DELETE FROM public.sessions');
    await run('DELETE FROM public.user_activity');
    await run('DELETE FROM public.users');

    // Create test accounts
    travelerUser = { id: uuidv4(), email: 'traveler@example.com', full_name: 'Harsh Raj' };
    organizerUser = { id: uuidv4(), email: 'organizer@example.com', full_name: 'Alpine Patna' };

    await run(
      `INSERT INTO public.users (id, email, full_name, role, is_verified) VALUES ($1, $2, $3, 'regular', 1)`,
      [travelerUser.id, travelerUser.email, travelerUser.full_name]
    );
    await run(
      `INSERT INTO public.users (id, email, full_name, role, is_verified) VALUES ($1, $2, $3, 'business', 1)`,
      [organizerUser.id, organizerUser.email, organizerUser.full_name]
    );

    // Setup stub default provider account for organizer
    const apiKeyEnc = SecretManager.encrypt('rzp_test_your_key_id');
    const apiSecretEnc = SecretManager.encrypt('mock_key_secret');
    const webhookSecretEnc = SecretManager.encrypt('mock_webhook_secret');
    
    await run(
      `INSERT INTO payments.provider_accounts (
        id, organizer_id, provider, ownership_model, provider_account_id,
        is_default, status, verification_status, supports_refunds, supports_settlement,
        supports_webhooks, api_key_enc, api_secret_enc, webhook_secret_enc, verified_at
      ) VALUES ($1, $2, 'RAZORPAY', 'ORGANIZER_OWNED', 'acc_123', true, 'active', 'verified', true, false, true, $3, $4, $5, NOW())`,
      [uuidv4(), organizerUser.id, apiKeyEnc, apiSecretEnc, webhookSecretEnc]
    );

    // Mock payment adapter to prevent gateway calls during test run
    const adapter = getPaymentProviderAdapter(PAYMENT_PROVIDER.RAZORPAY);
    originalCreateOrder = adapter.createOrder;
    originalRefundPayment = adapter.refundPayment;

    adapter.createOrder = async (input) => {
      return {
        id: 'order_test_123',
        amount: input.amount,
        currency: input.currency,
        receipt: input.receipt,
        status: 'created',
        raw: {},
      };
    };

    adapter.refundPayment = async () => {
      return {
        id: `ref_mock_${Math.random().toString(36).substring(2, 10)}`,
        status: 'processed',
        raw: { id: `ref_mock_id` }
      };
    };
  });

  after(async () => {
    const adapter = getPaymentProviderAdapter(PAYMENT_PROVIDER.RAZORPAY);
    adapter.createOrder = originalCreateOrder;
    adapter.refundPayment = originalRefundPayment;
  });

  test('Flow B: Organizer Trip Cancellation and Refund Execution Workflow', async () => {
    // 1. Create a Premium Trip
    tripId = uuidv4();
    await run(
      `INSERT INTO public.trips (id, organizer_id, title, description, destination, duration_days, status, trip_type, b2c_price, max_capacity, registration_closed)
       VALUES ($1, $2, 'Alpine Adventure', 'Scenic patna tour', 'patna', 3, 'live', 'premium', '7000', 10, 0)`,
      [tripId, organizerUser.id]
    );

    // 2. Book the Trip (Awaiting Payment)
    bookingId = uuidv4();
    await run(
      `INSERT INTO public.trip_bookings (id, trip_id, user_id, male_count, female_count, child_count, names, phone_number, trip_date, status, booking_status, payment_status, amount, booking_ref)
       VALUES ($1, $2, $3, 1, 0, 0, 'Harsh Raj', '9999999999', '2026-06-30', 'approved', 'pending_payment', 'pending', 700000, 'GT-20260627-6F39FB')`,
      [bookingId, tripId, travelerUser.id]
    );

    // 3. Generate Payment Order & Confirm capturing webhook (Transitions to confirmed / paid)
    const orderRes = await createBookingPaymentOrder({ id: travelerUser.id, role: 'regular', email: travelerUser.email, full_name: travelerUser.full_name, phone_number: '9999999999', age: 29, gender: 'Other', profession: 'Tester', fooding_habit: 'Any' } as any, {
      trip_id: tripId,
      trip_date: '2026-06-30',
      male_count: 1,
      female_count: 0,
      child_count: 0,
      names: ['Harsh Raj'],
      phone_number: '9999999999',
      booking_id: bookingId,
    });
    if (!orderRes.ok) {
      console.error("Order Creation Failed:", orderRes);
    }
    assert.strictEqual(orderRes.ok, true);

    const orderRecord = await queryOne(`SELECT * FROM payments.orders WHERE booking_id = $1`, [bookingId]);
    const webhookRes = await confirmPaymentFromWebhook({
      provider: PAYMENT_PROVIDER.RAZORPAY,
      providerOrderId: orderRecord.provider_order_id,
      providerPaymentId: 'pay_sim_62sdmyaxo',
      amount: 700000,
      rawPayment: {},
    });
    assert.strictEqual(webhookRes.ok, true);

    const confirmedBooking = await queryOne(`SELECT * FROM public.trip_bookings WHERE id = $1`, [bookingId]);
    assert.strictEqual(confirmedBooking.booking_status, BOOKING_STATUS.CONFIRMED);

    // 4. Try to Delete/Remove the Trip directly when there is an active paid booking (Should fail with 409)
    // Setup Mock Session
    (global as any).mockSessionUser = { ...organizerUser, role: 'business', is_verified: 1 };
    
    // Direct call to delete route handler
    const deleteRes = await deleteTripHandler(
      new Request(`http://localhost/api/business/trips/${tripId}`, { method: 'DELETE' }),
      { params: Promise.resolve({ id: tripId }) }
    );
    assert.strictEqual(deleteRes.status, 409); // Conflict: paid bookings active

    // 5. Cancel the Trip via Organizer Action Cancel Trip Route (POST /api/business/trips/[id]/cancel)
    const cancelRequest = new Request(`http://localhost/api/business/trips/${tripId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({
        reason_type: 'Severe Weather',
        reason: 'Heavy rain warnings in Patna'
      }),
    });
    const cancelRes = await cancelTripHandler(cancelRequest, { params: Promise.resolve({ id: tripId }) });
    assert.strictEqual(cancelRes.status, 200);

    (global as any).mockSessionUser = null;

    // 6. Verify Trip status has changed to 'refunds_processing'
    const tripRecord = await queryOne(`SELECT * FROM public.trips WHERE id = $1`, [tripId]);
    assert.strictEqual(tripRecord.status, 'refunds_processing');

    // 7. Verify Booking status has changed to 'trip_cancelled' and payment_status to 'refund_pending'
    const cancelledBooking = await queryOne(`SELECT * FROM public.trip_bookings WHERE id = $1`, [bookingId]);
    assert.strictEqual(cancelledBooking.booking_status, 'trip_cancelled');
    assert.strictEqual(cancelledBooking.payment_status, 'refund_pending');
    assert.strictEqual(cancelledBooking.cancel_reason, 'ORGANIZER_CANCELLED_TRIP');

    // 8. Verify Immutable trip cancellations audit log is created
    const auditRecord = await queryOne(`SELECT * FROM public.trip_cancellations WHERE trip_id = $1`, [tripId]);
    assert.ok(auditRecord);
    assert.strictEqual(auditRecord.reason_type, 'Severe Weather');
    assert.strictEqual(auditRecord.reason, 'Heavy rain warnings in Patna');
    assert.strictEqual(auditRecord.completed_at, null);

    // 9. Verify Refund Record (Intent) is generated in payments.refunds
    const refundRecord = await queryOne(
      `SELECT r.* FROM payments.refunds r
       JOIN payments.transactions t ON r.transaction_id = t.transaction_id
       WHERE t.order_id = $1`,
      [orderRecord.id]
    );
    assert.ok(refundRecord);

    // Wait for the async gateway call to complete and populate provider_refund_id
    await new Promise(resolve => setTimeout(resolve, 100));

    const activeRefund = await queryOne<any>(
      `SELECT provider_refund_id FROM payments.refunds WHERE refund_id = $1`,
      [refundRecord.refund_id]
    );
    assert.ok(activeRefund.provider_refund_id);

    // 9.5. Simulate failed refund and invoke Admin Retry API
    const confirmFailedRefundRes = await PaymentOrchestrator.confirmRefund({
      providerRefundId: activeRefund.provider_refund_id,
      status: 'failed',
      raw: {},
    });
    assert.strictEqual(confirmFailedRefundRes.ok, true);

    const failedBooking = await queryOne(`SELECT * FROM public.trip_bookings WHERE id = $1`, [bookingId]);
    assert.strictEqual(failedBooking.booking_status, 'refund_failed');
    assert.strictEqual(failedBooking.payment_status, 'refund_failed');

    // Call Admin Retry Route (POST /api/admin/bookings/[bookingId]/retry-refund)
    // Setup Mock Session as admin
    (global as any).mockSessionUser = { id: organizerUser.id, role: 'super_admin', is_verified: 1 };
    
    const retryRes = await adminRetryRefundHandler(
      new Request(`http://localhost/api/admin/bookings/${bookingId}/retry-refund`, { method: 'POST' }),
      { params: Promise.resolve({ bookingId }) }
    );
    assert.strictEqual(retryRes.status, 200);

    const retriedBooking = await queryOne(`SELECT * FROM public.trip_bookings WHERE id = $1`, [bookingId]);
    assert.strictEqual(retriedBooking.booking_status, 'refund_pending');
    assert.strictEqual(retriedBooking.payment_status, 'refund_pending');

    (global as any).mockSessionUser = null;

    // 10. Simulate Refund Webhook Capture (processed) and state transitions
    // Wait for the retry async task to complete and write the new provider_refund_id to DB
    await new Promise(resolve => setTimeout(resolve, 100));

    const finalRefund = await queryOne<any>(
      `SELECT provider_refund_id FROM payments.refunds WHERE refund_id = $1`,
      [refundRecord.refund_id]
    );
    assert.ok(finalRefund.provider_refund_id);

    const confirmRefundRes = await PaymentOrchestrator.confirmRefund({
      providerRefundId: finalRefund.provider_refund_id,
      status: 'processed',
      raw: {},
    });
    assert.strictEqual(confirmRefundRes.ok, true);

    // 11. Verify booking is marked trip_cancelled + payment refunded
    const refundedBookingRecord = await queryOne(`SELECT * FROM public.trip_bookings WHERE id = $1`, [bookingId]);
    assert.strictEqual(refundedBookingRecord.booking_status, 'trip_cancelled');
    assert.strictEqual(refundedBookingRecord.payment_status, 'refunded');

    // 12. Verify Trip status moves automatically to 'cancelled' (All refunds completed)
    const finalizedTripRecord = await queryOne(`SELECT * FROM public.trips WHERE id = $1`, [tripId]);
    assert.strictEqual(finalizedTripRecord.status, 'cancelled');

    // 13. Verify trip audit record is finalized
    const finalizedAudit = await queryOne(`SELECT * FROM public.trip_cancellations WHERE trip_id = $1`, [tripId]);
    assert.ok(finalizedAudit.completed_at);
  });
});


