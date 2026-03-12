import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Users, MessageCircle, User } from 'lucide-react';
import { useUnreadMessageCount } from '@/hooks/useUnreadMessageCount';

const tabs = [
  { icon: Home, label: 'Home', path: '/coach/dashboard' },
  { icon: Users, label: 'Groups', path: '/coach/groups' },
  { icon: MessageCircle, label: 'Messages', path: '/coach/messages' },
  { icon: User, label: 'Profile', path: '/coach/profile' },
];

export default function CoachBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const unreadCount = useUnreadMessageCount();

  return (
    <nav className="sticky bottom-0 z-10 border-t border-border bg-card safe-area-bottom">
      <div className="flex max-w-md mx-auto">
        {tabs.map(({ icon: Icon, label, path }) => {
          const active = location.pathname === path || (path !== '/coach/dashboard' && location.pathname.startsWith(path));
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
