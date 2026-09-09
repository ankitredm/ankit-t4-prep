import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StoryService } from '../../services/story/StoryService.js';
import { db } from '../../core/database/db.js';
import { coverForStory } from '../../services/media/MediaService.js';
import AppShell from '../nav/AppShell.jsx';

export default function Home({ profile }) {
  const [stories, setStories] = useState(null);
  const [convs, setConvs] = useState({});
  const [genre, setGenre] = useState('All');
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
      if (live) {
        setStories(list);
        setConvs(map);
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  const genres = useMemo(() => {
    if (!stories) return ['All'];
    return ['All', ...Array.from(new Set(stories.map((s) => s.genre)))];
  }, [stories]);

  const featured = stories?.[0];
  const continues = stories?.filter((s) => convs[s.id]) || [];
  const filtered = (stories || []).filter((s) => genre === 'All' || s.genre === genre || (s.tags || []).includes(genre));

  return (
    <AppShell>
      <header className="topbar">
        <div className="brand">
          <img src={`${import.meta.env.BASE_URL}brand/afterlight-logo.png`} alt="" className="brand-mark" />
          Afterlight
        </div>
        <button className="icon-btn" aria-label="Settings" onClick={() => nav('/app/settings')}>
          ⚙
        </button>
      </header>
      <main className="home page-in">
        <p className="sub hello">Hello, {profile.name}.</p>

        {stories === null && <p className="sub">Opening tonight’s collection…</p>}

        {featured && (
          <section className="featured card-enter">
            <img src={coverForStory(featured)} alt="" className="featured-img" />
            <div className="featured-shade">
              <span className="pill">{featured.genre}</span>
              <h2>{featured.title}</h2>
              <p>{featured.hook}</p>
              <button className="btn" onClick={() => nav(`/app/story/${featured.id}`)}>
                {convs[featured.id] ? 'Continue chat' : 'Start chat'}
              </button>
            </div>
          </section>
        )}

        {continues.length > 0 && (
          <section>
            <h3 className="rail-title">Continue chat</h3>
            <div className="h-scroll">
              {continues.map((s) => (
                <button key={s.id} className="rail-card" onClick={() => nav(`/app/play/${s.id}`)}>
                  <img src={coverForStory(s)} alt="" />
                  <span>{s.title}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="h-scroll chips" role="tablist" aria-label="Genres">
          {genres.map((g) => (
            <button key={g} className={g === genre ? 'chip on' : 'chip'} onClick={() => setGenre(g)}>
              {g}
            </button>
          ))}
        </div>

        <h3 className="rail-title">Tonight’s collection</h3>
        {stories && stories.length === 0 && <p className="sub">No stories on the shelf yet.</p>}
        <div className="story-grid">
          {filtered.map((s, i) => (
            <button key={s.id} className="story-card card-enter" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }} onClick={() => nav(`/app/story/${s.id}`)}>
              <div className="cover img-cover" style={{ backgroundImage: `url(${coverForStory(s)})` }}>
                <span>{s.genre}</span>
              </div>
              <div className="body">
                <h3>{s.title}</h3>
                <p className="hook">{s.hook}</p>
                <div className="mood">
                  {s.mood} · {convs[s.id] ? 'Continue' : 'New story'}
                </div>
              </div>
            </button>
          ))}
        </div>
      </main>
    </AppShell>
  );
}
