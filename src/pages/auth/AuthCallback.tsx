import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { profile, loading } = useAuth();
  const exchangeAttempted = useRef(false);

  // Handle PKCE code exchange from OAuth redirects
  useEffect(() => {
    if (exchangeAttempted.current) return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      exchangeAttempted.current = true;
      supabase.auth.exchangeCodeForSession(code);
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    // If there's a code param, the exchange may still be in progress — don't redirect yet
    const params = new URLSearchParams(window.location.search);
    if (!profile && params.get('code')) return;
    if (!profile) {
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
