"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import AnimatedButton from "./AnimatedButton";

interface NavUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url: string | null;
  google_id: string | null;
  is_verified: number;
  age?: number | null;
  gender?: string | null;
  profession?: string | null;
  fooding_habit?: string | null;
  phone_number?: string | null;
}

export default function HeroFindBuddyButton() {
  const router = useRouter();
  const [user, setUser] = useState<NavUser | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        setUser(data.user || null);
      })
      .catch(() => {});
  }, []);

  const isProfileComplete = !!(user?.full_name?.trim() && user?.phone_number?.trim() && user?.age && user?.gender && user?.profession && user?.fooding_habit);

  const handleRestrictedClick = (e: React.MouseEvent) => {
    if (user && !isProfileComplete) {
      e.preventDefault();
      alert("Please complete your profile in the Dashboard before accessing this feature.");
      router.push("/dashboard");
    } else if (!user) {
      // If no user, it will just navigate to /buddy and redirect to /login there, 
      // or we can explicitly redirect to /login here
      // But default Link behavior is fine
    }
  };

  return (
    <div className="relative group w-full sm:w-auto inline-block rounded-full p-[2px] overflow-hidden shadow-lg hover:shadow-amber-500/30 transition-all">
      <div className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,#fbbf24_50%,transparent_100%)] opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
      <AnimatedButton
        href="/buddy"
        onClick={handleRestrictedClick}
        className={`relative flex items-center justify-center bg-slate-900/60 backdrop-blur-md border border-white/10 hover:bg-slate-800/80 text-white font-bold text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 rounded-full w-full h-full ${
          (user && !isProfileComplete) ? "opacity-70" : ""
        }`}
        title={(user && !isProfileComplete) ? "Complete profile to unlock" : ""}
      >
        Find Buddy
      </AnimatedButton>
    </div>
  );
}
