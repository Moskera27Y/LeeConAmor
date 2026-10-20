import { recompensaEtapa } from './frasesVoz';

export type EtapaId = 'vocales' | 'silabas' | 'palabras' | 'oraciones';

export interface EstadoMotor {
  etapa: EtapaId;
  n: number;
  pesos: Record<string, number>;
  aciertos: Record<string, number>;
  leccionId?: string;
  actividadIdx?: number;
}

// Etapas por rango de edad
export const ETAPAS_POR_RANGO: Record<'3-5' | '6-8', EtapaId[]> = {
  '3-5': ['vocales', 'silabas', 'palabras'],
  '6-8': ['vocales', 'silabas', 'palabras', 'oraciones'],
};

export const ETAPAS: { id: EtapaId; nombre: string; icono: string; desc: string }[] = [
  { id: 'vocales', nombre: 'Vocales', icono: '🎨', desc: 'A, E, I, O, U' },
  { id: 'silabas', nombre: 'Sílabas', icono: '🧱', desc: 'MA, PA, SA, LA...' },
  { id: 'palabras', nombre: 'Palabras', icono: '📖', desc: 'MAMA, PAPA, PERA, SOL...' },
  { id: 'oraciones', nombre: 'Oraciones', icono: '📚', desc: 'Mamá me ama, El sol sale...' },
];

// Obtener las etapas disponibles para un rango
export function obtenerEtapasDisponibles(rango: RangeId): EtapaId[] {
  return ETAPAS_POR_RANGO[rango];
}

// Verificar si una etapa está disponible para un rango
export function etapaDisponible(rango: RangeId, etapa: EtapaId): boolean {
  return ETAPAS_POR_RANGO[rango].includes(etapa);
}

export const VOCALES = ['A', 'E', 'I', 'O', 'U'];
export const CONSONANTES = ['M', 'P', 'S', 'L', 'T', 'N', 'R', 'D', 'C', 'B', 'F', 'G', 'H', 'J', 'K', 'Ñ', 'Q', 'V', 'W', 'X', 'Y', 'Z'];
export const ABECEDARIO = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');

export const FONETICA: Record<string, string> = {
  A: 'aaa como manzana', E: 'eee como elefante', I: 'iii como isla',
  O: 'ooo como oso', U: 'uuu como uva', M: 'mmm como mamá',
  P: 'ppp como papá', S: 'sss como serpiente', L: 'lll como luna',
  T: 'ttt como tambor', N: 'nnn como nube', R: 'rrr suave como rueda',
  D: 'ddd como dado', C: 'ce', B: 'bbb', F: 'eff', G: 'ge', H: 'hache',
  J: 'jota', K: 'ka', Ñ: 'eñe', Q: 'cu', V: 'uve', W: 'uve doble',
  X: 'equis', Y: 'i griega', Z: 'zeta'
};

function mulberry32(semilla: number) {
  let a = semilla >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (a >>> 7), 61 | a)) ^ t;
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

export function generarNivel(estado: EstadoMotor, rango: RangeId): any {
  const rnd = mulberry32(estado.n * 2654435761 + estado.etapa.length * 97 + (rango === '6-8' ? 13 : 7));
  const base = { id: estado.n + 1, emoji: ['🦉', '📚', '⭐'], sentences: [] as string[] };

  if (estado.etapa === 'vocales') {
    const k = estado.n < 2 ? 2 : 3;
    const targets = muestra(VOCALES, k, rnd);
    const distractores = muestra(CONSONANTES.slice(0, 6), 3, rnd).filter((c) => !targets.includes(c));
    return {
      ...base,
      titulo: `Vocales ${estado.n + 1}`,
      descripcion: 'Escuchar y reconocer vocales',
      targetLetters: targets,
      distractores,
      instruction: `Escucha a Léo y toca: ${targets.join(', ')}.`,
      wordsToHighlight: [targets.join('')],
      reward: recompensaEtapa('vocales'),
      phonetics: foneticas(targets),
    };
  }

  if (estado.etapa === 'silabas') {
    const cons = muestra(CONSONANTES.slice(0, rango === '3-5' ? 4 : 7), 2, rnd);
    const voc = muestra(VOCALES, 2, rnd);
    const silabas = [cons[0] + voc[0], (cons[1] || cons[0]) + (voc[1] || voc[0])];
    const targets = [...new Set((silabas.join('')).split(''))];
    const distractores = muestra(CONSONANTES.filter((c) => !targets.includes(c)), 3, rnd);
    return {
      ...base,
      titulo: `Sílabas ${estado.n + 1}`,
      descripcion: `Junta ${silabas.join(' y ')}`,
      targetLetters: targets,
      distractores,
      instruction: `Junta los sonidos para formar ${silabas.join(' y ')}. Toca sus letras.`,
      wordsToHighlight: silabas,
      reward: recompensaEtapa('silabas'),
      phonetics: foneticas(targets),
    };
  }

  if (estado.etapa === 'palabras') {
    const inicio = (estado.n * 4) % (ABECEDARIO.length - 4);
    const targets = ABECEDARIO.slice(inicio, inicio + 4);
    const distractores = muestra(ABECEDARIO.filter((l) => !targets.includes(l)), 3, rnd);
    return {
      ...base,
      titulo: `Abecedario ${estado.n + 1}`,
      descripcion: `Letras ${targets[0]} a ${targets[targets.length - 1]}`,
      targetLetters: targets,
      distractores,
      instruction: `Busca estas letras del abecedario: ${targets.join(', ')}.`,
      wordsToHighlight: [targets.join('')],
      reward: recompensaEtapa('palabras'),
      phonetics: foneticas(targets),
    };
  }

  // repaso infinito
  const targets = ponderada(rango === '3-5' ? [...VOCALES, 'M', 'P', 'S'] : ABECEDARIO, estado.pesos, 4, rnd);
  const distractores = muestra(ABECEDARIO.filter((l) => !targets.includes(l)), 3, rnd);
  return {
    ...base,
    titulo: `Repaso ${estado.n + 1}`,
    descripcion: 'Mezcla de todo lo aprendido',
    targetLetters: targets,
    distractores,
    instruction: `Repasemos juntitos: ${targets.join(', ')}.`,
    wordsToHighlight: [targets.join('')],
    reward: recompensaEtapa('repaso'),
    phonetics: foneticas(targets),
  };
}

export function avanzar(
  estado: EstadoMotor,
  aciertos: number,
  total: number,
  falladas: string[],
  acertadas: string[] = [],
  rango: RangeId = '3-5'
): { nuevo: EstadoMotor; subioEtapa: boolean } {
  const pesos = { ...estado.pesos };
  const ac = { ...estado.aciertos };
  for (const l of falladas) pesos[l] = (pesos[l] || 0) + 1;
  for (const l of acertadas) ac[l] = (ac[l] || 0) + 1;
  const ok = total > 0 && aciertos / total >= 0.8;
  const n = ok ? estado.n + 1 : estado.n;
  const orden = ETAPAS_POR_RANGO[rango];
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

function foneticas(targets: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const t of targets) out[t] = FONETICA[t] || t;
  return out;
}

// ============================================================
// INTEGRACIÓN CON SECUENCIA DE LECCIONES
// ============================================================

import { SECUENCIA_LECCIONES, obtenerTotalLecciones, Leccion, ActividadLeccion } from './secuenciaLecciones';
import type { RangeId } from './curriculum';

export { obtenerTotalLecciones };

type EtapaLeccionMap = Record<EtapaId, string[]>;

const ETAPA_LECCION: EtapaLeccionMap = {
  vocales: ['vocales'],
  silabas: ['silabas_directas', 'silabas_inversas', 'silabas_trabadas'],
  palabras: ['palabras_2_silabas', 'palabras_3_silabas'],
  oraciones: ['oraciones'],
};

export function obtenerLeccionesEtapa(rango: RangeId, etapa: EtapaId): Leccion[] {
  const etapasDeLaLeccion = ETAPA_LECCION[etapa] || [];
  return SECUENCIA_LECCIONES[rango].filter((l) => etapasDeLaLeccion.includes(l.etapa));
}

export function obtenerLeccionPorOrden(rango: RangeId, etapa: EtapaId, orden: number): Leccion | null {
  const lecciones = obtenerLeccionesEtapa(rango, etapa);
  return lecciones.find((l) => l.orden === orden) || null;
}

// Traduce la etapa sugerida por la evaluación (p.ej. "silabas_directas") a la
// etapa del motor, para empezar por donde el niño realmente está.
function etapaDeEvaluacion(etapaSugerida?: string): EtapaId | null {
  if (!etapaSugerida) return null;
  for (const [etapa, subetapas] of Object.entries(ETAPA_LECCION)) {
    if (subetapas.includes(etapaSugerida)) return etapa as EtapaId;
  }
  return null;
}

// Si el niño todavía no tiene lección asignada, se le asigna la primera lección
// de su rango (o la de la etapa que recommendó la evaluación inicial).
// Sin esto, el recorrido guiado de lecciones nunca arrancaba.
export function asegurarLeccionInicial(
  estado: EstadoMotor,
  rango: RangeId,
  evaluacion?: { etapaRecomendada?: string } | null
): EstadoMotor {
  if (estado.leccionId) return estado;

  const rangoEtapas = ETAPAS_POR_RANGO[rango];
  let etapa = estado.etapa;
  const etapaEval = etapaDeEvaluacion(evaluacion?.etapaRecomendada);
  if (etapaEval && rangoEtapas.includes(etapaEval)) etapa = etapaEval;

  const lecciones = obtenerLeccionesEtapa(rango, etapa);
  // Si la evaluación recomienda una subetapa concreta (p. ej. trabadas),
  // empieza por su primera lección en vez de por el inicio del bloque.
  const especifica = evaluacion?.etapaRecomendada
    ? lecciones.find((l) => l.etapa === evaluacion.etapaRecomendada)
    : undefined;
  const primera = especifica || lecciones[0];
  if (!primera) {
    // Ese rango no tiene lecciones para la etapa: usa la primera disponible.
    const cualquiera = SECUENCIA_LECCIONES[rango][0];
    if (!cualquiera) return estado;
    return { ...estado, leccionId: cualquiera.id, actividadIdx: 0 };
  }
  const n = estado.n ?? 0;
  const orden = especifica ? -1 : Math.min(n, Math.max(0, lecciones.length - 1));
  const leccion = especifica || lecciones[orden] || primera;
  return { ...estado, etapa, leccionId: leccion.id, actividadIdx: 0 };
}

export interface ActividadConLeccion {
  leccion: Leccion;
  actividad: ActividadLeccion;
  actividadIndex: number;
  esUltimaActividad: boolean;
}

export function obtenerActividadActual(estado: EstadoMotor, rango: RangeId): ActividadConLeccion | null {
  const leccionId = estado.leccionId;
  const actividadIdx = estado.actividadIdx ?? 0;

  if (!leccionId) return null;

  const todas = SECUENCIA_LECCIONES[rango];
  const leccion = todas.find((l) => l.id === leccionId);
  if (!leccion) return null;

  const actividad = leccion.actividades[actividadIdx];
  if (!actividad) return null;

  return {
    leccion,
    actividad,
    actividadIndex: actividadIdx,
    esUltimaActividad: actividadIdx >= leccion.actividades.length - 1,
  };
}

export function avanzarActividad(estado: EstadoMotor, rango: RangeId): EstadoMotor {
  const act = obtenerActividadActual(estado, rango);
  if (!act) return estado;

  if (act.esUltimaActividad) {
    // Pasar a la siguiente lección de todo el currículo del rango
    const todas = SECUENCIA_LECCIONES[rango];
    const idxLeccion = todas.findIndex((l) => l.id === estado.leccionId);
    if (idxLeccion === -1 || idxLeccion >= todas.length - 1) {
      // Última lección del rango: reiniciar el ciclo desde la primera,
      // sincronizando también la etapa para que el repaso no quede marcado
      // como "Oraciones" mientras muestra la lección de vocales.
      const primera = todas[0];
      return {
        ...estado,
        etapa: (primera && etapaDeLeccion(rango, primera.etapa)) || 'vocales',
        leccionId: primera?.id,
        actividadIdx: 0,
        n: 0,
      };
    }
    const siguienteLeccion = todas[idxLeccion + 1];
    // Al cambiar de bloque de lecciones, la etapa del motor se sincroniza.
    const nuevaEtapa = etapaDeLeccion(rango, siguienteLeccion.etapa) ?? estado.etapa;
    return {
      ...estado,
      etapa: nuevaEtapa,
      leccionId: siguienteLeccion.id,
      actividadIdx: 0,
    };
  }

  return { ...estado, actividadIdx: act.actividadIndex + 1 };
}

// Etapa del motor a la que pertenece una lección concreta.
export function etapaDeLeccion(rango: RangeId, etapaLeccion: string): EtapaId | null {
  for (const [etapa, subetapas] of Object.entries(ETAPA_LECCION)) {
    if (subetapas.includes(etapaLeccion)) {
      return ETAPAS_POR_RANGO[rango].includes(etapa as EtapaId) ? (etapa as EtapaId) : null;
    }
  }
  return null;
}

export function retrocerActividad(estado: EstadoMotor): EstadoMotor {
  if (estado.actividadIdx && estado.actividadIdx > 0) {
    return { ...estado, actividadIdx: estado.actividadIdx - 1 };
  }
  return estado;
}

// Letras (sin acentos, únicas) que forman el objetivo de una actividad.
// Sirve para actualizar el dominio por letra en el recorrido guiado.
export function letrasDeObjetivo(objetivo: string): string[] {
  const limpias = String(objetivo || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-ZÑ]/g, '');
  return [...new Set(limpias.split(''))];
}

export function indiceLeccionGlobal(rango: RangeId, leccionId?: string): number {
  if (!leccionId) return -1;
  return SECUENCIA_LECCIONES[rango].findIndex((l) => l.id === leccionId);
}

export function numeroLeccionActual(rango: RangeId, motor: EstadoMotor): number {
  const idx = indiceLeccionGlobal(rango, motor.leccionId);
  if (idx >= 0) return idx + 1;
  return Math.max(1, Math.min(obtenerTotalLecciones(rango), motor.n + 1));
}

export function esUltimaLeccion(rango: RangeId, motor: EstadoMotor): boolean {
  const idx = indiceLeccionGlobal(rango, motor.leccionId);
  return idx >= 0 && idx === SECUENCIA_LECCIONES[rango].length - 1;
}

// Progreso 0-100 del recorrido guiado (lección + actividad actual). Si el
// peque aún no tiene lección asignada, usa el avance clásico por etapas.
export function progresoCurso(rango: RangeId, motor: EstadoMotor): number {
  const total = obtenerTotalLecciones(rango);
  const idx = indiceLeccionGlobal(rango, motor.leccionId);
  if (idx >= 0 && total > 0) {
    const actividades = SECUENCIA_LECCIONES[rango][idx]?.actividades.length || 1;
    const actIdx = Math.max(0, Math.min(actividades, motor.actividadIdx ?? 0));
    return Math.min(100, Math.round(((idx + actIdx / actividades) / total) * 100));
  }
  const etapas = ETAPAS_POR_RANGO[rango];
  const etapaIdx = Math.max(0, etapas.indexOf(motor.etapa));
  const pasosPorEtapa = 6;
  return Math.min(100, Math.round(((etapaIdx * pasosPorEtapa + Math.min(motor.n, pasosPorEtapa)) / (etapas.length * pasosPorEtapa)) * 100));
}

