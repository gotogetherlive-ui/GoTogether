import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import { absoluteUrl, buildMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { destinations } from "@/lib/seo-content";

export const metadata: Metadata = buildMetadata({
  title: "India Travel Destinations for Group Trips | GoTogether",
  description: "Explore GoTogether destination pages for verified group trips, weekend trips, backpacking trips, trekking trips, bike trips, and curated travel experiences in India.",
  path: "/destinations",
});

export default function DestinationsPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Destinations", path: "/destinations" }])} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "GoTogether Destinations",
          url: absoluteUrl("/destinations"),
          mainEntity: {
            "@type": "ItemList",
            itemListElement: destinations.map((destination, index) => ({
              "@type": "ListItem",
              position: index + 1,
              url: absoluteUrl(`/destinations/${destination.slug}`),
              name: destination.name,
            })),
          },
        }}
      />
      <Navbar />
      <main className="flex-1 pt-28 pb-20 px-6 md:px-12 max-w-6xl mx-auto w-full">
        <h1 className="text-4xl md:text-6xl font-extrabold mb-5">Group Trip Destinations in India</h1>
        <p className="text-lg text-slate-600 max-w-4xl mb-10">
          GoTogether destination pages help travelers compare verified group trips by place, dates, duration, organizer, itinerary, inclusions, exclusions, pickup city, and cancellation policy. Choose a destination to review useful travel context and public trip links.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {destinations.map((destination) => (
            <Link key={destination.slug} href={`/destinations/${destination.slug}`} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-orange-200 hover:text-orange-600 transition-colors">
              <h2 className="font-bold text-xl">{destination.name}</h2>
              <p className="text-sm text-slate-500 mt-2">Best time: {destination.bestTime}</p>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
