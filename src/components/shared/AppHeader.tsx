import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
  /** Use shrink-0 instead of sticky (for full-screen layouts like chat) */
  inline?: boolean;
}

export default function AppHeader({ title, subtitle, back, right, inline }: AppHeaderProps) {
  const navigate = useNavigate();
  return (
    <header className={`${inline ? 'shrink-0' : 'sticky top-0 z-10'} px-4 py-4 header-gradient relative`}>
      <div className="max-w-md mx-auto flex items-center">
        {back && (
          <button onClick={() => window.history.length > 1 ? navigate(-1) : navigate(location.pathname.startsWith('/coach') ? '/coach' : '/player')} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/10 text-white shrink-0 absolute left-4">
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
        )}
        <div className="flex-1 text-center">
          <h1 className={`font-bold text-white ${back ? 'text-base' : 'text-lg'}`}>{title}</h1>
          {subtitle && <p className="text-xs text-white/70">{subtitle}</p>}
        </div>
        {right && <div className="absolute right-4">{right}</div>}
      </div>
    </header>
  );
}
