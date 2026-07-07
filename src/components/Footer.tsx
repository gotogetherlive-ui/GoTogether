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
    href: "https://www.instagram.com/gotogether.in?igsh=azhiNGt5dXdiYmR2&utm_source=ig_contact_invite",
    label: "Instagram",
    Icon: InstagramIcon,
    className: "hover:text-pink-400",
  },
  {
    href: "https://chat.whatsapp.com/HWmEmqlCvNIBoHvNyfPETP?s=sh&p=a&mlu=0&ilr=0",
    label: "WhatsApp",
    Icon: WhatsAppIcon,
    className: "hover:text-emerald-400",
  },
];

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
    <footer className="bg-slate-900 text-slate-400 pt-16 pb-8 px-6 mt-auto">
      <div className="max-w-7xl mx-auto">
        {/* Top Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 pb-12 border-b border-slate-800">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 text-white mb-4">
              <Compass className="w-6 h-6 text-orange-500" />
              <span className="text-xl font-bold tracking-tight">
                GoTogether
              </span>
            </Link>
            <p className="text-sm text-slate-500 leading-relaxed">
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
              {isAdmin ? "Admin" : "Support"}
            </h4>
            <ul className="space-y-3">
              {isAdmin ? (
                adminLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))
              ) : (
                <>
                  <li>
                    <FooterSupportButton />
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-600" suppressHydrationWarning>
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
                className={`flex h-10 w-10 items-center justify-center rounded-full border border-slate-800 text-slate-500 transition-colors hover:border-slate-700 hover:bg-slate-800 ${className}`}
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

