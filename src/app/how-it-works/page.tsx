import type { Metadata } from "next";
import TrustSeoPage from "@/components/TrustSeoPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({ title: "How GoTogether Works | GoTogether", description: "Learn how to discover trips, compare organizer details, review policies, and book verified group trips securely on GoTogether.", path: "/how-it-works" });

export default function Page() {
  return <TrustSeoPage path="/how-it-works" />;
}
