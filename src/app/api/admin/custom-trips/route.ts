import { randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { getSession } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin";
import { query, transaction } from "@/lib/db";
import { sendCustomTripTicketEmail } from "@/lib/email";
import { absoluteUrl } from "@/lib/seo";

const STATUSES = new Set(["new", "contacted", "planning", "confirmed", "closed"]);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function toIsoDate(value: unknown): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  }
  if (typeof value !== "string" || !value.trim()) return null;
  const directDate = value.trim().match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (directDate) return directDate;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function todayInIndia(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

async function requireAdmin() {
  const user = await getSession();
  return user && await isAdminUser(user) ? user : null;
}

const requestSelect = `
  SELECT ctr.id, ctr.user_id, ctr.booker_name, ctr.email, ctr.traveler_names, ctr.phone, ctr.whatsapp_number,
         ctr.destination, ctr.alternate_destination, ctr.place_type, ctr.notes, ctr.trip_date, ctr.confirmed_at,
         ctr.status, ctr.admin_notes, ctr.created_at, ctr.updated_at,
         u.email AS account_email, u.full_name AS account_name,
         ctt.ticket_number, ctt.qr_code_data, ctt.status AS ticket_status,
         ctt.generated_at AS ticket_generated_at, ctt.checked_in_at
  FROM custom_trip_requests ctr
  LEFT JOIN users u ON u.id = ctr.user_id
  LEFT JOIN custom_trip_tickets ctt ON ctt.custom_trip_request_id = ctr.id
`;

export async function GET() {
  try {
    if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const requests = await query(`${requestSelect}
      ORDER BY CASE ctr.status
        WHEN 'new' THEN 1 WHEN 'contacted' THEN 2 WHEN 'planning' THEN 3
        WHEN 'confirmed' THEN 4 ELSE 5 END,
        ctr.created_at DESC
    `, []);
    return NextResponse.json({ requests });
  } catch (error) {
    console.error("Admin custom trips error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

type ConfirmedRequest = {
  id: string;
  booker_name: string;
  email: string | null;
  traveler_names: string[];
  destination: string | null;
  trip_date: string | Date | null;
  status: string;
};

export async function PATCH(request: Request) {
  try {
    if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const body = await request.json();
    const id = typeof body.id === "string" ? body.id : "";
    const status = typeof body.status === "string" ? body.status : "";
    const adminNotes = typeof body.adminNotes === "string" ? body.adminNotes.trim().slice(0, 4000) : undefined;
    const destination = typeof body.destination === "string" ? body.destination.trim().slice(0, 160) : undefined;
    const tripDate = typeof body.tripDate === "string" ? body.tripDate.trim() : undefined;
    const checkIn = body.checkIn === true;

    if (!id || (status && !STATUSES.has(status)) || (tripDate && !DATE_PATTERN.test(tripDate))) {
      return NextResponse.json({ error: "Invalid request update" }, { status: 400 });
    }
    if (!status && adminNotes === undefined && destination === undefined && tripDate === undefined && !checkIn) {
      return NextResponse.json({ error: "No changes supplied" }, { status: 400 });
    }

    const result = await transaction(async (client) => {
      const locked = await client.query<ConfirmedRequest>(`
        SELECT id, booker_name, email, traveler_names, destination, trip_date, status
        FROM custom_trip_requests WHERE id = $1 FOR UPDATE
      `, [id]);
      const current = locked.rows[0];
      if (!current) return null;

      const nextStatus = status || current.status;
      const nextDestination = destination !== undefined ? destination : current.destination;
      const nextTripDate = tripDate !== undefined ? tripDate : current.trip_date;
      const normalizedTripDate = toIsoDate(nextTripDate);
      if (nextStatus === "confirmed") {
        if (!current.email) throw new Error("CONFIRMATION_EMAIL_REQUIRED");
        if (!nextDestination) throw new Error("CONFIRMATION_DESTINATION_REQUIRED");
        if (!normalizedTripDate) throw new Error("CONFIRMATION_DATE_REQUIRED");
      }
      if (checkIn) {
        if (nextStatus !== "confirmed") throw new Error("CHECK_IN_REQUIRES_CONFIRMED");
        if (!normalizedTripDate || normalizedTripDate > todayInIndia()) throw new Error("CHECK_IN_TOO_EARLY");
      }

      await client.query(`
        UPDATE custom_trip_requests
        SET status = $1,
            admin_notes = COALESCE($2, admin_notes),
            destination = COALESCE($3, destination),
            trip_date = COALESCE($4::date, trip_date),
            confirmed_at = CASE WHEN $1 = 'confirmed' THEN COALESCE(confirmed_at, NOW()) ELSE confirmed_at END,
            updated_at = NOW()
        WHERE id = $5
      `, [nextStatus, adminNotes, destination || null, tripDate || null, id]);

      let createdTicket: { ticket_number: string; qr_code_data: string } | null = null;
      if (nextStatus === "confirmed") {
        const existing = await client.query<{ ticket_number: string; qr_code_data: string }>(
          "SELECT ticket_number, qr_code_data FROM custom_trip_tickets WHERE custom_trip_request_id = $1",
          [id],
        );
        if (!existing.rows[0]) {
          const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
          const ticketNumber = `CTKT-${datePart}-${randomBytes(4).toString("hex").toUpperCase()}`;
          const verificationUrl = absoluteUrl(`/verify-ticket/${encodeURIComponent(ticketNumber)}`);
          const qrCodeData = await QRCode.toDataURL(verificationUrl, { width: 360, margin: 2 });
          await client.query(`
            INSERT INTO custom_trip_tickets (id, custom_trip_request_id, ticket_number, qr_code_data)
            VALUES ($1, $2, $3, $4)
          `, [randomUUID(), id, ticketNumber, qrCodeData]);
          createdTicket = { ticket_number: ticketNumber, qr_code_data: qrCodeData };
        }
      }

      if (checkIn) {
        const checkedIn = await client.query(`
          UPDATE custom_trip_tickets
          SET status = 'used', checked_in_at = COALESCE(checked_in_at, NOW())
          WHERE custom_trip_request_id = $1 AND status IN ('valid', 'used')
          RETURNING id
        `, [id]);
        if (!checkedIn.rowCount) throw new Error("CHECK_IN_TICKET_UNAVAILABLE");
      }

      const refreshed = await client.query(`${requestSelect} WHERE ctr.id = $1 LIMIT 1`, [id]);
      return { request: refreshed.rows[0], createdTicket };
    });

    if (!result) return NextResponse.json({ error: "Request not found" }, { status: 404 });
    const updated = result.request as ConfirmedRequest & { ticket_number?: string; qr_code_data?: string };
    const emailTripDate = toIsoDate(updated.trip_date);
    if (result.createdTicket && updated.email && updated.destination && emailTripDate) {
      await sendCustomTripTicketEmail({
        to: updated.email,
        bookerName: updated.booker_name,
        destination: updated.destination,
        tripDate: emailTripDate,
        travelerNames: updated.traveler_names,
        ticketNumber: result.createdTicket.ticket_number,
        verificationUrl: absoluteUrl(`/verify-ticket/${encodeURIComponent(result.createdTicket.ticket_number)}`),
        qrCodeData: result.createdTicket.qr_code_data,
      });
    }
    return NextResponse.json({ success: true, request: result.request, ticketCreated: Boolean(result.createdTicket) });
  } catch (error) {
    const messages: Record<string, string> = {
      CONFIRMATION_EMAIL_REQUIRED: "Add a customer email before confirming this trip.",
      CONFIRMATION_DESTINATION_REQUIRED: "Enter the final destination before confirming this trip.",
      CONFIRMATION_DATE_REQUIRED: "Select the travel date before confirming this trip.",
      CHECK_IN_REQUIRES_CONFIRMED: "Only a confirmed trip can be checked in.",
      CHECK_IN_TOO_EARLY: "Passenger check-in is available only when the travel date starts.",
      CHECK_IN_TICKET_UNAVAILABLE: "This ticket is unavailable or cancelled and cannot be checked in.",
    };
    const code = error instanceof Error ? error.message : "";
    if (messages[code]) return NextResponse.json({ error: messages[code] }, { status: 400 });
    console.error("Admin custom trip update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
