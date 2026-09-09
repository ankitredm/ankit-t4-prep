import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { appEntryPath, isAppPath, isNativeApp } from './core/platform.js';
import './styles.css';

const BASE_URL = import.meta.env.BASE_URL || '/';

// Inside the APK the marketing site must never render — not even for a
// frame. If the WebView is anywhere outside /app/*, replace the URL before
// React mounts so the first paint is already the application.
if (isNativeApp() && typeof window !== 'undefined') {
  try {
    if (!isAppPath(window.location.pathname)) {
      window.location.replace(appEntryPath());
    }
  } catch {
    /* If the guard fails, App.jsx re-guards at route level. */
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={BASE_URL.replace(/\/$/, '') || '/'}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
