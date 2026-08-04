import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import CustomTripForm from "./CustomTripForm";
import { absoluteUrl, breadcrumbJsonLd, buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Plan a Custom Group Trip | GoTogether",
  description: "Request a personalized group trip for two or more travelers. Share your destination or preferred travel style and the GoTogether support team will help plan the details.",
  path: "/custom-trip",
  image: "/hero_india_munnar.png",
});

export default function CustomTripPage() {
  return (
    <div className="min-h-screen bg-[#f7f8fb] text-slate-950">
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Custom Trip", path: "/custom-trip" }])} />
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "Service",
        name: "GoTogether Custom Trip Consultation",
        description: "A personalized group trip planning consultation for two or more travelers.",
        provider: { "@type": "Organization", name: "GoTogether", url: absoluteUrl("/") },
        areaServed: { "@type": "Country", name: "India" },
        url: absoluteUrl("/custom-trip"),
      }} />
      <Navbar />
      <main>
        <CustomTripForm />
      </main>
      <Footer />
    </div>
  );
}
