import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import { absoluteUrl, breadcrumbJsonLd, buildMetadata } from "@/lib/seo";
import { guidePages } from "@/lib/seo-content";

export const metadata: Metadata = buildMetadata({
  title: "Travel Guides for Group Trips in India | GoTogether",
  description: "Read GoTogether guides for group trips, backpacking trips, weekend trips, solo travel groups, women-only trips, safety, destinations, and booking checks.",
  path: "/guides",
  type: "article",
});

export default function GuidesPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Guides", path: "/guides" }])} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "GoTogether Group Trip Guides",
          url: absoluteUrl("/guides"),
          mainEntity: {
            "@type": "ItemList",
            itemListElement: guidePages.map((guide, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: guide.title,
              url: absoluteUrl(`/guides/${guide.slug}`),
            })),
          },
        }}
      />
      <Navbar />
      <main className="flex-1 pt-28 pb-20 px-6 md:px-12 max-w-6xl mx-auto w-full">
        <h1 className="text-4xl md:text-6xl font-extrabold mb-5">Group Trip Guides</h1>
        <p className="text-lg text-slate-600 max-w-4xl mb-10">
          GoTogether guides answer practical travel questions first, then connect readers to relevant destination, category, city, trust, and public trip pages.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {guidePages.map((guide) => (
            <Link key={guide.slug} href={`/guides/${guide.slug}`} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-orange-200 transition-colors">
              <h2 className="text-xl font-bold">{guide.title}</h2>
              <p className="text-sm text-slate-500 mt-2">Related to {guide.destination}</p>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
