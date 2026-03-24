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
      {/* Progressive blur: transparent at top, full blur at bottom */}
      {!inline && (
        <div
          className="absolute inset-0"
          style={{
            backdropFilter: 'blur(48px)',
            WebkitBackdropFilter: 'blur(48px)',
            maskImage: 'linear-gradient(to bottom, transparent, black)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent, black)',
          }}
        />
      )}
      <div className={`${!inline ? 'relative' : ''} px-4`} style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom, 10px))' }}>
        <nav
          className="max-w-md mx-auto flex items-center rounded-full py-1.5 px-1.5"
          style={{
            background: 'rgba(255, 255, 255, 0.25)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: '0 0 0 0.5px rgba(0,0,0,0.3)',
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
                {isMessages && unreadCount > 0 && (
                  <span className="absolute top-0 right-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-accent px-0.5 text-[10px] font-bold text-accent-foreground z-10">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
                <div className={`flex items-center justify-center rounded-full transition-all ${
                  active
                    ? 'h-12 w-12 bg-foreground text-white'
                    : 'h-12 w-12 text-foreground/40'
                }`}>
                  <Icon className="h-[24px] w-[24px]" strokeWidth={active ? 2 : 1.5} />
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
