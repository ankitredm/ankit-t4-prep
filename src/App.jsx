import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { db, ensureSeeded } from './core/database/db.js';
import { isNativeApp } from './core/platform.js';
import Landing from './landing/Landing.jsx';
import Onboarding from './features/onboarding/Onboarding.jsx';
import Home from './features/home/Home.jsx';
import Chat from './features/chat/Chat.jsx';
import Settings from './features/settings/Settings.jsx';
import Admin from './features/admin/Admin.jsx';
import StoryDetail from './features/stories/StoryDetail.jsx';
import Stories from './features/stories/Stories.jsx';
import Chats from './features/chats/Chats.jsx';

function WorkshopGate({ children }) {
  if (sessionStorage.getItem('afterlight_workshop') !== '1') {
    return <Navigate to="/app/settings" replace />;
  }
  return children;
}

/* Route-level safety net: the APK must never render the marketing site. */
function WebOnly({ children }) {
  if (isNativeApp()) return <Navigate to="/app" replace />;
  return children;
}

function AppOnly({ children }) {
  return children;
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    (async () => {
      await ensureSeeded();
      const s = await db.settings.get('app');
      if (s?.textScale) document.documentElement.style.setProperty('--scale', String(s.textScale));
      const p = await db.profile.get('user');
      setProfile(p || null);
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return (
      <div className="boot splash">
        <img src={`${import.meta.env.BASE_URL}brand/afterlight-logo.png`} alt="Afterlight" />
        <p>Opening Afterlight…</p>
      </div>
    );
  }

  const needsOnboarding = !profile;

  return (
    <Routes>
      <Route
        path="/"
        element={
          <WebOnly>
            <Landing />
          </WebOnly>
        }
      />
      <Route
        path="/app"
        element={profile ? <Home profile={profile} /> : <Navigate to="/app/welcome" replace />}
      />
      <Route
        path="/app/welcome"
        element={
          profile ? (
            <Navigate to="/app" replace />
          ) : (
            <Onboarding
              onDone={async (p) => {
                await db.profile.put({ id: 'user', ...p });
                setProfile({ id: 'user', ...p });
              }}
            />
          )
        }
      />
      <Route
        path="/app/stories"
        element={needsOnboarding ? <Navigate to="/app/welcome" /> : <Stories />}
      />
      {/* Legacy alias: the library tab used to live at /app/search. */}
      <Route path="/app/search" element={<Navigate to="/app/stories" replace />} />
      <Route
        path="/app/chats"
        element={needsOnboarding ? <Navigate to="/app/welcome" /> : <Chats />}
      />
      <Route
        path="/app/story/:id"
        element={
          needsOnboarding ? <Navigate to="/app/welcome" /> : <StoryDetail profile={profile} />
        }
      />
      <Route
        path="/app/play/:storyId"
        element={needsOnboarding ? <Navigate to="/app/welcome" /> : <Chat profile={profile} />}
      />
      <Route
        path="/app/settings"
        element={
          profile ? (
            <Settings
              profile={profile}
              onProfile={async (p) => {
                await db.profile.put({ id: 'user', ...p });
                setProfile({ id: 'user', ...p });
              }}
            />
          ) : (
            <Navigate to="/app/welcome" />
          )
        }
      />
      <Route
        path="/app/admin"
        element={
          profile ? (
            <WorkshopGate>
              <Admin />
            </WorkshopGate>
          ) : (
            <Navigate to="/app/welcome" />
          )
        }
      />
      {/* Unknown URLs: native shell falls back to the app, web falls back
          to the marketing site. */}
      <Route path="*" element={<Navigate to={isNativeApp() ? '/app' : '/'} replace />} />
    </Routes>
  );
}
