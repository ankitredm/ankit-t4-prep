# Afterlight Android (Capacitor)

Package ID: `app.afterlight.personal`  
Display name: Afterlight

Web assets are copied from `dist/` via `npx cap sync android`. Do not commit `app/src/main/assets/public`.

Launcher / splash source: `public/brand/afterlight-logo.png`, `public/brand/splash.png`.

Release signing uses environment variables on CI (`ANDROID_KEYSTORE_FILE` and passwords). No keystore belongs in git.
