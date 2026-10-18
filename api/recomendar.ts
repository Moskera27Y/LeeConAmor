// Recomendacion de nivel con IA. La API key de OpenRouter NUNCA sale al frontend.
// Vercel: define OPENROUTER_API_KEY en Environment Variables.
// Sin key -> el frontend usa el calculo local (evaluarRespuestas) automaticamente.

const MODELO_POR_DEFECTO = 'meta-llama/llama-3.1-8b-instruct:free';
const BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

export const config = { maxDuration: 30 };

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const apiKey = String(process.env.OPENROUTER_API_KEY || '').trim();
  if (!apiKey) {
    res.status(501).json({ error: 'Falta OPENROUTER_API_KEY en servidor. Se usara el nivel local.' });
    return;
  }

  const respuestas = req.body?.respuestas ?? {};
  const rango = String(req.body?.rango || '3-5');
  const nombre = String(req.body?.nombre || 'el peque').slice(0, 40);
  const resumenLocal = String(req.body?.resumenLocal || '');

  const prompt = `Eres una maestra de educacion inicial en espanol. Un nino/a llamado ${nombre} (rango ${rango}) respondio esta evaluacion inicial de lectura:\n${resumenLocal}\n\nResponde SOLO con un JSON valido con estos campos: nivelRecomendado (numero), etapaRecomendada (texto), observaciones (array de frases cortas en espanol). No anadas texto extra.`;

  try {
    const r = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://lee-con-amor.vercel.app/',
        'X-Title': 'LeeConAmor',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || MODELO_POR_DEFECTO,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 300,
        response_format: { type: 'json_object' },
      }),
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      res.status(502).json({ error: `OpenRouter ${r.status}: ${txt.slice(0, 200)}` });
      return;
    }
    const data = (await r.json()) as any;
    const contenido = data?.choices?.[0]?.message?.content || '';
    let json: any = {};
    try {
      json = JSON.parse(contenido);
    } catch {
      // El modelo a veces envuelve el JSON en texto: recuperamos el primer {...}
      const m = /\{[\s\S]*\}/.exec(contenido);
      if (!m) {
        res.status(502).json({ error: 'La IA no devolvio JSON' });
        return;
      }
      try {
        json = JSON.parse(m[0]);
      } catch {
        res.status(502).json({ error: 'La IA no devolvio JSON valido' });
        return;
      }
    }
    res.status(200).json({
      nivelRecomendado: typeof json.nivelRecomendado === 'number' ? json.nivelRecomendado : null,
      etapaRecomendada: typeof json.etapaRecomendada === 'string' ? json.etapaRecomendada : null,
      observaciones: Array.isArray(json.observaciones) ? json.observaciones.map((o: unknown) => String(o)) : null,
    });
  } catch {
    res.status(500).json({ error: 'Error consultando la IA' });
  }
}