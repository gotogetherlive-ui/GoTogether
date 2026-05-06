"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
    const interval = setInterval(advanceSlide, 6000); // slightly longer for the zoom to feel right
    return () => clearInterval(interval);
  }, [advanceSlide]);

  return (
    <>
      <AnimatePresence mode="popLayout">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1 }}
          animate={{ opacity: 1, scale: 1.05 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{
            opacity: { duration: 1.5, ease: "easeInOut" },
            scale: { duration: 10, ease: "linear" }, // Slow 3D Ken Burns effect
          }}
          className="absolute inset-0 z-0 origin-center"
        >
          <Image
            src={heroImages[currentIndex].src}
            alt={heroImages[currentIndex].label}
            fill
            className="object-cover object-center brightness-[0.55]"
            priority={currentIndex === 0}
            sizes="100vw"
          />
        </motion.div>
      </AnimatePresence>

      {/* Subtle overlay gradient for depth */}
      <div className="absolute inset-0 z-[2] bg-gradient-to-b from-black/30 via-transparent to-black/40 pointer-events-none" />

      {/* Destination indicator dots + label */}
      <div className="absolute bottom-4 md:bottom-10 left-1/2 -translate-x-1/2 z-[25] flex items-center gap-3">
        {heroImages.map((img, i) => (
          <button
            key={img.src}
            onClick={() => setCurrentIndex(i)}
            className={`group relative transition-all duration-300 ${
              i === currentIndex
                ? "w-8 h-2 rounded-full bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.6)]"
                : "w-2 h-2 rounded-full bg-white/50 hover:bg-white/80"
            }`}
            aria-label={`Go to ${img.label}`}
          >
            {/* Tooltip on hover */}
            <span className="absolute bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold text-white bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              {img.label}
            </span>
          </button>
        ))}
      </div>

      {/* Current destination label */}
      <div className="absolute bottom-10 md:bottom-16 left-1/2 -translate-x-1/2 z-[25] hidden md:block">
        <motion.span
          key={currentIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.8 }}
          className="text-white/80 text-xs font-semibold tracking-widest uppercase drop-shadow-md"
        >
          {heroImages[currentIndex].label}
        </motion.span>
      </div>
    </>
  );
}
