"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";

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
 * SessionProvider — receives server-fetched user data via props.
 * This eliminates the client-side `/api/auth/me` fetch on every page load.
 * A background refresh on window focus keeps the session fresh.
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
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        setUser(data.user || null);
        setIsLoaded(true);
      })
      .catch(() => {
        setIsLoaded(true);
      });
  }, []);

  // Re-validate session when user returns to the tab (non-blocking background refresh)
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
