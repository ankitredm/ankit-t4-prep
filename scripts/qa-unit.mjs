import { parseStoryParts } from '../src/core/ai/parseStory.js';
import { interpretEmojis } from '../src/core/ai/emojiContext.js';
import { MockAIProvider } from '../src/core/ai/MockAIProvider.js';
import { maskKey, encryptSecret, decryptSecret } from '../src/core/security/secrets.js';
import { classifyHttpError } from '../src/core/ai/liveHttp.js';
import { buildImagePrompt, buildStoryMessages } from '../src/core/ai/contextBuilder.js';

function assert(c, m) {
  if (!c) throw new Error(m);
}

const parts = parseStoryParts(`*Rain needles the glass.*\nMaya: "Stay close."\n*A tram passes.*\nKabir: "I hate this street."`);
assert(parts[0].kind === 'narration' && !parts[0].text.includes('*'), 'narration stripped');
assert(parts[1].kind === 'dialogue' && parts[1].speaker === 'Maya', 'maya dialogue');
assert(parts[2].kind === 'narration', 'second narr');
assert(parts[3].speaker === 'Kabir', 'kabir');

const e1 = interpretEmojis('Bro you really did that 💀😂', { previous: 'the door closed' });
assert(e1.tone === 'humor', 'humor not literal skull');
const e2 = interpretEmojis('👀', { previous: 'a secret' });
assert(e2.tone === 'watch' && e2.onlyEmoji, 'watch emoji');
const e3 = interpretEmojis('😳', {});
assert(e3.tone === 'shock', 'shock');

assert(maskKey('sk-abcdefghij').includes('•'), 'mask');
assert(!maskKey('sk-abcdefghij').includes('defgh'), 'mask hides middle');
const enc = await encryptSecret('secret-key-99');
assert(enc.startsWith('al1:'), 'enc prefix');
assert((await decryptSecret(enc)) === 'secret-key-99', 'roundtrip');

const mock = new MockAIProvider({});
const r = await mock.generateStoryResponse({
  userText: 'I trust Maya',
  userName: 'Nia',
  age: 28,
  storyState: { location: 'Ninth & Hollow', present: ['Maya'] },
  characters: [{ name: 'Maya', id: 'char-maya' }],
  memories: [],
  recent: [],
});
assert(r.parts.some((p) => p.kind === 'narration'), 'mock narr');
assert(r.parts.some((p) => p.kind === 'dialogue' && p.speaker === 'Maya'), 'mock maya');
assert(r.parts.every((p) => !String(p.text).includes('*The')), 'no raw stars in mock text typically');

const auth = classifyHttpError(401, 'invalid api key');
assert(auth.code === 'auth', 'auth class');
const rate = classifyHttpError(429, 'rate limit');
assert(rate.code === 'rate', 'rate class');

const ctx = buildStoryMessages({
  userText: 'hello',
  userName: 'Nia',
  story: { title: 'City After Midnight', worldRules: 'maps lie' },
  storyState: { location: 'Ninth & Hollow', present: ['Maya'] },
  characters: [{ id: 'char-maya', name: 'Maya', personality: 'observant' }],
  memories: [{ text: 'User name: Nia' }],
  recent: [{ role: 'user', text: 'hi' }],
  visuals: [{ characterId: 'char-maya', hair: 'black', clothing: 'navy coat' }],
});
assert(ctx.scene.includes('Nia') && ctx.scene.includes('Maya') && ctx.scene.includes('maps lie'), 'context pack');

const visMaya = { characterId: 'char-maya', face: 'sharp', hair: 'black', clothing: 'navy' };
const visKabir = { characterId: 'char-kabir', face: 'grin', hair: 'brown', clothing: 'jacket' };
const prompt = buildImagePrompt({
  story: { title: 'City After Midnight', mood: 'rain' },
  state: { location: 'Ninth & Hollow', lastBeat: 'Maya' },
  characters: [
    { id: 'char-maya', name: 'Maya' },
    { id: 'char-kabir', name: 'Kabir' },
  ],
  visuals: [visMaya, visKabir],
});
assert(prompt.includes('Maya') && prompt.includes('navy') && prompt.includes('Kabir') && prompt.includes('jacket'), 'per-character visuals');
assert(!prompt.includes('undefined'), 'no undefined in prompt');

console.log('QA unit checks passed');
