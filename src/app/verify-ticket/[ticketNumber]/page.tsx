import Link from "next/link";
import { CheckCircle2, XCircle, Clock, MapPin, Phone, Users, CalendarDays, ReceiptText } from "lucide-react";
import { queryOne } from "@/lib/db";
import { buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

type TicketPageParams = {
  params: Promise<{ ticketNumber: string }>;
};

type TicketRecord = {
  ticket_number: string;
  generated_at: string | null;
  booking_id: string;
  booking_ref: string | null;
  booking_status: string | null;
  payment_status: string | null;
  approval_status: string | null;
  cancelled_at: string | null;
  amount: number | null;
  male_count: number | null;
  female_count: number | null;
  child_count: number | null;
  names: string | null;
  phone_number: string | null;
  trip_date: string | null;
  paid_at: string | null;
  trip_title: string | null;
  destination: string | null;
  pickup_point: string | null;
  drop_point: string | null;
  start_date: string | null;
  duration_days: number | null;
  organizer_name: string | null;
  organizer_phone: string | null;
  organizer_email: string | null;
  refund_status: string | null;
  refund_amount: number | null;
  cancellation_fee: number | null;
};

export async function generateMetadata({ params }: TicketPageParams) {
  const { ticketNumber } = await params;
  return buildMetadata({
    title: `Verify Ticket ${ticketNumber} | GoTogether`,
    description: "Verify a GoTogether trip ticket live using the ticket number from the PDF QR code.",
    path: `/verify-ticket/${encodeURIComponent(ticketNumber)}`,
    index: false,
  });
}

function formatDate(value: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",

  });
}

function parseNames(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return value.split(",").map((name) => name.trim()).filter(Boolean);
  }
}

function statusLabel(record: TicketRecord | null) {
  if (!record) return { valid: false, label: "Ticket Not Found", tone: "rose" as const };
  if (record.cancelled_at || ["cancelled", "trip_cancelled", "refund_pending", "refund_failed", "expired"].includes(record.booking_status || "")) {
    return { valid: false, label: "Not Valid For Pickup", tone: "rose" as const };
  }
  if (record.booking_status === "confirmed" && record.payment_status === "paid") {
    return { valid: true, label: "Valid Ticket", tone: "emerald" as const };
  }
  return { valid: false, label: "Payment Not Confirmed", tone: "amber" as const };
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <dt className="text-xs font-extrabold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-bold text-slate-900">{value || "Not available"}</dd>
    </div>
  );
}

export default async function VerifyTicketPage({ params }: TicketPageParams) {
  const { ticketNumber } = await params;
  const normalizedTicket = decodeURIComponent(ticketNumber).trim().toUpperCase();

  const ticket = await queryOne<TicketRecord>(`
    SELECT
      tk.ticket_number,
      tk.generated_at,
      b.id as booking_id,
      b.booking_ref,
      b.booking_status,
      b.payment_status,
      b.approval_status,
      b.cancelled_at,
      b.amount,
      b.male_count,
      b.female_count,
      b.child_count,
      b.names,
      b.phone_number,
      b.trip_date,
      b.paid_at,
      t.title as trip_title,
      t.destination,
      t.pickup_point,
      t.drop_point,
      t.start_date,
      t.duration_days,
      org.full_name as organizer_name,
      org.phone_number as organizer_phone,
      org.email as organizer_email,
      bc.refund_status,
      bc.refund_amount,
      bc.cancellation_fee
    FROM public.booking_tickets tk
    JOIN public.trip_bookings b ON b.id = tk.booking_id
    JOIN public.trips t ON t.id = b.trip_id
    JOIN public.users org ON org.id = t.organizer_id
    LEFT JOIN LATERAL (
      SELECT refund_status, refund_amount, cancellation_fee
      FROM public.booking_cancellations latest_bc
      WHERE latest_bc.booking_id = b.id
      ORDER BY latest_bc.cancelled_at DESC NULLS LAST
      LIMIT 1
    ) bc ON TRUE
    WHERE UPPER(tk.ticket_number) = $1
    LIMIT 1
  `, [normalizedTicket]);

  const state = statusLabel(ticket || null);
  const names = parseNames(ticket?.names || null);
  const totalTravelers = ticket ? Number(ticket.male_count || 0) + Number(ticket.female_count || 0) + Number(ticket.child_count || 0) : 0;
  const isEmerald = state.tone === "emerald";
  const isAmber = state.tone === "amber";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link href="/" className="text-lg font-extrabold text-slate-950">GoTogether</Link>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-500">gotogethertrip.com</span>
        </div>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className={`${isEmerald ? "bg-emerald-600" : isAmber ? "bg-amber-500" : "bg-rose-600"} p-6 text-white`}>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                {isEmerald ? <CheckCircle2 className="h-7 w-7" /> : isAmber ? <Clock className="h-7 w-7" /> : <XCircle className="h-7 w-7" />}
              </div>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-widest opacity-80">Ticket Verification</p>
                <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{state.label}</h1>
                <p className="mt-2 text-sm font-semibold opacity-90">{normalizedTicket}</p>
              </div>
            </div>
          </div>

          {!ticket ? (
            <div className="p-6">
              <p className="text-sm font-semibold text-slate-600">This ticket number was not found. Check the QR code or contact GoTogether support.</p>
            </div>
          ) : (
            <div className="space-y-6 p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoRow label="Trip" value={ticket.trip_title} />
                <InfoRow label="Destination" value={ticket.destination} />
                <InfoRow label="Booking Ref" value={ticket.booking_ref} />
                <InfoRow label="Payment" value={`${ticket.payment_status || "unknown"}${ticket.amount ? ` - INR ${(ticket.amount / 100).toLocaleString("en-IN")}` : ""}`} />
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-slate-500"><CalendarDays className="h-4 w-4" /> Trip Details</h2>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <InfoRow label="Travel Date" value={formatDate(ticket.trip_date || ticket.start_date)} />
                  <InfoRow label="Duration" value={ticket.duration_days ? `${ticket.duration_days} day${ticket.duration_days > 1 ? "s" : ""}` : "Not available"} />
                  <InfoRow label="Pickup" value={<span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{ticket.pickup_point || "Not available"}</span>} />
                  <InfoRow label="Drop" value={ticket.drop_point || "Not available"} />
                </dl>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-slate-500"><Users className="h-4 w-4" /> Passenger Details</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoRow label="Travelers" value={totalTravelers || "Not available"} />
                  <InfoRow label="Contact" value={<span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{ticket.phone_number || "Not available"}</span>} />
                </div>
                {names.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {names.map((name) => <span key={name} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">{name}</span>)}
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-slate-500"><ReceiptText className="h-4 w-4" /> Organizer And Status</h2>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <InfoRow label="Organizer" value={ticket.organizer_name} />
                  <InfoRow label="Organizer Phone" value={ticket.organizer_phone} />
                  <InfoRow label="Booking Status" value={ticket.booking_status} />
                  <InfoRow label="Refund Status" value={ticket.refund_status || "Not applicable"} />
                </dl>
              </div>

              <p className="text-center text-xs font-semibold text-slate-400">Live status checked from GoTogether</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

