import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Home, MessageCircle, Dumbbell, CalendarDays, User } from 'lucide-react';
import { useUnreadMessageCount } from '@/hooks/shared/useConversations';

const tabs = [
  { icon: Home, label: 'Home', path: '/coach' },
  { icon: MessageCircle, label: 'Chats', path: '/coach/messages' },
  { icon: Dumbbell, label: 'Lessons', path: '/coach/trainings' },
  { icon: CalendarDays, label: 'Calendar', path: '/coach/calendar' },
  { icon: User, label: 'Profile', path: '/coach/profile' },
];

export default function CoachBottomNav({ inline }: { inline?: boolean } = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const unreadCount = useUnreadMessageCount();
  const isChatTab = searchParams.get('tab') === 'chat';

  return (
    <div className={`${inline ? 'shrink-0' : 'fixed bottom-0 left-0 right-0'} z-10`}>
      <div className="px-4" style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom, 10px))' }}>
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
            const onTrainingChat = isChatTab && location.pathname.startsWith('/coach/trainings/');
            const active = onTrainingChat
              ? path === '/coach/messages'
              : location.pathname === path || (path !== '/coach' && location.pathname.startsWith(path));
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
        {/* Fade below the pill */}
        {!inline && (
          <div
            className="pointer-events-none"
            style={{
              height: 'max(10px, env(safe-area-inset-bottom, 10px))',
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.5), rgba(255,255,255,0.85))',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              marginLeft: '-1rem',
              marginRight: '-1rem',
            }}
          />
        )}
      </div>
    </div>
  );
}
