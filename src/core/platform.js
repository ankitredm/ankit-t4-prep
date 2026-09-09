/* Native (Capacitor) vs web detection.
 *
 * The Android APK serves the SAME bundled web assets as the public site,
 * but it must never show the marketing website:
 *   web  -> "/"      = cinematic marketing site (Chrome / GitHub Pages)
 *   APK  -> "/app"   = actual application (Capacitor WebView)
 *
 * The primary mechanism is native: server.appStartPath "/app" in
 * capacitor.config.json makes the WebView load /app directly. The guards
 * below are the safety net: if the WebView ever lands anywhere outside
 * /app/* (stale state, intent, reload), the app routes itself back before
 * the landing page can render. The public website is unaffected because
 * window.Capacitor only exists inside the native shell.
 */

export function isNativeApp() {
  try {
    if (typeof window === 'undefined') return false;
    const cap = window.Capacitor;
    if (!cap) return false;
    if (typeof cap.isNativePlatform === 'function') return cap.isNativePlatform() === true;
    return cap.isNative === true || cap.platform === 'android' || cap.platform === 'ios';
  } catch {
    return false;
  }
}

export function nativePlatform() {
  try {
    const cap = typeof window !== 'undefined' ? window.Capacitor : null;
    if (cap && typeof cap.getPlatform === 'function') return cap.getPlatform();
    if (cap && typeof cap.platform === 'string') return cap.platform;
  } catch {
    /* ignore */
  }
  return 'web';
}

/* Absolute entry path of the application, honoring the Vite base. */
export function appEntryPath() {
  const base = import.meta?.env?.BASE_URL || '/';
  return `${base.endsWith('/') ? base : `${base}/`}app`;
}

export function isAppPath(pathname) {
  const entry = appEntryPath();
  return pathname === entry || pathname.startsWith(`${entry}/`);
}
