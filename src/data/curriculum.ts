export type RangeId = '3-5' | '6-8';

import type { EstadoMotor } from './motorNiveles';

export interface Level {
  id: number;
  rango: RangeId;
  tipo: 'vocal' | 'silaba' | 'palabra' | 'oracion';
  titulo: string;
  descripcion: string;
  targetLetters: string[];
  distractores: string[]; // 3 letras incorrectas para elegir
  instruction: string;
  reward?: string;            // frase de felicitación al completar
  phonetics?: Record<string, string>; // fonética por letra
  wordsToHighlight?: string[];
  emoji: string;
  palabrasEjemplo: string[];
}

export interface ChildProfile {
  id: string;
  nombre: string;
  rango: RangeId;
  avatar: string;
  voiceEnabled: boolean;
  createdAt: number;
  etapa?: string;
  nivel?: number;
  evaluacionInicial?: any;
  leccionId?: string;
  actividadIdx?: number;
}

export function nuevoId(): string {
  return `n${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
}

export const AVATARS = ['🦁', '🐱', '🦊', '🐰', '🐼', '🐨'];

export const READING_CARDS: Record<RangeId, { objetivo: string; imagen: string; pista: string }[]> = {
  '3-5': [
    { objetivo: 'A', imagen: '🍎', pista: 'aaa como manzana' },
    { objetivo: 'E', imagen: '🐘', pista: 'eee como elefante' },
    { objetivo: 'I', imagen: '🏝️', pista: 'iii como isla' },
    { objetivo: 'O', imagen: '⚽', pista: 'ooo como oso' },
    { objetivo: 'U', imagen: '🍇', pista: 'uuu como uva' },
  ],
  '6-8': [
    { objetivo: 'MAMA', imagen: '🤱', pista: 'ma-ma, despacio ma-ma' },
    { objetivo: 'PAPA', imagen: '👨', pista: 'pa-pa, despacio pa-pa' },
    { objetivo: 'PERA', imagen: '🍐', pista: 'pe-ra, despacio pe-ra' },
    { objetivo: 'SOL', imagen: '☀️', pista: 'sol, sss-ooo-lll' },
    { objetivo: 'LUNA', imagen: '🌙', pista: 'lu-na, despacio lu-na' },
  ],
};

const PROFILE_KEY = 'leeconamor_profile';
const PERFILES_KEY = 'leeconamor_perfiles';
const ACTIVO_KEY = 'leeconamor_activo';
export const SYNC_PENDIENTE_KEY = 'lee_sync_pendiente';
export const SYNC_VERSION_KEY = 'lee_sync_version';

// Cada cambio local sube un contador. La sincronización solo limpia el
// pendiente si no hubo cambios nuevos mientras subía (evita perder avances).
export function versionSync(): number {
  try {
    return Number(localStorage.getItem(SYNC_VERSION_KEY) || 0) || 0;
  } catch {
    return 0;
  }
}

// Marca que hay cambios locales pendientes de subir a la nube.
export function marcarPendiente() {
  try {
    localStorage.setItem(SYNC_PENDIENTE_KEY, '1');
    localStorage.setItem(SYNC_VERSION_KEY, String(versionSync() + 1));
  } catch { /* noop */ }
}

// Borra los datos de los peques de ESTE dispositivo al cerrar sesión. La nube
// conserva el progreso y lo vuelve a bajar al entrar con la misma cuenta.
// La preferencia de voz (lee_muted) se mantiene.
export function limpiarDatosLocales() {
  try {
    localStorage.removeItem(PERFILES_KEY);
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(ACTIVO_KEY);
    localStorage.removeItem(SYNC_PENDIENTE_KEY);
    localStorage.removeItem(SYNC_VERSION_KEY);
    localStorage.removeItem('lee_recordar');
    const prefijos = [
      'lee_motor_', 'lee_score_', 'lee_prog_', 'lee_graduado_', 'lee_saludo_',
      'lee_nube_', 'lee_gamificacion_', 'lee_adaptabilidad_',
    ];
    const exactas = ['lee_gamificacion', 'lee_adaptabilidad'];
    const borrar: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (exactas.includes(k) || prefijos.some((p) => k.startsWith(p))) borrar.push(k);
    }
    borrar.forEach((k) => localStorage.removeItem(k));
  } catch { /* noop */ }
}

function leerLista(): ChildProfile[] {
  try {
    const raw = localStorage.getItem(PERFILES_KEY);
    const arr = raw ? (JSON.parse(raw) as ChildProfile[]) : [];
    return Array.isArray(arr) ? arr.filter((p) => p && p.nombre) : [];
  } catch {
    return [];
  }
}

function migrar(): ChildProfile[] {
  let lista = leerLista();
  if (lista.length > 0) return lista;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const viejo = JSON.parse(raw) as ChildProfile;
      if (viejo?.nombre) {
        if (!viejo.id) viejo.id = nuevoId();
        lista = [viejo];
        localStorage.setItem(PERFILES_KEY, JSON.stringify(lista));
        localStorage.setItem(ACTIVO_KEY, viejo.id);
        return lista;
      }
    }
  } catch { /* noop */ }
  return [];
}

export function loadProfiles(): ChildProfile[] {
  return migrar();
}

export function idPerfilActivo(): string {
  try {
    return localStorage.getItem(ACTIVO_KEY) || '';
  } catch {
    return '';
  }
}

export function loadProfile(): ChildProfile | null {
  const lista = migrar();
  try {
    const id = localStorage.getItem(ACTIVO_KEY);
    const p = lista.find((x) => x.id === id);
    if (p) return p;
  } catch { /* noop */ }
  return lista[0] || null;
}

export function saveProfile(p: ChildProfile) {
  if (!p.id) p.id = nuevoId();
  const lista = migrar().filter((x) => x.id !== p.id);
  lista.push(p);
  localStorage.setItem(PERFILES_KEY, JSON.stringify(lista));
  try {
    localStorage.setItem(ACTIVO_KEY, p.id);
    marcarPendiente();
  } catch { /* noop */ }
}

export function activarPerfil(id: string) {
  try {
    localStorage.setItem(ACTIVO_KEY, id);
  } catch { /* noop */ }
}

export function clearProfile() {
  localStorage.removeItem(PROFILE_KEY);
}

export function scoreKey(id: string): string {
  return `lee_score_${id}`;
}
export function saludoKey(nombre: string): string {
  return `lee_saludo_${nombre}`;
}
export function progresoKey(id: string): string {
  return `lee_prog_${id}`;
}
export function loadScore(id: string): number {
  try {
    return Number(localStorage.getItem(scoreKey(id)) || 0);
  } catch {
    return 0;
  }
}
export function saveScore(id: string, v: number) {
  try {
    localStorage.setItem(scoreKey(id), String(v));
    marcarPendiente();
  } catch { /* noop */ }
}
export function loadProgreso(id: string): { done: number; total: number } {
  try {
    const raw = localStorage.getItem(progresoKey(id));
    if (raw) {
      const p = JSON.parse(raw);
      if (typeof p.done === 'number') return { done: p.done, total: p.total || 3 };
    }
  } catch { /* noop */ }
  return { done: 0, total: 3 };
}
export function saveProgreso(id: string, done: number, total: number) {
  try {
    localStorage.setItem(progresoKey(id), JSON.stringify({ done, total }));
    marcarPendiente();
  } catch { /* noop */ }
}

export function motorKey(id: string): string {
  return `lee_motor_${id}`;
}
export function loadMotor(id: string): EstadoMotor {
  try {
    const raw = localStorage.getItem(motorKey(id));
    if (raw) {
      const m = JSON.parse(raw) as EstadoMotor;
      if (m && m.etapa && typeof m.n === 'number') {
        return { ...m, pesos: m.pesos || {}, aciertos: m.aciertos || {} };
      }
    }
  } catch { /* noop */ }
  return { etapa: 'vocales', n: 0, pesos: {}, aciertos: {} };
}
export function saveMotor(id: string, m: EstadoMotor) {
  try {
    localStorage.setItem(motorKey(id), JSON.stringify(m));
    marcarPendiente();
  } catch { /* noop */ }
}
export function graduadoKey(id: string): string {
  return `lee_graduado_${id}`;
}
export function esGraduado(id: string): boolean {
  try {
    return localStorage.getItem(graduadoKey(id)) === '1';
  } catch {
    return false;
  }
}
export function marcarGraduado(id: string) {
  try {
    localStorage.setItem(graduadoKey(id), '1');
    marcarPendiente();
  } catch { /* noop */ }
}
