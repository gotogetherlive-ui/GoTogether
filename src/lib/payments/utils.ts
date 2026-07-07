import crypto from "node:crypto";

export function generateBookingReference(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `GT-${date}-${suffix}`;
}

export function hashPayload(payload: string): string {
  return crypto.createHash("sha256").update(payload).digest("hex");
}

export function safeJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}

export function timingSafeHexEqual(expectedHex: string, suppliedHex: string): boolean {
  try {
    const expected = Buffer.from(expectedHex, "hex");
    const supplied = Buffer.from(String(suppliedHex || ""), "hex");
    return expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied);
  } catch {
    return false;
  }
}