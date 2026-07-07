import type { Metadata } from "next";
import TrustSeoPage from "@/components/TrustSeoPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({ title: "Cancellation Policy | GoTogether", description: "Review GoTogether cancellation windows: 72+ hours for 100% refund, 24-72 hours for 50%, under 24 hours non-refundable, and full refunds when organizers cancel paid trips.", path: "/cancellation-policy" });

export default function Page() {
  return <TrustSeoPage path="/cancellation-policy" />;
}

