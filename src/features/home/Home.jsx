import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StoryService } from '../../services/story/StoryService.js';
import { db } from '../../core/database/db.js';
import { coverSrc } from '../../services/media/MediaService.js';
import AppShell from '../nav/AppShell.jsx';

function greetingFor(date = new Date()) {
  const h = date.getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function clampProgress(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export default function Home({ profile }) {
  const [stories, setStories] = useState(null);
  const [convs, setConvs] = useState({});
  const [progress, setProgress] = useState({});
  const nav = useNavigate();

  useEffect(() => {
    let live = true;
    (async () => {
      const list = await StoryService.homeStories();
      const all = await db.conversations.toArray();
      const map = {};
      all.forEach((c) => {
        map[c.storyId] = c;
      });
      const prog = {};
      for (const c of all) {
        try {
          const st = await db.storyState.where('conversationId').equals(c.id).first();
          if (st) prog[c.storyId] = clampProgress(st.mysteryProgress);
        } catch {
          /* progress is decorative — never block home */
        }
      }
      if (live) {
        setStories(list);
        setConvs(map);
        setProgress(prog);
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  const genres = useMemo(() => {
    if (!stories) return [];
    return Array.from(new Set(stories.map((s) => s.genre).filter(Boolean))).slice(0, 12);
  }, [stories]);

  const recent = useMemo(() => {
    if (!stories) return [];
    return stories
      .filter((s) => convs[s.id])
      .map((s) => ({ story: s, conv: convs[s.id] }))
      .sort((a, b) => (b.conv.updatedAt || 0) - (a.conv.updatedAt || 0));
  }, [stories, convs]);

  const featured = useMemo(() => (stories || []).slice(0, 5), [stories]);
  const continueEntry = recent[0] || null;

  const initial = (profile?.name || 'A').trim().charAt(0).toUpperCase() || 'A';

  return (
    <AppShell>
      <header className="app-top">
        <div className="app-brand">
          <img
            src={`${import.meta.env.BASE_URL}brand/afterlight-logo.png`}
            alt=""
            className="app-brand-mark"
          />
          <span>Afterlight</span>
        </div>
        <button
          className="avatar-btn"
          aria-label="Open settings"
          onClick={() => nav('/app/settings')}
        >
          {initial}
        </button>
      </header>

      <main className="app-main page-in">
        <p className="eyebrow">Tonight in Afterlight</p>
        <h1 className="greeting">
          {greetingFor()}, {profile?.name || 'traveler'}
        </h1>

        {stories === null && <p className="sub">Opening tonight’s collection…</p>}

        {continueEntry && (
          <section aria-label="Continue story" className="continue-sec">
            <div className="continue-card card-enter">
              <img
                src={coverSrc(continueEntry.story)}
                alt=""
                className="continue-cover"
              />
              <div className="continue-shade">
                <span className="pill pill-gold">Continue story</span>
                <h2>{continueEntry.story.title}</h2>
                <p className="continue-meta">
                  {continueEntry.story.genre}
                  {typeof progress[continueEntry.story.id] === 'number'
                    ? ` · ${progress[continueEntry.story.id]}% explored`
                    : ''}
                </p>
                <div
                  className="progress"
                  role="progressbar"
                  aria-valuenow={progress[continueEntry.story.id] || 0}
                  aria-valuemin="0"
                  aria-valuemax="100"
                  aria-label="Story progress"
                >
                  <i style={{ width: `${progress[continueEntry.story.id] || 0}%` }} />
                </div>
                <button
                  className="btn continue-btn"
                  onClick={() => nav(`/app/play/${continueEntry.story.id}`)}
                >
                  Continue
                  <span aria-hidden> →</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {featured.length > 0 && (
          <section aria-label="Featured stories">
            <div className="rail-head">
              <h3 className="rail-title">Featured stories</h3>
              <button className="link-btn" onClick={() => nav('/app/stories')}>
                Browse all →
              </button>
            </div>
            <div className="h-scroll snap">
              {featured.map((s, i) => (
                <button
                  key={s.id}
                  className="feat-card card-enter"
                  style={{ animationDelay: `${Math.min(i, 6) * 50}ms` }}
                  onClick={() => nav(`/app/story/${s.id}`)}
                >
                  <img src={coverSrc(s)} alt="" loading="lazy" />
                  <span className="feat-shade">
                    <span className="pill">{s.genre}</span>
                    <strong>{s.title}</strong>
                    <em>{convs[s.id] ? `${progress[s.id] || 0}% · Continue` : 'New story'}</em>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {recent.length > 1 && (
          <section aria-label="Recently played">
            <h3 className="rail-title">Recently played</h3>
            <div className="h-scroll">
              {recent.slice(1, 7).map(({ story }) => (
                <button
                  key={story.id}
                  className="rail-card"
                  onClick={() => nav(`/app/play/${story.id}`)}
                >
                  <img src={coverSrc(story)} alt="" loading="lazy" />
                  <span>{story.title}</span>
                  <span className="rail-sub">{progress[story.id] || 0}% explored</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {genres.length > 0 && (
          <section aria-label="Genres">
            <h3 className="rail-title">Genres</h3>
            <div className="genre-grid">
              {genres.map((g) => (
                <button
                  key={g}
                  className="genre-tile"
                  onClick={() => nav(`/app/stories?genre=${encodeURIComponent(g)}`)}
                >
                  {g}
                </button>
              ))}
            </div>
          </section>
        )}

        {stories && stories.length === 0 && (
          <p className="sub">No stories on the shelf yet.</p>
        )}
      </main>
    </AppShell>
  );
}
