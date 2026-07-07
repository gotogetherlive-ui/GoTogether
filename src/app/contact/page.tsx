import type { Metadata } from "next";
import TrustSeoPage from "@/components/TrustSeoPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({ title: "Contact GoTogether | Travel Marketplace Support", description: "Contact GoTogether for marketplace support, trip questions, organizer issues, booking help, and safety concerns.", path: "/contact" });

export default function Page() {
  return <TrustSeoPage path="/contact" />;
}
