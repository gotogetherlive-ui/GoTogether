"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { apiJson } from "@/lib/apiClient";

interface SessionUser {
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

interface SessionContextValue {
  user: SessionUser | null;
  isLoaded: boolean;
  refreshSession: () => void;
}

const SessionContext = createContext<SessionContextValue>({
  user: null,
  isLoaded: false,
  refreshSession: () => {},
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

  const refreshSession = useCallback(() => {
    apiJson<{ user?: SessionUser | null }>("/api/auth/me", { cache: "no-store" }, { timeoutMs: 8000 })
      .then((data) => {
        setUser(data.user || null);
      })
      .catch(() => {})
      .finally(() => {
        setIsLoaded(true);
      });
  }, []);

  useEffect(() => {
    const handleFocus = () => refreshSession();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refreshSession]);

  return (
    <SessionContext.Provider value={{ user, isLoaded, refreshSession }}>
      {children}
    </SessionContext.Provider>
  );
}
