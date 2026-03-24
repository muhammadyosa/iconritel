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

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
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

    // THEN get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        userIdRef.current = session.user.id;
        fetchProfile(session.user.id);
        updateLastOnline(session.user.id);
      }
      
      setIsLoading(false);
    });

    // Update last_online periodically (every 5 minutes)
    const intervalId = setInterval(() => {
      if (userIdRef.current) {
        updateLastOnline(userIdRef.current);
      }
    }, 5 * 60 * 1000);

    return () => {
      subscription.unsubscribe();
      clearInterval(intervalId);
    };
  }, [fetchProfile, updateLastOnline]);

  const signOut = async () => {
    // Clear state first to prevent flicker
    setUser(null);
    setSession(null);
    setProfile(null);
    // Sign out with global scope to invalidate all sessions
    await supabase.auth.signOut({ scope: 'global' });
    // Mark that user explicitly logged out to prevent auto-login
    sessionStorage.setItem('explicit_logout', 'true');
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
