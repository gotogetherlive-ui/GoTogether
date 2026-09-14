"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface DestinationPreviewCardProps {
  name: string;
  place: string;
  image: string;
  note: string;
  videos: Array<{ src: string; label: "Aerial" | "Ground" }>;
}

const PREVIEW_DELAY_MS = 2000;
const VIEW_CHANGE_MS = 7000;

export default function DestinationPreviewCard({ name, place, image, note, videos }: DestinationPreviewCardProps) {
  const timerRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const suppressClickRef = useRef(false);
  const [waiting, setWaiting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(0);

  const clearTimer = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const beginPreviewCountdown = (allowTouch = false) => {
    if (!allowTouch && window.matchMedia("(hover: none), (pointer: coarse)").matches) return;
    clearTimer();
    setWaiting(true);
    timerRef.current = window.setTimeout(() => {
      setWaiting(false);
      setPreviewing(true);
      if (allowTouch) suppressClickRef.current = true;
    }, PREVIEW_DELAY_MS);
  };

  const stopPreview = () => {
    clearTimer();
    setWaiting(false);
    setPreviewing(false);
    setVideoReady(false);
    setCurrentVideo(0);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    if (!previewing || videos.length < 2) return;
    const interval = window.setInterval(() => {
      setVideoReady(false);
      setCurrentVideo((current) => (current + 1) % videos.length);
    }, VIEW_CHANGE_MS);
    return () => window.clearInterval(interval);
  }, [previewing, videos.length]);

  return (
    <article className="group w-[78%] shrink-0 snap-start sm:w-auto">
      <Link
        href={`/trips?q=${encodeURIComponent(place)}`}
        className="block"
        onPointerEnter={(event) => { if (event.pointerType === "mouse") beginPreviewCountdown(); }}
        onPointerLeave={stopPreview}
        onPointerDown={(event) => { if (event.pointerType === "touch") beginPreviewCountdown(true); }}
        onPointerUp={(event) => { if (event.pointerType === "touch") stopPreview(); }}
        onPointerCancel={(event) => { if (event.pointerType === "touch") stopPreview(); }}
        onClick={(event) => {
          if (suppressClickRef.current) {
            event.preventDefault();
            suppressClickRef.current = false;
          }
        }}
        onContextMenu={(event) => { if (waiting || previewing) event.preventDefault(); }}
        onFocus={() => beginPreviewCountdown()}
        onBlur={stopPreview}
      >
        <div className={`gt-destination-media relative aspect-[4/5] overflow-hidden rounded-lg bg-slate-200 ${waiting ? "is-waiting" : ""} ${previewing && videoReady ? "is-playing" : ""}`}>
          <Image
            src={`/hero_india_${image}.png`}
            alt={`${place} landscape`}
            fill
            sizes="(max-width: 640px) 78vw, 33vw"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.025]"
          />
          {(waiting || previewing) && (
            <video
              key={videos[currentVideo].src}
              ref={videoRef}
              src={videos[currentVideo].src}
              muted
              loop
              playsInline
              autoPlay
              preload="auto"
              aria-hidden="true"
              onCanPlay={(event) => {
                setVideoReady(true);
                void event.currentTarget.play().catch(() => undefined);
              }}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${previewing && videoReady ? "opacity-100" : "opacity-0"}`}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <div className="absolute bottom-7 left-6 text-white">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/80">{place}</p>
            <h3 className="mt-2 font-serif text-3xl">{name}</h3>
          </div>
          <span className="gt-preview-hint" aria-hidden="true">
            <Play className="h-3 w-3 fill-current" />
            {previewing && videoReady ? `${videos[currentVideo].label} view` : "Hold to preview"}
          </span>
        </div>
        <p className="mt-4 flex items-center justify-between text-sm text-slate-600">
          {note}<ArrowUpRight className="h-4 w-4" />
        </p>
      </Link>
    </article>
  );
}
