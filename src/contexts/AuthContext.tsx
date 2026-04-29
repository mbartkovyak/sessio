import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import * as Sentry from '@sentry/react';
import { supabase } from '@/integrations/supabase/client';
import type { Profile } from '@/lib/supabase';
import { isNative, isAndroid } from '@/lib/platform';
import { getDeviceId } from '@/lib/device-id';
import i18n from '@/i18n';
// FirebaseMessaging is loaded dynamically in signOut() to avoid a startup
// deadlock on iOS — the plugin's JS bridge tries to synchronize with
// native method swizzling during import, blocking React from rendering.

async function hashId(id: string): Promise<string> {
  const data = new TextEncoder().encode(id);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

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
  const [profile, setProfile] = useState<Profile | null>(() => {
    try {
      const cached = localStorage.getItem('sessio_cached_profile');
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(true);
  const userRef = useRef<User | null>(null);
  const initialLoadDone = useRef(false);

  async function fetchProfile(userId: string, retries = 2) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) {
      // PGRST116 = 0 rows: profile row missing (e.g. after DB wipe).
      // Call ensure_my_profile() RPC to auto-create it from auth.users.
      if (error.code === 'PGRST116') {
        const { data: ensured, error: rpcErr } = await supabase.rpc('ensure_my_profile');
        if (rpcErr) {
          Sentry.captureException(rpcErr, { tags: { context: 'ensure_my_profile' }, extra: { userId } });
          // Profile can't be created — stale session (e.g. account was deleted).
          // Force sign-out to prevent broken ghost state (FK violations on every action).
          localStorage.removeItem('sessio_cached_profile');
          supabase.auth.signOut();
          return;
        }
        setProfile(ensured as Profile | null);
        if (ensured) {
          try { localStorage.setItem('sessio_cached_profile', JSON.stringify(ensured)); } catch {}
        }
        return;
      }
      // Auth errors (permission denied, JWT expired): token is broken, retrying won't help
      const isAuthError = error.code === '42501' || error.code === 'PGRST301';
      if (!isAuthError && retries > 0) {
        await new Promise(r => setTimeout(r, 1000));
        return fetchProfile(userId, retries - 1);
      }
      // Only report real API errors, not transient network failures
      const isNetworkError = !error.code && !error.details;
      if (!isNetworkError) {
        Sentry.captureException(error, { tags: { context: 'fetchProfile' }, extra: { userId } });
      }
      // Never nuke existing profile on error — keep cached data visible.
      // Auth state handler clears profile on SIGNED_OUT.
      return;
    }
    setProfile(data as Profile | null);
    if (data) {
      try { localStorage.setItem('sessio_cached_profile', JSON.stringify(data)); } catch {}
    }
  }

  const refreshProfile = useCallback(async () => {
    const currentUser = userRef.current;
    if (currentUser) await fetchProfile(currentUser.id);
  }, []);

  useEffect(() => {
    // IMPORTANT: Do NOT await inside onAuthStateChange — it deadlocks Supabase auth.
    // Instead: use getSession() for initial load, and onAuthStateChange for sign-in/out events only.

    Sentry.addBreadcrumb({ category: 'boot', message: 'auth:getSession:start' });

    // Safety net: WKWebView on iPad (iPhone compat mode) has been observed to
    // stall Supabase's getSession() indefinitely on cold start. Without this
    // fallback, `loading` stays true forever and SignIn shows a spinner —
    // the exact "App is loading indefinitely" symptom Apple rejected 1.2.0 for.
    // If getSession resolves first, we clear this; otherwise we render sign-in
    // after 5s and let onAuthStateChange hydrate any late session.
    const bootTimeout = setTimeout(() => {
      if (!initialLoadDone.current) {
        Sentry.captureMessage('auth:getSession timed out after 5s — forcing sign-in render', { level: 'warning' });
        initialLoadDone.current = true;
        setLoading(false);
      }
    }, 5000);

    // 1. Restore session from storage and load profile
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(bootTimeout);
      Sentry.addBreadcrumb({ category: 'boot', message: 'auth:getSession:resolved', data: { hasSession: !!session } });
      setSession(session);
      setUser(session?.user ?? null);
      userRef.current = session?.user ?? null;
      if (session?.user) {
        // Use cached profile for instant load if it matches the current user
        const cached = profile; // from localStorage initializer
        if (cached && cached.id === session.user.id) {
          initialLoadDone.current = true;
          setLoading(false);
          fetchProfile(session.user.id); // silent background refresh
        } else {
          await fetchProfile(session.user.id);
          initialLoadDone.current = true;
          setLoading(false);
        }
      } else {
        setProfile(null);
        initialLoadDone.current = true;
        setLoading(false);
      }
    }).catch(err => {
      clearTimeout(bootTimeout);
      Sentry.captureException(err, { tags: { context: 'AuthProvider:getSession' } });
      if (!initialLoadDone.current) {
        initialLoadDone.current = true;
        setLoading(false);
      }
    });

    // 2. Listen for subsequent sign-in / sign-out changes (fire-and-forget, no await)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'INITIAL_SESSION') return; // getSession() handles initial load
        setSession(session);
        setUser(session?.user ?? null);
        userRef.current = session?.user ?? null;
        if (session?.user) {
          hashId(session.user.id).then(h => Sentry.setUser({ id: h }));
        } else {
          Sentry.setUser(null);
        }
        if (session?.user) {
          if (event === 'SIGNED_IN') {
            if (initialLoadDone.current) {
              // getSession() already handled this session — just refresh profile silently
              fetchProfile(session.user.id);
            } else {
              // Fresh sign-in (e.g. OAuth callback): show loader until profile is ready
              setLoading(true);
              fetchProfile(session.user.id)
                .then(() => { initialLoadDone.current = true; setLoading(false); })
                .catch(() => { initialLoadDone.current = true; setLoading(false); });
            }
          } else {
            // Token refresh, user update, etc: silent background refresh — do NOT set loading
            // to avoid unmounting the entire page tree and tearing down realtime subscriptions
            fetchProfile(session.user.id);
          }
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      clearTimeout(bootTimeout);
      subscription.unsubscribe();
    };
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
    localStorage.removeItem('sessio_cached_profile');
    // Wipe persisted React Query cache so the next user's sign-in doesn't
    // briefly show the previous user's data on cold start (the persister
    // rehydrates before auth resolves).
    localStorage.removeItem('sessio_query_cache');

    // Clear React state synchronously so the UI reflects sign-out immediately.
    // Without this, session/profile stay populated for the 3-5s that
    // supabase.auth.signOut() + push cleanup take — during that window the
    // user can click around the logged-in app and their actions feel like they
    // "undo" the sign-out. The ProtectedRoute redirects to /auth/sign-in the
    // moment profile becomes null.
    setSession(null);
    setUser(null);
    userRef.current = null;
    setProfile(null);
    Sentry.setUser(null);

    // Best-effort push cleanup — runs concurrently with the actual sign-out
    // so the UI isn't blocked for 3-5s waiting on network calls.
    // Started BEFORE supabase.auth.signOut() so the JWT is still valid for
    // RLS-scoped deletes. Each step is independently safe to fail.
    const pushCleanup = (async () => {
      try {
        if (isNative) {
          const currentUser = userRef.current;
          if (currentUser) {
            const deviceId = await getDeviceId();
            const { error } = await supabase
              .from('push_subscriptions')
              .delete()
              .eq('user_id', currentUser.id)
              .eq('device_id', deviceId);
            if (error) {
              Sentry.captureMessage('Native push delete on signOut failed', {
                level: 'warning',
                extra: { error: error.message },
              });
            }
          }
          const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
          await FirebaseMessaging.deleteToken().catch(() => {});
        } else if ('serviceWorker' in navigator && 'PushManager' in window) {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg) {
            const sub = await reg.pushManager.getSubscription();
            if (sub) {
              const { error } = await supabase
                .from('push_subscriptions')
                .delete()
                .eq('transport', 'webpush')
                .eq('target', sub.endpoint);
              if (error) {
                Sentry.captureMessage('Push subscription delete on signOut failed', {
                  level: 'warning',
                  extra: { error: error.message },
                });
              }
              await sub.unsubscribe();
            }
            reg.active?.postMessage({ type: 'SET_USER_ID', userId: null });
          }
        }
      } catch (e) {
        Sentry.captureException(e, { tags: { context: 'signOut push cleanup' } });
      }
    })();

    // Clear Android Credential Manager cached state — also fire-and-forget.
    if (isNative && isAndroid) {
      import('@/lib/google-sign-in-native')
        .then(({ GoogleSignIn }) => GoogleSignIn.signOut())
        .catch(() => {});
    }

    // Fire-and-forget the actual Supabase sign-out and push cleanup. The UI
    // is already logged out (we cleared React state above); the signOut()
    // call invalidates the server-side session in the background. Awaiting
    // here used to block the caller for 3-5s, during which the user could
    // click around the still-rendered logged-in UI.
    supabase.auth.signOut({ scope: 'global' }).catch(err => {
      Sentry.captureException(err, { tags: { context: 'supabase.signOut' } });
    });
    pushCleanup.catch(() => {});
  }

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
