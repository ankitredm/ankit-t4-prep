import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import useNavVisibility from './useNavVisibility.js';

function Icon({ d }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const ICONS = {
  home: 'M4 11.5 12 4l8 7.5M6 10.5V20h12v-9.5M10 20v-5.5h4V20',
  stories: 'M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15.5H7.5A2.5 2.5 0 0 0 5 21zM5 5.5v15.5M19 18.5H7.5A2.5 2.5 0 0 0 5 21M9.5 7.5h6',
  chats: 'M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H9l-5 4zM8 9.5h8M8 12.5h5',
  settings:
    'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19 12a7 7 0 0 0-.14-1.4l2-1.55-2-3.46-2.36.95a7 7 0 0 0-2.42-1.4L13.7 1.6h-3.4l-.38 2.54a7 7 0 0 0-2.42 1.4l-2.36-.95-2 3.46 2 1.55a7 7 0 0 0 0 2.8l-2 1.55 2 3.46 2.36-.95a7 7 0 0 0 2.42 1.4l.38 2.54h3.4l.38-2.54a7 7 0 0 0 2.42-1.4l2.36.95 2-3.46-2-1.55c.1-.46.14-.93.14-1.4z',
};

const TABS = [
  { to: '/app', end: true, label: 'Home', icon: 'home' },
  { to: '/app/stories', label: 'Stories', icon: 'stories' },
  { to: '/app/chats', label: 'Chats', icon: 'chats' },
  { to: '/app/settings', label: 'Settings', icon: 'settings' },
];

function Tab({ to, end, label, icon }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => (isActive ? 'tab on' : 'tab')}
      aria-label={label}
    >
      {({ isActive }) => (
        <>
          <span className="tab-ico" aria-hidden="true">
            <Icon d={ICONS[icon]} />
          </span>
          <span className="tab-label">{label}</span>
          <span className="tab-dot" aria-hidden="true" />
          {isActive && <span className="sr-only">(current)</span>}
        </>
      )}
    </NavLink>
  );
}

/**
 * Mobile application chrome for /app/*.
 *
 * The bottom tab bar is a single, non-wrapping row of four equal tabs. It
 * slides away while the user scrolls down and returns as soon as they scroll
 * up (or reach the top). Immersive routes — the reader, the workshop and
 * onboarding — render without it so the chat composer is never covered.
 */
export default function AppShell({ children, hideNav }) {
  const loc = useLocation();
  const immersive =
    loc.pathname.startsWith('/app/play') ||
    loc.pathname.startsWith('/app/admin') ||
    loc.pathname === '/app/welcome';
  const show = !hideNav && !immersive;
  const hidden = useNavVisibility({ enabled: show });

  return (
    <div className={`shell app-shell ${show ? 'has-tabbar' : ''}`}>
      {children}
      {show && (
        <nav
          className={`tabbar${hidden ? ' tabbar-hidden' : ''}`}
          aria-label="Main"
          data-state={hidden ? 'hidden' : 'visible'}
          aria-hidden={hidden ? 'true' : undefined}
        >
          {TABS.map((t) => (
            <Tab key={t.to} {...t} />
          ))}
        </nav>
      )}
    </div>
  );
}
