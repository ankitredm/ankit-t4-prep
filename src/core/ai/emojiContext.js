export function interpretEmojis(text, ctx = {}) {
  const raw = text || '';
  const trimmed = raw.trim();
  const onlyEmoji = trimmed.length > 0 && /^[\p{Extended_Pictographic}\p{Emoji_Presentation}\uFE0F\s]+$/u.test(trimmed);

  const laughish = /😂|🤣|💀|😭|lmao|lol|haha/i.test(raw);
  const warm = /❤|♥|💕|🥺|😘|🫶/.test(raw);
  const tense = /😱|😳|😨|😬/.test(raw);
  const watch = /👀|🧐/.test(raw);
  const prev = (ctx.previous || '').toLowerCase();

  let tone = 'neutral';
  if (laughish) tone = 'humor';
  else if (warm) tone = 'affection';
  else if (watch) tone = 'watch';
  else if (tense) tone = 'shock';

  let gloss = 'a quiet reaction';
  if (tone === 'humor') {
    gloss = 'amused disbelief at the last beat, not a literal object';
  } else if (tone === 'affection') {
    gloss = 'soft warmth toward what just happened';
  } else if (tone === 'shock') {
    gloss = 'surprise or embarrassment, not a demand';
  } else if (tone === 'watch') {
    gloss = 'attention and suspicion, watching closely';
  }
  if (onlyEmoji && ctx.previous) gloss += ' — answering the last moment without words';
  if (prev.includes('secret') && tone === 'watch') gloss = 'they caught that you noticed the secret';

  return { tone, onlyEmoji, gloss };
}
