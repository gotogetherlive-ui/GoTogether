export const DEFAULT_GA_MEASUREMENT_ID = "G-23RKGDFD6H";

const GA_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]{6,20}$/;
const ANALYTICS_PRIVATE_PATHS = [
  "/admin",
  "/api",
  "/auth",
  "/dashboard",
  "/chat",
  "/team-chat",
  "/bookings",
  "/profile",
  "/account",
  "/settings",
  "/verify-ticket",
] as const;

export function normalizeGoogleAnalyticsId(value: string | undefined): string | null {
  const measurementId = value?.trim().toUpperCase();
  return measurementId && GA_MEASUREMENT_ID_PATTERN.test(measurementId) ? measurementId : null;
}

export function shouldTrackAnalyticsPath(pathname: string): boolean {
  return !ANALYTICS_PRIVATE_PATHS.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
