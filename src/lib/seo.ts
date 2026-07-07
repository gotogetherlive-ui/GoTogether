import type { Metadata } from "next";

export const SITE_NAME = "GoTogether";
export const DEFAULT_TITLE = "GoTogether | Verified Group Trips & Travel Experiences in India";
export const DEFAULT_DESCRIPTION =
  "Discover and book verified group trips, weekend trips, backpacking trips, trekking trips, bike trips, and curated travel experiences in India with trusted organizers.";
export const DEFAULT_OG_IMAGE = "/hero_india_ladakh.png";

export const PRIVATE_ROUTE_PREFIXES = [
  "/admin",
  "/dashboard",
  "/organizer/dashboard",
  "/checkout",
  "/payment",
  "/bookings",
  "/api",
  "/auth",
  "/login",
  "/signup",
  "/account",
  "/profile",
  "/settings",
  "/test",
  "/staging",
  "/internal",
];

export function getPublicAppUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "").trim();

  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("NEXT_PUBLIC_APP_URL is required for production SEO metadata.");
    }
    return "https://gotogethertrip.com";
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    if (process.env.NODE_ENV === "production") {
      throw new Error("NEXT_PUBLIC_APP_URL must be a valid absolute URL.");
    }
    return "https://gotogethertrip.com";
  }

  const hostname = url.hostname.toLowerCase();
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname.endsWith(".local");
  if (process.env.NODE_ENV === "production" && (url.protocol !== "https:" || isLocalhost)) {
    throw new Error("NEXT_PUBLIC_APP_URL must be a public https:// origin in production.");
  }

  return url.origin;
}

export function absoluteUrl(path = "/"): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getPublicAppUrl()}${normalizedPath}`;
}

export function cleanPath(path = "/"): string {
  if (!path || path === "/") return "/";
  return `/${path.replace(/^\/+|\/+$/g, "")}`;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isPrivatePath(path: string): boolean {
  const normalized = cleanPath(path);
  return PRIVATE_ROUTE_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`));
}

type SeoOptions = {
  title?: string;
  description?: string;
  path?: string;
  image?: string | null;
  index?: boolean;
  type?: "website" | "article";
};

export function buildMetadata({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  path = "/",
  image = DEFAULT_OG_IMAGE,
  index = true,
  type = "website",
}: SeoOptions = {}): Metadata {
  const canonical = absoluteUrl(cleanPath(path));
  const imageUrl = image?.startsWith("http") ? image : absoluteUrl(image || DEFAULT_OG_IMAGE);

  return {
    metadataBase: new URL(getPublicAppUrl()),
    title,
    description,
    alternates: { canonical },
    robots: index ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      type,
      siteName: SITE_NAME,
      title,
      description,
      url: canonical,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: `${SITE_NAME} travel marketplace` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export function privateMetadata(title = "Private Area | GoTogether"): Metadata {
  return buildMetadata({
    title,
    description: "This GoTogether page is private and is not intended for search indexing.",
    path: "/",
    index: false,
  });
}

export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: absoluteUrl("/"),
    logo: absoluteUrl(DEFAULT_OG_IMAGE),
    description:
      "GoTogether is an India-focused travel marketplace that helps users discover and book verified group trips, backpacking trips, weekend trips, trekking trips, bike trips, women-only trips, solo travel groups, and curated travel experiences from trusted organizers.",
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: absoluteUrl("/"),
    potentialAction: {
      "@type": "SearchAction",
      target: `${absoluteUrl("/trips")}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

