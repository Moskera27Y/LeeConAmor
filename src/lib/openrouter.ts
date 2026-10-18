const API_KEY = 'oc_sk_35b232cf5b7a_L7JZYnceD6MVUrRiHbCaP_b3dkqnvls7';
const BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'meta-llama/llama-3.1-8b-instruct:free';

export async function openRouterChat(messages: { role: string; content: string }[]): Promise<string> {
  const r = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
      'HTTP-Referer': 'https://lee-con-amor.vercel.app/',
      'X-Title': 'LeeConAmor',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.3,
      max_tokens: 300,
    }),
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => '');
    throw new Error(`OpenRouter error ${r.status}: ${txt}`);
  }
  const data = await r.json();
  return data?.choices?.[0]?.message?.content || '';
}
