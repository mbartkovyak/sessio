import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Home, MessageCircle, Dumbbell, CalendarDays, User } from 'lucide-react';
import { useUnreadMessageCount } from '@/hooks/shared/useUnreadMessageCount';

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
    <nav
      className={`${inline ? 'shrink-0' : 'fixed bottom-0 left-0 right-0'} z-10 bg-card safe-area-bottom`}
      style={{ boxShadow: '0 -1px 3px 0 rgba(0,0,0,0.06), 0 -1px 2px -1px rgba(0,0,0,0.04)' }}
    >
      <div className="flex max-w-md mx-auto">
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
              className={`relative flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors min-h-[56px] ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {isMessages && unreadCount > 0 && (
                  <span className="absolute -right-2.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-destructive-foreground">
                    {unreadCount > 99 ? '99+' : unreadCount}
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
