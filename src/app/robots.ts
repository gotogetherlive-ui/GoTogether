import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

const DISALLOWED_PATHS = [
  "/admin",
  "/dashboard",
  "/organizer/dashboard",
  "/api",
  "/auth",
  "/payment",
  "/checkout",
  "/profile",
  "/account",
  "/settings",
  "/test",
  "/staging",
  "/internal",
  "/bookings",
  "/login",
  "/signup",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/_next/", "/images/", "/favicon.ico"],
        disallow: DISALLOWED_PATHS,
      },
      {
        userAgent: ["GPTBot", "Google-Extended"],
        allow: ["/", "/_next/", "/images/", "/favicon.ico"],
        disallow: DISALLOWED_PATHS,
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
