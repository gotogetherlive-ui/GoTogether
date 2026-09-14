import { randomBytes } from "node:crypto";
import { query, queryOne, run, transaction } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";
import QRCode from "qrcode";
import { parseInrToPaise } from "@/lib/money";
import { normalizePaymentProvider, parseEnabledPaymentProviders } from "./provider-config";
import { PaymentService } from "./payment-service";
import { SecretManager } from "./secret-manager";
import { BOOKING_STATUS, PAYMENT_MODE, PAYMENT_PROVIDER, PAYMENT_STATUS, REFUND_STATUS, type PaymentMode, type PaymentProvider, type ProviderAccount } from "./domain";
import {
  attachProviderOrder,
  createOrUpdateTransaction,
  createPaymentOrder,
  createRefund,
  enqueuePaymentOutboxEvent,
  findOrderByBookingId,
  findOrderByProviderOrderId,
  findDefaultProviderAccount,
  findProviderAccountById,
  findRefundByBookingId,
  findSuccessfulTransactionByBookingId,
  lockOrder,
  updateOrderStatus,
  updateOrderStatusIfMutable,
  type PaymentOrderRecord,
} from "./repository";
import { generateBookingReference } from "./utils";
import { validateBookingOrderRequest } from "./validation";
import { absoluteUrl } from "@/lib/seo";

function isBookingProfileComplete(user: SessionUser): boolean {
  return !!(
    user.full_name?.trim() &&
    user.phone_number?.trim() &&
    user.age &&
    user.gender &&
    user.profession &&
    user.fooding_habit
  );
}
function getProviderCheckoutKey(provider: string, providerAccount?: ProviderAccount | null): string {
  if (providerAccount?.api_key_enc) {
    try {
      return SecretManager.decrypt(providerAccount.api_key_enc);
    } catch (err) {
      console.error("[getProviderCheckoutKey] Failed to decrypt provider checkout key:", err);
    }
  }

  if (provider === "RAZORPAY") return process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || "";
  if (provider === "CASHFREE") return process.env.CASHFREE_APP_ID || "";
  return "";
}

type CheckoutInstructions = {
  provider: PaymentProvider;
  method: "razorpay" | "cashfree";
  scriptUrl?: string;
  checkoutKey?: string;
  paymentSessionId?: string;
  environment?: "sandbox" | "production";
  merchantId?: string;
  orderToken?: string;
  amount?: string;
  paymentUrl?: string;
  formFields?: Record<string, string>;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function pickString(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function getProviderCheckout(
  provider: PaymentProvider,
  providerAccount: ProviderAccount | null | undefined,
  raw: unknown,
): CheckoutInstructions | null {
  const payload = asRecord(raw);

  if (provider === PAYMENT_PROVIDER.RAZORPAY) {
    return {
      provider,
      method: "razorpay",
      checkoutKey: getProviderCheckoutKey(provider, providerAccount),
    };
  }

  if (provider === PAYMENT_PROVIDER.CASHFREE) {
    const paymentSessionId = pickString(payload.payment_session_id) || pickString(payload.paymentSessionId);
    if (!paymentSessionId) return null;
    return {
      provider,
      method: "cashfree",
      scriptUrl: "https://sdk.cashfree.com/js/v3/cashfree.js",
      paymentSessionId,
      environment: process.env.CASHFREE_ENV === "production" ? "production" : "sandbox",
    };
  }
  return null;
}

function isPaymentSimulationAllowed(): boolean {
  const simulationRequested = ['1', 'true', 'yes', 'on'].includes(String(process.env.ALLOW_PAYMENT_SIMULATION || '').toLowerCase());
  if (process.env.NODE_ENV !== 'production') return true;
  return simulationRequested && ['1', 'true', 'yes', 'on'].includes(String(process.env.ALLOW_UNSAFE_PRODUCTION_PAYMENT_SIMULATION || '').toLowerCase());
}

function isTrustedPaymentBaseUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false;
  const configured = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!configured) return process.env.NODE_ENV !== 'production';
  try {
    return new URL(value).origin === new URL(configured).origin;
  } catch {
    return false;
  }
}

function isProviderSimulated(provider: string, providerAccount?: ProviderAccount | null): boolean {
  if (providerAccount && providerAccount.api_key_enc) {
    try {
      const keyId = SecretManager.decrypt(providerAccount.api_key_enc);
      if (provider === "RAZORPAY") {
        return !keyId || keyId === "rzp_test_your_key_id";
      }
      if (provider === "CASHFREE") {
        return !keyId || keyId === "your_app_id";
      }
    } catch (err) {
      console.error("[isProviderSimulated] Failed to decrypt provider credentials:", err);
      return true;
    }
  }

  if (provider === "RAZORPAY") {
    return !process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === "rzp_test_your_key_id";
  }
  if (provider === "CASHFREE") {
    return !process.env.CASHFREE_APP_ID || process.env.CASHFREE_APP_ID === "your_app_id";
  }
  return true;
}


function getPlatformPaymentProvider(): PaymentProvider {
  return normalizePaymentProvider(process.env.PAYMENT_PROVIDER)
    || parseEnabledPaymentProviders(process.env.ENABLED_ORGANIZER_PAYMENT_PROVIDERS)[0]
    || PAYMENT_PROVIDER.RAZORPAY;
}
function getPlatformCommissionAmount(amount: number): number {
  const enabled = ["1", "true", "yes", "on"].includes(String(process.env.ENABLE_PLATFORM_COMMISSION || "").toLowerCase());
  if (!enabled) return 0;
  const fixed = Number(process.env.PLATFORM_COMMISSION_AMOUNT_PAISE || 0);
  if (Number.isFinite(fixed) && fixed > 0) return Math.min(amount, Math.floor(fixed));
  const percent = Number(process.env.PLATFORM_COMMISSION_PERCENT || 0);
  if (!Number.isFinite(percent) || percent <= 0) return 0;
  return Math.min(amount, Math.floor((amount * percent) / 100));
}
function getProviderRefundId(refund: unknown): string {
  const data = asRecord(refund);
  return pickString(data.id)
    || pickString(data.refundId)
    || pickString(data.refund_id)
    || pickString(asRecord(data.raw).id);
}

function mapPaymentStatusToPublic(status: string) {
  switch (status) {
    case PAYMENT_STATUS.SUCCESS:
      return "paid";
    case PAYMENT_STATUS.PROCESSING:
      return "processing";
    case PAYMENT_STATUS.REFUNDED:
      return "refunded";
    case PAYMENT_STATUS.FAILED:
      return "failed";
    default:
      return "pending";
  }
}

function isUsableTripOrganizerProviderAccount(
  providerAccount: ProviderAccount | null,
  tripOrganizerId: string,
  paymentMode: PaymentMode,
): providerAccount is ProviderAccount {
  return !!providerAccount
    && providerAccount.organizer_id === tripOrganizerId
    && providerAccount.ownership_model === paymentMode
    && providerAccount.status === 'active'
    && providerAccount.verification_status === 'verified'
    && !!providerAccount.api_key_enc
    && !!providerAccount.api_secret_enc
    && (providerAccount.provider !== PAYMENT_PROVIDER.RAZORPAY || !!providerAccount.webhook_secret_enc);
}
function generateTicketNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = randomBytes(4).toString("hex").toUpperCase();
  return `TKT-${date}-${suffix}`;
}

function getTicketVerificationUrl(ticketNumber: string): string {
  return absoluteUrl(`/verify-ticket/${encodeURIComponent(ticketNumber)}`);
}

export async function createBookingPaymentOrder(user: SessionUser, rawBody: unknown) {
  const validated = validateBookingOrderRequest(rawBody as never);
  if (!validated.ok) return { ok: false as const, status: 400, error: validated.error };
  if (!isBookingProfileComplete(user)) {
    return { ok: false as const, status: 403, error: "Complete your dashboard profile before booking a trip." };
  }
  const input = validated.value;

  const local = await transaction(async () => {
    await run("SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))", [input.tripId]);

    const trip = await queryOne<{
      id: string;
      title: string;
      max_capacity: number | null;
      registration_closed: number | null;
      organizer_id: string;
      gotogether_price: string | null;
      b2b_price: string | null;
      b2c_price: string | null;
      start_date: string | null;
      organizer_name: string;
    }>(`
      SELECT t.id, t.title, t.max_capacity, t.registration_closed, t.organizer_id,
             t.gotogether_price, t.b2b_price, t.b2c_price, t.start_date,
             u.full_name as organizer_name
      FROM trips t JOIN users u ON t.organizer_id = u.id
      WHERE t.id = $1 AND t.status = 'live'
    `, [input.tripId]);

    if (!trip) return { ok: false as const, status: 404, error: "Trip not found or not available" };
    if (trip.registration_closed) return { ok: false as const, status: 400, error: "Registration is closed for this trip" };
    if (trip.start_date && input.tripDate !== trip.start_date) {
      return { ok: false as const, status: 400, error: "Custom-date bookings require organizer review and cannot be paid online yet." };
    }
    const modeConfig = await PaymentService.getActiveMode();
    let providerAccount: ProviderAccount | null = null;
    let provider: PaymentProvider;
    if (modeConfig.mode === PAYMENT_MODE.PLATFORM_CONTROLLED) {
      provider = getPlatformPaymentProvider();
    } else {
      providerAccount = await findDefaultProviderAccount(trip.organizer_id, modeConfig.mode);
      if (!isUsableTripOrganizerProviderAccount(providerAccount, trip.organizer_id, modeConfig.mode)) {
        return { ok: false as const, status: 400, error: "Please contact support team. Organizer payment gateway is not verified yet." };
      }
      provider = providerAccount.provider;
    }

    if (isProviderSimulated(provider, providerAccount) && !isPaymentSimulationAllowed()) {
      return { ok: false as const, status: 502, error: 'Payment gateway is not configured for production.' };
    }

    // Resolve the stored reservation before pricing or capacity checks. A phone
    // number is contact information, never authority to claim another account's booking.
    const reservation = input.bookingId
      ? await queryOne<any>(`SELECT * FROM trip_bookings WHERE id = $1 AND user_id = $2 FOR UPDATE`, [input.bookingId, user.id])
      : await queryOne<any>(`SELECT * FROM trip_bookings WHERE trip_id = $1 AND user_id = $2 AND trip_date = $3
          AND booking_status IN ('pending_payment', 'payment_processing', 'confirmed')
          AND cancelled_at IS NULL AND (booking_status = 'confirmed' OR expires_at IS NULL OR expires_at > NOW())
          ORDER BY created_at DESC LIMIT 1 FOR UPDATE`, [input.tripId, user.id, input.tripDate]);
    if (input.bookingId && !reservation) return { ok: false as const, status: 404, error: "Booking not found" };
    if (reservation) {
      if (reservation.trip_id !== input.tripId || reservation.trip_date !== input.tripDate
          || Number(reservation.male_count) !== input.maleCount
          || Number(reservation.female_count) !== input.femaleCount
          || Number(reservation.child_count) !== input.childCount) {
        return { ok: false as const, status: 409, error: "Booking details cannot be changed during payment. Use the original reservation." };
      }
      input.bookingId = reservation.id;
    }

    if (trip.max_capacity) {
      const booked = await queryOne<{ total: number | string }>(`
        SELECT COALESCE(SUM(male_count + female_count + child_count), 0) as total
        FROM trip_bookings
        WHERE trip_id = $1
          AND ($2::text IS NULL OR id <> $2)
          AND booking_status IN ('pending_payment', 'payment_processing', 'confirmed')
          AND cancelled_at IS NULL
          AND (expires_at IS NULL OR expires_at > NOW() OR booking_status = 'confirmed')
      `, [input.tripId, input.bookingId]);
      const bookedCount = Number(booked?.total || 0);
      if (bookedCount + input.totalCount > Number(trip.max_capacity)) {
        const remaining = Number(trip.max_capacity) - bookedCount;
        return { ok: false as const, status: 400, error: `Not enough seats. Only ${Math.max(0, remaining)} seat${remaining !== 1 ? "s" : ""} remaining.` };
      }
    }

    const amount = parseInrToPaise(trip.gotogether_price || trip.b2b_price || trip.b2c_price);
    if (amount <= 0) return { ok: false as const, status: 400, error: "Trip price is not configured. Contact the organizer." };

    let bookingId = input.bookingId;
    let bookingRef = "";
    let isNewBooking = true;
    const totalAmount = reservation ? Number(reservation.amount) : amount * input.totalCount;
    if (!Number.isSafeInteger(totalAmount) || totalAmount <= 0) return { ok: false as const, status: 400, error: "Invalid booking amount" };
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();

    if (bookingId) {
      const existingBooking = await queryOne<any>(
        `SELECT id, user_id, trip_id, trip_date, booking_status, payment_status, booking_ref, phone_number, expires_at
         FROM public.trip_bookings
         WHERE id = $1`,
        [bookingId]
      );
      if (!existingBooking) {
        return { ok: false as const, status: 404, error: "Booking not found" };
      }
      const retryableFailedBooking = existingBooking.booking_status === BOOKING_STATUS.FAILED && existingBooking.payment_status === 'failed';
      if (existingBooking.booking_status !== BOOKING_STATUS.PENDING_PAYMENT && !retryableFailedBooking) {
        return { ok: false as const, status: 400, error: `Booking status is ${existingBooking.booking_status} and cannot be paid` };
      }
      if (existingBooking.expires_at && new Date(existingBooking.expires_at) <= new Date()) {
        await run(
          `UPDATE public.trip_bookings
           SET booking_status = 'expired', payment_status = 'unpaid', approval_status = 'rejected', status = 'rejected'
           WHERE id = $1 AND booking_status IN ('pending_payment', 'payment_processing')`,
          [bookingId]
        );
        await run(
          `UPDATE payments.orders SET status = 'FAILED', updated_at = NOW()
           WHERE booking_id = $1 AND status IN ('CREATED', 'PENDING', 'PROCESSING')`,
          [bookingId]
        );
        return { ok: false as const, status: 410, error: "Payment window expired. Please create a new booking." };
      }

      bookingRef = existingBooking.booking_ref;
      isNewBooking = false;
      // Check if there is already an active payment order for this booking
      const existingOrder = await queryOne<PaymentOrderRecord>(
        `SELECT provider_order_id, order_reference, provider, provider_account_id, amount, currency, provider_payload FROM payments.orders
         WHERE booking_id = $1
           AND status IN ('CREATED', 'PENDING', 'PROCESSING')
           AND expires_at > NOW()
         ORDER BY created_at DESC
         LIMIT 1`,
        [bookingId]
      );

      if (existingOrder && existingOrder.provider_order_id && Number(existingOrder.amount) === totalAmount) {
        return {
          ok: true as const,
          alreadyExists: true as const,
          bookingId,
          orderId: existingOrder.provider_order_id,
          bookingRef: existingOrder.order_reference,
          amount: Number(existingOrder.amount),
          currency: existingOrder.currency,
          provider: existingOrder.provider || provider,
          providerAccount: await findProviderAccountById(existingOrder.provider_account_id),
          tripTitle: trip.title,
          providerPayload: existingOrder.provider_payload,
        };
      }

      if (existingOrder && !existingOrder.provider_order_id) return { ok: false as const, status: 409, error: "Checkout is being prepared. Please retry shortly." };

      // Supersede an unusable or mismatched order before creating its replacement.
      await run(
        `UPDATE payments.orders SET status = 'FAILED', updated_at = NOW()
         WHERE booking_id = $1 AND status IN ('CREATED', 'PENDING', 'PROCESSING')`,
        [bookingId]
      );
    } else {
      bookingId = uuidv4();
      bookingRef = generateBookingReference();
    }

    const orderId = uuidv4();

    if (isNewBooking) {
      await run(`
        INSERT INTO trip_bookings (
          id, trip_id, user_id, male_count, female_count, child_count,
          names, phone_number, alternate_phone_number, trip_date,
          status, booking_ref, booking_status, payment_status, approval_status,
          amount, expires_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending',$11,$12,'pending','awaiting_payment',$13,$14)
      `, [
        bookingId,
        input.tripId,
        user.id,
        input.maleCount,
        input.femaleCount,
        input.childCount,
        JSON.stringify(input.names),
        input.phoneNumber,
        input.alternatePhoneNumber,
        input.tripDate,
        bookingRef,
        BOOKING_STATUS.PENDING_PAYMENT,
        totalAmount,
        expiresAt,
      ]);
    } else {
      await run(
        `UPDATE trip_bookings SET expires_at = $1 WHERE id = $2`,
        [expiresAt, bookingId]
      );
    }

    await createPaymentOrder({
      id: orderId,
      order_reference: `${bookingRef}-${orderId.slice(0, 8)}`,
      provider,
      booking_id: bookingId!,
      user_id: user.id,
      trip_id: input.tripId,
      organizer_id: trip.organizer_id,
      amount: totalAmount,
      currency: "INR",
      status: PAYMENT_STATUS.CREATED,
      payment_mode: modeConfig.mode,
      provider_account_id: providerAccount?.id || null,
      platform_commission_amount: getPlatformCommissionAmount(totalAmount),
      expires_at: expiresAt,
    });

    if (isNewBooking) {
      await enqueuePaymentOutboxEvent({
        aggregateType: "booking",
        aggregateId: bookingId!,
        eventType: "booking_created",
        payload: { bookingId: bookingId!, bookingRef, userId: user.id, tripId: input.tripId, amount: totalAmount },
      });
    }

    return {
      ok: true as const,
      status: 201,
      bookingId,
      orderId,
      bookingRef,
      amount: totalAmount,
      currency: "INR",
      provider,
      providerAccount,
      organizerId: trip.organizer_id,
      tripTitle: trip.title,
    };
  });

  if (!local.ok) return local;

  if ('alreadyExists' in local && local.alreadyExists) {
    return {
      ok: true as const,
      status: 200,
      body: {
        success: true,
        bookingId: local.bookingId!,
        bookingRef: local.bookingRef,
        orderId: local.orderId,
        amount: local.amount,
        currency: local.currency,
        prefill: { name: user.full_name || "", email: user.email || "", contact: input.phoneNumber || user.phone_number || "" },
        tripTitle: local.tripTitle,
        isSimulated: isProviderSimulated(local.provider, local.providerAccount),
        provider: local.provider,
        checkoutKey: getProviderCheckoutKey(local.provider, local.providerAccount),
        checkout: getProviderCheckout(local.provider, local.providerAccount, local.providerPayload),
      },
    };
  }

  try {
    const gatewayOrder = await PaymentService.createPayment({
      orderId: local.orderId,
      bookingId: local.bookingId!,
      bookingRef: local.bookingRef,
      tripId: input.tripId,
      userId: user.id,
      amount: local.amount,
      currency: local.currency,
      provider: local.provider,
      providerAccount: local.providerAccount,
      notes: {
        booking_id: local.bookingId!,
        booking_ref: local.bookingRef,
        trip_id: input.tripId,
        user_id: user.id,
        organizer_id: local.organizerId || "",
        provider_account_id: local.providerAccount?.id || "",
        base_url: input.baseUrl || "",
        customer_name: user.full_name || input.names[0] || "GoTogether Customer",
        customer_email: user.email || "",
        customer_phone: input.phoneNumber || user.phone_number || "",
        trip_title: local.tripTitle || "",
      },
    });

    await transaction(async () => {
      await attachProviderOrder(local.orderId, gatewayOrder.id, gatewayOrder.raw);
      await run(
        `UPDATE trip_bookings SET razorpay_order_id = $1 WHERE id = $2 AND booking_status = 'pending_payment'`,
        [gatewayOrder.id, local.bookingId]
      );
    });

    return {
      ok: true as const,
      status: 201,
      body: {
        success: true,
        bookingId: local.bookingId!,
        bookingRef: local.bookingRef,
        orderId: gatewayOrder.id,
        amount: local.amount,
        currency: local.currency,
        prefill: { name: user.full_name || "", email: user.email || "", contact: input.phoneNumber || user.phone_number || "" },
        tripTitle: local.tripTitle,
        isSimulated: isProviderSimulated(local.provider, local.providerAccount),
        provider: local.provider,
        checkoutKey: getProviderCheckoutKey(local.provider, local.providerAccount),
        checkout: getProviderCheckout(local.provider, local.providerAccount, gatewayOrder.raw),
      },
    };
  } catch (error) {
    await transaction(async () => {
      await updateOrderStatusIfMutable(local.orderId, PAYMENT_STATUS.FAILED);
      await run(
        `UPDATE trip_bookings
         SET booking_status = 'pending_payment', payment_status = 'pending', approval_status = 'awaiting_payment', status = 'pending'
         WHERE id = $1 AND booking_status IN ('pending_payment', 'payment_processing', 'failed')`,
         [local.bookingId]
      );
    });
    console.error("[PAYMENTS] Failed to create provider order:", error);
    return { ok: false as const, status: 502, error: "Payment gateway is temporarily unavailable. Please try again." };
  }
}

export async function acknowledgeFrontendPayment(user: SessionUser, body: any) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body || {};
  const provider = normalizePaymentProvider(body?.provider) || PAYMENT_PROVIDER.RAZORPAY;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return { ok: false as const, status: 400, error: "Missing payment details" };
  }
  const order = await findOrderByProviderOrderId(provider, razorpay_order_id);
  if (!order) return { ok: false as const, status: 404, error: "Payment order not found" };
  const providerAccount = await findProviderAccountById(order.provider_account_id);
  
  let validSignature = false;
  const isMockAllowed = isProviderSimulated(provider, providerAccount) && isPaymentSimulationAllowed();
  if (isMockAllowed && (body.isSimulated || razorpay_signature === "mock_signature" || razorpay_signature?.startsWith("mock_sig_"))) {
    validSignature = true;
  } else {
    validSignature = await PaymentService.verifyPayment({ provider, providerOrderId: razorpay_order_id, providerPaymentId: razorpay_payment_id, signature: razorpay_signature, providerAccount });
  }

  if (!validSignature) return { ok: false as const, status: 400, error: "Invalid payment signature" };
  if (order.user_id !== user.id) return { ok: false as const, status: 403, error: "Forbidden" };

  await transaction(async () => {
    const lockedOrder = await lockOrder(order.id);
    if (!lockedOrder) throw new Error("Payment order disappeared during frontend acknowledgement");
    if (lockedOrder.status === PAYMENT_STATUS.SUCCESS) return;

    await updateOrderStatusIfMutable(order.id, PAYMENT_STATUS.PROCESSING);
    await createOrUpdateTransaction({
      orderId: order.id,
      provider: order.provider,
      providerPaymentId: razorpay_payment_id,
      amount: order.amount,
      currency: order.currency,
      status: PAYMENT_STATUS.PROCESSING,
      providerResponse: { frontend_signature_verified: true, is_simulated: !!body.isSimulated },
    });
    await run(
      `UPDATE trip_bookings
       SET booking_status = CASE WHEN booking_status = 'pending_payment' THEN 'payment_processing' ELSE booking_status END,
           payment_status = CASE WHEN payment_status IN ('pending', 'processing') THEN 'processing' ELSE payment_status END,
           razorpay_payment_id = COALESCE(razorpay_payment_id, $1)
       WHERE id = $2 AND booking_status NOT IN ('confirmed', 'cancelled', 'refund_pending', 'refunded')`,
      [razorpay_payment_id, order.booking_id]
    );
  });

  const confirmation = await confirmPaymentFromWebhook({
    provider,
    providerOrderId: razorpay_order_id,
    providerPaymentId: razorpay_payment_id,
    amount: Number(order.amount),
    currency: order.currency,
    method: body.method || (body.isSimulated ? "simulated" : null),
    rawPayment: {
      frontend_signature_verified: true,
      is_simulated: !!body.isSimulated,
      source: "frontend_verify",
    },
  });

  if (confirmation.ok) {
    return {
      ok: true as const,
      body: {
        status: confirmation.refundRequired ? "refund_pending" : "confirmed",
        bookingId: order.booking_id,
        ticketNumber: confirmation.ticketNumber || null,
        message: confirmation.refundRequired
          ? "Payment received after the booking could no longer be confirmed. Refund has been initiated."
          : "Payment confirmed successfully.",
      },
    };
  }
  if (body.isSimulated && isPaymentSimulationAllowed() && isTrustedPaymentBaseUrl(body.baseUrl)) {
    const baseUrl = body.baseUrl;
    setTimeout(async () => {
      try {
        const response = await fetch(`${baseUrl}/api/webhooks/payments/${provider.toLowerCase()}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-webhook-signature': 'mock_signature',
            'x-simulated-webhook': 'true',
          },
          body: JSON.stringify({
            event: 'payment.captured',
            id: 'evt_mock_' + Math.random().toString(36).substring(2, 11),
            payload: {
              payment: {
                entity: {
                  id: razorpay_payment_id,
                  order_id: razorpay_order_id,
                  amount: order.amount,
                  currency: order.currency || 'INR',
                  method: 'simulated',
                }
              }
            }
          })
        });
        const text = await response.text();
        console.log(`[SIMULATED WEBHOOK] Triggered. Response status: ${response.status}, text: ${text}`);
      } catch (e) {
        console.error("[SIMULATED WEBHOOK] Failed to trigger:", e);
      }
    }, 1500);
  }

  return { ok: true as const, body: { status: "verification_pending", bookingId: order.booking_id, message: "Payment received. Waiting for webhook confirmation." } };
}

export async function confirmPaymentFromWebhook(input: {
  providerOrderId: string;
  providerPaymentId: string;
  amount: number;
  currency?: string;
  method?: string | null;
  rawPayment: unknown;
  provider: PaymentProvider;
}) {
  const order = await findOrderByProviderOrderId(input.provider, input.providerOrderId);
  if (!order) return { ok: false as const, status: 404, error: "Payment order not found" };
  if (input.currency && input.currency !== order.currency) return { ok: false as const, status: 400, error: "Currency mismatch" };
  if (Number(order.amount) !== Number(input.amount)) return { ok: false as const, status: 400, error: "Amount mismatch" };

  let alreadyProcessed = false;
  let refundRequired = false;
  let ticketNumber = "";

  await transaction(async () => {
    await run("SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))", [order.trip_id]);
    const lockedOrder = await lockOrder(order.id);
    if (!lockedOrder) throw new Error("Payment order disappeared during confirmation");

    const booking = await queryOne<any>(`
      SELECT b.*, t.max_capacity, t.status AS trip_status, t.title as trip_title, t.destination,
             u.full_name as user_name
      FROM trip_bookings b
      JOIN trips t ON b.trip_id = t.id
      JOIN users u ON b.user_id = u.id
      WHERE b.id = $1 FOR UPDATE
    `, [order.booking_id]);
    if (!booking) throw new Error("Booking not found during confirmation");

    if (lockedOrder.status === PAYMENT_STATUS.SUCCESS) {
      refundRequired = booking.booking_status === BOOKING_STATUS.REFUND_PENDING;
      alreadyProcessed = !refundRequired;
      return;
    }

    await updateOrderStatus(order.id, PAYMENT_STATUS.SUCCESS);
    await createOrUpdateTransaction({
      orderId: order.id,
      provider: order.provider,
      providerPaymentId: input.providerPaymentId,
      amount: input.amount,
      currency: input.currency || order.currency,
      method: input.method || null,
      status: PAYMENT_STATUS.SUCCESS,
      paidAt: new Date().toISOString(),
      providerResponse: input.rawPayment,
    });

    if (booking.trip_status !== 'live' || booking.cancelled_at
        || !['pending_payment', 'payment_processing', 'confirmed'].includes(booking.booking_status)
        || Number(booking.amount) !== Number(order.amount)
        || booking.trip_id !== order.trip_id
        || (booking.expires_at && new Date(booking.expires_at) <= new Date())) {
      refundRequired = true;
      await run("UPDATE trip_bookings SET payment_status = 'refund_pending', booking_status = 'refund_pending' WHERE id = $1", [booking.id]);
      return;
    }

    if (booking.max_capacity) {
      const occupied = await queryOne<{ total: number | string }>(`
        SELECT COALESCE(SUM(male_count + female_count + child_count), 0) AS total
        FROM trip_bookings
        WHERE trip_id = $1 AND booking_status = 'confirmed' AND cancelled_at IS NULL
      `, [booking.trip_id]);
      const seats = Number(booking.male_count || 0) + Number(booking.female_count || 0) + Number(booking.child_count || 0);
      if (Number(occupied?.total || 0) + seats > Number(booking.max_capacity)) {
        refundRequired = true;
        await run("UPDATE trip_bookings SET payment_status = 'refund_pending', booking_status = 'refund_pending' WHERE id = $1", [booking.id]);
        return;
      }
    }

    await run(`
      UPDATE trip_bookings SET
        booking_status = 'confirmed',
        payment_status = 'paid',
        approval_status = 'approved',
        status = 'approved',
        razorpay_payment_id = $1,
        paid_at = NOW(),
        verified_at = NOW(),
        notification_seen = 0,
        user_notification_seen = 0
      WHERE id = $2
    `, [input.providerPaymentId, booking.id]);

    ticketNumber = generateTicketNumber();
    const qrData = getTicketVerificationUrl(ticketNumber);
    let qrCodeData = "";
    try { qrCodeData = await QRCode.toDataURL(qrData, { width: 300, margin: 2 }); } catch {}
    await run(
      `INSERT INTO booking_tickets (id, booking_id, ticket_number, qr_code_data)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (booking_id) DO NOTHING`,
      [uuidv4(), booking.id, ticketNumber, qrCodeData]
    );

    if (booking.max_capacity) {
      const confirmed = await queryOne<{ total: number | string }>(`
        SELECT COALESCE(SUM(male_count + female_count + child_count), 0) AS total
        FROM trip_bookings WHERE trip_id = $1 AND booking_status = 'confirmed' AND cancelled_at IS NULL
      `, [booking.trip_id]);
      if (Number(confirmed?.total || 0) >= Number(booking.max_capacity)) {
        await run("UPDATE trips SET registration_closed = 1 WHERE id = $1", [booking.trip_id]);
      }
    }

    await enqueuePaymentOutboxEvent({ aggregateType: "booking", aggregateId: booking.id, eventType: "booking_confirmed", payload: { bookingId: booking.id, ticketNumber, paymentId: input.providerPaymentId } });
  });

  if (refundRequired) {
    const refund = await requestBookingRefund(order.booking_id, "Automatic refund for expired or unavailable booking");
    if (!refund.ok) return { ok: false as const, status: refund.status, error: refund.error };
  }

  if (alreadyProcessed) return { ok: true as const, alreadyProcessed: true, ticketNumber: null };
  return { ok: true as const, refundRequired, ticketNumber };
}

export async function expirePendingPaymentBookings() {
  const expired = await queryOne<{ count: number | string }>(`
    WITH expired AS (
      UPDATE trip_bookings
      SET booking_status = 'expired', payment_status = 'unpaid', approval_status = 'rejected', status = 'rejected'
      WHERE booking_status IN ('pending_payment', 'payment_processing')
        AND expires_at IS NOT NULL
        AND expires_at < NOW()
      RETURNING id
    ), expired_orders AS (
      UPDATE payments.orders
      SET status = 'FAILED', updated_at = NOW()
      WHERE booking_id IN (SELECT id FROM expired)
        AND status IN ('CREATED', 'PENDING', 'PROCESSING')
      RETURNING id
    )
    SELECT COUNT(*) AS count FROM expired
  `, []);
  return Number(expired?.count || 0);
}

export async function requestBookingRefund(bookingId: string, reason: string, overrideAmount?: number | null) {
  // Serialize intent creation, but never hold a database transaction over the gateway call.
  const intent = await transaction(async () => {
    const booking = await queryOne(`SELECT id FROM trip_bookings WHERE id = $1 FOR UPDATE`, [bookingId]);
    if (!booking) return { ok: false as const, status: 404, error: "Booking not found" };
    const existing = await findRefundByBookingId(bookingId);
    if (existing) {
      if (existing.status === REFUND_STATUS.SUCCESS || (existing.status === REFUND_STATUS.PROCESSING && existing.provider_refund_id)) {
        return { ok: true as const, alreadyExists: true, providerRefundId: existing.provider_refund_id, refundId: existing.refund_id };
      }
      // Only a definitive provider failure starts a new gateway operation. Network
      // failures retain the old key and exact persisted amount/reason on every retry.
      if (existing.status === REFUND_STATUS.FAILED && existing.provider_refund_id) {
        await run(`UPDATE payments.refunds SET provider_refund_id = NULL, attempt_key = $2,
          status = 'PENDING', processing_token = NULL, processing_started_at = NULL WHERE refund_id = $1`, [existing.refund_id, uuidv4()]);
      }
      return { ok: true as const, alreadyExists: false, refundId: existing.refund_id };
    }
    const paid = await findSuccessfulTransactionByBookingId(bookingId);
    if (!paid) return { ok: false as const, status: 400, error: "No successful online payment found for this booking" };
    const amount = overrideAmount ?? Number(paid.amount);
    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > Number(paid.amount)) {
      return { ok: false as const, status: 400, error: "Invalid refund amount" };
    }
    const refundId = await createRefund({ transactionId: paid.transaction_id, amount, reason, status: REFUND_STATUS.PENDING });
    return { ok: true as const, alreadyExists: false, refundId };
  });
  if (!intent.ok || intent.alreadyExists) return intent;
  return dispatchRefund(intent.refundId);
}

async function dispatchRefund(refundId: string) {
  const token = uuidv4();
  const claimed = await queryOne<{ refund_id: string }>(`UPDATE payments.refunds
    SET processing_token = $2, processing_started_at = NOW(), status = 'PROCESSING',
        attempt_key = COALESCE(attempt_key, refund_id), updated_at = NOW()
    WHERE refund_id = $1 AND status IN ('PENDING', 'FAILED', 'PROCESSING')
      AND provider_refund_id IS NULL
      AND (processing_token IS NULL OR processing_started_at < NOW() - INTERVAL '5 minutes')
    RETURNING refund_id`, [refundId, token]);
  if (!claimed) return { ok: true as const, refundId, alreadyExists: true, providerRefundId: null };
  try {
    const refund = await queryOne<any>(`SELECT r.*, o.booking_id, o.provider_order_id, o.provider_account_id, o.payment_mode,
        t.provider, t.provider_payment_id FROM payments.refunds r
      JOIN payments.transactions t ON t.transaction_id = r.transaction_id JOIN payments.orders o ON o.id = t.order_id
      WHERE r.refund_id = $1`, [refundId]);
    if (!refund) throw new Error('Refund disappeared');
    if (refund.payment_mode === PAYMENT_MODE.ORGANIZER_OWNED && !refund.provider_account_id) throw new Error('Organizer payment account missing');
    const result = await PaymentService.refundPayment({ provider: refund.provider,
      providerPaymentId: refund.provider_payment_id, providerOrderId: refund.provider_order_id,
      idempotencyKey: refund.attempt_key, amount: Number(refund.amount),
      notes: { booking_id: refund.booking_id, refund_id: refund.refund_id, reason: refund.reason || 'Booking refund' },
      providerAccount: await findProviderAccountById(refund.provider_account_id) });
    const providerRefundId = getProviderRefundId(result);
    if (!providerRefundId) throw new Error('Payment gateway did not return a refund id');
    await transaction(async () => {
      const updated = await queryOne(`UPDATE payments.refunds SET provider_refund_id = $3,
        status = 'PROCESSING', provider_response = $4::jsonb, processing_token = NULL, updated_at = NOW()
        WHERE refund_id = $1 AND processing_token = $2 RETURNING refund_id`, [refundId, token, providerRefundId, JSON.stringify(result)]);
      if (!updated) return;
      await run(`UPDATE booking_cancellations SET refund_id = $1, refund_status = 'processing' WHERE booking_id = $2`, [refundId, refund.booking_id]);
      await run(`UPDATE trip_bookings SET payment_status = 'refund_pending' WHERE id = $1 AND payment_status = 'refund_failed'`, [refund.booking_id]);
    });
    return { ok: true as const, providerRefundId, refundId, alreadyExists: false };
  } catch (error) {
    // Keep the operation identity: a timeout may have happened after acceptance.
    await run(`UPDATE payments.refunds SET status = 'FAILED', processing_token = NULL,
      provider_response = jsonb_build_object('last_error', $3::text), updated_at = NOW()
      WHERE refund_id = $1 AND processing_token = $2`, [refundId, token, error instanceof Error ? error.message : String(error)]);
    return { ok: false as const, status: 502, error: 'Refund gateway is temporarily unavailable. Please retry.' };
  }
}

export async function processPendingRefunds(limit = 20) {
  const refunds = await query<{ refund_id: string }>(`SELECT refund_id FROM payments.refunds
    WHERE status IN ('PENDING', 'FAILED', 'PROCESSING') AND provider_refund_id IS NULL
      AND (processing_token IS NULL OR processing_started_at < NOW() - INTERVAL '5 minutes')
    ORDER BY created_at ASC LIMIT $1`, [Math.max(1, Math.min(Number.isFinite(limit) ? Math.floor(limit) : 20, 100))]);
  let processed = 0;
  const failures: Array<{ refundId: string; error: string }> = [];
  for (const refund of refunds) {
    const result = await dispatchRefund(refund.refund_id);
    if (!result.ok) failures.push({ refundId: refund.refund_id, error: result.error });
    else if (!result.alreadyExists) processed++;
  }
  return { scanned: refunds.length, processed, failed: failures.length, failures };
}
export async function getLatestPaymentForBooking(bookingId: string) {
  const order = await findOrderByBookingId(bookingId);
  return order ? { provider_order_id: order.provider_order_id, status: order.status, amount: order.amount } : null;
}

export function publicPaymentStatus(status: string) {
  return mapPaymentStatusToPublic(status);
}















