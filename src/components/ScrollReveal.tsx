"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

type RevealVariant = "up" | "left" | "right" | "image";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  stagger?: boolean;
  variant?: RevealVariant;
}

type RevealStyle = CSSProperties & { "--gt-reveal-delay": string };

export default function ScrollReveal({
  children,
  className = "",
  delay = 0,
  stagger = false,
  variant = "up",
}: ScrollRevealProps) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { rootMargin: "0px 0px -8%", threshold: 0.12 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const style: RevealStyle = { "--gt-reveal-delay": `${delay}ms` };

  return (
    <div
      ref={elementRef}
      className={`${className} ${stagger ? "gt-reveal-stagger" : `gt-scroll-reveal gt-reveal-${variant}`} ${visible ? "is-visible" : ""}`}
      style={style}
    >
      {children}
    </div>
  );
}
