import { useEffect } from 'react';
import { isAndroid } from '@/lib/platform';

/**
 * Tracks viewport changes driven by the soft keyboard and exposes them to CSS.
 *
 * iOS Safari / WKWebView: when the keyboard opens, `window.innerHeight` stays
 * constant and `visualViewport.height` shrinks. We mirror `visualViewport.offsetTop`
 * into the `--vv-offset` CSS variable so fixed headers can track the visual
 * viewport and stay pinned to the top of the visible area. iOS Safari also
 * fires `visualViewport` events for URL-bar collapses (~50px deltas) — we
 * ignore those with a 150px threshold.
 *
 * Android WebView: the platform default is `windowSoftInputMode=adjustResize`,
 * which shrinks the window (and therefore `window.innerHeight`) when the
 * keyboard opens. In that case `visualViewport.height` tracks `window.innerHeight`
 * and the iOS check never fires. Instead, we track the maximum window height
 * we've seen in the current orientation and detect a shrink > 150px as
 * "keyboard open". When it is, we add an `android-keyboard-open` class to
 * `<html>` so CSS can hide the `position: fixed` bottom nav — otherwise it
 * floats above the keyboard. iOS doesn't need this: WKWebView's contentInset
 * keeps the webview full-size and the nav stays behind the keyboard.
 */
export function useVisualViewport() {
  // iOS: sync --vv-offset from visualViewport.offsetTop so fixed headers
  // follow the visible viewport when the keyboard is open.
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

  // Android: detect keyboard by watching window.innerHeight shrink below a
  // per-orientation baseline. Resetting the baseline on orientation change
  // prevents a portrait→landscape rotation from being mistaken for a keyboard.
  useEffect(() => {
    if (!isAndroid) return;
    let baseline = window.innerHeight;

    function check() {
      if (window.innerHeight > baseline) baseline = window.innerHeight;
      const keyboardOpen = (baseline - window.innerHeight) > 150;
      document.documentElement.classList.toggle('android-keyboard-open', keyboardOpen);
    }

    function onOrientationChange() {
      // Wait for the resize to settle after the rotation completes, then
      // rebase so the new orientation's natural height becomes the baseline.
      setTimeout(() => {
        baseline = window.innerHeight;
        check();
      }, 250);
    }

    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', onOrientationChange);

    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', onOrientationChange);
      document.documentElement.classList.remove('android-keyboard-open');
    };
  }, []);
}
