import { db } from '../database/db.js';
import { MockAIProvider } from './MockAIProvider.js';
import { LiveChatProvider } from './providers/LiveChatProvider.js';
import { decryptSecret } from '../security/secrets.js';

const mock = new MockAIProvider({ id: 'provider-1' });

async function instanceFor(p) {
  if (!p) return null;
  const kind = p.kind || (p.model === 'mock-story-v1' || p.id === 'provider-1' ? 'mock' : '');
  if (kind === 'mock') return mock;
  if (kind === 'image-openai') return null;
  if (['openai', 'openai-compat', 'anthropic', 'gemini'].includes(kind)) {
    const apiKey = await decryptSecret(p.apiKeyEnc);
    if (!apiKey || !p.model) return null;
    return new LiveChatProvider({
      id: p.id,
      name: p.name,
      kind,
      model: p.model,
      apiKey,
      baseUrl: p.baseUrl || '',
    });
  }
  return null;
}

function fallbackParts() {
  return {
    parts: [
      {
        kind: 'narration',
        text: 'The city goes quiet. No narrator is available — enable a healthy provider in Settings, then try again.',
      },
    ],
    nextState: null,
    memoryCandidate: null,
  };
}

function cooldownMs(err) {
  if (err?.code === 'rate') return 60_000;
  return 15_000;
}

export class AIRouter {
  async orderedProviders() {
    const list = await db.providers.orderBy('priority').toArray();
    return list.filter((p) => p.enabled);
  }

  async generateStoryResponse(payload, { onDelta } = {}) {
    const providers = await this.orderedProviders();
    for (const p of providers) {
      if (p.cooldownUntil && Date.now() < p.cooldownUntil) continue;
      if (p.kind === 'image-openai') continue;
      const impl = await instanceFor(p);
      if (!impl) {
        if (p.kind && p.kind !== 'mock') await db.providers.update(p.id, { status: 'unconfigured' });
        continue;
      }
      try {
        let result;
        if (onDelta && impl.generateStoryResponseStream && (p.kind === 'openai' || p.kind === 'openai-compat')) {
          const gen = impl.generateStoryResponseStream(payload, onDelta);
          let last = null;
          for await (const step of gen) last = step;
          result = last;
        } else {
          result = await impl.generateStoryResponse(payload);
        }
        await db.providers.update(p.id, { status: 'healthy', cooldownUntil: 0 });
        return result;
      } catch (e) {
        await db.providers.update(p.id, {
          status: 'error',
          lastError: String(e.message || 'error').slice(0, 160),
          cooldownUntil: Date.now() + cooldownMs(e),
        });
      }
    }
    return fallbackParts();
  }

  async healthCheck(id, draft = {}) {
    const row = await db.providers.get(id);
    if (!row) return { ok: false, message: 'Missing provider' };
    const p = { ...row, ...draft };
    const kind = draft.kind || p.kind || (p.model === 'mock-story-v1' ? 'mock' : '');
    if (kind === 'mock') {
      await db.providers.update(id, { status: 'healthy', lastError: '' });
      return { ok: true, message: 'Mock narrator is ready (no network).' };
    }
    const apiKey = draft.apiKey || (await decryptSecret(p.apiKeyEnc));
    const model = draft.model || p.model;
    if (!apiKey) return { ok: false, message: 'Enter an API key to test.' };
    if (!model) return { ok: false, message: 'Enter a model name to test.' };
    if (kind === 'image-openai') {
      try {
        const { endpointFor } = await import('./liveHttp.js');
        const res = await fetch(`${endpointFor('image-openai', draft.baseUrl ?? p.baseUrl)}/models`, {
          headers: { authorization: `Bearer ${apiKey}` },
        });
        if (!res.ok) {
          const t = await res.text();
          const { classifyHttpError } = await import('./liveHttp.js');
          const c = classifyHttpError(res.status, t);
          await db.providers.update(id, { status: 'error', lastError: c.message });
          return { ok: false, message: c.message };
        }
        await db.providers.update(id, { status: 'healthy', lastError: '', cooldownUntil: 0 });
        return { ok: true, message: 'Image provider reachable. Marked healthy.' };
      } catch {
        await db.providers.update(id, { status: 'error', lastError: 'Network or CORS error' });
        return { ok: false, message: 'Network error or the browser blocked the request (CORS).' };
      }
    }
    const impl = new LiveChatProvider({
      kind,
      model,
      apiKey,
      baseUrl: draft.baseUrl ?? p.baseUrl,
      name: p.name,
    });
    try {
      await impl.healthCheck();
      await db.providers.update(id, { status: 'healthy', lastError: '', cooldownUntil: 0 });
      return { ok: true, message: 'Connection succeeded. Provider marked healthy.' };
    } catch (e) {
      await db.providers.update(id, { status: 'error', lastError: String(e.message || '').slice(0, 160) });
      return { ok: false, message: e.message || 'Test failed' };
    }
  }

  async summarizeMemory(payload) {
    const providers = await this.orderedProviders();
    for (const p of providers) {
      const impl = await instanceFor(p);
      if (impl) return impl.summarizeMemory(payload);
    }
    return mock.summarizeMemory(payload);
  }
}

export const aiRouter = new AIRouter();
