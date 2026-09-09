import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminService } from '../../services/admin/AdminService.js';
import { db } from '../../core/database/db.js';

export default function Admin() {
  const nav = useNavigate();
  const [stories, setStories] = useState([]);
  const [edit, setEdit] = useState(null);
  const [chars, setChars] = useState([]);
  const [charEdit, setCharEdit] = useState(null);
  const [vp, setVp] = useState(null);
  const [preview, setPreview] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [order, setOrder] = useState([]);
  const [importErr, setImportErr] = useState('');
  const [media, setMedia] = useState([]);
  const [sceneForm, setSceneForm] = useState({ title: '', location: '', moment: '', characters: '' });
  const [mediaErr, setMediaErr] = useState('');

  async function refresh() {
    const s = await AdminService.stories();
    setStories(s);
    const today = new Date().toISOString().slice(0, 10);
    const col = await db.dailyCollections.get(`col-${today}`);
    setOrder(col?.storyIds || s.filter((x) => x.enabled !== false).slice(0, 15).map((x) => x.id));
  }

  useEffect(() => {
    refresh();
  }, []);

  async function openStory(s) {
    setEdit({ ...s });
    setChars(await AdminService.charactersFor(s.id));
    setMedia(s.id ? await AdminService.mediaFor(s.id) : []);
    setCharEdit(null);
    setVp(null);
    setMediaErr('');
  }

  function readImageFile(file) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) {
        reject(new Error('Choose an image file.'));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        reject(new Error('Image must be under 5 MB.'));
        return;
      }
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error('Could not read that file.'));
      r.readAsDataURL(file);
    });
  }

  async function reloadMedia(storyId) {
    if (!storyId) return;
    setMedia(await AdminService.mediaFor(storyId));
    const s = await AdminService.getStory(storyId);
    if (s) setEdit({ ...s });
    setChars(await AdminService.charactersFor(storyId));
  }

  function toggleDaily(id) {
    setOrder((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, 15)));
  }

  return (
    <div className="shell workshop">
      <header className="topbar">
        <button className="icon-btn" aria-label="Back" onClick={() => nav('/app/settings')}>←</button>
        <h1>Library workshop</h1>
        <span className="topbar-spacer" />
      </header>
      <main className="admin">
        <p className="lede">Local content tools. Readers never see this screen.</p>
        <button
          className="btn"
          onClick={() =>
            setEdit({
              title: 'Untitled',
              genre: 'Mystery',
              hook: '',
              premise: '',
              mood: 'Quiet',
              enabled: true,
              tags: [],
              coverHue: 200,
              worldRules: '',
              tone: '',
              setting: '',
              locations: [],
              importantEvents: [],
              branchingRules: '',
              endingConditions: '',
              startingLocation: '',
              startingCharacters: [],
              objective: '',
              variables: { mysteryProgress: 0, clues: [] },
            })
          }
        >
          New story
        </button>
        {stories.map((s) => (
          <div className="row" key={s.id}>
            <button className="btn ghost grow" onClick={() => openStory(s)}>
              {s.title} {s.enabled === false ? '(off)' : ''}
            </button>
            <span className="row-actions">
              <button className="btn ghost" onClick={() => AdminService.duplicateStory(s.id).then(refresh)}>Duplicate</button>
              <button className="btn ghost" onClick={() => setConfirm({ type: 'story', id: s.id, label: s.title })}>Delete</button>
            </span>
          </div>
        ))}

        {confirm && (
          <div className="confirm">
            <p>Delete {confirm.label || confirm.type}? This cannot be undone.</p>
            <button
              className="btn"
              onClick={async () => {
                if (confirm.type === 'story') await AdminService.deleteStory(confirm.id);
                if (confirm.type === 'char') await AdminService.deleteCharacter(confirm.id);
                if (confirm.type === 'media') {
                  await AdminService.deleteMedia(confirm.id);
                  if (edit?.id) await reloadMedia(edit.id);
                }
                setConfirm(null);
                setCharEdit(null);
                if (confirm.type === 'story') {
                  setEdit(null);
                  setMedia([]);
                }
                await refresh();
              }}
            >
              Confirm
            </button>
            <button className="btn ghost" onClick={() => setConfirm(null)}>Cancel</button>
          </div>
        )}

        {edit && (
          <section>
            <h2>Blueprint</h2>
            {['title', 'genre', 'hook', 'premise', 'mood', 'worldRules', 'tone', 'setting', 'branchingRules', 'endingConditions', 'startingLocation', 'objective'].map((k) => (
              <label key={k}>
                {k}
                <textarea rows={k === 'premise' ? 3 : 1} value={Array.isArray(edit[k]) ? edit[k].join(', ') : edit[k] || ''} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} />
              </label>
            ))}
            <label>
              Tags (comma)
              <input value={(edit.tags || []).join(', ')} onChange={(e) => setEdit({ ...edit, tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })} />
            </label>
            <label>
              Cover hue
              <input type="number" value={edit.coverHue || 0} onChange={(e) => setEdit({ ...edit, coverHue: Number(e.target.value) })} />
            </label>
            <label className="inline">
              <input type="checkbox" checked={edit.enabled !== false} onChange={(e) => setEdit({ ...edit, enabled: e.target.checked })} />
              Enabled
            </label>
            <button
              className="btn"
              onClick={async () => {
                const saved = await AdminService.saveStory(edit);
                setEdit(saved);
                await refresh();
              }}
            >
              Save story
            </button>
            <button className="btn ghost" onClick={() => setPreview(edit)}>Preview card</button>

            <h2>Characters</h2>
            {!edit.id && <p className="lede">Save the story before adding characters.</p>}
            {chars.map((c) => (
              <div className="row" key={c.id}>
                <button
                  className="btn ghost grow"
                  onClick={async () => {
                    setCharEdit({ ...c });
                    setVp((await AdminService.visualFor(c.id)) || { characterId: c.id });
                  }}
                >
                  {c.name}
                </button>
                <span className="row-actions">
                  <button className="btn ghost" onClick={() => AdminService.duplicateCharacter(c.id).then(() => openStory(edit))}>Duplicate</button>
                  <button className="btn ghost" onClick={() => setConfirm({ type: 'char', id: c.id, label: c.name })}>Delete</button>
                </span>
              </div>
            ))}
            <button
              className="btn ghost"
              disabled={!edit.id}
              onClick={() =>
                setCharEdit({
                  storyId: edit.id,
                  name: 'New',
                  personality: '',
                  speakingStyle: '',
                  likes: '',
                  dislikes: '',
                  goals: '',
                  fears: '',
                  secrets: '',
                  background: '',
                  appearance: '',
                  ageNote: 'Adult',
                })
              }
            >
              Add character
            </button>

            {edit.id && (
              <MediaEditor
                story={edit}
                chars={chars}
                media={media}
                sceneForm={sceneForm}
                setSceneForm={setSceneForm}
                mediaErr={mediaErr}
                setMediaErr={setMediaErr}
                readImageFile={readImageFile}
                reloadMedia={reloadMedia}
                setConfirm={setConfirm}
              />
            )}
          </section>
        )}

        {charEdit && (
          <section>
            <h2>Character</h2>
            {['name', 'ageNote', 'personality', 'speakingStyle', 'likes', 'dislikes', 'goals', 'fears', 'secrets', 'background', 'appearance', 'emotionalState'].map((k) => (
              <label key={k}>
                {k}
                <textarea value={charEdit[k] || ''} onChange={(e) => setCharEdit({ ...charEdit, [k]: e.target.value })} />
              </label>
            ))}
            <button
              className="btn"
              onClick={async () => {
                const c = await AdminService.saveCharacter(charEdit);
                setCharEdit(c);
                setVp((await AdminService.visualFor(c.id)) || { characterId: c.id });
                if (edit) setChars(await AdminService.charactersFor(edit.id));
              }}
            >
              Save character
            </button>
            {vp && charEdit.id && (
              <>
                <h2>Visual profile</h2>
                {['face', 'hair', 'hairColor', 'eyes', 'clothing', 'accessories', 'appearance', 'artStyle', 'referenceImage'].map((k) => (
                  <label key={k}>
                    {k}
                    <input value={vp[k] || ''} onChange={(e) => setVp({ ...vp, [k]: e.target.value })} />
                  </label>
                ))}
                <button className="btn" onClick={() => AdminService.saveVisual({ ...vp, characterId: charEdit.id })}>
                  Save visual
                </button>
              </>
            )}
          </section>
        )}

        {preview && (
          <div className="card preview-card">
            <div className="cover" style={{ background: `linear-gradient(160deg, hsl(${preview.coverHue || 220} 40% 18%), #07070c)` }}>
              <span>{preview.genre}</span>
            </div>
            <h3>{preview.title}</h3>
            <p className="hook">{preview.hook}</p>
            <p className="lede">{preview.premise}</p>
          </div>
        )}

        <h2>Daily collection</h2>
        <p className="lede">Pick up to 15 enabled stories for tonight’s home shelf. Order is the order you check them.</p>
        {stories.map((s) => (
          <label className="inline" key={s.id}>
            <input type="checkbox" checked={order.includes(s.id)} onChange={() => toggleDaily(s.id)} />
            {s.title}
          </label>
        ))}
        <button
          className="btn"
          onClick={() => AdminService.setDaily(new Date().toISOString().slice(0, 10), order)}
        >
          Save today’s collection
        </button>

        <h2>Import / export</h2>
        <button
          className="btn ghost"
          onClick={async () => {
            const data = await AdminService.exportAll();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'afterlight-library.json';
            a.click();
          }}
        >
          Export JSON
        </button>
        <input
          type="file"
          accept="application/json"
          onChange={async (e) => {
            setImportErr('');
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              const json = JSON.parse(await f.text());
              await AdminService.importAll(json);
              await refresh();
            } catch {
              setImportErr('That file is not a valid Afterlight library pack.');
            }
            e.target.value = '';
          }}
        />
        {importErr && <p className="warn">{importErr}</p>}
      </main>
    </div>
  );
}

function MediaEditor({
  story,
  chars,
  media,
  sceneForm,
  setSceneForm,
  mediaErr,
  setMediaErr,
  readImageFile,
  reloadMedia,
  setConfirm,
}) {
  const covers = media.filter((m) => m.kind === 'cover');
  const portraits = media.filter((m) => m.kind === 'portrait');
  const scenes = media.filter((m) => m.kind === 'scene');
  const cover = covers[0];

  return (
    <>
      <h2>Media library</h2>
      <p className="lede">One cover, portraits tied to characters, and up to 10 scene stills. Files stay on this device. Nothing is auto-filled.</p>
      {mediaErr && <p className="warn">{mediaErr}</p>}

      <h3>Cover</h3>
      {cover ? (
        <div className="workshop-media">
          <img src={cover.url} alt="" />
          <div>
            <p>{cover.title || 'Cover'}</p>
            <label>
              Replace cover
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (!f) return;
                  try {
                    const url = await readImageFile(f);
                    await AdminService.replaceMediaFile(cover.id, url);
                    await reloadMedia(story.id);
                  } catch (err) {
                    setMediaErr(err.message);
                  }
                }}
              />
            </label>
            <button className="btn ghost" type="button" onClick={() => setConfirm({ type: 'media', id: cover.id, label: 'this cover' })}>
              Delete cover
            </button>
          </div>
        </div>
      ) : (
        <label>
          Upload cover
          <input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              try {
                const url = await readImageFile(f);
                await AdminService.setCoverFromData(story.id, url, story.title);
                await reloadMedia(story.id);
              } catch (err) {
                setMediaErr(err.message);
              }
            }}
          />
        </label>
      )}

      <h3>Character portraits</h3>
      {chars.length === 0 && <p className="lede">Save characters first, then attach portraits.</p>}
      {chars.map((c) => {
        const pic = portraits.find((p) => p.characterId === c.id);
        return (
          <div className="workshop-media" key={c.id}>
            {pic ? <img src={pic.url} alt="" /> : <div className="char-ph" />}
            <div>
              <p>{c.name}</p>
              <label>
                {pic ? 'Replace portrait' : 'Upload portrait'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (!f) return;
                    try {
                      const url = await readImageFile(f);
                      await AdminService.setPortraitFromData(story.id, c.id, url, c.name);
                      await reloadMedia(story.id);
                    } catch (err) {
                      setMediaErr(err.message);
                    }
                  }}
                />
              </label>
              {pic && (
                <button className="btn ghost" type="button" onClick={() => setConfirm({ type: 'media', id: pic.id, label: `${c.name} portrait` })}>
                  Delete portrait
                </button>
              )}
            </div>
          </div>
        );
      })}

      <h3>Scene stills ({scenes.length}/10)</h3>
      {scenes.length === 0 && <p className="lede">No scenes yet. Upload a local image — it will not be generated for you.</p>}
      {scenes.map((sc) => (
        <div className="workshop-media" key={sc.id}>
          <img src={sc.url} alt="" />
          <div>
            <label>
              Title
              <input defaultValue={sc.title || ''} key={`${sc.id}-title`} onBlur={(e) => AdminService.updateMediaMeta(sc.id, { title: e.target.value })} />
            </label>
            <label>
              Location
              <input defaultValue={sc.location || ''} key={`${sc.id}-loc`} onBlur={(e) => AdminService.updateMediaMeta(sc.id, { location: e.target.value })} />
            </label>
            <label>
              Moment
              <input defaultValue={sc.moment || ''} key={`${sc.id}-mom`} onBlur={(e) => AdminService.updateMediaMeta(sc.id, { moment: e.target.value })} />
            </label>
            <label>
              Characters present
              <input
                defaultValue={Array.isArray(sc.characters) ? sc.characters.join(', ') : ''}
                key={`${sc.id}-ch`}
                onBlur={(e) =>
                  AdminService.updateMediaMeta(sc.id, {
                    characters: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                  })
                }
              />
            </label>
            <label>
              Replace image
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (!f) return;
                  try {
                    const url = await readImageFile(f);
                    await AdminService.replaceMediaFile(sc.id, url);
                    await reloadMedia(story.id);
                  } catch (err) {
                    setMediaErr(err.message);
                  }
                }}
              />
            </label>
            <button className="btn ghost" type="button" onClick={() => setConfirm({ type: 'media', id: sc.id, label: sc.title || 'this scene' })}>
              Delete scene
            </button>
          </div>
        </div>
      ))}

      {scenes.length < 10 && (
        <div className="card">
          <p>Add scene</p>
          <label>
            Title
            <input value={sceneForm.title} onChange={(e) => setSceneForm({ ...sceneForm, title: e.target.value })} />
          </label>
          <label>
            Location
            <input value={sceneForm.location} onChange={(e) => setSceneForm({ ...sceneForm, location: e.target.value })} />
          </label>
          <label>
            Moment
            <input value={sceneForm.moment} onChange={(e) => setSceneForm({ ...sceneForm, moment: e.target.value })} />
          </label>
          <label>
            Characters present (comma)
            <input value={sceneForm.characters} onChange={(e) => setSceneForm({ ...sceneForm, characters: e.target.value })} />
          </label>
          <label>
            Image file
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f) return;
                try {
                  setMediaErr('');
                  const url = await readImageFile(f);
                  await AdminService.addScene(story.id, {
                    url,
                    title: sceneForm.title,
                    location: sceneForm.location,
                    moment: sceneForm.moment,
                    characters: sceneForm.characters.split(',').map((t) => t.trim()).filter(Boolean),
                  });
                  setSceneForm({ title: '', location: '', moment: '', characters: '' });
                  await reloadMedia(story.id);
                } catch (err) {
                  setMediaErr(err.message);
                }
              }}
            />
          </label>
        </div>
      )}
    </>
  );
}
