import Link from "next/link";
import { Compass } from "lucide-react";
import { getSession } from "@/lib/auth";
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

export default async function Footer() {
  const user = await getSession();
  const isAdmin = user?.role === 'super_admin';
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
          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} GoTogether. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-slate-600">All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
