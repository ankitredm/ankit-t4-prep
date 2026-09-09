import Dexie from 'dexie';

export const db = new Dexie('afterlight_local');

db.version(1).stores({
  profile: 'id',
  settings: 'id',
  stories: 'id, enabled, genre',
  characters: 'id, storyId',
  conversations: 'id, storyId, updatedAt',
  messages: 'id, conversationId, createdAt',
  memories: 'id, storyId, characterId, createdAt',
  storyState: 'id, storyId, conversationId',
  decisions: 'id, storyId, conversationId',
  relationships: 'id, storyId, characterId',
  visualProfiles: 'id, characterId',
  sceneImages: 'id, conversationId, createdAt',
  imageUsage: 'id',
  providers: 'id, priority',
  dailyCollections: 'id, date',
  adminUnlock: 'id',
});

db.version(2).stores({
  profile: 'id',
  settings: 'id',
  stories: 'id, enabled, genre',
  characters: 'id, storyId',
  conversations: 'id, storyId, updatedAt',
  messages: 'id, conversationId, createdAt',
  memories: 'id, storyId, characterId, createdAt',
  storyState: 'id, storyId, conversationId',
  decisions: 'id, storyId, conversationId',
  relationships: 'id, storyId, characterId',
  visualProfiles: 'id, characterId',
  sceneImages: 'id, conversationId, createdAt',
  imageUsage: 'id',
  providers: 'id, priority',
  dailyCollections: 'id, date',
  adminUnlock: 'id',
  media: 'id, storyId, kind, characterId',
});

export async function ensureTodaysCollection() {
  const today = new Date().toISOString().slice(0, 10);
  const existing = await db.dailyCollections.get(`col-${today}`);
  if (existing?.storyIds?.length) return;
  const all = await db.stories.toArray();
  const enabled = all.filter((s) => s.enabled !== false);
  await db.dailyCollections.put({
    id: `col-${today}`,
    date: today,
    storyIds: enabled.slice(0, 15).map((s) => s.id),
  });
}

export async function ensureSeeded() {
  const count = await db.stories.count();
  if (count === 0) {
    const { seedLibrary } = await import('../../services/story/seed.js');
    await seedLibrary();
  }
  if (!(await db.settings.get('app'))) {
    await db.settings.put({
      id: 'app',
      textScale: 1,
      encryptionNote: 'API keys are locally encoded (al1), not keystore-encrypted.',
      version: '1.0.1',
    });
  }
  if ((await db.providers.count()) === 0) {
    const slots = [];
    for (let i = 1; i <= 15; i++) {
      slots.push({
        id: `provider-${i}`,
        name: i === 1 ? 'Mock Local Narrator' : `Provider ${i}`,
        kind: i === 1 ? 'mock' : 'openai',
        model: i === 1 ? 'mock-story-v1' : '',
        baseUrl: '',
        apiKeyEnc: '',
        enabled: i === 1,
        priority: i,
        status: i === 1 ? 'healthy' : 'unconfigured',
        lastError: '',
        cooldownUntil: 0,
      });
    }
    await db.providers.bulkAdd(slots);
  }
  const today = new Date().toISOString().slice(0, 10);
  const usage = await db.imageUsage.get('daily');
  if (!usage || usage.date !== today) {
    await db.imageUsage.put({ id: 'daily', date: today, used: 0, limit: 9 });
  }
  await ensureTodaysCollection();
  const { ensureMediaSeeded } = await import('../../services/media/MediaService.js');
  await ensureMediaSeeded();
}
