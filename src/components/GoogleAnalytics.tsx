"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";
import { shouldTrackAnalyticsPath } from "@/lib/analytics";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export default function GoogleAnalytics({ measurementId }: { measurementId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const pagePath = queryString ? `${pathname}?${queryString}` : pathname;
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    if (!shouldTrackAnalyticsPath(pathname) || lastTrackedPath.current === pagePath) return;

    window.dataLayer = window.dataLayer || [];
    const gtag = window.gtag || ((...args: unknown[]) => window.dataLayer.push(args));
    window.gtag = gtag;

    const frame = window.requestAnimationFrame(() => {
      const pageLocation = `${window.location.origin}${pagePath}`;
      gtag("config", measurementId, {
        page_location: pageLocation,
        page_path: pagePath,
        send_page_view: false,
        update: true,
      });
      gtag("event", "page_view", {
        page_title: document.title,
        page_location: pageLocation,
        page_path: pagePath,
        send_to: measurementId,
      });
      lastTrackedPath.current = pagePath;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [measurementId, pagePath, pathname]);

  useReportWebVitals((metric) => {
    if (!shouldTrackAnalyticsPath(window.location.pathname)) return;
    window.gtag?.("event", metric.name, {
      value: Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value),
      event_category: "Web Vitals",
      event_label: metric.id,
      non_interaction: true,
      send_to: measurementId,
    });
  });

  return null;
}
