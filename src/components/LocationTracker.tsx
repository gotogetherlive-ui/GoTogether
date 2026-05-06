"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { GoogleMap, useJsApiLoader, MarkerF } from "@react-google-maps/api";
import { MapPin, Loader2, Navigation, CheckCircle, RefreshCw } from "lucide-react";

const mapContainerStyle = {
  width: "100%",
  height: "320px",
  borderRadius: "16px",
};

const defaultCenter = { lat: 20.5937, lng: 78.9629 };

interface Props {
  /** If provided, called with the resolved address string after detection */
  onAddressResolved?: (address: string, lat: number, lng: number) => void;
  compact?: boolean;
}

// Reverse geocoding via BigDataCloud (free, client-side, no API key required)
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    );
    if (!res.ok) throw new Error("BigDataCloud error");
    const data = await res.json();
    
    const parts = [
      data.city || data.locality,
      data.principalSubdivision,
      data.countryName
    ].filter(Boolean);
    
    if (parts.length > 0) {
      return parts.join(", ");
    }
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch (err) {
    console.warn("Fallback reverse geocoding failed", err);
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

export default function LocationTracker({ onAddressResolved, compact }: Props) {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>("");
  const [mapRef, setMapRef] = useState<google.maps.Map | null>(null);
  const autoDetectedRef = useRef(false);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  const saveLocation = useCallback(async (lat: number, lng: number, addr: string) => {
    try {
      setSaving(true);
      const res = await fetch("/api/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: lat, longitude: lng, address: addr }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      // silent fail
    } finally {
      setSaving(false);
    }
  }, []);

  const detectLocation = useCallback(
    async (silent = false) => {
      if (!navigator.geolocation) {
        if (!silent) setError("Geolocation is not supported by your browser.");
        return;
      }
      setLoading(true);
      setError("");
      setSaved(false);

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setPosition(coords);
          setLoading(false);

          if (mapRef) {
            mapRef.panTo(coords);
            mapRef.setZoom(15);
          }

          // Use Google Geocoder (with Nominatim fallback)
          const resolved = await reverseGeocode(coords.lat, coords.lng);
          setAddress(resolved);
          onAddressResolved?.(resolved, coords.lat, coords.lng);

          await saveLocation(coords.lat, coords.lng, resolved);
        },
        (err) => {
          setLoading(false);
          if (!silent) {
            switch (err.code) {
              case err.PERMISSION_DENIED:
                setError("Location permission denied. Please allow access in your browser settings.");
                break;
              case err.POSITION_UNAVAILABLE:
                setError("Location unavailable.");
                break;
              case err.TIMEOUT:
                setError("Location request timed out.");
                break;
              default:
                setError("Could not get location.");
            }
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    },
    [mapRef, saveLocation, onAddressResolved]
  );

  // Auto-detect on mount
  useEffect(() => {
    if (!isLoaded || autoDetectedRef.current) return;
    autoDetectedRef.current = true;

    fetch("/api/location")
      .then((r) => r.json())
      .then(async (data) => {
        if (data.latitude && data.longitude) {
          setPosition({ lat: data.latitude, lng: data.longitude });
          const resolved = await reverseGeocode(data.latitude, data.longitude);
          setAddress(resolved);
          onAddressResolved?.(resolved, data.latitude, data.longitude);
        }
      })
      .catch(() => {})
      .finally(() => detectLocation(true));
  }, [isLoaded, detectLocation, onAddressResolved]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    setMapRef(map);
  }, []);

  if (loadError) {
    return (
      <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 text-center">
        <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 text-sm">Map unavailable — check API key.</p>
        {address && <p className="mt-2 text-sm font-medium text-slate-700">{address}</p>}
      </div>
    );
  }

  const mapHeight = compact ? "200px" : "320px";

  return (
    <div className="space-y-3">
      {/* Map */}
      {!isLoaded ? (
        <div
          style={{ height: mapHeight }}
          className="rounded-2xl bg-slate-100 flex items-center justify-center"
        >
          <div className="text-center">
            <Loader2 className="w-7 h-7 text-slate-400 animate-spin mx-auto mb-2" />
            <p className="text-slate-400 text-xs">Detecting location…</p>
          </div>
        </div>
      ) : (
        <GoogleMap
          mapContainerStyle={{ ...mapContainerStyle, height: mapHeight }}
          center={position || defaultCenter}
          zoom={position ? 15 : 4}
          onLoad={onMapLoad}
          options={{
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
            styles: [
              { featureType: "poi", stylers: [{ visibility: "simplified" }] },
              { featureType: "water", stylers: [{ color: "#e0f2fe" }] },
            ],
          }}
        >
          {position && (
            <MarkerF
              position={position}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: "#f97316",
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 3,
              }}
            />
          )}
        </GoogleMap>
      )}

      {/* Address + status */}
      <div className="flex items-start gap-3 p-3.5 bg-emerald-50 rounded-xl border border-emerald-100">
        <MapPin className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          {loading ? (
            <p className="text-sm text-slate-500 flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Detecting…
            </p>
          ) : address ? (
            <>
              <p className="text-sm font-medium text-slate-900 line-clamp-2">{address}</p>
              {position && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-400">Location not detected yet</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {saved && <CheckCircle className="w-4 h-4 text-emerald-500" />}
          <button
            onClick={() => detectLocation(false)}
            disabled={loading || saving}
            title="Refresh location"
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-orange-500 px-2 py-1 rounded-lg border border-slate-200 hover:border-orange-300 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            {loading ? "…" : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs flex items-center gap-2">
          {error}
          <button onClick={() => detectLocation(false)} className="ml-auto underline font-medium">
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
