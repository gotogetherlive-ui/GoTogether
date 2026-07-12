import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getTeamChatTrips } from "@/lib/teamChats";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ trips: [], hasTeamChats: false });

    const trips = await getTeamChatTrips(user.id);
    return NextResponse.json({ trips, hasTeamChats: trips.length > 0 });
  } catch (error) {
    console.error("Fetch team chats error:", error);
    return NextResponse.json({ error: "Could not load team chats" }, { status: 500 });
  }
}