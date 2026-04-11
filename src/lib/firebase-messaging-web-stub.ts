// Stub for `firebase/messaging`.
//
// @capacitor-firebase/messaging ships a web bundle that imports the
// Firebase JS SDK's messaging module as an OPTIONAL peer dependency.
// We only use that plugin on NATIVE (useNativePush early-returns on web),
// so the Firebase JS SDK code never actually runs — but Vite's static
// analysis still has to resolve the import at build time.
//
// This stub satisfies the import without pulling ~100KB of unused Firebase
// JS into the web bundle. If any of these functions ever gets called on
// web, it's a bug — the caller should have been gated on isNative.

export const deleteToken = async () => false;
export const getMessaging = () => ({});
export const getToken = async () => '';
export const isSupported = async () => false;
export const onMessage = () => () => {};
export const onBackgroundMessage = () => () => {};
