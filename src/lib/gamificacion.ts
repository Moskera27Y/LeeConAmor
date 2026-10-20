// ============================================================
// GAMIFICACIÓN - LeeConAmor
// Insignias, recompensas y progreso visual
// ============================================================

import { marcarPendiente } from '../data/curriculum';

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
const gamifKey = (id?: string) => (id ? `lee_gamificacion_${id}` : GAMIF_KEY);

export const TODAS_LAS_INSIGNIAS: Insignia[] = [
  {
    id: 'primera_silaba',
    nombre: 'Primera sílaba',
    descripcion: 'Formaste tu primera sílaba',
    emoji: '🧱',
    // Se otorga al completar una actividad de sílabas (ver otorgarInsignia).
    condicion: () => false,
  },
  {
    id: 'primera_palabra',
    nombre: 'Primera palabra',
    descripcion: 'Leíste tu primera palabra',
    emoji: '📖',
    condicion: () => false,
  },
  {
    id: 'primera_oracion',
    nombre: 'Primera oración',
    descripcion: 'Leíste tu primera oración',
    emoji: '📚',
    condicion: () => false,
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
    id: 'sin_errores',
    nombre: 'Sin errores',
    descripcion: 'Conseguiste 10 aciertos sin ningún fallo',
    emoji: '💎',
    condicion: (e) => e.aciertosTotales >= 10 && e.erroresTotales === 0,
  },
  {
    id: 'graduado',
    nombre: 'Graduado',
    descripcion: 'Completaste todo el currículo',
    emoji: '🎓',
    condicion: (e) => e.graduado,
  },
];

function estadoVacio(): EstadoGamificacion {
  return {
    insignias: [],
    aciertosTotales: 0,
    erroresTotales: 0,
    rachaDias: 0,
    nivelAlcanzado: 0,
    graduado: false,
  };
}

export function cargarGamificacion(perfilId?: string): EstadoGamificacion {
  try {
    const raw = localStorage.getItem(gamifKey(perfilId));
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
    // Migración: la primera vez que se usa el almacén por niño, hereda el
    // estado global anterior (que era compartido entre todos los peques).
    if (perfilId) {
      const viejo = localStorage.getItem(GAMIF_KEY);
      if (viejo) {
        localStorage.setItem(gamifKey(perfilId), viejo);
        const p = JSON.parse(viejo) as EstadoGamificacion;
        return {
          insignias: p.insignias ?? [],
          aciertosTotales: p.aciertosTotales ?? 0,
          erroresTotales: p.erroresTotales ?? 0,
          rachaDias: p.rachaDias ?? 0,
          nivelAlcanzado: p.nivelAlcanzado ?? 0,
          graduado: p.graduado ?? false,
        };
      }
    }
  } catch { /* noop */ }
  return estadoVacio();
}

export function guardarGamificacion(estado: EstadoGamificacion, perfilId?: string) {
  try {
    localStorage.setItem(gamifKey(perfilId), JSON.stringify(estado));
    marcarPendiente();
  } catch { /* noop */ }
}

export function otorgarInsignia(
  estado: EstadoGamificacion,
  insigniaId: InsigniaId,
  perfilId?: string,
): { siguiente: EstadoGamificacion; nuevasInsignias: Insignia[] } {
  if (estado.insignias.includes(insigniaId)) {
    return { siguiente: estado, nuevasInsignias: [] };
  }
  const insignia = TODAS_LAS_INSIGNIAS.find((i) => i.id === insigniaId);
  if (!insignia) return { siguiente: estado, nuevasInsignias: [] };
  const siguiente: EstadoGamificacion = {
    ...estado,
    insignias: [...new Set([...estado.insignias, insigniaId])],
  };
  guardarGamificacion(siguiente, perfilId);
  return { siguiente, nuevasInsignias: [insignia] };
}

export function actualizarGamificacion(
  estado: EstadoGamificacion,
  params: { aciertos?: number; errores?: number; rachaDias?: number; nivelAlcanzado?: number; graduado?: boolean },
  perfilId?: string,
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

  guardarGamificacion(siguiente, perfilId);
  return { siguiente, nuevasInsignias };
}

export function obtenerInsigniasDesbloqueadas(estado: EstadoGamificacion): Insignia[] {
  return TODAS_LAS_INSIGNIAS.filter((ins) => estado.insignias.includes(ins.id));
}
