/** Parse model text into narration / dialogue parts. Strips duplicate * markers for the UI. */
export function parseStoryParts(raw) {
  const text = String(raw || '').replace(/\r/g, '').trim();
  if (!text) return [{ kind: 'narration', text: 'Silence holds.' }];
  const lines = text.split('\n');
  const parts = [];
  let buf = [];
  const flushNarr = () => {
    const t = buf.join(' ').replace(/^\*+|\*+$/g, '').trim();
    buf = [];
    if (t) parts.push({ kind: 'narration', text: t });
  };
  for (const line of lines) {
    const s = line.trim();
    if (!s) continue;
    const dlg = s.match(/^([A-Z][\w .'-]{0,40}):\s*[“"](.+?)[”"]\s*$/);
    const dlg2 = s.match(/^([A-Z][\w .'-]{0,40}):\s*(.+)$/);
    if (dlg || (dlg2 && !s.startsWith('*'))) {
      flushNarr();
      const m = dlg || dlg2;
      let speech = (m[2] || '').replace(/^["“]|["”]$/g, '').trim();
      parts.push({ kind: 'dialogue', speaker: m[1].trim(), text: speech });
    } else {
      buf.push(s.replace(/^\*+|\*+$/g, '').trim());
    }
  }
  flushNarr();
  return parts.length ? parts : [{ kind: 'narration', text: text.replace(/\*/g, '') }];
}

export const STORY_SYSTEM = `You are the narrator of a private interactive story app called Afterlight.
Write in this format only:

*A narration or action beat, one or two sentences.*

CharacterName: "Spoken dialogue."

*Another narration beat if needed.*

CharacterName: "More dialogue if needed."

Rules:
- Narration lines start and end with a single asterisk pair, describing expression, body language, environment, objects, atmosphere, or events.
- Dialogue is CharacterName: "text" — never put dialogue inside narration asterisks.
- Vary the number of beats. Do not use the same block count every time.
- Stay consistent with established characters, appearance, relationships, and facts.
- Use the user's name naturally when it fits.
- Age-appropriate: no explicit sexual content. Keep romance emotional if present.
- Horror is atmospheric, not gory.
- Emojis: interpret the user's emojis as social/emotional reactions, not literal objects. Use emojis in replies only if the character and mood truly fit — never in every message. Serious or tense scenes: zero emojis.
- Do not mention tokens, models, APIs, memory systems, or that you are an AI.`;
