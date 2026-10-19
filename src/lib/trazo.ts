// Validación del trazo de letras: decide si lo que el niño dibuja se parece
// a la letra. Se separa del componente para poder probarla sin navegador.

export interface LetraTrazo {
  letra: string;
  fonetica: string;
  imagen: string;
  // Puntos guía (0-100) que el trazo debe pasar cerca, en este orden.
  guias: [number, number][];
}

export const LETRAS_TRACO: LetraTrazo[] = [
  { letra: 'A', fonetica: 'aaa como manzana', imagen: '🍎', guias: [[50, 18], [50, 30], [30, 78], [50, 55], [70, 78]] },
  { letra: 'E', fonetica: 'eee como elefante', imagen: '🐘', guias: [[78, 18], [22, 22], [22, 78], [76, 80]] },
  { letra: 'I', fonetica: 'iii como isla', imagen: '🏝️', guias: [[50, 18], [50, 50], [50, 82]] },
  { letra: 'O', fonetica: 'ooo como oso', imagen: '⚽', guias: [[50, 18], [26, 50], [50, 82], [74, 50], [50, 18]] },
  { letra: 'U', fonetica: 'uuu como uva', imagen: '🍇', guias: [[22, 18], [22, 60], [50, 82], [78, 60], [78, 18]] },
  { letra: 'M', fonetica: 'mmm como mamá', imagen: '👩', guias: [[20, 82], [50, 28], [50, 62], [80, 28], [80, 82]] },
  { letra: 'P', fonetica: 'ppp como papá', imagen: '👨', guias: [[26, 82], [26, 20], [55, 20], [68, 36], [52, 52], [26, 54]] },
  { letra: 'S', fonetica: 'sss como serpiente', imagen: '🐍', guias: [[74, 20], [34, 18], [28, 40], [52, 50], [72, 60], [64, 82], [28, 80]] },
  { letra: 'L', fonetica: 'lll como luna', imagen: '🌙', guias: [[24, 18], [24, 78], [78, 80]] },
  { letra: 'T', fonetica: 'ttt como tambor', imagen: '🥁', guias: [[18, 18], [50, 18], [50, 52], [50, 84]] },
];

export type MotivoTrazo = 'corto' | 'chico' | 'forma' | 'ok';

export interface ResultadoTrazo {
  ok: boolean;
  motivo: MotivoTrazo;
  pct: number;
}

export const MENSAJES_TRAZO: Record<MotivoTrazo, string> = {
  corto: 'Traza un poco más largo, sin levantar el dedo.',
  chico: 'Ocupa más del cuadrito: empieza cerca de una esquina.',
  forma: 'Esa forma no es. Sigue la letra gris con el dedo.',
  ok: '¡Muy bien!',
};

export function validarTrazo(
  puntos: { x: number; y: number }[],
  ancho: number,
  alto: number,
  guias: [number, number][]
): ResultadoTrazo {
  if (puntos.length < 6) return { ok: false, motivo: 'corto', pct: 0 };

  const xs = puntos.map((p) => p.x);
  const ys = puntos.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const cajaX = maxX - minX, cajaY = maxY - minY;

  // El trazo tiene que ocupar una parte real del lienzo.
  const escala = Math.max(cajaX, cajaY);
  if (escala < Math.min(ancho, alto) * 0.22) return { ok: false, motivo: 'chico', pct: 0 };

  // Escalamos la caja del dibujo a la caja que ocupa la letra, para que el
  // niño pueda trazarla del tamaño que quiera sin que se rechace.
  const gxs = guias.map((g) => g[0]);
  const gys = guias.map((g) => g[1]);
  const gx0 = Math.min(...gxs), gx1 = Math.max(...gxs);
  const gy0 = Math.min(...gys), gy1 = Math.max(...gys);
  const gw = gx1 - gx0, gh = gy1 - gy0;

  const mapeo = (v: number, desde: number, tamanho: number, c0: number, c1: number) => {
    if (c1 - c0 < 1 || tamanho < 1) return (c0 + c1) / 2; // dimensión plana
    return c0 + ((v - desde) / tamanho) * (c1 - c0);
  };

  const normalizados = puntos.map((p) => ({
    x: mapeo(p.x, minX, cajaX, gx0, gx1),
    y: mapeo(p.y, minY, cajaY, gy0, gy1),
  }));

  // Tolerancia proporcional al tamaño de la letra: ni tan grande que deje
  // pasar otra letra, ni tan chiquita que le cueste al ni\xF1o.
  const tolerancia = Math.max(12, Math.min(gw, gh) * 0.28);

  // Largo esperado: el de la propia letra. Así una "I" (un solo trazo) no
  // queda descartada por ser corta, y un garabato largo tampoco pasa.
  let largoGuias = 0;
  for (let i = 1; i < guias.length; i++) {
    largoGuias += Math.hypot(guias[i][0] - guias[i - 1][0], guias[i][1] - guias[i - 1][1]);
  }
  let largo = 0;
  for (let i = 1; i < normalizados.length; i++) {
    largo += Math.hypot(
      normalizados[i].x - normalizados[i - 1].x,
      normalizados[i].y - normalizados[i - 1].y
    );
  }
  const minimo = largoGuias * 0.6;
  if (largo < minimo) return { ok: false, motivo: 'corto', pct: Math.round((largo / minimo) * 40) };

  // Cada guía necesita un punto cercano, y en orden creciente.
  let indice = 0;
  let aciertos = 0;
  for (const [gx, gy] of guias) {
    let mejor = Infinity;
    let mejorIdx = -1;
    for (let i = indice; i < normalizados.length; i++) {
      const d = Math.hypot(normalizados[i].x - gx, normalizados[i].y - gy);
      if (d < mejor) {
        mejor = d;
        mejorIdx = i;
      }
    }
    if (mejor <= tolerancia) {
      aciertos++;
      indice = mejorIdx;
    } else {
      return { ok: false, motivo: 'forma', pct: Math.round((aciertos / guias.length) * 100) };
    }
  }

  return { ok: true, motivo: 'ok', pct: 100 };
}