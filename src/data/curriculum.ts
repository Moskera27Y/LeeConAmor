export type RangeId = '3-5' | '6-8';

export interface Level {
  id: number;
  titulo: string;
  descripcion: string;
  targetLetters: string[];
  instruction: string;
  wordsToHighlight: string[];
  reward: string;
  emoji: string[];
  phonetics: Record<string, string>;
  sentences?: string[];
}

export interface ChildProfile {
  id: string;
  nombre: string;
  rango: RangeId;
  avatar: string;
  voiceEnabled: boolean;
  createdAt: number;
}

export function nuevoId(): string {
  return `n${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
}

export const AVATARS = ['🦁', '🐱', '🦊', '🐰', '🐼', '🐨'];

export const CURRICULUM: Record<RangeId, Level[]> = {
  '3-5': [
    {
      id: 1,
      titulo: 'Vocales mágicas',
      descripcion: 'Escuchar y reconocer vocales',
      targetLetters: ['A', 'E', 'O'],
      instruction: 'Hola peque. Escucha a Léo y toca la vocal que escuches. Empezamos con A, E y O.',
      wordsToHighlight: ['AEO'],
      reward: '¡Escuchaste muy bien las vocales!',
      emoji: ['🍎', '🐘', '⚽'],
      phonetics: { A: 'aaa como manzana', E: 'eee como elefante', O: 'ooo como oso' },
    },
    {
      id: 2,
      titulo: 'Sonidos suaves',
      descripcion: 'M y S con vocales',
      targetLetters: ['M', 'S', 'A'],
      instruction: 'Vamos a escuchar sonidos: mmm como mamá y sss como serpiente. Toca la letra del sonido.',
      wordsToHighlight: ['MA', 'SA'],
      reward: '¡Qué oído tan lindo!',
      emoji: ['🤱', '🐍', '🍎'],
      phonetics: { M: 'mmm como mamá', S: 'sss como serpiente', A: 'aaa como manzana' },
    },
    {
      id: 3,
      titulo: 'Mi primera sílaba',
      descripcion: 'Juntar M + A = MA',
      targetLetters: ['M', 'A', 'P'],
      instruction: 'Juntamos sonidos: mmm con aaa forman MA. Busca M y A para formar MA.',
      wordsToHighlight: ['MA', 'PA'],
      reward: '¡Formaste tu primera sílaba!',
      emoji: ['🤱', '🍎', '👨'],
      phonetics: { M: 'mmm', A: 'aaa, juntos MA', P: 'ppp como papá' },
    },
  ],
  '6-8': [
    {
      id: 1,
      titulo: 'Sílabas MA PA LA',
      descripcion: 'Armar sílabas directas',
      targetLetters: ['M', 'A', 'P', 'L'],
      instruction: 'Junta las letras para formar MA, PA y LA. Escucha: mmm-aaa dice MA.',
      wordsToHighlight: ['MA', 'PA', 'LA'],
      reward: '¡Armaste sílabas muy bien!',
      emoji: ['🤱', '🍎', '👨'],
      phonetics: { M: 'mmm-aaa = MA', A: 'aaa', P: 'ppp-aaa = PA', L: 'lll-aaa = LA' },
    },
    {
      id: 2,
      titulo: 'Palabras dulces',
      descripcion: 'MAMA, PAPA, PERA',
      targetLetters: ['P', 'E', 'R', 'A'],
      instruction: 'Forma palabras que puedes leer: MAMA, PAPA y PERA. Escucha despacio: pe-eee-ra.',
      wordsToHighlight: ['MAMA', 'PAPA', 'PERA'],
      reward: '¡Leíste palabras de verdad!',
      emoji: ['🤱', '👨', '🍐'],
      phonetics: { P: 'pe', E: 'eee', R: 'rrr suave', A: 'aaa' },
      sentences: ['Mamá me ama', 'Pepa pela pera', 'Mi papá me mima'],
    },
    {
      id: 3,
      titulo: 'Leo oraciones',
      descripcion: 'Leer y comprender',
      targetLetters: ['S', 'O', 'L', 'E'],
      instruction: 'Lee la oración completita y luego dime qué entendiste. Escucha primero a Léo.',
      wordsToHighlight: ['SOL', 'LEO', 'OLES'],
      reward: '¡Lees oraciones enteras!',
      emoji: ['☀️', '📖', '❤️'],
      phonetics: { S: 'sss', O: 'ooo', L: 'lll', E: 'eee' },
      sentences: ['Leo el sol', 'El sol sale solo', 'Léo lee con amor'],
    },
  ],
};

export const READING_CARDS: Record<RangeId, { objetivo: string; imagen: string; pista: string }[]> = {
  '3-5': [
    { objetivo: 'A', imagen: '🍎', pista: 'aaa como manzana' },
    { objetivo: 'E', imagen: '🐘', pista: 'eee como elefante' },
    { objetivo: 'O', imagen: '⚽', pista: 'ooo como oso' },
    { objetivo: 'MA', imagen: '🤱', pista: 'mmm con aaa, MA' },
  ],
  '6-8': [
    { objetivo: 'MAMA', imagen: '🤱', pista: 'ma-ma, despacio ma-ma' },
    { objetivo: 'PAPA', imagen: '👨', pista: 'pa-pa, despacio pa-pa' },
    { objetivo: 'PERA', imagen: '🍐', pista: 'pe-ra, despacio pe-ra' },
    { objetivo: 'SOL', imagen: '☀️', pista: 'sol, sss-ooo-lll' },
  ],
};

const PROFILE_KEY = 'leeconamor_profile';
const PERFILES_KEY = 'leeconamor_perfiles';
const ACTIVO_KEY = 'leeconamor_activo';

function leerLista(): ChildProfile[] {
  try {
    const raw = localStorage.getItem(PERFILES_KEY);
    const arr = raw ? (JSON.parse(raw) as ChildProfile[]) : [];
    return Array.isArray(arr) ? arr.filter((p) => p && p.nombre) : [];
  } catch {
    return [];
  }
}

// Migra el perfil único viejo (Aarón) a la lista sin perderlo
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

// Puntaje y saludo por niño (turnos independientes)
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
  } catch { /* noop */ }
}

// Estado del motor infinito por niño
import type { EstadoMotor } from './motorNiveles';

export function motorKey(id: string): string {
  return `lee_motor_${id}`;
}
export function loadMotor(id: string): EstadoMotor {
  try {
    const raw = localStorage.getItem(motorKey(id));
    if (raw) {
      const m = JSON.parse(raw) as EstadoMotor;
      if (m && m.etapa && typeof m.n === 'number') {
        return { pesos: {}, aciertos: {}, ...m };
      }
    }
  } catch { /* noop */ }
  return { etapa: 'vocales', n: 0, pesos: {}, aciertos: {} };
}
export function saveMotor(id: string, m: EstadoMotor) {
  try {
    localStorage.setItem(motorKey(id), JSON.stringify(m));
    // marcar pendiente de nube (Fase 4 lo sube)
    localStorage.setItem('lee_sync_pendiente', '1');
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
    localStorage.setItem('lee_sync_pendiente', '1');
  } catch { /* noop */ }
}
