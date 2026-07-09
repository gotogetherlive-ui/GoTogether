"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Calendar, ShieldCheck } from "lucide-react";
import Tilt from "react-parallax-tilt";

export interface TripSummary {
  id: string;
  slug?: string | null;
  title: string;
  description: string;
  destination: string;
  duration_days: number;
  duration_nights?: number;
  image_url?: string | null;
  images?: string | null;
  is_featured?: number;
  tags?: string | null;
  pickup_point?: string | null;
  drop_point?: string | null;
  b2b_price?: string | null;
  b2c_price?: string | null;
  gotogether_price?: string | null;
  start_date?: string | null;
  starting_location?: string | null;
  registration_closed?: number;
  organizer_id?: string;
  organizer_name?: string;
  organizer_slug?: string | null;
  organizer_role?: string;
  organizer_avatar?: string | null;
}

interface TripCardProps {
  trip: TripSummary;
  /** If true, the entire card links to /trips instead of the canonical trip detail URL. */
  linkToTrips?: boolean;
}

export default function TripCard({ trip, linkToTrips = false }: TripCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Parse images array
  let imageList: string[] = [];
  if (trip.images) {
    try {
      const parsed = JSON.parse(trip.images);
      if (Array.isArray(parsed)) imageList = parsed;
    } catch {
      // fallback
    }
  }
  if (imageList.length === 0 && trip.image_url) {
    imageList = [trip.image_url];
  }

  const handleMouseEnter = useCallback(() => {
    if (imageList.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % imageList.length);
    }, 3000);
  }, [imageList.length]);

  const handleMouseLeave = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setCurrentImageIndex(0);
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const isFeatured = trip.is_featured === 1;
  const isBusiness = trip.organizer_role === "business";
  const href = linkToTrips ? "/trips" : `/trips/${trip.slug || trip.id}`;

  // Format start_date for display
  const formattedDate = trip.start_date
    ? new Date(trip.start_date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <Tilt 
      tiltMaxAngleX={5} 
      tiltMaxAngleY={5} 
      scale={1.02} 
      transitionSpeed={2500} 
      className="h-full flex"
      glareEnable={true}
      glareMaxOpacity={0.1}
      glarePosition="bottom"
    >
      <div
        className="bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-orange-500/10 transition-all group border border-slate-100 flex flex-col w-full h-full"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
      <div className="relative h-64 overflow-hidden bg-slate-200">
        {imageList.length > 0 ? (
          <>
            {imageList.map((src, idx) => (
              <Image
                key={idx}
                src={src}
                alt={`${trip.title} group trip image in ${trip.destination}`}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className={`object-cover transition-opacity duration-700 ${
                  idx === currentImageIndex ? "opacity-100" : "opacity-0"
                } group-hover:scale-105 transition-transform duration-700`}
              />
            ))}
            {/* Image dots indicator */}
            {imageList.length > 1 && (
              <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                {imageList.map((_, idx) => (
                  <span
                    key={idx}
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                      idx === currentImageIndex
                        ? "bg-white w-4"
                        : "bg-white/50"
                    }`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center">
            <MapPin className="w-12 h-12 text-white/50" />
          </div>
        )}
        {isFeatured ? (
          <div className="absolute top-4 right-4">
            <span className="bg-rose-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
              Featured
            </span>
          </div>
        ) : isBusiness ? (
          <div className="absolute top-4 right-4">
            <span className="bg-white/90 text-slate-900 text-xs font-bold px-3 py-1 rounded-full shadow-md">
              Business
            </span>
          </div>
        ) : null}
        <div className="absolute bottom-4 left-4 flex gap-2 flex-wrap">
          <span className="bg-black/50 backdrop-blur-md text-white text-sm font-medium px-3 py-1.5 rounded-full flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {trip.destination}
          </span>
          <span className="bg-black/50 backdrop-blur-md text-white text-sm font-medium px-3 py-1.5 rounded-full flex items-center gap-1">
            <Calendar className="w-3 h-3 text-orange-400" /> {trip.duration_days}D
          </span>
          {formattedDate && (
            <span className="bg-black/50 backdrop-blur-md text-white text-sm font-medium px-3 py-1.5 rounded-full flex items-center gap-1">
              <Calendar className="w-3 h-3 text-emerald-400" /> {formattedDate}
            </span>
          )}
        </div>
      </div>
      <div className="p-6 flex-1 flex flex-col">
        <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-orange-500 transition-colors line-clamp-2">
          {trip.title}
        </h3>

        {/* Route and Price */}
        {(trip.pickup_point || trip.b2b_price) && (
          <div className="flex flex-col gap-1 mb-3">
            {trip.pickup_point && trip.drop_point && (
              <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 bg-slate-100 w-fit px-2 py-1 rounded-md">
                <span className="truncate max-w-[100px]">{trip.pickup_point}</span>
                <span className="text-orange-400">&rarr;</span>
                <span className="truncate max-w-[100px]">{trip.drop_point}</span>
              </div>
            )}
            {(trip.b2c_price || trip.gotogether_price || trip.b2b_price) && (
              <div className="flex items-center gap-3 text-xs font-bold text-slate-700 mt-1">
                {trip.b2c_price && <span className="text-slate-500 line-through">Retail: {trip.b2c_price}</span>}
                {(trip.gotogether_price || trip.b2b_price) && <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded text-sm">GoTogether: {trip.gotogether_price || trip.b2b_price}</span>}
              </div>
            )}
          </div>
        )}

        <p className="text-slate-500 mb-4 line-clamp-2 text-sm">
          {trip.description}
        </p>

        {/* Tags */}
        {trip.tags && trip.tags !== "[]" && (
          <div className="flex flex-wrap gap-2 mb-6">
            {(() => {
              try {
                const tags = JSON.parse(trip.tags);
                return tags.map((tag: string) => (
                  <span key={tag} className="bg-blue-50 text-blue-600 text-xs font-semibold px-2.5 py-1 rounded-md">
                    #{tag}
                  </span>
                ));
              } catch {
                return null;
              }
            })()}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
          <Link href={trip.organizer_slug ? `/organizers/${trip.organizer_slug}` : href} className="flex items-center gap-2 min-w-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shadow-inner ${trip.organizer_role === 'super_admin' ? 'bg-gradient-to-tr from-orange-400 to-rose-400' : 'bg-blue-100 text-blue-600 border border-blue-200'}`}>
              {trip.organizer_avatar ? (
                <Image src={trip.organizer_avatar} alt={`${trip.organizer_name || "Organizer"} profile image`} width={32} height={32} className="w-full h-full rounded-full object-cover" />
              ) : (
                trip.organizer_name?.charAt(0) || "O"
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-slate-900 flex items-center gap-1 hover:text-orange-600 transition-colors truncate">
                {trip.organizer_name} {isBusiness && <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />}
              </span>
              <span className="text-xs text-slate-500">
                {trip.organizer_role === "super_admin" ? "Verified Organizer" : "Verified Business"}
              </span>
            </div>
          </Link>
          <Link href={href} className="text-sm font-bold text-orange-500 hover:text-orange-600 transition-colors">
            View Trip &rarr;
          </Link>
        </div>
      </div>
      </div>
    </Tilt>
  );
}
