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
    <div className={`${inline ? 'shrink-0' : 'fixed bottom-0 left-0 right-0'} z-10 px-4 safe-area-bottom`}
      style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))' }}>
      <nav
        className="max-w-md mx-auto flex rounded-2xl"
        style={{
          background: 'rgba(255, 255, 255, 0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 2px 20px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
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
              className={`relative flex flex-1 flex-col items-center gap-1 py-3 text-[11px] font-medium transition-all min-h-[52px] ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <div className="relative">
                <Icon className={`h-5 w-5 transition-all ${active ? 'scale-110' : ''}`} strokeWidth={active ? 2.5 : 1.8} />
                {isMessages && unreadCount > 0 && (
                  <span className="absolute -right-2.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-accent-foreground">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <span className={active ? 'font-semibold' : ''}>{label}</span>
              {active && (
                <span className="absolute bottom-1.5 h-1 w-5 rounded-full bg-accent" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
