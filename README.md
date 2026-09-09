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
node scripts/qa-unit.mjs
npm run build
```

GitHub Pages: set `VITE_BASE=/ankit-t4-prep/` when building so assets and `/app` routes work under the project site. `dist/404.html` is copied from `index.html` for SPA fallback. This pass does not deploy Pages.

## Android (Capacitor)

App ID: `app.afterlight.personal`  
App name: Afterlight  
versionName: `1.0.0` (from `android/app/build.gradle`)

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
- `.github/workflows/pages.yml` — builds `dist` for Pages (manual dispatch; does not deploy).

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

## Providers

Settings → AI Providers → Test Connection. Mock works offline. Live APIs use **your** keys on-device.
