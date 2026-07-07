import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo";
import { commonFaqs, type Faq } from "@/lib/seo-content";

type Fact = { label: string; value: string };
type LinkItem = { href: string; label: string };

export default function SeoContentPage({
  title,
  answer,
  facts,
  sections,
  faqs = commonFaqs,
  links = [],
  breadcrumb,
  jsonLd = [],
}: {
  title: string;
  answer: string;
  facts: Fact[];
  sections: Array<{ title: string; body: string | string[] }>;
  faqs?: Faq[];
  links?: LinkItem[];
  breadcrumb: Array<{ name: string; path: string }>;
  jsonLd?: unknown[];
}) {
  const allJsonLd = [breadcrumbJsonLd(breadcrumb), ...jsonLd];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {allJsonLd.map((data, index) => (
        <JsonLd key={index} data={data} />
      ))}
      <Navbar />
      <main className="flex-1 pt-28 pb-20 px-6 md:px-12 max-w-6xl mx-auto w-full">
        <nav className="mb-8 text-sm text-slate-500">
          {breadcrumb.map((item, index) => (
            <span key={item.path}>
              {index > 0 && <span className="mx-2">/</span>}
              <Link href={item.path} className="hover:text-orange-600">
                {item.name}
              </Link>
            </span>
          ))}
        </nav>

        <section className="mb-12">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-950 mb-5">
            {title}
          </h1>
          <p className="text-lg md:text-xl text-slate-600 leading-relaxed max-w-4xl">
            {answer}
          </p>
        </section>

        <section className="mb-12 bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-5">Quick Facts</h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {facts.map((fact) => (
              <div key={fact.label} className="border-b border-slate-100 pb-3">
                <dt className="text-xs uppercase font-bold text-slate-400 tracking-wider">{fact.label}</dt>
                <dd className="text-slate-800 font-semibold mt-1">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-10">
          <div className="space-y-10">
            {sections.map((section) => (
              <section key={section.title} className="prose prose-slate max-w-none">
                <h2 className="text-2xl font-bold text-slate-950 mb-3">{section.title}</h2>
                {Array.isArray(section.body) ? (
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 list-none p-0">
                    {section.body.map((item) => (
                      <li key={item} className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-700">
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-600 leading-relaxed">{section.body}</p>
                )}
              </section>
            ))}

            <section>
              <h2 className="text-2xl font-bold text-slate-950 mb-5">FAQs</h2>
              <div className="space-y-4">
                {faqs.map((faq) => (
                  <details key={faq.question} className="bg-white border border-slate-200 rounded-xl p-5">
                    <summary className="font-bold cursor-pointer">{faq.question}</summary>
                    <p className="text-slate-600 mt-3 leading-relaxed">{faq.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-3">
            <h2 className="text-sm uppercase tracking-wider font-bold text-slate-500">Explore More</h2>
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block bg-white border border-slate-200 rounded-xl px-4 py-3 font-semibold text-slate-700 hover:text-orange-600 hover:border-orange-200 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}
