import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../core/database/db.js';
import { coverSrc } from '../../services/media/MediaService.js';
import AppShell from '../nav/AppShell.jsx';

function relativeTime(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'yesterday';
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

export default function Chats() {
  const [rows, setRows] = useState(null);
  const nav = useNavigate();

  useEffect(() => {
    (async () => {
      const convs = await db.conversations.orderBy('updatedAt').reverse().toArray();
      const out = [];
      for (const c of convs) {
        const story = await db.stories.get(c.storyId);
        if (!story) continue;
        out.push({ conv: c, story });
      }
      setRows(out);
    })();
  }, []);

  return (
    <AppShell>
      <header className="app-top">
        <h1 className="app-title">Chats</h1>
        {rows && rows.length > 0 && <span className="count-pill">{rows.length}</span>}
      </header>
      <main className="app-main page-in">
        {rows === null && <p className="sub">Loading threads…</p>}
        {rows && rows.length === 0 && (
          <div className="empty-card">
            <p className="empty-title">No conversations yet.</p>
            <p className="sub">Open a story and speak your first line.</p>
            <button className="btn" onClick={() => nav('/app/stories')}>
              Browse stories
            </button>
          </div>
        )}
        <ul className="chat-list">
          {rows?.map(({ conv, story }) => (
            <li key={conv.id}>
              <button className="chat-row" onClick={() => nav(`/app/play/${story.id}`)}>
                <img src={coverSrc(story)} alt="" className="thumb" loading="lazy" />
                <span className="chat-row-body">
                  <strong>{story.title}</strong>
                  <em>
                    {story.genre}
                    {conv.updatedAt ? ` · ${relativeTime(conv.updatedAt)}` : ''}
                  </em>
                </span>
                <span className="chev" aria-hidden>
                  ›
                </span>
              </button>
            </li>
          ))}
        </ul>
      </main>
    </AppShell>
  );
}
