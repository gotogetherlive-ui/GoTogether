import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Check, ChevronDown, Clock3, Compass, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import TripCard, { type TripSummary } from "@/components/TripCard";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { faqJsonLd } from "@/lib/seo-content";
import type { DestinationGuide } from "@/lib/destination-guides";

const planningSections = [
  {
    title: "How to compare available group trips",
    paragraphs: [
      "Start with the itinerary and work outward. Confirm that each day has realistic travel time, named overnight stops and enough rest for the planned activity. Then compare the transport, stay category, room-sharing format, meals, permits and local transfers. Two packages with the same destination and duration can deliver very different experiences when one includes the last-mile journey and the other treats it as an add-on.",
      "Price should be read together with exclusions. Look for taxes, activity charges, personal transport, early check-in, single-room supplements and meals outside the written plan. Check the organizer’s public profile and visible reviews, but read comments for specific evidence instead of relying only on a rating. If a material promise is made in a call or chat, ask for it to be added to the booking record before paying.",
    ],
  },
  {
    title: "What a well-run departure should explain",
    paragraphs: [
      "A useful pre-departure note identifies the trip captain, reporting location, emergency contact, luggage limit, weather expectation and documents to carry. It also explains the minimum group size and what happens if that threshold is not met. Travelers should know whether the organizer, a local partner or the accommodation is responsible for each important part of the itinerary.",
      "Good group travel balances coordination with personal choice. Meals, nightlife, optional activities and free-time plans should not become hidden obligations. Room allocation and roommate changes need a clear process. For outdoor or remote journeys, the leader must be able to shorten or alter the plan when weather, health or local authorities make the original route unsafe.",
    ],
  },
  {
    title: "Travel insurance, cancellation and flexibility",
    paragraphs: [
      "Read cancellation terms before the excitement of booking takes over. Note the date-based deduction, whether platform and payment fees are refundable, how quickly an eligible refund is processed and whether a credit note can replace cash. Transport tickets, permits and third-party activities may follow separate rules. Ask what happens when the organizer cancels versus when weather disrupts only part of the itinerary.",
      "Travel insurance can be useful for medical emergencies, trip interruption and other covered events, but policies contain limits and exclusions. Check whether trekking altitude, adventure activities, pre-existing conditions and weather disruption are covered for your specific plan. Keep receipts and written communication. Insurance does not remove the need for a buffer day, emergency money and a realistic return connection.",
    ],
  },
  {
    title: "A practical packing system",
    paragraphs: [
      "Pack for the itinerary rather than the destination name. Start with identification, payment access, personal medicines and weather protection, then add activity-specific footwear and clothing. Use layers that can be repeated, keep one dry change accessible and avoid a suitcase that you cannot manage during a vehicle change. A small day bag should hold water, sun protection, a power bank and the items you cannot afford to lose.",
      "Check luggage rules before an overnight bus, shared cab or trek. Label bags and keep digital copies of essential documents, while protecting sensitive data. Reusable bottles and compact toiletries reduce waste. Do not pack specialist equipment merely because it appears on a generic checklist; ask the organizer what is provided, what can be rented and what must meet a defined safety standard.",
    ],
  },
];

export default function DestinationGuidePage({ guide, trips }: { guide: DestinationGuide; trips: TripSummary[] }) {
  const breadcrumb = [
    { name: "Home", path: "/" },
    ...(guide.destinationSlug ? [{ name: "Destinations", path: "/destinations" }] : []),
    { name: guide.title, path: guide.path },
  ];
  const allSections = [...guide.sections, ...planningSections];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <JsonLd data={breadcrumbJsonLd(breadcrumb)} />
      <JsonLd data={faqJsonLd(guide.faqs)} />
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: guide.title,
        description: guide.description,
        url: absoluteUrl(guide.path),
        image: guide.gallery.map((item) => absoluteUrl(item.src)),
        mainEntity: { "@type": "ItemList", numberOfItems: trips.length },
      }} />
      <Navbar />
      <main>
        <section className="relative min-h-[680px] overflow-hidden bg-slate-950 pt-24 text-white">
          <Image src={guide.heroImage} alt={guide.heroAlt} fill priority sizes="100vw" className="object-cover opacity-55" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,.96)_0%,rgba(2,6,23,.7)_50%,rgba(2,6,23,.2)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-950 to-transparent" />
          <div className="relative mx-auto flex min-h-[590px] max-w-7xl items-end px-5 pb-16 sm:px-8 lg:pb-20">
            <div className="max-w-4xl">
              <nav aria-label="Breadcrumb" className="mb-8 flex flex-wrap items-center gap-2 text-sm font-semibold text-white/70">
                {breadcrumb.map((item, index) => <span key={item.path} className="flex items-center gap-2">{index > 0 && <span>/</span>}<Link href={item.path} className="hover:text-orange-300">{item.name}</Link></span>)}
              </nav>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[.18em] backdrop-blur"><Sparkles className="h-4 w-4 text-orange-300" />{guide.eyebrow}</div>
              <h1 className="gt-page-title max-w-4xl text-balance text-5xl font-semibold leading-[1.02] tracking-[-.045em] sm:text-6xl lg:text-7xl">{guide.title}</h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-200 sm:text-xl">{guide.description}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a href="#available-trips" className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3.5 text-sm font-bold text-white hover:bg-orange-400">See available trips <ArrowRight className="h-4 w-4" /></a>
                <a href="#travel-guide" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 py-3.5 text-sm font-bold text-white backdrop-blur hover:bg-white/20">Read the guide</a>
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-10 mx-auto -mt-7 max-w-7xl px-5 sm:px-8">
          <dl className="grid overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_25px_80px_-35px_rgba(15,23,42,.35)] md:grid-cols-3">
            {[
              { icon: CalendarDays, label: "Best time", value: guide.bestTime },
              { icon: Clock3, label: "Ideal duration", value: guide.idealDuration },
              { icon: MapPin, label: "Common gateways", value: guide.startingPoints },
            ].map(({ icon: Icon, label, value }) => <div key={label} className="border-b border-slate-100 p-6 last:border-0 md:border-b-0 md:border-r md:last:border-r-0 sm:p-8"><dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-orange-600"><Icon className="h-4 w-4" />{label}</dt><dd className="mt-3 text-sm font-semibold leading-6 text-slate-700">{value}</dd></div>)}
          </dl>
        </section>

        <section id="travel-guide" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
          <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_320px]">
            <article className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[.18em] text-orange-600">The complete guide</p>
              <div className="mt-4 space-y-5 text-lg leading-8 text-slate-600">{guide.intro.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
              <div className="mt-12 grid gap-4 sm:grid-cols-2">{guide.highlights.map((highlight) => <div key={highlight} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 font-bold text-slate-800"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600"><Check className="h-4 w-4" /></span>{highlight}</div>)}</div>
              <div className="mt-16 space-y-16">
                {allSections.map((section, index) => <section key={section.title} id={`section-${index + 1}`}><div className="flex items-start gap-4"><span className="mt-1 text-sm font-semibold text-orange-500">{String(index + 1).padStart(2, "0")}</span><div><h2 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{section.title}</h2><div className="mt-5 space-y-5 text-[17px] leading-8 text-slate-600">{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div></div></div></section>)}
              </div>
            </article>

            <aside className="self-start lg:sticky lg:top-28">
              <div className="rounded-xl bg-slate-950 p-6 text-white"><Compass className="h-7 w-7 text-orange-400" /><h2 className="mt-4 text-xl font-semibold">Plan your trip</h2><nav className="mt-5 space-y-1" aria-label="Guide contents">{allSections.map((section, index) => <a key={section.title} href={`#section-${index + 1}`} className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white"><span>{section.title}</span><ArrowRight className="h-4 w-4 shrink-0" /></a>)}</nav><a href="#available-trips" className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold hover:bg-orange-400">Compare departures</a></div>
            </aside>
          </div>
        </section>

        <section className="bg-white py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-orange-600">Worth adding</p><h2 className="mt-2 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950">Nearby attractions and route ideas</h2>
            <div className="mt-9 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{guide.attractions.map((item) => <article key={item.name} className="rounded-xl border border-slate-200 bg-slate-50 p-6"><MapPin className="h-6 w-6 text-orange-500" /><h3 className="mt-4 text-xl font-semibold">{item.name}</h3><p className="mt-2 leading-7 text-slate-600">{item.description}</p><p className="mt-4 border-l-2 border-orange-300 pl-4 text-sm font-medium leading-6 text-slate-500">{item.travelNote}</p></article>)}</div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">{guide.gallery.map((image) => <div key={image.src + image.alt} className="relative aspect-[4/3] overflow-hidden rounded-xl"><Image src={image.src} alt={image.alt} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" /></div>)}</div>
          </div>
        </section>

        <section id="available-trips" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-20 sm:px-8 lg:py-28">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-orange-600">Live marketplace inventory</p><h2 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">Available trips</h2><p className="mt-3 max-w-2xl leading-7 text-slate-600">These departures come from current public listings by GoTogether organizers. Dates and seats can change, so open a trip to verify the latest details.</p></div><Link href="/trips" className="inline-flex items-center gap-2 font-bold text-orange-600">Browse all trips <ArrowRight className="h-4 w-4" /></Link></div>
          {trips.length > 0 ? <div className="mt-10 grid gap-7 md:grid-cols-2 xl:grid-cols-3">{trips.map((trip) => <TripCard key={trip.id} trip={trip} />)}</div> : <div className="mt-10 rounded-xl border border-dashed border-orange-200 bg-orange-50 p-8 sm:p-10"><ShieldCheck className="h-8 w-8 text-orange-500" /><h3 className="mt-4 text-2xl font-semibold">No matching departure is live right now</h3><p className="mt-2 max-w-2xl leading-7 text-slate-600">Organizer inventory changes throughout the season. Explore all live trips or return later for a departure matching this guide.</p><Link href="/trips" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white">Explore all trips <ArrowRight className="h-4 w-4" /></Link></div>}
        </section>

        <section className="bg-white py-20 lg:py-24"><div className="mx-auto max-w-5xl px-5 sm:px-8"><p className="text-xs font-bold uppercase tracking-[.18em] text-orange-600">Questions answered</p><h2 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">Frequently asked questions</h2><div className="mt-8 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">{guide.faqs.map((faq) => <details key={faq.question} className="group px-5 sm:px-7"><summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-6 font-bold [&::-webkit-details-marker]:hidden">{faq.question}<ChevronDown className="h-5 w-5 shrink-0 text-slate-400 transition group-open:rotate-180 group-open:text-orange-600" /></summary><p className="max-w-3xl pb-6 pr-8 leading-7 text-slate-600">{faq.answer}</p></details>)}</div></div></section>
        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8"><h2 className="text-3xl font-semibold tracking-tight">Continue planning</h2><div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{guide.related.map((item) => <Link key={item.href} href={item.href} className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 font-bold hover:border-orange-200 hover:text-orange-600">{item.label}<ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></Link>)}</div></section>
      </main>
      <Footer />
    </div>
  );
}
