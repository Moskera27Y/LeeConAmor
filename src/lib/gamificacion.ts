// ============================================================
// GAMIFICACIÓN - LeeConAmor
// Insignias, recompensas y progreso visual
// ============================================================

export type InsigniaId =
  | 'primera_silaba'
  | 'primera_palabra'
  | 'primera_oracion'
  | 'racha_3_dias'
  | 'racha_5_dias'
  | 'cinco_aciertos'
  | 'diez_aciertos'
  | 'sin_errores'
  | 'graduado';

export interface Insignia {
  id: InsigniaId;
  nombre: string;
  descripcion: string;
  emoji: string;
  condicion: (estado: EstadoGamificacion) => boolean;
}

export interface EstadoGamificacion {
  insignias: InsigniaId[];
  aciertosTotales: number;
  erroresTotales: number;
  rachaDias: number;
  nivelAlcanzado: number;
  graduado: boolean;
}

const GAMIF_KEY = 'lee_gamificacion';

export const TODAS_LAS_INSIGNIAS: Insignia[] = [
  {
    id: 'primera_silaba',
    nombre: 'Primera sílaba',
    descripcion: 'Formaste tu primera sílaba',
    emoji: '🧱',
    condicion: (e) => e.nivelAlcanzado >= 1,
  },
  {
    id: 'primera_palabra',
    nombre: 'Primera palabra',
    descripcion: 'Leíste tu primera palabra',
    emoji: '📖',
    condicion: (e) => e.nivelAlcanzado >= 3,
  },
  {
    id: 'primera_oracion',
    nombre: 'Primera oración',
    descripcion: 'Leíste tu primera oración',
    emoji: '📚',
    condicion: (e) => e.nivelAlcanzado >= 6,
  },
  {
    id: 'racha_3_dias',
    nombre: 'Racha de 3 días',
    descripcion: 'Jugaste 3 días seguidos',
    emoji: '🔥',
    condicion: (e) => e.rachaDias >= 3,
  },
  {
    id: 'racha_5_dias',
    nombre: 'Racha de 5 días',
    descripcion: 'Jugaste 5 días seguidos',
    emoji: '🔥🔥',
    condicion: (e) => e.rachaDias >= 5,
  },
  {
    id: 'cinco_aciertos',
    nombre: 'Cinco aciertos',
    descripcion: 'Conseguiste 5 aciertos en total',
    emoji: '⭐',
    condicion: (e) => e.aciertosTotales >= 5,
  },
  {
    id: 'diez_aciertos',
    nombre: 'Diez aciertos',
    descripcion: 'Conseguiste 10 aciertos en total',
    emoji: '⭐⭐',
    condicion: (e) => e.aciertosTotales >= 10,
  },
  {
    id: 'graduado',
    nombre: 'Graduado',
    descripcion: 'Completaste todo el currículo',
    emoji: '🎓',
    condicion: (e) => e.graduado,
  },
];

export function cargarGamificacion(): EstadoGamificacion {
  try {
    const raw = localStorage.getItem(GAMIF_KEY);
    if (raw) {
      const p = JSON.parse(raw) as EstadoGamificacion;
      return {
        insignias: p.insignias ?? [],
        aciertosTotales: p.aciertosTotales ?? 0,
        erroresTotales: p.erroresTotales ?? 0,
        rachaDias: p.rachaDias ?? 0,
        nivelAlcanzado: p.nivelAlcanzado ?? 0,
        graduado: p.graduado ?? false,
      };
    }
  } catch { /* noop */ }
  return {
    insignias: [],
    aciertosTotales: 0,
    erroresTotales: 0,
    rachaDias: 0,
    nivelAlcanzado: 0,
    graduado: false,
  };
}

export function guardarGamificacion(estado: EstadoGamificacion) {
  try {
    localStorage.setItem(GAMIF_KEY, JSON.stringify(estado));
  } catch { /* noop */ }
}

export function actualizarGamificacion(
  estado: EstadoGamificacion,
  params: { aciertos?: number; errores?: number; rachaDias?: number; nivelAlcanzado?: number; graduado?: boolean },
): { siguiente: EstadoGamificacion; nuevasInsignias: Insignia[] } {
  const siguiente = { ...estado };
  if (params.aciertos !== undefined) siguiente.aciertosTotales += params.aciertos;
  if (params.errores !== undefined) siguiente.erroresTotales += params.errores;
  if (params.rachaDias !== undefined) siguiente.rachaDias = params.rachaDias;
  if (params.nivelAlcanzado !== undefined) siguiente.nivelAlcanzado = params.nivelAlcanzado;
  if (params.graduado !== undefined) siguiente.graduado = params.graduado;

  const nuevasInsignias = TODAS_LAS_INSIGNIAS.filter(
    (ins) => !siguiente.insignias.includes(ins.id) && ins.condicion(siguiente),
  );
  siguiente.insignias = [...new Set([...siguiente.insignias, ...nuevasInsignias.map((i) => i.id)])];

  guardarGamificacion(siguiente);
  return { siguiente, nuevasInsignias };
}

export function obtenerInsigniasDesbloqueadas(estado: EstadoGamificacion): Insignia[] {
  return TODAS_LAS_INSIGNIAS.filter((ins) => estado.insignias.includes(ins.id));
}
