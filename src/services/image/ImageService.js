import { db } from '../../core/database/db.js';
import { decryptSecret } from '../../core/security/secrets.js';
import { generateOpenAIImage } from '../../core/ai/providers/ImageOpenAI.js';

export const DAILY_LIMIT = 9;

export async function getUsage() {
  const today = new Date().toISOString().slice(0, 10);
  let row = await db.imageUsage.get('daily');
  if (!row || row.date !== today) {
    row = { id: 'daily', date: today, used: 0, limit: DAILY_LIMIT };
    await db.imageUsage.put(row);
  }
  return row;
}

export async function canGenerate() {
  const u = await getUsage();
  return u.used < u.limit;
}

async function liveImageProvider() {
  const list = await db.providers.orderBy('priority').toArray();
  return list.find((p) => p.enabled && p.kind === 'image-openai' && p.status === 'healthy');
}

export async function generateScene({ conversationId, story, state, characters, visuals }) {
  const allowed = await canGenerate();
  if (!allowed) return { ok: false, reason: 'limit' };
  try {
    const imgProv = await liveImageProvider();
    let url;
    if (imgProv) {
      const apiKey = await decryptSecret(imgProv.apiKeyEnc);
      if (!apiKey) throw new Error('missing image key');
      url = await generateOpenAIImage({
        apiKey,
        model: imgProv.model || 'dall-e-3',
        baseUrl: imgProv.baseUrl,
        story,
        state,
        characters,
        visuals,
      });
    } else {
      return { ok: false, reason: 'failed' };
    }
    const rec = {
      id: `img-${crypto.randomUUID()}`,
      conversationId,
      url,
      prompt: { location: state?.location, present: (characters || []).map((c) => c.name) },
      createdAt: Date.now(),
    };
    await db.sceneImages.add(rec);
    await db.messages.add({
      id: `msg-${crypto.randomUUID()}`,
      conversationId,
      role: 'scene',
      url,
      createdAt: Date.now(),
    });
    const u = await getUsage();
    await db.imageUsage.put({ ...u, used: u.used + 1 });
    return { ok: true, rec };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}
