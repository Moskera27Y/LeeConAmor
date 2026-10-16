// Precachea los saludos con nombre usando el CLON (ilimitado, sin cuota).
// Uso: con el backend prendido (npm run api:dev + clon), corre: npm run voz:nombres
// Los guarda en public/audio y los suma al mapa de src/data/audioFijo.ts.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { NOMBRES } = require('./nombres-comunes.cjs');

const OUT_DIR = path.join(__dirname, '..', 'public', 'audio');
const MAPA = path.join(__dirname, '..', 'src', 'data', 'audioFijo.ts');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const mapa = {};
  try {
    const viejo = fs.readFileSync(MAPA, 'utf8');
    const m = viejo.match(/\{[\s\S]*\}/);
    if (m) Object.assign(mapa, JSON.parse(m[0]));
  } catch { /* noop */ }
  let hechos = 0;
  for (const n of NOMBRES) {
    const texto = `¡Hola, ${n}! Vamos a leer juntitos.`;
    if (mapa[texto]) {
      const f = path.join(OUT_DIR, path.basename(mapa[texto]));
      if (fs.existsSync(f)) continue;
    }
    let ok = false;
    for (let intento = 1; intento <= 3 && !ok; intento++) {
      const r = await fetch('http://localhost:3001/api/voz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto, voz: 'Callirrhoe' }),
      });
      if (r.ok) {
        const data = await r.json();
        const nombre = 'n' + crypto.createHash('sha1').update(texto).digest('hex').slice(0, 12) + '.wav';
        fs.writeFileSync(path.join(OUT_DIR, nombre), Buffer.from(data.audio, 'base64'));
        mapa[texto] = `/audio/${nombre}`;
        console.log(`ok (${++hechos} nuevos): ${n} -> ${nombre}${data.clon ? ' [clon]' : ''}`);
        ok = true;
      } else {
        console.log(`esperando 30s... (${n}, intento ${intento}, status=${r.status})`);
        await sleep(30000);
      }
    }
    if (!ok) {
      console.log(`ERR en: ${n}. Repite luego: npm run voz:nombres`);
      break;
    }
    await sleep(3000);
  }
  fs.writeFileSync(MAPA, `// Generado por npm run voz:precache / voz:nombres. No editar a mano.\nexport const AUDIO_FIJO: Record<string, string> = ${JSON.stringify(mapa, null, 2)};\n`);
  console.log(`Saludos listos. Mapa total: ${Object.keys(mapa).length} audios.`);
}

main().catch((e) => {
  console.error('Necesito el backend prendido: npm run api:dev (+ clon) en otra terminal.', e.message);
  process.exit(1);
});
