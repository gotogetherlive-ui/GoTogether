import Link from "next/link";
import { ArrowRight, MapPin, Search, ShieldCheck, Users } from "lucide-react";
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

const featureCards = [
  { href: "/trips", title: "Discover group trips", text: "Compare live trips by destination, dates, budget, itinerary, inclusions, pickup city, and organizer.", Icon: Search },
  { href: "/buddy", title: "Find a travel buddy", text: "Connect with compatible travelers planning similar routes, dates, budgets, and travel styles.", Icon: Users },
  { href: "/verified-organizers", title: "Check verified organizers", text: "Review public organizer profiles, available departures, policies, and trust information before booking.", Icon: ShieldCheck },
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
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">Group travel marketplace in India</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">Find verified trips and people to travel with</h2>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            GoTogetherTrip helps solo travelers, friends, and small groups discover organizer-led trips across India. Compare real trip details, explore destination guides, find compatible travel companions, and review policies before booking.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {featureCards.map(({ href, title, text, Icon }) => (
            <Link key={href} href={href} className="group rounded-3xl border border-slate-200 bg-white p-7 transition hover:-translate-y-1 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-950/5">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-50 text-orange-600"><Icon className="h-5 w-5" /></div>
              <h3 className="mt-6 text-xl font-bold text-slate-950">{title}</h3>
              <p className="mt-3 leading-7 text-slate-600">{text}</p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-orange-600">Explore <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
            </Link>
          ))}
        </div>

        <div className="mt-20 grid gap-12 lg:grid-cols-2">
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
          <h2 className="text-3xl font-black tracking-tight text-slate-950">Group travel questions</h2>
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            {faqs.map((faq) => (
              <article key={faq.question} className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="font-bold text-slate-950">{faq.question}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{faq.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
