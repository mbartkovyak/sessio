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
      {/* Tiny fade — just 6px feather at the very top edge */}
      <div className="pointer-events-none" style={{
        height: '6px',
        background: 'linear-gradient(to bottom, hsl(var(--background) / 0), hsl(var(--background) / 1))',
      }} />
      {/* Pill area */}
      <div className="px-4 pointer-events-auto bg-background" style={{
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
