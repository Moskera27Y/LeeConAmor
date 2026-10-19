// Genera TODOS los audios con la voz CLONADA de Léo (XTTS local) y los deja
// en public/audio. Después reescribe src/data/audioFijo.ts completo.
//
// Por qué:
//   - La voz clonada ya no depende de Gemini (cuota) ni de un túnel temporal.
//   - Los audios fijos quedan served por Vercel: la app habla siempre con la
//     voz buena, gratis y sin esperas.
//
//  Reanudable: si se corta, vuelve a empezar y salta lo que YA ESTÁ CLONADO.
//  Reutiliza el caché en server/voz-cache (audio ya clonado).
//  --rehacer  regenera tambien los archivos que ya existen (util para
//             reemplazar audios viejos de Gemini por la voz clonada).
//
// Uso:
//   1) Arrancar el clon:  server\voz-clon\iniciar-voz-clon.bat   (o npm run clon:servidor)
//   2) Generar:          npm run voz:clon
//
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RAIZ = path.join(__dirname, '..');
const OUT_DIR = path.join(RAIZ, 'public', 'audio');
const MAPA = path.join(RAIZ, 'src', 'data', 'audioFijo.ts');
const CACHE_DIR = path.join(RAIZ, 'server', 'voz-cache');
// Manifiesto de lo ya clonado: permite reanudar sin repetir trabajo.
const MANIFIESTO = path.join(RAIZ, 'server', 'voz-clon', 'audios-clon.txt');
const CLON = (process.env.CLON_URL || 'http://127.0.0.1:7860').replace(/\/$/, '');
const VOZ = 'Callirrhoe';
const RECHACER = process.argv.includes('--rehacer');

const PREFIJOS = { fijo: 'f', nombre: 'n', leccion: 'l', palabra: 'p' };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha12 = (texto) => crypto.createHash('sha1').update(texto).digest('hex').slice(0, 12);
const nombreArchivo = (texto, prefijo) => prefijo + sha12(texto) + '.wav';
const claveCache = (texto) =>
  crypto.createHash('sha1').update(`v4:${VOZ}:${texto}`).digest('hex') + '.json';

/* ------------------------------------------------------------------ */
/* 1. Recolectar TODOS los textos que la app puede pedir               */
/* ------------------------------------------------------------------ */
function recolectarTextos() {
  const { FRASES_FIJAS } = require('./frases-fijas.cjs');
  const { NOMBRES } = require('./nombres-comunes.cjs');
  const lecTs = fs.readFileSync(path.join(RAIZ, 'src', 'data', 'secuenciaLecciones.ts'), 'utf8');

  // Frases sueltas que usa la app (frases.ts)
  const frasesTs = fs.readFileSync(path.join(RAIZ, 'src', 'data', 'frases.ts'), 'utf8');
  const sueltas = [...frasesTs.matchAll(/=\s*'([^']{3,})'/g)]
    .map((m) => m[1])
    .filter((t) => /[a-záéíóúñ]{3}/i.test(t));

  // Frases de UI (catálogo único: src/data/frasesVoz.ts)
  const vozTs = fs.readFileSync(path.join(RAIZ, 'src', 'data', 'frasesVoz.ts'), 'utf8');
  const guias = new Set();
  for (const m of vozTs.matchAll(/:\s*'([^']{4,})'/g)) guias.add(m[1]);

  // Términos sueltos que Léo pronuncia: letras, sílabas y palabras.
  // Se sacan del currículo y de los juegos para que la lista sea exacta.
  const terminos = new Set();
  // objetivos de actividad (vocales, sílabas y palabras del currículo)
  for (const m of lecTs.matchAll(/objetivo:\s*'([^']+)'/g)) terminos.add(m[1]);
  // pistas de pronunciación ("aaa como manzana", "ma-ma, despacio ma-ma"...)
  for (const m of lecTs.matchAll(/pista:\s*'([^']+)'/g)) terminos.add(m[1]);
  // palabras de los juegos nuevos
  const juegosTs = ['EscuchaYElige', 'FormarSílabaTrabada', 'PalabrasDesordenadas', 'MemoriaAuditiva', 'TrazoLetra']
    .map((f) => path.join(RAIZ, 'src', 'components', `${f}.tsx`))
    .filter((f) => fs.existsSync(f))
    .map((f) => fs.readFileSync(f, 'utf8'))
    .join('\n');
  for (const m of juegosTs.matchAll(/(?:palabra|silaba|texto|sonido):\s*'([^']+)'/g)) terminos.add(m[1]);
  for (const m of juegosTs.matchAll(/letras:\s*\[([^\]]+)\]/g)) {
    for (const l of m[1].matchAll(/'([^']+)'/g)) terminos.add(l[1]);
  }
  for (const m of juegosTs.matchAll(/fonetica:\s*'([^']+)'/g)) terminos.add(m[1]);
  // tarjetas de solo lectura
  const cardTs = fs.readFileSync(path.join(RAIZ, 'src', 'data', 'curriculum.ts'), 'utf8');
  for (const m of cardTs.matchAll(/objetivo:\s*'([^']+)',\s*imagen:[^\n]*pista:\s*'([^']+)'/g)) {
    terminos.add(m[1]);
    terminos.add(m[2]);
  }

  // Currículo: audioIntro, audioCelebracion, audioFijo, textoTTS
  const lecciones = new Set();
  for (const m of lecTs.matchAll(/(?:audioIntro|audioCelebracion|audioFijo|textoTTS):\s*'([^']+)'/g)) {
    lecciones.add(m[1]);
  }

  // Feedback que el juego arma con el nombre del niño.
  // Solo varies en el nombre, para que se puedan pregenerar (ver frases.ts).
  const conNombre = new Set();
  for (const n of NOMBRES) {
    conNombre.add(`¡Hola, ${n}! Vamos a leer juntitos.`);
    conNombre.add(`¡Muy bien, ${n}! ¡Qué bien leíste! 🌟`);
    conNombre.add(`¡Casi, ${n}! Vamos juntitos, despacio.`);
    conNombre.add(`Tú puedes, ${n}. Escucha otra vez e inténtalo.`);
  }

  // Respaldos SIN nombre (siempre disponibles, cubren nombres nuevos).
  const genericas = new Set([
    '¡Hola! Vamos a leer juntitos.',
    '¡Qué lindo leíste! 🌟',
    '¡Buen esfuerzo! Vamos juntitos despacio.',
    '¡Buen intento! Una vez más.',
  ]);

  const lista = [];
  const push = (texto, prefijo) => {
    const t = String(texto).trim();
    if (t.length >= 3) lista.push({ texto: t, prefijo });
  };

  // --- Orden de prioridad: lo mas usado primero ---
  // 1) Frases de UI del juego (felicitaciones, errores, transiciones)
  for (const t of FRASES_FIJAS) push(t, PREFIJOS.fijo);
  for (const t of sueltas) push(t, PREFIJOS.fijo);
  // 2) Frases guía de cada actividad (lo que dice al presentar un juego)
  for (const t of guias) push(t, PREFIJOS.fijo);
  // 3) Respaldos genericos (nombres que aun no tengan audio propio)
  for (const t of genericas) push(t, PREFIJOS.fijo);
  // 4) Currículo: intro/celebracion de lección y textos de actividad
  for (const t of lecciones) push(t, PREFIJOS.leccion);
  // 5) Términos sueltos: letras, sílabas y palabras que Léo pronuncia
  for (const t of terminos) push(t, PREFIJOS.palabra);
  // 6) Saludo de cada nombre comun
  for (const n of NOMBRES) push(`¡Hola, ${n}! Vamos a leer juntitos.`, PREFIJOS.nombre);
  // 7) Feedback con nombre (menos frecuente: solo al leer en voz alta)
  for (const t of conNombre) {
    if (t.startsWith('¡Hola,')) continue;
    push(t, PREFIJOS.nombre);
  }

  // Deduplicar por texto+prefijo
  const vistos = new Set();
  return lista.filter((x) => {
    const k = x.prefijo + '::' + x.texto;
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
}

/* ------------------------------------------------------------------ */
/* 2. Mapa actual + manifiesto de lo ya clonado                      */
/* ------------------------------------------------------------------ */
function leerMapaActual() {
  const mapa = {};
  try {
    const viejo = fs.readFileSync(MAPA, 'utf8');
    const m = viejo.match(/\{[\s\S]*\}/);
    if (m) Object.assign(mapa, JSON.parse(m[0]));
  } catch { /* noop */ }
  return mapa;
}

function leerManifiesto() {
  try {
    return new Set(
      fs.readFileSync(MANIFIESTO, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean)
    );
  } catch {
    return new Set();
  }
}

function guardarManifiesto(set) {
  fs.mkdirSync(path.dirname(MANIFIESTO), { recursive: true });
  fs.writeFileSync(MANIFIESTO, [...set].sort().join('\n') + '\n');
}

/* ------------------------------------------------------------------ */
/* 3. Clonar / recuperar                                              */
/* ------------------------------------------------------------------ */
async function clonarTexto(texto) {
  const respuesta = await fetch(`${CLON}/clonar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texto: texto.slice(0, 160) }),
    signal: AbortSignal.timeout(180000),
  });
  if (!respuesta.ok) {
    const err = await respuesta.text().catch(() => '');
    throw new Error(`HTTP ${respuesta.status} ${err.slice(0, 120)}`);
  }
  const data = await respuesta.json();
  if (!data?.audio) throw new Error('sin audio');
  return Buffer.from(data.audio, 'base64');
}

// El caché en disco guarda audio ya clonado con clave sha1(v4:voz:texto).
function audioDelCache(texto) {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, claveCache(texto)), 'utf8'));
    if (j?.audio && j.clon) return Buffer.from(j.audio, 'base64');
  } catch { /* noop */ }
  return null;
}

/* ------------------------------------------------------------------ */
/* 4. Principal                                                       */
/* ------------------------------------------------------------------ */
async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // ¿El clon responde?
  let disponible = false;
  try {
    const r = await fetch(`${CLON}/salud`, { signal: AbortSignal.timeout(8000) });
    disponible = r.ok;
  } catch { /* noop */ }
  if (!disponible) {
    console.error(`\n[ERROR] El clon no responde en ${CLON}`);
    console.error('Arranca el servicio con:  server\\voz-clon\\iniciar-voz-clon.bat');
    console.error('(La primera vez carga el modelo ~1-2 minutos y puede tardar.)');
    process.exit(1);
  }

  const lista = recolectarTextos();
  const mapa = leerMapaActual();
  const manifiesto = leerManifiesto();

  // Modo informativo: cuenta qué falta sin generar nada.
  if (process.argv.includes('--contar')) {
    const porPref = {};
    for (const x of lista) porPref[x.prefijo] = (porPref[x.prefijo] || 0) + 1;
    const faltan = lista.filter((x) => !manifiesto.has(x.texto) || !fs.existsSync(path.join(OUT_DIR, nombreArchivo(x.texto, x.prefijo))));
    const faltanPorPref = {};
    for (const x of faltan) faltanPorPref[x.prefijo] = (faltanPorPref[x.prefijo] || 0) + 1;
    console.log('Textos totales:', lista.length, JSON.stringify(porPref));
    console.log('Faltan clonar:  ', faltan.length, JSON.stringify(faltanPorPref));
    const mins = (faltan.length * 21) / 60;
    console.log(`Tiempo estimado a 21s/texto: ~${mins.toFixed(0)} min (${(mins / 60).toFixed(1)} h)`);
    return;
  }

  // Saltar lo que ya está clonado (y cuyo archivo exista), salvo --rehacer.
  const pendientes = lista.filter((x) => {
    const archivo = path.join(OUT_DIR, nombreArchivo(x.texto, x.prefijo));
    if (!fs.existsSync(archivo)) return true;      // falta el archivo
    if (RECHACER) return true;                     // forzamos rehacer
    return !manifiesto.has(x.texto);               // existe pero no consta como clonado
  });

  console.log(`Textos a gestionar: ${lista.length}`);
  console.log(`Ya clonado y en su sitio: ${lista.length - pendientes.length}`);
  console.log(`Pendientes: ${pendientes.length}${RECHACER ? '  (modo --rehacer)' : ''}\n`);

  let hechos = 0, desdeCache = 0, fallos = 0;
  const inicio = Date.now();

  for (const { texto, prefijo } of pendientes) {
    const destino = path.join(OUT_DIR, nombreArchivo(texto, prefijo));
    const etiqueta = texto.length > 52 ? texto.slice(0, 52) + '...' : texto;

    let buffer = audioDelCache(texto);
    if (buffer) desdeCache++;

    if (!buffer) {
      try {
        buffer = await clonarTexto(texto);
      } catch (e) {
        fallos++;
        console.log(`  [${hechos + fallos}/${pendientes.length}] FALLO  "${etiqueta}" -> ${e.message}`);
        continue;
      }
      // XTTS en CPU: dar un respiro para no saturar
      await sleep(1000);
    }

    fs.writeFileSync(destino, buffer);
    mapa[texto] = `/audio/${nombreArchivo(texto, prefijo)}`;
    manifiesto.add(texto);
    hechos++;

    // Guardar manifiesto y mapa cada 10 (respaldo si se corta)
    if (hechos % 10 === 0) {
      guardarManifiesto(manifiesto);
      escribirMapa(mapa);
    }

    const mins = ((Date.now() - inicio) / 60000).toFixed(1);
    const pct = Math.round(((hechos + fallos) / pendientes.length) * 100);
    console.log(`  [${hechos + fallos}/${pendientes.length}] ${pct}% ok "${etiqueta}" (${Math.round(buffer.length / 1024)} KB, ${mins} min)`);
  }

  guardarManifiesto(manifiesto);
  escribirMapa(mapa);

  console.log(`\nListo. ${hechos} audios escritos (${desdeCache} reutilizados del caché).`);
  console.log(`Fallos: ${fallos}`);
  console.log(`Mapa AUDIO_FIJO con ${Object.keys(mapa).length} textos.`);
}

function escribirMapa(mapa) {
  const ordenado = {};
  for (const k of Object.keys(mapa).sort()) ordenado[k] = mapa[k];
  fs.writeFileSync(
    MAPA,
    '// Generado por npm run voz:clon (voz CLONADA de Léo). No editar a mano.\n' +
      `export const AUDIO_FIJO: Record<string, string> = ${JSON.stringify(ordenado, null, 2)};\n`
  );
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});