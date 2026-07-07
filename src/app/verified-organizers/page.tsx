import type { Metadata } from "next";
import TrustSeoPage from "@/components/TrustSeoPage";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({ title: "Verified Travel Organizers | GoTogether", description: "Understand verified organizers on GoTogether and what travelers should check before booking public group trips.", path: "/verified-organizers" });

export default function Page() {
  return <TrustSeoPage path="/verified-organizers" />;
}
