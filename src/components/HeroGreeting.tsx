"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/components/SessionProvider";

export default function HeroGreeting() {
  const { user, isLoaded } = useSession();
  const [greeting, setGreeting] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;

    if (user) {
      const firstName = user.full_name?.split(" ")[0] || "Traveler";
      const isNewUser = user.created_at ? new Date(user.created_at).getTime() > Date.now() - 5 * 60 * 1000 : false;
      setGreeting(isNewUser ? `Hello, ${firstName}!` : `Welcome back, ${firstName}!`);
    } else {
      setGreeting("Find your next adventure");
    }

    setIsTyping(true);
  }, [isLoaded, user]);

  if (!greeting) {
    return (
      <span className="inline-block py-1.5 px-4 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/30 text-sm font-semibold mb-6 h-[34px]">
        {/* Placeholder to prevent layout shift */}
      </span>
    );
  }

  return (
    <span className="inline-block py-1.5 px-4 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/30 text-sm font-semibold mb-6 overflow-hidden relative">
      <span
        className={`inline-block whitespace-nowrap overflow-hidden border-r-2 border-white pr-1 ${
          isTyping ? "animate-typing" : ""
        }`}
        style={{
          width: isTyping ? "100%" : "auto",
        }}
      >
        {greeting}
      </span>
    </span>
  );
}
