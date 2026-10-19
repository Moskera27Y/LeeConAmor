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

const { validarTrazo, muestrearTrazo, LETRAS_TRACO } = require(SALIDA);
fs.unlinkSync(SALIDA);

// La letra y el validador usan la MISMA trayectoria: el "trazo perfecto" es
// literalmente la trayectoria de la letra.
const D = Object.fromEntries(LETRAS_TRACO.map((l) => [l.letra, l.d]));

function densa(puntos, paso = 3) {
  const out = [{ x: puntos[0][0], y: puntos[0][1] }];
  for (let i = 1; i < puntos.length; i++) {
    const [ax, ay] = puntos[i - 1];
    const [bx, by] = puntos[i];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / paso));
    for (let s = 1; s <= n; s++) {
      const t = s / n;
      out.push({ x: ax + (bx - ax) * t, y: ay + (by - ay) * t });
    }
  }
  return out;
}

// Mano temblorosa: ruido determinista de ±2.5 unidades.
function temblor(puntos, amp = 2.5) {
  let semilla = 7;
  const rnd = () => {
    semilla = (semilla * 1103515245 + 12345) & 0x7fffffff;
    return semilla / 0x7fffffff;
  };
  return puntos.map((p) => ({
    x: p.x + (rnd() * 2 - 1) * amp,
    y: p.y + (rnd() * 2 - 1) * amp,
  }));
}

const MALOS = [
  { letra: 'M', nombre: 'V en vez de M', puntos: densa([[20, 80], [50, 20], [80, 80]]) },
  { letra: 'M', nombre: 'N en vez de M', puntos: densa([[20, 82], [20, 20], [80, 80], [80, 20]]) },
  { letra: 'M', nombre: 'garabato en una esquina', puntos: densa([[10, 10], [20, 15], [25, 10]]) },
  { letra: 'E', nombre: 'raya horizontal', puntos: densa([[10, 50], [90, 50]]) },
  { letra: 'O', nombre: 'un solo punto', puntos: [{ x: 50, y: 50 }] },
  { letra: 'O', nombre: 'U en vez de O', puntos: muestrearTrazo(D['U'], 3) },
  { letra: 'L', nombre: 'rayita corta', puntos: densa([[30, 20], [35, 25]]) },
  { letra: 'T', nombre: 'solo el palito (sin travesaño)', puntos: muestrearTrazo('M 50 18 L 50 82', 3) },
  { letra: 'S', nombre: 'linea recta', puntos: densa([[20, 20], [80, 80]]) },
  { letra: 'A', nombre: 'A sin travesaño', puntos: muestrearTrazo('M 22 85 L 50 18 L 78 85', 3) },
  { letra: 'I', nombre: 'raya horizontal en vez de I', puntos: densa([[20, 50], [80, 50]]) },
  { letra: 'E', nombre: 'F en vez de E (sin palo de abajo)', puntos: muestrearTrazo('M 78 22 L 25 22 L 25 80 M 25 51 L 66 51', 3) },
  { letra: 'L', nombre: 'trazo vacio', puntos: [] },
];

let fallas = 0;
let pruebas = 0;

function comprobar(cond, mensaje) {
  pruebas++;
  if (!cond) fallas++;
  console.log(`  ${cond ? 'ok   ' : 'FALLA'}  ${mensaje}`);
}

console.log('--- Letras bien trazadas (trazo perfecto + mano temblorosa) ---');
for (const letra of Object.keys(D)) {
  const perfecto = muestrearTrazo(D[letra], 3);
  const r1 = validarTrazo(perfecto, D[letra]);
  comprobar(r1.ok, `${letra} perfecta (motivo=${r1.motivo} pct=${r1.pct})`);

  const r2 = validarTrazo(temblor(perfecto), D[letra]);
  comprobar(r2.ok, `${letra} con temblor (motivo=${r2.motivo} pct=${r2.pct})`);
}

console.log('\n--- Misma letra empezando por otro lado / al revés ---');
const o = muestrearTrazo(D['O'], 3);
comprobar(validarTrazo([...o].reverse(), D['O']).ok, 'O al revés');
comprobar(validarTrazo([...o.slice(20), ...o.slice(0, 20)], D['O']).ok, 'O empezando en otro punto');
const a = muestrearTrazo(D['A'], 3);
comprobar(validarTrazo([...a.slice(30), ...a.slice(0, 30)], D['A']).ok, 'A empezando por el travesaño');

console.log('\n--- Trazos que NO son la letra ---');
for (const c of MALOS) {
  const r = validarTrazo(c.puntos, D[c.letra]);
  comprobar(!r.ok, `${c.letra}: ${c.nombre} (motivo=${r.motivo} pct=${r.pct})`);
}

console.log('\n--- El muestreador de trayectoria ---');
const muestraA = muestrearTrazo(D['A'], 2);
comprobar(muestraA.length > 40, `A genera ${muestraA.length} puntos`);
comprobar(Math.abs(muestraA[0].x - 22) < 1e-9 && Math.abs(muestraA[0].y - 85) < 1e-9, 'empieza en el primer punto de la letra');
const muestraO = muestrearTrazo(D['O'], 2);
const cajaO = {
  minX: Math.min(...muestraO.map((p) => p.x)),
  maxX: Math.max(...muestraO.map((p) => p.x)),
};
comprobar(cajaO.minX > 18 && cajaO.maxX < 82, 'la O ocupa el ancho esperado');

console.log(`\nPruebas: ${pruebas} · fallas: ${fallas}`);
process.exit(fallas === 0 ? 0 : 1);
