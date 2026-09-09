import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '../../core/database/db.js';
import { coverSrc } from '../../services/media/MediaService.js';
import AppShell from '../nav/AppShell.jsx';

function clampProgress(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export default function Stories() {
  const [q, setQ] = useState('');
  const [stories, setStories] = useState(null);
  const [started, setStarted] = useState({});
  const [progress, setProgress] = useState({});
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();

  const genre = params.get('genre') || 'All';

  useEffect(() => {
    let live = true;
    (async () => {
      const s = await db.stories.toArray();
      const enabled = s.filter((x) => x.enabled !== false);
      const convs = await db.conversations.toArray();
      const map = {};
      const prog = {};
      for (const c of convs) {
        map[c.storyId] = true;
        try {
          const st = await db.storyState.where('conversationId').equals(c.id).first();
          if (st) prog[c.storyId] = clampProgress(st.mysteryProgress);
        } catch {
          /* decorative */
        }
      }
      if (!live) return;
      setStories(enabled);
      setStarted(map);
      setProgress(prog);
    })();
    return () => {
      live = false;
    };
  }, []);

  const genres = useMemo(
    () => ['All', ...Array.from(new Set((stories || []).map((s) => s.genre).filter(Boolean)))],
    [stories]
  );

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (stories || []).filter((s) => {
      const hit =
        !needle ||
        `${s.title} ${s.genre} ${s.hook} ${(s.tags || []).join(' ')}`
          .toLowerCase()
          .includes(needle);
      const g = genre === 'All' || s.genre === genre || (s.tags || []).includes(genre);
      return hit && g;
    });
  }, [stories, q, genre]);

  function pickGenre(g) {
    if (g === 'All') setParams({}, { replace: true });
    else setParams({ genre: g }, { replace: true });
  }

  return (
    <AppShell>
      <header className="app-top">
        <h1 className="app-title">Stories</h1>
        {stories && <span className="count-pill">{list.length}</span>}
      </header>

      <main className="app-main page-in">
        <div className="search-wrap">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
            <path
              d="M11 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM16 16l4.5 4.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          <input
            className="search-input"
            placeholder="Titles, genres, moods…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search stories"
            enterKeyHint="search"
          />
          {q && (
            <button className="clear-btn" aria-label="Clear search" onClick={() => setQ('')}>
              ✕
            </button>
          )}
        </div>

        <div className="h-scroll chips" role="tablist" aria-label="Filter by genre">
          {genres.map((g) => (
            <button
              key={g}
              role="tab"
              aria-selected={g === genre}
              className={g === genre ? 'chip on' : 'chip'}
              onClick={() => pickGenre(g)}
            >
              {g}
            </button>
          ))}
        </div>

        {stories === null && <p className="sub">Gathering the library…</p>}
        {stories !== null && list.length === 0 && (
          <div className="empty-card">
            <p className="empty-title">Nothing matches yet.</p>
            <p className="sub">Try another title, mood, or genre.</p>
            {(q || genre !== 'All') && (
              <button
                className="btn ghost"
                onClick={() => {
                  setQ('');
                  pickGenre('All');
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        <div className="story-list">
          {list.map((s, i) => (
            <button
              key={s.id}
              className="story-row card-enter"
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
              onClick={() => nav(`/app/story/${s.id}`)}
            >
              <img src={coverSrc(s)} alt="" className="story-thumb" loading="lazy" />
              <span className="story-row-body">
                <strong>{s.title}</strong>
                <em>
                  {s.genre}
                  {s.mood ? ` · ${s.mood}` : ''}
                </em>
                <span className="story-hook">{s.hook}</span>
                {started[s.id] ? (
                  <span className="mini-progress">
                    <span className="progress slim" aria-hidden="true">
                      <i style={{ width: `${progress[s.id] || 0}%` }} />
                    </span>
                    <span className="mini-progress-label">
                      {progress[s.id] || 0}% · Continue
                    </span>
                  </span>
                ) : (
                  <span className="mini-progress-label new">New story</span>
                )}
              </span>
              <span className="chev" aria-hidden>
                ›
              </span>
            </button>
          ))}
        </div>
      </main>
    </AppShell>
  );
}
