'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { User, Session, AuthChangeEvent, SupabaseClient } from '@supabase/supabase-js';

interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'client';
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  sessionExpired: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  loading: true,
  sessionExpired: false,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [mounted, setMounted] = useState(false);

  const initializingRef = useRef(false);
  const fetchingProfileRef = useRef(false);
  const hadSessionRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || initializingRef.current) return;
    initializingRef.current = true;

    const initSupabase = async () => {
      try {
        const { createSupabaseBrowserClient } = await import('@/lib/supabase-browser');
        const client = createSupabaseBrowserClient();
        setSupabase(client);
      } catch (error) {
        console.error('Failed to initialize Supabase:', error);
        setLoading(false);
      }
    };

    initSupabase();
  }, [mounted]);

  const fetchProfile = useCallback(async (userId: string, email: string | undefined, client: SupabaseClient) => {
    if (fetchingProfileRef.current) return;
    fetchingProfileRef.current = true;

    try {
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        setProfile(data);
        return;
      }

      if (error && error.code === 'PGRST116' && email) {
        const displayName = email.split('@')[0];
        const { data: newProfile } = await client
          .from('profiles')
          .upsert(
            { id: userId, email, display_name: displayName, role: 'client' },
            { onConflict: 'id', ignoreDuplicates: true }
          )
          .select()
          .single();

        if (newProfile) {
          setProfile(newProfile);
        } else {
          const { data: existing } = await client
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
          if (existing) setProfile(existing);
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      fetchingProfileRef.current = false;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user && supabase) {
      fetchingProfileRef.current = false;
      await fetchProfile(user.id, user.email, supabase);
    }
  }, [user, supabase, fetchProfile]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    }
    setUser(null);
    setProfile(null);
    setSession(null);
    setSessionExpired(false);
    hadSessionRef.current = false;
  }, [supabase]);

  useEffect(() => {
    if (!supabase) return;

    let isMounted = true;

    const initSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!isMounted) return;

        const sess = data.session;
        setSession(sess);
        setUser(sess?.user ?? null);

        if (sess?.user) {
          hadSessionRef.current = true;
          await fetchProfile(sess.user.id, sess.user.email, supabase);
        }
      } catch (err) {
        if (err instanceof Error && err.message.includes('Lock')) {
          console.debug('Auth lock contention (non-critical)');
        } else {
          console.error('Session init error:', err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, sess: Session | null) => {
        if (!isMounted) return;

        setSession(sess);
        setUser(sess?.user ?? null);

        if (sess?.user) {
          hadSessionRef.current = true;
          setSessionExpired(false);
          setTimeout(() => {
            if (isMounted) {
              fetchProfile(sess.user.id, sess.user.email, supabase);
            }
          }, 100);
        } else {
          setProfile(null);
          if (hadSessionRef.current && (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED')) {
            setSessionExpired(true);
            hadSessionRef.current = false;
          }
        }

        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  return (
    <AuthContext.Provider
      value={{ user, profile, session, loading, sessionExpired, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}
