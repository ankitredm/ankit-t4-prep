const MASK = '••••••••';

export function maskKey(key) {
  if (!key) return '';
  if (key.length < 8) return MASK;
  return `${key.slice(0, 3)}${MASK}${key.slice(-2)}`;
}

function bytesToB64(bytes) {
  let bin = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function b64ToBytes(b64) {
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Local obfuscation only — not device-keystore encryption. Never log the result. */
export async function encryptSecret(plain) {
  if (!plain) return '';
  const enc = new TextEncoder().encode(plain);
  return `al1:${bytesToB64(enc)}`;
}

export async function decryptSecret(stored) {
  if (!stored) return '';
  if (!stored.startsWith('al1:')) return stored;
  try {
    return new TextDecoder().decode(b64ToBytes(stored.slice(4)));
  } catch {
    return '';
  }
}
