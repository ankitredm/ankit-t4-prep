import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../../core/database/db.js';
import { StoryService } from '../../services/story/StoryService.js';
import { mediaForStory } from '../../services/media/MediaService.js';
import AppShell from '../nav/AppShell.jsx';

export default function StoryDetail() {
  const { id } = useParams();
  const [story, setStory] = useState(null);
  const [chars, setChars] = useState([]);
  const [media, setMedia] = useState([]);
  const [has, setHas] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [missing, setMissing] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    let live = true;
    (async () => {
      const s = await db.stories.get(id);
      if (!live) return;
      if (!s) {
        setMissing(true);
        setStory(null);
        return;
      }
      const c = await db.characters.where('storyId').equals(id).toArray();
      const m = await mediaForStory(id);
      const conv = await db.conversations.where('storyId').equals(id).first();
      if (!live) return;
      setMissing(false);
      setStory(s);
      setChars(c);
      setMedia(m);
      setHas(!!conv);
    })();
    return () => {
      live = false;
    };
  }, [id]);

  if (missing) {
    return (
      <AppShell>
        <header className="topbar">
          <button className="icon-btn" aria-label="Back" onClick={() => nav('/app')}>←</button>
          <h1>Story</h1>
          <span className="topbar-spacer" />
        </header>
        <p className="sub" style={{ padding: 24 }}>
          This story is not in the local library.
        </p>
      </AppShell>
    );
  }

  if (!story) {
    return (
      <AppShell>
        <p className="sub" style={{ padding: 24 }}>
          Loading story…
        </p>
      </AppShell>
    );
  }

  const scenes = media.filter((m) => m.kind === 'scene');
  const portraits = media.filter((m) => m.kind === 'portrait');
  const covers = media.filter((m) => m.kind === 'cover');

  return (
    <AppShell>
      <header className="topbar">
        <button className="icon-btn" aria-label="Back" onClick={() => nav('/app')}>
          ←
        </button>
        <h1>{story.title}</h1>
        <span className="topbar-spacer" />
      </header>
      <main className="detail page-in">
        <div className="hero-story">
          {(covers[0]?.url || story.coverUrl) ? (
            <img src={covers[0]?.url || story.coverUrl} alt="" />
          ) : (
            <div className="hero-story-empty" aria-hidden="true" />
          )}
          <div className="hero-story-shade">
            <div className="tag-row">
              <span className="pill">{story.genre}</span>
              {(story.tags || []).filter((t) => t !== story.genre).map((t) => (
                <span className="pill" key={t}>
                  {t}
                </span>
              ))}
            </div>
            <h2>{story.title}</h2>
          </div>
        </div>

        <section>
          <h3>About</h3>
          <p className="lede">{story.premise}</p>
          {story.mood && <p className="mood">{story.mood}</p>}
        </section>

        {chars.length > 0 && (
          <section>
            <h3>People in the dark</h3>
            <div className="h-scroll">
              {chars.map((c) => {
                const pic = c.portraitUrl || portraits.find((p) => p.characterId === c.id)?.url;
                return (
                  <article className="char-card" key={c.id}>
                    {pic ? <img src={pic} alt="" /> : <div className="char-ph" />}
                    <strong>{c.name}</strong>
                    <span>{c.personality}</span>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        <section>
          <h3>Media library</h3>
          <h4 className="rail-title">Cover</h4>
          {covers.length === 0 && <p className="lede">No cover in this story’s library yet.</p>}
          <div className="media-grid">
            {covers.map((m) => (
              <button key={m.id} className="media-tile" onClick={() => setLightbox(m)}>
                <img src={m.url} alt={m.title || 'Cover'} />
                <span>{m.title || 'Cover'}</span>
              </button>
            ))}
          </div>
          <h4 className="rail-title">Characters</h4>
          {portraits.length === 0 && <p className="lede">No character stills in this library yet.</p>}
          <div className="media-grid">
            {portraits.map((m) => (
              <button key={m.id} className="media-tile" onClick={() => setLightbox(m)}>
                <img src={m.url} alt={m.title || 'Portrait'} />
                <span>{m.title}</span>
              </button>
            ))}
          </div>
          <h4 className="rail-title">Scene stills</h4>
          {scenes.length === 0 && <p className="lede">No curated scenes yet.</p>}
          <div className="media-grid">
            {scenes.map((m) => (
              <button key={m.id} className="media-tile" onClick={() => setLightbox(m)}>
                <img src={m.url} alt={m.title || 'Scene'} />
                <span>{m.title}</span>
              </button>
            ))}
          </div>
        </section>

        <button
          className="btn cta-sticky"
          onClick={async () => {
            await StoryService.openConversation(id);
            nav(`/app/play/${id}`);
          }}
        >
          {has ? 'Continue chat' : 'Start chat'}
        </button>
      </main>

      {lightbox && (
        <div className="lightbox" role="dialog" onClick={() => setLightbox(null)}>
          <img src={lightbox.url} alt={lightbox.title || ''} />
          <p>
            {lightbox.title}
            {lightbox.location ? ` · ${lightbox.location}` : ''}
            {lightbox.moment ? ` — ${lightbox.moment}` : ''}
          </p>
        </div>
      )}
    </AppShell>
  );
}
