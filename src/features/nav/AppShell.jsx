import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

export default function AppShell({ children, hideNav }) {
  const loc = useLocation();
  const chat = loc.pathname.startsWith('/app/play');
  const show = !hideNav && !chat && !loc.pathname.startsWith('/app/admin') && loc.pathname !== '/app/welcome';

  return (
    <div className={`shell ${show ? 'has-tabbar' : ''}`}>
      {children}
      {show && (
        <nav className="tabbar" aria-label="Main">
          <NavLink to="/app" end className={({ isActive }) => (isActive ? 'tab on' : 'tab')}>
            <span className="tab-ico" aria-hidden>⌂</span>
            Home
          </NavLink>
          <NavLink to="/app/search" className={({ isActive }) => (isActive ? 'tab on' : 'tab')}>
            <span className="tab-ico" aria-hidden>⌕</span>
            Search
          </NavLink>
          <NavLink to="/app/chats" className={({ isActive }) => (isActive ? 'tab on' : 'tab')}>
            <span className="tab-ico" aria-hidden>◈</span>
            Chats
          </NavLink>
        </nav>
      )}
    </div>
  );
}
