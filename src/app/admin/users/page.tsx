"use client";

import { ShieldCheck, ShieldAlert, Trash2, CheckCircle, Loader2, RefreshCw, Search, Users, Phone, Mail, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  age: number | null;
  is_verified: number;
  phone_number: string | null;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "regular" | "business" | "super_admin">("all");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data.users || []);
    } catch {
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleVerify = async (id: string) => {
    try {
      await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify" }),
      });
      fetchUsers();
    } catch {
      alert("Failed to verify user");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (!res.ok) {
         const data = await res.json();
         alert(data.error || "Failed to delete user");
         return;
      }
      fetchUsers();
    } catch {
      alert("Failed to delete user");
    }
  };

  // Filter users
  const filteredUsers = users.filter(u => {
    const matchesSearch = !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.phone_number?.includes(search);
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-orange-400 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading users…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-rose-500 font-medium">{error}</div>;
  }

  const roleColors: Record<string, string> = {
    super_admin: "from-purple-500 to-violet-600",
    business: "from-blue-500 to-indigo-600",
    regular: "from-slate-400 to-slate-500",
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage and monitor all registered users</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-xl shadow-md shadow-blue-500/20 text-sm font-bold flex items-center gap-2">
            <Users className="w-4 h-4" />
            {users.length} Users
          </div>
          <button
            onClick={fetchUsers}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-orange-500 border border-slate-200 hover:border-orange-300 px-3 py-1.5 rounded-lg transition-all duration-300"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-sm text-slate-900 font-medium transition-all duration-300"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "regular", "business", "super_admin"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setRoleFilter(filter)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                roleFilter === filter
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
              }`}
            >
              {filter === "all" ? "All" : filter === "super_admin" ? "Admin" : filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Users Grid */}
      {filteredUsers.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-lg font-semibold text-slate-700">No users found</p>
          <p className="text-sm text-slate-400 mt-1">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-4">User</th>
                  <th className="p-4">Contact</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Age</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, idx) => {
                  const status = user.is_verified ? "Verified" : "Pending";
                  const initial = user.name?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase();
                  const roleGradient = roleColors[user.role] || roleColors.regular;
                  return (
                    <tr
                      key={user.id}
                      className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors duration-200 group"
                      style={{ animationDelay: `${idx * 20}ms` }}
                    >
                      {/* User */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${roleGradient} text-white flex items-center justify-center text-sm font-bold flex-shrink-0 group-hover:scale-110 transition-transform duration-200`}>
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{user.name || "—"}</p>
                          </div>
                        </div>
                      </td>
                      {/* Contact */}
                      <td className="p-4">
                        <div className="space-y-1">
                          <p className="text-xs text-slate-600 flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {user.email}
                          </p>
                          <p className="text-xs text-slate-500 flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {user.phone_number || <span className="text-slate-300">—</span>}
                          </p>
                        </div>
                      </td>
                      {/* Role */}
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                          user.role === 'super_admin' ? 'bg-purple-100 text-purple-700' :
                          user.role === 'business' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {user.role === 'super_admin' ? '👑 Admin' : user.role === 'business' ? '🏢 Business' : '👤 Regular'}
                        </span>
                      </td>
                      {/* Age */}
                      <td className="p-4 text-sm text-slate-600 font-medium">{user.age || <span className="text-slate-300">—</span>}</td>
                      {/* Status */}
                      <td className="p-4">
                        <span className={`flex items-center gap-1.5 text-xs font-bold ${
                          status === 'Verified' ? 'text-emerald-600' : 'text-amber-500'
                        }`}>
                          {status === 'Verified' ? (
                            <ShieldCheck className="w-4 h-4" />
                          ) : (
                            <ShieldAlert className="w-4 h-4 animate-pulse" />
                          )}
                          {status}
                        </span>
                      </td>
                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {status === 'Pending' && (
                            <button
                              onClick={() => handleVerify(user.id)}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all duration-200 hover:scale-110"
                              title="Verify User"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-all duration-200 hover:scale-110"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
