import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getSession } from "@/lib/auth";
import { run } from "@/lib/db";
import { getClientIP, rateLimit } from "@/lib/rateLimit";

const PLACE_TYPES = new Set(["mountains", "beach", "city", "nature", "desert", "heritage", "not_sure"]);

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: Request) {
  try {
    const limit = await rateLimit(`custom-trip:${getClientIP(request)}`, 4, 60 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const body = await request.json();
    const bookerName = cleanText(body.bookerName, 120);
    const email = cleanText(body.email, 254).toLowerCase();
    const phone = cleanText(body.phone, 30);
    const whatsappNumber = cleanText(body.whatsappNumber, 30);
    const destination = cleanText(body.destination, 160);
    const alternateDestination = cleanText(body.alternateDestination, 160);
    const placeType = cleanText(body.placeType, 40);
    const notes = cleanText(body.notes, 2000);
    const travelerNames = Array.isArray(body.travelerNames)
      ? body.travelerNames.map((name: unknown) => cleanText(name, 120)).filter(Boolean)
      : [];

    if (bookerName.length < 2) {
      return NextResponse.json({ error: "Booker name is required." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (!/^[+()\-\s0-9]{7,30}$/.test(phone)) {
      return NextResponse.json({ error: "Enter your valid active phone number. Please do not use a random number." }, { status: 400 });
    }
    if (!/^[+()\-\s0-9]{7,30}$/.test(whatsappNumber)) {
      return NextResponse.json({ error: "Enter a valid WhatsApp number so our team can contact you conveniently." }, { status: 400 });
    }
    if (travelerNames.length < 2 || travelerNames.length > 20) {
      return NextResponse.json({ error: "Add names for at least 2 and at most 20 travelers." }, { status: 400 });
    }
    if (new Set(travelerNames.map((name: string) => name.toLowerCase())).size !== travelerNames.length) {
      return NextResponse.json({ error: "Each traveler name should be entered once." }, { status: 400 });
    }
    if (!destination && !PLACE_TYPES.has(placeType)) {
      return NextResponse.json({ error: "Choose the kind of place you would like to visit." }, { status: 400 });
    }
    if (placeType && !PLACE_TYPES.has(placeType)) {
      return NextResponse.json({ error: "Invalid place preference." }, { status: 400 });
    }

    const user = await getSession().catch(() => null);
    const id = uuidv4();
    await run(`
      INSERT INTO custom_trip_requests
        (id, user_id, booker_name, email, traveler_names, phone, whatsapp_number,
         destination, alternate_destination, place_type, notes)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, $11)
    `, [
      id,
      user?.id || null,
      bookerName,
      email,
      JSON.stringify(travelerNames),
      phone,
      whatsappNumber,
      destination || null,
      alternateDestination || null,
      placeType || null,
      notes || null,
    ]);

    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (error) {
    console.error("Custom trip request error:", error);
    return NextResponse.json({ error: "We could not save your request. Please try again." }, { status: 500 });
  }
}
