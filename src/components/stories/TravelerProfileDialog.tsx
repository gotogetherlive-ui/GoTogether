"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Image from "next/image";
import { Briefcase, Calendar, User, Utensils, X } from "lucide-react";
import { formatCreditPoints } from "@/lib/travelerRank";

export type TravelerProfileData = {
  username: string;
  full_name: string;
  age: number | null;
  gender: string | null;
  bio: string | null;
  profession: string | null;
  fooding_habit: string | null;
  avatar_url: string | null;
  created_at: string;
  credit_points: number | string;
  total_likes: number | string;
  traveler_rank: number | string | null;
};

type Props = {
  profile: TravelerProfileData;
  roleBadge: ReactNode;
  onClose: () => void;
};

const EMPTY_VALUE = "—";

export default function TravelerProfileDialog({ profile, roleBadge, onClose }: Props) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const memberSince = profile.created_at
    ? new Date(profile.created_at.includes("T") ? profile.created_at : `${profile.created_at.replace(" ", "T")}Z`).toLocaleDateString("en-IN", { year: "numeric", month: "short" })
    : EMPTY_VALUE;

  const details = [
    { label: "Basic info", value: `${profile.age ? `${profile.age}y` : EMPTY_VALUE} · ${profile.gender || EMPTY_VALUE}`, Icon: User, color: "bg-orange-100 text-orange-500" },
    { label: "Profession", value: profile.profession || EMPTY_VALUE, Icon: Briefcase, color: "bg-blue-100 text-blue-500" },
    { label: "Food habit", value: profile.fooding_habit || EMPTY_VALUE, Icon: Utensils, color: "bg-emerald-100 text-emerald-500" },
    { label: "Member since", value: memberSince, Icon: Calendar, color: "bg-purple-100 text-purple-500" },
  ];

  return (
    <div className="gt-viewport-modal fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="gt-viewport-dialog relative w-full max-w-sm overflow-y-auto rounded-xl border border-slate-100 bg-white shadow-2xl animate-in scale-in duration-200">
        <button onClick={onClose} className="absolute right-4 top-4 z-20 rounded-full bg-black/40 p-2 text-white transition hover:bg-black/60" aria-label="Close profile"><X className="h-4 w-4" /></button>
        <div className="h-24 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        <div className="relative z-10 -mt-12 flex flex-col items-center px-6 pb-6">
          <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-indigo-50 text-3xl font-semibold text-slate-700 shadow-md">
            {profile.avatar_url && !avatarFailed ? <Image src={profile.avatar_url} alt={profile.full_name} fill sizes="96px" className="object-cover" onError={() => setAvatarFailed(true)} /> : profile.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="mt-3 flex items-center gap-1.5"><h3 className="text-xl font-bold text-slate-800">{profile.full_name}</h3>{roleBadge}</div>
          <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-500">@{profile.username}</span>
          <p className="mt-4 max-w-xs text-center text-xs font-semibold italic leading-relaxed text-slate-500">{profile.bio ? `“${profile.bio}”` : "No biography shared yet."}</p>

          <div className="my-5 h-px w-full bg-slate-100" />
          <div className="mb-4 grid w-full grid-cols-3 gap-2 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 p-3 ring-1 ring-indigo-100">
            {[
              [profile.traveler_rank ? `#${profile.traveler_rank}` : EMPTY_VALUE, "Rank"],
              [profile.total_likes, "Likes"],
              [formatCreditPoints(profile.credit_points), "Points"],
            ].map(([value, label]) => <div key={label} className="text-center"><p className="text-base font-semibold text-slate-900">{value}</p><p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</p></div>)}
          </div>

          <div className="grid w-full grid-cols-2 gap-3 text-left">
            {details.map(({ label, value, Icon, color }) => (
              <div key={label} className="flex items-center gap-2.5 rounded-2xl bg-slate-50 p-3">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${color}`}><Icon className="h-4 w-4" /></span>
                <span className="min-w-0"><span className="block text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</span><span className="block truncate text-xs font-bold text-slate-700">{value}</span></span>
              </div>
            ))}
          </div>
          <button onClick={onClose} className="mt-6 w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-slate-800">Close Profile</button>
        </div>
      </div>
    </div>
  );
}
