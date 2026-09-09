import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../core/database/db.js';
import { coverForStory } from '../../services/media/MediaService.js';
import AppShell from '../nav/AppShell.jsx';

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
      <header className="topbar">
        <h1>Chats</h1>
      </header>
      <main className="home page-in">
        {rows === null && <p className="sub">Loading threads…</p>}
        {rows && rows.length === 0 && <p className="sub">No conversations yet. Open a story and begin.</p>}
        <ul className="chat-list">
          {rows?.map(({ conv, story }) => (
            <li key={conv.id}>
              <button className="chat-row" onClick={() => nav(`/app/play/${story.id}`)}>
                <img src={coverForStory(story)} alt="" className="thumb" />
                <span>
                  <strong>{story.title}</strong>
                  <em>{story.genre}</em>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </main>
    </AppShell>
  );
}
