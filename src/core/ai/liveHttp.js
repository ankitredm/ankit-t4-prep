export function classifyHttpError(status, bodyText) {
  const t = (bodyText || '').toLowerCase();
  if (status === 401 || status === 403 || t.includes('invalid api key') || t.includes('incorrect api key')) {
    return { code: 'auth', message: 'Authentication failed. Check the API key.' };
  }
  if (status === 404 || t.includes('model') && (t.includes('not found') || t.includes('does not exist'))) {
    return { code: 'model', message: 'Model unavailable. Check the model name.' };
  }
  if (status === 429 || t.includes('rate')) {
    return { code: 'rate', message: 'Rate limited. Wait, then retry.' };
  }
  if (status === 0 || status >= 500) {
    return { code: 'provider', message: 'Provider error. Try again later.' };
  }
  if (!status) return { code: 'network', message: 'Network error or the browser blocked the request (CORS).' };
  return { code: 'provider', message: `Provider error (${status}).` };
}

export function endpointFor(kind, baseUrl) {
  const custom = (baseUrl || '').replace(/\/$/, '');
  if (kind === 'openai' || kind === 'openai-compat' || kind === 'image-openai') {
    return custom || 'https://api.openai.com/v1';
  }
  if (kind === 'anthropic') return custom || 'https://api.anthropic.com/v1';
  if (kind === 'gemini') return custom || 'https://generativelanguage.googleapis.com/v1beta';
  return custom;
}

export async function postJson({ url, headers, body, signal }) {
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    });
  } catch {
    const err = new Error('Network error or CORS blocked this provider from the browser.');
    err.code = 'network';
    throw err;
  }
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    const c = classifyHttpError(res.status, text);
    const err = new Error(c.message);
    err.code = c.code;
    err.status = res.status;
    throw err;
  }
  return json;
}
