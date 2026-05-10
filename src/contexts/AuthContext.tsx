import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

interface Profile {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  is_approved: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const EXPLICIT_LOGOUT_KEY = "explicit_logout";
const OAUTH_LOGIN_IN_PROGRESS_KEY = "oauth_login_in_progress";

const purgeAuthStorage = () => {
  const purge = (storage: Storage) => {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (!k) continue;
      if (k.startsWith("sb-") || k.includes("supabase.auth") || k.includes("supabase")) keys.push(k);
    }
    keys.forEach((k) => storage.removeItem(k));
  };

  purge(localStorage);
  purge(sessionStorage);
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        return;
      }

      setProfile(data as Profile);
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  }, []);

  // Function to update last online timestamp
  const updateLastOnline = useCallback(async (userId: string) => {
    try {
      await supabase
        .from("profiles")
        .update({ last_online: new Date().toISOString() })
        .eq("user_id", userId);
    } catch (error) {
      // Silently fail - not critical
      if (import.meta.env.DEV) {
        console.error("Error updating last_online:", error);
      }
    }
  }, []);

  // Store user id in ref to avoid re-subscribing
  const userIdRef = React.useRef<string | null>(null);

  // Helper: detect & honor an explicit-logout flag from the previous session.
  // If the user explicitly signed out, we MUST NOT silently re-hydrate any
  // leftover Supabase session from storage on the next app boot.
  const consumeExplicitLogout = useCallback(async (): Promise<boolean> => {
    let flagged = false;
    let oauthInProgress = false;
    try {
      flagged = sessionStorage.getItem(EXPLICIT_LOGOUT_KEY) === "true";
      oauthInProgress = sessionStorage.getItem(OAUTH_LOGIN_IN_PROGRESS_KEY) === "true";
    } catch {
      flagged = false;
    }
    if (!flagged) return false;

    if (oauthInProgress) {
      try { sessionStorage.removeItem(EXPLICIT_LOGOUT_KEY); } catch { /* ignore */ }
      return false;
    }

    // Purge any cached Supabase auth tokens so getSession() cannot revive them.
    try {
      purgeAuthStorage();
    } catch {
      // ignore storage access errors
    }

    // Belt-and-suspenders: ask Supabase to drop any in-memory session too.
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // ignore — we're already in a logged-out intent
    }

    return true;
  }, []);

  useEffect(() => {
    let cancelled = false;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Guard: if user explicitly logged out, ignore any rehydrated session
        // until a real SIGNED_IN event arrives from a fresh login.
        const { loggedOut, oauthInProgress } = (() => {
          try {
            return {
              loggedOut: sessionStorage.getItem(EXPLICIT_LOGOUT_KEY) === "true",
              oauthInProgress: sessionStorage.getItem(OAUTH_LOGIN_IN_PROGRESS_KEY) === "true",
            };
          }
          catch { return { loggedOut: false, oauthInProgress: false }; }
        })();

        if (loggedOut && !oauthInProgress && event !== 'SIGNED_IN') {
          setSession(null);
          setUser(null);
          setProfile(null);
          userIdRef.current = null;
          setIsLoading(false);
          return;
        }

        // A genuine new login clears the explicit-logout flag.
        if (event === 'SIGNED_IN') {
          try {
            sessionStorage.removeItem(EXPLICIT_LOGOUT_KEY);
            sessionStorage.removeItem(OAUTH_LOGIN_IN_PROGRESS_KEY);
          } catch { /* ignore */ }
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          userIdRef.current = session.user.id;
          // Use setTimeout to avoid potential deadlocks with Supabase client
          setTimeout(() => {
            fetchProfile(session.user.id);
            updateLastOnline(session.user.id);
            // Log login activity
            if (event === 'SIGNED_IN') {
              supabase.from("user_activity_logs").insert({
                user_id: session.user.id,
                action: "login",
                detail: null,
              } as never).then(() => {});
            }
          }, 0);
        } else {
          userIdRef.current = null;
          setProfile(null);
        }

        setIsLoading(false);
      }
    );

    // THEN initialize: honor explicit-logout BEFORE touching getSession().
    (async () => {
      const wasLoggedOut = await consumeExplicitLogout();
      if (cancelled) return;

      if (wasLoggedOut) {
        // Stay signed out. Do not call getSession() — nothing to rehydrate.
        setSession(null);
        setUser(null);
        setProfile(null);
        userIdRef.current = null;
        setIsLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        userIdRef.current = session.user.id;
        fetchProfile(session.user.id);
        updateLastOnline(session.user.id);
      }

      setIsLoading(false);
    })();

    // Update last_online periodically (every 5 minutes)
    const intervalId = setInterval(() => {
      if (userIdRef.current) {
        updateLastOnline(userIdRef.current);
      }
    }, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      clearInterval(intervalId);
    };
  }, [fetchProfile, updateLastOnline, consumeExplicitLogout]);

  const signOut = async () => {
    // Tandai logout eksplisit SEBELUM apa pun, agar listener onAuthStateChange
    // yang ter-trigger oleh signOut tidak sempat me-rehidrasi state.
    try { sessionStorage.setItem('explicit_logout', 'true'); } catch { /* ignore */ }

    // Clear state first to prevent flicker
    setUser(null);
    setSession(null);
    setProfile(null);
    userIdRef.current = null;

    // Coba global sign-out (invalidate sesi di server). Bila gagal (mis. token
    // sudah kadaluarsa / offline), tetap lanjutkan dengan local sign-out agar
    // tidak menggantung dan token lokal tetap dibersihkan.
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (e) {
      if (import.meta.env.DEV) console.error("global signOut error:", e);
      try { await supabase.auth.signOut({ scope: 'local' }); } catch { /* ignore */ }
    }

    // Hard-clear semua cached Supabase auth tokens dari storage browser.
    try {
      const purge = (storage: Storage) => {
        const keys: string[] = [];
        for (let i = 0; i < storage.length; i++) {
          const k = storage.key(i);
          if (!k) continue;
          if (k.startsWith('sb-') || k.includes('supabase.auth') || k.includes('supabase')) keys.push(k);
        }
        keys.forEach((k) => storage.removeItem(k));
      };
      purge(localStorage);
      purge(sessionStorage);
    } catch {
      // ignore storage access errors
    }

    // Re-set flag (purge di atas mungkin menghapusnya juga) agar boot berikutnya
    // tahu bahwa ini logout eksplisit.
    try { sessionStorage.setItem('explicit_logout', 'true'); } catch { /* ignore */ }
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
