import { useEffect, useRef, useState, type CSSProperties } from 'react';

// Subtle cursor-follow tilt. Returns a style object to apply to the element.
// Tracks cursor position relative to the element's bounding box and tilts
// via CSS transform. Disabled on touch devices and prefers-reduced-motion.
export function useCursorParallax<T extends HTMLElement>({
  maxTilt = 2,
  perspective = 1000,
}: { maxTilt?: number; perspective?: number } = {}) {
  const ref = useRef<T | null>(null);
  const [style, setStyle] = useState<CSSProperties>({
    transform: `perspective(${perspective}px) rotateX(0deg) rotateY(0deg)`,
    transition: 'transform 400ms var(--ease-out-smooth, ease-out)',
  });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouch = window.matchMedia('(hover: none)').matches;
    if (reducedMotion || isTouch) return;

    const onMove = (e: MouseEvent) => {
      const rect = node.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      const rotateY = (px - 0.5) * maxTilt * 2;
      const rotateX = -(py - 0.5) * maxTilt * 2;
      setStyle({
        transform: `perspective(${perspective}px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`,
        transition: 'transform 150ms var(--ease-out-smooth, ease-out)',
      });
    };
    const onLeave = () => {
      setStyle({
        transform: `perspective(${perspective}px) rotateX(0deg) rotateY(0deg)`,
        transition: 'transform 500ms var(--ease-out-smooth, ease-out)',
      });
    };

    node.addEventListener('mousemove', onMove);
    node.addEventListener('mouseleave', onLeave);
    return () => {
      node.removeEventListener('mousemove', onMove);
      node.removeEventListener('mouseleave', onLeave);
    };
  }, [maxTilt, perspective]);

  return { ref, style };
}
