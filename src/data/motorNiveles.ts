// Motor procedural de niveles infinitos: vocales → sílabas → abecedario → repaso.
// Determinista por (etapa, n): el mismo n genera el mismo nivel (precache y sync).
import type { Level, RangeId } from './curriculum';

export type EtapaId = 'vocales' | 'silabas' | 'abecedario' | 'repaso';

export interface EstadoMotor {
  etapa: EtapaId;
  n: number;
  pesos: Record<string, number>;
  aciertos: Record<string, number>;
}

export const ETAPAS: { id: EtapaId; nombre: string; icono: string; desc: string }[] = [
  { id: 'vocales', nombre: 'Vocales', icono: '🎨', desc: 'A, E, I, O, U' },
  { id: 'silabas', nombre: 'Sílabas', icono: '🧱', desc: 'MA, PA, SA, LA...' },
  { id: 'abecedario', nombre: 'Abecedario', icono: '🔤', desc: 'De la A a la Z' },
  { id: 'repaso', nombre: 'Repaso infinito', icono: '♾️', desc: 'Mezcla de todo' },
];

export const VOCALES = ['A', 'E', 'I', 'O', 'U'];
export const CONSONANTES = ['M', 'P', 'S', 'L', 'T', 'N', 'R', 'D', 'C', 'B'];
export const ABECEDARIO = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');

export const FONETICA: Record<string, string> = {
  A: 'aaa como manzana', E: 'eee como elefante', I: 'iii como isla',
  O: 'ooo como oso', U: 'uuu como uva', M: 'mmm como mamá',
  P: 'ppp como papá', S: 'sss como serpiente', L: 'lll como luna',
  T: 'ttt como tambor', N: 'nnn como nube', R: 'rrr suave como rueda',
  D: 'ddd como dado', C: 'kkk como casa', B: 'bbb como balón',
  F: 'fff como foca', G: 'ggg como gato', H: 'la hache es muda',
  J: 'jjj como jirafa', K: 'kkk como kilo', Ñ: 'ñññ como niño',
  Q: 'kkk como queso', V: 'vvv como vaca', W: 'uuu como wifi',
  X: 'ekis como taxi', Y: 'yyy como yoyo', Z: 'zzz como zapato',
};

function mulberry32(semilla: number) {
  let a = semilla >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function muestra<T>(arr: T[], k: number, rnd: () => number): T[] {
  const copia = [...arr];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia.slice(0, k);
}

function ponderada(letras: string[], pesos: Record<string, number>, k: number, rnd: () => number): string[] {
  const bolsa: string[] = [];
  for (const l of letras) {
    const w = 1 + Math.max(0, pesos[l] || 0);
    for (let i = 0; i < w; i++) bolsa.push(l);
  }
  return [...new Set(muestra(bolsa, Math.min(k * 3, bolsa.length), rnd))].slice(0, k);
}

function foneticas(targets: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const t of targets) out[t] = FONETICA[t] || t;
  return out;
}

export function generarNivel(estado: EstadoMotor, rango: RangeId): Level {
  const rnd = mulberry32(estado.n * 2654435761 + estado.etapa.length * 97 + (rango === '6-8' ? 13 : 7));
  const base = { id: estado.n + 1, emoji: ['🦉', '📚', '⭐'], sentences: [] as string[] };

  if (estado.etapa === 'vocales') {
    const k = estado.n < 2 ? 2 : 3;
    const targets = muestra(VOCALES, k, rnd);
    return {
      ...base,
      titulo: `Vocales ${estado.n + 1}`,
      descripcion: 'Escuchar y reconocer vocales',
      targetLetters: targets,
      instruction: `Escucha a Léo y toca: ${targets.join(', ')}.`,
      wordsToHighlight: [targets.join('')],
      reward: '¡Muy bien con las vocales!',
      phonetics: foneticas(targets),
    };
  }

  if (estado.etapa === 'silabas') {
    const cons = muestra(CONSONANTES.slice(0, rango === '3-5' ? 4 : 7), 2, rnd);
    const voc = muestra(VOCALES, 2, rnd);
    const silabas = [cons[0] + voc[0], (cons[1] || cons[0]) + (voc[1] || voc[0])];
    const targets = [...new Set((silabas.join('')).split(''))];
    return {
      ...base,
      titulo: `Sílabas ${estado.n + 1}`,
      descripcion: `Junta ${silabas.join(' y ')}`,
      targetLetters: targets,
      instruction: `Junta los sonidos para formar ${silabas.join(' y ')}. Toca sus letras.`,
      wordsToHighlight: silabas,
      reward: '¡Formaste sílabas!',
      phonetics: foneticas(targets),
    };
  }

  if (estado.etapa === 'abecedario') {
    const inicio = (estado.n * 4) % (ABECEDARIO.length - 4);
    const targets = ABECEDARIO.slice(inicio, inicio + 4);
    return {
      ...base,
      titulo: `Abecedario ${estado.n + 1}`,
      descripcion: `Letras ${targets[0]} a ${targets[targets.length - 1]}`,
      targetLetters: targets,
      instruction: `Busca estas letras del abecedario: ${targets.join(', ')}.`,
      wordsToHighlight: [targets.join('')],
      reward: '¡Dominas el abecedario!',
      phonetics: foneticas(targets),
    };
  }

  // repaso infinito: lo que más cuesta, más sale
  const targets = ponderada(rango === '3-5' ? [...VOCALES, 'M', 'P', 'S'] : ABECEDARIO, estado.pesos, 4, rnd);
  return {
    ...base,
    titulo: `Repaso ${estado.n + 1}`,
    descripcion: 'Mezcla de todo lo aprendido',
    targetLetters: targets,
    instruction: `Repasemos juntitos: ${targets.join(', ')}.`,
    wordsToHighlight: [targets.join('')],
    reward: '¡Qué memoria tan linda!',
    phonetics: foneticas(targets),
  };
}

// Regla de avance: ≥80% aciertos sube de número; cada 6 niveles sube de etapa.
export function avanzar(
  estado: EstadoMotor,
  aciertos: number,
  total: number,
  falladas: string[],
  acertadas: string[] = []
): { nuevo: EstadoMotor; subioEtapa: boolean } {
  const pesos = { ...estado.pesos };
  const ac = { ...estado.aciertos };
  for (const l of falladas) pesos[l] = (pesos[l] || 0) + 1;
  for (const l of acertadas) ac[l] = (ac[l] || 0) + 1;
  const ok = total > 0 && aciertos / total >= 0.8;
  const n = ok ? estado.n + 1 : estado.n;
  const orden: EtapaId[] = ['vocales', 'silabas', 'abecedario', 'repaso'];
  const idx = orden.indexOf(estado.etapa);
  const subioEtapa = ok && n > 0 && n % 6 === 0 && idx < orden.length - 1;
  return {
    nuevo: { etapa: subioEtapa ? orden[idx + 1] : estado.etapa, n: subioEtapa ? 0 : n, pesos, aciertos: ac },
    subioEtapa,
  };
}

export function dominio(estado: EstadoMotor, letra: string): number {
  const f = estado.pesos[letra] || 0;
  const a = estado.aciertos[letra] || 0;
  const t = a + f;
  if (t === 0) return 0;
  return Math.round((a / t) * 100);
}
