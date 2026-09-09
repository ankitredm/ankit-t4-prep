import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../../core/database/db.js';
import { StoryService } from '../../services/story/StoryService.js';
import { generateScene, canGenerate } from '../../services/image/ImageService.js';
import { parseStoryParts } from '../../core/ai/parseStory.js';

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
  const [draftParts, setDraftParts] = useState(null);
  const [missing, setMissing] = useState(false);
  const end = useRef(null);
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
        if (c.portraitUrl) map[c.name] = c.portraitUrl;
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
      await reload(c.id);
    })();
    return () => {
      cancelled = true;
    };
  }, [storyId]);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, typing, genState, draftParts]);

  async function send() {
    const t = text.trim();
    if (!t || !conv || sending.current) return;
    sending.current = true;
    setText('');
    setTyping(true);
    setDraftParts(null);
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

  if (missing) {
    return (
      <div className="chat">
        <header className="topbar">
          <button className="icon-btn" aria-label="Back" onClick={() => nav('/app')}>←</button>
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
    <div className="chat">
      <header className="topbar">
        <button className="icon-btn" aria-label="Back" onClick={() => nav(`/app/story/${storyId}`)}>
          ←
        </button>
        <h1>{story?.title || 'Story'}</h1>
        {showGen ? (
          <button className="icon-btn" aria-label="Generate scene" onClick={scene} disabled={genState === 'busy'}>
            {genState === 'busy' ? '…' : '◈'}
          </button>
        ) : (
          <span className="topbar-spacer" />
        )}
      </header>
      <div className="thread" role="log" aria-live="polite">
        {lastFew.map((m) => {
          if (m.role === 'user') {
            return (
              <div key={m.id} className="user-bubble msg-in">
                {m.text}
              </div>
            );
          }
          if (m.role === 'scene') {
            return <img key={m.id} className="scene-img msg-in" src={m.url} alt="Current story moment" />;
          }
          return (
            <div key={m.id} className="msg-in">
              {(m.parts || []).map((p, i) =>
                p.kind === 'narration' ? (
                  <p key={i} className="narration">
                    {p.text}
                  </p>
                ) : (
                  <div key={i} className="dialogue">
                    <div className="who-row">
                      {portraits[p.speaker] && <img className="mini-av" src={portraits[p.speaker]} alt="" />}
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
          <div className="msg-in stream-draft">
            {draftParts.map((p, i) =>
              p.kind === 'narration' ? (
                <p key={i} className="narration">{p.text}</p>
              ) : (
                <div key={i} className="dialogue">
                  <div className="who">{p.speaker}</div>
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
        <div ref={end} />
      </div>
      <div className="composer">
        <div className="composer-inner">
          <label className="sr-only" htmlFor="msg">
            Your message
          </label>
          <textarea
            id="msg"
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Speak, choose, or stay silent…"
          />
          <button className="btn" type="button" onClick={send} disabled={typing}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
