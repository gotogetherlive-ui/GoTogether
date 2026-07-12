"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Users,
  MapPin,
  BarChart3,
  Settings,
  LogOut,
  Compass,
  ExternalLink,
  MessageSquare,
  Loader2,
  Building2,
  Headset,
  Mail,
} from "lucide-react";
import { useEffect, useState } from "react";


const sidebarLinks = [
  { href: "/admin", label: "Dashboard", icon: BarChart3, exact: true },
  { href: "/admin/users", label: "User Management", icon: Users },
  { href: "/admin/trips", label: "Trip Moderation", icon: MapPin },
  { href: "/admin/user-trips", label: "User Trips", icon: Compass },
  { href: "/admin/business-apps", label: "Business Apps", icon: Building2 },
  { href: "/admin/support", label: "Support Tickets", icon: Headset },
  { href: "/admin/campaigns", label: "User Campaigns", icon: Mail },
  { href: "/admin/reports", label: "Feedback", icon: MessageSquare },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

interface AdminUser {
  email: string;
  full_name: string;
  avatar_url: string | null;
  is_admin?: boolean;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then(({ user }) => {
        if (!user || !user.is_admin) {
          router.replace("/login");
        } else {
          setAdminUser(user);
        }
      })
      .catch(() => router.replace("/login"))
      .finally(() => setChecking(false));
  }, [router]);

  const handleSignOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/login");
  };

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-orange-400 animate-spin" />
      </div>
    );
  }

  if (!adminUser) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col fixed h-full z-20">
        {/* Logo */}
        <div className="p-6 border-b border-slate-800">
          <Link href="/" className="flex items-center gap-2 text-white group">
            <Compass className="w-6 h-6 text-orange-500" />
            <span className="text-xl font-bold tracking-tight">GoTogether</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-orange-400 transition-colors mt-2 ml-0.5"
          >
            <ExternalLink className="w-3 h-3" />
            Back to Site
          </Link>
        </div>

        {/* Admin Panel Label */}
        <div className="px-6 pt-5 pb-2">
          <span className="text-[11px] font-semibold tracking-widest uppercase text-slate-500">
            Admin Panel
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-2 px-4 space-y-1 overflow-y-auto">
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href, link.exact);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-sm font-medium ${
                  active
                    ? "bg-orange-500/10 text-orange-400 shadow-sm"
                    : "hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? "text-orange-400" : ""}`} />
                {link.label}
                {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-400" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom — real admin info */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <div className="px-4 py-2 bg-slate-800/50 rounded-lg flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-400 to-rose-400 flex items-center justify-center text-white text-xs font-bold shadow-inner overflow-hidden">
              {adminUser.avatar_url ? (
                <img src={adminUser.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                adminUser.full_name?.charAt(0)?.toUpperCase() || "A"
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-white truncate">
                {adminUser.full_name || "Super Admin"}
              </span>
              <span className="text-[10px] text-slate-500 truncate">{adminUser.email}</span>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-3 w-full text-left rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-colors text-sm"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
          <div>
            <p className="text-sm text-slate-500">Welcome back,</p>
            <h2 className="text-lg font-bold text-slate-900">
              {adminUser.full_name || "Super Admin"}
            </h2>
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-orange-500 transition-colors bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm hover:shadow-md"
          >
            <Compass className="w-4 h-4" />
            View Live Site
          </Link>
        </div>

        <div className="max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
