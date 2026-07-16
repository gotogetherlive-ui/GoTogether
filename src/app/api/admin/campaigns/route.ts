import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getSession } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin";
import { query } from "@/lib/db";
import { sendAdminCampaignBatch, type AdminCampaignType } from "@/lib/email";

const CAMPAIGN_TYPES = new Set<AdminCampaignType>(["retention", "notification", "offer"]);

export async function POST(request: Request) {
  try {
    const admin = await getSession();
    if (!admin || !(await isAdminUser(admin))) {
      return NextResponse.json({ error: "You are not authorized to send campaigns." }, { status: 403 });
    }

    const body = await request.json();
    const campaignType = String(body.campaignType || "") as AdminCampaignType;
    const audience = String(body.audience || "");
    const targetUserId = String(body.targetUserId || "").trim();
    const subject = String(body.subject || "").trim();
    const message = String(body.message || "").trim();
    const ctaLabel = String(body.ctaLabel || "").trim();
    const ctaUrl = String(body.ctaUrl || "").trim();
    const confirmAll = body.confirmAll === true;

    if (!CAMPAIGN_TYPES.has(campaignType)) {
      return NextResponse.json({ error: "Select a valid campaign type." }, { status: 400 });
    }
    if (audience !== "all" && audience !== "specific") {
      return NextResponse.json({ error: "Select a campaign audience." }, { status: 400 });
    }
    if (audience === "all" && !confirmAll) {
      return NextResponse.json({ error: "Confirm delivery to all users before sending." }, { status: 400 });
    }
    if (audience === "specific" && !targetUserId) {
      return NextResponse.json({ error: "Select a recipient." }, { status: 400 });
    }
    if (subject.length < 3 || subject.length > 150 || message.length < 10 || message.length > 5000) {
      return NextResponse.json({ error: "Use a subject of 3–150 characters and a message of 10–5000 characters." }, { status: 400 });
    }
    if ((ctaLabel && !ctaUrl) || (!ctaLabel && ctaUrl)) {
      return NextResponse.json({ error: "Provide both button text and button URL, or leave both blank." }, { status: 400 });
    }
    if (ctaLabel.length > 50 || ctaUrl.length > 500 || (ctaUrl && !/^(https?:\/\/|\/)/i.test(ctaUrl))) {
      return NextResponse.json({ error: "Use a valid HTTPS URL or site-relative path for the campaign button." }, { status: 400 });
    }

    const recipients = audience === "all"
      ? await query<{ email: string; full_name: string }>(
          "SELECT email, full_name FROM users WHERE deleted_at IS NULL AND email IS NOT NULL AND BTRIM(email) <> '' ORDER BY created_at ASC"
        )
      : await query<{ email: string; full_name: string }>(
          "SELECT email, full_name FROM users WHERE id = $1 AND deleted_at IS NULL AND email IS NOT NULL AND BTRIM(email) <> '' LIMIT 1",
          [targetUserId]
        );

    if (recipients.length === 0) {
      return NextResponse.json({ error: "No eligible recipients were found." }, { status: 404 });
    }

    const origin = new URL(request.url).origin;
    const absoluteCtaUrl = ctaUrl.startsWith("/") ? `${origin}${ctaUrl}` : ctaUrl;
    const campaignId = uuidv4();
    const sent = await sendAdminCampaignBatch({
      campaignId,
      campaignType,
      recipients,
      subject,
      message,
      ctaLabel: ctaLabel || undefined,
      ctaUrl: absoluteCtaUrl || undefined,
      logoUrl: `${origin}/icon.svg`,
    });

    return NextResponse.json({ success: true, sent, campaignId });
  } catch (error) {
    console.error("Send admin campaign error:", error);
    return NextResponse.json({ error: "The campaign could not be sent. Please verify email delivery settings and try again." }, { status: 502 });
  }
}
