// Genera TODOS los audios con la voz CLONADA de Léo (XTTS local) y los deja
// en public/audio. Después reescribe src/data/audioFijo.ts completo.
//
// Por qué:
//   - La voz clonada ya no depende de Gemini (cuota) ni de un túnel temporal.
//   - Los audios fijos quedan served por Vercel: la app habla siempre con la
//     voz buena, gratis y sin esperas.
//
// Cómo funciona (importante):
//   - TODO se guarda con el texto NORMALIZADO (textoHablado: sin emojis ni
//     símbolos). Así la clave que pide la app en tiempo real coincide EXACTA
//     con la clave generada. El nombre de archivo es sha1(texto normalizado).
//   - El mapa AUDIO_FIJO se RECONSTRUYE desde la lista recolectada: las claves
//     viejas que ya no se usan desaparecen (y sus .wav se borran).
//   - Un texto se (re)genera si falta su archivo canónico o si el mapa no
//     apunta ya a ese archivo (por ejemplo, textos que antes tenían emoji).
//
//  Reanudable: si se corta, vuelve a empezar y salta lo que YA ESTÁ CLONADO.
//  Reutiliza el caché en server/voz-cache (audio ya clonado).
//  --rehacer  regenera tambien los archivos que ya existen.
//  --contar   solo informa qué falta, sin generar nada.
//
// Uso:
//   1) Arrancar el clon:  server\voz-clon\iniciar-voz-clon.bat   (o npm run clon:servidor)
//   2) Generar:          npm run voz:clon
//
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { textoHablado } = require('./voz-texto.cjs');
const fj = require('./frases-juego.cjs');

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

const leerFuente = (...partes) =>
  fs.readFileSync(path.join(RAIZ, 'src', ...partes), 'utf8');

/* ------------------------------------------------------------------ */
/* 1. Recolectar TODOS los textos que la app puede pedir               */
/*    (siempre normalizados con textoHablado)                          */
/* ------------------------------------------------------------------ */
function recolectarTextos() {
  const { NOMBRES } = require('./nombres-comunes.cjs');
  const lecTs = leerFuente('data', 'secuenciaLecciones.ts');
  const frasesTs = leerFuente('data', 'frases.ts');
  const useVoiceTs = leerFuente('hooks', 'useVoice.ts');
  const juegosTs = ['EscuchaYElige', 'FormarSílabaTrabada', 'PalabrasDesordenadas', 'MemoriaAuditiva', 'TrazoLetra', 'LeerConElDedo']
    .map((f) => path.join(RAIZ, 'src', 'components', `${f}.tsx`))
    .filter((f) => fs.existsSync(f))
    .map((f) => fs.readFileSync(f, 'utf8'))
    .join('\n');

  const vistos = new Set();
  const lista = [];
  const push = (texto, prefijo, minimo = 3) => {
    const t = textoHablado(texto);
    if (!t || t.length < minimo) return;
    if (vistos.has(t)) return;
    vistos.add(t);
    lista.push({ texto: t, prefijo });
  };

  /* --- Frases fijas de la app (felicitaciones, errores, transiciones) --- */
  const bloqueFijas = frasesTs.match(/FRASES_FIJAS\s*=\s*\[([\s\S]*?)\];/);
  if (bloqueFijas) {
    for (const m of bloqueFijas[1].matchAll(/'([^']+)'/g)) push(m[1], PREFIJOS.fijo);
  }
  for (const m of frasesTs.matchAll(/export const F_[A-Z_]+ = '([^']+)'/g)) {
    push(m[1], PREFIJOS.fijo);
  }
  // Saludo de prueba de voz ("Hola, soy Léo. Vamos a leer juntitos con amor.")
  for (const m of useVoiceTs.matchAll(/speak\('([^']+)'\)/g)) push(m[1], PREFIJOS.fijo);
  // Respaldos SIN nombre (cubren nombres nuevos)
  push('¡Hola! Vamos a leer juntitos.', PREFIJOS.fijo);

  /* --- Familias construidas (mismas que src/data/frasesVoz.ts) --- */
  for (const l of fj.LETRAS) push(fj.fraseToca(l), PREFIJOS.fijo);

  const objetivos = [...new Set([...lecTs.matchAll(/objetivo:\s*'([^']+)'/g)].map((m) => m[1]))];
  for (const o of objetivos) {
    if (o === 'cuento_corto') continue;
    if (fj.tipoObjetivo(o) !== 'oracion') push(fj.fraseToca(o), PREFIJOS.fijo);
  }

  const palabrasSI = [...new Set(
    [...lecTs.matchAll(/tipo:\s*'silaba_inicial'[^}]*?palabra:\s*'([^']+)'/g)].map((m) => m[1])
  )];
  for (const p of palabrasSI) push(fj.fraseSilabaInicial(p), PREFIJOS.fijo);

  const silabasFormar = [...new Set(
    [...lecTs.matchAll(/tipo:\s*'formar_silaba'[^}]*?objetivo:\s*'([^']+)'/g)].map((m) => m[1])
  )];
  for (const s of new Set([...silabasFormar, ...fj.SILABAS_TRABADAS])) {
    push(fj.fraseFormaSílaba(s), PREFIJOS.fijo);
  }

  const palabrasFormar = [...new Set(
    [...lecTs.matchAll(/tipo:\s*'formar_palabra'[^}]*?objetivo:\s*'([^']+)'/g)].map((m) => m[1])
  )];
  for (const p of new Set([...palabrasFormar, ...fj.PALABRAS_DESORDENADAS])) {
    push(fj.fraseFormaPalabra(p), PREFIJOS.fijo);
  }

  for (const n of fj.PALABRAS_ESCUCHA_Y_ELIGE) push(fj.fraseImagen(n), PREFIJOS.fijo);
  for (const n of fj.INSIGNIAS) push(fj.fraseInsignia(n), PREFIJOS.fijo);
  for (const e of fj.ETAPAS) push(fj.recompensaEtapa(e), PREFIJOS.fijo);
  for (const v of Object.values(fj.FRASES_VOZ)) push(v, PREFIJOS.fijo);

  /* --- Currículo: intro/celebración de cada lección --- */
  for (const m of lecTs.matchAll(/(?:audioIntro|audioCelebracion):\s*'([^']+)'/g)) {
    push(m[1], PREFIJOS.leccion);
  }

  /* --- Términos que Léo pronuncia sueltos: letras, sílabas y palabras --- */
  // Objetivos del currículo (incluye oraciones que lee ReadingCard)
  for (const o of objetivos) {
    if (o === 'cuento_corto') continue;
    push(o, PREFIJOS.palabra, 1);
  }
  // Letras del abecedario (Graduación, juegos)
  for (const l of fj.LETRAS) push(l, PREFIJOS.palabra, 1);
  // Palabras del juego (FormarPalabra, PalabrasDesordenadas, tarjetas)
  for (const p of fj.PALABRAS_JUEGO) push(p, PREFIJOS.palabra, 1);
  // Letras y sílabas sueltas que los juegos dicen al tocar
  for (const fuente of [lecTs, juegosTs]) {
    for (const m of fuente.matchAll(/letras:\s*\[([^\]]+)\]/g)) {
      for (const l of m[1].matchAll(/'([^']+)'/g)) push(l[1], PREFIJOS.palabra, 1);
    }
    for (const m of fuente.matchAll(/silabas:\s*\[([^\]]+)\]/g)) {
      for (const s of m[1].matchAll(/'([^']+)'/g)) push(s[1], PREFIJOS.palabra, 1);
    }
  }
  // Palabras del cuento (Storytime las dice una por una)
  for (const m of lecTs.matchAll(/tipo:\s*'storytime'[^}]*?textoTTS:\s*'([^']+)'/g)) {
    for (const w of m[1].split(/\s+/)) push(w, PREFIJOS.palabra, 1);
  }

  /* --- Nombres: saludo + feedback (solo varía el nombre) --- */
  for (const n of NOMBRES) {
    push(`¡Hola, ${n}! Vamos a leer juntitos.`, PREFIJOS.nombre);
    push(`¡Muy bien, ${n}! ¡Qué bien leíste! 🌟`, PREFIJOS.nombre);
    push(`¡Casi, ${n}! Vamos juntitos, despacio.`, PREFIJOS.nombre);
    push(`Tú puedes, ${n}. Escucha otra vez e inténtalo.`, PREFIJOS.nombre);
  }

  return lista;
}

/* ------------------------------------------------------------------ */
/* 2. Mapa actual + manifiesto de lo ya clonado                        */
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

// Claves del mapa viejo normalizadas (migra claves con emoji).
function mapaNormalizado(mapaViejo) {
  const out = {};
  for (const [k, v] of Object.entries(mapaViejo)) {
    const n = textoHablado(k);
    if (n && !out[n]) out[n] = v;
  }
  return out;
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
/* 4. Mapa + limpieza de huérfanos                                    */
/* ------------------------------------------------------------------ */
const canonicoDe = (x) => `/audio/${nombreArchivo(x.texto, x.prefijo)}`;

// El mapa se reconstruye desde la lista recolectada: sin claves muertas.
function construirMapa(lista, mapaViejo) {
  const mapa = {};
  for (const x of lista) {
    const canonico = canonicoDe(x);
    if (fs.existsSync(path.join(OUT_DIR, path.basename(canonico)))) {
      mapa[x.texto] = canonico;
    } else if (mapaViejo[x.texto]) {
      // Falló la regeneración: conservar el audio viejo (sigue siendo válido).
      mapa[x.texto] = mapaViejo[x.texto];
    }
  }
  return mapa;
}

function limpiarHuerfanos(mapa) {
  const usados = new Set(Object.values(mapa).map((p) => path.basename(p)));
  let borrados = 0;
  if (!fs.existsSync(OUT_DIR)) return 0;
  for (const f of fs.readdirSync(OUT_DIR)) {
    if (!f.endsWith('.wav')) continue;
    if (!usados.has(f)) {
      fs.unlinkSync(path.join(OUT_DIR, f));
      borrados++;
    }
  }
  return borrados;
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

/* ------------------------------------------------------------------ */
/* 5. Principal                                                       */
/* ------------------------------------------------------------------ */
async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const lista = recolectarTextos();
  const mapaViejo = mapaNormalizado(leerMapaActual());
  const manifiesto = leerManifiesto();

  // Pendiente = falta el archivo canónico o el mapa no apunta ya a él.
  const esPendiente = (x) =>
    RECHACER ||
    !fs.existsSync(path.join(OUT_DIR, nombreArchivo(x.texto, x.prefijo))) ||
    mapaViejo[x.texto] !== canonicoDe(x);
  const pendientes = lista.filter(esPendiente);

  // Modo informativo: cuenta qué falta sin generar nada.
  if (process.argv.includes('--contar')) {
    const porPref = {};
    for (const x of lista) porPref[x.prefijo] = (porPref[x.prefijo] || 0) + 1;
    const faltanPorPref = {};
    for (const x of pendientes) faltanPorPref[x.prefijo] = (faltanPorPref[x.prefijo] || 0) + 1;
    console.log('Textos totales:', lista.length, JSON.stringify(porPref));
    console.log('Faltan clonar:  ', pendientes.length, JSON.stringify(faltanPorPref));
    const mins = (pendientes.length * 21) / 60;
    console.log(`Tiempo estimado a 21s/texto: ~${mins.toFixed(0)} min (${(mins / 60).toFixed(1)} h)`);
    const enCache = pendientes.filter((x) => audioDelCache(x.texto)).length;
    console.log(`De esos, ${enCache} ya están en el caché (se copian al instante).`);
    return;
  }

  // ¿El clon responde? (solo hace falta si hay algo que clonar)
  const faltanSinCache = pendientes.filter((x) => !audioDelCache(x.texto)).length;
  if (faltanSinCache > 0) {
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
  }

  console.log(`Textos a gestionar: ${lista.length}`);
  console.log(`Ya clonado y en su sitio: ${lista.length - pendientes.length}`);
  console.log(`Pendientes: ${pendientes.length}${RECHACER ? '  (modo --rehacer)' : ''}`);
  console.log(`  de esos, desde caché: ${pendientes.length - faltanSinCache}, a clonar: ${faltanSinCache}\n`);

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
    manifiesto.add(texto);
    hechos++;

    // Guardar manifiesto y mapa cada 10 (respaldo si se corta)
    if (hechos % 10 === 0) {
      guardarManifiesto(manifiesto);
      escribirMapa(construirMapa(lista, mapaViejo));
    }

    const mins = ((Date.now() - inicio) / 60000).toFixed(1);
    const pct = Math.round(((hechos + fallos) / pendientes.length) * 100);
    console.log(`  [${hechos + fallos}/${pendientes.length}] ${pct}% ok "${etiqueta}" (${Math.round(buffer.length / 1024)} KB, ${mins} min)`);
  }

  guardarManifiesto(manifiesto);
  const mapa = construirMapa(lista, mapaViejo);
  escribirMapa(mapa);
  const borrados = limpiarHuerfanos(mapa);

  console.log(`\nListo. ${hechos} audios escritos (${desdeCache} reutilizados del caché).`);
  console.log(`Fallos: ${fallos}`);
  console.log(`Mapa AUDIO_FIJO con ${Object.keys(mapa).length} textos.`);
  if (borrados) console.log(`Archivos huérfanos borrados: ${borrados}`);
}

if (require.main === module) {
  main().catch((e) => {
    console.error('Error:', e.message);
    process.exit(1);
  });
}

module.exports = { recolectarTextos, nombreArchivo, textoHablado, canonicoDe };
