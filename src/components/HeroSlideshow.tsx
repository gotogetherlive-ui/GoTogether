"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { heroImages } from "@/lib/hero-images";

export default function HeroSlideshow() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [visible, setVisible] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const next = (current + 1) % heroImages.length;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(media.matches);
    const updateVisibility = () => setVisible(!document.hidden);
    updateMotion();
    updateVisibility();
    media.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      media.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  useEffect(() => {
    if (paused || reducedMotion || !visible || hovered || focused) return;
    const timer = window.setTimeout(() => setCurrent(next), 6000);
    return () => window.clearTimeout(timer);
  }, [paused, reducedMotion, visible, hovered, focused, next]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-slate-950" role="region" aria-roledescription="carousel" aria-label="Featured travel destinations">
      {heroImages.map((slide, index) => (
        <div key={slide.src} aria-hidden={index !== current} className={`absolute inset-0 transition-opacity duration-1000 motion-reduce:transition-none ${index === current ? "opacity-100" : "opacity-0"}`}>
          {(index === current || index === next || index === (current + heroImages.length - 1) % heroImages.length) && <Image src={slide.src} alt={slide.label} fill priority={index === 0} loading={index === 0 ? undefined : "eager"} sizes="100vw" className="object-cover object-center" />}
        </div>
      ))}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/55 to-slate-950/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-slate-950/10" />
      <div className="gt-slideshow-controls" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
        <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-white/70">Find your next view</p><p className="mt-1 text-sm font-semibold text-white" aria-live="off">{heroImages[current].label}</p></div>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" className="gt-slide-control" aria-label="Previous destination" onClick={() => setCurrent((current + heroImages.length - 1) % heroImages.length)}><ChevronLeft className="h-5 w-5" /></button>
          <span className="w-9 text-center text-xs tabular-nums text-white/80">{current + 1} / {heroImages.length}</span>
          <button type="button" className="gt-slide-control" aria-label="Next destination" onClick={() => setCurrent(next)}><ChevronRight className="h-5 w-5" /></button>
          {!reducedMotion && <button type="button" className="gt-slide-control ml-1" aria-label={paused ? "Play slideshow" : "Pause slideshow"} onClick={() => setPaused(!paused)}>{paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}</button>}
        </div>
      </div>
    </div>
  );
}
