// Auditoría de la voz de Léo: paridad TS ↔ CJS y cobertura de audios.
//
//   npm run test:voz            → paridad + consistencia + cobertura de audio
//   node server/test-voz.cjs --sin-audio   → sin cobertura (antes de generar)
//
// Comprueba:
//   1) src/data/textoVoz.ts ≡ server/voz-texto.cjs (mismo normalizado)
//   2) src/data/frasesVoz.ts ≡ server/frases-juego.cjs (mismas frases)
//   3) Listas de los juegos ≡ listas del espejo CJS (sin deriva)
//   4) silaba_inicial del currículo: la palabra empieza con su sílaba
//   5) Cada frase que la app puede pedir existe en AUDIO_FIJO y su .wav existe
//      con el nombre canónico (sha1 del texto normalizado).
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const esbuild = require('esbuild');

const RAIZ = path.join(__dirname, '..');
const OUT_DIR = path.join(RAIZ, 'public', 'audio');
const CON_AUDIO = !process.argv.includes('--sin-audio');

let pruebas = 0;
let fallas = 0;
const detalles = [];
function check(nombre, cond, extra = '') {
  pruebas++;
  if (cond) {
    console.log(`  ok     ${nombre}${extra ? ` (${extra})` : ''}`);
  } else {
    fallas++;
    console.log(`  FALLA  ${nombre}${extra ? ` (${extra})` : ''}`);
  }
}
function falla(nombre, extra) {
  fallas++;
  if (detalles.length < 20) detalles.push(`${nombre}${extra ? ` — ${extra}` : ''}`);
}

/* ---------- Cargar TS (esbuild) y CJS ---------- */
const RAIZ_FWD = RAIZ.replace(/\\/g, '/');
const entrada = path.join(os.tmpdir(), `voz-paridad-${Date.now()}.ts`);
fs.writeFileSync(
  entrada,
  `export * from '${RAIZ_FWD}/src/data/frasesVoz.ts';\n` +
    `export * from '${RAIZ_FWD}/src/data/textoVoz.ts';\n`
);
const salida = path.join(os.tmpdir(), `voz-paridad-${Date.now()}.cjs`);
esbuild.buildSync({
  entryPoints: [entrada],
  outfile: salida,
  bundle: true,
  format: 'cjs',
  platform: 'node',
  logLevel: 'silent',
});
const ts = require(salida);
fs.unlinkSync(entrada);
fs.unlinkSync(salida);

const cjsTexto = require('./voz-texto.cjs');
const fj = require('./frases-juego.cjs');
const { recolectarTextos, nombreArchivo } = require('./precache-clon.cjs');

const sha12 = (t) => crypto.createHash('sha1').update(t).digest('hex').slice(0, 12);
const leer = (...p) => fs.readFileSync(path.join(RAIZ, 'src', ...p), 'utf8');

/* ---------- 1. Normalizador ---------- */
console.log('\n--- Normalizador de texto hablado ---');
const muestras = [
  '¡Muy bien! 🎉',
  '¡Qué lindo leíste! 🌟',
  '¡Casi! Prueba otra vez con amor ❤️',
  '¡Felicidades! Terminaste todo. Ahora lees por tu cuenta. 🎉',
  'Con  dobles   espacios',
  '  espacios al borde  ',
  '¡Hola, Ana! Vamos a leer juntitos.',
  'Toca la letra Ñ.',
  'linea ➡️ con flecha',
  'bandera 🏝️ con FE0F',
  'texto()*[]{}sin simbolos raros',
];
for (const m of muestras) {
  check(`textoHablado("${m.slice(0, 30)}…")`, ts.textoHablado(m) === cjsTexto.textoHablado(m), JSON.stringify(cjsTexto.textoHablado(m)));
}

/* ---------- 2. Paridad frasesVoz.ts ↔ frases-juego.cjs ---------- */
console.log('\n--- Paridad frasesVoz.ts ↔ frases-juego.cjs ---');
check('VOCALES_JUEGO', ts.VOCALES_JUEGO === fj.VOCALES_JUEGO);
check('SILABAS_JUEGO', JSON.stringify(ts.SILABAS_JUEGO) === JSON.stringify(fj.SILABAS_JUEGO));
check('PALABRAS_JUEGO', JSON.stringify(ts.PALABRAS_JUEGO) === JSON.stringify(fj.PALABRAS_JUEGO));
check('FRASES_VOZ', JSON.stringify(ts.FRASES_VOZ) === JSON.stringify(fj.FRASES_VOZ));

const objetivos = [...fj.LETRAS, ...fj.VOCALES, ...fj.SILABAS_JUEGO, ...fj.SILABAS_TRABADAS,
  ...fj.PALABRAS_JUEGO, ...fj.PALABRAS_DESORDENADAS, 'IMÁN', 'TRAN', 'CRAN', 'GRA', 'CLA',
  'El sol sale', 'Mamá me ama', 'cuento_corto', 'la casa', 'el sol'];
let tipoOk = true;
for (const o of objetivos) {
  if (ts.tipoObjetivo(o) !== fj.tipoObjetivo(o)) {
    tipoOk = false;
    falla('tipoObjetivo', `${o}: ts=${ts.tipoObjetivo(o)} cjs=${fj.tipoObjetivo(o)}`);
  }
}
check('tipoObjetivo', tipoOk, `${objetivos.length} casos`);

let tocaOk = true;
for (const o of objetivos) {
  if (ts.fraseToca(o) !== fj.fraseToca(o)) {
    tocaOk = false;
    falla('fraseToca', `${o}: "${ts.fraseToca(o)}" vs "${fj.fraseToca(o)}"`);
  }
}
check('fraseToca', tocaOk, `${objetivos.length} casos`);

const paresSI = objetivos.filter((o) => !o.includes(' '));
let siOk = true;
for (const p of paresSI) if (ts.fraseSilabaInicial(p) !== fj.fraseSilabaInicial(p)) siOk = false;
check('fraseSilabaInicial', siOk, `${paresSI.length} casos`);

let fsOk = true;
for (const s of [...fj.SILABAS_JUEGO, ...fj.SILABAS_TRABADAS, ...fj.VOCALES]) {
  if (ts.fraseFormaSílaba(s) !== fj.fraseFormaSílaba(s)) fsOk = false;
}
check('fraseFormaSílaba', fsOk);

let fpOk = true;
for (const p of [...fj.PALABRAS_JUEGO, ...fj.PALABRAS_DESORDENADAS, ...objetivos.filter((o) => o.includes(' '))]) {
  if (ts.fraseFormaPalabra(p) !== fj.fraseFormaPalabra(p)) fpOk = false;
}
check('fraseFormaPalabra', fpOk);

let imOk = true;
for (const n of fj.PALABRAS_ESCUCHA_Y_ELIGE) {
  if (ts.fraseImagen(n) !== fj.fraseImagen(n)) {
    imOk = false;
    falla('fraseImagen', `${n}: "${ts.fraseImagen(n)}" vs "${fj.fraseImagen(n)}"`);
  }
}
check('fraseImagen', imOk, `${fj.PALABRAS_ESCUCHA_Y_ELIGE.length} casos`);

let inOk = true;
for (const n of fj.INSIGNIAS) if (ts.fraseInsignia(n) !== fj.fraseInsignia(n)) inOk = false;
check('fraseInsignia', inOk);

let reOk = true;
for (const e of [...fj.ETAPAS, 'otra']) if (ts.recompensaEtapa(e) !== fj.recompensaEtapa(e)) reOk = false;
check('recompensaEtapa', reOk);

/* ---------- 3. Listas de los juegos ↔ espejo CJS ---------- */
console.log('\n--- Listas de los juegos (sin deriva) ---');
const mismoSet = (a, b) => a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');

const compEscucha = [...leer('components', 'EscuchaYElige.tsx').matchAll(/nombre:\s*'([^']+)'/g)].map((m) => m[1]);
check('EscuchaYElige nombres ≡ espejo', mismoSet(compEscucha, fj.PALABRAS_ESCUCHA_Y_ELIGE));

const compTrabadas = [...leer('components', 'FormarSílabaTrabada.tsx').matchAll(/silaba:\s*'([^']+)'/g)].map((m) => m[1]);
check('FormarSílabaTrabada sílabas ≡ espejo', mismoSet(compTrabadas, fj.SILABAS_TRABADAS));

const compDesorden = [...leer('components', 'PalabrasDesordenadas.tsx').matchAll(/palabra:\s*'([^']+)'/g)].map((m) => m[1]);
check('PalabrasDesordenadas palabras ≡ espejo', mismoSet(compDesorden, fj.PALABRAS_DESORDENADAS));

const compInsignias = [...leer('lib', 'gamificacion.ts').matchAll(/nombre:\s*'([^']+)'/g)].map((m) => m[1]);
check('gamificacion insignias ≡ espejo', mismoSet(compInsignias, fj.INSIGNIAS));

const abertura = leer('data', 'motorNiveles.ts').match(/ABECEDARIO\s*=\s*'([^']+)'/);
check('ABECEDARIO ≡ espejo', Boolean(abertura) && abertura[1] === fj.LETRAS.join(''));

/* ---------- 4. silaba_inicial: palabra empieza con su sílaba ---------- */
console.log('\n--- Currículo: sílaba inicial ---');
const lecTs = leer('data', 'secuenciaLecciones.ts');
const entradasSI = [...lecTs.matchAll(/tipo:\s*'silaba_inicial'[^}]*?objetivo:\s*'([^']+)'[^}]*?palabra:\s*'([^']+)'/g)];
let siBien = true;
for (const [, objetivo, palabra] of entradasSI) {
  if (!palabra.toUpperCase().startsWith(objetivo.toUpperCase())) {
    siBien = false;
    falla('silaba_inicial', `${palabra} no empieza con ${objetivo}`);
  }
}
check('palabra empieza con su sílaba', siBien, `${entradasSI.length} entradas`);

/* ---------- 5. Cobertura de audio ---------- */
if (CON_AUDIO) {
  console.log('\n--- Cobertura de audio (AUDIO_FIJO + public/audio) ---');
  const mapaSrc = fs.readFileSync(path.join(RAIZ, 'src', 'data', 'audioFijo.ts'), 'utf8');
  const bloque = mapaSrc.match(/\{[\s\S]*\}/);
  const mapa = bloque ? JSON.parse(bloque[0]) : {};
  const lista = recolectarTextos();

  let faltanClave = 0;
  let faltanArchivo = 0;
  let noCanonico = 0;
  for (const x of lista) {
    const v = mapa[x.texto];
    if (!v) {
      faltanClave++;
      if (faltanClave <= 10) falla('sin audio', `"${x.texto}" (${x.prefijo})`);
      continue;
    }
    const esperado = nombreArchivo(x.texto, x.prefijo);
    if (path.basename(v) !== esperado) {
      noCanonico++;
      if (noCanonico <= 10) falla('archivo no canónico', `"${x.texto}" -> ${v}`);
      continue;
    }
    if (!fs.existsSync(path.join(OUT_DIR, path.basename(v)))) {
      faltanArchivo++;
      if (faltanArchivo <= 10) falla('archivo ausente', `${v}`);
    }
  }
  check('cada frase pedida tiene su audio', faltanClave === 0, `${lista.length} frases`);
  check('nombres canónicos', noCanonico === 0);
  check('archivos presentes', faltanArchivo === 0);

  let clavesSucias = 0;
  let huerfanos = 0;
  for (const [k, v] of Object.entries(mapa)) {
    if (cjsTexto.textoHablado(k) !== k) {
      clavesSucias++;
      if (clavesSucias <= 10) falla('clave sin normalizar', `"${k}"`);
    }
    if (v.startsWith('/audio/')) {
      if (!fs.existsSync(path.join(OUT_DIR, path.basename(v)))) {
        huerfanos++;
        if (huerfanos <= 10) falla('mapa apunta a archivo inexistente', `${v}`);
      }
      if (path.basename(v).slice(1, -4) !== sha12(k)) {
        huerfanos++;
        if (huerfanos <= 10) falla('hash no coincide', `${v} vs "${k}"`);
      }
    }
  }
  check('claves del mapa normalizadas', clavesSucias === 0, `${Object.keys(mapa).length} claves`);
  check('mapa ↔ archivos consistentes', huerfanos === 0);
} else {
  console.log('\n--- Cobertura de audio: OMITIDA (--sin-audio) ---');
}

/* ---------- Resumen ---------- */
console.log('');
if (detalles.length) {
  console.log('Detalles:');
  for (const d of detalles) console.log('  ·', d);
}
console.log(`Pruebas: ${pruebas} · fallas: ${fallas}`);
process.exitCode = fallas ? 1 : 0;
