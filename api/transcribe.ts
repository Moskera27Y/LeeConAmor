// Proxy SEGURO. Las keys NUNCA salen al frontend.
// Fallback automático: prueba whisperapi y si falla prueba openai (orden con WHISPER_PROVIDER).
// Vercel: define WHISPER_API_KEY y/o OPENAI_API_KEY en Environment Variables.
// Sin keys -> frontend usa fallback GRATIS del navegador.
// Si una clave se expuso en un chat, rotala en el dashboard del proveedor.

import { IncomingForm } from 'formidable';
import fs from 'fs';

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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function parseMultipart(req: any): Promise<{ audioPath: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({ maxFileSize: 10 * 1024 * 1024, keepExtensions: true });
    form.parse(req, (err: any, _fields: any, files: any) => {
      if (err) return reject(err);
      const f = files?.audio?.[0] ?? files?.audio ?? files?.file?.[0] ?? files?.file;
      if (!f?.filepath) return reject(Object.assign(new Error('Falta audio'), { status: 400 }));
      resolve({ audioPath: f.filepath, mime: String(f.mimetype || 'audio/webm') });
    });
  });
}

// Formatos que de verdad graba MediaRecorder en los navegadores.
function mimeSoportado(mime: string): boolean {
  const m = mime.toLowerCase();
  return m.startsWith('audio/') || m === 'video/webm' || m === 'application/ogg';
}

// Mensajes fijos por código: el detalle real del proveedor (rutas, respuestas
// HTTP internas, cuotas) nunca se reenvía al cliente.
const MENSAJES_PUBLICOS: Record<number, string> = {
  400: 'No se recibió el audio.',
  401: 'La clave del proveedor de transcripción no es válida.',
  415: 'Formato de audio no soportado.',
  502: 'El proveedor de transcripción no está disponible ahora.',
  504: 'La transcripción tardó demasiado. Intenta de nuevo.',
};

function mensajePublico(status: number): string {
  return MENSAJES_PUBLICOS[status] || 'No se pudo transcribir el audio. Usa la lectura guiada.';
}

async function transcribeWhisperApi(audioPath: string, mime: string): Promise<string> {
  const t0 = Date.now();
  const apiKey = process.env.WHISPER_API_KEY;
  if (!apiKey) throw Object.assign(new Error('Falta WHISPER_API_KEY'), { status: 501 });
  const buf = await fs.promises.readFile(audioPath);
  const form = new FormData();
  form.append('file', new Blob([buf], { type: mime }), 'lectura.webm');
  const start = await fetch('https://api.whisper-api.com/transcribe', {
    method: 'POST',
    headers: { 'X-API-Key': apiKey },
    body: form,
  });
  if (start.status === 401 || start.status === 403)
    throw Object.assign(new Error('API key invalida'), { status: 401 });
  if (start.status === 402 || start.status === 429)
    throw Object.assign(new Error('Cuota agotada del tier free'), { status: 502 });
  if (!start.ok) throw Object.assign(new Error('Error al encolar'), { status: 500 });
  const { task_id } = (await start.json()) as { task_id: string };
  // 20 vueltas * 1.5s = 30s, pero con red lenta conviene un tope de ~50s (limite Vercel 60s)
  for (let i = 0; i < 22; i++) {
    await sleep(1500);
    if (Date.now() - t0 > 50000) break;
    const st = await fetch(`https://api.whisper-api.com/status/${task_id}`, {
      headers: { 'X-API-Key': apiKey },
    });
    if (!st.ok) continue;
    const data = (await st.json()) as { status: string; result: string | null };
    if (data.status === 'completed') return String(data.result || '').trim();
    if (data.status === 'failed' || data.status === 'error')
      throw Object.assign(new Error('Fallo transcripcion'), { status: 500 });
  }
  throw Object.assign(new Error('Timeout esperando transcripcion'), { status: 504 });
}

async function transcribeOpenAI(audioPath: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw Object.assign(new Error('Falta OPENAI_API_KEY'), { status: 501 });
  const { default: OpenAI } = await import('openai');
  const openai = new OpenAI({ apiKey });
  const tr: any = await (openai.audio.transcriptions.create as any)({
    file: fs.createReadStream(audioPath) as any,
    model: 'whisper-1',
    language: 'es',
  });
  return String(tr?.text || '').trim();
}

function orderedProviders(): Array<'whisperapi' | 'openai'> {
  const pref = (process.env.WHISPER_PROVIDER || 'auto').toLowerCase();
  if (pref === 'openai') return ['openai', 'whisperapi'];
  return ['whisperapi', 'openai'];
}

function providerHasKey(p: string): boolean {
  if (p === 'whisperapi') return Boolean(process.env.WHISPER_API_KEY);
  return Boolean(process.env.OPENAI_API_KEY);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  // 10 transcripciones por minuto y IP: este endpoint cuesta cuota real.
  if (!permitirPeticion(req, 10)) {
    responderLimite(res);
    return;
  }
  let audioPath = '';
  try {
    const parsed = await parseMultipart(req);
    audioPath = parsed.audioPath;
    if (!mimeSoportado(parsed.mime)) {
      res.status(415).json({ error: mensajePublico(415) });
      return;
    }
    const orden = orderedProviders().filter(providerHasKey);
    if (orden.length === 0) {
      res.status(501).json({ error: 'Sin claves en servidor. Usa fallback nativo.' });
      return;
    }
    let lastErr: any = null;
    for (const p of orden) {
      try {
        const texto = p === 'openai' ? await transcribeOpenAI(audioPath) : await transcribeWhisperApi(audioPath, parsed.mime);
        if (texto) {
          res.status(200).json({ texto, provider: p });
          return;
        }
        lastErr = Object.assign(new Error('Sin texto, usa fallback nativo'), { status: 502 });
      } catch (e) {
        lastErr = e;
      }
    }
    const status = Number(lastErr?.status) || 500;
    res.status(status).json({ error: mensajePublico(status) });
  } catch (e: any) {
    const status = Number(e?.status) || 500;
    res.status(status).json({ error: mensajePublico(status) });
  } finally {
    if (audioPath) fs.promises.unlink(audioPath).catch(() => {});
  }
}
