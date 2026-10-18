export type RangeId = '3-5' | '6-8';

export interface Level {
  id: number;
  rango: RangeId;
  tipo: 'vocal' | 'silaba' | 'palabra' | 'oracion';
  titulo: string;
  descripcion: string;
  targetLetters: string[];
  distractores: string[]; // 3 letras incorrectas para elegir
  instruction: string;
  audioInstruccion: string; // archivo de audio
  audioObjetivo: string;    // archivo de audio de la letra objetivo
  audioFonetica: string;    // archivo de audio del sonido fonético
  audioCorrecto: string;    // audio de felicitación
  audioError: string;       // audio de corrección
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
}

export function nuevoId(): string {
  return `n${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
}

export const AVATARS = ['🦁', '🐱', '🦊', '🐰', '🐼', '🐨'];

// ============================================================
// GENERADOR AUTOMÁTICO DE NIVELES
// ============================================================

const VOCES_VOCALES = ['A', 'E', 'I', 'O', 'U'];
const CONSONANTES = ['M', 'P', 'S', 'L', 'T', 'N', 'R', 'D', 'C', 'B', 'F', 'G', 'H', 'J', 'K', 'Ñ', 'Q', 'V', 'W', 'X', 'Y', 'Z'];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function elegirDistractores(letra: string, todos: string[]): string[] {
  const otros = todos.filter(l => l !== letra);
  return shuffle(otros).slice(0, 3);
}

function audioLetra(letra: string): string {
  return `letra_${letra}.wav`;
}

function audioFonetica(letra: string): string {
  return `fonetica_${letra}.wav`;
}

function generarNiveles3_5(): Level[] {
  const niveles: Level[] = [];
  let id = 1;

  // Fase 1: Vocales individuales (niveles 1-10)
  for (const vocal of VOCES_VOCALES) {
    for (let rep = 0; rep < 2; rep++) {
      niveles.push({
        id: id++,
        rango: '3-5',
        tipo: 'vocal',
        titulo: `Vocal ${vocal}`,
        descripcion: `Reconocer la vocal ${vocal}`,
        targetLetters: [vocal],
        distractores: elegirDistractores(vocal, VOCES_VOCALES),
        instruction: `Toca la letra ${vocal}`,
        audioInstruccion: `toca_letra.wav`, // se generará
        audioObjetivo: `letra_${vocal}.wav`,
        audioFonetica: `fonetica_${vocal}.wav`,
        audioCorrecto: `felicitacion.wav`,
        audioError: `casi.wav`,
        emoji: ['🍎', '🐘', '🐨', '🦁', '🐨'][Math.floor(Math.random() * 5)],
        palabrasEjemplo: [],
      });
    }
  }

  // Fase 2: Consonantes con vocales (niveles 11-30)
  for (const cons of CONSONANTES.slice(0, 10)) {
    for (const vocal of VOCES_VOCALES.slice(0, 3)) {
      const silaba = cons + vocal;
      niveles.push({
        id: id++,
        rango: '3-5',
        tipo: 'silaba',
        titulo: `Sílaba ${silaba}`,
        descripcion: `Reconocer la sílaba ${silaba}`,
        targetLetters: [cons, vocal],
        distractores: elegirDistractores(cons, CONSONANTES),
        instruction: `Toca la letra ${cons}`,
        audioInstruccion: `toca_letra.wav`,
        audioObjetivo: `letra_${cons}.wav`,
        audioFonetica: `fonetica_${cons}.wav`,
        audioCorrecto: `felicitacion.wav`,
        audioError: `casi.wav`,
        emoji: ['🍎', '🐘', '🐨', '🦁', '🐨'][Math.floor(Math.random() * 5)],
        palabrasEjemplo: [],
      });
    }
  }

  // Fase 3: Sílabas directas (niveles 31-50)
  const silabasDirectas = ['MA', 'PA', 'SA', 'LA', 'TA', 'NA', 'RA', 'DA', 'CA', 'BA', 'FA', 'GA', 'HA', 'JA', 'KA', 'ÑA', 'QA', 'VA', 'WA', 'XA', 'YA', 'ZA'];
  for (const silaba of silabasDirectas.slice(0, 20)) {
    const cons = silaba[0];
    const vocal = silaba[1];
    niveles.push({
      id: id++,
      rango: '3-5',
      tipo: 'silaba',
      titulo: `Sílaba ${silaba}`,
      descripcion: `Reconocer la sílaba ${silaba}`,
      targetLetters: [cons, vocal],
      distractores: elegirDistractores(cons, CONSONANTES),
      instruction: `Toca la letra ${cons}`,
      audioInstruccion: `toca_letra.wav`,
      audioObjetivo: `letra_${cons}.wav`,
      audioFonetica: `fonetica_${cons}.wav`,
      audioCorrecto: `felicitacion.wav`,
      audioError: `casi.wav`,
      emoji: ['🍎', '🐘', '🐨', '🦁', '🐨'][Math.floor(Math.random() * 5)],
      palabrasEjemplo: [],
    });
  }

  return niveles;
}

function generarNiveles6_8(): Level[] {
  const niveles: Level[] = [];
  let id = 1;

  // Fase 1: Sílabas directas (niveles 1-10)
  const silabasDirectas = ['MA', 'PA', 'SA', 'LA', 'TA', 'NA', 'RA', 'DA', 'CA', 'BA'];
  for (const silaba of silabasDirectas) {
    const cons = silaba[0];
    const vocal = silaba[1];
    niveles.push({
      id: id++,
      rango: '6-8',
      tipo: 'silaba',
      titulo: `Sílaba ${silaba}`,
      descripcion: `Reconocer la sílaba ${silaba}`,
      targetLetters: [cons, vocal],
      distractores: elegirDistractores(cons, CONSONANTES),
      instruction: `Toca la letra ${cons}`,
      audioInstruccion: `toca_letra.wav`,
      audioObjetivo: `letra_${cons}.wav`,
      audioFonetica: `fonetica_${cons}.wav`,
      audioCorrecto: `felicitacion.wav`,
      audioError: `casi.wav`,
      emoji: ['🍎', '🐘', '🐨', '🦁', '🐨'][Math.floor(Math.random() * 5)],
      palabrasEjemplo: [],
    });
  }

  // Fase 2: Sílabas trabadas (niveles 11-30)
  const silabasTrabadas = ['PRA', 'TRA', 'FRA', 'CLA', 'GRA', 'DRA', 'BRA', 'CRA', 'FRA', 'GLA', 'PLA', 'TRA'];
  for (const silaba of silabasTrabadas.slice(0, 20)) {
    const cons1 = silaba[0];
    const cons2 = silaba[1];
    const vocal = silaba[2];
    niveles.push({
      id: id++,
      rango: '6-8',
      tipo: 'silaba',
      titulo: `Sílaba ${silaba}`,
      descripcion: `Reconocer la sílaba ${silaba}`,
      targetLetters: [cons1, cons2, vocal],
      distractores: elegirDistractores(cons1, CONSONANTES),
      instruction: `Toca la letra ${cons1}`,
      audioInstruccion: `toca_letra.wav`,
      audioObjetivo: `letra_${cons1}.wav`,
      audioFonetica: `fonetica_${cons1}.wav`,
      audioCorrecto: `felicitacion.wav`,
      audioError: `casi.wav`,
      emoji: ['🍎', '🐘', '🐨', '🦁', '🐨'][Math.floor(Math.random() * 5)],
      palabrasEjemplo: [],
    });
  }

  // Fase 3: Palabras de 2 sílabas (niveles 31-50)
  const palabras2 = ['MAMA', 'PAPA', 'PERA', 'SOL', 'LUNA', 'MAR', 'MARIPOSA', 'ELEFANTE', 'CANA', 'CASA'];
  for (const palabra of palabras2.slice(0, 20)) {
    const letraInicial = palabra[0];
    niveles.push({
      id: id++,
      rango: '6-8',
      tipo: 'palabra',
      titulo: `Palabra ${palabra}`,
      descripcion: `Reconocer la palabra ${palabra}`,
      targetLetters: [letraInicial],
      distractores: elegirDistractores(letraInicial, CONSONANTES),
      instruction: `¿Con qué empieza ${palabra}?`,
      audioInstruccion: `busca_letra.wav`,
      audioObjetivo: `letra_${letraInicial}.wav`,
      audioFonetica: `fonetica_${letraInicial}.wav`,
      audioCorrecto: `felicitacion.wav`,
      audioError: `casi.wav`,
      emoji: ['🍎', '🐘', '🐨', '🦁', '🐨'][Math.floor(Math.random() * 5)],
      palabrasEjemplo: [palabra],
    });
  }

  // Fase 4: Palabras de 3+ sílabas (niveles 51-80)
  const palabras3 = ['ELEFANTE', 'MARIPOSA', 'TELEFONO', 'COMPUTADORA', 'ESCUELA', 'CASA', 'PERRO', 'GATO', 'PAPA', 'MAMA'];
  for (const palabra of palabras3.slice(0, 30)) {
    const letraInicial = palabra[0];
    niveles.push({
      id: id++,
      rango: '6-8',
      tipo: 'palabra',
      titulo: `Palabra ${palabra}`,
      descripcion: `Reconocer la palabra ${palabra}`,
      targetLetters: [letraInicial],
      distractores: elegirDistractores(letraInicial, CONSONANTES),
      instruction: `¿Con qué empieza ${palabra}?`,
      audioInstruccion: `busca_letra.wav`,
      audioObjetivo: `letra_${letraInicial}.wav`,
      audioFonetica: `fonetica_${letraInicial}.wav`,
      audioCorrecto: `felicitacion.wav`,
      audioError: `casi.wav`,
      emoji: ['🍎', '🐘', '🐨', '🦁', '🐨'][Math.floor(Math.random() * 5)],
      palabrasEjemplo: [palabra],
    });
  }

  // Fase 5: Oraciones simples (niveles 81-100)
  const oraciones = [
    'Mamá me ama', 'El sol sale', 'El perro corre', 'La luna brilla', 'El niño juega',
    'La casa es grande', 'El agua fría', 'El pan caliente', 'La flor roja', 'El pájaro canta'
  ];
  for (let i = 0; i < 20; i++) {
    const oracion = oraciones[i % oraciones.length];
    const letraInicial = oracion[0].toUpperCase();
    niveles.push({
      id: id++,
      rango: '6-8',
      tipo: 'oracion',
      titulo: `Oración ${i + 1}`,
      descripcion: `Leer: ${oracion}`,
      targetLetters: [letraInicial],
      distractores: elegirDistractores(letraInicial, CONSONANTES),
      instruction: `¿Con qué empieza "${oracion}"?`,
      audioInstruccion: `busca_letra.wav`,
      audioObjetivo: `letra_${letraInicial}.wav`,
      audioFonetica: `fonetica_${letraInicial}.wav`,
      audioCorrecto: `felicitacion.wav`,
      audioError: `casi.wav`,
      emoji: ['🍎', '🐘', '🐨', '🦁', '🐨'][Math.floor(Math.random() * 5)],
      palabrasEjemplo: [oracion],
    });
  }

  return niveles;
}

export const CURRICULUM: Record<RangeId, Level[]> = {
  '3-5': generarNiveles3_5(),
  '6-8': generarNiveles6_8(),
};

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
