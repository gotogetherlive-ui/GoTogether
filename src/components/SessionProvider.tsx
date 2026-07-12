"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { apiJson } from "@/lib/apiClient";

export interface SessionUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url: string | null;
  google_id: string | null;
  is_verified: number;
  is_admin?: boolean;
  age?: number | null;
  gender?: string | null;
  profession?: string | null;
  fooding_habit?: string | null;
  phone_number?: string | null;
  phone_verified?: number;
  created_at?: string;
  last_login_at?: string | null;
  terms_accepted_at?: string | null;
}

export type SessionEventType = "SIGNED_IN" | "SIGNED_OUT" | "SESSION_UPDATED" | "PROFILE_UPDATED";
export type SessionStatus = "loading" | "authenticated" | "unauthenticated" | "refresh-error";
export type SessionProfileUpdate = Partial<Pick<SessionUser,
  "full_name" | "avatar_url" | "age" | "gender" | "profession" | "fooding_habit" | "phone_number"
>>;

const SESSION_CHANNEL = "gotogether-session";
const SESSION_STORAGE_KEY = "gt_session_event";

interface SessionContextValue {
  user: SessionUser | null;
  isLoaded: boolean;
  status: SessionStatus;
  refreshSession: () => Promise<SessionUser | null | undefined>;
  updateSessionUser: (updatedUser: SessionProfileUpdate) => void;
  broadcastSessionChange: (type: SessionEventType) => void;
  setSessionSignedOut: () => void;
}

const SessionContext = createContext<SessionContextValue>({
  user: null,
  isLoaded: false,
  status: "loading",
  refreshSession: async () => undefined,
  updateSessionUser: () => {},
  broadcastSessionChange: () => {},
  setSessionSignedOut: () => {},
});

export function useSession() {
  return useContext(SessionContext);
}

/**
 * Receives server-fetched user data and avoids duplicate `/api/auth/me` calls on page load.
 * A timeout-bound background refresh on focus keeps long-lived tabs current.
 */
export default function SessionProvider({
  serverUser,
  children,
}: {
  serverUser: SessionUser | null;
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<SessionUser | null>(serverUser);
  const [isLoaded, setIsLoaded] = useState(true);
  const [status, setStatus] = useState<SessionStatus>(serverUser ? "authenticated" : "unauthenticated");
  const mountedRef = useRef(true);
  const requestGenerationRef = useRef(0);
  const refreshControllerRef = useRef<AbortController | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const sourceIdRef = useRef<string | null>(null);

  const refreshSession = useCallback(async () => {
    const generation = ++requestGenerationRef.current;
    refreshControllerRef.current?.abort();
    const controller = new AbortController();
    refreshControllerRef.current = controller;

    try {
      const data = await apiJson<{ user?: SessionUser | null }>(
        "/api/auth/me",
        { cache: "no-store", signal: controller.signal },
        { timeoutMs: 8000 },
      );
      if (!mountedRef.current || generation !== requestGenerationRef.current) return undefined;
      const nextUser = data.user || null;
      setUser(nextUser);
      setStatus(nextUser ? "authenticated" : "unauthenticated");
      return nextUser;
    } catch {
      if (!mountedRef.current || generation !== requestGenerationRef.current || controller.signal.aborted) return undefined;
      setStatus("refresh-error");
      return undefined;
    } finally {
      if (mountedRef.current && generation === requestGenerationRef.current) {
        setIsLoaded(true);
        refreshControllerRef.current = null;
      }
    }
  }, []);

  const broadcastSessionChange = useCallback((type: SessionEventType) => {
    const event = { type, timestamp: Date.now(), sourceId: sourceIdRef.current };
    channelRef.current?.postMessage(event);
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(event));
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Storage can be unavailable. BroadcastChannel and focus reconciliation remain available.
    }
  }, []);

  const updateSessionUser = useCallback((updatedUser: SessionProfileUpdate) => {
    setUser((current) => current ? { ...current, ...updatedUser } : current);
    setStatus((current) => current === "unauthenticated" ? current : "authenticated");
    broadcastSessionChange("PROFILE_UPDATED");
  }, [broadcastSessionChange]);

  const setSessionSignedOut = useCallback(() => {
    ++requestGenerationRef.current;
    refreshControllerRef.current?.abort();
    refreshControllerRef.current = null;
    setUser(null);
    setIsLoaded(true);
    setStatus("unauthenticated");
    broadcastSessionChange("SIGNED_OUT");
  }, [broadcastSessionChange]);

  const serverUserId = serverUser?.id;

  useEffect(() => {
    mountedRef.current = true;
    sourceIdRef.current = crypto.randomUUID();
    const handleFocus = () => refreshSession();
    const handleSessionEvent = (value: unknown) => {
      if (!value || typeof value !== "object" || !("type" in value) || !("sourceId" in value)) return;
      const event = value as { type?: unknown; sourceId?: unknown };
      if (event.sourceId === sourceIdRef.current) return;
      if (event.type !== "SIGNED_IN" && event.type !== "SIGNED_OUT" &&
          event.type !== "SESSION_UPDATED" && event.type !== "PROFILE_UPDATED") return;
      if (event.type === "SIGNED_OUT") {
        ++requestGenerationRef.current;
        refreshControllerRef.current?.abort();
        setUser(null);
        setStatus("unauthenticated");
      }
      void refreshSession();
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== SESSION_STORAGE_KEY || !event.newValue) return;
      try { handleSessionEvent(JSON.parse(event.newValue)); } catch { /* malformed signal */ }
    };

    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(SESSION_CHANNEL);
      channel.onmessage = (event) => handleSessionEvent(event.data);
      channelRef.current = channel;
    }
    const signInTimers: ReturnType<typeof setTimeout>[] = [];
    if (serverUserId) {
      signInTimers.push(
        setTimeout(() => broadcastSessionChange("SIGNED_IN"), 0),
        setTimeout(() => broadcastSessionChange("SIGNED_IN"), 750),
      );
    }
    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleStorage);
    return () => {
      mountedRef.current = false;
      ++requestGenerationRef.current;
      refreshControllerRef.current?.abort();
      signInTimers.forEach(clearTimeout);
      channelRef.current?.close();
      channelRef.current = null;
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorage);
    };
  }, [refreshSession, broadcastSessionChange, serverUserId]);

  return (
    <SessionContext.Provider value={{
      user,
      isLoaded,
      status,
      refreshSession,
      updateSessionUser,
      broadcastSessionChange,
      setSessionSignedOut,
    }}>
      {children}
    </SessionContext.Provider>
  );
}
