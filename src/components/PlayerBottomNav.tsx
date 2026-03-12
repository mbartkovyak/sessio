import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Unlock, MessageCircle, User } from 'lucide-react';
import { useUnreadMessageCount } from '@/hooks/useUnreadMessageCount';

export default function PlayerBottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const unread = useUnreadMessageCount();

  const tabs = [
    { icon: Home, label: 'Home', path: '/player/dashboard' },
    { icon: Unlock, label: 'Spots', path: '/player/spots' },
    { icon: MessageCircle, label: 'Messages', path: '/player/messages', badge: unread },
    { icon: User, label: 'Profile', path: '/player/profile' },
  ];

  return (
    <nav className="sticky bottom-0 border-t border-border bg-card z-10 safe-area-bottom">
      <div className="flex max-w-md mx-auto">
        {tabs.map(({ icon: Icon, label, path, badge }) => {
          const active = pathname === path || (path !== '/player/dashboard' && pathname.startsWith(path));
          return (
            <button
              key={label}
              onClick={() => navigate(path)}
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors min-h-[56px] relative ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {!!badge && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-0.5 text-[10px] font-bold text-destructive-foreground">
                    {badge > 9 ? '9+' : badge}
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
