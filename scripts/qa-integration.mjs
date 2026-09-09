/* Integration harness: runs the real data layer against fake IndexedDB and
   inspects the exact payloads the AI providers would send. */
import 'fake-indexeddb/auto';
import { readFileSync, existsSync } from 'node:fs';

let failures = 0;
function check(cond, msg) {
  if (cond) {
    console.log(`  ok  ${msg}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${msg}`);
  }
}

const { db, ensureSeeded } = await import('../src/core/database/db.js');
const { StoryService } = await import('../src/services/story/StoryService.js');
const { coverForStory } = await import('../src/services/media/MediaService.js');
const { buildStoryMessages } = await import('../src/core/ai/contextBuilder.js');
const { aiRouter } = await import('../src/core/ai/router.js');
const { LiveChatProvider } = await import('../src/core/ai/providers/LiveChatProvider.js');
const { generateScene, canGenerate } = await import('../src/services/image/ImageService.js');

console.log('\n[1] Seeding');
await ensureSeeded();
const stories = await db.stories.toArray();
check(stories.length === 15, `15 stories seeded (got ${stories.length})`);
check((await db.characters.count()) === 5, '5 characters seeded');
check((await db.visualProfiles.count()) === 5, '5 visual profiles seeded');
check((await db.providers.count()) === 15, '15 provider slots seeded');
const enabled = (await db.providers.toArray()).filter((p) => p.enabled);
check(enabled.length === 1 && enabled[0].kind === 'mock', 'only mock provider enabled by default');
const media = await db.media.toArray();
const brokenMedia = media.filter(
  (m) => typeof m.url === 'string' && m.url.startsWith('/') && !existsSync(`public${m.url}`)
);
check(brokenMedia.length === 0, `all ${media.length} seeded media urls exist on disk${brokenMedia.length ? ` (broken: ${brokenMedia.map((m) => m.url).slice(0, 5).join(', ')})` : ''}`);
const noCover = stories.filter((s) => !coverForStory(s) || (coverForStory(s).startsWith('/') && !existsSync(`public${coverForStory(s)}`)));
check(noCover.length === 0, 'every story resolves to an existing cover image');
const home = await StoryService.homeStories();
check(home.length === 15 && home[0].id === 'story-city-after-midnight', 'home collection returns 15 stories, featured first');

console.log('\n[2] Conversation flow');
const conv = await StoryService.openConversation('story-city-after-midnight');
const state0 = await db.storyState.where('conversationId').equals(conv.id).first();
check(state0?.location === 'Ninth & Hollow', 'story state opens at starting location');
check((state0?.present || []).join(',') === 'Maya,Kabir', 'starting characters present');
check((await db.relationships.where('storyId').equals('story-city-after-midnight').count()) === 5, 'relationship rows created for all 5 characters');
const msgs0 = await StoryService.messages(conv.id);
check(msgs0.length === 1 && msgs0[0].role === 'story', 'opener message materializes');
check(msgs0[0].parts.some((p) => p.kind === 'dialogue' && p.speaker === 'Maya'), 'opener dialogue from Maya');

console.log('\n[3] Send flow — what the provider actually receives');
let seen = null;
const orig = aiRouter.generateStoryResponse.bind(aiRouter);
aiRouter.generateStoryResponse = async (payload, opts) => {
  seen = payload;
  return orig(payload, opts);
};
const profile = { id: 'user', name: 'Nia', age: 28 };
const r1 = await StoryService.sendUserMessage({ conversationId: conv.id, storyId: 'story-city-after-midnight', text: 'I trust Maya', profile });
aiRouter.generateStoryResponse = orig;
check(r1.parts.some((p) => p.kind === 'dialogue' && p.speaker === 'Maya'), 'mock answers with Maya dialogue');
check(
  seen && !seen.recent.some((m) => m.role === 'user' && m.text === seen.userText),
  'recent history must NOT already contain the current user text (it is passed separately as userText)'
);
check(seen && seen.recent.length === 1 && seen.recent[0].role === 'story', 'context starts with the opener only');
const thread = await StoryService.messages(conv.id);
check(thread.length === 3, 'thread has opener + user + reply');

console.log('\n[4] Provider payload construction (mock OpenAI/Anthropic/Gemini fetch capture)');
async function capture(kind) {
  const provider = new LiveChatProvider({ kind, model: 'test-model', apiKey: 'k', baseUrl: '' });
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    if (kind === 'anthropic') return new Response(JSON.stringify({ content: [{ text: '*Rain.*\nMaya: "Stay."' }] }), { status: 200 });
    if (kind === 'gemini') return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '*Rain.*\nMaya: "Stay."' }] } }] }), { status: 200 });
    return new Response(JSON.stringify({ choices: [{ message: { content: '*Rain.*\nMaya: "Stay."' } }] }), { status: 200 });
  };
  const out = await provider.generateStoryResponse({
    userText: seen.userText,
    userName: 'Nia',
    age: 28,
    story: await db.stories.get('story-city-after-midnight'),
    storyState: seen.storyState,
    characters: seen.characters,
    memories: seen.memories,
    recent: seen.recent,
    visuals: seen.visuals,
  });
  return { calls, out };
}
const sequenceOK = (roles, leadOK) => {
  let prev = null;
  for (const r of roles) {
    if (r === prev) return false;
    prev = r;
  }
  return leadOK.includes(roles[0]);
};
{
  const { calls } = await capture('anthropic');
  const roles = calls[0].body.messages.map((m) => m.role);
  check(sequenceOK(roles, ['user', 'assistant']), `anthropic roles alternate (${roles.join('>')})`);
}
{
  const { calls } = await capture('gemini');
  const roles = calls[0].body.contents.map((c) => c.role);
  check(sequenceOK(roles, ['user']), `gemini contents alternate AND start with user (${roles.join('>')})`);
}
{
  const { calls } = await capture('openai');
  const texts = calls[0].body.messages.filter((m) => m.role === 'user').map((m) => m.content);
  check(new Set(texts).size === texts.length, 'openai user messages contain no duplicates');
}
delete globalThis.fetch;

console.log('\n[5] State progression + relationships');
const state1 = await db.storyState.where('conversationId').equals(conv.id).first();
check((state1.mysteryProgress || 0) > 8, `mystery progress advances (now ${state1.mysteryProgress})`);
let seen2 = null;
aiRouter.generateStoryResponse = async (payload, opts) => {
  seen2 = payload;
  return orig(payload, opts);
};
await StoryService.sendUserMessage({ conversationId: conv.id, storyId: 'story-city-after-midnight', text: 'haha lol Kabir that was funny', profile });
aiRouter.generateStoryResponse = orig;
const relKabir = await db.relationships.get(`rel-${conv.id}-char-kabir`);
check((relKabir?.userAffinity || 0) >= 1, `humor raises Kabir affinity (now ${relKabir?.userAffinity})`);
{
  // Second turn: history is opener + full first exchange. Verify alternation holds long-term.
  const { messages } = buildStoryMessages({
    userText: seen2.userText,
    userName: 'Nia',
    age: 28,
    story: stories[0],
    storyState: seen2.storyState,
    characters: seen2.characters,
    memories: seen2.memories,
    recent: seen2.recent,
    visuals: seen2.visuals,
  });
  const roles = messages.map((m) => m.role);
  check(sequenceOK(roles, ['user', 'assistant']), `multi-turn history alternates (${roles.join('>')})`);
  const userTexts = messages.filter((m) => m.role === 'user').map((m) => m.content);
  check(new Set(userTexts).size === userTexts.length, 'no duplicated user turn across multi-turn history');
}

console.log('\n[6] Image generation guardrails');
check(await canGenerate(), 'image quota available');
const noProv = await generateScene({ conversationId: conv.id, story: stories[0], state: state1, characters: [], visuals: [] });
check(noProv.ok === false && noProv.reason === 'failed', 'no healthy image provider -> graceful failure');
check(await canGenerate(), 'failed generation does not consume quota');

console.log(failures ? `\n${failures} FAILURE(S)` : '\nAll integration checks passed');
process.exit(failures ? 1 : 0);
