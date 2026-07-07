"use client";

import { useEffect, useState } from "react";

export default function HeroGreeting() {
  const [greeting, setGreeting] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          const { full_name, created_at } = data.user;
          const firstName = full_name?.split(" ")[0] || "Traveler";
          const isNewUser = new Date(created_at).getTime() > Date.now() - 5 * 60 * 1000;
          
          if (isNewUser) {
            setGreeting(`Hello, ${firstName}! 👋`);
          } else {
            setGreeting(`Welcome back, ${firstName}! ✨`);
          }
          setIsTyping(true);
        } else {
          setGreeting("✨ Find your next adventure");
          setIsTyping(true);
        }
      })
      .catch(() => {
        setGreeting("✨ Find your next adventure");
        setIsTyping(true);
      });
  }, []);

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
