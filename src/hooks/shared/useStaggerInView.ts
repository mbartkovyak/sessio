import { useEffect, useRef, useState } from 'react';

// IntersectionObserver wrapper tuned for stagger reveals. Like useInView but
// returns a `getDelay(index)` helper so children can stagger their animations
// without prop-drilling delay values.
export function useStaggerInView<T extends HTMLElement>({
  threshold = 0.15,
  rootMargin = '0px 0px -10% 0px',
  staggerMs = 80,
}: { threshold?: number; rootMargin?: string; staggerMs?: number } = {}) {
  const ref = useRef<T | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  const getDelay = (index: number) => `${index * staggerMs}ms`;

  return { ref, isVisible, getDelay };
}
