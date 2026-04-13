import { SignInWithApple } from '@capacitor-community/apple-sign-in';
import { supabase } from '@/integrations/supabase/client';
import { isNative, isIOS, isAndroid, getShareableOrigin } from './platform';
import {
  getAuthRedirectUrl,
  getEmailRedirectUrl,
  shouldOpenExternalAuth,
  openExternalAuth,
} from './auth-native';

/**
 * Single source of truth for all auth method calls.
 *
 * Return shape: `{ error }` on failure, `{}` on success. Callers should
 * localize the error themselves via `localizeErrorMessage()`.
 *
 * Some flows establish a session in-place (Apple native, email/password) and
 * the caller should navigate to `/auth/callback` after success. Others
 * redirect the browser away (Google, Apple web) — in those cases the caller
 * should NOT navigate. `signInWithApple` reports this via `inPlaceSession`.
 */

// Apple Services ID (NOT the iOS bundle ID). Configured in Apple Dev Portal.
// Stays hardcoded because changing it requires a matching Apple Dev Portal +
// Supabase config change — it's not a per-environment value.
const APPLE_SERVICES_ID = 'com.get-sessio.app.web';

/**
 * Supabase auth callback URL, derived from the configured Supabase project.
 * Works for both dev and prod automatically.
 *
 * Defensive: CLAUDE.md warns that VITE_SUPABASE_URL has been seen with
 * trailing whitespace / newlines / slashes causing silent failures. Trim them.
 */
function appleRedirectURI(): string {
  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!base) return '';
  const clean = base.trim().replace(/\/+$/, '');
  return `${clean}/auth/v1/callback`;
}

/**
 * Password reset magic-link landing page. Always a real web URL — the user
 * clicks in their email client, which opens a browser, not the native app.
 * Uses `getShareableOrigin()` so native builds get the canonical web origin
 * while web builds use the current origin.
 */
function resetPasswordRedirect(): string {
  return `${getShareableOrigin()}/auth/reset-password`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Google
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The Web Client ID from Google Cloud Console / Supabase Google provider.
 * Credential Manager uses this as serverClientId to issue tokens that
 * Supabase can verify. Public config, not a secret.
 */
const GOOGLE_WEB_CLIENT_ID = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID as string;

export async function signInWithGoogle(): Promise<{
  error?: unknown;
  inPlaceSession?: boolean;
}> {
  // Android native: use Credential Manager (system account picker, no browser).
  // Falls back to browser OAuth if the native plugin isn't available (e.g. user
  // is still on an older native shell before the store update).
  if (isNative && isAndroid && GOOGLE_WEB_CLIENT_ID) {
    try {
      const { GoogleSignIn } = await import('./google-sign-in-native');
      const result = await GoogleSignIn.signIn({ webClientId: GOOGLE_WEB_CLIENT_ID });
      const idToken = result?.idToken;
      if (!idToken) {
        return { error: new Error('Missing Google ID token') };
      }
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });
      if (error) return { error };
      return { inPlaceSession: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[GoogleSignIn] native error:', msg, err);
      // User explicitly dismissed the picker → don't force browser fallback.
      if (/cancel/i.test(msg)) {
        return { error: err };
      }
      // Any other failure (no accounts on device, plugin missing, config
      // error) → fall through to browser OAuth. Browser OAuth works fine
      // for first-time sign-ins; the Chrome Custom Tab bug only manifests
      // when switching between cached Google sessions.
    }
  }

  // Web / iOS / fallback: browser-based OAuth redirect
  const external = shouldOpenExternalAuth();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getAuthRedirectUrl(),
      queryParams: { prompt: 'select_account' },
      skipBrowserRedirect: external,
    },
  });
  if (error) return { error };
  if (external && data?.url) {
    await openExternalAuth(data.url);
  }
  return {};
}

// ─────────────────────────────────────────────────────────────────────────────
// Apple
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sign in with Apple.
 *
 * - iOS native (Capacitor): uses the native ASAuthorization sheet via the
 *   @capacitor-community/apple-sign-in plugin, then exchanges the identity
 *   token for a Supabase session via `signInWithIdToken`. Session is
 *   established in-place → returns `{ inPlaceSession: true }`.
 * - Web / other: falls back to Supabase's OAuth redirect flow. The browser
 *   redirects away or an external tab is opened → returns `{}` (no
 *   inPlaceSession flag). The caller must NOT navigate on this path since
 *   the user hasn't actually signed in yet.
 */
export async function signInWithApple(): Promise<{
  error?: unknown;
  inPlaceSession?: boolean;
}> {
  if (isNative && isIOS) {
    try {
      const result = await SignInWithApple.authorize({
        clientId: APPLE_SERVICES_ID,
        redirectURI: appleRedirectURI(),
        scopes: 'email name',
        state: crypto.randomUUID(),
      });
      const identityToken = result?.response?.identityToken;
      if (!identityToken) {
        return { error: new Error('Missing Apple identity token') };
      }
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: identityToken,
      });
      if (error) return { error };

      // Apple provides givenName/familyName ONLY on the first sign-in.
      // Persist immediately — subsequent sign-ins won't include them.
      const givenName = result?.response?.givenName;
      const familyName = result?.response?.familyName;
      if (givenName || familyName) {
        // Save to localStorage so Onboarding can pre-fill immediately.
        // The profile update below races with AuthContext's fetchProfile,
        // so localStorage is the reliable bridge.
        localStorage.setItem('sessio_apple_name', JSON.stringify({
          firstName: givenName || '',
          lastName: familyName || '',
        }));
        const userId = data.session?.user?.id ?? data.user?.id;
        if (userId) {
          await supabase
            .from('profiles')
            .update({
              ...(givenName ? { first_name: givenName } : {}),
              ...(familyName ? { last_name: familyName } : {}),
            })
            .eq('id', userId)
            .then(({ error: profileError }) => {
              if (profileError) {
                console.warn('Failed to save Apple name to profile:', profileError.message);
              }
            });
        }
      }

      return { inPlaceSession: true };
    } catch (err) {
      return { error: err };
    }
  }

  // Web / non-iOS native → Supabase OAuth redirect flow. Browser redirects
  // away (same tab) or we open an external tab. Either way, the caller should
  // NOT navigate — no inPlaceSession flag.
  const external = shouldOpenExternalAuth();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo: getAuthRedirectUrl(),
      skipBrowserRedirect: external,
    },
  });
  if (error) return { error };
  if (external && data?.url) {
    await openExternalAuth(data.url);
  }
  return {};
}

// ─────────────────────────────────────────────────────────────────────────────
// Email + password
// ─────────────────────────────────────────────────────────────────────────────

export async function signUpWithEmail(
  email: string,
  password: string,
): Promise<{ error?: unknown; needsConfirmation?: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: getEmailRedirectUrl() },
  });
  if (error) return { error };
  // If email confirmation is enabled in Supabase, signUp returns a user but no
  // session — the caller should show a "check your inbox" state.
  const needsConfirmation = !!data?.user && !data?.session;
  return { needsConfirmation };
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<{ error?: unknown }> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error };
  return {};
}

// ─────────────────────────────────────────────────────────────────────────────
// Password reset
// ─────────────────────────────────────────────────────────────────────────────

export async function requestPasswordReset(
  email: string,
): Promise<{ error?: unknown }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: resetPasswordRedirect(),
  });
  if (error) return { error };
  return {};
}

export async function updatePassword(
  newPassword: string,
): Promise<{ error?: unknown }> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error };
  return {};
}
