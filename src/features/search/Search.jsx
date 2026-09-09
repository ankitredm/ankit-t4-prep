import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../core/database/db.js';
import { coverForStory } from '../../services/media/MediaService.js';
import AppShell from '../nav/AppShell.jsx';

export default function Search() {
  const [q, setQ] = useState('');
  const [stories, setStories] = useState([]);
  const [genre, setGenre] = useState('All');
  const nav = useNavigate();

  useEffect(() => {
    db.stories.toArray().then((s) => setStories(s.filter((x) => x.enabled !== false)));
  }, []);

  const genres = useMemo(() => ['All', ...Array.from(new Set(stories.map((s) => s.genre)))], [stories]);

  const list = stories.filter((s) => {
    const hit = !q.trim() || `${s.title} ${s.genre} ${s.hook} ${(s.tags || []).join(' ')}`.toLowerCase().includes(q.toLowerCase());
    const g = genre === 'All' || s.genre === genre || (s.tags || []).includes(genre);
    return hit && g;
  });

  return (
    <AppShell>
      <header className="topbar">
        <h1>Search</h1>
      </header>
      <main className="home page-in">
        <input
          className="search-box"
          placeholder="Titles, genres, moods…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search stories"
        />
        <div className="h-scroll chips" role="tablist">
          {genres.map((g) => (
            <button key={g} className={g === genre ? 'chip on' : 'chip'} onClick={() => setGenre(g)}>
              {g}
            </button>
          ))}
        </div>
        {list.length === 0 && <p className="sub">Nothing matches yet.</p>}
        <div className="story-grid">
          {list.map((s) => (
            <button key={s.id} className="story-card" onClick={() => nav(`/app/story/${s.id}`)}>
              <div className="cover img-cover" style={{ backgroundImage: `url(${coverForStory(s)})` }}>
                <span>{s.genre}</span>
              </div>
              <div className="body">
                <h3>{s.title}</h3>
                <p className="hook">{s.hook}</p>
              </div>
            </button>
          ))}
        </div>
      </main>
    </AppShell>
  );
}
