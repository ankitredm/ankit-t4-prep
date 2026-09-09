import { db } from '../../core/database/db.js';
import { aiRouter } from '../../core/ai/router.js';

export const MemoryEngine = {
  async recent(conversationId, limit = 16) {
    const m = await db.messages.where('conversationId').equals(conversationId).sortBy('createdAt');
    return m.slice(-limit);
  },

  async longTerm(storyId) {
    return db.memories.where('storyId').equals(storyId).toArray();
  },

  async maybeStore({ storyId, conversationId, characterId, candidate, userText }) {
    if (!candidate) return;
    const important =
      candidate.importance >= 0.75 ||
      /promise|secret|trust|clue|love|afraid|remember|swear/i.test(userText || '');
    if (!important) return;
    await db.memories.add({
      id: `mem-${crypto.randomUUID()}`,
      storyId,
      conversationId,
      characterId: characterId || null,
      text: candidate.text,
      createdAt: Date.now(),
    });
  },

  async ensureNameMemory(storyId, profile) {
    if (!profile?.name) return;
    const all = await this.longTerm(storyId);
    if (all.some((m) => m.text?.startsWith('User name:'))) return;
    await db.memories.add({
      id: `mem-${crypto.randomUUID()}`,
      storyId,
      conversationId: null,
      characterId: null,
      text: `User name: ${profile.name}. Age band used for tone: ${profile.age}.`,
      createdAt: Date.now(),
    });
  },

  async contextPack({ storyId, conversationId, storyState }) {
    const recent = await this.recent(conversationId);
    const longTerm = await this.longTerm(storyId);
    return { recent, longTerm, storyState };
  },

  async summarizeIfNeeded(conversationId) {
    const msgs = await this.recent(conversationId, 40);
    if (msgs.length < 20) return;
    await aiRouter.summarizeMemory({ messages: msgs });
  },
};
