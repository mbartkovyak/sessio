import { useEffect } from 'react';

/**
 * Tracks the visual viewport offset on iOS Safari — only when the keyboard is open.
 *
 * iOS Safari fires visualViewport scroll/resize for TWO reasons:
 *   1. Virtual keyboard opens → viewport shrinks by 250-400px
 *   2. URL bar collapses/expands during scroll → viewport changes by ~50px
 *
 * We only want to react to (1). A 150px threshold reliably distinguishes the two.
 * When the keyboard IS open, we sync --vv-offset so fixed headers follow the
 * visual viewport. Otherwise it stays 0 and the fixed header behaves normally.
 */
export function useVisualViewport() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    function sync() {
      const keyboardOpen = (window.innerHeight - vv!.height) > 150;
      const offset = keyboardOpen ? vv!.offsetTop : 0;
      document.documentElement.style.setProperty('--vv-offset', `${offset}px`);
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
