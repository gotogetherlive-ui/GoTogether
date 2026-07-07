import { NextResponse } from "next/server";
import { getSession, invalidateUserSessions } from "@/lib/auth";
import { queryOne, transaction } from '@/lib/db';
import { isAdminUser } from '@/lib/admin';
import { isPaymentProviderImplemented, normalizePaymentProvider } from '@/lib/payments/provider-config';

async function upsertOrganizerProviderAccount(client: any, application: {
  user_id: string;
  payment_provider: string | null;
  provider_account_id: string | null;
  provider_account_holder_name: string | null;
  provider_registered_email: string | null;
  provider_registered_phone: string | null;
  razorpay_account_id: string | null;
  api_key_enc?: string | null;
  api_secret_enc?: string | null;
  webhook_secret_enc?: string | null;
}) {
  const provider = normalizePaymentProvider(application.payment_provider) || "RAZORPAY";
  if (!isPaymentProviderImplemented(provider)) throw new Error(`Payment provider ${provider} is not implemented`);

  const providerAccountId = application.provider_account_id || application.razorpay_account_id;
  if (!providerAccountId) throw new Error("Provider account id is required");

  const ownershipModels = provider === "RAZORPAY"
    ? ["ORGANIZER_OWNED", "MARKETPLACE"]
    : ["ORGANIZER_OWNED"];

  for (const ownershipModel of ownershipModels) {
    const accountId = ownershipModel === "ORGANIZER_OWNED"
      ? `${provider.toLowerCase()}-organizer-${application.user_id}`
      : `${provider.toLowerCase()}-marketplace-${application.user_id}`;

    await client.query(`
      INSERT INTO payments.provider_accounts (
        id, organizer_id, provider, ownership_model, provider_account_id, linked_account_id, is_default,
        status, verification_status, supports_refunds, supports_settlement, supports_webhooks,
        metadata, verified_at, api_key_enc, api_secret_enc, webhook_secret_enc
      ) VALUES (
        $1,$2,$3,$4,$5,CASE WHEN $4 = 'MARKETPLACE' THEN $5 ELSE NULL END,TRUE,
        'active','verified',TRUE,CASE WHEN $4 = 'MARKETPLACE' THEN TRUE ELSE FALSE END,FALSE,$6::jsonb,NOW(),$7,$8,$9
      )
      ON CONFLICT (id) DO UPDATE SET
        provider_account_id = EXCLUDED.provider_account_id,
        linked_account_id = EXCLUDED.linked_account_id,
        supports_settlement = EXCLUDED.supports_settlement,
        is_default = TRUE,
        status = 'active',
        verification_status = 'verified',
        metadata = EXCLUDED.metadata,
        verified_at = NOW(),
        updated_at = NOW(),
        api_key_enc = EXCLUDED.api_key_enc,
        api_secret_enc = EXCLUDED.api_secret_enc,
        webhook_secret_enc = EXCLUDED.webhook_secret_enc
    `, [
      accountId,
      application.user_id,
      provider,
      ownershipModel,
      providerAccountId,
      JSON.stringify({
        holder_name: application.provider_account_holder_name,
        registered_email: application.provider_registered_email,
        registered_phone: application.provider_registered_phone,
        source: "business_application_approval",
      }),
      application.api_key_enc || null,
      application.api_secret_enc || null,
      application.webhook_secret_enc || null,
    ]);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !(await isAdminUser(session))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Application ID is required" }, { status: 400 });

    const { action } = await request.json();
    if (!["approve", "reject", "block", "unblock"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const application = await queryOne("SELECT id, user_id, company_name, payment_provider, provider_account_id, provider_account_holder_name, provider_registered_email, provider_registered_phone, razorpay_account_id, payment_terms_accepted, status, created_at, notification_seen, api_key_enc, api_secret_enc, webhook_secret_enc FROM business_applications WHERE id = $1", [id]) as {
      status: string;
      user_id: string;
      payment_provider: string | null;
      provider_account_id: string | null;
      provider_account_holder_name: string | null;
      provider_registered_email: string | null;
      provider_registered_phone: string | null;
      razorpay_account_id: string | null;
      payment_terms_accepted: number | null;
      api_key_enc?: string | null;
      api_secret_enc?: string | null;
      webhook_secret_enc?: string | null;
    } | undefined;

    if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });

    const provider = normalizePaymentProvider(application.payment_provider) || "RAZORPAY";
    const providerAccountId = application.provider_account_id || application.razorpay_account_id;

    if ((action === "approve" || action === "unblock") && (!providerAccountId || !application.payment_terms_accepted)) {
      return NextResponse.json({ error: "Payment details are incomplete. Ask organizer to resubmit details." }, { status: 400 });
    }
    if ((action === "approve" || action === "unblock") && !isPaymentProviderImplemented(provider)) {
      return NextResponse.json({ error: `${provider} is not enabled for production payments yet.` }, { status: 400 });
    }

    if (action === "block") {
      if (application.status !== "approved") {
        return NextResponse.json({ error: "Only approved applications can be blocked" }, { status: 400 });
      }
      await transaction(async (client) => {
        await client.query("UPDATE business_applications SET status = 'rejected', payment_onboarding_status = 'disabled' WHERE id = $1", [id]);
        await client.query("UPDATE users SET role = 'regular', razorpay_account_id = NULL, payment_enabled = 0, razorpay_account_verified_at = NULL WHERE id = $1", [application.user_id]);
        await client.query("UPDATE trips SET registration_closed = 1, status = CASE WHEN status = 'live' THEN 'pending' ELSE status END WHERE organizer_id = $1", [application.user_id]);
      });
      invalidateUserSessions(application.user_id);
      return NextResponse.json({ success: true, status: "rejected" });
    }

    if (action === "unblock") {
      if (application.status !== "rejected") {
        return NextResponse.json({ error: "Only rejected/blocked applications can be unblocked" }, { status: 400 });
      }
      await transaction(async (client) => {
        await client.query("UPDATE business_applications SET status = 'approved', payment_onboarding_status = 'verified' WHERE id = $1", [id]);
        await client.query("UPDATE users SET role = 'business', razorpay_account_id = $1, payment_enabled = 1, razorpay_account_verified_at = NOW() WHERE id = $2", [provider === "RAZORPAY" ? providerAccountId : null, application.user_id]);
        await upsertOrganizerProviderAccount(client, application);
      });
      invalidateUserSessions(application.user_id);
      return NextResponse.json({ success: true, status: "approved" });
    }

    if (application.status !== "pending") {
      return NextResponse.json({ error: "Application is already processed" }, { status: 400 });
    }

    const newStatus = action === "approve" ? "approved" : "rejected";
    await transaction(async (client) => {
      await client.query("UPDATE business_applications SET status = $1, payment_onboarding_status = CASE WHEN $1 = 'approved' THEN 'verified' ELSE 'rejected' END WHERE id = $2", [newStatus, id]);
      if (newStatus === "approved") {
        await client.query("UPDATE users SET role = 'business', razorpay_account_id = $1, payment_enabled = 1, razorpay_account_verified_at = NOW() WHERE id = $2", [provider === "RAZORPAY" ? providerAccountId : null, application.user_id]);
        await upsertOrganizerProviderAccount(client, application);
      }
    });
    invalidateUserSessions(application.user_id);

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error) {
    console.error("PATCH /api/admin/business-apps/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
