"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, MessageCircle, UserPlus, CheckCircle, Users } from "lucide-react";
import { useRouter } from "next/navigation";

interface Counts {
  unreadMessages: number;
  firstUnreadTripId: string | null;
  pendingRequests: number;
  newAcceptances: number;
  firstAcceptedTripId: string | null;
  newTrips: number;
  newBookings: number;
  bookingUpdates: number;
  adminPendingApps: number;
  adminPendingFeedbacks: number;
  adminNewBookings: number;
  adminNewSupport: number;
  isAdmin: boolean;
  isBusiness: boolean;
}

const DEFAULT_COUNTS: Counts = {
  unreadMessages: 0, firstUnreadTripId: null,
  pendingRequests: 0,
  newAcceptances: 0, firstAcceptedTripId: null,
  newTrips: 0, newBookings: 0, bookingUpdates: 0,
  adminPendingApps: 0, adminPendingFeedbacks: 0, adminNewBookings: 0, adminNewSupport: 0,
  isAdmin: false, isBusiness: false,
};

export default function NotificationBell() {
  const [counts, setCounts] = useState<Counts>(DEFAULT_COUNTS);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const totalUnread =
    Number(counts.unreadMessages || 0) +
    Number(counts.pendingRequests || 0) +
    Number(counts.newAcceptances || 0) +
    Number(counts.bookingUpdates || 0) +
    (counts.isBusiness ? Number(counts.newTrips || 0) + Number(counts.newBookings || 0) : 0) +
    (counts.isAdmin
      ? Number(counts.adminPendingApps || 0) +
        Number(counts.adminPendingFeedbacks || 0) +
        Number(counts.adminNewBookings || 0) +
        Number(counts.adminNewSupport || 0)
      : 0);

  // ── REST fallback ────────────────────────────────────────────
  const fetchCounts = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setCounts((prev) => ({ ...prev, ...data }));
      }
    } catch { /* ignore */ }
  };

  // ── SSE with exponential-backoff reconnect ───────────────────
  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let retryDelay = 3000;
    let destroyed = false;

    const connect = () => {
      if (destroyed) return;
      es = new EventSource("/api/notifications/sse");
      es.onmessage = (e) => {
        retryDelay = 3000;
        try {
          const data = JSON.parse(e.data);
          setCounts((prev) => ({ ...prev, ...data }));
        } catch { /* ignore */ }
      };
      es.onerror = () => {
        es?.close();
        es = null;
        if (!destroyed) {
          retryTimeout = setTimeout(() => {
            retryDelay = Math.min(retryDelay * 2, 60000);
            connect();
          }, retryDelay);
        }
      };
    };

    if (typeof window !== "undefined" && !!window.EventSource) {
      connect();
      const handleVisibility = () => {
        if (document.hidden) {
          es?.close(); es = null;
          if (retryTimeout) { clearTimeout(retryTimeout); retryTimeout = null; }
        } else {
          retryDelay = 3000;
          connect();
        }
      };
      document.addEventListener("visibilitychange", handleVisibility);
      return () => {
        destroyed = true;
        es?.close();
        if (retryTimeout) clearTimeout(retryTimeout);
        document.removeEventListener("visibilitychange", handleVisibility);
      };
    } else {
      fetchCounts();
      const interval = setInterval(fetchCounts, 30000);
      return () => clearInterval(interval);
    }
  }, []);

  // ── Close on outside click ───────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Clear & navigate ─────────────────────────────────────────
  // Optimistically zero the relevant count in state so the badge
  // updates immediately, then persist via the API in the background.
  const clearKey: Record<string, keyof Counts> = {
    pendingRequests: "pendingRequests",
    acceptances: "newAcceptances",
    newTrips: "newTrips",
    newBookings: "newBookings",
    bookingUpdates: "bookingUpdates",
    adminPendingApps: "adminPendingApps",
    adminPendingFeedbacks: "adminPendingFeedbacks",
    adminNewBookings: "adminNewBookings",
    adminNewSupport: "adminNewSupport",
  };

  const handleClearAndRoute = (type: string, path: string) => {
    setIsOpen(false);
    if (type && clearKey[type]) {
      // Optimistic clear — badge drops to 0 instantly
      setCounts((prev) => ({ ...prev, [clearKey[type]]: 0 }));
      // Persist in background; SSE will confirm on next tick
      fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      }).catch(() => {});
    }
    router.push(path);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:text-orange-500 hover:bg-orange-50 rounded-full transition-colors flex items-center justify-center"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {totalUnread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border border-white shadow-sm">
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50">
          <div className="p-3 bg-slate-50 border-b border-slate-100 font-bold text-slate-800 flex justify-between items-center">
            Notifications
            {totalUnread === 0 && <span className="text-xs text-slate-500 font-normal">All caught up!</span>}
          </div>

          <div className="flex flex-col max-h-80 overflow-y-auto">
            {totalUnread === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">No new notifications</div>
            ) : (
              <>
                {/* Unread messages → specific chat */}
                {counts.unreadMessages > 0 && (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      // Navigate to the specific chat with unread messages,
                      // or fall back to the user dashboard if unknown.
                      router.push(counts.firstUnreadTripId ? `/chat/${counts.firstUnreadTripId}` : "/dashboard/user");
                    }}
                    className="p-3 hover:bg-orange-50 transition-colors flex items-center gap-3 border-b border-slate-100 text-left w-full"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center shrink-0">
                      <MessageCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {counts.unreadMessages} new message{counts.unreadMessages > 1 ? "s" : ""}
                      </p>
                      <p className="text-xs text-slate-500">Tap to open chat</p>
                    </div>
                  </button>
                )}

                {/* Pending buddy requests → organizer dashboard */}
                {counts.pendingRequests > 0 && (
                  <button
                    onClick={() => handleClearAndRoute("pendingRequests", "/dashboard/organizer")}
                    className="p-3 hover:bg-orange-50 transition-colors flex items-center gap-3 border-b border-slate-100 text-left w-full"
                  >
                    <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center shrink-0">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {counts.pendingRequests} pending request{counts.pendingRequests > 1 ? "s" : ""}
                      </p>
                      <p className="text-xs text-slate-500">Review join requests for your trip</p>
                    </div>
                  </button>
                )}

                {/* Accepted buddy requests → go directly to the trip chat */}
                {counts.newAcceptances > 0 && (
                  <button
                    onClick={() => handleClearAndRoute(
                      "acceptances",
                      counts.firstAcceptedTripId ? `/chat/${counts.firstAcceptedTripId}` : "/dashboard/user"
                    )}
                    className="p-3 hover:bg-orange-50 transition-colors flex items-center gap-3 border-b border-slate-100 text-left w-full"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-500 flex items-center justify-center shrink-0">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {counts.newAcceptances} trip{counts.newAcceptances > 1 ? "s" : ""} accepted
                      </p>
                      <p className="text-xs text-slate-500">You&apos;re in! Open the trip chat</p>
                    </div>
                  </button>
                )}

                {/* User booking updates → premium dashboard */}
                {counts.bookingUpdates > 0 && (
                  <button
                    onClick={() => handleClearAndRoute("bookingUpdates", "/dashboard/user?tab=premium")}
                    className="p-3 hover:bg-orange-50 transition-colors flex items-center gap-3 border-b border-slate-100 text-left w-full"
                  >
                    <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center shrink-0">
                      <Bell className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {counts.bookingUpdates} booking update{counts.bookingUpdates > 1 ? "s" : ""}
                      </p>
                      <p className="text-xs text-slate-500">Trip cancelled or booking updated</p>
                    </div>
                  </button>
                )}

                {/* Business: trip approved by admin → business dashboard */}
                {counts.isBusiness && counts.newTrips > 0 && (
                  <button
                    onClick={() => handleClearAndRoute("newTrips", "/dashboard/business")}
                    className="p-3 hover:bg-orange-50 transition-colors flex items-center gap-3 border-b border-slate-100 text-left w-full"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-500 flex items-center justify-center shrink-0">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {counts.newTrips} trip{counts.newTrips > 1 ? "s" : ""} approved
                      </p>
                      <p className="text-xs text-slate-500">Your trip is now live!</p>
                    </div>
                  </button>
                )}

                {/* Business: new booking on your trip → business dashboard */}
                {counts.isBusiness && counts.newBookings > 0 && (
                  <button
                    onClick={() => handleClearAndRoute("newBookings", "/dashboard/business")}
                    className="p-3 hover:bg-orange-50 transition-colors flex items-center gap-3 border-b border-slate-100 text-left w-full"
                  >
                    <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-500 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {counts.newBookings} new booking{counts.newBookings > 1 ? "s" : ""}
                      </p>
                      <p className="text-xs text-slate-500">Someone booked your trip</p>
                    </div>
                  </button>
                )}

                {/* Admin: pending business applications */}
                {counts.isAdmin && counts.adminPendingApps > 0 && (
                  <button
                    onClick={() => handleClearAndRoute("adminPendingApps", "/admin/business-apps")}
                    className="p-3 hover:bg-orange-50 transition-colors flex items-center gap-3 border-b border-slate-100 text-left w-full"
                  >
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-500 flex items-center justify-center shrink-0">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {counts.adminPendingApps} business app{counts.adminPendingApps > 1 ? "s" : ""} pending
                      </p>
                      <p className="text-xs text-slate-500">Review new business registrations</p>
                    </div>
                  </button>
                )}

                {/* Admin: pending feedbacks */}
                {counts.isAdmin && counts.adminPendingFeedbacks > 0 && (
                  <button
                    onClick={() => handleClearAndRoute("adminPendingFeedbacks", "/admin/reports")}
                    className="p-3 hover:bg-orange-50 transition-colors flex items-center gap-3 border-b border-slate-100 text-left w-full"
                  >
                    <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-500 flex items-center justify-center shrink-0">
                      <MessageCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {counts.adminPendingFeedbacks} new feedback{counts.adminPendingFeedbacks > 1 ? "s" : ""}
                      </p>
                      <p className="text-xs text-slate-500">Review user feedback</p>
                    </div>
                  </button>
                )}

                {/* Admin: new bookings across platform */}
                {counts.isAdmin && counts.adminNewBookings > 0 && (
                  <button
                    onClick={() => handleClearAndRoute("adminNewBookings", "/admin/trips")}
                    className="p-3 hover:bg-orange-50 transition-colors flex items-center gap-3 border-b border-slate-100 text-left w-full"
                  >
                    <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-500 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {counts.adminNewBookings} new booking{counts.adminNewBookings > 1 ? "s" : ""}
                      </p>
                      <p className="text-xs text-slate-500">Users interested in trips</p>
                    </div>
                  </button>
                )}

                {/* Admin: new support tickets */}
                {counts.isAdmin && counts.adminNewSupport > 0 && (
                  <button
                    onClick={() => handleClearAndRoute("adminNewSupport", "/admin/support")}
                    className="p-3 hover:bg-orange-50 transition-colors flex items-center gap-3 border-b border-slate-100 text-left w-full"
                  >
                    <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center shrink-0">
                      <MessageCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {counts.adminNewSupport} new support ticket{counts.adminNewSupport > 1 ? "s" : ""}
                      </p>
                      <p className="text-xs text-slate-500">Open support requests</p>
                    </div>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
