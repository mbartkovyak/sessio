import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <div className="mb-6 text-8xl">🏃</div>
      <h1 className="mb-2 text-3xl font-bold text-foreground">Out of bounds!</h1>
      <p className="mb-8 text-muted-foreground">
        This page doesn't exist. Maybe the session was cancelled?
      </p>
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 rounded-2xl bg-primary px-6 py-3.5 font-semibold text-primary-foreground min-h-[48px]"
      >
        <Home className="h-4 w-4" />
        Go home
      </button>
    </div>
  );
}
