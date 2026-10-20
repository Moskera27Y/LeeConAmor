// ============================================================
// LÓGICA DE ADAPTABILIDAD - LeeConAmor
// Ajusta la dificultad según el rendimiento del niño
// ============================================================

import { marcarPendiente } from '../data/curriculum';

export type TipoEvento = 'acierto' | 'error';

export interface EstadoAdaptabilidad {
  rachaAciertos: number;
  rachaErrores: number;
  ultimaActividad: string | null;
  tiempoSesion: number; // segundos
  ultimaFechaSesion: string | null;
  rachaDias: number;
}

const ADAPT_KEY = 'lee_adaptabilidad';
const adaptKey = (id?: string) => (id ? `lee_adaptabilidad_${id}` : ADAPT_KEY);

export function cargarAdaptabilidad(perfilId?: string): EstadoAdaptabilidad {
  try {
    const raw = localStorage.getItem(adaptKey(perfilId));
    if (raw) {
      const p = JSON.parse(raw) as EstadoAdaptabilidad;
      return {
        rachaAciertos: p.rachaAciertos ?? 0,
        rachaErrores: p.rachaErrores ?? 0,
        ultimaActividad: p.ultimaActividad ?? null,
        tiempoSesion: p.tiempoSesion ?? 0,
        ultimaFechaSesion: p.ultimaFechaSesion ?? null,
        rachaDias: p.rachaDias ?? 0,
      };
    }
    // Migración del estado global compartido al primer peque que lo use.
    if (perfilId) {
      const viejo = localStorage.getItem(ADAPT_KEY);
      if (viejo) {
        localStorage.setItem(adaptKey(perfilId), viejo);
        const p = JSON.parse(viejo) as EstadoAdaptabilidad;
        return {
          rachaAciertos: p.rachaAciertos ?? 0,
          rachaErrores: p.rachaErrores ?? 0,
          ultimaActividad: p.ultimaActividad ?? null,
          tiempoSesion: p.tiempoSesion ?? 0,
          ultimaFechaSesion: p.ultimaFechaSesion ?? null,
          rachaDias: p.rachaDias ?? 0,
        };
      }
    }
  } catch { /* noop */ }
  return {
    rachaAciertos: 0,
    rachaErrores: 0,
    ultimaActividad: null,
    tiempoSesion: 0,
    ultimaFechaSesion: null,
    rachaDias: 0,
  };
}

export function guardarAdaptabilidad(estado: EstadoAdaptabilidad, perfilId?: string) {
  try {
    localStorage.setItem(adaptKey(perfilId), JSON.stringify(estado));
    marcarPendiente();
  } catch { /* noop */ }
}

export function registrarEvento(estado: EstadoAdaptabilidad, tipo: TipoEvento, actividadId: string, perfilId?: string): EstadoAdaptabilidad {
  const hoy = new Date().toISOString().slice(0, 10);
  const siguiente = { ...estado };

  if (tipo === 'acierto') {
    siguiente.rachaAciertos += 1;
    siguiente.rachaErrores = 0;
  } else {
    siguiente.rachaErrores += 1;
    siguiente.rachaAciertos = 0;
  }

  siguiente.ultimaActividad = actividadId;

  // Actualizar racha de días
  if (siguiente.ultimaFechaSesion !== hoy) {
    const ayer = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (siguiente.ultimaFechaSesion === ayer) {
      siguiente.rachaDias += 1;
    } else if (siguiente.ultimaFechaSesion !== hoy) {
      siguiente.rachaDias = 1;
    }
    siguiente.ultimaFechaSesion = hoy;
  }

  guardarAdaptabilidad(siguiente, perfilId);
  return siguiente;
}

export function necesitaRefuerzo(estado: EstadoAdaptabilidad): boolean {
  return estado.rachaErrores >= 2;
}

export function puedeAvanzar(estado: EstadoAdaptabilidad): boolean {
  return estado.rachaAciertos >= 3;
}

export function obtenerRecomendacionAdaptativa(estado: EstadoAdaptabilidad, actividadActual: string): 'refuerzo' | 'avanzar' | 'continuar' {
  if (necesitaRefuerzo(estado)) return 'refuerzo';
  if (puedeAvanzar(estado)) return 'avanzar';
  return 'continuar';
}

export function calcularDominio(aciertos: number, errores: number): number {
  const total = aciertos + errores;
  if (total === 0) return 0;
  return Math.round((aciertos / total) * 100);
}
