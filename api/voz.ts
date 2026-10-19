// Voz de Léo = SOLO la voz CLONADA (XTTS). No se usa ninguna voz sintética
// de pago ni la voz fea del navegador como resultado final.
//
// Orden de resolución en el cliente (src/hooks/useVoice.ts):
//   1. public/audio  -> audio pregenerado con el clon (gratis, instantáneo)
//   2. /api/voz      -> este endpoint, que llama al clon (CLON_URL)
//   3. voz nativa    -> solo si el clon no está disponible en absoluto
//
// Vercel: define CLON_URL con la URL del Space de HuggingFace
// (carpeta voz-clon-space). Para desarrollo: http://127.0.0.1:7860

// Vercel Hobby corta las funciones a los 10s: hay que declarar el limite.
export const config = { maxDuration: 60 };

const CACHE = new Map<string, { audio: string; mime: string; voz: string; clon: boolean }>();

function baseClon(): string {
  return String(process.env.CLON_URL || '').replace(/\/$/, '');
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const texto = String(req.body?.texto || '').trim().slice(0, 160);
  if (!texto) {
    res.status(400).json({ error: 'Falta texto' });
    return;
  }

  const clonUrl = baseClon();
  if (!clonUrl) {
    res.status(501).json({
      error: 'Voz clonada no configurada en el servidor (falta CLON_URL).',
    });
    return;
  }

  const ck = `clon:${texto}`;
  const hit = CACHE.get(ck);
  if (hit) {
    res.status(200).json({ ...hit, cache: true });
    return;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    const r = await fetch(`${clonUrl}/clonar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!r.ok) {
      res.status(502).json({ error: `El clon respondió ${r.status}` });
      return;
    }

    const data = (await r.json()) as any;
    if (!data?.audio) {
      res.status(502).json({ error: 'El clon no devolvió audio' });
      return;
    }

    const full = { audio: data.audio, mime: data.mime || 'audio/wav', voz: 'Leo', clon: true };
    CACHE.set(ck, full);
    if (CACHE.size > 200) CACHE.delete(CACHE.keys().next().value as string);
    res.status(200).json({ ...full, cache: false });
  } catch {
    res.status(502).json({ error: 'No se pudo contactar con la voz clonada' });
  }
}