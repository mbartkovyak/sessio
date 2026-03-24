import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { profile, loading, session } = useAuth();
  const handled = useRef(false);

  // Handle PKCE code exchange and wait for session
  useEffect(() => {
    if (handled.current) return;

    async function handleCallback() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      if (code) {
        console.log('[AuthCallback] Exchanging code for session...');
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        console.log('[AuthCallback] Exchange result:', { user: data?.user?.email, error });
        if (error) {
          console.error('[AuthCallback] Exchange failed:', error.message);
        }
      }

      // Check session after exchange
      const { data: { session: s } } = await supabase.auth.getSession();
      console.log('[AuthCallback] Session:', s ? s.user.email : 'null');

      if (s) {
        // Fetch profile directly
        const { data: p, error: pErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', s.user.id)
          .single();
        console.log('[AuthCallback] Profile:', p, 'Error:', pErr);
      }
    }

    handled.current = true;
    handleCallback();
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!profile) {
      // Don't redirect if we might still be processing
      if (!session) return;
      navigate('/auth');
      return;
    }
    if (!profile.onboarding_complete || !profile.role) {
      navigate('/onboarding');
      return;
    }

    // Check for pending invites
    const pendingSchoolInvite = sessionStorage.getItem('pending_school_invite');
    if (pendingSchoolInvite) {
      sessionStorage.removeItem('pending_school_invite');
      navigate(`/join-school/${pendingSchoolInvite}`);
      return;
    }
    const pendingInvite = sessionStorage.getItem('pending_invite');
    if (pendingInvite) {
      sessionStorage.removeItem('pending_invite');
      navigate(`/join/${pendingInvite}`);
      return;
    }

    navigate(profile.role === 'player' ? '/player' : '/coach');
  }, [loading, profile, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground">Signing you in…</p>
      </div>
    </div>
  );
}
