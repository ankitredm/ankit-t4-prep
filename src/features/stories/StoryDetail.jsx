import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../../core/database/db.js';
import { StoryService } from '../../services/story/StoryService.js';
import { mediaForStory, withBase } from '../../services/media/MediaService.js';
import { generateScene, canGenerate } from '../../services/image/ImageService.js';
import AppShell from '../nav/AppShell.jsx';

function goBack(nav) {
  // Prefer in-app history, but never strand the user outside the app.
  if (typeof window !== 'undefined' && window.history?.state?.idx > 0) nav(-1);
  else nav('/app', { replace: true });
}

export default function StoryDetail() {
  const { id } = useParams();
  const [story, setStory] = useState(null);
  const [chars, setChars] = useState([]);
  const [media, setMedia] = useState([]);
  const [has, setHas] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [missing, setMissing] = useState(false);
  const [genQuota, setGenQuota] = useState(true);
  const [genState, setGenState] = useState('idle');
  const [latestScene, setLatestScene] = useState(null);
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
      setGenQuota(await canGenerate());
    })();
    return () => {
      live = false;
    };
  }, [id]);

  async function sceneFromDetail() {
    if (genState === 'busy' || !story) return;
    setGenState('busy');
    setLatestScene(null);
    try {
      const conv = await StoryService.openConversation(id);
      const state = await db.storyState.where('conversationId').equals(conv.id).first();
      const characters = await db.characters.where('storyId').equals(id).toArray();
      const presentNames = new Set(state?.present || []);
      const presentChars = presentNames.size
        ? characters.filter((c) => presentNames.has(c.name))
        : characters;
      const visuals = [];
      for (const c of presentChars) {
        const v = await db.visualProfiles.where('characterId').equals(c.id).first();
        if (v) visuals.push(v);
      }
      const res = await generateScene({
        conversationId: conv.id,
        story,
        state,
        characters: presentChars,
        visuals,
      });
      if (res.ok) {
        setGenState('ok');
        setLatestScene(res.rec?.url || null);
        setHas(true);
      } else {
        setGenState(res.reason === 'limit' ? 'limit' : 'err');
      }
      setGenQuota(await canGenerate());
    } catch {
      setGenState('err');
    }
    setTimeout(() => setGenState((g) => (g === 'busy' ? 'idle' : g)), 2200);
  }

  if (missing) {
    return (
      <AppShell>
        <header className="app-top">
          <button className="icon-btn" aria-label="Back" onClick={() => goBack(nav)}>
            ←
          </button>
          <h1 className="app-title sm">Story</h1>
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
  const heroSrc = withBase(covers[0]?.url || story.coverUrl);
  const info = [
    ['Setting', story.setting],
    ['Objective', story.objective],
    ['Opens at', story.startingLocation],
    ['Tone', story.tone || story.mood],
  ].filter(([, v]) => v);

  return (
    <AppShell>
      <div className="detail-hero">
        {heroSrc ? (
          <img src={heroSrc} alt="" className="detail-hero-img" />
        ) : (
          <div className="hero-story-empty detail-hero-img" aria-hidden="true" />
        )}
        <div className="detail-hero-shade" />
        <header className="detail-top">
          <button className="icon-btn glass" aria-label="Back" onClick={() => goBack(nav)}>
            ←
          </button>
          <span className="topbar-spacer" />
        </header>
        <div className="detail-hero-text page-in">
          <div className="tag-row">
            <span className="pill pill-gold">{story.genre}</span>
            {(story.tags || [])
              .filter((t) => t !== story.genre)
              .slice(0, 3)
              .map((t) => (
                <span className="pill" key={t}>
                  {t}
                </span>
              ))}
          </div>
          <h1>{story.title}</h1>
          {story.mood && <p className="detail-mood">{story.mood}</p>}
        </div>
      </div>

      <main className="app-main detail-main page-in">
        <div className="cta-duo">
          <button
            className="btn cta-primary"
            onClick={async () => {
              await StoryService.openConversation(id);
              nav(`/app/play/${id}`);
            }}
          >
            {has ? 'Continue story' : 'Start story'}
          </button>
          <button
            className="btn ghost cta-scene"
            onClick={sceneFromDetail}
            disabled={genState === 'busy' || !genQuota}
            title={
              genQuota
                ? 'Generate an image of the current moment'
                : 'Daily scene limit reached'
            }
          >
            {genState === 'busy' ? 'Composing…' : '◈ Scene'}
          </button>
        </div>
        {genState === 'err' && (
          <p className="warn center">
            The image did not hold. Quota unchanged — connect an image provider in Settings.
          </p>
        )}
        {genState === 'limit' && (
          <p className="warn center">Daily scene limit reached. New scenes tomorrow.</p>
        )}
        {genState === 'ok' && latestScene && (
          <button className="latest-scene" onClick={() => nav(`/app/play/${id}`)}>
            <img src={withBase(latestScene)} alt="Newly generated scene" />
            <span>
              <strong>Scene composed</strong>
              <em>View it in the story →</em>
            </span>
          </button>
        )}

        <section className="detail-card">
          <h3>About this story</h3>
          <p className="detail-premise">{story.premise || story.hook}</p>
        </section>

        {info.length > 0 && (
          <section className="detail-card">
            <h3>Story information</h3>
            <dl className="info-list">
              {info.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {chars.length > 0 && (
          <section>
            <h3 className="rail-title">People in the dark</h3>
            <div className="h-scroll snap">
              {chars.map((c) => {
                const pic = withBase(
                  c.portraitUrl || portraits.find((p) => p.characterId === c.id)?.url
                );
                return (
                  <article className="char-card" key={c.id}>
                    {pic ? <img src={pic} alt="" loading="lazy" /> : <div className="char-ph" />}
                    <strong>{c.name}</strong>
                    <span>{c.personality}</span>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {scenes.length > 0 && (
          <section>
            <h3 className="rail-title">Scene stills</h3>
            <div className="media-grid">
              {scenes.map((m) => (
                <button
                  key={m.id}
                  className="media-tile"
                  onClick={() => setLightbox(m)}
                  aria-label={`View ${m.title || 'scene'}`}
                >
                  <img src={withBase(m.url)} alt={m.title || 'Scene'} loading="lazy" />
                  <span>{m.title}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {portraits.length > 0 && (
          <section>
            <h3 className="rail-title">Characters</h3>
            <div className="media-grid">
              {portraits.map((m) => (
                <button
                  key={m.id}
                  className="media-tile"
                  onClick={() => setLightbox(m)}
                  aria-label={`View ${m.title || 'portrait'}`}
                >
                  <img src={withBase(m.url)} alt={m.title || 'Portrait'} loading="lazy" />
                  <span>{m.title}</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      {lightbox && (
        <div
          className="lightbox"
          role="dialog"
          aria-label={lightbox.title || 'Image'}
          onClick={() => setLightbox(null)}
        >
          <figure onClick={(e) => e.stopPropagation()}>
            <img src={withBase(lightbox.url)} alt={lightbox.title || ''} />
            <figcaption>
              {lightbox.title}
              {lightbox.location ? ` · ${lightbox.location}` : ''}
              {lightbox.moment ? ` — ${lightbox.moment}` : ''}
            </figcaption>
            <button className="btn ghost" onClick={() => setLightbox(null)}>
              Close
            </button>
          </figure>
        </div>
      )}
    </AppShell>
  );
}
