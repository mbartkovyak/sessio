import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

const THRESHOLD = 60;   // px before triggering refresh
const MAX_PULL = 110;   // max visual pull distance
const DAMPING = 0.4;    // resistance factor (lower = more resistance)

/**
 * Pull-to-refresh overlay. Mounts once in RootLayout — no wrapping needed.
 * Listens for vertical pull gestures when scrolled to top, then invalidates
 * all React Query caches.
 */
export default function PullToRefresh() {
  const queryClient = useQueryClient();
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Refs for touch tracking (no re-renders during gesture)
  const startY = useRef(0);
  const pulling = useRef(false);
  const dist = useRef(0);
  const busy = useRef(false);

  const doRefresh = useCallback(async () => {
    busy.current = true;
    setRefreshing(true);
    setDistance(36); // snap to spinner position
    // Active queries only — pull-to-refresh refreshes the visible page, not
    // every cached query in the app. Fire-and-forget so the spinner doesn't
    // outlive navigation: the singleton overlay would otherwise keep spinning
    // on the next page while the previous page's queries refetch.
    queryClient.invalidateQueries({ refetchType: 'active' });
    await new Promise(r => setTimeout(r, 400));
    busy.current = false;
    setRefreshing(false);
    dist.current = 0;
    setDistance(0);
  }, [queryClient]);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 0 || busy.current) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current || busy.current) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0) {
        const d = Math.min(dy * DAMPING, MAX_PULL);
        dist.current = d;
        setDistance(d);
      } else {
        // Scrolling up — cancel
        pulling.current = false;
        dist.current = 0;
        setDistance(0);
      }
    };

    const onTouchEnd = () => {
      if (!pulling.current) return;
      pulling.current = false;
      if (dist.current >= THRESHOLD) {
        doRefresh();
      } else {
        dist.current = 0;
        setDistance(0);
      }
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd);
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [doRefresh]);

  if (distance === 0 && !refreshing) return null;

  const progress = Math.min(distance / THRESHOLD, 1);

  // Position well below the header + safe area (notch/Dynamic Island)
  const safeTop = 'calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 112px)';

  return (
    <div
      className="fixed inset-x-0 z-[100] flex justify-center pointer-events-none"
      style={{ top: `calc(${safeTop} + ${Math.max(distance - 36, 0)}px)` }}
    >
      <div className="bg-card/90 backdrop-blur-sm rounded-full p-2 shadow-lg border border-border/50">
        <Loader2
          className={`h-5 w-5 text-muted-foreground transition-none ${refreshing ? 'animate-spin' : ''}`}
          style={
            refreshing
              ? undefined
              : { transform: `rotate(${progress * 360}deg)`, opacity: progress }
          }
        />
      </div>
    </div>
  );
}
