import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import db from "@/lib/db";

const ADMIN_EMAIL = "gotogether.live@gmail.com";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || (session.email !== ADMIN_EMAIL && session.role !== 'super_admin')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json({ error: "Application ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const { action } = body;

    if (action !== "approve" && action !== "reject" && action !== "block" && action !== "unblock") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Get the application
    const application = db.prepare("SELECT * FROM business_applications WHERE id = ?").get(id) as {
      status: string;
      user_id: string;
    } | undefined;

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    if (action === "block") {
      if (application.status !== "approved") {
        return NextResponse.json({ error: "Only approved applications can be blocked" }, { status: 400 });
      }
      
      const blockApplication = db.transaction(() => {
        db.prepare("UPDATE business_applications SET status = 'rejected' WHERE id = ?").run(id);
        db.prepare("UPDATE users SET role = 'regular' WHERE id = ?").run(application.user_id);
      });
      blockApplication();
      return NextResponse.json({ success: true, status: "rejected" });
    }

    if (action === "unblock") {
      if (application.status !== "rejected") {
        return NextResponse.json({ error: "Only rejected/blocked applications can be unblocked" }, { status: 400 });
      }
      
      const unblockApplication = db.transaction(() => {
        db.prepare("UPDATE business_applications SET status = 'approved' WHERE id = ?").run(id);
        db.prepare("UPDATE users SET role = 'business' WHERE id = ?").run(application.user_id);
      });
      unblockApplication();
      return NextResponse.json({ success: true, status: "approved" });
    }

    if (application.status !== "pending") {
      return NextResponse.json({ error: "Application is already processed" }, { status: 400 });
    }

    const newStatus = action === "approve" ? "approved" : "rejected";

    // Start transaction
    const updateApplication = db.transaction(() => {
      // Update application status
      db.prepare("UPDATE business_applications SET status = ? WHERE id = ?").run(newStatus, id);

      // If approved, update user role
      if (newStatus === "approved") {
        db.prepare("UPDATE users SET role = 'business' WHERE id = ?").run(application.user_id);
      }
    });

    updateApplication();

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error) {
    console.error("PATCH /api/admin/business-apps/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
