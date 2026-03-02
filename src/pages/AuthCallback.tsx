import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!profile) {
      navigate('/auth');
      return;
    }
    if (!profile.onboarding_complete || !profile.role) {
      navigate('/onboarding');
      return;
    }
    if (profile.role === 'coach') {
      navigate('/coach/dashboard');
    } else {
      navigate('/player/dashboard');
    }
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
