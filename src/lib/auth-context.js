"use client";
import { createContext, useContext, useEffect, useState, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabase-browser";

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    // Get initial session without using getUser() which causes lock issues
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        supabase.from("profiles").select("*").eq("id", u.id).single()
          .then(({ data }) => { setProfile(data); setLoading(false); })
          .catch(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          supabase.from("profiles").select("*").eq("id", u.id).single()
            .then(({ data }) => { setProfile(data); });
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = async (email, password) => {
    return await supabase.auth.signInWithPassword({ email, password });
  };

  const signUpWithEmail = async (email, password, displayName) => {
    return await supabase.auth.signUp({
      email, password,
      options: { data: { display_name: displayName } },
    });
  };

  const signInWithGoogle = async () => {
    return await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const updateProfile = async (updates) => {
    if (!user) return { error: "Not authenticated" };
    const { data, error } = await supabase
      .from("profiles").update(updates).eq("id", user.id).select().single();
    if (data) setProfile(data);
    return { data, error };
  };

  const refreshProfile = () => {
    if (user) {
      supabase.from("profiles").select("*").eq("id", user.id).single()
        .then(({ data }) => { if (data) setProfile(data); });
    }
  };

  const value = useMemo(() => ({
    user, profile, loading,
    signInWithEmail, signUpWithEmail, signInWithGoogle,
    signOut, updateProfile, refreshProfile, supabase,
  }), [user, profile, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
