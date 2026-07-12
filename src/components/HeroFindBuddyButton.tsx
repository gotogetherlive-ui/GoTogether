"use client";

import AnimatedButton from "./AnimatedButton";

export default function HeroFindBuddyButton() {
  return (
    <div className="relative group w-full sm:w-auto inline-block rounded-full p-[2px] overflow-hidden shadow-lg hover:shadow-amber-500/30 transition-all">
      <div className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,#fbbf24_50%,transparent_100%)] opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
      <AnimatedButton
        href="/buddy"
        className="relative flex items-center justify-center bg-slate-900/60 backdrop-blur-md border border-white/10 hover:bg-slate-800/80 text-white font-bold text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 rounded-full w-full h-full"
      >
        Find Buddy
      </AnimatedButton>
    </div>
  );
}
