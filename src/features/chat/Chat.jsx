import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../../core/database/db.js';
import { StoryService } from '../../services/story/StoryService.js';
import { generateScene, canGenerate } from '../../services/image/ImageService.js';
import { withBase, coverSrc } from '../../services/media/MediaService.js';
import { parseStoryParts } from '../../core/ai/parseStory.js';

function suggestionsFor(present) {
  const first = present?.[0];
  const out = ['Look around'];
  if (first) out.push(`Ask ${first}`);
  out.push('Stay quiet');
  out.push('What happened here?');
  return out.slice(0, 4);
}

export default function Chat({ profile }) {
  const { storyId } = useParams();
  const nav = useNavigate();
  const [story, setStory] = useState(null);
  const [conv, setConv] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [showGen, setShowGen] = useState(true);
  const [genState, setGenState] = useState('idle');
  const [portraits, setPortraits] = useState({});
  const [present, setPresent] = useState([]);
  const [draftParts, setDraftParts] = useState(null);
  const [missing, setMissing] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const end = useRef(null);
  const threadRef = useRef(null);
  const sending = useRef(false);

  async function reload(conversationId) {
    setMsgs(await StoryService.messages(conversationId));
    setShowGen(await canGenerate());
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await db.stories.get(storyId);
      const chars = await db.characters.where('storyId').equals(storyId).toArray();
      const map = {};
      chars.forEach((c) => {
        if (c.portraitUrl) map[c.name] = withBase(c.portraitUrl);
      });
      if (cancelled) return;
      setStory(s || null);
      setPortraits(map);
      if (!s) {
        setMissing(true);
        return;
      }
      setMissing(false);
      const c = await StoryService.openConversation(storyId);
      if (cancelled) return;
      setConv(c);
      const st = await db.storyState.where('conversationId').equals(c.id).first();
      if (!cancelled && st?.present?.length) setPresent(st.present);
      await reload(c.id);
    })();
    return () => {
      cancelled = true;
    };
  }, [storyId]);

  function scrollToEnd(smooth = true) {
    try {
      end.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'end' });
    } catch {
      threadRef.current?.scrollTo?.({ top: 1e9, behavior: smooth ? 'smooth' : 'auto' });
    }
  }

  useEffect(() => {
    scrollToEnd(true);
  }, [msgs, typing, genState, draftParts]);

  /* When the Android keyboard opens, the resized viewport must keep the
   * composer visible and the latest lines reachable. */
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return undefined;
    const onResize = () => scrollToEnd(false);
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, []);

  async function send(raw) {
    const t = (raw ?? text).trim();
    if (!t || !conv || sending.current) return;
    sending.current = true;
    setText('');
    setTyping(true);
    setDraftParts(null);
    // Instant paint of the user's own line happens on reload; scroll now so
    // the composer never feels stuck while the reply streams in.
    requestAnimationFrame(() => scrollToEnd(false));
    try {
      await StoryService.sendUserMessage({
        conversationId: conv.id,
        storyId,
        text: t,
        profile,
        onDelta: (full) => setDraftParts(parseStoryParts(full)),
      });
      setDraftParts(null);
      await reload(conv.id);
      const st = await db.storyState.where('conversationId').equals(conv.id).first();
      if (st?.present?.length) setPresent(st.present);
    } finally {
      setTyping(false);
      sending.current = false;
    }
  }

  async function scene() {
    if (!conv || !showGen || genState === 'busy') return;
    setGenState('busy');
    try {
      const state = await db.storyState.where('conversationId').equals(conv.id).first();
      const characters = await db.characters.where('storyId').equals(storyId).toArray();
      const presentNames = new Set(state?.present || []);
      const presentChars = presentNames.size ? characters.filter((c) => presentNames.has(c.name)) : characters;
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
        await reload(conv.id);
      } else {
        setGenState(res.reason === 'limit' ? 'idle' : 'err');
        setShowGen(await canGenerate());
      }
    } catch {
      setGenState('err');
    }
    setTimeout(() => setGenState('idle'), 1600);
  }

  const lastFew = useMemo(() => msgs, [msgs]);
  const choices = useMemo(() => suggestionsFor(present), [present]);

  if (missing) {
    return (
      <div className="chat reader">
        <header className="reader-top">
          <button className="icon-btn glass" aria-label="Back" onClick={() => nav('/app')}>
            ←
          </button>
          <h1>Story</h1>
          <span className="topbar-spacer" />
        </header>
        <p className="sub" style={{ padding: 24 }}>
          This story is not in the local library.
        </p>
      </div>
    );
  }

  return (
    <div className="chat reader">
      <header className="reader-top">
        <button
          className="icon-btn glass"
          aria-label="Back to story"
          onClick={() => nav(`/app/story/${storyId}`)}
        >
          ←
        </button>
        <button className="reader-title" onClick={() => nav(`/app/story/${storyId}`)}>
          {story && <img src={coverSrc(story)} alt="" className="reader-cover" />}
          <span>
            <strong>{story?.title || 'Story'}</strong>
            {present.length > 0 && <em>with {present.slice(0, 2).join(' · ')}</em>}
          </span>
        </button>
        {showGen ? (
          <button
            className="icon-btn glass"
            aria-label="Generate scene image"
            title="Generate scene image"
            onClick={scene}
            disabled={genState === 'busy'}
          >
            {genState === 'busy' ? '…' : '◈'}
          </button>
        ) : (
          <span className="topbar-spacer" />
        )}
      </header>

      <div className="thread" role="log" aria-live="polite" ref={threadRef}>
        {lastFew.map((m) => {
          if (m.role === 'user') {
            return (
              <div key={m.id} className="user-bubble msg-in">
                {m.text}
              </div>
            );
          }
          if (m.role === 'scene') {
            const src = withBase(m.url);
            return (
              <button
                key={m.id}
                className="scene-frame msg-in"
                onClick={() => setLightbox(src)}
                aria-label="View scene image fullscreen"
              >
                <img className="scene-img" src={src} alt="Current story moment" loading="lazy" />
                <span className="scene-cap">Scene · tap to view</span>
              </button>
            );
          }
          return (
            <div key={m.id} className="msg-in story-beat">
              {(m.parts || []).map((p, i) =>
                p.kind === 'narration' ? (
                  <p key={i} className="narration">
                    {p.text}
                  </p>
                ) : (
                  <div key={i} className="dialogue">
                    <div className="who-row">
                      {portraits[p.speaker] ? (
                        <img className="mini-av" src={portraits[p.speaker]} alt="" />
                      ) : (
                        <span className="mini-av ph" aria-hidden>
                          {(p.speaker || '?').charAt(0)}
                        </span>
                      )}
                      <div className="who">{p.speaker}</div>
                    </div>
                    <div className="line">“{p.text}”</div>
                  </div>
                )
              )}
            </div>
          );
        })}
        {draftParts && (
          <div className="msg-in stream-draft story-beat" aria-hidden="true">
            {draftParts.map((p, i) =>
              p.kind === 'narration' ? (
                <p key={i} className="narration">
                  {p.text}
                </p>
              ) : (
                <div key={i} className="dialogue">
                  <div className="who-row">
                    {portraits[p.speaker] ? (
                      <img className="mini-av" src={portraits[p.speaker]} alt="" />
                    ) : (
                      <span className="mini-av ph" aria-hidden>
                        {(p.speaker || '?').charAt(0)}
                      </span>
                    )}
                    <div className="who">{p.speaker}</div>
                  </div>
                  <div className="line">“{p.text}”</div>
                </div>
              )
            )}
          </div>
        )}
        {typing && !draftParts && (
          <p className="typing">
            <span className="dots" aria-hidden>
              <i />
              <i />
              <i />
            </span>
            The night is thinking…
          </p>
        )}
        {genState === 'busy' && <p className="typing">Composing the moment…</p>}
        {genState === 'err' && <p className="typing">The image did not hold. Quota unchanged.</p>}
        <div ref={end} aria-hidden="true" />
      </div>

      {choices.length > 0 && !typing && (
        <div className="choices" aria-label="Suggested lines">
          {choices.map((c) => (
            <button key={c} className="choice" onClick={() => send(c)} disabled={typing}>
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="composer">
        <div className="composer-inner">
          <label className="sr-only" htmlFor="msg">
            Your message
          </label>
          <textarea
            id="msg"
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            onFocus={() => setTimeout(() => scrollToEnd(false), 120)}
            placeholder="Speak, choose, or stay silent…"
            enterKeyHint="send"
            autoComplete="off"
          />
          <button
            className="send-btn"
            type="button"
            onClick={() => send()}
            disabled={typing || !text.trim()}
            aria-label="Send message"
          >
            ↑
          </button>
        </div>
      </div>

      {lightbox && (
        <div className="lightbox" role="dialog" aria-label="Scene image" onClick={() => setLightbox(null)}>
          <figure onClick={(e) => e.stopPropagation()}>
            <img src={lightbox} alt="Story moment" />
            <button className="btn ghost" onClick={() => setLightbox(null)}>
              Close
            </button>
          </figure>
        </div>
      )}
    </div>
  );
}
