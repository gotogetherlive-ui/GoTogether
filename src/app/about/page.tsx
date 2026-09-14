import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Compass, HeartHandshake, MapPin, Route, ShieldCheck, Users } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MaintenanceGuard from "@/components/MaintenanceGuard";
import ScrollReveal from "@/components/ScrollReveal";
import { buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = buildMetadata({
  title: "About GoTogether | Safer Group Travel in India",
  description: "Learn how GoTogether connects travelers with verified organizers, transparent group trips, and compatible travel companions.",
  path: "/about",
});

const journeyOptions = [
  { icon: Compass, title: "A trip, already planned", text: "Browse organizer-led departures. Compare itineraries, inclusions, dates, and prices to find a journey that feels right.", href: "/trips", link: "Browse group trips" },
  { icon: Users, title: "People on your wavelength", text: "Share a travel plan or explore the community. Connect over similar destinations, budgets, and ways of traveling.", href: "/buddy", link: "Find a travel buddy" },
  { icon: Route, title: "A journey of your own", text: "A friends’ getaway, a team escape, or an idea waiting to happen. Help us shape a trip around your group and preferences.", href: "/custom-trip", link: "Plan a custom trip" },
];

const values = [
  { icon: HeartHandshake, title: "Connection comes first", text: "Shared interests turn a travel plan into a conversation. We make space for people to meet, explore, and build friendships along the way." },
  { icon: ShieldCheck, title: "Clarity builds confidence", text: "Organizer profiles, trip details, and cancellation terms help you ask the right questions and make informed choices before you commit." },
  { icon: Compass, title: "Curiosity takes us further", text: "A new place. A different perspective. We believe the best journeys leave room to learn from the people and places you encounter." },
];

export default function AboutPage() {
  return (
    <MaintenanceGuard>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Navbar />
        <main>
          <section className="gt-container grid items-center gap-10 pb-16 pt-28 sm:pt-36 lg:grid-cols-[1fr_1.05fr] lg:gap-16 lg:pb-24">
            <div>
              <p className="gt-eyebrow">About GoTogether</p>
              <h1 className="gt-page-title mt-6">Great places.<br />Even better<br /><em className="text-orange-700">company.</em></h1>
              <p className="mt-7 max-w-lg text-lg leading-8 text-slate-600">A place can take you a long way from home. The right people can make you feel at home anywhere.</p>
              <p className="mt-4 max-w-lg leading-7 text-slate-600">GoTogether brings group trips, travel companions, and custom journeys into one place, so your next adventure starts with a real connection.</p>
              <div className="mt-8 flex flex-wrap items-center gap-6">
                <Link href="/buddy" className="gt-button">Find your next journey <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
                <a href="#our-story" className="gt-text-link">Our story <ArrowRight aria-hidden="true" className="h-4 w-4" /></a>
              </div>
            </div>
            <div className="relative">
              <div className="relative h-[390px] overflow-hidden rounded-[1.5rem] sm:h-[520px] lg:h-[580px]">
                <Image src="/hero_india_varanasi.png" alt="The riverside ghats of Varanasi overlooking the Ganges" fill loading="eager" sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-7 sm:p-10">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-orange-200"><MapPin aria-hidden="true" className="h-4 w-4" /> Varanasi, India</p>
                  <p className="mt-4 max-w-sm font-serif text-3xl leading-tight text-white sm:text-4xl">New perspectives.<br />Shared memories.</p>
                </div>
              </div>
              <div className="absolute -bottom-5 right-5 flex items-center gap-3 rounded-xl border border-orange-100 bg-white px-5 py-4 shadow-lg sm:right-8">
                <Users aria-hidden="true" className="h-5 w-5 text-orange-700" />
                <span className="text-sm font-medium">Made for people who love to explore.</span>
              </div>
            </div>
          </section>

          <section id="our-story" className="scroll-mt-24 border-y border-slate-200 bg-white">
            <div className="gt-container gt-section grid gap-8 lg:grid-cols-[0.8fr_1fr] lg:gap-24">
              <ScrollReveal><p className="gt-eyebrow">Our story</p><h2 className="gt-title">The world feels closer<br />when we <em>go together.</em></h2></ScrollReveal>
              <ScrollReveal delay={100} className="space-y-5 text-base leading-8 text-slate-600">
                <p>Sometimes the hardest part of travel isn’t choosing a destination. It’s finding people whose plans, pace, and sense of adventure match your own.</p>
                <p>GoTogether grew from a simple idea: make it easier to find both a journey you’re excited about and people to share it with. Whether you arrive with a plan or just a little curiosity, there’s more than one way to get going.</p>
                <p className="font-medium text-slate-900">Because the places stay in your photos. The people stay in your stories.</p>
              </ScrollReveal>
            </div>
          </section>

          <section className="gt-container pt-16 sm:pt-20" aria-labelledby="our-motto">
            <ScrollReveal className="relative overflow-hidden rounded-3xl bg-[#173c35] px-6 py-14 text-center sm:px-12 sm:py-20">
              <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full border border-white/10" />
              <div aria-hidden="true" className="pointer-events-none absolute -bottom-44 -left-24 h-96 w-96 rounded-full border border-white/10" />
              <p id="our-motto" className="relative text-xs font-semibold uppercase tracking-[0.22em] text-orange-200">Our motto</p>
              <blockquote className="relative mx-auto mt-6 max-w-4xl font-serif text-4xl leading-[1.18] tracking-tight text-white sm:text-5xl lg:text-6xl">Go places. Find your people.<br /><span className="italic text-orange-200">Grow together.</span></blockquote>
              <p className="relative mx-auto mt-7 max-w-xl text-base leading-7 text-white/80">More than a destination. A chance to connect, discover something new, and come home with a story worth sharing.</p>
            </ScrollReveal>
          </section>

          <section className="gt-container gt-section">
            <ScrollReveal className="gt-section-heading"><div><p className="gt-eyebrow">Three ways to get going</p><h2 className="gt-title">Your kind of journey.</h2></div><p className="max-w-sm text-sm leading-7 text-slate-600">A ready-made itinerary or a fresh idea.<br />Start wherever you are.</p></ScrollReveal>
            <ScrollReveal className="grid gap-5 md:grid-cols-3" stagger>
              {journeyOptions.map((item, index) => (
                <article key={item.href} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-7 transition-shadow hover:shadow-lg lg:p-8">
                  <div className="flex items-center justify-between"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-700"><item.icon aria-hidden="true" className="h-6 w-6" /></span><span className="text-xs font-medium tracking-widest text-slate-500">0{index + 1}</span></div>
                  <h3 className="mt-7 text-xl font-semibold tracking-tight">{item.title}</h3>
                  <p className="mb-7 mt-3 text-sm leading-7 text-slate-600">{item.text}</p>
                  <Link href={item.href} className="gt-text-link mt-auto">{item.link} <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
                </article>
              ))}
            </ScrollReveal>
          </section>

          <section className="border-y border-slate-200 bg-white">
            <div className="gt-container gt-section">
              <ScrollReveal className="max-w-2xl"><p className="gt-eyebrow">What we believe</p><h2 className="gt-title">Thoughtful travel.<br /><em>Meaningful connections.</em></h2></ScrollReveal>
              <ScrollReveal className="mt-10 grid gap-9 md:grid-cols-3 md:gap-10" stagger>
                {values.map((value) => <div key={value.title} className="border-t border-slate-200 pt-6"><value.icon aria-hidden="true" className="h-6 w-6 text-orange-700" /><h3 className="mt-5 text-lg font-semibold">{value.title}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{value.text}</p></div>)}
              </ScrollReveal>
              <div className="mt-10 flex flex-wrap items-center justify-between gap-5 border-t border-slate-200 pt-7"><p className="max-w-2xl text-sm leading-7 text-slate-600">Good journeys start with informed choices. Read our guidance on meeting responsibly, protecting your information, and reporting concerns.</p><Link href="/safety" className="gt-text-link">Safety guidelines <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link></div>
            </div>
          </section>

          <section className="gt-container gt-section">
            <ScrollReveal className="flex flex-col items-start justify-between gap-8 rounded-2xl border border-orange-200 bg-orange-50 p-8 sm:p-12 lg:flex-row lg:items-center"><div><p className="gt-eyebrow">Your next chapter</p><h2 className="gt-title">A new story starts with you.</h2><p className="mt-4 text-base leading-7 text-slate-600">Find your next adventure, or talk to us about what you have in mind.</p></div><div className="flex shrink-0 flex-wrap items-center gap-6 lg:flex-col"><Link href="/trips" className="gt-button">Explore trips <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link><Link href="/contact" className="gt-text-link">Let’s talk <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link></div></ScrollReveal>
          </section>
        </main>
        <Footer />
      </div>
    </MaintenanceGuard>
  );
}
