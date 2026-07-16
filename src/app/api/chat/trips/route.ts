import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasTeamChats } from "@/lib/teamChats";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ trips: [], hasTeamChats: false });

    return NextResponse.json({ hasTeamChats: await hasTeamChats(user.id) });
  } catch (error) {
    console.error("Fetch team chats error:", error);
    return NextResponse.json({ error: "Could not load team chats" }, { status: 500 });
  }
}
