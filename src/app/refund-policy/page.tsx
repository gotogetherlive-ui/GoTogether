import type { Metadata } from "next";
import TrustSeoPage from "@/components/TrustSeoPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({ title: "Refund Policy | GoTogether", description: "Understand GoTogether refunds for paid bookings, unpaid cancellations, traveler cancellation timing, organizer cancellations, and payment gateway status.", path: "/refund-policy" });

export default function Page() {
  return <TrustSeoPage path="/refund-policy" />;
}

