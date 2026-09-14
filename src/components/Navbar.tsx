"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Compass, Menu, X, ShieldCheck, MessageSquare, MessageCircle } from "lucide-react";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import AnimatedButton from "@/components/AnimatedButton";
import { useSession } from "@/components/SessionProvider";
import { hasCompleteProfile } from "@/lib/profile";
import { apiJson } from "@/lib/apiClient";

const FeedbackModal = dynamic(() => import("@/components/FeedbackModal"), { ssr: false });
const NotificationBell = dynamic(() => import("@/components/NotificationBell"), { ssr: false });

const navLinks = [
  { href: "/", label: "Home" },
  { href: '/trips', label: 'Trips' },
  { href: "/custom-trip", label: "Custom Trip" },
  { href: "/buddy", label: "Find Buddy" },
  { href: "/stories", label: "Stories" },
  { href: "/about", label: "About" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isLoaded: userLoaded, setSessionSignedOut } = useSession();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [hasTeamChats, setHasTeamChats] = useState(false);
  const [notice, setNotice] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!mobileOpen && !avatarMenuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        setAvatarMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen, avatarMenuOpen]);
  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [mobileOpen]);
  useEffect(() => {
    setAvatarFailed(false);
  }, [user?.avatar_url]);
  useEffect(() => {
    if (!user?.id) {
      setHasTeamChats(false);
      return;
    }
    const controller = new AbortController();
    fetch("/api/chat/trips", { signal: controller.signal, cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setHasTeamChats(Boolean(data?.hasTeamChats)))
      .catch(() => { if (!controller.signal.aborted) setHasTeamChats(false); });
    return () => controller.abort();
  }, [user?.id]);

  const hasSolidHeader = true;
  const navBg = "border-b border-slate-200 bg-slate-50/95 backdrop-blur-lg";
  const textColor = "text-slate-700";
  const logoColor = "text-slate-950";
  const navRailClass = "border-transparent bg-transparent";
  const navTabClass = (active: boolean) => active
    ? "bg-slate-200/55 text-slate-950"
    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950";

  const isNavActive = (href: string) => href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);

  const isAdmin = !!user?.is_admin;

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setNotice("");
    try {
      await apiJson("/api/auth/signout", { method: "POST" }, { timeoutMs: 8000 });
      setSessionSignedOut();
      setAvatarMenuOpen(false);
      router.push("/");
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "We could not sign you out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  };

  // Avatar initial button
  const renderAvatarButton = (className = "") => {
    const initial = user?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U";
    return (
      <button
        type="button"
        onClick={() => setAvatarMenuOpen((prev) => !prev)}
        className={`relative flex h-9 w-9 items-center justify-center rounded-lg border border-orange-700 bg-orange-600 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 ${className}`}
        aria-label="Open user menu"
        aria-expanded={avatarMenuOpen}
        aria-haspopup="menu"
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
        aria-label="Primary navigation"
        className={`fixed top-0 z-50 flex w-full items-center transition-all duration-300 ${navBg}`}
      >
        <div className="mx-auto flex h-17 w-full max-w-[1360px] items-center justify-between gap-5 px-4 sm:px-6">
          {/* Logo */}
          <Link href="/" className={`flex shrink-0 items-center gap-2.5 ${logoColor}`}>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-md shadow-orange-500/20">
              <Compass className="h-5 w-5" />
            </span>
            <span className="text-xl font-bold tracking-tight">GoTogether</span>
          </Link>

          {/* Desktop Nav */}
          <div className={`hidden min-w-0 items-center gap-1 rounded-xl border p-1 text-sm font-semibold backdrop-blur-md xl:flex ${navRailClass}`}>
          {navLinks.map((link) => {
            const isProfileComplete = hasCompleteProfile(user);
            const requiresAuth = false;
            const requiresProfile = link.href.startsWith("/stories");

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
                setNotice("Complete your traveler profile before opening Stories.");
                router.push("/dashboard");
              }
            };

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={handleRestrictedClick}
                aria-current={isNavActive(link.href) ? "page" : undefined}
                className={`whitespace-nowrap rounded-lg px-3 py-2 transition ${link.href === "/custom-trip" || link.href === "/buddy" ? "gt-nav-feature" : navTabClass(isNavActive(link.href))} ${((!userLoaded || (requiresAuth && !user) || (user && !isProfileComplete)) && requiresProfile) ? "cursor-not-allowed opacity-50" : ""}`}
                title={requiresProfile ? (!userLoaded ? "Checking account" : requiresAuth && !user ? "Sign in to unlock" : user && !isProfileComplete ? "Complete profile to unlock" : "") : ""}
              >
                {link.label}
              </Link>
            );
          })}

          {userLoaded && user && hasTeamChats && (
            <Link
              href="/team-chat"
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 transition ${navTabClass(pathname === "/team-chat" || pathname.startsWith("/chat/"))}`}
            >
              <MessageCircle className="w-4 h-4" /> Team Chat
            </Link>
          )}

          {/* Business Link */}
          {userLoaded && user && !isAdmin && (
            <Link
              href={user.role === 'business' ? "/dashboard/business" : "/register-business"}
              className={`whitespace-nowrap rounded-lg px-3 py-2 transition ${navTabClass(pathname === "/register-business" || pathname === "/dashboard/business")}`}
            >
              {user.role === 'business' ? "Business Dashboard" : "Register Business"}
            </Link>
          )}

          {/* Admin link — only for admin email */}
          {isAdmin && (
            <Link
              href="/admin"
              className={`flex items-center gap-1 whitespace-nowrap rounded-lg px-3 py-2 transition ${navTabClass(pathname.startsWith("/admin"))}`}
            >
              <ShieldCheck className="w-4 h-4" />
              Admin
            </Link>
          )}

          {/* Feedback and Notifications — logged-in users only */}
          {userLoaded && user && (
            <div className="flex items-center gap-1 pl-1">
              <NotificationBell className={textColor} />
              <button
                type="button"
                onClick={() => setFeedbackOpen(true)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 transition hover:bg-white/70 ${textColor}`}
                aria-label="Send Feedback"
                title="Send Feedback"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden 2xl:inline">Feedback</span>
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
                    <div className="absolute right-0 top-12 z-50 w-60 rounded-xl border border-slate-200 bg-white py-2 shadow-xl animate-in fade-in slide-in-from-top-2 duration-150">
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
                        type="button"
                        onClick={handleSignOut}
                        disabled={signingOut}
                        className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        {signingOut ? "Signing out…" : "Sign Out"}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <AnimatedButton
                  href="/login"
                  className="rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-700"
                >
                  Sign In
                </AnimatedButton>
              )}
            </>
          )}
          </div>

          {/* Mobile Menu Button + Notification */}
          <div className="flex items-center gap-2 xl:hidden">
          {userLoaded && user && <NotificationBell className={textColor} />}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className={`rounded-lg border p-2 transition ${hasSolidHeader ? "border-slate-200 hover:bg-slate-100" : "border-white/20 hover:bg-white/10"} ${textColor}`}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          </div>
        </div>
      </nav>

      {/* Close avatar dropdown on outside click */}
      {avatarMenuOpen && (
        <button
          type="button"
          aria-label="Close user menu"
          className="fixed inset-0 z-40 cursor-default"
          onClick={() => setAvatarMenuOpen(false)}
        />
      )}

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div id="mobile-navigation" className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-slate-50 px-4 pb-6 pt-21 xl:hidden animate-in slide-in-from-top-2">
          <div className="mx-auto w-full max-w-lg space-y-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            {navLinks.map((link) => {
              const isProfileComplete = hasCompleteProfile(user);
              const requiresAuth = false;
              const requiresProfile = link.href.startsWith("/stories");

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
                  setNotice("Complete your traveler profile before opening Stories.");
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
                  aria-current={pathname === link.href ? "page" : undefined}
                  className={`block rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${link.href === "/custom-trip" || link.href === "/buddy" ? "gt-nav-feature" : isNavActive(link.href)
                      ? "bg-orange-50 text-orange-700 ring-1 ring-orange-200/70"
                      : "text-slate-700 hover:bg-slate-50"
                    } ${((!userLoaded || (requiresAuth && !user) || (user && !isProfileComplete)) && requiresProfile) ? "opacity-50" : ""}`}
                >
                  {link.label}
                </Link>
              );
            })}

            {userLoaded && user && hasTeamChats && (
              <Link
                href="/team-chat"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${pathname === "/team-chat" || pathname.startsWith("/chat/") ? "bg-orange-50 text-orange-700 ring-1 ring-orange-200/70" : "text-slate-700 hover:bg-slate-50"}`}
              >
                <MessageCircle className="w-5 h-5" /> Team Chat
              </Link>
            )}

            {/* Business Link — mobile */}
            {userLoaded && user && !isAdmin && (
              <Link
                href={user.role === 'business' ? "/dashboard/business" : "/register-business"}
                onClick={() => setMobileOpen(false)}
                className={`block rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${pathname === "/register-business" || pathname === "/dashboard/business"
                    ? "bg-orange-50 text-orange-700 ring-1 ring-orange-200/70"
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
                className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${pathname.startsWith("/admin")
                    ? "bg-orange-50 text-orange-700 ring-1 ring-orange-200/70"
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
                type="button"
                onClick={() => { setMobileOpen(false); setFeedbackOpen(true); }}
                className="flex w-full items-center gap-2 rounded-lg px-4 py-3 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <MessageSquare className="w-5 h-5" />
                Feedback
              </button>
            )}
          </div>

          <div className="mx-auto mt-4 w-full max-w-lg border-t border-slate-200 pt-4">
            {user ? (
              <>
                {/* User info row */}
                <div className="mb-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-orange-600 text-sm font-bold text-white">
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
                  className="mb-2 block w-full rounded-lg bg-orange-600 px-6 py-3 text-center font-semibold text-white shadow-sm hover:bg-orange-700"
                >
                  My Dashboard
                </Link>
                <button
                  onClick={() => { setMobileOpen(false); handleSignOut(); }}
                  type="button"
                  disabled={signingOut}
                  className="block w-full rounded-lg border border-rose-200 bg-white px-6 py-3 text-center font-semibold text-rose-700 hover:bg-rose-50"
                >
                  {signingOut ? "Signing out…" : "Sign Out"}
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="block w-full rounded-lg bg-orange-600 px-6 py-3 text-center font-semibold text-white shadow-sm hover:bg-orange-700"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      <FeedbackModal isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      {notice && (
        <div role="status" aria-live="polite" className="fixed bottom-4 left-1/2 z-[210] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-2xl border border-orange-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-2xl">
          <span className="min-w-0 flex-1">{notice}</span>
          <button type="button" onClick={() => setNotice("")} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100" aria-label="Dismiss message">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  );
}
