# Afterlight

Private, local-first interactive AI stories. You supply API keys in Settings. Nothing is hardcoded.

```bash
npm ci
npm run dev
```

- `/` landing
- `/app` story app

## Web build

```bash
npm ci
node scripts/qa-unit.mjs          # parser / emoji / secrets / mock / context unit checks
node scripts/qa-integration.mjs   # seeded data + conversation flow + provider payload checks (fake IndexedDB)
npm run build
```

GitHub Pages: set `VITE_BASE=/ankit-t4-prep/` when building so assets and `/app` routes work under the project site. `dist/404.html` is copied from `index.html` for SPA fallback. This pass does not deploy Pages.

## Android (Capacitor)

App ID: `app.afterlight.personal`  
App name: Afterlight  
versionName: `1.0.2` (from `android/app/build.gradle`)

The APK launches directly into `/app` via `server.appStartPath` in
`capacitor.config.json` (native WebView start path — no dev server URL).
A pre-render guard in `src/main.jsx` plus route guards in `src/App.jsx`
keep the native shell inside `/app/*` even after reloads or stale state,
so the marketing site at `/` never renders inside the APK. Back navigation
is handled in `MainActivity` (WebView history first, exit at app root),
and the activity uses `adjustResize` so the chat composer stays visible
above the Android keyboard.

```bash
npm ci
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

Debug APK path (after a successful Gradle run):

`android/app/build/outputs/apk/debug/app-debug.apk`

Release (signed, CI only):

`android/app/build/outputs/apk/release/app-release.apk` → published as `Afterlight.apk`

This environment has no Android SDK/Java; local Gradle is not run here.

### GitHub Actions

- `.github/workflows/android-debug.yml` — debug APK artifact `Afterlight-debug.apk` (not a GitHub Release).
- `.github/workflows/android-release.yml` — **signed** `Afterlight.apk` on tag `v*` or workflow_dispatch. Fails if signing secrets are missing.
- `.github/workflows/pages.yml` — builds `dist` and deploys GitHub Pages on every push to `main`.

### Release signing secrets (never commit these)

| Secret | Purpose |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | Base64 of the `.keystore` / `.jks` file |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_ALIAS` | Key alias |
| `ANDROID_KEY_PASSWORD` | Key password |

Signing is **NOT CONFIGURED** until those secrets exist in the GitHub repo.

## Website Download APK

Default URL (override with `VITE_APK_URL`):

`https://github.com/ankitredm/ankit-t4-prep/releases/latest/download/Afterlight.apk`

That asset exists only after a successful tagged signed release. There is no APK in this repository.

## Mobile UI (v1.0.2)

- Bottom tab bar is a single, non-wrapping row — `Home | Stories | Chats | Settings` — on every phone width (320–480px verified).
- The bar slides down and fades while scrolling down, and returns on the first upward scroll or at the top of the page (`src/features/nav/useNavVisibility.js`: passive listener, rAF-throttled, direction + top threshold, cleaned up on unmount).
- The reader (`/app/play/*`) never shows the tab bar, so the chat composer is never covered.
- Design tokens live at the top of `src/styles.css` (`--bg`, `--card`, `--gold`, `--line`, spacing scale, `--page-x`, `--nav-h`).
- Hidden Library Workshop: tap the **Settings** title 7 times within 2 seconds → `/app/admin` (session-scoped; direct navigation without the unlock redirects to Settings).

## Providers

Settings → AI Providers → Test Connection. Mock works offline. Live APIs use **your** keys on-device.
