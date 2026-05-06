import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import db from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

// Check application status
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // If user is already a business, return approved
    if (session.role === "business") {
      return NextResponse.json({ status: "approved" });
    }

    // Check for existing application
    const app = db.prepare(
      "SELECT status FROM business_applications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1"
    ).get(session.id) as { status: string } | undefined;

    if (app) {
      return NextResponse.json({ status: app.status });
    }

    return NextResponse.json({ status: null });
  } catch (error) {
    console.error("GET /api/business/register error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Submit a new application
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (session.role === "business") {
      return NextResponse.json({ error: "You are already registered as a business" }, { status: 400 });
    }

    // Check if there is already a pending or rejected application
    const existing = db.prepare(
      "SELECT status FROM business_applications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1"
    ).get(session.id) as { status: string } | undefined;

    if (existing) {
      if (existing.status === "pending") {
        return NextResponse.json({ error: "You already have a pending application" }, { status: 400 });
      }
      if (existing.status === "rejected") {
        return NextResponse.json({ error: "Your previous application was rejected. You cannot re-apply." }, { status: 400 });
      }
    }

    const body = await request.json();
    const { company_name, location, phone_number, alternate_email, profile_pic_url } = body;

    if (!company_name || !location || !phone_number) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const id = uuidv4();

    db.prepare(`
      INSERT INTO business_applications (id, user_id, company_name, location, phone_number, alternate_email, profile_pic_url, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(
      id,
      session.id,
      company_name,
      location,
      phone_number,
      alternate_email || null,
      profile_pic_url || null
    );

    return NextResponse.json({ success: true, status: "pending" });
  } catch (error) {
    console.error("POST /api/business/register error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
