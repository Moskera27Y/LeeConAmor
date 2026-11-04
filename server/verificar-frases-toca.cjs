// Verifica que los audios de "Toca la letra/vocal X" dicen realmente lo que
// su clave promete: transcribe cada wav con whisperapi y compara.
// Uso: node server/verificar-frases-toca.cjs  (requiere WHISPER_API_KEY en .env.local)
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RAIZ = path.join(__dirname, '..');
const mapaRaw = fs.readFileSync(path.join(RAIZ, 'src', 'data', 'audioFijo.ts'), 'utf8');
const bloque = mapaRaw.match(/\{[\s\S]*\}/);
const mapa = JSON.parse(bloque[0]);

const CLAVES = Object.keys(mapa).filter((k) => /^Toca la (letra|vocal) .+\.$/.test(k));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9ñ\s]/g, '').replace(/\s+/g, ' ').trim();

async function transcribir(ruta) {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    const buf = fs.readFileSync(ruta);
    const form = new FormData();
    form.append('file', new Blob([buf], { type: 'audio/wav' }), 'f.wav');
    form.append('model', 'whisper-1');
    form.append('language', 'es');
    const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST', headers: { Authorization: `Bearer ${openaiKey}` }, body: form,
    });
    if (r.ok) {
      const data = await r.json();
      const t = String(data?.text || '').trim();
      if (t) return t;
    }
  }
  const apiKey = process.env.WHISPER_API_KEY;
  if (!apiKey) return '(sin clave)';
  const buf = fs.readFileSync(ruta);
  const form = new FormData();
  form.append('file', new Blob([buf], { type: 'audio/wav' }), 'f.wav');
  let start = await fetch('https://api.whisper-api.com/transcribe', {
    method: 'POST', headers: { 'X-API-Key': apiKey }, body: form,
  });
  for (let reintento = 0; reintento < 5 && start.status === 429; reintento++) {
    await sleep(30000);
    start = await fetch('https://api.whisper-api.com/transcribe', {
      method: 'POST', headers: { 'X-API-Key': apiKey }, body: form,
    });
  }
  if (!start.ok) throw new Error(`start ${start.status}`);
  const { task_id } = await start.json();
  for (let i = 0; i < 20; i++) {
    await sleep(1500);
    const st = await fetch(`https://api.whisper-api.com/status/${task_id}`, { headers: { 'X-API-Key': apiKey } });
    if (!st.ok) continue;
    const data = await st.json();
    if (data.status === 'completed') return String(data.result || '').trim();
    if (data.status === 'failed' || data.status === 'error') return '(fallo)';
  }
  return '(timeout)';
}

(async () => {
  if (!process.env.OPENAI_API_KEY && !process.env.WHISPER_API_KEY) {
    console.log('Sin claves de transcripción');
    process.exit(1);
  }
  let mal = 0;
  for (const k of CLAVES) {
    const archivo = path.join(RAIZ, 'public', mapa[k].replace(/^\//, ''));
    if (!fs.existsSync(archivo)) { console.log(`FALTA ARCHIVO: ${k}`); mal++; continue; }
    const dicho = await transcribir(archivo);
    const ok = norm(dicho).includes(norm(k));
    if (!ok) mal++;
    console.log(`${ok ? 'ok  ' : 'MAL '} "${k}" -> whisper: "${dicho}"`);
  }
  console.log(`\nRevisadas: ${CLAVES.length} · sospechosas: ${mal}`);
})();
