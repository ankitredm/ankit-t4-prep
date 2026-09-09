export function buildStoryMessages({ userText, userName, age, story, storyState, characters, memories, recent, visuals }) {
  const rec = (recent || [])
    .filter((m) => m.role === 'user' || m.role === 'story')
    .slice(-12)
    .map((m) => {
      if (m.role === 'user') return { role: 'user', content: m.text || '' };
      const body = (m.parts || [])
        .map((p) => (p.kind === 'dialogue' ? `${p.speaker}: "${p.text}"` : `*${p.text}*`))
        .join('\n');
      return { role: 'assistant', content: body };
    });

  const mem = (memories || [])
    .slice(-12)
    .map((m) => m.text)
    .filter(Boolean)
    .join('\n- ');

  const charBlock = (characters || [])
    .slice(0, 8)
    .map((c) => {
      const v = (visuals || []).find((x) => x.characterId === c.id);
      return `${c.name}: ${c.personality || ''}. Style: ${c.speakingStyle || ''}. Appearance: ${c.appearance || ''} ${v ? `${v.hair || ''} ${v.eyes || ''} ${v.clothing || ''}` : ''}. State: ${c.emotionalState || ''}.`;
    })
    .join('\n');

  const scene = [
    `Story: ${story?.title || ''} (${story?.genre || ''})`,
    `World: ${story?.worldRules || ''}`,
    `Setting: ${story?.setting || ''} Tone: ${story?.tone || ''}`,
    `Location: ${storyState?.location || ''}`,
    `Present: ${(storyState?.present || []).join(', ')}`,
    `Objective: ${storyState?.objective || ''}`,
    `Progress: ${storyState?.mysteryProgress ?? ''}`,
    `Player name: ${userName || ''} Age: ${age || ''}`,
    mem ? `Important memories:\n- ${mem}` : '',
    charBlock ? `Characters:\n${charBlock}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    scene,
    messages: rec.concat([{ role: 'user', content: userText || '…' }]),
  };
}

export function buildImagePrompt({ story, state, characters, visuals }) {
  const vis = (visuals || [])
    .map((v) => {
      const c = (characters || []).find((x) => x.id === v.characterId);
      return `${c?.name || 'figure'}: ${v.face || ''} ${v.hair || ''} ${v.hairColor || ''} hair, ${v.eyes || ''} eyes, ${v.clothing || ''}, ${v.accessories || ''}, keep this identity consistent`;
    })
    .join('; ');
  return [
    `Cinematic still from "${story?.title || 'a story'}"`,
    `Moment: ${state?.lastBeat || state?.objective || 'current scene'}`,
    `Location: ${state?.location || story?.setting || ''}`,
    `Present: ${(characters || []).map((c) => c.name).join(', ')}`,
    vis ? `Canonical looks: ${vis}` : '',
    `Environment, weather, lighting, time: ${story?.mood || ''}, story-consistent`,
    `Photoreal cinematic, no text, no watermark, no logo`,
  ]
    .filter(Boolean)
    .join('. ');
}
