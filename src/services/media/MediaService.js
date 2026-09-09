import { db } from '../../core/database/db.js';

const CAM = 'story-city-after-midnight';

const GENRE_COVER = {
  Fantasy: '/media/cover-fantasy.png',
  'Sci-fi': '/media/cover-scifi.png',
  Horror: '/media/cam-scene-blank.png',
  Mystery: '/media/cam-cover.png',
  Thriller: '/media/cam-scene-hollow.png',
  default: '/media/featured-glow.png',
};

export function coverForStory(story) {
  if (story?.coverUrl) return story.coverUrl;
  return GENRE_COVER[story?.genre] || GENRE_COVER.default;
}

/* Prefix site-relative asset URLs with the Vite base so the same bundled
 * assets resolve on Android (base "/"), GitHub Pages (base
 * "/ankit-t4-prep/"), and local dev. Remote, data:, blob:, and capacitor:
 * URLs pass through untouched. Stored DB URLs stay site-relative so QA
 * and existing installs are unaffected — apply at render time only. */
const APP_BASE = (() => {
  try {
    const b = import.meta?.env?.BASE_URL;
    if (typeof b === 'string' && b.length > 1) return b.endsWith('/') ? b.slice(0, -1) : b;
  } catch {
    /* Non-Vite runtime (QA harness): no prefix. */
  }
  return '';
})();

export function withBase(url) {
  if (!url || typeof url !== 'string') return url;
  if (/^(https?:|data:|blob:|capacitor:)/i.test(url)) return url;
  if (!APP_BASE) return url;
  return `${APP_BASE}${url.startsWith('/') ? url : `/${url}`}`;
}

/* Render-ready cover: base-aware, for <img> and background-image use. */
export function coverSrc(story) {
  return withBase(coverForStory(story));
}

export async function mediaForStory(storyId) {
  return db.media.where('storyId').equals(storyId).toArray();
}

const CAM_SCENES = [
  { id: 'media-hollow', url: '/media/cam-scene-hollow.png', title: 'Ninth & Hollow', location: 'Ninth & Hollow', moment: 'The first empty tram', characters: ['Maya', 'Kabir'] },
  { id: 'media-blank', url: '/media/cam-scene-blank.png', title: 'The Blank Block', location: 'The Blank Block', moment: 'A street that is no longer there', characters: ['Arjun'] },
  { id: 'media-cam-s1', url: '/media/cam-s1.png', title: 'Opening midnight', location: 'Plaza', moment: 'The city holds its breath', characters: [] },
  { id: 'media-cam-s2', url: '/media/cam-s2.png', title: 'Bakery window', location: 'Vanished street', moment: 'Warm light, wrong map', characters: ['Maya'] },
  { id: 'media-cam-s3', url: '/media/cam-s3.png', title: 'Rooftop', location: 'Maya’s rooftop', moment: 'Two watch the missing block', characters: ['Maya', 'Kabir'] },
  { id: 'media-cam-s4', url: '/media/cam-s4.png', title: 'Unknown number', location: 'Anywhere', moment: 'The Voice writes first', characters: ['Unknown Voice'] },
  { id: 'media-cam-s5', url: '/media/cam-s5.png', title: 'Precinct night', location: 'Dev’s precinct', moment: 'Paper trails and rain', characters: ['Inspector Dev'] },
  { id: 'media-cam-s6', url: '/media/cam-s6.png', title: 'Cut map', location: 'Archive table', moment: 'A street removed from paper', characters: ['Maya'] },
  { id: 'media-cam-s7', url: '/media/cam-s7.png', title: 'Tram Line 4', location: 'Tram Line 4', moment: 'Empty car, unlit stop', characters: ['Kabir'] },
  { id: 'media-cam-s8', url: '/media/cam-s8.png', title: 'Almost dawn', location: 'Coastal edge', moment: 'Last lamps before a choice', characters: [] },
];

const EXTRA_MOMENTS = ['Opening still', 'Main location', 'A quiet approach', 'The discovery', 'Turning point'];

export async function ensureMediaSeeded() {
  const app = (await db.settings.get('app')) || { id: 'app' };
  if (app.mediaSeeded || (await db.media.count()) > 0) {
    if (!app.mediaSeeded) await db.settings.put({ ...app, id: 'app', mediaSeeded: true });
    await patchStoryCovers();
    return;
  }

  const items = [
    {
      id: 'media-cam-cover',
      storyId: CAM,
      kind: 'cover',
      url: '/media/cam-cover.png',
      title: 'After midnight',
    },
    ...CAM_SCENES.map((s) => ({ ...s, storyId: CAM, kind: 'scene' })),
    { id: 'media-maya', storyId: CAM, kind: 'portrait', characterId: 'char-maya', url: '/media/maya.png', title: 'Maya' },
    { id: 'media-kabir', storyId: CAM, kind: 'portrait', characterId: 'char-kabir', url: '/media/kabir.png', title: 'Kabir' },
    { id: 'media-arjun', storyId: CAM, kind: 'portrait', characterId: 'char-arjun', url: '/media/arjun.png', title: 'Arjun' },
    { id: 'media-dev', storyId: CAM, kind: 'portrait', characterId: 'char-dev', url: '/media/dev.png', title: 'Inspector Dev' },
  ];

  const stories = await db.stories.toArray();
  for (const s of stories) {
    if (s.id === CAM) continue;
    if (!s.coverUrl) await db.stories.update(s.id, { coverUrl: coverForStory(s) });
    items.push({
      id: `media-cover-${s.id}`,
      storyId: s.id,
      kind: 'cover',
      url: coverForStory(s),
      title: s.title,
    });
    EXTRA_MOMENTS.forEach((moment, i) => {
      items.push({
        id: `media-${s.id}-s${i + 1}`,
        storyId: s.id,
        kind: 'scene',
        url: `/media/scenes/${s.id}-s${i + 1}.svg`,
        title: moment,
        location: s.setting || s.title,
        moment,
        characters: [],
      });
    });
  }

  await db.media.bulkPut(items);
  await db.stories.update(CAM, { coverUrl: '/media/cam-cover.png' });
  await db.characters.update('char-maya', { portraitUrl: '/media/maya.png' });
  await db.characters.update('char-kabir', { portraitUrl: '/media/kabir.png' });
  await db.characters.update('char-arjun', { portraitUrl: '/media/arjun.png' });
  await db.characters.update('char-dev', { portraitUrl: '/media/dev.png' });
  await db.visualProfiles.update('vp-maya', { referenceImage: '/media/maya.png' });
  await db.visualProfiles.update('vp-kabir', { referenceImage: '/media/kabir.png' });
  await db.visualProfiles.update('vp-arjun', { referenceImage: '/media/arjun.png' });
  await db.visualProfiles.update('vp-dev', { referenceImage: '/media/dev.png' });
  await db.settings.put({ ...app, id: 'app', mediaSeeded: true });
  await patchStoryCovers();
}

async function patchStoryCovers() {
  /* Do not invent covers for stories that have none — Workshop media stays authoritative. */
}
