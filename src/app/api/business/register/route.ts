import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getSession } from "@/lib/auth";
import { queryOne, transaction } from '@/lib/db';
import { v4 as uuidv4 } from "uuid";
import { isPaymentProviderImplemented, normalizePaymentProvider, parseEnabledPaymentProviders, SUPPORTED_PAYMENT_PROVIDERS } from "@/lib/payments/provider-config";
import { SecretManager } from "@/lib/payments/secret-manager";
import {
  normalizeSignerName,
  ORGANIZER_AGREEMENT_TEXT,
  ORGANIZER_AGREEMENT_TITLE,
  ORGANIZER_AGREEMENT_VERSION,
} from "@/lib/organizerAgreement";

const PAN_REGEX = /^[A-Z0-9]{10}$/i;
const RAZORPAY_ACCOUNT_REGEX = /^[a-zA-Z0-9_]{4,}$/;
const ENABLED_PAYMENT_PROVIDERS = new Set(parseEnabledPaymentProviders(process.env.ENABLED_ORGANIZER_PAYMENT_PROVIDERS));
const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (session.role === "business") {
      return NextResponse.json({ status: "approved" });
    }

    const app = await queryOne("SELECT status FROM business_applications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1", [session.id]) as { status: string } | undefined;
    return NextResponse.json({ status: app?.status || null });
  } catch (error) {
    console.error("GET /api/business/register error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (session.role === "business") {
      return NextResponse.json({ error: "You are already registered as a business" }, { status: 400 });
    }

    const existing = await queryOne("SELECT status FROM business_applications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1", [session.id]) as { status: string } | undefined;
    if (existing?.status === "pending") {
      return NextResponse.json({ error: "You already have a pending application" }, { status: 400 });
    }
    if (existing?.status === "rejected") {
      return NextResponse.json({ error: "Your previous application was rejected. You cannot re-apply." }, { status: 400 });
    }

    const body = await request.json();
    const companyName = String(body.companyName || body.company_name || "").trim();
    const location = String(body.location || "").trim();
    const phoneNumber = String(body.phoneNumber || body.phone_number || "").trim();
    const alternateEmail = (body.alternateEmail || body.alternate_email) ? String(body.alternateEmail || body.alternate_email).trim().toLowerCase() : null;
    const profilePicUrl = (body.profilePicUrl || body.profile_pic_url) ? String(body.profilePicUrl || body.profile_pic_url).trim() : null;
    const panNumber = String(body.panNumber || body.pan_number || "").trim().toUpperCase();
    const panPhotoUrl = String(body.panPhotoUrl || body.pan_photo_url || "").trim();
    const paymentProvider = normalizePaymentProvider(body.paymentProvider || body.payment_provider) || "RAZORPAY";
    const apiKey = String(body.api_key || body.apiKey || "").trim();
    const apiSecret = String(body.api_secret || body.apiSecret || "").trim();
    const webhookSecret = String(body.webhook_secret || body.webhookSecret || "").trim();
    const rawProviderAccountId = String(body.providerAccountId || body.provider_account_id || body.razorpay_account_id || "").trim();
    const providerAccountId = rawProviderAccountId || (paymentProvider === "CASHFREE" ? apiKey : "");
    const providerAccountHolderName = String(body.providerAccountHolderName || body.provider_account_holder_name || body.razorpay_account_holder_name || "").trim();
    const providerRegisteredEmail = String(body.providerRegisteredEmail || body.provider_registered_email || body.razorpay_account_email || "").trim().toLowerCase();
    const providerRegisteredPhone = String(body.providerRegisteredPhone || body.provider_registered_phone || body.razorpay_account_phone || "").trim();
    const razorpayAccountId = paymentProvider === "RAZORPAY" ? providerAccountId : null;
    const razorpayAccountHolderName = paymentProvider === "RAZORPAY" ? providerAccountHolderName : null;
    const razorpayAccountEmail = paymentProvider === "RAZORPAY" ? providerRegisteredEmail : null;
    const razorpayAccountPhone = paymentProvider === "RAZORPAY" ? providerRegisteredPhone : null;
    const paymentTermsAccepted = Boolean(body.paymentTermsAccepted || body.payment_terms_accepted);
    const agreementAccepted = body.agreementAccepted === true || body.agreement_accepted === true;
    const agreementVersion = String(body.agreementVersion || body.agreement_version || "").trim();
    const signerName = normalizeSignerName(String(body.signerName || body.signer_name || ""));

    if (!companyName || !location || !phoneNumber) {
      return NextResponse.json({ error: "Missing required business fields" }, { status: 400 });
    }
    if (!PAN_REGEX.test(panNumber) || !panPhotoUrl) {
      return NextResponse.json({ error: "Valid PAN number and PAN photo are required" }, { status: 400 });
    }
    if (!SUPPORTED_PAYMENT_PROVIDERS.includes(paymentProvider)) {
      return NextResponse.json({ error: "Unsupported payment provider" }, { status: 400 });
    }
    if (!isPaymentProviderImplemented(paymentProvider) || !ENABLED_PAYMENT_PROVIDERS.has(paymentProvider)) {
      return NextResponse.json({ error: `${paymentProvider} onboarding is not enabled for production yet. Please select Razorpay.` }, { status: 400 });
    }
    if (!RAZORPAY_ACCOUNT_REGEX.test(providerAccountId)) {
      return NextResponse.json({ error: "Valid provider account/merchant ID is required" }, { status: 400 });
    }
    if (!providerAccountId || !providerAccountHolderName || !EMAIL_REGEX.test(providerRegisteredEmail) || !providerRegisteredPhone || !paymentTermsAccepted) {
      return NextResponse.json({ error: "Provider account ownership details and payment terms acceptance are required" }, { status: 400 });
    }

    const signer = await queryOne<{ full_name: string; email: string }>(
      "SELECT full_name, email FROM users WHERE id = $1 AND deleted_at IS NULL",
      [session.id]
    );
    if (!signer) {
      return NextResponse.json({ error: "Organizer account was not found" }, { status: 400 });
    }
    const expectedSignerName = normalizeSignerName(signer.full_name);
    if (!agreementAccepted || agreementVersion !== ORGANIZER_AGREEMENT_VERSION) {
      return NextResponse.json({ error: "You must review and accept the current Organizer Agreement" }, { status: 400 });
    }
    if (!signerName || signerName.localeCompare(expectedSignerName, undefined, { sensitivity: "accent" }) !== 0) {
      return NextResponse.json({ error: `Electronic signature must match your profile name: ${expectedSignerName}` }, { status: 400 });
    }

    const apiKeyEnc = apiKey ? SecretManager.encrypt(apiKey) : null;
    const apiSecretEnc = apiSecret ? SecretManager.encrypt(apiSecret) : null;
    const webhookSecretEnc = webhookSecret ? SecretManager.encrypt(webhookSecret) : null;

    const applicationId = uuidv4();
    const agreementId = uuidv4();
    const signedAt = new Date().toISOString();
    const signerIp = process.env.TRUST_PROXY === "true"
      ? (request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "").trim().slice(0, 128) || null
      : null;
    const signerUserAgent = request.headers.get("user-agent")?.slice(0, 1000) || null;
    const signedDocument = JSON.stringify({
      title: ORGANIZER_AGREEMENT_TITLE,
      version: ORGANIZER_AGREEMENT_VERSION,
      text: ORGANIZER_AGREEMENT_TEXT,
      signerName,
      signerEmail: signer.email,
      companyName,
      signedAt,
    });
    const documentHash = createHash("sha256").update(signedDocument, "utf8").digest("hex");

    await transaction(async (client) => {
      await client.query(`
      INSERT INTO business_applications (
        id, user_id, company_name, location, phone_number, alternate_email,
        profile_pic_url, pan_number, pan_photo_url, payment_provider,
        provider_account_id, provider_account_holder_name, provider_registered_email, provider_registered_phone,
        razorpay_account_id, razorpay_account_holder_name, razorpay_account_email, razorpay_account_phone,
        payment_settlement_model, payment_terms_accepted, payment_onboarding_status, status,
        api_key_enc, api_secret_enc, webhook_secret_enc
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'organizer_direct',1,'pending_review','pending',$19,$20,$21)
    `, [
      applicationId,
      session.id,
      companyName,
      location,
      phoneNumber,
      alternateEmail,
      profilePicUrl,
      panNumber,
      panPhotoUrl,
      paymentProvider,
      providerAccountId,
      providerAccountHolderName,
      providerRegisteredEmail,
      providerRegisteredPhone,
      razorpayAccountId,
      razorpayAccountHolderName,
      razorpayAccountEmail,
      razorpayAccountPhone,
      apiKeyEnc,
      apiSecretEnc,
      webhookSecretEnc,
      ]);

      await client.query(`
        INSERT INTO organizer_agreements (
          id, application_id, organizer_user_id, agreement_title, agreement_version,
          agreement_text, document_hash, signer_name, signer_email, company_name,
          accepted, signed_at, signer_ip, signer_user_agent
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,1,$11,$12,$13)
      `, [
        agreementId, applicationId, session.id, ORGANIZER_AGREEMENT_TITLE,
        ORGANIZER_AGREEMENT_VERSION, ORGANIZER_AGREEMENT_TEXT, documentHash,
        signerName, signer.email, companyName, signedAt, signerIp, signerUserAgent,
      ]);
    });

    return NextResponse.json({ success: true, status: "pending" });
  } catch (error) {
    console.error("POST /api/business/register error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

