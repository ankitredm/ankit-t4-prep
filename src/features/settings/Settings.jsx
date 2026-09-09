import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../core/database/db.js';
import { encryptSecret, maskKey } from '../../core/security/secrets.js';
import { aiRouter } from '../../core/ai/router.js';
import { getUsage } from '../../services/image/ImageService.js';
import { AdminService } from '../../services/admin/AdminService.js';
import AppShell from '../nav/AppShell.jsx';

const WORKSHOP_KEY = 'afterlight_workshop';

function statusClass(status) {
  if (status === 'healthy') return 'status ok';
  if (status === 'unhealthy' || status === 'error') return 'status bad';
  return 'status idle';
}

export default function Settings({ profile, onProfile }) {
  const nav = useNavigate();
  const [name, setName] = useState(profile.name);
  const [age, setAge] = useState(profile.age);
  const [providers, setProviders] = useState([]);
  const [usage, setUsage] = useState({ used: 0, limit: 9 });
  const [storage, setStorage] = useState('—');
  const [tap, setTap] = useState(0);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [keyDraft, setKeyDraft] = useState({});
  const [scale, setScale] = useState(1);
  const [saved, setSaved] = useState('');
  const [tests, setTests] = useState({});
  const [testing, setTesting] = useState({});
  const [backupMsg, setBackupMsg] = useState('');

  async function load() {
    setProviders(await db.providers.orderBy('priority').toArray());
    setUsage(await getUsage());
    const s = await db.settings.get('app');
    if (s?.textScale) {
      setScale(s.textScale);
      document.documentElement.style.setProperty('--scale', String(s.textScale));
    }
    if (navigator.storage?.estimate) {
      const e = await navigator.storage.estimate();
      setStorage(`${Math.round((e.usage || 0) / 1024)} KB used locally`);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function bumpPriority(p, dir) {
    const list = [...providers].sort((a, b) => a.priority - b.priority);
    const i = list.findIndex((x) => x.id === p.id);
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const a = list[i];
    const b = list[j];
    await db.providers.update(a.id, { priority: b.priority });
    await db.providers.update(b.id, { priority: a.priority });
    await load();
  }

  async function exportBackup() {
    setBackupMsg('');
    try {
      const data = await AdminService.exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `afterlight-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      setBackupMsg('Library backup downloaded to this device.');
    } catch {
      setBackupMsg('Backup failed on this device.');
    }
  }

  async function importBackup(file) {
    setBackupMsg('');
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      await AdminService.importAll(json);
      setBackupMsg('Backup restored into the local library.');
    } catch {
      setBackupMsg('That file is not a valid Afterlight backup.');
    }
  }

  const initial = (profile?.name || 'A').trim().charAt(0).toUpperCase() || 'A';

  return (
    <AppShell>
      <header className="app-top">
        <h1
          className="app-title"
          onClick={() => {
            const n = tap + 1;
            setTap(n);
            if (n >= 7) {
              sessionStorage.setItem(WORKSHOP_KEY, '1');
              nav('/app/admin');
            }
          }}
        >
          Settings
        </h1>
      </header>

      <main className="app-main settings page-in">
        <section className="set-card" aria-label="Profile">
          <h2>Profile</h2>
          <div className="profile-head">
            <span className="avatar-lg" aria-hidden>
              {initial}
            </span>
            <p className="sub tight">
              {profile.name} · {profile.age}
              <br />
              Stored only on this device.
            </p>
          </div>
          <label className="field">
            <span>Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="nickname" maxLength={40} />
          </label>
          <label className="field">
            <span>Age</span>
            <input
              type="number"
              min="13"
              max="120"
              inputMode="numeric"
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />
          </label>
          <button
            className="btn wide"
            onClick={async () => {
              const n = name.trim();
              const a = Number(age);
              if (!n || a < 13 || a > 120) {
                setSaved('Enter a name and an age between 13 and 120.');
                return;
              }
              await onProfile({ name: n, age: a });
              setSaved('Profile saved on this device.');
            }}
          >
            Save profile
          </button>
          {saved && <p className="lede">{saved}</p>}
        </section>

        <section className="set-card" aria-label="Appearance">
          <h2>Appearance</h2>
          <label className="field">
            <span>Reading size</span>
            <input
              type="range"
              min="0.9"
              max="1.35"
              step="0.05"
              value={scale}
              onChange={async (e) => {
                const v = Number(e.target.value);
                setScale(v);
                document.documentElement.style.setProperty('--scale', String(v));
                const cur = (await db.settings.get('app')) || { id: 'app' };
                await db.settings.put({ ...cur, textScale: v });
              }}
            />
          </label>
          <p className="narration preview-scale">The night leans closer as you read.</p>
        </section>

        <section className="set-card" aria-label="AI providers">
          <h2>AI providers</h2>
          <p className="lede">
            Fifteen slots. You bring your own keys. Test Connection sends one tiny ping
            (not a story). A provider is marked healthy only after that ping succeeds.
            Disable Mock or raise a live slot’s priority to use it. Keys stay on this
            device and are never logged.
          </p>
          {providers.map((p) => (
            <article className="provider-card" key={p.id}>
              <div className="provider-head">
                <strong>{p.name || `Provider ${p.priority}`}</strong>
                <span className={statusClass(p.status)}>
                  {p.status}
                  {p.cooldownUntil && p.cooldownUntil > Date.now() ? ' · cooldown' : ''}
                </span>
              </div>
              <div className="provider-grid">
                <label className="field">
                  <span>Name</span>
                  <input
                    aria-label="Provider name"
                    value={p.name}
                    onChange={(e) => db.providers.update(p.id, { name: e.target.value }).then(load)}
                  />
                </label>
                <label className="field">
                  <span>Type</span>
                  <select
                    aria-label="Provider type"
                    value={p.kind || (p.model === 'mock-story-v1' ? 'mock' : 'openai')}
                    onChange={(e) =>
                      db.providers.update(p.id, { kind: e.target.value, status: 'unconfigured' }).then(load)
                    }
                  >
                    <option value="mock">Mock (offline)</option>
                    <option value="openai">OpenAI</option>
                    <option value="openai-compat">OpenAI-compatible</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="gemini">Google Gemini</option>
                    <option value="image-openai">Image: OpenAI</option>
                  </select>
                </label>
                <label className="field">
                  <span>Model</span>
                  <input
                    aria-label="Model"
                    value={p.model}
                    onChange={(e) =>
                      db.providers.update(p.id, { model: e.target.value, status: 'unconfigured' }).then(load)
                    }
                    placeholder="model id"
                  />
                </label>
                <label className="field">
                  <span>Base URL (optional)</span>
                  <input
                    aria-label="Base URL"
                    value={p.baseUrl || ''}
                    onChange={(e) => db.providers.update(p.id, { baseUrl: e.target.value }).then(load)}
                    placeholder="optional base URL"
                  />
                </label>
                <label className="field">
                  <span>API key</span>
                  <input
                    type="password"
                    autoComplete="off"
                    placeholder={p.apiKeyEnc ? maskKey('key-xxxxx-xx') : 'API key'}
                    value={keyDraft[p.id] || ''}
                    onChange={(e) => setKeyDraft({ ...keyDraft, [p.id]: e.target.value })}
                  />
                </label>
                <div className="provider-foot">
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={!!p.enabled}
                      onChange={(e) => db.providers.update(p.id, { enabled: e.target.checked }).then(load)}
                    />
                    <span>{p.enabled ? 'On' : 'Off'}</span>
                  </label>
                  <div className="prio">
                    <button
                      type="button"
                      className="btn ghost sm"
                      aria-label={`Raise ${p.name} priority`}
                      onClick={() => bumpPriority(p, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="btn ghost sm"
                      aria-label={`Lower ${p.name} priority`}
                      onClick={() => bumpPriority(p, 1)}
                    >
                      ↓
                    </button>
                    <span className="prio-label">#{p.priority}</span>
                  </div>
                </div>
                <button
                  className="btn ghost wide"
                  type="button"
                  disabled={!!testing[p.id]}
                  onClick={async () => {
                    setTesting((t) => ({ ...t, [p.id]: true }));
                    const draft = {
                      kind: p.kind,
                      model: p.model,
                      baseUrl: p.baseUrl,
                      apiKey: keyDraft[p.id] || undefined,
                    };
                    const r = await aiRouter.healthCheck(p.id, draft);
                    if (r.ok && keyDraft[p.id]) {
                      await db.providers.update(p.id, { apiKeyEnc: await encryptSecret(keyDraft[p.id]) });
                      setKeyDraft((k) => ({ ...k, [p.id]: '' }));
                    }
                    setTests((t) => ({ ...t, [p.id]: r }));
                    setTesting((t) => ({ ...t, [p.id]: false }));
                    await load();
                  }}
                >
                  {testing[p.id] ? 'Testing…' : 'Test Connection'}
                </button>
              </div>
              {tests[p.id] && (
                <p className={tests[p.id].ok ? 'lede' : 'warn'}>{tests[p.id].message}</p>
              )}
              {p.lastError && !tests[p.id] && <p className="warn">{p.lastError}</p>}
            </article>
          ))}
        </section>

        <section className="set-card" aria-label="Image generation">
          <h2>Image generation</h2>
          <div className="row">
            <span>Today</span>
            <strong>
              {usage.used} / {usage.limit}
            </strong>
          </div>
          <div className="row">
            <span>Remaining</span>
            <strong>{Math.max(0, usage.limit - usage.used)}</strong>
          </div>
          <p className="lede">
            Daily limit is 9 successful scenes. Failed attempts are not counted. The chat
            never shows this meter. Real images require a healthy Image: OpenAI slot with
            your key. Without it, Generate Scene fails and does not count.
          </p>
        </section>

        <section className="set-card" aria-label="Data and backup">
          <h2>Data &amp; backup</h2>
          <div className="row">
            <span>Local storage</span>
            <strong>{storage}</strong>
          </div>
          <p className="lede">
            Backups are plain JSON files with your library (stories, characters, visual
            profiles, media). They never leave this device unless you move them.
          </p>
          <div className="btn-stack">
            <button className="btn ghost wide" onClick={exportBackup}>
              Download library backup
            </button>
            <label className="btn ghost wide file-btn">
              Restore from backup
              <input
                type="file"
                accept="application/json"
                className="sr-only"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  await importBackup(f);
                }}
              />
            </label>
            <button
              className="btn ghost wide"
              onClick={async () => {
                await db.sceneImages.clear();
                await load();
              }}
            >
              Clear generated image cache
            </button>
          </div>
          {backupMsg && <p className="lede">{backupMsg}</p>}
          {confirmWipe ? (
            <div className="confirm">
              <p>
                Delete all local story data? Conversations, memories, and scene images
                will go. Profile and library stay. This cannot be undone.
              </p>
              <button
                className="btn"
                onClick={async () => {
                  await db.conversations.clear();
                  await db.messages.clear();
                  await db.memories.clear();
                  await db.storyState.clear();
                  await db.decisions.clear();
                  await db.sceneImages.clear();
                  await db.relationships.clear();
                  setConfirmWipe(false);
                }}
              >
                Confirm delete
              </button>
              <button className="btn ghost" onClick={() => setConfirmWipe(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <button className="btn ghost warn wide" onClick={() => setConfirmWipe(true)}>
              Delete all local story data
            </button>
          )}
        </section>

        <section className="set-card" aria-label="About">
          <h2>About</h2>
          <p>Afterlight 1.0.1 · personal local build</p>
          <p className="lede">
            Profile, stories, chat, and memories stay in this app’s local database.
            Nothing is synced. There is no account.
          </p>
          <p className="lede">
            Provider keys are obfuscated with a local encoding prefix (al1) before they
            are stored. That is not hardware-backed encryption. Keys are never shown in
            full after save and are never written to the console. When a live model is
            connected later, prompts will leave the device only toward that provider.
          </p>
        </section>
      </main>
    </AppShell>
  );
}
