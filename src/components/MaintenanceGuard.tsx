"use client";

import { Wrench, Compass } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/components/SessionProvider";

/**
 * MaintenanceGuard wraps public pages.
 * When maintenance_mode is ON in admin settings, it replaces the page content
 * with a maintenance notice. Admin users can bypass it.
 *
 * Now reads maintenance status from props (set in page/layout server components)
 * and user session from SessionProvider context — no more client-side fetches.
 */
export default function MaintenanceGuard({
  children,
  maintenanceMode = false,
}: {
  children: React.ReactNode;
  maintenanceMode?: boolean;
}) {
  const { user } = useSession();
  const isAdmin = !!user?.is_admin;
  const pathname = usePathname();

  // Bypass maintenance mode for login and auth callback pages so admins can log in
  const isAuthPage = pathname === "/login" || pathname.startsWith("/auth");

  // If maintenance mode is ON, user is NOT admin, and not on auth pages, show maintenance page
  if (maintenanceMode && !isAdmin && !isAuthPage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
        <div className="text-center max-w-lg">
          <div className="w-20 h-20 rounded-2xl bg-orange-500/20 flex items-center justify-center mx-auto mb-8 animate-pulse">
            <Wrench className="w-10 h-10 text-orange-400" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Compass className="w-6 h-6 text-orange-400" />
            <span className="text-xl font-bold text-white tracking-tight">GoTogether</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            We&apos;ll be right back
          </h1>
          <p className="text-slate-400 text-lg mb-8 leading-relaxed">
            We&apos;re performing scheduled maintenance to improve your experience. 
            Please check back shortly.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
            <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
            Maintenance in progress
          </div>
        </div>
      </div>
    );
  }

  // Show admin banner if maintenance is on but user is admin
  if (maintenanceMode && isAdmin) {
    return (
      <>
        <div className="bg-amber-500 text-white text-center py-2 px-4 text-sm font-semibold z-50 relative">
          ⚠️ Maintenance mode is ON — only admins can see the site. 
          <Link href="/admin/settings" className="underline ml-1 hover:text-amber-100">Disable in Settings</Link>
        </div>
        {children}
      </>
    );
  }

  return <>{children}</>;
}
