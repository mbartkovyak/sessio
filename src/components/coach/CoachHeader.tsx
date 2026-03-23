import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

interface CoachHeaderProps {
  title: string;
  back?: boolean;
  right?: ReactNode;
  /** Use shrink-0 instead of sticky (for full-screen layouts like chat) */
  inline?: boolean;
}

export default function CoachHeader({ title, back, right, inline }: CoachHeaderProps) {
  const navigate = useNavigate();
  return (
    <header className={`${inline ? 'shrink-0' : 'sticky top-0 z-10'} px-4 py-4 header-gradient`}>
      <div className="max-w-md mx-auto flex items-center gap-3">
        {back && (
          <button onClick={() => navigate(-1)} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/10 text-white shrink-0 -ml-1">
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
        )}
        <h1 className="text-lg font-bold text-white flex-1">{title}</h1>
        {right}
      </div>
    </header>
  );
}
