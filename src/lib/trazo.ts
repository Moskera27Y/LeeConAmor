// Trazo de letras: la letra y la validación salen de LA MISMA trayectoria.
// Antes: la letra se dibujaba con texto y los puntitos se ponían a mano, así
// que no coincidían. Ahora cada letra es un path SVG en un lienzo 0-100 y el
// validador muestrea ese mismo path: los puntos guía y la forma siempre son
// exactamente la letra.
//
// Solo se usan comandos M, L y Q (el muestreador es JS puro: probado en node
// sin navegador).

export interface LetraTrazo {
  letra: string;
  fonetica: string;
  imagen: string;
  // Trayectoria SVG en espacio 0-100 (cuadrado).
  d: string;
}

export const LETRAS_TRACO: LetraTrazo[] = [
  { letra: 'A', fonetica: 'aaa como manzana', imagen: '🍎', d: 'M 22 85 L 50 18 L 78 85 M 32 60 L 68 60' },
  { letra: 'E', fonetica: 'eee como elefante', imagen: '🐘', d: 'M 78 22 L 25 22 L 25 80 L 78 80 M 25 51 L 66 51' },
  { letra: 'I', fonetica: 'iii como isla', imagen: '🏝️', d: 'M 50 20 L 50 80' },
  { letra: 'O', fonetica: 'ooo como oso', imagen: '⚽', d: 'M 50 18 Q 78 18 78 50 Q 78 82 50 82 Q 22 82 22 50 Q 22 18 50 18' },
  { letra: 'U', fonetica: 'uuu como uva', imagen: '🍇', d: 'M 25 18 L 25 55 Q 25 82 50 82 Q 75 82 75 55 L 75 18' },
  { letra: 'M', fonetica: 'mmm como mamá', imagen: '👩', d: 'M 18 82 L 18 20 L 50 62 L 82 20 L 82 82' },
  { letra: 'P', fonetica: 'ppp como papá', imagen: '👨', d: 'M 30 82 L 30 18 L 55 18 Q 75 18 75 38 Q 75 56 55 56 L 30 56' },
  { letra: 'S', fonetica: 'sss como serpiente', imagen: '🐍', d: 'M 74 22 Q 60 14 46 18 Q 26 22 26 38 Q 26 50 50 50 Q 74 50 74 63 Q 74 82 52 82 Q 36 82 26 76' },
  { letra: 'L', fonetica: 'lll como luna', imagen: '🌙', d: 'M 26 18 L 26 80 L 76 80' },
  { letra: 'T', fonetica: 'ttt como tambor', imagen: '🥁', d: 'M 20 18 L 80 18 M 50 18 L 50 82' },
];

export type MotivoTrazo = 'corto' | 'chico' | 'forma' | 'ok';

export interface ResultadoTrazo {
  ok: boolean;
  motivo: MotivoTrazo;
  pct: number;
}

export const MENSAJES_TRAZO: Record<MotivoTrazo, string> = {
  corto: 'Traza un poco más largo, sin levantar el dedo.',
  chico: 'Ocupa más del cuadrito: sigue los puntitos de la letra.',
  forma: 'Esa forma no es. Sigue la letra gris con el dedo.',
  ok: '¡Muy bien!',
};

const TOLERANCIA = 7;       // distancia máxima a la letra (espacio 0-100)
const COBERTURA_MIN = 0.85; // % de la letra que el niño recorrió
const COBERTURA_TRAMO_MIN = 0.55; // cada trazo de la letra (ej: travesaño de A)
const PRECISION_MIN = 0.7;  // % del trazo del niño que va sobre la letra
const LARGO_MIN = 0.5;      // largo del trazo vs largo de la letra

type Punto = { x: number; y: number };

function empujarLinea(out: Punto[], ax: number, ay: number, bx: number, by: number, paso: number) {
  const largo = Math.hypot(bx - ax, by - ay);
  const n = Math.max(1, Math.ceil(largo / paso));
  for (let s = 1; s <= n; s++) {
    const t = s / n;
    out.push({ x: ax + (bx - ax) * t, y: ay + (by - ay) * t });
  }
}

function empujarCuad(out: Punto[], ax: number, ay: number, qx: number, qy: number, bx: number, by: number, paso: number) {
  // Aproxima el largo del arco con 24 tramos rectos.
  let largoAprox = 0;
  let px = ax, py = ay;
  for (let s = 1; s <= 24; s++) {
    const t = s / 24;
    const u = 1 - t;
    const x = u * u * ax + 2 * u * t * qx + t * t * bx;
    const y = u * u * ay + 2 * u * t * qy + t * t * by;
    largoAprox += Math.hypot(x - px, y - py);
    px = x; py = y;
  }
  const n = Math.max(2, Math.ceil(largoAprox / paso));
  for (let s = 1; s <= n; s++) {
    const t = s / n;
    const u = 1 - t;
    out.push({
      x: u * u * ax + 2 * u * t * qx + t * t * bx,
      y: u * u * ay + 2 * u * t * qy + t * t * by,
    });
  }
}

/** Convierte la trayectoria SVG en tramos (cada M empieza un trazo nuevo). */
export function muestrearTramos(d: string, paso = 2): Punto[][] {
  const tokens = d.match(/[MLQ]|-?\d+(?:\.\d+)?/g) || [];
  const tramos: Punto[][] = [];
  let actual: Punto[] = [];
  let i = 0;
  let cmd = '';
  let cx = 0;
  let cy = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t === 'M' || t === 'L' || t === 'Q') {
      cmd = t;
      i++;
      continue;
    }
    if (cmd === 'M') {
      cx = Number(tokens[i++]);
      cy = Number(tokens[i++]);
      actual = [{ x: cx, y: cy }];
      tramos.push(actual);
      continue;
    }
    if (cmd === 'L') {
      const x = Number(tokens[i++]);
      const y = Number(tokens[i++]);
      empujarLinea(actual, cx, cy, x, y, paso);
      cx = x;
      cy = y;
      continue;
    }
    if (cmd === 'Q') {
      const qx = Number(tokens[i++]);
      const qy = Number(tokens[i++]);
      const x = Number(tokens[i++]);
      const y = Number(tokens[i++]);
      empujarCuad(actual, cx, cy, qx, qy, x, y, paso);
      cx = x;
      cy = y;
    }
  }
  return tramos.filter((t) => t.length >= 1);
}

/** Convierte la trayectoria SVG (M/L/Q) en una polilínea densa de puntos. */
export function muestrearTrazo(d: string, paso = 2): Punto[] {
  return muestrearTramos(d, paso).flat();
}

function distanciaSegmento(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function distanciaAPolilinea(p: Punto, linea: Punto[]): number {
  let mejor = Infinity;
  for (let i = 1; i < linea.length; i++) {
    const d = distanciaSegmento(p.x, p.y, linea[i - 1].x, linea[i - 1].y, linea[i].x, linea[i].y);
    if (d < mejor) mejor = d;
  }
  return mejor;
}

function largoPolilinea(linea: Punto[]): number {
  let total = 0;
  for (let i = 1; i < linea.length; i++) {
    total += Math.hypot(linea[i].x - linea[i - 1].x, linea[i].y - linea[i - 1].y);
  }
  return total;
}

/**
 * Valida el trazo del niño contra la letra.
 * `puntos` vienen en espacio 0-100 (el componente convierte de píxeles).
 * No exige orden: basta con recorrer la letra sin salirse de ella (la
 * cobertura ya rechaza dibujar otra letra o una parte suelta).
 */
export function validarTrazo(puntos: Punto[], d: string): ResultadoTrazo {
  const limpio: Punto[] = [];
  for (const p of puntos) {
    const ultimo = limpio[limpio.length - 1];
    if (!ultimo || Math.hypot(p.x - ultimo.x, p.y - ultimo.y) >= 1) limpio.push(p);
  }
  if (limpio.length < 4) return { ok: false, motivo: 'corto', pct: 0 };

  const tramos = muestrearTramos(d, 2);
  const trayectoria = tramos.flat();
  if (trayectoria.length < 2) return { ok: false, motivo: 'forma', pct: 0 };

  const xs = limpio.map((p) => p.x);
  const ys = limpio.map((p) => p.y);
  const caja = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  if (caja < 22) return { ok: false, motivo: 'chico', pct: 0 };

  const largoTrayectoria = largoPolilinea(trayectoria);
  const largoUsuario = largoPolilinea(limpio);
  if (largoUsuario < largoTrayectoria * LARGO_MIN) {
    return { ok: false, motivo: 'corto', pct: Math.round((largoUsuario / largoTrayectoria) * 40) };
  }

  // Cobertura: cuánta de la letra quedó cubierta por el dedo.
  // Se exige además que cada trazo (ej: el travesaño de la A) esté cubierto.
  let cubiertos = 0;
  for (const tramo of tramos) {
    let cubiertosTramo = 0;
    for (const p of tramo) {
      if (distanciaAPolilinea(p, limpio) <= TOLERANCIA) cubiertosTramo++;
    }
    const coberturaTramo = cubiertosTramo / tramo.length;
    if (coberturaTramo < COBERTURA_TRAMO_MIN) {
      return { ok: false, motivo: 'forma', pct: Math.round(coberturaTramo * 100) };
    }
    cubiertos += cubiertosTramo;
  }
  const cobertura = cubiertos / trayectoria.length;

  // Precisión: cuánto del trazo del niño está sobre la letra.
  let precisos = 0;
  for (const p of limpio) {
    if (distanciaAPolilinea(p, trayectoria) <= TOLERANCIA) precisos++;
  }
  const precision = precisos / limpio.length;

  const pct = Math.round(Math.min(cobertura, precision) * 100);
  if (cobertura >= COBERTURA_MIN && precision >= PRECISION_MIN) {
    return { ok: true, motivo: 'ok', pct: 100 };
  }
  return { ok: false, motivo: 'forma', pct };
}
