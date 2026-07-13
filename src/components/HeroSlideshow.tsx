"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";

const heroImages = [
  {
    src: "/hero_travel_bg_1776411607714.png",
    label: "Explore the World",
  },
  {
    src: "/hero_india_tajmahal.png",
    label: "Taj Mahal, Agra",
  },
  {
    src: "/hero_india_varanasi.png",
    label: "Varanasi Ghats",
  },
  {
    src: "/hero_india_kerala.png",
    label: "Kerala Backwaters",
  },
  {
    src: "/hero_india_jaipur.png",
    label: "Jaipur, Rajasthan",
  },
  {
    src: "/hero_india_ladakh.png",
    label: "Ladakh, Himalayas",
  },
  {
    src: "/hero_india_goa.png",
    label: "Goa Beaches",
  },
  {
    src: "/hero_india_munnar.png",
    label: "Munnar, Kerala",
  },
];

export default function HeroSlideshow() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const advanceSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % heroImages.length);
  }, []);

  useEffect(() => {
    const interval = setInterval(advanceSlide, 6000);
    return () => clearInterval(interval);
  }, [advanceSlide]);

  return (
    <>
      {heroImages.map((img, index) => {
        const isActive = index === currentIndex;

        return (
          <div
            key={img.src}
            className={`absolute inset-0 z-0 origin-center transition-opacity duration-[1500ms] ease-in-out ${
              isActive ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <div
              className={`relative w-full h-full ${
                isActive ? "animate-[kenBurns_10s_linear_forwards]" : ""
              }`}
            >
              <Image
                src={img.src}
                alt={img.label}
                fill
                className="object-cover object-center brightness-[0.55]"
                priority={index === 0}
                loading={index === 0 ? "eager" : "lazy"}
                sizes="100vw"
              />
            </div>
          </div>
        );
      })}

      {/* Subtle overlay gradient for depth */}
      <div className="absolute inset-0 z-[2] bg-gradient-to-b from-black/30 via-transparent to-black/40 pointer-events-none" />

      {/* Destination indicator dots + label */}
      <div className="absolute bottom-4 md:bottom-10 left-1/2 -translate-x-1/2 z-[25] flex items-center gap-0 md:gap-1">
        {heroImages.map((img, i) => (
          <button
            key={img.src}
            type="button"
            onClick={() => setCurrentIndex(i)}
            className="group relative flex h-11 w-11 items-center justify-center rounded-full"
            aria-label={`Go to ${img.label}`}
            aria-current={i === currentIndex ? "true" : undefined}
          >
            <span
              aria-hidden="true"
              className={`block h-2 rounded-full transition-all duration-300 ${
                i === currentIndex
                  ? "w-8 bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.6)]"
                  : "w-2 bg-white/60 group-hover:bg-white/90"
              }`}
            />
            {/* Tooltip on hover */}
            <span className="absolute bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold text-white bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              {img.label}
            </span>
          </button>
        ))}
      </div>

      {/* Current destination label */}
      <div className="absolute bottom-10 md:bottom-16 left-1/2 -translate-x-1/2 z-[25] hidden md:block">
        <span
          key={currentIndex}
          className="text-white/80 text-xs font-semibold tracking-widest uppercase drop-shadow-md animate-[slideUp_0.8s_ease-out_forwards]"
        >
          {heroImages[currentIndex].label}
        </span>
      </div>
    </>
  );
}
