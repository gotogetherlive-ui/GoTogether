import Link from "next/link";
import { ArrowRight, Check, ChevronDown, CircleCheck, Compass, LockKeyhole, Search, ShieldCheck, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo";
import { commonFaqs, type Faq } from "@/lib/seo-content";

type Fact = { label: string; value: string };
type LinkItem = { href: string; label: string };
const sectionIcons = [Search, CircleCheck, LockKeyhole];

export default function SeoContentPage({
  title, answer, facts, sections, faqs = commonFaqs, links = [], breadcrumb, jsonLd = [],
}: {
  title: string; answer: string; facts: Fact[];
  sections: Array<{ title: string; body: string | string[] }>;
  faqs?: Faq[]; links?: LinkItem[];
  breadcrumb: Array<{ name: string; path: string }>; jsonLd?: unknown[];
}) {
  const allJsonLd = [breadcrumbJsonLd(breadcrumb), ...jsonLd];
  return (
    <div className="min-h-screen overflow-hidden bg-[#f8fafc] text-slate-900">
      {allJsonLd.map((data, index) => <JsonLd key={index} data={data} />)}
      <Navbar />
      <main>
        <section className="relative isolate px-5 pb-20 pt-28 sm:px-8 sm:pt-32">
          <div className="absolute inset-0 -z-20 bg-[linear-gradient(180deg,#fff7ed_0%,#fff_48%,#f8fafc_100%)]" />
          <div className="absolute left-[8%] top-8 -z-10 h-72 w-72 rounded-full bg-orange-200/30 blur-3xl" />
          <div className="absolute right-[10%] top-20 -z-10 h-80 w-80 rounded-full bg-rose-100/50 blur-3xl" />
          <div className="absolute inset-0 -z-10 opacity-[0.035] [background-image:radial-gradient(#0f172a_1px,transparent_1px)] [background-size:24px_24px]" />
          <div className="mx-auto max-w-7xl">
            <nav aria-label="Breadcrumb" className="mb-10 flex items-center gap-2 text-sm font-medium text-slate-500">
              {breadcrumb.map((item, index) => (
                <span key={item.path} className="flex items-center gap-2">
                  {index > 0 && <span className="text-slate-300">/</span>}
                  <Link href={item.path} className="transition-colors hover:text-orange-600">{item.name}</Link>
                </span>
              ))}
            </nav>
            <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="max-w-4xl">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-3.5 py-2 text-xs font-bold uppercase tracking-[0.16em] text-orange-700 shadow-sm backdrop-blur"><Sparkles className="h-3.5 w-3.5" /> Travel made clear</div>
                <h1 className="text-balance text-5xl font-black tracking-[-0.045em] text-slate-950 sm:text-6xl lg:text-7xl lg:leading-[1.02]">{title}</h1>
                <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-600 sm:text-xl sm:leading-9">{answer}</p>
                <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                  <Link href="/trips" className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-orange-600">Explore trips <ArrowRight className="h-4 w-4" /></Link>
                  <Link href="/verified-organizers" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:text-orange-700"><ShieldCheck className="h-4 w-4 text-orange-500" /> Verified organizers</Link>
                </div>
              </div>
              <div className="hidden rounded-3xl border border-white/80 bg-white/70 p-6 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.35)] backdrop-blur-xl lg:block">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-50 text-orange-600"><Compass className="h-5 w-5" /></div>
                  <div><p className="text-sm font-bold text-slate-950">One trusted marketplace</p><p className="mt-0.5 text-xs text-slate-500">Built for confident decisions</p></div>
                </div>
                <div className="mt-6 space-y-3">
                  {["Transparent trip details", "Verified organizer profiles", "Secure booking journey"].map((item) => (
                    <div key={item} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-slate-700"><span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-50 text-emerald-600"><Check className="h-3.5 w-3.5" /></span>{item}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
        <div className="mx-auto max-w-7xl px-5 pb-24 sm:px-8">
          <section className="relative z-10 -mt-4 mb-20 overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_24px_80px_-40px_rgba(15,23,42,0.3)]">
            <div className="flex flex-col gap-2 border-b border-slate-100 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">At a glance</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Quick facts</h2></div>
              <p className="text-sm text-slate-500">The essentials, without the fine print.</p>
            </div>
            <dl className="grid sm:grid-cols-2 lg:grid-cols-5">
              {facts.map((fact, index) => (
                <div key={fact.label} className={"border-slate-100 px-6 py-6 sm:px-8 lg:py-7 " + (index ? "border-t sm:border-l sm:border-t-0" : "")}>
                  <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{fact.label}</dt>
                  <dd className="mt-2 text-sm font-semibold leading-6 text-slate-800">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div>
              <div className="mb-8 max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">The journey</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Simple by design. Clear at every step.</h2>
              </div>
              <div className="grid gap-5">
                {sections.map((section, index) => {
                  const Icon = sectionIcons[index % sectionIcons.length];
                  return (
                    <section key={section.title} className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_20px_60px_-35px_rgba(234,88,12,0.4)] sm:p-8">
                      <span className="absolute right-6 top-4 text-6xl font-black tracking-tighter text-slate-100 transition-colors group-hover:text-orange-50">0{index + 1}</span>
                      <div className="relative flex flex-col gap-5 sm:flex-row">
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-900/10 transition group-hover:bg-orange-600"><Icon className="h-5 w-5" /></div>
                        <div className="min-w-0 pt-1">
                          <h3 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">{section.title}</h3>
                          {Array.isArray(section.body) ? (
                            <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
                              {section.body.map((item) => <li key={item} className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3.5 py-3 text-sm font-medium capitalize text-slate-700"><Check className="h-4 w-4 shrink-0 text-emerald-600" />{item}</li>)}
                            </ul>
                          ) : <p className="mt-3 max-w-2xl leading-7 text-slate-600">{section.body}</p>}
                        </div>
                      </div>
                    </section>
                  );
                })}
              </div>

              <section className="mt-20">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">Need to know</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Frequently asked questions</h2>
                <div className="mt-7 divide-y divide-slate-100 overflow-hidden rounded-3xl border border-slate-200 bg-white">
                  {faqs.map((faq) => (
                    <details key={faq.question} className="group px-5 sm:px-7">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-6 font-bold text-slate-900 [&::-webkit-details-marker]:hidden">
                        {faq.question}<ChevronDown className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180 group-open:text-orange-600" />
                      </summary>
                      <p className="max-w-3xl pb-6 pr-8 leading-7 text-slate-600">{faq.answer}</p>
                    </details>
                  ))}
                </div>
              </section>
            </div>

            <aside className="self-start lg:sticky lg:top-28">
              <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl shadow-slate-900/10">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-orange-400"><ShieldCheck className="h-5 w-5" /></div>
                <h2 className="mt-5 text-xl font-bold">Explore with confidence</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">Helpful guides for every part of your journey.</p>
                <nav className="mt-6 space-y-1" aria-label="Related pages">
                  {links.map((link) => (
                    <Link key={link.href} href={link.href} className="group flex items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white">
                      {link.label}<ArrowRight className="h-4 w-4 text-slate-500 transition group-hover:translate-x-1 group-hover:text-orange-400" />
                    </Link>
                  ))}
                </nav>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
