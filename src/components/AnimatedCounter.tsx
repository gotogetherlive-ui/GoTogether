"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  className?: string;
}

export default function AnimatedCounter({
  value,
  suffix = "",
  className = "",
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "-50px" }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isInView) return;

    let startTimestamp: number | null = null;
    const duration = 2000; // 2 seconds

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // easeOutExpo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCurrent(easeProgress * value);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCurrent(value);
      }
    };

    window.requestAnimationFrame(step);
  }, [isInView, value]);

  return <span ref={ref} className={className}>{Intl.NumberFormat("en-US").format(Math.floor(current))}{suffix}</span>;
}
