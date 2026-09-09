import { db } from '../../core/database/db.js';
import { aiRouter } from '../../core/ai/router.js';
import { MemoryEngine } from '../memory/MemoryEngine.js';

export const StoryService = {
  async homeStories() {
    const today = new Date().toISOString().slice(0, 10);
    const col = await db.dailyCollections.get(`col-${today}`);
    let ids = col?.storyIds;
    if (!ids?.length) {
      const all = await db.stories.toArray();
      const enabled = all.filter((s) => s.enabled !== false);
      ids = enabled.slice(0, 15).map((s) => s.id);
    }
    const stories = [];
    for (const sid of ids) {
      const s = await db.stories.get(sid);
      if (s && s.enabled !== false) stories.push(s);
    }
    return stories;
  },

  async openConversation(storyId) {
    const existing = await db.conversations.where('storyId').equals(storyId).first();
    if (existing) return existing;
    const story = await db.stories.get(storyId);
    if (!story) throw new Error('Story not found');
    const conv = {
      id: `conv-${crypto.randomUUID()}`,
      storyId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.conversations.add(conv);
    const present = story.startingCharacters || [];
    await db.storyState.put({
      id: `st-${conv.id}`,
      storyId,
      conversationId: conv.id,
      location: story.startingLocation || '',
      present,
      objective: story.objective || '',
      chapter: 1,
      mysteryProgress: story.variables?.mysteryProgress || 0,
      clues: [],
      flags: {},
    });
    const chars = await db.characters.where('storyId').equals(storyId).toArray();
    for (const c of chars) {
      await db.relationships.put({
        id: `rel-${conv.id}-${c.id}`,
        storyId,
        conversationId: conv.id,
        characterId: c.id,
        userAffinity: 0,
        notes: '',
      });
    }
    const opener = present[0] || chars[0]?.name;
    const parts = [{ kind: 'narration', text: story.premise || story.hook || 'The scene opens.' }];
    if (opener) {
      parts.push({
        kind: 'dialogue',
        speaker: opener,
        text: 'Stay with me. We begin where the light thins.',
      });
    }
    await db.messages.add({
      id: `msg-${crypto.randomUUID()}`,
      conversationId: conv.id,
      role: 'story',
      parts,
      createdAt: Date.now(),
    });
    return conv;
  },

  async messages(conversationId) {
    return db.messages.where('conversationId').equals(conversationId).sortBy('createdAt');
  },

  async sendUserMessage({ conversationId, storyId, text, profile, onDelta }) {
    await db.messages.add({
      id: `msg-${crypto.randomUUID()}`,
      conversationId,
      role: 'user',
      text,
      createdAt: Date.now(),
    });
    const stateRow = await db.storyState.where('conversationId').equals(conversationId).first();
    const characters = await db.characters.where('storyId').equals(storyId).toArray();
    const story = await db.stories.get(storyId);
    const visuals = [];
    for (const c of characters) {
      const v = await db.visualProfiles.where('characterId').equals(c.id).first();
      if (v) visuals.push(v);
    }
    await MemoryEngine.ensureNameMemory(storyId, profile);
    const pack = await MemoryEngine.contextPack({
      storyId,
      conversationId,
      storyState: stateRow,
    });
    let result;
    try {
      result = await aiRouter.generateStoryResponse(
        {
          userText: text,
          userName: profile?.name,
          age: profile?.age,
          story,
          storyState: stateRow,
          characters,
          visuals,
          memories: pack.longTerm,
          recent: pack.recent,
        },
        { onDelta }
      );
    } catch {
      result = {
        parts: [{ kind: 'narration', text: 'The scene stutters, then stills. Try speaking again in a moment.' }],
        nextState: null,
        memoryCandidate: null,
      };
    }
    await db.messages.add({
      id: `msg-${crypto.randomUUID()}`,
      conversationId,
      role: 'story',
      parts: result.parts,
      createdAt: Date.now() + 1,
    });
    if (result.nextState && stateRow) {
      await db.storyState.put({ ...stateRow, ...result.nextState, id: stateRow.id });
    }
    if (result.relationshipDelta?.characterName) {
      const ch = characters.find((c) => c.name === result.relationshipDelta.characterName);
      if (ch) {
        const rel = await db.relationships.get(`rel-${conversationId}-${ch.id}`);
        if (rel) {
          await db.relationships.put({
            ...rel,
            userAffinity: (rel.userAffinity || 0) + (result.relationshipDelta.userAffinity || 0),
          });
        }
      }
    }
    await db.decisions.add({
      id: `dec-${crypto.randomUUID()}`,
      storyId,
      conversationId,
      text,
      createdAt: Date.now(),
    });
    await MemoryEngine.maybeStore({
      storyId,
      conversationId,
      candidate: result.memoryCandidate,
      userText: text,
    });
    await db.conversations.update(conversationId, { updatedAt: Date.now() });
    return result;
  },
};
