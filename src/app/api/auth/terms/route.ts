import { NextResponse } from "next/server";
import { getSession, invalidateUserSessions } from "@/lib/auth";
import { run } from "@/lib/db";

export async function POST() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await run("UPDATE users SET terms_accepted_at = COALESCE(terms_accepted_at, NOW()) WHERE id = $1", [user.id]);
    invalidateUserSessions(user.id);

    return NextResponse.json({ success: true, terms_accepted_at: new Date().toISOString() });
  } catch (error) {
    console.error("POST /api/auth/terms error:", error);
    return NextResponse.json({ error: "Failed to accept terms" }, { status: 500 });
  }
}
