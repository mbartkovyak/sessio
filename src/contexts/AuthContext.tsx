import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import * as Sentry from '@sentry/react';
import { supabase } from '@/integrations/supabase/client';
import type { Profile } from '@/lib/supabase';
import i18n from '@/i18n';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<User | null>(null);

  async function fetchProfile(userId: string, retries = 2) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) {
      if (retries > 0) {
        await new Promise(r => setTimeout(r, 1000));
        return fetchProfile(userId, retries - 1);
      }
      Sentry.captureException(error, { tags: { context: 'fetchProfile' }, extra: { userId } });
    }
    setProfile(data as Profile | null);
  }

  const refreshProfile = useCallback(async () => {
    const currentUser = userRef.current;
    if (currentUser) await fetchProfile(currentUser.id);
  }, []);

  useEffect(() => {
    // IMPORTANT: Do NOT await inside onAuthStateChange — it deadlocks Supabase auth.
    // Instead: use getSession() for initial load, and onAuthStateChange for sign-in/out events only.
    
    // 1. Restore session from storage and load profile
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      userRef.current = session?.user ?? null;
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    // 2. Listen for subsequent sign-in / sign-out changes (fire-and-forget, no await)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        userRef.current = session?.user ?? null;
        Sentry.setUser(session?.user ? { id: session.user.id, email: session.user.email } : null);
        if (session?.user) {
          // Set loading=true so any waiting components (e.g. AuthCallback) hold until profile is ready
          setLoading(true);
          // Fire and forget — do NOT await here
          fetchProfile(session.user.id)
            .then(() => setLoading(false))
            .catch(() => setLoading(false));
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Sync language preference with profile
  useEffect(() => {
    if (!profile) return;
    const currentLang = i18n.language;
    if (profile.language && profile.language !== currentLang) {
      i18n.changeLanguage(profile.language);
      localStorage.setItem('sessio_lang', profile.language);
    } else if (!profile.language && currentLang) {
      supabase.from('profiles').update({ language: currentLang }).eq('id', profile.id);
    }
  }, [profile?.id, profile?.language]);

  async function signOut() {
    await supabase.auth.signOut({ scope: 'global' });
  }

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
