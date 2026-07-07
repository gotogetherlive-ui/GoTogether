export interface BookingOrderRequest {
  trip_id: string;
  male_count: unknown;
  female_count: unknown;
  child_count: unknown;
  names: unknown;
  phone_number: unknown;
  alternate_phone_number?: unknown;
  trip_date: unknown;
  booking_id?: unknown;
  base_url?: unknown;
}

function toTrustedOrigin(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  try {
    const url = new URL(raw);
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') return null;
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

function getTrustedPaymentBaseUrl(candidate?: unknown): string | null {
  const configured = toTrustedOrigin(process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || null);
  if (configured) return configured;
  return toTrustedOrigin(candidate);
}

export function validateBookingOrderRequest(body: BookingOrderRequest) {
  const counts = [body.male_count, body.female_count, body.child_count].map((value) => Number(value || 0));
  if (!body.trip_id || counts.some((value) => !Number.isInteger(value) || value < 0 || value > 20)) {
    return { ok: false as const, error: "Invalid trip or passenger counts" };
  }

  const [maleCount, femaleCount, childCount] = counts;
  const totalCount = maleCount + femaleCount + childCount;
  if (totalCount <= 0) return { ok: false as const, error: "At least one passenger is required" };

  if (!Array.isArray(body.names) || body.names.length !== totalCount) {
    return { ok: false as const, error: "Names list must match the total number of passengers" };
  }
  if (body.names.some((name) => typeof name !== "string" || !name.trim() || name.trim().length > 120)) {
    return { ok: false as const, error: "Every passenger name must be valid" };
  }
  if (!body.phone_number || typeof body.phone_number !== "string" || body.phone_number.length > 30) {
    return { ok: false as const, error: "Phone number is required" };
  }
  if (!body.trip_date || typeof body.trip_date !== "string") {
    return { ok: false as const, error: "Trip date is required" };
  }

  return {
    ok: true as const,
    value: {
      tripId: String(body.trip_id),
      maleCount,
      femaleCount,
      childCount,
      totalCount,
      names: body.names.map((name) => String(name).trim()),
      phoneNumber: body.phone_number.trim(),
      alternatePhoneNumber: typeof body.alternate_phone_number === "string" ? body.alternate_phone_number.trim() : null,
      tripDate: body.trip_date,
      bookingId: typeof body.booking_id === "string" && body.booking_id.trim() ? body.booking_id.trim() : null,
      baseUrl: getTrustedPaymentBaseUrl(body.base_url),
    },
  };
}