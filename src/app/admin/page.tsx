"use client";

import { useEffect, useState } from "react";
import { Users, MapPin, TrendingUp, Loader2, RefreshCw, Clock, MessageSquare, Sparkles, ArrowUpRight, Headset } from "lucide-react";
import Link from "next/link";

interface AdminStats {
  stats: {
    totalUsers: number;
    liveTrips: number;
    pendingTrips: number;
    activeReports: number;
    pendingFeedbacks: number;
    openSupportTickets: number;
  };
  recentUsers: {
    id: string;
    full_name: string;
    email: string;
    role: string;
    created_at: string;
  }[];
  recentTrips: {
    id: string;
    title: string;
    destination: string;
    status: string;
    created_at: string;
    organizer: string;
  }[];
  recentReports: {
    id: string;
    reason: string;
    status: string;
    created_at: string;
    reporter_name: string;
    reported_user_name: string;
  }[];
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

export default function AdminDashboard() {
  const [data, setData] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    setRefreshing(true);
    setError("");
    try {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error("Failed to load stats");
      const json = await res.json();
      setData(json);
      setLastRefresh(new Date());
    } catch {
      setError("Could not load dashboard data. Please refresh.");
    } finally {
      setLoading(false);
      setTimeout(() => setRefreshing(false), 600);
    }
  };

  useEffect(() => {
    fetchStats();
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="relative">
            <Loader2 className="w-10 h-10 text-orange-400 animate-spin mx-auto mb-3" />
            <div className="absolute inset-0 w-10 h-10 mx-auto rounded-full bg-orange-400/20 animate-ping" />
          </div>
          <p className="text-slate-500 text-sm">Loading live data…</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-rose-500 font-medium">{error}</p>
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  const { stats, recentUsers, recentTrips } = data!;

  const statCards = [
    {
      label: "Total Users",
      value: stats.totalUsers,
      sub: "Registered accounts",
      icon: Users,
      gradient: "from-blue-500 to-indigo-600",
      bg: "bg-blue-50",
      text: "text-blue-500",
      glow: "shadow-blue-500/20",
      link: "/admin/users",
    },
    {
      label: "Live Trips",
      value: stats.liveTrips,
      sub: "Currently active",
      icon: MapPin,
      gradient: "from-orange-500 to-rose-500",
      bg: "bg-orange-50",
      text: "text-orange-500",
      glow: "shadow-orange-500/20",
      link: "/admin/trips",
    },
    {
      label: "Pending Approval",
      value: stats.pendingTrips,
      sub: "Awaiting review",
      icon: Clock,
      gradient: "from-amber-500 to-yellow-500",
      bg: "bg-amber-50",
      text: "text-amber-500",
      glow: "shadow-amber-500/20",
      link: "/admin/trips",
    },
    {
      label: "Pending Feedback",
      value: stats.pendingFeedbacks,
      sub: stats.pendingFeedbacks > 0 ? "Needs review" : "All resolved",
      icon: MessageSquare,
      gradient: "from-violet-500 to-purple-600",
      bg: "bg-violet-50",
      text: "text-violet-500",
      glow: "shadow-violet-500/20",
      link: "/admin/reports",
    },
    {
      label: "Support Tickets",
      value: stats.openSupportTickets,
      sub: stats.openSupportTickets > 0 ? "Needs attention" : "All handled",
      icon: Headset,
      gradient: "from-rose-500 to-pink-600",
      bg: "bg-rose-50",
      text: "text-rose-500",
      glow: "shadow-rose-500/20",
      link: "/admin/support",
    },
  ];

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard Overview</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time insights into your platform</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Last updated {timeAgo(lastRefresh.toISOString())}
          </span>
          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-orange-500 border border-slate-200 hover:border-orange-300 px-3 py-1.5 rounded-lg transition-all duration-300 disabled:opacity-50 hover:shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 transition-transform duration-600 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.link}
              className={`group bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg hover:border-slate-200 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden`}
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              {/* Subtle gradient background on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500`} />
              
              <div className="relative">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-white shadow-md ${card.glow} group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-orange-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-0.5">{card.value}</h3>
                <p className="text-slate-500 text-xs font-medium">{card.label}</p>
                <p className={`text-[10px] font-semibold flex items-center gap-1 mt-1.5 ${
                  card.label.includes("Feedback") && stats.pendingFeedbacks > 0
                    ? "text-violet-500"
                    : "text-slate-400"
                }`}>
                  {(card.label === "Total Users" || card.label === "Live Trips") && (
                    <TrendingUp className="w-3 h-3" />
                  )}
                  {card.sub}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Users */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
              Recent Users
            </h3>
            <Link href="/admin/users" className="text-xs text-orange-500 hover:text-orange-600 font-semibold flex items-center gap-1 transition-colors">
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          {recentUsers.length === 0 ? (
            <div className="text-center py-8">
              <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No users yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentUsers.map((u, i) => (
                <div key={u.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-blue-50/50 transition-colors duration-200 group" style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                    {u.full_name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{u.full_name || "—"}</p>
                    <p className="text-xs text-slate-400 truncate">{u.email}</p>
                  </div>
                  <span className="ml-auto text-xs text-slate-400 flex-shrink-0">{timeAgo(u.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Trips */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-white" />
              </div>
              Recent Trips
            </h3>
            <Link href="/admin/trips" className="text-xs text-orange-500 hover:text-orange-600 font-semibold flex items-center gap-1 transition-colors">
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          {recentTrips.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No trips posted yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTrips.map((t, i) => (
                <div key={t.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl hover:bg-orange-50/50 transition-colors duration-200 group" style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                    {t.destination?.charAt(0)?.toUpperCase() || "T"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 truncate">{t.title}</p>
                    <p className="text-xs text-slate-400 truncate">To {t.destination} • by {t.organizer || "Unknown"}</p>
                  </div>
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${
                    t.status === "live"
                      ? "bg-emerald-100 text-emerald-600"
                      : t.status === "pending"
                      ? "bg-amber-100 text-amber-600"
                      : "bg-red-100 text-red-500"
                  }`}>
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
