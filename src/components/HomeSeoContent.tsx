import Link from "next/link";
import { MapPin, Users } from "lucide-react";
import JsonLd from "@/components/JsonLd";
import { absoluteUrl } from "@/lib/seo";
import { categories, cityPages, destinations, faqJsonLd } from "@/lib/seo-content";

const faqs = [
  {
    question: "What is GoTogetherTrip?",
    answer: "GoTogetherTrip is an India-focused travel marketplace for discovering verified group trips, comparing travel organizers, and finding travel companions for shared travel experiences.",
  },
  {
    question: "How can I find a travel buddy in India?",
    answer: "Use the GoTogether travel buddy finder to publish or browse public travel plans, compare destination, dates, budget, and travel style, then connect through the platform when there is a suitable match.",
  },
  {
    question: "Can solo travelers join group trips?",
    answer: "Yes. Solo travelers can compare organizer-led group trips by destination, itinerary, dates, price, inclusions, pickup point, policies, and public reviews where available before requesting or completing a booking.",
  },
  {
    question: "How does GoTogether verify travel organizers?",
    answer: "GoTogether reviews organizer information and displays public verification signals. Travelers should still read the complete itinerary, inclusions, exclusions, cancellation terms, refund terms, and safety information for each trip.",
  },
];

export default function HomeSeoContent() {
  return (
    <section className="border-t border-slate-200 bg-slate-50 px-6 py-24 md:px-12">
      <JsonLd data={faqJsonLd(faqs)} />
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Popular group travel categories in India",
        itemListElement: categories.map((category, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: category.name,
          url: absoluteUrl(`/${category.slug}`),
        })),
      }} />

      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">A few things worth knowing</p>
          <h2 className="gt-title">A little planning goes a long way.</h2>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            GoTogetherTrip helps solo travelers, friends, and small groups discover organizer-led trips across India. Compare real trip details, explore destination guides, find compatible travel companions, and review policies before booking.
          </p>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-2">
          <div>
            <div className="flex items-center gap-3"><MapPin className="h-5 w-5 text-orange-600" /><h2 className="text-2xl font-bold text-slate-950">Popular group trip destinations</h2></div>
            <p className="mt-3 leading-7 text-slate-600">Explore destination-specific planning information, seasonal guidance, common experiences, and available public trips.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {destinations.slice(0, 12).map((destination) => (
                <Link key={destination.slug} href={`/destinations/${destination.slug}`} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-700">{destination.name}</Link>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-3"><Users className="h-5 w-5 text-orange-600" /><h2 className="text-2xl font-bold text-slate-950">Trips by travel style and city</h2></div>
            <p className="mt-3 leading-7 text-slate-600">Start with the type of experience you want or browse short departures from major Indian cities.</p>
            <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-3">
              {categories.slice(0, 6).map((category) => <Link key={category.slug} href={`/${category.slug}`} className="text-sm font-semibold text-slate-700 hover:text-orange-600">{category.name}</Link>)}
              {cityPages.slice(0, 4).map((page) => <Link key={page.slug} href={`/${page.slug}`} className="text-sm font-semibold text-slate-700 hover:text-orange-600">Trips from {page.city}</Link>)}
            </div>
          </div>
        </div>

        <div className="mt-20">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-950">Group travel questions</h2>
          <div className="mt-7 divide-y divide-slate-200 border-y border-slate-200">
            {faqs.map((faq) => (
              <details key={faq.question} className="group py-5">
                <summary className="cursor-pointer text-sm font-semibold text-slate-950">{faq.question}</summary>
                <p className="mt-3 text-sm leading-6 text-slate-600">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
