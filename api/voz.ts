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

// El clon puede tardar; se declara el máximo del runtime y el fetch tiene su
// propio timeout de 45 s. Ajusta el plan de Vercel si tu límite es menor.
export const config = { maxDuration: 60 };

type Registro = { usos: number; reinicio: number };

const limites = new Map<string, Registro>();

function ipDe(req: any): string {
  const fwd = String(req.headers?.['x-forwarded-for'] || '');
  return fwd.split(',')[0].trim() || String(req.socket?.remoteAddress || 'anon');
}

function permitirPeticion(req: any, maximo: number, ventanaMs = 60_000): boolean {
  const ip = ipDe(req);
  const ahora = Date.now();
  const actual = limites.get(ip);
  if (!actual || actual.reinicio <= ahora) {
    limites.set(ip, { usos: 1, reinicio: ahora + ventanaMs });
    return true;
  }
  if (actual.usos >= maximo) return false;
  actual.usos += 1;
  if (limites.size > 5000) {
    for (const [k, v] of limites) {
      if (v.reinicio <= ahora) limites.delete(k);
    }
  }
  return true;
}

function responderLimite(res: any) {
  res.setHeader('Retry-After', '60');
  res.status(429).json({ error: 'Demasiadas peticiones. Espera un momento.' });
}

function cuerpoDemasiadoGrande(req: any, maxBytes: number): boolean {
  const largo = Number(req.headers?.['content-length'] || 0);
  return Number.isFinite(largo) && largo > maxBytes;
}

const CACHE = new Map<string, { audio: string; mime: string; voz: string; clon: boolean }>();

function baseClon(): string {
  return String(process.env.CLON_URL || '').replace(/\/$/, '');
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }
    if (cuerpoDemasiadoGrande(req, 8 * 1024)) {
      res.status(413).json({ error: 'Texto demasiado largo' });
      return;
    }
    if (!permitirPeticion(req, 30)) {
      responderLimite(res);
      return;
    }

    const texto = String(req.body?.texto || '').trim().slice(0, 160);
    if (!texto) {
      res.status(400).json({ error: 'Falta texto' });
      return;
    }

    const clonUrl = baseClon();
    if (!clonUrl) {
      res.status(501).json({ error: 'Voz clonada no configurada en el servidor (falta CLON_URL).' });
      return;
    }

    const ck = `clon:${texto}`;
    const hit = CACHE.get(ck);
    if (hit) {
      res.status(200).json({ ...hit, cache: true });
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 40000);
    try {
      const r = await fetch(`${clonUrl}/clonar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto }),
        signal: controller.signal,
      });

      if (!r.ok) {
        res.status(502).json({ error: `El clon respondió ${r.status}` });
        return;
      }

      const data = (await r.json()) as any;
      if (typeof data?.audio !== 'string' || data.audio.length === 0 || data.audio.length > 6_000_000) {
        res.status(502).json({ error: 'El clon no devolvió audio válido' });
        return;
      }

      const full = { audio: data.audio, mime: data.mime || 'audio/wav', voz: 'Leo', clon: true };
      CACHE.set(ck, full);
      if (CACHE.size > 60) CACHE.delete(CACHE.keys().next().value as string);
      res.status(200).json({ ...full, cache: false });
    } finally {
      clearTimeout(timer);
    }
  } catch {
    res.status(502).json({ error: 'No se pudo contactar con la voz clonada' });
  }
}