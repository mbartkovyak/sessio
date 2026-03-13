import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, CalendarDays, User } from 'lucide-react';

export default function PlayerBottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const tabs = [
    { icon: Home, label: 'Home', path: '/player' },
    { icon: Search, label: 'Search', path: '/search' },
    { icon: CalendarDays, label: 'Calendar', path: '/calendar' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  return (
    <nav className="sticky bottom-0 border-t border-border bg-card z-10 safe-area-bottom">
      <div className="flex max-w-md mx-auto">
        {tabs.map(({ icon: Icon, label, path }) => {
          const active = pathname === path || (path !== '/player' && pathname.startsWith(path));
          return (
            <button
              key={label}
              onClick={() => navigate(path)}
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors min-h-[56px] ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
