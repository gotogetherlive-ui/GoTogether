import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import { run, queryOne, getPoolInstance } from '@/lib/db';
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
import { GET as listMyBookings } from '@/app/api/user/requests/route';
import { GET as readBookingStatus } from '@/app/api/bookings/[bookingId]/status/route';
import { POST as cancelTrip } from '@/app/api/business/trips/[id]/cancel/route';
import { POST as processBuddyRequest } from '@/app/api/organizer/requests/[id]/route';
import { reconcilePayments } from '../reconciliation';
import { processOutboxEvents } from '../outbox';
import { claimPaymentEvent } from '../repository';


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
    await getPoolInstance().end();
  });

  beforeEach(async () => {
    await run('DELETE FROM payments.payment_events_outbox');
    await run("UPDATE trips SET registration_closed = 0, status = 'live', max_capacity = 5 WHERE id = $1", [testTrip.id]);
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
  function traveler(user = testUser) {
    return { ...user, role: 'regular', phone_number: '9999999999', age: 29, gender: 'Other', profession: 'Tester', fooding_habit: 'Any' } as any;
  }
  function bookingInput(count = 1) {
    return { trip_id: testTrip.id, male_count: count, female_count: 0, child_count: 0,
      names: Array.from({ length: count }, (_, i) => `Traveler ${i}`), phone_number: '9999999999', trip_date: '2026-07-15' };
  }
  async function reserve(count = 1) {
    const result = await createBookingPaymentOrder(traveler(), bookingInput(count));
    assert.ok(result.ok, JSON.stringify(result));
    return result.body;
  }
  async function capture(booking: any) {
    const order = await queryOne<any>('SELECT * FROM payments.orders WHERE booking_id = $1 ORDER BY created_at DESC LIMIT 1', [booking.bookingId]);
    const result = await confirmPaymentFromWebhook({ provider: order.provider, providerOrderId: order.provider_order_id,
      providerPaymentId: `pay_${uuidv4()}`, amount: order.amount, currency: 'INR', rawPayment: {} });
    assert.ok(result.ok, JSON.stringify(result));
    return result;
  }

  test('Regression: matching an unverified phone cannot list, read, or claim another booking', async () => {
    const booking = await reserve();
    (global as any).mockSessionUser = traveler(testUserB);
    try {
      const listed = await listMyBookings();
      assert.equal(listed.status, 200);
      assert.equal((await listed.json()).bookings.length, 0);
      const status = await readBookingStatus(new Request('http://localhost'), { params: Promise.resolve({ bookingId: booking.bookingId }) });
      assert.equal(status.status, 404);
      const claim = await createBookingPaymentOrder(traveler(testUserB), { ...bookingInput(), booking_id: booking.bookingId });
      assert.equal(claim.ok, false);
      assert.equal((await queryOne<any>('SELECT user_id FROM trip_bookings WHERE id = $1', [booking.bookingId])).user_id, testUser.id);
    } finally { delete (global as any).mockSessionUser; }
  });

  test('Regression: retries reject changed passengers and trip, and preserve the stored price', async () => {
    const booking = await reserve(2);
    await run("UPDATE payments.orders SET status = 'FAILED' WHERE booking_id = $1", [booking.bookingId]);
    const fewer = await createBookingPaymentOrder(traveler(), { ...bookingInput(), booking_id: booking.bookingId });
    assert.equal(fewer.ok, false);
    const otherTrip = uuidv4();
    await run(`INSERT INTO trips (id, organizer_id, title, description, duration_days, destination, status, gotogether_price, start_date)
      VALUES ($1, $2, 'Cheap trip', 'Test description', 1, 'Local', 'live', '1', '2026-07-15')`, [otherTrip, testOrganizer.id]);
    const wrongTrip = await createBookingPaymentOrder(traveler(), { ...bookingInput(2), trip_id: otherTrip, booking_id: booking.bookingId });
    assert.equal(wrongTrip.ok, false);
    await run("UPDATE trips SET gotogether_price = '1' WHERE id = $1", [testTrip.id]);
    try {
      const retry = await createBookingPaymentOrder(traveler(), { ...bookingInput(2), booking_id: booking.bookingId });
      assert.ok(retry.ok, JSON.stringify(retry));
      assert.equal(retry.body.amount, 10000);
      await capture(retry.body);
      const stored = await queryOne<any>('SELECT amount, male_count, booking_status FROM trip_bookings WHERE id = $1', [booking.bookingId]);
      assert.deepEqual(stored, { amount: 10000, male_count: 2, booking_status: 'confirmed' });
    } finally { await run("UPDATE trips SET gotogether_price = '50' WHERE id = $1", [testTrip.id]); }
  });

  test('Regression: the last held seat can resume the same checkout without a second order', async () => {
    await run('UPDATE trips SET max_capacity = 1 WHERE id = $1', [testTrip.id]);
    const booking = await reserve();
    for (const body of [bookingInput(), { ...bookingInput(), booking_id: booking.bookingId }]) {
      const retry = await createBookingPaymentOrder(traveler(), body);
      assert.ok(retry.ok, JSON.stringify(retry));
      assert.equal(retry.body.orderId, booking.orderId);
    }
    assert.equal(Number((await queryOne<any>('SELECT COUNT(*) AS count FROM payments.orders WHERE booking_id = $1', [booking.bookingId])).count), 1);
  });

  test('Regression: organizer cancellation closes unpaid bookings and refunds a late capture', async () => {
    const booking = await reserve();
    (global as any).mockSessionUser = { ...traveler(testOrganizer), role: 'business' };
    try {
      const response = await cancelTrip(new Request('http://localhost', { method: 'POST', body: JSON.stringify({ reason_type: 'weather', reason: 'Unsafe weather' }) }), { params: Promise.resolve({ id: testTrip.id }) });
      assert.equal(response.status, 200, await response.text());
    } finally { delete (global as any).mockSessionUser; }
    const result = await capture(booking);
    assert.equal(result.refundRequired, true);
    assert.equal(Number((await queryOne<any>('SELECT COUNT(*) AS count FROM booking_tickets WHERE booking_id = $1', [booking.bookingId])).count), 0);
    assert.equal((await queryOne<any>('SELECT status FROM trips WHERE id = $1', [testTrip.id])).status, 'cancelled');
  });

  test('Regression: concurrent refunds submit once and ambiguous retries preserve amount and identity', async () => {
    const booking = await reserve(); await capture(booking);
    const adapter = getPaymentProviderAdapter(PAYMENT_PROVIDER.RAZORPAY);
    const original = adapter.refundPayment;
    const attempts: any[] = [];
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    adapter.refundPayment = async input => { attempts.push(input); await gate; throw new Error('Response lost after gateway acceptance'); };
    try {
      const first = requestBookingRefund(booking.bookingId, 'Half refund', 2500);
      while (!attempts.length) await new Promise(resolve => setTimeout(resolve, 10));
      const second = await requestBookingRefund(booking.bookingId, 'Different caller', 5000);
      assert.ok(second.ok);
      const worker = await processPendingRefunds(); assert.equal(worker.processed, 0);
      release(); assert.equal((await first).ok, false);
      adapter.refundPayment = async input => { attempts.push(input); return { id: 'refund_idempotent', status: 'pending' }; };
      const retried = await requestBookingRefund(booking.bookingId, 'Retry with different reason', 5000);
      assert.ok(retried.ok);
      assert.equal(attempts.length, 2);
      assert.equal(attempts[0].amount, 2500);
      assert.deepEqual(attempts[1], attempts[0]);
    } finally { release(); adapter.refundPayment = original; }
  });

  test('Regression: reconciliation ignores rejected logs and replays only the immutable verified event', async () => {
    const booking = await reserve();
    const parsed = { eventType: 'payment.captured', providerEventId: 'event_trusted', rawEvent: {},
      payment: { providerOrderId: booking.orderId, providerPaymentId: 'pay_trusted', amount: booking.amount, currency: 'INR', method: null, raw: {} } };
    const event = await claimPaymentEvent({ provider: 'RAZORPAY', providerEventId: 'event_trusted', payloadHash: 'trusted_hash', verifiedPayload: parsed });
    assert.ok(event);
    const changed = await claimPaymentEvent({ provider: 'RAZORPAY', providerEventId: 'event_trusted', payloadHash: 'changed_hash', verifiedPayload: { ...parsed, eventType: 'payment.failed' } });
    assert.equal(changed, null);
    await run("UPDATE payments.payment_events SET created_at = NOW() - INTERVAL '3 minutes' WHERE id = $1", [event.id]);
    await run(`INSERT INTO payments.webhook_logs (id, provider, provider_event_id, event_type, payload, response_status, processing_error)
      VALUES ($1, 'RAZORPAY', 'event_trusted', 'payment.captured', $2::jsonb, 400, 'Invalid signature')`, [uuidv4(), JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_attacker', order_id: booking.orderId, amount: booking.amount } } } })]);
    // Avoid sending notification emails; this test concerns recovery authorization.
    await run('DELETE FROM payments.payment_events_outbox');
    const originalFetch = global.fetch;
    global.fetch = async () => new Response(JSON.stringify({ id: 'email_test' }), { status: 200 });
    try {
      const result = await reconcilePayments();
      assert.equal(result.webhookEventsReprocessed, 1, JSON.stringify(result));
      const payment = await queryOne<any>("SELECT provider_payment_id FROM payments.transactions WHERE status = 'SUCCESS'");
      assert.equal(payment.provider_payment_id, 'pay_trusted');
    } finally { global.fetch = originalFetch; }
  });

  test('Regression: gateway recovery uses a real captured payment ID for later refunds', async () => {
    const booking = await reserve();
    await run("UPDATE payments.orders SET created_at = NOW() - INTERVAL '6 minutes' WHERE booking_id = $1", [booking.bookingId]);
    await run('DELETE FROM payments.payment_events_outbox');
    const adapter = getPaymentProviderAdapter(PAYMENT_PROVIDER.RAZORPAY);
    const oldStatus = adapter.fetchOrderStatus, oldPayment = adapter.fetchSuccessfulPayment, oldRefund = adapter.refundPayment;
    const originalFetch = global.fetch;
    let refundInput: any;
    adapter.fetchOrderStatus = async () => ({ status: 'SUCCESS', raw: { status: 'paid', amount: 5000 } });
    adapter.fetchSuccessfulPayment = async () => ({ providerOrderId: booking.orderId, providerPaymentId: 'pay_real_capture', amount: 5000, currency: 'INR', method: 'card', rawPayment: {} });
    adapter.refundPayment = async input => { refundInput = input; return { id: 'refund_real_capture' }; };
    global.fetch = async () => new Response(JSON.stringify({ id: 'email_test' }), { status: 200 });
    try {
      assert.equal((await reconcilePayments()).ordersSynced, 1);
      assert.ok((await requestBookingRefund(booking.bookingId, 'Test')).ok);
      assert.equal(refundInput.providerPaymentId, 'pay_real_capture');
      assert.equal(refundInput.providerOrderId, booking.orderId);
    } finally { adapter.fetchOrderStatus = oldStatus; adapter.fetchSuccessfulPayment = oldPayment; adapter.refundPayment = oldRefund; global.fetch = originalFetch; }
  });

  test('Regression: outbox failure retries only the failed recipient and concurrent workers claim once', async () => {
    const booking = await reserve(); await capture(booking);
    await run("DELETE FROM payments.payment_events_outbox WHERE event_type <> 'booking_confirmed'");
    const originalFetch = global.fetch;
    const recipients: string[] = [];
    let failOrganizer = true;
    global.fetch = async (_url, init) => {
      const email = JSON.parse(String(init?.body)); recipients.push(email.to[0]);
      if (email.to[0] === testOrganizer.email && failOrganizer) return new Response(JSON.stringify({ name: 'validation_error', message: 'Temporary failure' }), { status: 500 });
      return new Response(JSON.stringify({ id: 'email_mock' }), { status: 200 });
    };
    try {
      const initial = await processOutboxEvents(); assert.equal(initial.failed, 1);
      const event = await queryOne<any>('SELECT processed_at, payload FROM payments.payment_events_outbox');
      assert.equal(event.processed_at, null); assert.equal(event.payload.traveler_sent, true);
      failOrganizer = false;
      const workers = await Promise.all([processOutboxEvents(), processOutboxEvents()]);
      assert.equal(workers.reduce((n, w) => n + w.processed, 0), 1);
      assert.equal(recipients.filter(r => r === testUser.email).length, 1);
      assert.equal(recipients.filter(r => r === testOrganizer.email).length, 2);
    } finally { global.fetch = originalFetch; }
  });

  test('Regression: concurrent buddy decisions leave membership consistent with the winning status', async () => {
    const requestId = uuidv4();
    await run("INSERT INTO trip_requests (id, trip_id, requester_id, candidate_details, status) VALUES ($1,$2,$3,'{}','pending')", [requestId, testTrip.id, testUserB.id]);
    (global as any).mockSessionUser = traveler(testOrganizer);
    try {
      const responses = await Promise.all(['accept', 'reject'].map(action => processBuddyRequest(new Request('http://localhost', { method: 'POST', body: JSON.stringify({ action }) }), { params: Promise.resolve({ id: requestId }) })));
      assert.equal(responses.filter(r => r.status === 200).length, 1);
      const request = await queryOne<any>('SELECT status FROM trip_requests WHERE id = $1', [requestId]);
      const member = await queryOne('SELECT id FROM trip_participants WHERE trip_id = $1 AND user_id = $2', [testTrip.id, testUserB.id]);
      assert.equal(Boolean(member), request.status === 'accepted');
    } finally {
      delete (global as any).mockSessionUser;
      await run('DELETE FROM trip_requests WHERE id = $1', [requestId]);
      await run('DELETE FROM trip_participants WHERE trip_id = $1', [testTrip.id]);
    }
  });

});


