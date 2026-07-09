"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Compass, Menu, X, ShieldCheck, MessageSquare } from "lucide-react";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import AnimatedButton from "@/components/AnimatedButton";
import { useSession } from "@/components/SessionProvider";
import { hasCompleteProfile } from "@/lib/profile";

const FeedbackModal = dynamic(() => import("@/components/FeedbackModal"), { ssr: false });
const NotificationBell = dynamic(() => import("@/components/NotificationBell"), { ssr: false });

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/buddy", label: "Find Buddy" },
  { href: "/stories", label: "Stories" },
  { href: "/about", label: "About" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, isLoaded: userLoaded, refreshSession } = useSession();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const isHomepage = pathname === "/";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  useEffect(() => {
    setAvatarFailed(false);
  }, [user?.avatar_url]);

  const navBg =
    mobileOpen || (!isHomepage || scrolled)
      ? "bg-white/90 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border-b border-white/50"
      : "bg-transparent";
  const textColor =
    mobileOpen || (!isHomepage || scrolled) ? "text-slate-700" : "text-white drop-shadow-md";
  const logoColor =
    mobileOpen || (!isHomepage || scrolled) ? "text-slate-900" : "text-white drop-shadow-md";

  const isAdmin = !!user?.is_admin;

  const handleSignOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    refreshSession();
    setAvatarMenuOpen(false);
    router.push("/");
    router.refresh();
  };

  // Avatar initial button
  const renderAvatarButton = (className = "") => {
    const initial = user?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U";
    return (
      <button
        onClick={() => setAvatarMenuOpen((prev) => !prev)}
        className={`relative flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 text-white font-bold text-sm shadow-lg hover:shadow-orange-500/40 transition-all ring-2 ring-white hover:scale-105 ${className}`}
        aria-label="Open user menu"
        title={user?.full_name || user?.email || "Profile"}
      >
        {user?.avatar_url && !avatarFailed ? (
          <img
            src={user.avatar_url}
            alt={initial}
            className="w-full h-full rounded-full object-cover"
            onError={() => setAvatarFailed(true)}
          />
        ) : (
          initial
        )}
      </button>
    );
  };

  return (
    <>
      <nav
        className={`fixed top-0 w-full z-50 px-6 py-4 flex items-center justify-between transition-all duration-300 ${navBg}`}
      >
        {/* Logo */}
        <Link href="/" className={`flex items-center gap-2 ${logoColor}`}>
          <Compass className="w-8 h-8 text-orange-500" />
          <span className="text-2xl font-bold tracking-tight">GoTogether</span>
        </Link>

        {/* Desktop Nav */}
        <div className={`hidden md:flex items-center gap-6 font-medium ${textColor}`}>
          {navLinks.map((link) => {
            const isProfileComplete = hasCompleteProfile(user);
            const requiresAuth = link.href.startsWith("/buddy");
            const requiresProfile = requiresAuth || link.href.startsWith("/stories");

            const handleRestrictedClick = (e: React.MouseEvent) => {
              if (!requiresProfile) return;
              if (!userLoaded) {
                e.preventDefault();
                return;
              }
              if (!user) {
                if (requiresAuth) {
                  e.preventDefault();
                  router.push("/login");
                }
                return;
              }
              if (!isProfileComplete) {
                e.preventDefault();
                alert("Please complete your profile in the Dashboard before accessing this feature.");
                router.push("/dashboard");
              }
            };

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={handleRestrictedClick}
                className={`hover:text-orange-500 transition-colors relative py-1 ${pathname === link.href ? "text-orange-500" : ""
                  } ${((!userLoaded || (requiresAuth && !user) || (user && !isProfileComplete)) && requiresProfile) ? "opacity-50 cursor-not-allowed" : ""}`}
                title={requiresProfile ? (!userLoaded ? "Checking account" : requiresAuth && !user ? "Sign in to unlock" : user && !isProfileComplete ? "Complete profile to unlock" : "") : ""}
              >
                {link.label}
                {pathname === link.href && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-full" />
                )}
              </Link>
            );
          })}

          {/* Business Link */}
          {userLoaded && user && !isAdmin && (
            <Link
              href={user.role === 'business' ? "/dashboard/business" : "/register-business"}
              className={`hover:text-orange-500 transition-colors relative py-1 ${pathname === "/register-business" || pathname === "/dashboard/business" ? "text-orange-500" : ""
                }`}
            >
              {user.role === 'business' ? "Business Dashboard" : "Register Business"}
              {(pathname === "/register-business" || pathname === "/dashboard/business") && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-full" />
              )}
            </Link>
          )}

          {/* Admin link — only for admin email */}
          {isAdmin && (
            <Link
              href="/admin"
              className={`hover:text-orange-500 transition-colors flex items-center gap-1 ${pathname.startsWith("/admin") ? "text-orange-500" : ""
                }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Admin
            </Link>
          )}

          {/* Feedback and Notifications — logged-in users only */}
          {userLoaded && user && (
            <div className="flex items-center gap-2">
              <NotificationBell />
              <button
                onClick={() => setFeedbackOpen(true)}
                className={`hover:text-orange-500 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-transparent hover:border-orange-200 hover:bg-orange-50/50 ${textColor}`}
                title="Send Feedback"
              >
                <MessageSquare className="w-4 h-4" />
                Feedback
              </button>
            </div>
          )}

          {/* Auth section */}
          {userLoaded && (
            <>
              {user ? (
                <div className="relative">
                  {renderAvatarButton()}
                  {/* Dropdown */}
                  {avatarMenuOpen && (
                    <div className="absolute right-0 top-12 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-4 py-3 border-b border-slate-100">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {user.full_name || "Traveler"}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      </div>
                      <Link
                        href="/dashboard"
                        onClick={() => setAvatarMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                      >
                        My Dashboard
                      </Link>
                      {isAdmin && (
                        <Link
                          href="/admin"
                          onClick={() => setAvatarMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          Admin Panel
                        </Link>
                      )}
                      <hr className="my-1 border-slate-100" />
                      <button
                        onClick={handleSignOut}
                        className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <AnimatedButton
                  href="/login"
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-full shadow-lg hover:shadow-orange-500/30 font-semibold text-sm"
                >
                  Sign In
                </AnimatedButton>
              )}
            </>
          )}
        </div>

        {/* Mobile Menu Button + Notification */}
        <div className="md:hidden flex items-center gap-2">
          {userLoaded && user && <NotificationBell />}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className={`p-2 rounded-lg ${textColor}`}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Close avatar dropdown on outside click */}
      {avatarMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setAvatarMenuOpen(false)}
        />
      )}

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-white flex flex-col pt-20 px-6 md:hidden animate-in slide-in-from-top-2">
          <div className="space-y-1">
            {navLinks.map((link) => {
              const isProfileComplete = hasCompleteProfile(user);
              const requiresAuth = link.href.startsWith("/buddy");
              const requiresProfile = requiresAuth || link.href.startsWith("/stories");

              const handleRestrictedClick = (e: React.MouseEvent) => {
                if (!requiresProfile) {
                  setMobileOpen(false);
                  return;
                }
                if (!userLoaded) {
                  e.preventDefault();
                  return;
                }
                if (!user) {
                  if (requiresAuth) {
                    e.preventDefault();
                    router.push("/login");
                    setMobileOpen(false);
                  }
                  return;
                }
                if (!isProfileComplete) {
                  e.preventDefault();
                  alert("Please complete your profile in the Dashboard before accessing this feature.");
                  router.push("/dashboard");
                  setMobileOpen(false);
                  return;
                }
                setMobileOpen(false);
              };

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={handleRestrictedClick}
                  className={`block px-4 py-3 rounded-xl text-lg font-medium transition-colors ${pathname === link.href
                      ? "bg-orange-50 text-orange-600"
                      : "text-slate-700 hover:bg-slate-50"
                    } ${((!userLoaded || (requiresAuth && !user) || (user && !isProfileComplete)) && requiresProfile) ? "opacity-50" : ""}`}
                >
                  {link.label}
                </Link>
              );
            })}

            {/* Business Link — mobile */}
            {userLoaded && user && !isAdmin && (
              <Link
                href={user.role === 'business' ? "/dashboard/business" : "/register-business"}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-3 rounded-xl text-lg font-medium transition-colors ${pathname === "/register-business" || pathname === "/dashboard/business"
                    ? "bg-orange-50 text-orange-600"
                    : "text-slate-700 hover:bg-slate-50"
                  }`}
              >
                {user.role === 'business' ? "Business Dashboard" : "Register Business"}
              </Link>
            )}

            {/* Admin — mobile */}
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-lg font-medium transition-colors ${pathname.startsWith("/admin")
                    ? "bg-orange-50 text-orange-600"
                    : "text-slate-700 hover:bg-slate-50"
                  }`}
              >
                <ShieldCheck className="w-5 h-5" />
                Admin Dashboard
              </Link>
            )}

            {/* Feedback — mobile */}
            {user && (
              <button
                onClick={() => { setMobileOpen(false); setFeedbackOpen(true); }}
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-lg font-medium text-slate-700 hover:bg-slate-50 transition-colors w-full text-left"
              >
                <MessageSquare className="w-5 h-5" />
                Feedback
              </button>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100">
            {user ? (
              <>
                {/* User info row */}
                <div className="flex items-center gap-3 px-4 py-3 mb-2 bg-slate-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                    {user.avatar_url && !avatarFailed ? (
                      <img
                        src={user.avatar_url}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={() => setAvatarFailed(true)}
                      />
                    ) : (
                      user.full_name?.charAt(0)?.toUpperCase() || "U"
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{user.full_name || "Traveler"}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>
                </div>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="block w-full text-center bg-orange-500 hover:bg-orange-600 text-white px-6 py-3.5 rounded-full font-semibold shadow-lg mb-2"
                >
                  My Dashboard
                </Link>
                <button
                  onClick={() => { setMobileOpen(false); handleSignOut(); }}
                  className="block w-full text-center border border-rose-200 text-rose-600 px-6 py-3 rounded-full font-semibold"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="block w-full text-center bg-orange-500 hover:bg-orange-600 text-white px-6 py-3.5 rounded-full font-semibold shadow-lg"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      <FeedbackModal isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </>
  );
}
