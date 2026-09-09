import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { db, ensureSeeded } from './core/database/db.js';
import Landing from './landing/Landing.jsx';
import Onboarding from './features/onboarding/Onboarding.jsx';
import Home from './features/home/Home.jsx';
import Chat from './features/chat/Chat.jsx';
import Settings from './features/settings/Settings.jsx';
import Admin from './features/admin/Admin.jsx';
import StoryDetail from './features/stories/StoryDetail.jsx';
import Search from './features/search/Search.jsx';
import Chats from './features/chats/Chats.jsx';

function WorkshopGate({ children }) {
  if (sessionStorage.getItem('afterlight_workshop') !== '1') {
    return <Navigate to="/app/settings" replace />;
  }
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

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
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
      <Route path="/app/search" element={profile ? <Search /> : <Navigate to="/app/welcome" />} />
      <Route path="/app/chats" element={profile ? <Chats /> : <Navigate to="/app/welcome" />} />
      <Route
        path="/app/story/:id"
        element={profile ? <StoryDetail profile={profile} /> : <Navigate to="/app/welcome" />}
      />
      <Route
        path="/app/play/:storyId"
        element={profile ? <Chat profile={profile} /> : <Navigate to="/app/welcome" />}
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
    </Routes>
  );
}
