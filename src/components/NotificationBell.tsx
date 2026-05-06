"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Bell, MessageCircle, UserPlus, CheckCircle, Users } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NotificationBell() {
  const [unreadCounts, setUnreadCounts] = useState({
    unreadMessages: 0,
    pendingRequests: 0,
    newAcceptances: 0,
    newTrips: 0,
    newBookings: 0,
    adminPendingApps: 0,

    adminPendingFeedbacks: 0,
    adminNewBookings: 0,
    isAdmin: false,
    isBusiness: false,
  });
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const totalUnread = unreadCounts.unreadMessages + unreadCounts.pendingRequests + unreadCounts.newAcceptances + unreadCounts.newTrips + unreadCounts.newBookings +
    (unreadCounts.isAdmin ? (unreadCounts.adminPendingApps + unreadCounts.adminPendingFeedbacks + unreadCounts.adminNewBookings) : 0);

  const fetchCounts = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setUnreadCounts(data);
      }
    } catch (err) {
      console.error("Failed to fetch notifications");
    }
  };

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleClearAndRoute = async (type: string, path: string) => {
    try {
      if (type) {
        await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type }),
        });
        await fetchCounts();
      }
      setIsOpen(false);
      router.push(path);
    } catch (err) {
      console.error(err);
    }
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
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50">
          <div className="p-3 bg-slate-50 border-b border-slate-100 font-bold text-slate-800 flex justify-between items-center">
            Notifications
            {totalUnread === 0 && <span className="text-xs text-slate-500 font-normal">All caught up!</span>}
          </div>
          <div className="flex flex-col">
            {totalUnread === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">
                No new notifications
              </div>
            ) : (
              <>
                {unreadCounts.unreadMessages > 0 && (
                  <Link
                    href="/dashboard/user" // Or link to a specific chat, but user dashboard might list them
                    onClick={() => setIsOpen(false)}
                    className="p-3 hover:bg-orange-50 transition-colors flex items-center gap-3 border-b border-slate-100"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center">
                      <MessageCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {unreadCounts.unreadMessages} new message{unreadCounts.unreadMessages > 1 ? 's' : ''}
                      </p>
                      <p className="text-xs text-slate-500">Check your active trips</p>
                    </div>
                  </Link>
                )}

                {unreadCounts.pendingRequests > 0 && (
                  <button
                    onClick={() => handleClearAndRoute('pendingRequests', '/dashboard/organizer')}
                    className="p-3 hover:bg-orange-50 transition-colors flex items-center gap-3 border-b border-slate-100 text-left w-full"
                  >
                    <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {unreadCounts.pendingRequests} pending request{unreadCounts.pendingRequests > 1 ? 's' : ''}
                      </p>
                      <p className="text-xs text-slate-500">People want to join your trip</p>
                    </div>
                  </button>
                )}

                {unreadCounts.newAcceptances > 0 && (
                  <button
                    onClick={() => handleClearAndRoute('acceptances', '/dashboard/user')}
                    className="p-3 hover:bg-orange-50 transition-colors flex items-center gap-3 border-b border-slate-100 text-left w-full"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-500 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {unreadCounts.newAcceptances} trip{unreadCounts.newAcceptances > 1 ? 's' : ''} accepted
                      </p>
                      <p className="text-xs text-slate-500">You are in! View chat</p>
                    </div>
                  </button>
                )}

                {unreadCounts.newTrips > 0 && (
                  <button
                    onClick={() => handleClearAndRoute('newTrips', '/dashboard/business')}
                    className="p-3 hover:bg-orange-50 transition-colors flex items-center gap-3 border-b border-slate-100 text-left w-full"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-500 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {unreadCounts.newTrips} trip{unreadCounts.newTrips > 1 ? 's' : ''} approved
                      </p>
                      <p className="text-xs text-slate-500">Your trip is now live!</p>
                    </div>
                  </button>
                )}

                {unreadCounts.newBookings > 0 && (
                  <button
                    onClick={() => handleClearAndRoute('newBookings', '/dashboard/business')}
                    className="p-3 hover:bg-orange-50 transition-colors flex items-center gap-3 border-b border-slate-100 text-left w-full"
                  >
                    <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-500 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {unreadCounts.newBookings} new booking{unreadCounts.newBookings > 1 ? 's' : ''}
                      </p>
                      <p className="text-xs text-slate-500">People are interested in your trip!</p>
                    </div>
                  </button>
                )}

                {unreadCounts.isAdmin && unreadCounts.adminPendingApps > 0 && (
                  <button
                    onClick={() => handleClearAndRoute('adminPendingApps', '/admin/business-apps')}
                    className="p-3 hover:bg-orange-50 transition-colors flex items-center gap-3 border-b border-slate-100 text-left w-full"
                  >
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-500 flex items-center justify-center">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {unreadCounts.adminPendingApps} business app{unreadCounts.adminPendingApps > 1 ? 's' : ''} pending
                      </p>
                      <p className="text-xs text-slate-500">Review new business registrations</p>
                    </div>
                  </button>
                )}



                {unreadCounts.isAdmin && unreadCounts.adminPendingFeedbacks > 0 && (
                  <button
                    onClick={() => handleClearAndRoute('adminPendingFeedbacks', '/admin/reports')}
                    className="p-3 hover:bg-orange-50 transition-colors flex items-center gap-3 border-b border-slate-100 text-left w-full"
                  >
                    <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-500 flex items-center justify-center">
                      <MessageCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {unreadCounts.adminPendingFeedbacks} new feedback{unreadCounts.adminPendingFeedbacks > 1 ? 's' : ''}
                      </p>
                      <p className="text-xs text-slate-500">Review user feedback</p>
                    </div>
                  </button>
                )}

                {unreadCounts.isAdmin && unreadCounts.adminNewBookings > 0 && (
                  <button
                    onClick={() => handleClearAndRoute('adminNewBookings', '/admin/trips')}
                    className="p-3 hover:bg-orange-50 transition-colors flex items-center gap-3 border-b border-slate-100 text-left w-full"
                  >
                    <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-500 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {unreadCounts.adminNewBookings} new booking{unreadCounts.adminNewBookings > 1 ? 's' : ''}
                      </p>
                      <p className="text-xs text-slate-500">Users interested in trips</p>
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
