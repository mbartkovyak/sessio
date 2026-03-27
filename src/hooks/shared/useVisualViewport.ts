import { useEffect } from 'react';

/**
 * Tracks the visual viewport offset on iOS Safari.
 * When the virtual keyboard opens, iOS scrolls the visual viewport away from
 * the layout viewport. This hook syncs a CSS custom property (--vv-offset)
 * so fixed-position headers can follow the visual viewport and stay visible.
 */
export function useVisualViewport() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    function sync() {
      document.documentElement.style.setProperty('--vv-offset', `${vv!.offsetTop}px`);
    }

    vv.addEventListener('scroll', sync);
    vv.addEventListener('resize', sync);
    sync();

    return () => {
      vv.removeEventListener('scroll', sync);
      vv.removeEventListener('resize', sync);
    };
  }, []);
}
