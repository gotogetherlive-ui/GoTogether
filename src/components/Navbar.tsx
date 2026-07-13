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
  { href: "/buddy", label: "Find Buddy" },
  { href: "/stories", label: "Stories" },
  { href: "/about", label: "About" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, isLoaded: userLoaded, setSessionSignedOut } = useSession();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [hasTeamChats, setHasTeamChats] = useState(false);
  const [notice, setNotice] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  const isHomepage = pathname === "/";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
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
        className={`relative flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 text-white font-bold text-sm shadow-lg hover:shadow-orange-500/40 transition-all ring-2 ring-white hover:scale-105 ${className}`}
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
                aria-current={pathname === link.href ? "page" : undefined}
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

          {userLoaded && user && hasTeamChats && (
            <Link
              href="/team-chat"
              className={`hover:text-orange-500 transition-colors relative py-1 flex items-center gap-1.5 ${pathname === "/team-chat" || pathname.startsWith("/chat/") ? "text-orange-500" : ""}`}
            >
              <MessageCircle className="w-4 h-4" /> Team Chat
              {(pathname === "/team-chat" || pathname.startsWith("/chat/")) && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-full" />}
            </Link>
          )}

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
                type="button"
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
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className={`p-2 rounded-lg ${textColor}`}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
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
        <div id="mobile-navigation" className="fixed inset-0 z-40 overflow-y-auto bg-white flex flex-col pt-20 px-6 pb-6 md:hidden animate-in slide-in-from-top-2">
          <div className="space-y-1">
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
                  className={`block px-4 py-3 rounded-xl text-lg font-medium transition-colors ${pathname === link.href
                      ? "bg-orange-50 text-orange-600"
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
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-lg font-medium transition-colors ${pathname === "/team-chat" || pathname.startsWith("/chat/") ? "bg-orange-50 text-orange-600" : "text-slate-700 hover:bg-slate-50"}`}
              >
                <MessageCircle className="w-5 h-5" /> Team Chat
              </Link>
            )}

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
                type="button"
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
                  type="button"
                  disabled={signingOut}
                  className="block w-full text-center border border-rose-200 text-rose-600 px-6 py-3 rounded-full font-semibold"
                >
                  {signingOut ? "Signing out…" : "Sign Out"}
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
