// Servidor local para probar transcripción sin Vercel.
// Fallback automático: prueba whisperapi y si falla prueba openai (y viceversa).
// Orden con WHISPER_PROVIDER=whisperapi|openai|auto (defecto: whisperapi primero, gratis).
// Sin ninguna key -> la app usa el fallback GRATIS del navegador automáticamente.
//
// Uso:
//   1. Crea .env.local (NO se sube a git):
//      WHISPER_PROVIDER=auto
//      WHISPER_API_KEY=tu-clave-de-whisper-api.com
//      OPENAI_API_KEY=tu-clave-de-openai
//   2. npm run api:dev   (http://localhost:3001)
//   3. npm run dev       (Vite proxea /api -> 3001)
// IMPORTANTE: nunca pegues tus claves en el chat ni en el repo. Si una clave
// se expuso, rotala en el dashboard del proveedor.

require('dotenv').config({ path: '.env.local' });
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json({ limit: '200kb' }));
const upload = multer({ dest: 'temp-uploads/', limits: { fileSize: 10 * 1024 * 1024 } });

// --- Voz de Léo: SOLO la voz CLONADA (XTTS). Sin voces de pago. ---
// Si el clon no responde, el frontend usa su propia voz del navegador.
const VOZ_CACHE = new Map();
const VOCES_VALIDAS = ['Callirrhoe'];
// Caché en disco: lo generado una vez no se vuelve a clonar.
const crypto = require('crypto');
const path = require('path');
const VOZ_DIR = path.join(__dirname, 'voz-cache');
try { fs.mkdirSync(VOZ_DIR, { recursive: true }); } catch { /* noop */ }
function vozArchivo(voz, texto) {
  return path.join(VOZ_DIR, crypto.createHash('sha1').update(`v4:${voz}:${texto}`).digest('hex') + '.json');
}
function leerCacheDisco(voz, texto) {
  try {
    return JSON.parse(fs.readFileSync(vozArchivo(voz, texto), 'utf8'));
  } catch {
    return null;
  }
}
function guardarCacheDisco(voz, texto, out) {
  try {
    fs.writeFileSync(vozArchivo(voz, texto), JSON.stringify(out));
  } catch { /* noop */ }
}
app.get('/api/voces', async (_req, res) => {
  let clon = false;
  try {
    const { clonSalud } = require('./voz-clon/cliente-clon.cjs');
    clon = await clonSalud();
  } catch { /* apagado */ }
  res.json({ voces: VOCES_VALIDAS, defecto: 'Callirrhoe', clonListo: clon });
});

app.post('/api/voz', async (req, res) => {
  const texto = String(req.body?.texto || '').slice(0, 160);
  const voz = 'Callirrhoe';
  if (!texto) return res.status(400).json({ error: 'Falta texto' });
  const ck = `v4:${voz}:${texto}`;
  if (VOZ_CACHE.has(ck)) return res.json({ ...VOZ_CACHE.get(ck), cache: true });
  const enDisco = leerCacheDisco(voz, texto);
  if (enDisco?.audio) {
    VOZ_CACHE.set(ck, enDisco);
    return res.json({ ...enDisco, cache: true });
  }
  // Solo la voz clonada. Sin ella, el frontend usa la voz del navegador.
  try {
    const { clonarLocal } = require('./voz-clon/cliente-clon.cjs');
    const clon = await clonarLocal(texto);
    if (!clon?.audio) {
      return res.status(502).json({ error: 'La voz clonada no esta disponible. Arranca el clon.' });
    }
    const out = { ...clon, voz };
    VOZ_CACHE.set(ck, out);
    guardarCacheDisco(voz, texto, out);
    if (VOZ_CACHE.size > 200) VOZ_CACHE.delete(VOZ_CACHE.keys().next().value);
    res.json({ ...out, cache: false });
  } catch (e) {
    res.status(e?.status || 500).json({ error: e?.message || 'Error generando voz' });
  }
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function transcribeWhisperApi(filePath, mime) {
  const apiKey = process.env.WHISPER_API_KEY;
  if (!apiKey) throw Object.assign(new Error('Falta WHISPER_API_KEY'), { status: 501 });
  const buf = await fs.promises.readFile(filePath);
  const form = new FormData();
  form.append('file', new Blob([buf], { type: mime || 'audio/webm' }), 'lectura.webm');
  const start = await fetch('https://api.whisper-api.com/transcribe', {
    method: 'POST',
    headers: { 'X-API-Key': apiKey },
    body: form,
  });
  if (start.status === 401 || start.status === 403) throw Object.assign(new Error('API key invalida'), { status: 401 });
  if (start.status === 402 || start.status === 429) throw Object.assign(new Error('Cuota agotada del tier free'), { status: 502 });
  if (!start.ok) throw Object.assign(new Error('Error al encolar'), { status: 500 });
  const { task_id } = await start.json();
  // Poll hasta 30s
  for (let i = 0; i < 20; i++) {
    await sleep(1500);
    const st = await fetch(`https://api.whisper-api.com/status/${task_id}`, {
      headers: { 'X-API-Key': apiKey },
    });
    if (!st.ok) continue;
    const data = await st.json();
    if (data.status === 'completed') return String(data.result || '').trim();
    if (data.status === 'failed' || data.status === 'error') throw Object.assign(new Error('Fallo transcripcion'), { status: 500 });
  }
  throw Object.assign(new Error('Timeout esperando transcripcion'), { status: 504 });
}

async function transcribeOpenAI(filePath) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw Object.assign(new Error('Falta OPENAI_API_KEY'), { status: 501 });
  const { OpenAI } = require('openai');
  const openai = new OpenAI({ apiKey });
  const tr = await openai.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: 'whisper-1',
    language: 'es',
  });
  return String(tr?.text || '').trim();
}

function orderedProviders() {
  const pref = (process.env.WHISPER_PROVIDER || 'auto').toLowerCase();
  const base = ['whisperapi', 'openai'];
  if (pref === 'openai') return ['openai', 'whisperapi'];
  if (pref === 'whisperapi') return ['whisperapi', 'openai'];
  return base;
}

function providerHasKey(p) {
  if (p === 'whisperapi') return Boolean(process.env.WHISPER_API_KEY);
  return Boolean(process.env.OPENAI_API_KEY);
}

async function transcribeWithFallback(filePath, mime) {
  const orden = orderedProviders().filter(providerHasKey);
  if (orden.length === 0) throw Object.assign(new Error('Sin claves en servidor. Usa fallback nativo.'), { status: 501 });
  let lastErr = null;
  for (const p of orden) {
    try {
      const texto = p === 'openai' ? await transcribeOpenAI(filePath) : await transcribeWhisperApi(filePath, mime);
      if (texto) return { texto, provider: p };
      lastErr = Object.assign(new Error('Sin texto'), { status: 502 });
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || Object.assign(new Error('Error transcribiendo'), { status: 500 });
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    orden: orderedProviders(),
    gratisNativo: true,
    tieneWhisperApiKey: Boolean(process.env.WHISPER_API_KEY),
    tieneOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
    tieneClon: Boolean(process.env.CLON_URL),
  });
});

app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Falta audio' });
  try {
    const { texto, provider } = await transcribeWithFallback(req.file.path, req.file.mimetype);
    res.json({ texto, provider });
  } catch (e) {
    const status = e?.status || 500;
    res.status(status).json({ error: e?.message || 'Error transcribiendo' });
  } finally {
    fs.promises.unlink(req.file.path).catch(() => {});
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`[transcribe] http://localhost:${PORT} provider=${process.env.WHISPER_PROVIDER || 'auto'}`));
