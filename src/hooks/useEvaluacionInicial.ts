import { consultarRecomendacionIA } from '../lib/openrouter';

export type RangoId = '3-5' | '6-8';

export type PreguntaEval = {
  id: string;
  rango: RangoId;
  tipo: 'vocal' | 'silaba_inicial' | 'silaba_leer' | 'palabra_leer' | 'oracion_leer';
  enunciado: string;
  opciones?: string[];
  respuestaEsperada: string;
  peso: number;
};

export const PREGUNTAS_EVAL: PreguntaEval[] = [
  // 3-5: Vocales
  { id: 'vocal_a', rango: '3-5', tipo: 'vocal', enunciado: '¿Cuál es esta vocal? A', opciones: ['A', 'E', 'I'], respuestaEsperada: 'A', peso: 1 },
  { id: 'vocal_e', rango: '3-5', tipo: 'vocal', enunciado: '¿Cuál es esta vocal? E', opciones: ['A', 'E', 'O'], respuestaEsperada: 'E', peso: 1 },
  { id: 'vocal_i', rango: '3-5', tipo: 'vocal', enunciado: '¿Cuál es esta vocal? I', opciones: ['I', 'O', 'U'], respuestaEsperada: 'I', peso: 1 },
  { id: 'vocal_o', rango: '3-5', tipo: 'vocal', enunciado: '¿Cuál es esta vocal? O', opciones: ['A', 'O', 'U'], respuestaEsperada: 'O', peso: 1 },
  { id: 'vocal_u', rango: '3-5', tipo: 'vocal', enunciado: '¿Cuál es esta vocal? U', opciones: ['E', 'I', 'U'], respuestaEsperada: 'U', peso: 1 },
  // 3-5: Sílaba inicial
  { id: 'inicial_casa', rango: '3-5', tipo: 'silaba_inicial', enunciado: 'CASA empieza con qué sonido', opciones: ['K', 'M', 'S'], respuestaEsperada: 'K', peso: 1 },
  { id: 'inicial_perro', rango: '3-5', tipo: 'silaba_inicial', enunciado: 'PERRO empieza con qué sonido', opciones: ['P', 'T', 'R'], respuestaEsperada: 'P', peso: 1 },
  { id: 'inicial_sol', rango: '3-5', tipo: 'silaba_inicial', enunciado: 'SOL empieza con qué sonido', opciones: ['S', 'L', 'N'], respuestaEsperada: 'S', peso: 1 },
  // 6-8: Sílabas
  { id: 'silaba_ma', rango: '6-8', tipo: 'silaba_leer', enunciado: 'Lee esta sílaba: MA', opciones: ['MA', 'PA', 'LA'], respuestaEsperada: 'MA', peso: 1 },
  { id: 'silaba_pa', rango: '6-8', tipo: 'silaba_leer', enunciado: 'Lee esta sílaba: PA', opciones: ['PA', 'TA', 'SA'], respuestaEsperada: 'PA', peso: 1 },
  { id: 'silaba_la', rango: '6-8', tipo: 'silaba_leer', enunciado: 'Lee esta sílaba: LA', opciones: ['LA', 'RA', 'NA'], respuestaEsperada: 'LA', peso: 1 },
  { id: 'silaba_sa', rango: '6-8', tipo: 'silaba_leer', enunciado: 'Lee esta sílaba: SA', opciones: ['SA', 'CA', 'FA'], respuestaEsperada: 'SA', peso: 1 },
  // 6-8: Palabras
  { id: 'palabra_mama', rango: '6-8', tipo: 'palabra_leer', enunciado: 'Lee esta palabra: MAMA', opciones: ['MAMA', 'PAPA', 'LAVA'], respuestaEsperada: 'MAMA', peso: 2 },
  { id: 'palabra_papa', rango: '6-8', tipo: 'palabra_leer', enunciado: 'Lee esta palabra: PAPA', opciones: ['PAPA', 'MAMA', 'TANA'], respuestaEsperada: 'PAPA', peso: 2 },
  { id: 'palabra_p era', rango: '6-8', tipo: 'palabra_leer', enunciado: 'Lee esta palabra: PERA', opciones: ['PERA', 'PAPA', 'PERRO'], respuestaEsperada: 'PERA', peso: 2 },
  // 6-8: Oración corta
  { id: 'oracion_corta', rango: '6-8', tipo: 'oracion_leer', enunciado: 'Lee esta oración: El sol brilla', opciones: ['El sol brilla', 'El sol mira', 'La luna brilla'], respuestaEsperada: 'El sol brilla', peso: 3 },
];

export type ResultadoEval = {
  rango: RangoId;
  puntaje: number;
  total: number;
  nivelRecomendado: number;
  etapaRecomendada: string;
  observaciones: string[];
};

function normalizar(s: string): string {
  return (s || '').toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
}

export function evaluarRespuestas(respuestas: Record<string, string>, rango: RangoId): ResultadoEval {
  const misPreguntas = PREGUNTAS_EVAL.filter((p) => p.rango === rango);
  let puntaje = 0;
  let total = 0;
  const observaciones: string[] = [];

  for (const p of misPreguntas) {
    total += p.peso;
    const dada = normalizar(respuestas[p.id]);
    const esperada = normalizar(p.respuestaEsperada);
    if (dada === esperada || dada.includes(esperada) || esperada.includes(dada)) {
      puntaje += p.peso;
    } else {
      observaciones.push(`Refuerzo: ${p.enunciado}`);
    }
  }

  const pct = total === 0 ? 0 : Math.round((puntaje / total) * 100);

  let nivelRecomendado = 0;
  let etapaRecomendada = 'vocales';

  if (rango === '3-5') {
    if (pct >= 80) { nivelRecomendado = 2; etapaRecomendada = 'silabas_directas'; }
    else if (pct >= 50) { nivelRecomendado = 1; etapaRecomendada = 'vocales'; }
    else { nivelRecomendado = 0; etapaRecomendada = 'vocales'; observaciones.push('Comenzar con reconocimiento de vocales A, E, I, O, U'); }
  } else {
    if (pct >= 80) { nivelRecomendado = 3; etapaRecomendada = 'palabras_2_silabas'; }
    else if (pct >= 50) { nivelRecomendado = 1; etapaRecomendada = 'silabas_directas'; }
    else { nivelRecomendado = 0; etapaRecomendada = 'vocales'; observaciones.push('Refuerzo de vocales y sílabas simples MA, PA, LA'); }
  }

  return { rango, puntaje, total, nivelRecomendado, etapaRecomendada, observaciones };
}

export async function recomendarNivelConIA(respuestas: Record<string, string>, rango: RangoId, nombre: string): Promise<ResultadoEval> {
  const local = evaluarRespuestas(respuestas, rango);
  try {
    const resumen = respuestas
      ? Object.entries(respuestas).map(([k, v]) => `- ${k}: ${v}`).join('\n')
      : '(sin respuestas)';
    const resumenLocal = `Resultado local: puntaje ${local.puntaje}/${local.total}, etapa sugerida: ${local.etapaRecomendada}, nivel: ${local.nivelRecomendado}.`;
    const ia = await consultarRecomendacionIA(respuestas, rango, nombre, `${resumen}\n${resumenLocal}`);
    if (!ia) return local;
    return {
      ...local,
      nivelRecomendado: typeof ia.nivelRecomendado === 'number' ? ia.nivelRecomendado : local.nivelRecomendado,
      etapaRecomendada: typeof ia.etapaRecomendada === 'string' && ia.etapaRecomendada ? ia.etapaRecomendada : local.etapaRecomendada,
      observaciones: Array.isArray(ia.observaciones) && ia.observaciones.length > 0 ? ia.observaciones : local.observaciones,
    };
  } catch {
    return local;
  }
}
