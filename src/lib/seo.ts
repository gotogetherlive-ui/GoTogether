import type { Metadata } from "next";

export const SITE_NAME = "GoTogether";
export const SITE_ALTERNATE_NAMES = ["GoTogetherTrip", "Go Together", "GoTogether Trip", "gotogethertrip.com"] as const;
export const DEFAULT_TITLE = "GoTogether | Verified Group Trips & Travel Experiences in India";
export const DEFAULT_DESCRIPTION =
  "Discover and book verified group trips, weekend trips, backpacking trips, trekking trips, bike trips, and curated travel experiences in India with trusted organizers.";
export const DEFAULT_OG_IMAGE = "/hero_india_ladakh.png";
export const INSTAGRAM_URL = "https://www.instagram.com/gotogether.in";
export const WHATSAPP_COMMUNITY_URL = "https://chat.whatsapp.com/HWmEmqlCvNIBoHvNyfPETP";
export const CANONICAL_PRODUCTION_ORIGIN = "https://www.gotogethertrip.com";

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
  const configured = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "").trim();
  const raw = ["null", "undefined"].includes(configured.toLowerCase()) ? "" : configured;

  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("NEXT_PUBLIC_APP_URL is required for production SEO metadata.");
    }
    return CANONICAL_PRODUCTION_ORIGIN;
  }

  let url: URL;
  try {
    const candidate = process.env.NODE_ENV !== "production" && !/^https?:\/\//i.test(raw)
      ? `http://${raw}`
      : raw;
    url = new URL(candidate);
  } catch {
    if (process.env.NODE_ENV === "production") {
      throw new Error("NEXT_PUBLIC_APP_URL must be a valid absolute URL.");
    }
    return CANONICAL_PRODUCTION_ORIGIN;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("NEXT_PUBLIC_APP_URL must use the https:// protocol in production.");
    }
    return "http://localhost:3000";
  }
  // Local production builds also set NODE_ENV=production. Deployment-only
  // HTTPS enforcement lives in scripts/check-production-env.mjs, while
  // metadata accepts localhost origins for local builds and previews.

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
  follow?: boolean;
  type?: "website" | "article";
};

export function buildMetadata({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  path = "/",
  image = DEFAULT_OG_IMAGE,
  index = true,
  follow = index,
  type = "website",
}: SeoOptions = {}): Metadata {
  const canonical = absoluteUrl(cleanPath(path));
  const imageUrl = image?.startsWith("http") ? image : absoluteUrl(image || DEFAULT_OG_IMAGE);

  return {
    metadataBase: new URL(getPublicAppUrl()),
    applicationName: SITE_NAME,
    title,
    description,
    keywords: [
      "group trips India",
      "verified travel organizers",
      "weekend trips",
      "backpacking trips",
      "trekking trips",
      "bike trips",
      "travel buddy",
      "solo travel groups",
    ],
    authors: [{ name: SITE_NAME, url: getPublicAppUrl() }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    category: "travel",
    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
      other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
        ? { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION }
        : undefined,
    },
    alternates: { canonical, languages: { "en-IN": canonical } },
    robots: { index, follow },
    openGraph: {
      type,
      siteName: SITE_NAME,
      locale: "en_IN",
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
    alternateName: [...SITE_ALTERNATE_NAMES],
    url: absoluteUrl("/"),
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl("/icon.svg"),
      contentUrl: absoluteUrl("/icon.svg"),
      width: 512,
      height: 512,
      caption: "GoTogether travel marketplace logo",
    },
    description:
      "GoTogether is an India-focused travel marketplace that helps users discover and book verified group trips, backpacking trips, weekend trips, trekking trips, bike trips, women-only trips, solo travel groups, and curated travel experiences from trusted organizers.",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Patna",
      addressRegion: "Bihar",
      addressCountry: "IN",
    },
    areaServed: { "@type": "Country", name: "India" },
    sameAs: [INSTAGRAM_URL, WHATSAPP_COMMUNITY_URL],
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "support@gotogethertrip.com",
        url: absoluteUrl("/contact"),
      },
    ],
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    alternateName: [...SITE_ALTERNATE_NAMES],
    url: absoluteUrl("/"),
    inLanguage: "en-IN",
    potentialAction: {
      "@type": "SearchAction",
      target: `${absoluteUrl("/trips")}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}
