import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

type Props = {
  children: ReactNode;
  requiredRole?: 'coach' | 'player' | 'school_owner';
};

export default function ProtectedRoute({ children, requiredRole }: Props) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) return <Navigate to="/auth" replace />;
  if (!profile?.onboarding_complete || !profile.role) return <Navigate to="/onboarding" replace />;
  // school_owner can access both coach and school_owner routes
  const hasAccess = !requiredRole
    || profile.role === requiredRole
    || (profile.role === 'school_owner' && requiredRole === 'coach');

  if (!hasAccess) {
    const home = profile.role === 'school_owner' ? '/coach' : profile.role === 'coach' ? '/coach' : '/player';
    return <Navigate to={home} replace />;
  }

  return <>{children}</>;
}
