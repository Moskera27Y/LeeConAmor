// Prueba del validador de trazo (src/lib/trazo.ts).
// Se compila con esbuild y se ejecuta en node: sin navegador.
// Uso: npm run test:trazo
const fs = require('fs');
const path = require('path');
const os = require('os');
const esbuild = require('esbuild');

const RAIZ = path.join(__dirname, '..');
const ENTRADA = path.join(RAIZ, 'src', 'lib', 'trazo.ts');
const SALIDA = path.join(os.tmpdir(), `trazo-test-${Date.now()}.cjs`);

esbuild.buildSync({
  entryPoints: [ENTRADA],
  outfile: SALIDA,
  bundle: true,
  format: 'cjs',
  platform: 'node',
  logLevel: 'silent',
});

const { validarTrazo, LETRAS_TRACO } = require(SALIDA);
fs.unlinkSync(SALIDA);

const GUIAS = Object.fromEntries(LETRAS_TRACO.map((l) => [l.letra, l.guias]));
const W = 320, H = 220;

// Convierte una polilínea normalizada (0-100) a pixeles del lienzo
function aPixeles(polilinea) {
  const puntos = [];
  for (let i = 0; i < polilinea.length - 1; i++) {
    const [x1, y1] = polilinea[i];
    const [x2, y2] = polilinea[i + 1];
    const pasos = 10;
    for (let s = 0; s <= pasos; s++) {
      const t = s / pasos;
      puntos.push({
        x: 20 + ((x1 + (x2 - x1) * t) / 100) * (W - 40),
        y: 15 + ((y1 + (y2 - y1) * t) / 100) * (H - 30),
      });
    }
  }
  return puntos;
}

const BUENOS = {
  A: [[50, 18], [30, 78], [50, 55], [70, 78]],
  E: [[78, 18], [22, 22], [22, 78], [76, 80]],
  I: [[50, 18], [50, 82]],
  O: [[50, 18], [26, 50], [50, 82], [74, 50], [50, 18]],
  U: [[22, 18], [22, 60], [50, 82], [78, 60], [78, 18]],
  M: [[20, 82], [50, 28], [50, 62], [80, 28], [80, 82]],
  P: [[26, 82], [26, 20], [55, 20], [68, 36], [52, 52], [26, 54]],
  S: [[74, 20], [34, 18], [28, 40], [52, 50], [72, 60], [64, 82], [28, 80]],
  L: [[24, 18], [24, 78], [78, 80]],
  T: [[18, 18], [50, 18], [50, 84]],
};

const MALOS = [
  { letra: 'M', nombre: 'V en vez de M (el caso que reporto el usuario)', poli: [[20, 80], [50, 20], [80, 80]] },
  { letra: 'M', nombre: 'N en vez de M', poli: [[20, 82], [20, 20], [80, 80], [80, 20]] },
  { letra: 'M', nombre: 'garabato en la esquina', poli: [[10, 10], [20, 15], [25, 10]] },
  { letra: 'E', nombre: 'raya horizontal', poli: [[10, 50], [90, 50]] },
  { letra: 'O', nombre: 'un solo punto', poli: [[50, 50]] },
  { letra: 'O', nombre: 'U en vez de O', poli: [[22, 18], [22, 60], [50, 82], [78, 60], [78, 18]] },
  { letra: 'L', nombre: 'rayita corta', poli: [[30, 20], [35, 25]] },
  { letra: 'T', nombre: 'I en vez de T (sin travesano)', poli: [[50, 18], [50, 84]] },
  { letra: 'S', nombre: 'linea recta', poli: [[20, 20], [80, 80]] },
];

let fallas = 0;
console.log('--- Deben PASAR (letra bien trazada) ---');
for (const [letra, poli] of Object.entries(BUENOS)) {
  const r = validarTrazo(aPixeles(poli), W, H, GUIAS[letra]);
  if (!r.ok) fallas++;
  console.log(`  ${r.ok ? 'ok   ' : 'FALLA'}  ${letra}  motivo=${r.motivo} pct=${r.pct}`);
}

console.log('\n--- Deben FALLAR (trazo no valido) ---');
for (const c of MALOS) {
  const r = validarTrazo(aPixeles(c.poli), W, H, GUIAS[c.letra]);
  if (r.ok) fallas++;
  console.log(`  ${!r.ok ? 'ok   ' : 'FALLA'}  ${c.letra}: ${c.nombre}  motivo=${r.motivo}`);
}

console.log(`\nTotal fallas: ${fallas}`);
process.exit(fallas === 0 ? 0 : 1);