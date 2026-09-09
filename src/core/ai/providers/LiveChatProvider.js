import { BaseAIProvider } from '../AIProvider.js';
import { STORY_SYSTEM, parseStoryParts } from '../parseStory.js';
import { buildStoryMessages } from '../contextBuilder.js';
import { endpointFor, postJson } from '../liveHttp.js';

export class LiveChatProvider extends BaseAIProvider {
  constructor(config) {
    super(config);
    this.kind = config.kind;
    this.model = config.model;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
  }

  async healthCheck() {
    await this._ping();
    return { ok: true, name: this.config.name || this.kind };
  }

  async _ping() {
    if (this.kind === 'anthropic') {
      await postJson({
        url: `${endpointFor(this.kind, this.baseUrl)}/messages`,
        headers: {
          'content-type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: {
          model: this.model,
          max_tokens: 8,
          messages: [{ role: 'user', content: 'ping' }],
        },
      });
      return;
    }
    if (this.kind === 'gemini') {
      const url = `${endpointFor(this.kind, this.baseUrl)}/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
      await postJson({
        url,
        headers: { 'content-type': 'application/json' },
        body: { contents: [{ parts: [{ text: 'ping' }] }], generationConfig: { maxOutputTokens: 8 } },
      });
      return;
    }
    await postJson({
      url: `${endpointFor(this.kind, this.baseUrl)}/chat/completions`,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.apiKey}`,
      },
      body: { model: this.model, max_tokens: 8, messages: [{ role: 'user', content: 'ping' }] },
    });
  }

  async generateStoryResponse(payload) {
    const text = await this._complete(payload, false);
    return this._wrap(text, payload);
  }

  async *generateStoryResponseStream(payload, onDelta) {
    const text = await this._complete(payload, true, onDelta);
    yield this._wrap(text, payload);
  }

  _wrap(text, payload) {
    const parts = parseStoryParts(text);
    const speaker = parts.find((p) => p.kind === 'dialogue')?.speaker;
    return {
      parts,
      nextState: {
        ...(payload.storyState || {}),
        lastBeat: speaker,
        lastSpeaker: speaker,
        mysteryProgress: Math.min(100, (payload.storyState?.mysteryProgress || 0) + 3),
      },
      memoryCandidate:
        payload.userText && payload.userText.length > 12
          ? {
              text: `${payload.userName || 'User'}: ${payload.userText.slice(0, 160)}`,
              importance: /promise|secret|trust|clue|love|afraid/i.test(payload.userText) ? 0.85 : 0.4,
            }
          : null,
    };
  }

  async _complete(payload, stream, onDelta) {
    const { scene, messages } = buildStoryMessages(payload);
    const sys = `${STORY_SYSTEM}\n\n${scene}`;

    if (this.kind === 'anthropic') {
      const json = await postJson({
        url: `${endpointFor(this.kind, this.baseUrl)}/messages`,
        headers: {
          'content-type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: {
          model: this.model,
          max_tokens: 700,
          system: sys,
          messages: messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
        },
      });
      return json?.content?.map((c) => c.text).join('\n') || '';
    }

    if (this.kind === 'gemini') {
      const json = await postJson({
        url: `${endpointFor(this.kind, this.baseUrl)}/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`,
        headers: { 'content-type': 'application/json' },
        body: {
          systemInstruction: { parts: [{ text: sys }] },
          contents: messages.map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })),
          generationConfig: { maxOutputTokens: 700 },
        },
      });
      return json?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('\n') || '';
    }

    if (stream) {
      return this._openaiStream(sys, messages, onDelta);
    }

    const json = await postJson({
      url: `${endpointFor(this.kind, this.baseUrl)}/chat/completions`,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.apiKey}`,
      },
      body: {
        model: this.model,
        max_tokens: 700,
        messages: [{ role: 'system', content: sys }, ...messages],
      },
    });
    return json?.choices?.[0]?.message?.content || '';
  }

  async _openaiStream(sys, messages, onDelta) {
    let res;
    try {
      res = await fetch(`${endpointFor(this.kind, this.baseUrl)}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 700,
          stream: true,
          messages: [{ role: 'system', content: sys }, ...messages],
        }),
      });
    } catch {
      const err = new Error('Network error or CORS blocked this provider from the browser.');
      err.code = 'network';
      throw err;
    }
    if (!res.ok || !res.body) {
      const t = await res.text();
      const { classifyHttpError } = await import('../liveHttp.js');
      const c = classifyHttpError(res.status, t);
      const err = new Error(c.message);
      err.code = c.code;
      throw err;
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let full = '';
    let buf = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const chunks = buf.split('\n');
      buf = chunks.pop() || '';
      for (const line of chunks) {
        const s = line.trim();
        if (!s.startsWith('data:')) continue;
        const data = s.slice(5).trim();
        if (data === '[DONE]') continue;
        try {
          const j = JSON.parse(data);
          const d = j.choices?.[0]?.delta?.content || '';
          if (d) {
            full += d;
            onDelta?.(full);
          }
        } catch {
          /* ignore keepalives */
        }
      }
    }
    return full;
  }

  async summarizeMemory({ messages }) {
    const bits = (messages || [])
      .map((m) => m.text || (m.parts || []).map((p) => p.text).join(' '))
      .filter(Boolean)
      .slice(-8)
      .join(' ');
    return { summary: bits.slice(0, 200), importance: 0.5 };
  }
}
