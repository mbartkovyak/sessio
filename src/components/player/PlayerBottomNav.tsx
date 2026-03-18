import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, MessageCircle, CalendarDays, User } from 'lucide-react';
import { useUnreadMessageCount } from '@/hooks/shared/useUnreadMessageCount';

export default function PlayerBottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const unreadCount = useUnreadMessageCount();

  const tabs = [
    { icon: Home, label: 'Home', path: '/player' },
    { icon: MessageCircle, label: 'Messages', path: '/player/messages' },
    { icon: Search, label: 'Search', path: '/search' },
    { icon: CalendarDays, label: 'Calendar', path: '/calendar' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card z-10 safe-area-bottom" style={{ boxShadow: '0 -1px 3px 0 rgba(0,0,0,0.06), 0 -1px 2px -1px rgba(0,0,0,0.04)' }}>
      <div className="flex max-w-md mx-auto">
        {tabs.map(({ icon: Icon, label, path }) => {
          const active = pathname === path || (path !== '/player' && pathname.startsWith(path));
          const isMessages = label === 'Messages';
          return (
            <button
              key={label}
              onClick={() => navigate(path)}
              className={`relative flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors min-h-[56px] ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {isMessages && unreadCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
