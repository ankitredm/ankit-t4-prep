import { db } from '../../core/database/db.js';

const uid = (p) => `${p}-${crypto.randomUUID()}`;

function visual(partial) {
  return {
    face: 'Defined features, cinematic lighting',
    hair: 'Dark',
    hairColor: 'black',
    eyes: 'brown',
    clothing: 'layered nightwear',
    accessories: '',
    appearance: 'recognizable silhouette',
    artStyle: 'cinematic realism, muted neon',
    referenceImage: '',
    ...partial,
  };
}

export async function seedLibrary() {
  const cam = {
    id: 'story-city-after-midnight',
    title: 'City After Midnight',
    genre: 'Mystery',
    tags: ['Horror', 'Drama', 'Mystery'],
    hook: 'After midnight the city edits itself. Streets vanish. Phones speak in unknown numbers.',
    premise:
      'A normal city begins behaving strangely after midnight. Certain streets disappear from maps, people receive messages from unknown numbers, and some characters seem to know things they should not know.',
    mood: 'Uneasy rain',
    coverHue: 210,
    coverUrl: '/media/cam-cover.png',
    enabled: true,
    worldRules: 'After 00:00, cartography lies. Names have weight. Doors remember who knocked.',
    tone: 'Atmospheric mystery-horror, character-driven, not gory',
    setting: 'Coastal megacity, monsoon season',
    locations: ['Ninth & Hollow', 'The Blank Block', 'Tram Line 4', 'Dev’s precinct', 'Maya’s rooftop'],
    importantEvents: ['First vanished street', 'Unknown Voice first message', 'Arjun’s contradiction'],
    branchingRules: 'Trust, location, and clue flags alter who speaks and what is revealed.',
    endingConditions: 'Resolve the Voice, expose Arjun, or abandon the city before dawn.',
    startingLocation: 'Ninth & Hollow',
    startingCharacters: ['Maya', 'Kabir'],
    objective: 'Find why the map is lying',
    variables: { mysteryProgress: 8, clues: [] },
  };

  const extras = [
    ['The Glass Orchard', 'Fantasy', 'A forest of living glass remembers every promise broken under its leaves.', 'Wistful', 160],
    ['Signal from Kepler', 'Sci-fi', 'A deep-space ping answers with your childhood nickname.', 'Cold awe', 200],
    ['Last Laugh on Stage 9', 'Comedy', 'The understudy is funnier than death and possibly not human.', 'Bright', 40],
    ['Red Ledger', 'Crime', 'A stolen account book lists people who have not been born yet.', 'Noir', 350],
    ['Saltwind Heist', 'Adventure', 'The tide steals the vault every dusk unless someone stays inside.', 'Bold', 25],
    ['Quiet House, Loud Years', 'Drama', 'Three siblings inherit a house that plays back arguments in empty rooms.', 'Tender', 20],
    ['Crown of Ashmere', 'Historical', 'A courier in 1487 carries a letter that rewrites who sits on the throne.', 'Grave', 30],
    ['Veil Between Bells', 'Supernatural', 'Church bells ring thirteen; something polite asks to be invited in.', 'Hushed', 270],
    ['Cape of Ordinary Days', 'Superhero', 'Powers only work when no one is watching — including you.', 'Ironic', 190],
    ['Harbor of Small Mercies', 'Romance', 'Two night-shift ferry workers keep missing the last boat on purpose.', 'Warm', 330],
    ['The Interview Room', 'Psychological mystery', 'Every answer you give appears on the wall behind the interviewer.', 'Tight', 280],
    ['Hollow Broadcast', 'Thriller', 'A radio host describes your apartment in real time.', 'Pulse', 0],
    ['Lantern Below', 'Paranormal', 'Miners follow a light that has no source and knows their names.', 'Damp dread', 90],
    ['The Unwritten Season', 'Horror', 'Summer refuses to end until someone admits what happened at the lake.', 'Slow burn', 10],
  ];

  const stories = [cam];
  extras.forEach(([title, genre, hook, mood, coverHue], i) => {
    stories.push({
      id: `story-${i + 2}`,
      title,
      genre,
      tags: [genre],
      hook,
      premise: hook,
      mood,
      coverHue,
      enabled: true,
      worldRules: 'Tone-consistent internal logic.',
      tone: mood,
      setting: 'Varies',
      locations: ['Opening scene'],
      importantEvents: [],
      branchingRules: 'User choices shift relationship and location.',
      endingConditions: 'Complete the personal objective.',
      startingLocation: 'Opening scene',
      startingCharacters: [],
      objective: 'Begin',
      variables: { mysteryProgress: 0, clues: [] },
    });
  });

  await db.stories.bulkAdd(stories);

  const chars = [
    {
      id: 'char-maya',
      storyId: cam.id,
      name: 'Maya',
      ageNote: 'Adult, late twenties',
      personality: 'Intelligent, observant, emotionally complex',
      speakingStyle: 'Precise, rarely wastes words, occasional dry heat',
      likes: 'Maps, late tea, honest fear',
      dislikes: 'Performative bravery, being managed',
      goals: 'Understand the city’s rewrite before it erases someone she loves',
      fears: 'That she already knew and forgot',
      secrets: 'She received a Voice message a week earlier and told no one',
      background: 'Cartographer for the municipal archive',
      history: 'Lost a brother to an “administrative error” last winter',
      emotionalState: 'alert, guarded warmth',
      appearance: 'Sharp collarbones, rain-dark coat, ink-stained fingers',
    },
    {
      id: 'char-kabir',
      storyId: cam.id,
      name: 'Kabir',
      ageNote: 'Adult, mid twenties',
      personality: 'Funny, loyal, occasionally reckless',
      speakingStyle: 'Jokes first, truth second, never cruel',
      likes: 'Street food, motorbikes, Maya’s patience',
      dislikes: 'Official silence',
      goals: 'Keep the group moving',
      fears: 'Becoming a punchline in a tragedy',
      secrets: 'He followed Arjun two nights ago and lost an hour',
      background: 'Night courier',
      history: 'Grew up on Line 4',
      emotionalState: 'deflecting',
      appearance: 'Messy hair, scuffed jacket, easy smile that does not reach the eyes when it matters',
    },
    {
      id: 'char-arjun',
      storyId: cam.id,
      name: 'Arjun',
      ageNote: 'Adult, age unclear',
      personality: 'Mysterious newcomer with hidden knowledge',
      speakingStyle: 'Soft, elliptical, never quite answering',
      likes: 'Old maps, rain that falls upward',
      dislikes: 'Direct questions about origin',
      goals: 'Unknown',
      fears: 'Being named correctly',
      secrets: 'He does not appear on any city record before this week',
      background: 'Claims to be a visiting archivist',
      history: 'Blank',
      emotionalState: 'unreadable',
      appearance: 'Pale coat, unweathered shoes, eyes that look older than the rest of him',
    },
    {
      id: 'char-dev',
      storyId: cam.id,
      name: 'Inspector Dev',
      ageNote: 'Adult, forties',
      personality: 'Skeptical investigator',
      speakingStyle: 'Clipped, procedural, flashes of reluctant care',
      likes: 'Paper trails, strong coffee',
      dislikes: 'Folklore in police reports',
      goals: 'A mundane explanation',
      fears: 'That there is none',
      secrets: 'He filed a missing-street report and was told to recant',
      background: 'Precinct 12',
      history: 'Twenty years without a closed “impossible”',
      emotionalState: 'tired steel',
      appearance: 'Grey at the temples, rumpled badge, always slightly wet',
    },
    {
      id: 'char-voice',
      storyId: cam.id,
      name: 'Unknown Voice',
      ageNote: 'Unknown',
      personality: 'Unexplained entity communicating through messages',
      speakingStyle: 'Short, imperative, intimate without permission',
      likes: 'Obedience, true names',
      dislikes: 'Daylight, recordings',
      goals: 'Guide or harvest — unclear',
      fears: 'Being ignored',
      secrets: 'It uses the grammar of someone the user once trusted',
      background: 'None',
      history: 'First ping: 00:01',
      emotionalState: 'patient',
      appearance: 'No body. Text on glass. Sometimes a silhouette in condensation',
    },
  ];
  await db.characters.bulkAdd(chars);

  await db.visualProfiles.bulkAdd([
    { id: 'vp-maya', characterId: 'char-maya', ...visual({ hair: 'shoulder-length black', eyes: 'dark brown', clothing: 'ink-navy coat, scarf', accessories: 'brass map pin' }) },
    { id: 'vp-kabir', characterId: 'char-kabir', ...visual({ hair: 'tousled brown', eyes: 'hazel', clothing: 'scuffed courier jacket', accessories: 'helmet clip' }) },
    { id: 'vp-arjun', characterId: 'char-arjun', ...visual({ hair: 'neat black', eyes: 'grey-brown', clothing: 'pale unweathered coat', accessories: 'no watch' }) },
    { id: 'vp-dev', characterId: 'char-dev', ...visual({ hair: 'salt-and-pepper', eyes: 'tired brown', clothing: 'wrinkled overcoat', accessories: 'badge' }) },
    { id: 'vp-voice', characterId: 'char-voice', ...visual({ face: 'no face', hair: 'none', eyes: 'none', clothing: 'condensation and light', appearance: 'absence shaped like a person' }) },
  ]);

  const today = new Date().toISOString().slice(0, 10);
  await db.dailyCollections.put({
    id: `col-${today}`,
    date: today,
    storyIds: stories.slice(0, 15).map((s) => s.id),
  });
}
