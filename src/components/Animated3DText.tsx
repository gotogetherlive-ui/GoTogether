"use client";

import { ReactNode, useEffect, useState } from "react";

interface Animated3DTextProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export default function Animated3DText({ children, className = "", delay = 0 }: Animated3DTextProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Small timeout to ensure the browser has rendered the initial state before adding the transition class
    const t = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`hero-animated-text inline-block transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${className}`}
      style={{
        transformStyle: "preserve-3d",
        perspective: "1000px",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "rotateX(0) translateZ(0)" : "rotateX(90deg) translateZ(-100px)",
        transitionDelay: `${delay}s`,
        willChange: "transform, opacity",
        verticalAlign: "bottom",
      }}
    >
      {children}
    </div>
  );
}
