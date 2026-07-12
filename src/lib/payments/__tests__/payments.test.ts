import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import { run, queryOne } from '@/lib/db';
import { PAYMENT_PROVIDER, BOOKING_STATUS, REFUND_STATUS } from '../domain';
import {
  createBookingPaymentOrder,
  acknowledgeFrontendPayment,
  confirmPaymentFromWebhook,
  requestBookingRefund,
  processPendingRefunds,
  expirePendingPaymentBookings
} from '../service';
import { getPaymentProviderAdapter } from '../adapters/registry';
import { v4 as uuidv4 } from 'uuid';
import { SecretManager } from '../secret-manager';

describe('GoTogether Payments Subsystem Tests', () => {
  let testUser: { id: string; email: string; full_name: string };
  let testUserB: { id: string; email: string; full_name: string };
  let testOrganizer: { id: string; email: string; full_name: string };
  let testTrip: { id: string; title: string; gotogether_price: string };
  
  let originalCreateOrder: any;
  let originalRefundPayment: any;

  // Setup seed data and stub adapters
  before(async () => {
    // Clear any leftover test data
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

    // Create test users and organizer
    testUser = {
      id: uuidv4(),
      email: 'testuser@example.com',
      full_name: 'Test Traveler A',
    };
    testUserB = {
      id: uuidv4(),
      email: 'testuserb@example.com',
      full_name: 'Test Traveler B',
    };
    testOrganizer = {
      id: uuidv4(),
      email: 'testorganizer@example.com',
      full_name: 'Test Organizer',
    };

    await run(
      `INSERT INTO public.users (id, email, full_name, role, is_verified, phone_verified)
       VALUES ($1, $2, $3, 'regular', 1, 1)`,
      [testUser.id, testUser.email, testUser.full_name]
    );

    await run(
      `INSERT INTO public.users (id, email, full_name, role, is_verified, phone_verified)
       VALUES ($1, $2, $3, 'regular', 1, 1)`,
      [testUserB.id, testUserB.email, testUserB.full_name]
    );

    await run(
      `INSERT INTO public.users (id, email, full_name, role, is_verified, phone_verified)
       VALUES ($1, $2, $3, 'business', 1, 1)`,
      [testOrganizer.id, testOrganizer.email, testOrganizer.full_name]
    );

    // Create organizer payment credentials profile
    const apiKeyEnc = SecretManager.encrypt('rzp_test_your_key_id');
    const apiSecretEnc = SecretManager.encrypt('mock_key_secret');
    const webhookSecretEnc = SecretManager.encrypt('mock_webhook_secret');
    
    await run(
      `INSERT INTO payments.provider_accounts (
        id, organizer_id, provider, ownership_model, provider_account_id,
        is_default, status, verification_status, supports_refunds, supports_settlement,
        supports_webhooks, api_key_enc, api_secret_enc, webhook_secret_enc, verified_at
      ) VALUES ($1, $2, 'RAZORPAY', 'ORGANIZER_OWNED', 'acc_123', true, 'active', 'verified', true, false, true, $3, $4, $5, NOW())`,
      [uuidv4(), testOrganizer.id, apiKeyEnc, apiSecretEnc, webhookSecretEnc]
    );

    // Create a test trip (price must be set to 50 INR so that parseInrToPaise yields 5000 paise)
    testTrip = {
      id: uuidv4(),
      title: 'Himalayan Explorer',
      gotogether_price: '50', 
    };

    await run(
      `INSERT INTO public.trips (id, organizer_id, title, description, destination, duration_days, status, max_capacity, gotogether_price, start_date)
       VALUES ($1, $2, $3, 'Description', 'Himalayas', 5, 'live', 5, $4, '2026-07-15')`,
      [testTrip.id, testOrganizer.id, testTrip.title, testTrip.gotogether_price]
    );

    // Stub RazorpayAdapter to run fully in simulated mock mode to prevent network requests
    const adapter = getPaymentProviderAdapter(PAYMENT_PROVIDER.RAZORPAY);
    originalCreateOrder = adapter.createOrder;
    originalRefundPayment = adapter.refundPayment;

    adapter.createOrder = async () => {
      return {
        id: `rzp_order_mock_${Math.random().toString(36).substring(2, 15)}`,
        raw: { simulated: true, provider: "RAZORPAY" }
      };
    };

    adapter.refundPayment = async () => {
      return {
        id: `rfnd_mock_${Math.random().toString(36).substring(2, 10)}`,
        status: "processed",
        raw: { id: `rfnd_mock_${Math.random().toString(36).substring(2, 10)}` }
      };
    };
  });

  after(async () => {
    // Restore original methods on cleanup
    const adapter = getPaymentProviderAdapter(PAYMENT_PROVIDER.RAZORPAY);
    adapter.createOrder = originalCreateOrder;
    adapter.refundPayment = originalRefundPayment;
  });

  beforeEach(async () => {
    // Clear dynamic tables before each test case
    await run('DELETE FROM public.booking_tickets');
    await run('DELETE FROM public.booking_cancellations');
    await run('DELETE FROM payments.refunds');
    await run('DELETE FROM payments.transactions');
    await run('DELETE FROM payments.orders');
    await run('DELETE FROM public.trip_bookings');
    await run('DELETE FROM payments.webhook_logs');
    await run('DELETE FROM payments.payment_events');
  });

  test('Database & Repository Operations - Create and Lock Orders', async () => {
    const bookingId = uuidv4();
    // Insert trip booking
    await run(
      `INSERT INTO public.trip_bookings (id, trip_id, user_id, male_count, female_count, child_count, names, phone_number, trip_date, booking_status, payment_status, approval_status, amount)
       VALUES ($1, $2, $3, 1, 0, 0, '[]', '9999999999', '2026-07-15', 'pending_payment', 'pending', 'awaiting_payment', 5000)`,
      [bookingId, testTrip.id, testUser.id]
    );

    const orderId = uuidv4();
    await run(
      `INSERT INTO payments.orders (id, order_reference, provider, booking_id, user_id, trip_id, organizer_id, amount, status, expires_at)
       VALUES ($1, $2, 'RAZORPAY', $3, $4, $5, $6, 5000, 'CREATED', NOW() + INTERVAL '1 hour')`,
      [orderId, 'REF-123', bookingId, testUser.id, testTrip.id, testOrganizer.id]
    );

    const order = await queryOne(`SELECT * FROM payments.orders WHERE id = $1`, [orderId]);
    assert.ok(order);
    assert.strictEqual(order.amount, 5000);
    assert.strictEqual(order.status, 'CREATED');
  });

  test('Order Lifecycle - Complete booking, acknowledgement, and webhook confirmation', async () => {
    // 1. Create payment order (using correct snake_case validation payload)
    const orderResult = await createBookingPaymentOrder(
      { id: testUser.id, email: testUser.email, role: 'regular', full_name: testUser.full_name, phone_number: '9999999999', age: 29, gender: 'Other', profession: 'Tester', fooding_habit: 'Any' } as any,
      {
        trip_id: testTrip.id,
        male_count: 1,
        female_count: 0,
        child_count: 0,
        names: ['Traveler A'],
        phone_number: '9999999999',
        trip_date: '2026-07-15'
      }
    );

    assert.ok(orderResult.ok, `Failed order creation: ${JSON.stringify(orderResult)}`);
    assert.strictEqual(orderResult.status, 201);
    const bookingId = orderResult.body.bookingId;

    // Verify order in database. Since it is successfully attached, status must be PENDING
    const orderRecord = await queryOne(`SELECT * FROM payments.orders WHERE booking_id = $1`, [bookingId]);
    assert.ok(orderRecord);
    assert.strictEqual(orderRecord.status, 'PENDING');

    // 2. Acknowledge frontend payment
    const ackResult = await acknowledgeFrontendPayment(
      { id: testUser.id, email: testUser.email } as any,
      {
        razorpay_order_id: orderRecord.provider_order_id || 'rzp_order_mock_123',
        razorpay_payment_id: 'pay_123456',
        razorpay_signature: 'mock_signature',
        provider: 'RAZORPAY',
        isSimulated: true,
      }
    );

    assert.ok(ackResult.ok, `Frontend acknowledgement failed: ${JSON.stringify(ackResult)}`);
    assert.strictEqual(ackResult.body.status, 'confirmed');

    // Frontend signature verification now finalizes the payment immediately.
    const orderRecordAck = await queryOne(`SELECT * FROM payments.orders WHERE booking_id = $1`, [bookingId]);
    assert.strictEqual(orderRecordAck.status, 'SUCCESS');

    const transactionRecord = await queryOne(`SELECT * FROM payments.transactions WHERE order_id = $1`, [orderRecord.id]);
    assert.ok(transactionRecord);
    assert.strictEqual(transactionRecord.status, 'SUCCESS');

    const bookingAfterAck = await queryOne(`SELECT * FROM public.trip_bookings WHERE id = $1`, [bookingId]);
    assert.strictEqual(bookingAfterAck.booking_status, BOOKING_STATUS.CONFIRMED);
    assert.strictEqual(bookingAfterAck.payment_status, 'paid');

    // 3. A later webhook payment.captured event should be idempotent.
    const webhookResult = await confirmPaymentFromWebhook({
      provider: 'RAZORPAY',
      providerOrderId: orderRecord.provider_order_id || 'rzp_order_mock_123',
      providerPaymentId: 'pay_123456',
      amount: 5000,
      currency: 'INR',
      method: 'simulated',
      rawPayment: { id: 'pay_123456', order_id: orderRecord.provider_order_id, amount: 5000 },
    });

    assert.ok(webhookResult.ok);
    assert.strictEqual(webhookResult.alreadyProcessed, true);

    // Verify booking status transitioned to confirmed
    const confirmedBooking = await queryOne(`SELECT * FROM public.trip_bookings WHERE id = $1`, [bookingId]);
    assert.strictEqual(confirmedBooking.booking_status, BOOKING_STATUS.CONFIRMED);
    assert.strictEqual(confirmedBooking.payment_status, 'paid');

    // Verify ticket generated
    const ticketRecord = await queryOne(`SELECT * FROM public.booking_tickets WHERE booking_id = $1`, [bookingId]);
    assert.ok(ticketRecord);
    assert.ok(ticketRecord.ticket_number.startsWith('TKT-'));
  });

  test('Webhook Security & Duplicate Event Prevention', async () => {
    // Trigger confirmPaymentFromWebhook twice with same details
    const orderResult = await createBookingPaymentOrder(
      { id: testUser.id, email: testUser.email, role: 'regular', full_name: testUser.full_name, phone_number: '9999999999', age: 29, gender: 'Other', profession: 'Tester', fooding_habit: 'Any' } as any,
      {
        trip_id: testTrip.id,
        male_count: 1,
        female_count: 0,
        child_count: 0,
        names: ['Traveler B'],
        phone_number: '9999999999',
        trip_date: '2026-07-15'
      }
    );
    assert.ok(orderResult.ok, `Failed order creation: ${JSON.stringify(orderResult)}`);
    const bookingId = orderResult.body.bookingId;
    const orderRecord = await queryOne(`SELECT * FROM payments.orders WHERE booking_id = $1`, [bookingId]);

    const runWebhook = () => confirmPaymentFromWebhook({
      provider: 'RAZORPAY',
      providerOrderId: orderRecord.provider_order_id || 'rzp_order_mock_123',
      providerPaymentId: 'pay_duplicate_123',
      amount: 5000,
      currency: 'INR',
      rawPayment: {},
    });

    // Run first webhook confirmation
    const firstResult = await runWebhook();
    assert.ok(firstResult.ok, `First webhook failed: ${JSON.stringify(firstResult)}`);
    assert.strictEqual(firstResult.refundRequired, false);

    // Run second webhook confirmation (represents a duplicate callback)
    const secondResult = await runWebhook();
    assert.ok(secondResult.ok);
    assert.strictEqual(secondResult.alreadyProcessed, true); // It should be flagged as alreadyProcessed!
  });

  test('Overselling Guardrails & Automatic Refunds', async () => {
    // Setup a new trip with capacity = 2 initially to allow creating both bookings
    const tinyTripId = uuidv4();
    await run(
      `INSERT INTO public.trips (id, organizer_id, title, description, destination, duration_days, status, max_capacity, gotogether_price, start_date)
       VALUES ($1, $2, 'Tiny Trip', 'Description', 'Local', 1, 'live', 2, '50', '2026-07-15')`,
      [tinyTripId, testOrganizer.id]
    );

    // Create user A booking
    const bookingA = await createBookingPaymentOrder(
      { id: testUser.id, email: testUser.email, role: 'regular', full_name: testUser.full_name, phone_number: '9999999999', age: 29, gender: 'Other', profession: 'Tester', fooding_habit: 'Any' } as any,
      {
        trip_id: tinyTripId,
        male_count: 1,
        female_count: 0,
        child_count: 0,
        names: ['Traveler A'],
        phone_number: '9999999999',
        trip_date: '2026-07-15'
      }
    );
    assert.ok(bookingA.ok, `Booking A creation failed: ${JSON.stringify(bookingA)}`);

    // Create user B booking (using testUserB to prevent duplicate_user unique constraint violation)
    const bookingB = await createBookingPaymentOrder(
      { id: testUserB.id, email: testUserB.email, role: 'regular', full_name: testUserB.full_name, phone_number: '9999999998', age: 31, gender: 'Other', profession: 'Tester', fooding_habit: 'Any' } as any,
      {
        trip_id: tinyTripId,
        male_count: 1,
        female_count: 0,
        child_count: 0,
        names: ['Traveler B'],
        phone_number: '9999999999',
        trip_date: '2026-07-15'
      }
    );
    assert.ok(bookingB.ok, `Booking B creation failed: ${JSON.stringify(bookingB)}`);

    // Now, decrease the trip's max_capacity to 1 in the database to simulate capacity reduction or race conditions
    await run(`UPDATE public.trips SET max_capacity = 1 WHERE id = $1`, [tinyTripId]);

    const orderA = await queryOne(`SELECT * FROM payments.orders WHERE booking_id = $1`, [bookingA.body.bookingId]);
    const orderB = await queryOne(`SELECT * FROM payments.orders WHERE booking_id = $1`, [bookingB.body.bookingId]);

    // Confirm A payment webhook
    await confirmPaymentFromWebhook({
      provider: 'RAZORPAY',
      providerOrderId: orderA.provider_order_id,
      providerPaymentId: 'pay_a',
      amount: 5000,
      rawPayment: {},
    });

    // Confirm B payment webhook: this should trigger capacity violation, booking marked refund_pending
    const confirmResultB = await confirmPaymentFromWebhook({
      provider: 'RAZORPAY',
      providerOrderId: orderB.provider_order_id,
      providerPaymentId: 'pay_b',
      amount: 5000,
      rawPayment: {},
    });

    assert.ok(confirmResultB.ok);
    assert.strictEqual(confirmResultB.refundRequired, true);

    const bookingBRecord = await queryOne(`SELECT * FROM public.trip_bookings WHERE id = $1`, [bookingB.body.bookingId]);
    assert.strictEqual(bookingBRecord.booking_status, BOOKING_STATUS.REFUND_PENDING);

    // Verify refund attempt recorded in refunds table
    const refundRecord = await queryOne(
      `SELECT r.* FROM payments.refunds r
       JOIN payments.transactions t ON r.transaction_id = t.transaction_id
       WHERE t.order_id = $1`,
      [orderB.id]
    );
    assert.ok(refundRecord);
    assert.strictEqual(refundRecord.amount, 5000);
  });

  test('Booking Expiry Webhook Refunds', async () => {
    // 1. Create order
    const bookingResult = await createBookingPaymentOrder(
      { id: testUser.id, email: testUser.email, role: 'regular', full_name: testUser.full_name, phone_number: '9999999999', age: 29, gender: 'Other', profession: 'Tester', fooding_habit: 'Any' } as any,
      {
        trip_id: testTrip.id,
        male_count: 1,
        female_count: 0,
        child_count: 0,
        names: ['Traveler C'],
        phone_number: '9999999999',
        trip_date: '2026-07-15'
      }
    );
    assert.ok(bookingResult.ok, `Booking creation failed: ${JSON.stringify(bookingResult)}`);
    const bookingId = bookingResult.body.bookingId;
    const orderRecord = await queryOne(`SELECT * FROM payments.orders WHERE booking_id = $1`, [bookingId]);

    // Force expire the booking in DB
    await run(`UPDATE public.trip_bookings SET expires_at = NOW() - INTERVAL '1 minute' WHERE id = $1`, [bookingId]);

    // Run expiration job
    const expiredCount = await expirePendingPaymentBookings();
    assert.ok(expiredCount >= 1);

    const bookingRecord = await queryOne(`SELECT * FROM public.trip_bookings WHERE id = $1`, [bookingId]);
    assert.strictEqual(bookingRecord.booking_status, BOOKING_STATUS.EXPIRED);

    // Receive late webhook confirmation for the expired booking: should trigger refund!
    const confirmResult = await confirmPaymentFromWebhook({
      provider: 'RAZORPAY',
      providerOrderId: orderRecord.provider_order_id,
      providerPaymentId: 'pay_late',
      amount: 5000,
      rawPayment: {},
    });

    assert.ok(confirmResult.ok);
    assert.strictEqual(confirmResult.refundRequired, true);

    const bookingRecordPostWebhook = await queryOne(`SELECT * FROM public.trip_bookings WHERE id = $1`, [bookingId]);
    assert.strictEqual(bookingRecordPostWebhook.booking_status, BOOKING_STATUS.REFUND_PENDING);
  });

  test('Failure Injection - Payment Gateway Timeout', async () => {
    const adapter = getPaymentProviderAdapter(PAYMENT_PROVIDER.RAZORPAY);
    
    // Inject timeout failure
    adapter.createOrder = async () => {
      throw new Error("Gateway timeout");
    };

    try {
      const result = await createBookingPaymentOrder(
        { id: testUser.id, email: testUser.email, role: 'regular', full_name: testUser.full_name, phone_number: '9999999999', age: 29, gender: 'Other', profession: 'Tester', fooding_habit: 'Any' } as any,
        {
          trip_id: testTrip.id,
          male_count: 1,
          female_count: 0,
          child_count: 0,
          names: ['Traveler D'],
          phone_number: '9999999999',
          trip_date: '2026-07-15'
        }
      );
      assert.strictEqual(result.ok, false);
      assert.strictEqual(result.status, 502);
      assert.strictEqual((result as any).error, "Payment gateway is temporarily unavailable. Please try again.");
    } finally {
      // Restore simulated mock order stub
      adapter.createOrder = async () => {
        return {
          id: `rzp_order_mock_${Math.random().toString(36).substring(2, 15)}`,
          raw: { simulated: true, provider: "RAZORPAY" }
        };
      };
    }
  });

  test('Failure Injection - Refund Gateway Outage and Reconciliation Retry', async () => {
    // Setup confirmed booking
    const bookingResult = await createBookingPaymentOrder(
      { id: testUser.id, email: testUser.email, role: 'regular', full_name: testUser.full_name, phone_number: '9999999999', age: 29, gender: 'Other', profession: 'Tester', fooding_habit: 'Any' } as any,
      {
        trip_id: testTrip.id,
        male_count: 1,
        female_count: 0,
        child_count: 0,
        names: ['Traveler E'],
        phone_number: '9999999999',
        trip_date: '2026-07-15'
      }
    );
    assert.ok(bookingResult.ok, `Booking creation failed: ${JSON.stringify(bookingResult)}`);
    const bookingId = bookingResult.body.bookingId;
    const orderRecord = await queryOne(`SELECT * FROM payments.orders WHERE booking_id = $1`, [bookingId]);
    await confirmPaymentFromWebhook({
      provider: 'RAZORPAY',
      providerOrderId: orderRecord.provider_order_id,
      providerPaymentId: 'pay_e',
      amount: 5000,
      rawPayment: {},
    });

    const adapter = getPaymentProviderAdapter(PAYMENT_PROVIDER.RAZORPAY);

    // Inject gateway outage on refund
    adapter.refundPayment = async () => {
      throw new Error("Refund gateway offline");
    };

    try {
      // Attempt refund
      const refundResult = await requestBookingRefund(bookingId, "Refund test");
      assert.strictEqual(refundResult.ok, false);
      assert.strictEqual(refundResult.status, 502);

      // Verify refund record is marked FAILED with retryable error state
      const refundRecord = await queryOne(
        `SELECT r.* FROM payments.refunds r
         JOIN payments.transactions t ON r.transaction_id = t.transaction_id
         WHERE t.order_id = $1`,
        [orderRecord.id]
      );
      assert.ok(refundRecord);
      assert.strictEqual(refundRecord.status, REFUND_STATUS.FAILED);

      // Restore simulated refund stub
      adapter.refundPayment = async () => {
        return {
          id: `rfnd_mock_${Math.random().toString(36).substring(2, 10)}`,
          status: "processed",
          raw: { id: `rfnd_mock_${Math.random().toString(36).substring(2, 10)}` }
        };
      };

      // Run refund retry worker to process failed/pending refunds
      const processResult = await processPendingRefunds();
      assert.strictEqual(processResult.processed, 1);
      assert.strictEqual(processResult.failed, 0);

      // Verify refund record status updated to PROCESSING
      const updatedRefundRecord = await queryOne(`SELECT * FROM payments.refunds WHERE refund_id = $1`, [refundRecord.refund_id]);
      assert.strictEqual(updatedRefundRecord.status, REFUND_STATUS.PROCESSING);

    } finally {
      adapter.refundPayment = async () => {
        return {
          id: `rfnd_mock_${Math.random().toString(36).substring(2, 10)}`,
          status: "processed",
          raw: { id: `rfnd_mock_${Math.random().toString(36).substring(2, 10)}` }
        };
      };
    }
  });
});


