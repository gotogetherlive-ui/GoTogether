import type { Metadata } from "next";
import TrustSeoPage from "@/components/TrustSeoPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({ title: "GoTogether Help | Trip Booking Support", description: "Find help for choosing trips, checking organizers, understanding bookings, cancellation policies, refunds, and safety on GoTogether.", path: "/help" });

export default function Page() {
  return <TrustSeoPage path="/help" />;
}
