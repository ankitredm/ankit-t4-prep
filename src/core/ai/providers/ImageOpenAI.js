import { endpointFor, postJson } from '../liveHttp.js';
import { buildImagePrompt } from '../contextBuilder.js';

export async function generateOpenAIImage({ apiKey, model, baseUrl, story, state, characters, visuals }) {
  const prompt = buildImagePrompt({ story, state, characters, visuals });
  const json = await postJson({
    url: `${endpointFor('image-openai', baseUrl)}/images/generations`,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: {
      model: model || 'dall-e-3',
      prompt: prompt.slice(0, 3500),
      n: 1,
      size: '1024x1024',
      response_format: 'b64_json',
    },
  });
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) throw new Error('No image returned');
  return `data:image/png;base64,${b64}`;
}
