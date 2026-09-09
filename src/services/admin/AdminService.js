import { db } from '../../core/database/db.js';

const id = (p) => `${p}-${crypto.randomUUID()}`;

export const AdminService = {
  stories: () => db.stories.toArray(),
  getStory: (sid) => db.stories.get(sid),
  async saveStory(story) {
    if (!story.id) story.id = id('story');
    await db.stories.put(story);
    return story;
  },
  async duplicateStory(sid) {
    const s = await db.stories.get(sid);
    if (!s) return;
    const copy = { ...s, id: id('story'), title: `${s.title} (copy)` };
    await db.stories.put(copy);
    const chars = await db.characters.where('storyId').equals(sid).toArray();
    for (const c of chars) {
      const nc = { ...c, id: id('char'), storyId: copy.id };
      await db.characters.put(nc);
      const vp = await db.visualProfiles.where('characterId').equals(c.id).first();
      if (vp) await db.visualProfiles.put({ ...vp, id: id('vp'), characterId: nc.id });
    }
    return copy;
  },
  async deleteStory(sid) {
    const convs = await db.conversations.where('storyId').equals(sid).toArray();
    for (const c of convs) {
      await db.messages.where('conversationId').equals(c.id).delete();
      await db.sceneImages.where('conversationId').equals(c.id).delete();
    }
    await db.conversations.where('storyId').equals(sid).delete();
    await db.memories.where('storyId').equals(sid).delete();
    await db.storyState.where('storyId').equals(sid).delete();
    await db.decisions.where('storyId').equals(sid).delete();
    await db.relationships.where('storyId').equals(sid).delete();
    const chars = await db.characters.where('storyId').equals(sid).toArray();
    for (const ch of chars) {
      await db.visualProfiles.where('characterId').equals(ch.id).delete();
    }
    await db.characters.where('storyId').equals(sid).delete();
    await db.media.where('storyId').equals(sid).delete();
    await db.stories.delete(sid);
  },
  charactersFor: (sid) => db.characters.where('storyId').equals(sid).toArray(),
  async saveCharacter(c) {
    if (!c.id) c.id = id('char');
    await db.characters.put(c);
    return c;
  },
  async deleteCharacter(cid) {
    await db.visualProfiles.where('characterId').equals(cid).delete();
    await db.media.where('characterId').equals(cid).delete();
    const ch = await db.characters.get(cid);
    if (ch) await db.characters.update(cid, { portraitUrl: '' });
    await db.characters.delete(cid);
  },
  async duplicateCharacter(cid) {
    const c = await db.characters.get(cid);
    if (!c) return;
    const copy = { ...c, id: id('char'), name: `${c.name} (copy)` };
    await db.characters.put(copy);
    const vp = await db.visualProfiles.where('characterId').equals(cid).first();
    if (vp) await db.visualProfiles.put({ ...vp, id: id('vp'), characterId: copy.id });
    return copy;
  },
  visualFor: (cid) => db.visualProfiles.where('characterId').equals(cid).first(),
  async saveVisual(vp) {
    if (!vp.id) vp.id = id('vp');
    await db.visualProfiles.put(vp);
  },
  async setDaily(date, storyIds) {
    await db.dailyCollections.put({ id: `col-${date}`, date, storyIds });
  },
  async exportAll() {
    const stories = await db.stories.toArray();
    const characters = await db.characters.toArray();
    const visualProfiles = await db.visualProfiles.toArray();
    const media = await db.media.toArray();
    return { version: 1, stories, characters, visualProfiles, media };
  },
  async importAll(json) {
    if (!json?.stories) throw new Error('Invalid pack');
    await db.stories.bulkPut(json.stories);
    if (json.characters) await db.characters.bulkPut(json.characters);
    if (json.visualProfiles) await db.visualProfiles.bulkPut(json.visualProfiles);
    if (json.media) await db.media.bulkPut(json.media);
  },

  mediaFor: (storyId) => db.media.where('storyId').equals(storyId).toArray(),

  async replaceMediaFile(mediaId, dataUrl) {
    const row = await db.media.get(mediaId);
    if (!row) throw new Error('Media not found');
    const next = { ...row, url: dataUrl };
    await db.media.put(next);
    if (row.kind === 'cover') await db.stories.update(row.storyId, { coverUrl: dataUrl });
    if (row.kind === 'portrait' && row.characterId) {
      await db.characters.update(row.characterId, { portraitUrl: dataUrl });
      const vp = await db.visualProfiles.where('characterId').equals(row.characterId).first();
      if (vp) await db.visualProfiles.update(vp.id, { referenceImage: dataUrl });
    }
    return next;
  },

  async updateMediaMeta(mediaId, patch) {
    const row = await db.media.get(mediaId);
    if (!row) return;
    await db.media.put({ ...row, ...patch, id: row.id, storyId: row.storyId, kind: row.kind });
  },

  async deleteMedia(mediaId) {
    const row = await db.media.get(mediaId);
    if (!row) return;
    await db.media.delete(mediaId);
    if (row.kind === 'cover') {
      const story = await db.stories.get(row.storyId);
      if (story?.coverUrl === row.url) await db.stories.update(row.storyId, { coverUrl: '' });
    }
    if (row.kind === 'portrait' && row.characterId) {
      const ch = await db.characters.get(row.characterId);
      if (ch?.portraitUrl === row.url) await db.characters.update(row.characterId, { portraitUrl: '' });
      const vp = await db.visualProfiles.where('characterId').equals(row.characterId).first();
      if (vp?.referenceImage === row.url) await db.visualProfiles.update(vp.id, { referenceImage: '' });
    }
  },

  async setCoverFromData(storyId, dataUrl, title = 'Cover') {
    const existing = (await db.media.where('storyId').equals(storyId).toArray()).find((m) => m.kind === 'cover');
    if (existing) await db.media.put({ ...existing, url: dataUrl, title });
    else {
      await db.media.put({ id: id('media'), storyId, kind: 'cover', url: dataUrl, title });
    }
    await db.stories.update(storyId, { coverUrl: dataUrl });
  },

  async setPortraitFromData(storyId, characterId, dataUrl, title) {
    const all = await db.media.where('storyId').equals(storyId).toArray();
    const existing = all.find((m) => m.kind === 'portrait' && m.characterId === characterId);
    if (existing) await db.media.put({ ...existing, url: dataUrl, title: title || existing.title });
    else {
      await db.media.put({
        id: id('media'),
        storyId,
        kind: 'portrait',
        characterId,
        url: dataUrl,
        title: title || 'Portrait',
      });
    }
    await db.characters.update(characterId, { portraitUrl: dataUrl });
    const vp = await db.visualProfiles.where('characterId').equals(characterId).first();
    if (vp) await db.visualProfiles.update(vp.id, { referenceImage: dataUrl });
  },

  async addScene(storyId, { url, title, location, moment, characters }) {
    const scenes = (await db.media.where('storyId').equals(storyId).toArray()).filter((m) => m.kind === 'scene');
    if (scenes.length >= 10) throw new Error('Maximum 10 scene images per story');
    const item = {
      id: id('media'),
      storyId,
      kind: 'scene',
      url,
      title: title || 'Scene',
      location: location || '',
      moment: moment || '',
      characters: characters || [],
    };
    await db.media.put(item);
    return item;
  },
};
