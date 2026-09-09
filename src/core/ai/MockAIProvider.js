import { BaseAIProvider } from './AIProvider.js';
import { interpretEmojis } from './emojiContext.js';

function lastUserText(recent) {
  const users = (recent || []).filter((m) => m.role === 'user');
  return users.length ? users[users.length - 1].text : '';
}

function nameYou(text, name) {
  return (text || '').replace(/\byou\b/gi, name);
}

export class MockAIProvider extends BaseAIProvider {
  async healthCheck() {
    return { ok: true, name: 'Mock Local Narrator' };
  }

  async sendMessage(payload) {
    return this.generateStoryResponse(payload);
  }

  async summarizeMemory({ messages }) {
    const bits = (messages || [])
      .map((m) => m.text || (m.parts || []).map((p) => p.text).join(' '))
      .filter(Boolean)
      .slice(-6)
      .join(' ');
    if (!bits) return null;
    return { summary: bits.slice(0, 180), importance: bits.length > 40 ? 0.7 : 0.3 };
  }

  async generateStoryResponse({ userText, userName, storyState, characters, memories, recent, age }) {
    const prev = lastUserText(recent) || memories?.slice(-1)?.[0]?.text;
    const emojiRead = interpretEmojis(userText, { previous: prev });
    const name = userName || 'you';
    const loc = storyState?.location || 'rain-slick downtown';
    const names = (characters || []).map((c) => c.name);
    const pick = (want, fallback) => names.find((n) => n.toLowerCase().includes(want)) || fallback || names[0] || 'A voice nearby';
    const lower = (userText || '').toLowerCase();
    const ageGate = Number(age) < 16;
    const parts = [];

    if (emojiRead.onlyEmoji) {
      parts.push({
        kind: 'narration',
        text: nameYou(`They clock the look on your face — ${emojiRead.gloss}.`, name),
      });
    }

    if (lower.includes('trust') || lower.includes('maya')) {
      const who = pick('maya', 'Maya');
      parts.push({
        kind: 'narration',
        text: nameYou(`At ${loc}, ${who} studies your face as if measuring a locked door. The overhead lamps buzz, then dim.`, name),
      });
      parts.push({
        kind: 'dialogue',
        speaker: who,
        text: emojiRead.tone === 'humor' ? 'You really said that out loud. Fine. We do this together.' : 'I want to believe you. Belief is expensive after midnight.',
      });
      parts.push({
        kind: 'narration',
        text: 'Rain needles the tram glass. Somewhere a shop sign blinks a street that is not on any map.',
      });
    } else if (lower.includes('kabir') || lower.includes('joke') || emojiRead.tone === 'humor') {
      const who = pick('kabir', 'Kabir');
      parts.push({ kind: 'narration', text: `${who} flicks a lighter that will not catch. His grin is a shield, not a joke.` });
      parts.push({
        kind: 'dialogue',
        speaker: who,
        text: emojiRead.tone === 'humor' ? 'Okay, midnight glitch city. Very funny universe.' : 'If this is a prank, it is the worst one I have ever loved.',
      });
    } else if (lower.includes('arjun') || lower.includes('secret')) {
      const who = pick('arjun', 'Arjun');
      parts.push({
        kind: 'narration',
        text: `${who} does not look at the missing street. He looks at the space where it used to be.`,
      });
      parts.push({
        kind: 'dialogue',
        speaker: who,
        text: 'Some maps lie to keep you alive. Some lie to keep something else asleep.',
      });
      if (emojiRead.tone === 'watch') {
        parts.push({ kind: 'narration', text: `He notices ${name} watching. He does not explain.` });
      }
    } else if (lower.includes('dev') || lower.includes('police') || lower.includes('inspect')) {
      const who = pick('dev', 'Inspector Dev');
      parts.push({ kind: 'narration', text: `${who} closes his notebook with a patience that feels like a warning.` });
      parts.push({
        kind: 'dialogue',
        speaker: who,
        text: 'People vanish from records, not from sidewalks. Until I see a body, this is panic.',
      });
    } else if (lower.includes('voice') || lower.includes('message') || lower.includes('phone')) {
      parts.push({ kind: 'narration', text: nameYou('Your screen lights without a touch. Letters assemble themselves, slow as frost.', name) });
      parts.push({
        kind: 'dialogue',
        speaker: 'Unknown Voice',
        text: `${name}. Do not answer every door that knows you.`,
      });
    } else if (emojiRead.tone === 'affection' && !ageGate) {
      const who = names[0] || 'Maya';
      parts.push({ kind: 'narration', text: 'For a moment the rain sounds farther away. Someone stands nearer than the plot requires.' });
      parts.push({
        kind: 'dialogue',
        speaker: who,
        text: 'After midnight, kindness is a risk. I am still offering it.',
      });
    } else {
      const who = names[0] || 'A voice nearby';
      parts.push({
        kind: 'narration',
        text: nameYou(`The ${loc} holds its breath. A tram passes without passengers.`, name),
      });
      parts.push({
        kind: 'dialogue',
        speaker: who,
        text: 'Tell me what you want to do. Investigate, follow someone, or pretend this is still a normal night.',
      });
      if (Math.random() > 0.45) {
        parts.push({
          kind: 'narration',
          text: 'A puddle reflects a window that is not behind you.',
        });
      }
    }

    if (!ageGate && /flirt|date|like you|together/i.test(userText || '')) {
      parts.push({
        kind: 'narration',
        text: 'Something unspoken settles — not a confession, only a door left unlatched.',
      });
    }

    const speaker = parts.find((p) => p.kind === 'dialogue')?.speaker;
    const present = storyState?.present?.length ? storyState.present : (characters || []).slice(0, 2).map((c) => c.name);

    return {
      parts,
      nextState: {
        ...(storyState || {}),
        location: storyState?.location || 'Ninth & Hollow',
        present,
        lastBeat: speaker,
        mysteryProgress: Math.min(100, (storyState?.mysteryProgress || 8) + 4),
        lastSpeaker: speaker,
      },
      relationshipDelta: speaker ? { characterName: speaker, userAffinity: emojiRead.tone === 'affection' ? 2 : emojiRead.tone === 'humor' ? 1 : 0 } : null,
      memoryCandidate:
        userText && userText.length > 12
          ? {
              text: `${name}: ${userText.slice(0, 160)}`,
              importance: /promise|secret|trust|clue|love|afraid/i.test(userText) ? 0.85 : 0.4,
            }
          : null,
    };
  }
}
