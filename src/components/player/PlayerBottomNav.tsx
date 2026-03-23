import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, MessageCircle, CalendarDays, User } from 'lucide-react';
import { useUnreadMessageCount } from '@/hooks/shared/useConversations';

export default function PlayerBottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const unreadCount = useUnreadMessageCount();

  const tabs = [
    { icon: Home, label: 'Home', path: '/player' },
    { icon: MessageCircle, label: 'Chats', path: '/player/messages' },
    { icon: Search, label: 'Search', path: '/search' },
    { icon: CalendarDays, label: 'Calendar', path: '/calendar' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-10 pointer-events-none">
      {/* Progressive blur: transparent at top, full blur at bottom */}
      <div
        className="absolute inset-0"
        style={{
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          maskImage: 'linear-gradient(to bottom, transparent, black)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, black)',
        }}
      />
      <div className="relative px-4 pointer-events-auto" style={{
        paddingBottom: 'max(10px, env(safe-area-inset-bottom, 10px))',
      }}>
        <nav
          className="max-w-md mx-auto flex items-center rounded-full py-1.5 px-1.5"
          style={{
            background: 'rgba(255, 255, 255, 0.25)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.02)',
          }}
        >
          {tabs.map(({ icon: Icon, label, path }) => {
            const active = pathname === path || (path !== '/player' && pathname.startsWith(path));
            const isMessages = label === 'Chats';
            return (
              <button
                key={label}
                onClick={() => navigate(path)}
                className="relative flex flex-1 flex-col items-center gap-0.5 transition-all"
              >
                <div className={`relative flex items-center justify-center rounded-full transition-all ${
                  active
                    ? 'h-12 w-12 bg-foreground text-white'
                    : 'h-12 w-12 text-foreground/40'
                }`}>
                  <Icon className="h-[24px] w-[24px]" strokeWidth={active ? 2 : 1.5} />
                  {isMessages && unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-accent px-0.5 text-[10px] font-bold text-accent-foreground">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] transition-all ${
                  active ? 'font-semibold text-foreground' : 'text-foreground/40'
                }`}>{label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
