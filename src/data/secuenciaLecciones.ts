// ============================================================
// SECUENCIA DE LECCIONES - LeeConAmor
// Currículo estructurado por etapas para ambos rangos (3-5 y 6-8)
// Cada lección tiene 3-4 actividades cortas (20-60 segundos cada una)
// ============================================================

export type TipoActividad =
  | 'escuchar_tocar'
  | 'formar_silaba'
  | 'silaba_inicial'
  | 'formar_palabra'
  | 'leer_con_dedo'
  | 'leer_voz_alta'
  | 'storytime';

export interface ActividadLeccion {
  tipo: TipoActividad;
  objetivo: string;
  imagen?: string;
  pista?: string;
  letras?: string[];    // para formar_silaba: letras que forman la sílaba
  palabra?: string;     // para silaba_inicial: palabra completa
  silabas?: string[];   // para formar_palabra: sílabas que forman la palabra
  audioFijo?: string; // clave en AUDIO_FIJO si existe
  textoTTS?: string;  // texto para generar con TTS si no hay audio fijo
  repeticion?: number; // cuántas veces repetir la actividad
}

export interface Leccion {
  id: string;
  rango: '3-5' | '6-8';
  etapa: 'vocales' | 'silabas_directas' | 'silabas_inversas' | 'silabas_trabadas' | 'palabras_2_silabas' | 'palabras_3_silabas' | 'oraciones';
  orden: number;
  titulo: string;
  descripcion: string;
  actividades: ActividadLeccion[];
  audioIntro?: string; // audio de presentación de la lección
  audioCelebracion?: string; // audio al completar la lección
}

// ============================================================
// RANGO 3-5 (PRE-LECTOR)
// ============================================================

const LECCIONES_3_5: Leccion[] = [
  // ---- ETAPA: Vocales ----
  {
    id: 'l_35_vocales_a',
    rango: '3-5',
    etapa: 'vocales',
    orden: 1,
    titulo: 'Vocal A',
    descripcion: 'Aprende la vocal A con amor',
    actividades: [
      { tipo: 'escuchar_tocar', objetivo: 'A', imagen: '🍎', pista: 'aaa como manzana', audioFijo: 'A. aaa como manzana. Repite conmigo.', repeticion: 2 },
      { tipo: 'leer_con_dedo', objetivo: 'A', imagen: '🍎', pista: 'aaa como manzana', textoTTS: 'La letra A suena aaa, como en manzana', repeticion: 1 },
      { tipo: 'leer_voz_alta', objetivo: 'A', imagen: '🍎', pista: 'aaa como manzana', repeticion: 1 },
    ],
    audioIntro: '¡Hola! Vamos a aprender la vocal A. A dice aaa, como en manzana.',
    audioCelebracion: '¡Muy bien! Aprendiste la vocal A.',
  },
  {
    id: 'l_35_vocales_e',
    rango: '3-5',
    etapa: 'vocales',
    orden: 2,
    titulo: 'Vocal E',
    descripcion: 'Aprende la vocal E con amor',
    actividades: [
      { tipo: 'escuchar_tocar', objetivo: 'E', imagen: '🐘', pista: 'eee como elefante', audioFijo: 'E. eee como elefante. Repite conmigo.', repeticion: 2 },
      { tipo: 'leer_con_dedo', objetivo: 'E', imagen: '🐘', pista: 'eee como elefante', textoTTS: 'La letra E suena eee, como en elefante', repeticion: 1 },
      { tipo: 'leer_voz_alta', objetivo: 'E', imagen: '🐘', pista: 'eee como elefante', repeticion: 1 },
    ],
    audioIntro: 'Ahora la vocal E. E dice eee, como en elefante.',
    audioCelebracion: '¡Qué bien! Ya sabes la vocal E.',
  },
  {
    id: 'l_35_vocales_i',
    rango: '3-5',
    etapa: 'vocales',
    orden: 3,
    titulo: 'Vocal I',
    descripcion: 'Aprende la vocal I con amor',
    actividades: [
      { tipo: 'escuchar_tocar', objetivo: 'I', imagen: '🏝️', pista: 'iii como isla', audioFijo: 'I. iii como isla. Repite conmigo.', repeticion: 2 },
      { tipo: 'leer_con_dedo', objetivo: 'I', imagen: '🏝️', pista: 'iii como isla', textoTTS: 'La letra I suena iii, como en isla', repeticion: 1 },
      { tipo: 'leer_voz_alta', objetivo: 'I', imagen: '🏝️', pista: 'iii como isla', repeticion: 1 },
    ],
    audioIntro: 'Ahora la vocal I. I dice iii, como en isla.',
    audioCelebracion: '¡Genial! La vocal I la tienes.',
  },
  {
    id: 'l_35_vocales_o',
    rango: '3-5',
    etapa: 'vocales',
    orden: 4,
    titulo: 'Vocal O',
    descripcion: 'Aprende la vocal O con amor',
    actividades: [
      { tipo: 'escuchar_tocar', objetivo: 'O', imagen: '⚽', pista: 'ooo como oso', audioFijo: 'O. ooo como oso. Repite conmigo.', repeticion: 2 },
      { tipo: 'leer_con_dedo', objetivo: 'O', imagen: '⚽', pista: 'ooo como oso', textoTTS: 'La letra O suena ooo, como en oso', repeticion: 1 },
      { tipo: 'leer_voz_alta', objetivo: 'O', imagen: '⚽', pista: 'ooo como oso', repeticion: 1 },
    ],
    audioIntro: 'Ahora la vocal O. O dice ooo, como en oso.',
    audioCelebracion: '¡Súper! La vocal O la dominas.',
  },
  {
    id: 'l_35_vocales_u',
    rango: '3-5',
    etapa: 'vocales',
    orden: 5,
    titulo: 'Vocal U',
    descripcion: 'Aprende la vocal U con amor',
    actividades: [
      { tipo: 'escuchar_tocar', objetivo: 'U', imagen: '🍇', pista: 'uuu como uva', textoTTS: 'La letra U suena uuu, como en uva', repeticion: 2 },
      { tipo: 'leer_con_dedo', objetivo: 'U', imagen: '🍇', pista: 'uuu como uva', textoTTS: 'La letra U suena uuu, como en uva', repeticion: 1 },
      { tipo: 'leer_voz_alta', objetivo: 'U', imagen: '🍇', pista: 'uuu como uva', repeticion: 1 },
    ],
    audioIntro: 'La última vocal: la U. U dice uuu, como en uva.',
    audioCelebracion: '¡Increíble! Ya conoces las cinco vocales.',
  },

  // ---- ETAPA: Sílabas Directas ----
  {
    id: 'l_35_silabas_ma',
    rango: '3-5',
    etapa: 'silabas_directas',
    orden: 1,
    titulo: 'Sílaba MA',
    descripcion: 'Junta M y A para formar MA',
    actividades: [
      { tipo: 'escuchar_tocar', objetivo: 'MA', imagen: '👋', pista: 'mmm con aaa, MA', audioFijo: 'mmm con aaa, MA', repeticion: 2 },
      { tipo: 'formar_silaba', objetivo: 'MA', letras: ['M', 'A'], audioFijo: 'ma-ma, despacio ma-ma', repeticion: 2 },
      { tipo: 'silaba_inicial', objetivo: 'MA', palabra: 'MAMA', imagen: '🤱', textoTTS: 'MAMA empieza con MA. ¿Cuál es la primera sílaba?', repeticion: 1 },
    ],
    audioIntro: 'Vamos a formar la sílaba MA. M con A dicen MA.',
    audioCelebracion: '¡Formaste tu primera sílaba!',
  },
  {
    id: 'l_35_silabas_pa',
    rango: '3-5',
    etapa: 'silabas_directas',
    orden: 2,
    titulo: 'Sílaba PA',
    descripcion: 'Junta P y A para formar PA',
    actividades: [
      { tipo: 'escuchar_tocar', objetivo: 'PA', imagen: '👨', pista: 'pa-pa, despacio pa-pa', audioFijo: 'pa-pa, despacio pa-pa', repeticion: 2 },
      { tipo: 'formar_silaba', objetivo: 'PA', letras: ['P', 'A'], textoTTS: 'P con A dicen PA', repeticion: 2 },
      { tipo: 'silaba_inicial', objetivo: 'PA', palabra: 'PAPA', imagen: '👨', textoTTS: 'PAPA empieza con PA. ¿Cuál es la primera sílaba?', repeticion: 1 },
    ],
    audioIntro: 'Ahora la sílaba PA. P con A dicen PA.',
    audioCelebracion: '¡Qué bien! La sílaba PA la sabes.',
  },
  {
    id: 'l_35_silabas_sa',
    rango: '3-5',
    etapa: 'silabas_directas',
    orden: 3,
    titulo: 'Sílaba SA',
    descripcion: 'Junta S y A para formar SA',
    actividades: [
      { tipo: 'escuchar_tocar', objetivo: 'SA', imagen: '🐍', pista: 'sss con aaa, SA', textoTTS: 'S con A dicen SA, como en serpiente', repeticion: 2 },
      { tipo: 'formar_silaba', objetivo: 'SA', letras: ['S', 'A'], textoTTS: 'S con A dicen SA', repeticion: 2 },
      { tipo: 'leer_con_dedo', objetivo: 'SA', imagen: '🐍', pista: 'sss-ooo-lll', textoTTS: 'S-A dice SA', repeticion: 1 },
    ],
    audioIntro: 'La sílaba SA. S con A dicen SA.',
    audioCelebracion: '¡Genial! La sílaba SA la tienes.',
  },
  {
    id: 'l_35_silabas_la',
    rango: '3-5',
    etapa: 'silabas_directas',
    orden: 4,
    titulo: 'Sílaba LA',
    descripcion: 'Junta L y A para formar LA',
    actividades: [
      { tipo: 'escuchar_tocar', objetivo: 'LA', imagen: '🌙', pista: 'lll con aaa, LA', textoTTS: 'L con A dicen LA, como en luna', repeticion: 2 },
      { tipo: 'formar_silaba', objetivo: 'LA', letras: ['L', 'A'], textoTTS: 'L con A dicen LA', repeticion: 2 },
      { tipo: 'silaba_inicial', objetivo: 'LA', palabra: 'LAGO', imagen: '🏞️', textoTTS: 'LAGO empieza con LA. ¿Cuál es la primera sílaba?', repeticion: 1 },
    ],
    audioIntro: 'Ahora la sílaba LA. L con A dicen LA.',
    audioCelebracion: '¡Súper! La sílaba LA la dominas.',
  },
  {
    id: 'l_35_silabas_ta',
    rango: '3-5',
    etapa: 'silabas_directas',
    orden: 5,
    titulo: 'Sílaba TA',
    descripcion: 'Junta T y A para formar TA',
    actividades: [
      { tipo: 'escuchar_tocar', objetivo: 'TA', imagen: '🥁', pista: 'ttt con aaa, TA', textoTTS: 'T con A dicen TA, como en tambor', repeticion: 2 },
      { tipo: 'formar_silaba', objetivo: 'TA', letras: ['T', 'A'], textoTTS: 'T con A dicen TA', repeticion: 2 },
      { tipo: 'leer_con_dedo', objetivo: 'TA', imagen: '🥁', textoTTS: 'T-A dice TA', repeticion: 1 },
    ],
    audioIntro: 'La sílaba TA. T con A dicen TA.',
    audioCelebracion: '¡Muy bien! La sílaba TA la aprendiste.',
  },

  // ---- ETAPA: Palabras de 2 sílabas ----
  {
    id: 'l_35_palabras_mama',
    rango: '3-5',
    etapa: 'palabras_2_silabas',
    orden: 1,
    titulo: 'Palabra MAMA',
    descripcion: 'Lee la palabra MAMA',
    actividades: [
      { tipo: 'formar_palabra', objetivo: 'MAMA', silabas: ['MA', 'MA'], imagen: '🤱', audioFijo: 'ma-ma, despacio ma-ma', repeticion: 2 },
      { tipo: 'leer_con_dedo', objetivo: 'MAMA', imagen: '🤱', textoTTS: 'M-A-M-A dice MAMA', repeticion: 1 },
      { tipo: 'leer_voz_alta', objetivo: 'MAMA', imagen: '🤱', repeticion: 1 },
    ],
    audioIntro: 'Vamos a leer la palabra MAMA. Ma-ma, despacio ma-ma.',
    audioCelebracion: '¡Leíste tu primera palabra!',
  },
  {
    id: 'l_35_palabras_papa',
    rango: '3-5',
    etapa: 'palabras_2_silabas',
    orden: 2,
    titulo: 'Palabra PAPA',
    descripcion: 'Lee la palabra PAPA',
    actividades: [
      { tipo: 'formar_palabra', objetivo: 'PAPA', silabas: ['PA', 'PA'], imagen: '👨', audioFijo: 'pa-pa, despacio pa-pa', repeticion: 2 },
      { tipo: 'leer_con_dedo', objetivo: 'PAPA', imagen: '👨', textoTTS: 'P-A-P-A dice PAPA', repeticion: 1 },
      { tipo: 'leer_voz_alta', objetivo: 'PAPA', imagen: '👨', repeticion: 1 },
    ],
    audioIntro: 'Ahora la palabra PAPA. Pa-pa, despacio pa-pa.',
    audioCelebracion: '¡Qué bien! Leíste PAPA.',
  },
  {
    id: 'l_35_palabras_pera',
    rango: '3-5',
    etapa: 'palabras_2_silabas',
    orden: 3,
    titulo: 'Palabra PERA',
    descripcion: 'Lee la palabra PERA',
    actividades: [
      { tipo: 'formar_palabra', objetivo: 'PERA', silabas: ['PE', 'RA'], imagen: '🍐', textoTTS: 'Pe-ra, despacio pe-ra', repeticion: 2 },
      { tipo: 'leer_con_dedo', objetivo: 'PERA', imagen: '🍐', textoTTS: 'P-E-R-A dice PERA', repeticion: 1 },
      { tipo: 'leer_voz_alta', objetivo: 'PERA', imagen: '🍐', repeticion: 1 },
    ],
    audioIntro: 'La palabra PERA. Pe-ra, despacio pe-ra.',
    audioCelebracion: '¡Súper! Leíste PERA.',
  },
  {
    id: 'l_35_palabras_sol',
    rango: '3-5',
    etapa: 'palabras_2_silabas',
    orden: 4,
    titulo: 'Palabra SOL',
    descripcion: 'Lee la palabra SOL',
    actividades: [
      { tipo: 'formar_palabra', objetivo: 'SOL', silabas: ['SO', 'L'], imagen: '☀️', textoTTS: 'Sol, sss-ooo-lll', repeticion: 2 },
      { tipo: 'leer_con_dedo', objetivo: 'SOL', imagen: '☀️', textoTTS: 'S-O-L dice SOL', repeticion: 1 },
      { tipo: 'leer_voz_alta', objetivo: 'SOL', imagen: '☀️', repeticion: 1 },
    ],
    audioIntro: 'Ahora la palabra SOL. Sol, sss-ooo-lll.',
    audioCelebracion: '¡Genial! La palabra SOL la leíste.',
  },
  {
    id: 'l_35_palabras_luna',
    rango: '3-5',
    etapa: 'palabras_2_silabas',
    orden: 5,
    titulo: 'Palabra LUNA',
    descripcion: 'Lee la palabra LUNA',
    actividades: [
      { tipo: 'formar_palabra', objetivo: 'LUNA', silabas: ['LU', 'NA'], imagen: '🌙', textoTTS: 'Lu-na, despacio lu-na', repeticion: 2 },
      { tipo: 'leer_con_dedo', objetivo: 'LUNA', imagen: '🌙', textoTTS: 'L-U-N-A dice LUNA', repeticion: 1 },
      { tipo: 'leer_voz_alta', objetivo: 'LUNA', imagen: '🌙', repeticion: 1 },
    ],
    audioIntro: 'La palabra LUNA. Lu-na, despacio lu-na.',
    audioCelebracion: '¡Increíble! Ya lees palabras de verdad.',
  },
];

// ============================================================
// RANGO 6-8 (SILÁBICO)
// ============================================================

const LECCIONES_6_8: Leccion[] = [
  // ---- ETAPA: Vocales de refuerzo ----
  {
    id: 'l_68_vocales_refuerzo',
    rango: '6-8',
    etapa: 'vocales',
    orden: 1,
    titulo: 'Repaso de Vocales',
    descripcion: 'Repasa las cinco vocales A, E, I, O, U',
    actividades: [
      { tipo: 'escuchar_tocar', objetivo: 'A', imagen: '🍎', pista: 'aaa como manzana', audioFijo: 'A. aaa como manzana. Repite conmigo.', repeticion: 1 },
      { tipo: 'escuchar_tocar', objetivo: 'E', imagen: '🐘', pista: 'eee como elefante', audioFijo: 'E. eee como elefante. Repite conmigo.', repeticion: 1 },
      { tipo: 'escuchar_tocar', objetivo: 'I', imagen: '🏝️', pista: 'iii como isla', textoTTS: 'I. iii como isla', repeticion: 1 },
      { tipo: 'escuchar_tocar', objetivo: 'O', imagen: '⚽', pista: 'ooo como oso', audioFijo: 'O. ooo como oso. Repite conmigo.', repeticion: 1 },
      { tipo: 'escuchar_tocar', objetivo: 'U', imagen: '🍇', pista: 'uuu como uva', textoTTS: 'U. uuu como uva', repeticion: 1 },
    ],
    audioIntro: 'Repasemos las cinco vocales: A, E, I, O, U.',
    audioCelebracion: '¡Muy bien! Dominas las vocales.',
  },

  // ---- ETAPA: Sílabas Directas ----
  {
    id: 'l_68_silabas_ma_pa',
    rango: '6-8',
    etapa: 'silabas_directas',
    orden: 1,
    titulo: 'Sílabas MA y PA',
    descripcion: 'Reconoce y forma las sílabas MA y PA',
    actividades: [
      { tipo: 'escuchar_tocar', objetivo: 'MA', imagen: '👋', pista: 'mmm con aaa, MA', audioFijo: 'mmm con aaa, MA', repeticion: 1 },
      { tipo: 'escuchar_tocar', objetivo: 'PA', imagen: '👨', pista: 'pa-pa, despacio pa-pa', audioFijo: 'pa-pa, despacio pa-pa', repeticion: 1 },
      { tipo: 'formar_silaba', objetivo: 'MA', letras: ['M', 'A'], audioFijo: 'ma-ma, despacio ma-ma', repeticion: 1 },
      { tipo: 'formar_silaba', objetivo: 'PA', letras: ['P', 'A'], audioFijo: 'pa-pa, despacio pa-pa', repeticion: 1 },
      { tipo: 'silaba_inicial', objetivo: 'MA', palabra: 'MAMA', imagen: '🤱', textoTTS: 'MAMA empieza con MA', repeticion: 1 },
      { tipo: 'silaba_inicial', objetivo: 'PA', palabra: 'PAPA', imagen: '👨', textoTTS: 'PAPA empieza con PA', repeticion: 1 },
    ],
    audioIntro: 'Vamos con las sílabas MA y PA.',
    audioCelebracion: '¡Formaste sílabas muy bien!',
  },
  {
    id: 'l_68_silabas_sa_la',
    rango: '6-8',
    etapa: 'silabas_directas',
    orden: 2,
    titulo: 'Sílabas SA y LA',
    descripcion: 'Reconoce y forma las sílabas SA y LA',
    actividades: [
      { tipo: 'escuchar_tocar', objetivo: 'SA', imagen: '🐍', pista: 'sss con aaa, SA', textoTTS: 'S con A dicen SA', repeticion: 1 },
      { tipo: 'escuchar_tocar', objetivo: 'LA', imagen: '🌙', pista: 'lll con aaa, LA', textoTTS: 'L con A dicen LA', repeticion: 1 },
      { tipo: 'formar_silaba', objetivo: 'SA', letras: ['S', 'A'], textoTTS: 'S con A dicen SA', repeticion: 1 },
      { tipo: 'formar_silaba', objetivo: 'LA', letras: ['L', 'A'], textoTTS: 'L con A dicen LA', repeticion: 1 },
      { tipo: 'silaba_inicial', objetivo: 'SA', palabra: 'SAPO', imagen: '🐸', textoTTS: 'SAPO empieza con SA', repeticion: 1 },
      { tipo: 'silaba_inicial', objetivo: 'LA', palabra: 'LAGO', imagen: '🏞️', textoTTS: 'LAGO empieza con LA', repeticion: 1 },
    ],
    audioIntro: 'Ahora las sílabas SA y LA.',
    audioCelebracion: '¡Armaste sílabas muy bien!',
  },
  {
    id: 'l_68_silabas_ta_da',
    rango: '6-8',
    etapa: 'silabas_directas',
    orden: 3,
    titulo: 'Sílabas TA y DA',
    descripcion: 'Reconoce y forma las sílabas TA y DA',
    actividades: [
      { tipo: 'escuchar_tocar', objetivo: 'TA', imagen: '🥁', pista: 'ttt con aaa, TA', textoTTS: 'T con A dicen TA', repeticion: 1 },
      { tipo: 'escuchar_tocar', objetivo: 'DA', imagen: '🎲', pista: 'ddd con aaa, DA', textoTTS: 'D con A dicen DA', repeticion: 1 },
      { tipo: 'formar_silaba', objetivo: 'TA', letras: ['T', 'A'], textoTTS: 'T con A dicen TA', repeticion: 1 },
      { tipo: 'formar_silaba', objetivo: 'DA', letras: ['D', 'A'], textoTTS: 'D con A dicen DA', repeticion: 1 },
      { tipo: 'silaba_inicial', objetivo: 'TA', palabra: 'TARDE', imagen: '🌅', textoTTS: 'TARDE empieza con TA', repeticion: 1 },
      { tipo: 'silaba_inicial', objetivo: 'DA', palabra: 'DADO', imagen: '🎲', textoTTS: 'DADO empieza con DA', repeticion: 1 },
    ],
    audioIntro: 'Vamos con TA y DA.',
    audioCelebracion: '¡Qué bien! TA y DA las tienes.',
  },
  {
    id: 'l_68_silabas_ca_ba',
    rango: '6-8',
    etapa: 'silabas_directas',
    orden: 4,
    titulo: 'Sílabas CA y BA',
    descripcion: 'Reconoce y forma las sílabas CA y BA',
    actividades: [
      { tipo: 'escuchar_tocar', objetivo: 'CA', imagen: '🏠', pista: 'ce con aaa, CA', textoTTS: 'C con A dicen CA', repeticion: 1 },
      { tipo: 'escuchar_tocar', objetivo: 'BA', imagen: '🐻', pista: 'bbb con aaa, BA', textoTTS: 'B con A dicen BA', repeticion: 1 },
      { tipo: 'formar_silaba', objetivo: 'CA', letras: ['C', 'A'], textoTTS: 'C con A dicen CA', repeticion: 1 },
      { tipo: 'formar_silaba', objetivo: 'BA', letras: ['B', 'A'], textoTTS: 'B con A dicen BA', repeticion: 1 },
      { tipo: 'silaba_inicial', objetivo: 'CA', palabra: 'CASA', imagen: '🏠', textoTTS: 'CASA empieza con CA', repeticion: 1 },
      { tipo: 'silaba_inicial', objetivo: 'BA', palabra: 'BARCO', imagen: '⛵', textoTTS: 'BARCO empieza con BA', repeticion: 1 },
    ],
    audioIntro: 'Ahora CA y BA.',
    audioCelebracion: '¡Súper! CA y BA las dominas.',
  },
  {
    id: 'l_68_silabas_ra_fa',
    rango: '6-8',
    etapa: 'silabas_directas',
    orden: 5,
    titulo: 'Sílabas RA y FA',
    descripcion: 'Reconoce y forma las sílabas RA y FA',
    actividades: [
      { tipo: 'escuchar_tocar', objetivo: 'RA', imagen: '🐭', pista: 'rrr suave con aaa, RA', textoTTS: 'R suave con A dicen RA', repeticion: 1 },
      { tipo: 'escuchar_tocar', objetivo: 'FA', imagen: '🌸', pista: 'eff con aaa, FA', textoTTS: 'F con A dicen FA', repeticion: 1 },
      { tipo: 'formar_silaba', objetivo: 'RA', letras: ['R', 'A'], textoTTS: 'R con A dicen RA', repeticion: 1 },
      { tipo: 'formar_silaba', objetivo: 'FA', letras: ['F', 'A'], textoTTS: 'F con A dicen FA', repeticion: 1 },
      { tipo: 'silaba_inicial', objetivo: 'RA', palabra: 'RATA', imagen: '🐭', textoTTS: 'RATA empieza con RA', repeticion: 1 },
      { tipo: 'silaba_inicial', objetivo: 'FA', palabra: 'FARO', imagen: '🗼', textoTTS: 'FARO empieza con FA', repeticion: 1 },
    ],
    audioIntro: 'Vamos con RA y FA.',
    audioCelebracion: '¡Genial! RA y FA las sabes.',
  },

  // ---- ETAPA: Sílabas Inversas ----
  {
    id: 'l_68_silabas_inversas_am_em',
    rango: '6-8',
    etapa: 'silabas_inversas',
    orden: 1,
    titulo: 'Sílabas Inversas AM y EM',
    descripcion: 'Vocales antes que consonantes: AM y EM',
    actividades: [
      { tipo: 'escuchar_tocar', objetivo: 'AM', imagen: '🍯', pista: 'aaa con mmm, AM', textoTTS: 'A con M dicen AM', repeticion: 1 },
      { tipo: 'escuchar_tocar', objetivo: 'EM', imagen: '🏔️', pista: 'eee con mmm, EM', textoTTS: 'E con M dicen EM', repeticion: 1 },
      { tipo: 'formar_silaba', objetivo: 'AM', letras: ['A', 'M'], textoTTS: 'A con M dicen AM', repeticion: 1 },
      { tipo: 'formar_silaba', objetivo: 'EM', letras: ['E', 'M'], textoTTS: 'E con M dicen EM', repeticion: 1 },
      { tipo: 'silaba_inicial', objetivo: 'AM', palabra: 'AMOR', imagen: '💛', textoTTS: 'AMOR empieza con AM', repeticion: 1 },
      { tipo: 'silaba_inicial', objetivo: 'EM', palabra: 'EME', imagen: '🏔️', textoTTS: 'EME empieza con EM', repeticion: 1 },
    ],
    audioIntro: 'Ahora las sílabas inversas: AM y EM.',
    audioCelebracion: '¡Las sílabas inversas las tienes!',
  },
  {
    id: 'l_68_silabas_inversas_im_om',
    rango: '6-8',
    etapa: 'silabas_inversas',
    orden: 2,
    titulo: 'Sílabas Inversas IM y OM',
    descripcion: 'Vocales antes que consonantes: IM y OM',
    actividades: [
      { tipo: 'escuchar_tocar', objetivo: 'IM', imagen: '🏊', pista: 'iii con mmm, IM', textoTTS: 'I con M dicen IM', repeticion: 1 },
      { tipo: 'escuchar_tocar', objetivo: 'OM', imagen: '🦆', pista: 'ooo con mmm, OM', textoTTS: 'O con M dicen OM', repeticion: 1 },
      { tipo: 'formar_silaba', objetivo: 'IM', letras: ['I', 'M'], textoTTS: 'I con M dicen IM', repeticion: 1 },
      { tipo: 'formar_silaba', objetivo: 'OM', letras: ['O', 'M'], textoTTS: 'O con M dicen OM', repeticion: 1 },
      { tipo: 'silaba_inicial', objetivo: 'IM', palabra: 'IMÁN', imagen: '🧲', textoTTS: 'IMÁN empieza con IM', repeticion: 1 },
      { tipo: 'silaba_inicial', objetivo: 'OM', palabra: 'OMAR', imagen: '👦', textoTTS: 'OMAR empieza con OM', repeticion: 1 },
    ],
    audioIntro: 'Vamos con IM y OM.',
    audioCelebracion: '¡Muy bien! IM y OM las dominas.',
  },

  // ---- ETAPA: Sílabas Trabadas ----
  {
    id: 'l_68_silabas_trabadas_pra_tra',
    rango: '6-8',
    etapa: 'silabas_trabadas',
    orden: 1,
    titulo: 'Sílabas Trabadas PRA y TRA',
    descripcion: 'Dos consonantes antes de la vocal: PRA y TRA',
    actividades: [
      { tipo: 'escuchar_tocar', objetivo: 'PRA', imagen: '🌾', pista: 'ppp rrr aaa, PRA', textoTTS: 'P-R-A dicen PRA', repeticion: 1 },
      { tipo: 'escuchar_tocar', objetivo: 'TRA', imagen: '🚂', pista: 'ttt rrr aaa, TRA', textoTTS: 'T-R-A dicen TRA', repeticion: 1 },
      { tipo: 'formar_silaba', objetivo: 'PRA', letras: ['P', 'R', 'A'], textoTTS: 'P-R-A dicen PRA', repeticion: 1 },
      { tipo: 'formar_silaba', objetivo: 'TRA', letras: ['T', 'R', 'A'], textoTTS: 'T-R-A dicen TRA', repeticion: 1 },
      { tipo: 'silaba_inicial', objetivo: 'PRA', palabra: 'PRADO', imagen: '🌾', textoTTS: 'PRADO empieza con PRA', repeticion: 1 },
      { tipo: 'silaba_inicial', objetivo: 'TRA', palabra: 'TRAN', imagen: '🚂', textoTTS: 'TRAN empieza con TRA', repeticion: 1 },
    ],
    audioIntro: 'Ahora las sílabas trabadas: PRA y TRA.',
    audioCelebracion: '¡Las sílabas trabadas las dominas!',
  },
  {
    id: 'l_68_silabas_trabadas_bra_cra',
    rango: '6-8',
    etapa: 'silabas_trabadas',
    orden: 2,
    titulo: 'Sílabas Trabadas BRA y CRA',
    descripcion: 'Dos consonantes antes de la vocal: BRA y CRA',
    actividades: [
      { tipo: 'escuchar_tocar', objetivo: 'BRA', imagen: '💪', pista: 'bbb rrr aaa, BRA', textoTTS: 'B-R-A dicen BRA', repeticion: 1 },
      { tipo: 'escuchar_tocar', objetivo: 'CRA', imagen: '🦀', pista: 'ce rrr aaa, CRA', textoTTS: 'C-R-A dicen CRA', repeticion: 1 },
      { tipo: 'formar_silaba', objetivo: 'BRA', letras: ['B', 'R', 'A'], textoTTS: 'B-R-A dicen BRA', repeticion: 1 },
      { tipo: 'formar_silaba', objetivo: 'CRA', letras: ['C', 'R', 'A'], textoTTS: 'C-R-A dicen CRA', repeticion: 1 },
      { tipo: 'silaba_inicial', objetivo: 'BRA', palabra: 'BRAZO', imagen: '💪', textoTTS: 'BRAZO empieza con BRA', repeticion: 1 },
      { tipo: 'silaba_inicial', objetivo: 'CRA', palabra: 'CRAN', imagen: '🦀', textoTTS: 'CRAN empieza con CRA', repeticion: 1 },
    ],
    audioIntro: 'Vamos con BRA y CRA.',
    audioCelebracion: '¡Súper! BRA y CRA las tienes.',
  },

  // ---- ETAPA: Palabras de 2-3 sílabas ----
  {
    id: 'l_68_palabras_2_silabas',
    rango: '6-8',
    etapa: 'palabras_2_silabas',
    orden: 1,
    titulo: 'Palabras de Dos Sílabas',
    descripcion: 'Lee palabras como MAMA, PAPA, PERA, SOL',
    actividades: [
      { tipo: 'formar_palabra', objetivo: 'MAMA', silabas: ['MA', 'MA'], imagen: '🤱', audioFijo: 'ma-ma, despacio ma-ma', repeticion: 1 },
      { tipo: 'formar_palabra', objetivo: 'PAPA', silabas: ['PA', 'PA'], imagen: '👨', audioFijo: 'pa-pa, despacio pa-pa', repeticion: 1 },
      { tipo: 'formar_palabra', objetivo: 'PERA', silabas: ['PE', 'RA'], imagen: '🍐', textoTTS: 'Pe-ra, despacio pe-ra', repeticion: 1 },
      { tipo: 'formar_palabra', objetivo: 'SOL', silabas: ['SO', 'L'], imagen: '☀️', textoTTS: 'Sol, sss-ooo-lll', repeticion: 1 },
      { tipo: 'leer_con_dedo', objetivo: 'MAMA', imagen: '🤱', textoTTS: 'M-A-M-A dice MAMA', repeticion: 1 },
      { tipo: 'leer_voz_alta', objetivo: 'MAMA', imagen: '🤱', repeticion: 1 },
    ],
    audioIntro: 'Vamos a leer palabras de dos sílabas.',
    audioCelebracion: '¡Leíste palabras de verdad!',
  },
  {
    id: 'l_68_palabras_3_silabas',
    rango: '6-8',
    etapa: 'palabras_3_silabas',
    orden: 1,
    titulo: 'Palabras de Tres Sílabas',
    descripcion: 'Lee palabras como LUNA, SOLAR, AMOR',
    actividades: [
      { tipo: 'formar_palabra', objetivo: 'LUNA', silabas: ['LU', 'NA'], imagen: '🌙', textoTTS: 'Lu-na, despacio lu-na', repeticion: 1 },
      { tipo: 'formar_palabra', objetivo: 'SOLAR', silabas: ['SO', 'LAR'], imagen: '☀️', textoTTS: 'So-lar, despacio so-lar', repeticion: 1 },
      { tipo: 'formar_palabra', objetivo: 'AMOR', silabas: ['A', 'MOR'], imagen: '💛', textoTTS: 'A-mor, despacio a-mor', repeticion: 1 },
      { tipo: 'leer_con_dedo', objetivo: 'LUNA', imagen: '🌙', textoTTS: 'L-U-N-A dice LUNA', repeticion: 1 },
      { tipo: 'leer_voz_alta', objetivo: 'LUNA', imagen: '🌙', repeticion: 1 },
    ],
    audioIntro: 'Ahora palabras de tres sílabas.',
    audioCelebracion: '¡Qué bien! Lees palabras largas.',
  },

  // ---- ETAPA: Oraciones simples ----
  {
    id: 'l_68_oraciones_cortas',
    rango: '6-8',
    etapa: 'oraciones',
    orden: 1,
    titulo: 'Oraciones Simples',
    descripcion: 'Lee oraciones cortas como "El sol sale"',
    actividades: [
      { tipo: 'leer_con_dedo', objetivo: 'El sol sale', imagen: '☀️', textoTTS: 'El sol sale', repeticion: 1 },
      { tipo: 'leer_voz_alta', objetivo: 'El sol sale', imagen: '☀️', repeticion: 1 },
      { tipo: 'leer_con_dedo', objetivo: 'Mamá me ama', imagen: '💛', textoTTS: 'Mamá me ama', repeticion: 1 },
      { tipo: 'leer_voz_alta', objetivo: 'Mamá me ama', imagen: '💛', repeticion: 1 },
    ],
    audioIntro: 'Vamos a leer oraciones enteras.',
    audioCelebracion: '¡Lees oraciones completas! Eres un gran lector.',
  },
  {
    id: 'l_68_oraciones_largas',
    rango: '6-8',
    etapa: 'oraciones',
    orden: 2,
    titulo: 'Oraciones con Significado',
    descripcion: 'Lee oraciones con varias palabras',
    actividades: [
      { tipo: 'leer_con_dedo', objetivo: 'El niño juega', imagen: '👦', textoTTS: 'El niño juega', repeticion: 1 },
      { tipo: 'leer_voz_alta', objetivo: 'El niño juega', imagen: '👦', repeticion: 1 },
      { tipo: 'leer_con_dedo', objetivo: 'La luna brilla', imagen: '🌙', textoTTS: 'La luna brilla', repeticion: 1 },
      { tipo: 'leer_voz_alta', objetivo: 'La luna brilla', imagen: '🌙', repeticion: 1 },
    ],
    audioIntro: 'Ahora oraciones con más palabras.',
    audioCelebracion: '¡Increíble! Ya lees oraciones enteras.',
  },
  {
    id: 'l_68_oraciones_final',
    rango: '6-8',
    etapa: 'oraciones',
    orden: 3,
    titulo: 'Lectura Comprensiva',
    descripcion: 'Lee y entiende lo que lees',
    actividades: [
      { tipo: 'leer_con_dedo', objetivo: 'La casa es grande', imagen: '🏠', textoTTS: 'La casa es grande', repeticion: 1 },
      { tipo: 'leer_voz_alta', objetivo: 'La casa es grande', imagen: '🏠', repeticion: 1 },
      { tipo: 'storytime', objetivo: 'cuento_corto', imagen: '📚', textoTTS: 'Érase una vez una casa muy bonita...', repeticion: 1 },
    ],
    audioIntro: '¡Felicidades! Vas a leer un cuento completo.',
    audioCelebracion: '¡Felicidades! Ya sabes leer oraciones enteras. Eres un gran lector.',
  },
];

export const SECUENCIA_LECCIONES: Record<'3-5' | '6-8', Leccion[]> = {
  '3-5': LECCIONES_3_5,
  '6-8': LECCIONES_6_8,
};

export function obtenerLeccion(rango: '3-5' | '6-8', etapa: string, orden: number): Leccion | null {
  const lecciones = SECUENCIA_LECCIONES[rango];
  return lecciones.find((l) => l.etapa === etapa && l.orden === orden) || null;
}

export function obtenerSiguienteLeccion(rango: '3-5' | '6-8', etapaActual: string, ordenActual: number): Leccion | null {
  const lecciones = SECUENCIA_LECCIONES[rango];
  const idx = lecciones.findIndex((l) => l.etapa === etapaActual && l.orden === ordenActual);
  if (idx === -1 || idx >= lecciones.length - 1) return null;
  return lecciones[idx + 1];
}

export function obtenerTotalLecciones(rango: '3-5' | '6-8'): number {
  return SECUENCIA_LECCIONES[rango].length;
}

export function obtenerProgresoEtapa(rango: '3-5' | '6-8', etapa: string): { completadas: number; total: number } {
  const lecciones = SECUENCIA_LECCIONES[rango].filter((l) => l.etapa === etapa);
  return { completadas: 0, total: lecciones.length };
}
