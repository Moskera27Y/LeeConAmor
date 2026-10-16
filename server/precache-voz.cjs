// Genera una vez los audios fijos de Léo (voz Callirrhoe) a public/audio.
// Uso: con el backend prendido (npm run api:dev), corre: npm run voz:precache
// Requiere cuota disponible de Gemini; si sale 429, espera al día siguiente.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { FRASES_FIJAS } = require('./frases-fijas.cjs');

const OUT_DIR = path.join(__dirname, '..', 'public', 'audio');
const MAPA = path.join(__dirname, '..', 'src', 'data', 'audioFijo.ts');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const anterior = {};
  try {
    const viejo = fs.readFileSync(MAPA, 'utf8');
    const m = viejo.match(/\{[\s\S]*\}/);
    if (m) Object.assign(anterior, JSON.parse(m[0]));
  } catch { /* noop */ }
  const mapa = { ...anterior };
  let hechos = 0;
  for (const texto of FRASES_FIJAS) {
    if (mapa[texto]) {
      const f = path.join(OUT_DIR, path.basename(mapa[texto]));
      if (fs.existsSync(f)) continue; // ya existe, no gasta cuota
    }
    let ok = false;
    for (let intento = 1; intento <= 4 && !ok; intento++) {
      const r = await fetch('http://localhost:3001/api/voz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto, voz: 'Callirrhoe' }),
      });
      if (r.ok) {
        const data = await r.json();
        const nombre = 'f' + crypto.createHash('sha1').update(texto).digest('hex').slice(0, 12) + '.wav';
        fs.writeFileSync(path.join(OUT_DIR, nombre), Buffer.from(data.audio, 'base64'));
        mapa[texto] = `/audio/${nombre}`;
        console.log(`ok (${++hechos} nuevos): ${nombre}`);
        ok = true;
      } else if (r.status === 502 && intento < 4) {
        console.log(`limite por minuto, esperando 65s... (intento ${intento})`);
        await sleep(65000);
      } else {
        console.log(`ERR en: "${texto.slice(0, 30)}..." status=${r.status}. Repite luego: npm run voz:precache`);
        break;
      }
    }
    if (!ok) break;
    await sleep(12000); // ~5 frases/min para no topar el límite gratis
  }
  fs.writeFileSync(MAPA, `// Generado por npm run voz:precache. No editar a mano.\nexport const AUDIO_FIJO: Record<string, string> = ${JSON.stringify(mapa, null, 2)};\n`);
  console.log(`Mapa con ${Object.keys(mapa).length}/${FRASES_FIJAS.length} audios.`);
}

main().catch((e) => {
  console.error('Necesito el backend prendido: npm run api:dev en otra terminal.', e.message);
  process.exit(1);
});
