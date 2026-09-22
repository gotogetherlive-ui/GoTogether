"use client";

import Link from "next/link";
import type { SVGProps } from "react";
import { Compass } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import FooterSupportButton from "./FooterSupportButton";

const legalLinks = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/safety", label: "Safety Guidelines" },
];

const adminLinks = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "User Management" },
  { href: "/admin/trips", label: "Trip Moderation" },
];

const socialLinks = [
  {
    href: "https://www.linkedin.com/in/gotogether-trip-04919a429/",
    label: "LinkedIn",
    Icon: LinkedInIcon,
    className: "hover:text-sky-400",
  },
  {
    href: "https://www.instagram.com/gotogethertrip?stkn=azhiNGt5dXdiYmR2",
    label: "Instagram",
    Icon: InstagramIcon,
    className: "hover:text-pink-400",
  },
  {
    href: "https://chat.whatsapp.com/BjYQdI3womD1zDAkpXRdrW?s=cl&p=a&mlu=4&ilr=4",
    label: "WhatsApp",
    Icon: WhatsAppIcon,
    className: "hover:text-emerald-400",
  },
];

function LinkedInIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M20.45 2H3.55C2.69 2 2 2.68 2 3.52v16.96c0 .84.69 1.52 1.55 1.52h16.9c.86 0 1.55-.68 1.55-1.52V3.52c0-.84-.69-1.52-1.55-1.52ZM7.93 18.75H4.98V9.2h2.95v9.55ZM6.45 7.9a1.71 1.71 0 1 1 0-3.42 1.71 1.71 0 0 1 0 3.42Zm12.3 10.85H15.8V14.1c0-1.11-.02-2.54-1.55-2.54-1.55 0-1.79 1.21-1.79 2.46v4.73H9.51V9.2h2.83v1.3h.04c.39-.74 1.36-1.52 2.79-1.52 2.98 0 3.58 1.96 3.58 4.51v5.26Z" />
    </svg>
  );
}

function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      aria-hidden="true"
      {...props}
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function WhatsAppIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      aria-hidden="true"
      {...props}
    >
      <path d="M4.8 19.2 6 15.6A8 8 0 1 1 8.4 18l-3.6 1.2Z" />
      <path d="M9.2 8.8c.2-.4.4-.5.7-.5h.6c.2 0 .4.1.5.4l.6 1.4c.1.3.1.5-.1.7l-.4.5c.5.9 1.2 1.6 2.1 2.1l.5-.4c.2-.2.4-.2.7-.1l1.4.6c.3.1.4.3.4.5v.6c0 .3-.1.5-.5.7-.6.3-1.5.4-2.5 0-2.3-.9-4.1-2.7-5-5-.4-1-.3-1.9 0-2.5Z" />
    </svg>
  );
}

export default function Footer() {
  const { user } = useSession();
  const isAdmin = !!user?.is_admin;
  const isLoggedIn = !!user;

  const exploreLinks = [
    { href: "/trips", label: "Browse Trips" },
    { href: "/custom-trip", label: "Plan a Custom Trip" },
    { href: "/about", label: "About Us" },
    ...(isLoggedIn
      ? [
          { href: "/dashboard", label: "My Dashboard" },
        ]
      : [
          { href: "/login", label: "Sign In" },
        ]),
  ];

  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-8 px-6 mt-auto">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12 flex flex-col justify-between gap-6 border-b border-slate-700 pb-10 sm:flex-row sm:items-end">
          <div><p className="text-xs uppercase tracking-[0.2em] text-slate-400">See a little more of the world</p><p className="mt-3 font-serif text-3xl text-white sm:text-4xl">Good company changes everything.</p></div>
          <Link href="/custom-trip" className="shrink-0 text-sm font-semibold text-white underline decoration-white/40 underline-offset-8 hover:decoration-white">Let’s plan your next trip →</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-9 md:gap-12 pb-12 border-b border-slate-800">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 text-white mb-4">
              <Compass className="w-6 h-6 text-orange-500" />
              <span className="text-xl font-bold tracking-tight">
                GoTogether
              </span>
            </Link>
            <p className="text-sm text-slate-300 leading-relaxed">
              Connect with verified travelers, join curated trips, and explore
              the world with confidence.
            </p>
          </div>

          {/* Explore */}
          <div>
            <h4 className="text-white text-sm font-semibold uppercase tracking-wider mb-4">
              Explore
            </h4>
            <ul className="space-y-3">
              {exploreLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white text-sm font-semibold uppercase tracking-wider mb-4">
              Legal
            </h4>
            <ul className="space-y-3">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Admin / Support Conditional */}
          <div>
            <h4 className="text-white text-sm font-semibold uppercase tracking-wider mb-4">
              {isAdmin ? "Admin & Support" : "Support"}
            </h4>
            <ul className="space-y-3">
              {isAdmin && adminLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              <li className={isAdmin ? "border-t border-slate-800 pt-3" : undefined}>
                <FooterSupportButton className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm font-semibold text-white transition hover:border-orange-400/60 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60" />
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-b border-slate-800 py-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Find us in the community</p>
          <div className="flex flex-wrap items-center gap-3">
            <a href="https://kittylaunch.com/p/gotogethertrip?utm_source=badge" target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-900">
              {/* KittyLaunch supplies a hosted SVG badge; preserve its original URL. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://kittylaunch.com/api/public/badges/launch_badge.svg?style=pill&theme=light" width="220" height="56" alt="GoTogetherTrip — Verified by KittyLaunch" data-kittylaunch-badge="1" loading="lazy" className="h-auto w-[220px] max-w-full" />
            </a>
            <a href="https://www.producthunt.com/@gotogether" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#ff6154]/30 bg-white px-3 py-1.5 text-[#da552f] transition-colors hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-900" aria-label="GoTogetherTrip on Product Hunt (opens in a new tab)">
              <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded-full bg-[#da552f] text-base font-bold text-white">P</span>
              <span><span className="block text-[9px] font-semibold uppercase tracking-wider">Also on</span><span className="block text-sm font-bold leading-4">Product Hunt</span></span>
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-300" suppressHydrationWarning>
            &copy; {new Date().getFullYear()} GoTogether. All rights reserved.
          </p>
          <div className="flex items-center gap-3">
            {socialLinks.map(({ href, label, Icon, className }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`GoTogether on ${label}`}
                title={label}
                className={`flex h-10 w-10 items-center justify-center rounded-full border border-slate-800 text-slate-300 transition-colors hover:border-slate-700 hover:bg-slate-800 ${className}`}
              >
                <Icon className="h-5 w-5" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

