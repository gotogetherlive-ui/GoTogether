"use client";

import { useRouter } from "next/navigation";
import AnimatedButton from "./AnimatedButton";
import { useSession } from "@/components/SessionProvider";
import { hasCompleteProfile } from "@/lib/profile";

export default function HeroFindBuddyButton() {
  const router = useRouter();
  const { user, isLoaded } = useSession();
  const isProfileComplete = hasCompleteProfile(user);

  const handleRestrictedClick = (e: React.MouseEvent) => {
    if (!isLoaded) {
      e.preventDefault();
      return;
    }

    if (!user) {
      e.preventDefault();
      router.push("/login");
      return;
    }

    if (!isProfileComplete) {
      e.preventDefault();
      alert("Please complete your profile in the Dashboard before accessing this feature.");
      router.push("/dashboard");
    }
  };

  return (
    <div className="relative group w-full sm:w-auto inline-block rounded-full p-[2px] overflow-hidden shadow-lg hover:shadow-amber-500/30 transition-all">
      <div className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,#fbbf24_50%,transparent_100%)] opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
      <AnimatedButton
        href="/buddy"
        onClick={handleRestrictedClick}
        className={`relative flex items-center justify-center bg-slate-900/60 backdrop-blur-md border border-white/10 hover:bg-slate-800/80 text-white font-bold text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 rounded-full w-full h-full ${
          !isLoaded || !user || !isProfileComplete ? "opacity-70" : ""
        }`}
        title={!isLoaded ? "Checking account" : !user ? "Sign in to unlock" : !isProfileComplete ? "Complete profile to unlock" : ""}
      >
        Find Buddy
      </AnimatedButton>
    </div>
  );
}
