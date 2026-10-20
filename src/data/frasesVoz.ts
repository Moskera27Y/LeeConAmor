// =============================================================================
// TODAS las frases de juego que Léo puede decir, y cómo se construyen.
//
// Regla de oro: NINGUNA frase hablada lleva variables libres. Las que
// mencionan una letra/sílaba/palabra se construyen a partir de listas
// cerradas (abecedario, sílabas del currículo, palabras conocidas), así que
// todas se pueden pregenerar con la voz CLONADA (npm run voz:clon).
//
// Cada frase se limpia con textoHablado() antes de buscar su audio: el clon
// no pronuncia emojis.
//
// server/frases-juego.cjs es el espejo de este archivo para el generador;
// server/test-voz.cjs comprueba que ambos producen exactamente lo mismo.
// =============================================================================

export const VOCALES_JUEGO = 'AEIOU';

// Sílabas directas para armar opciones del mismo tipo (distractoras).
export const SILABAS_JUEGO = [
  'MA', 'ME', 'MI', 'MO', 'MU',
  'PA', 'PE', 'PI', 'PO', 'PU',
  'SA', 'SE', 'SI', 'SO', 'SU',
  'LA', 'LE', 'LI', 'LO', 'LU',
  'TA', 'TE', 'TI', 'TO', 'TU',
  'DA', 'DE', 'DI', 'DO', 'DU',
  'CA', 'CO', 'CU', 'RA', 'RE', 'RI', 'RO', 'RU',
  'FA', 'FE', 'FI', 'FO', 'FU',
  'NA', 'NE', 'NI', 'NO', 'NU',
];

// Palabras del juego (FormarPalabra, PalabrasDesordenadas, tarjetas y
// silaba_inicial). Se listan aquí para clasificar el objetivo al hablar.
export const PALABRAS_JUEGO = [
  'MAMA', 'PAPA', 'PERA', 'SOL', 'LUNA', 'SOLAR', 'AMOR',
  'CASA', 'SAPO', 'SOPA', 'BEBE', 'TARDE', 'DADO', 'RATA', 'FARO',
  'EME', 'IMÁN', 'OMAR', 'PRADO', 'BRAZO',
];

export type TipoObjetivo = 'vocal' | 'letra' | 'silaba' | 'palabra' | 'oracion';

/** Clasifica el objetivo de una actividad para saber cómo nombrarlo al hablar. */
export function tipoObjetivo(objetivo: string): TipoObjetivo {
  const o = String(objetivo).trim();
  if (o.includes(' ')) return 'oracion';
  if (o.length <= 1) return VOCALES_JUEGO.includes(o.toUpperCase()) ? 'vocal' : 'letra';
  if (o.length === 2) return 'silaba';
  if (PALABRAS_JUEGO.includes(o.toUpperCase())) return 'palabra';
  // Sílabas trabadas de tres letras: dos consonantes + vocal (PRA, TRA...).
  if (/^[^AEIOUÁÉÍÓÚ]{2}[AEIOUÁÉÍÓÚ]$/i.test(o)) return 'silaba';
  return 'palabra';
}

/** "Toca la vocal A." / "Toca la letra M." / "Toca la sílaba MA." / … */
export function fraseToca(objetivo: string): string {
  const t = tipoObjetivo(objetivo);
  const o = String(objetivo).trim().toUpperCase();
  if (t === 'vocal') return `Toca la vocal ${o}.`;
  if (t === 'letra') return `Toca la letra ${o}.`;
  if (t === 'silaba') return `Toca la sílaba ${o}.`;
  if (t === 'palabra') return `Toca la palabra ${o}.`;
  return 'Toca y escucha esta oración.';
}

/** "¿Cuál es la primera sílaba de MAMA?" */
export function fraseSilabaInicial(palabra: string): string {
  return `¿Cuál es la primera sílaba de ${String(palabra).trim().toUpperCase()}?`;
}

/** "Forma la sílaba PRA." */
export function fraseFormaSílaba(silaba: string): string {
  return `Forma la sílaba ${String(silaba).trim().toUpperCase()}.`;
}

/** "Forma la palabra MAMA." */
export function fraseFormaPalabra(palabra: string): string {
  return `Forma la palabra ${String(palabra).trim().toUpperCase()}.`;
}

/** "¡Insignia nueva: Primera sílaba!" */
export function fraseInsignia(nombre: string): string {
  return `¡Insignia nueva: ${nombre}!`;
}

/** Escucha y elige: "Toca la imagen de la casa." / "Toca la imagen del sol." */
export function fraseImagen(nombreConArticulo: string): string {
  const n = String(nombreConArticulo).trim();
  if (/^el\s/i.test(n)) return `Toca la imagen del ${n.slice(3)}.`;
  return `Toca la imagen de ${n}.`;
}

/** Recompensa del juego libre según la etapa del motor. */
export function recompensaEtapa(etapa: string): string {
  switch (etapa) {
    case 'vocales':
      return '¡Muy bien con las vocales!';
    case 'silabas':
      return '¡Formaste sílabas!';
    case 'palabras':
      return '¡Dominas el abecedario!';
    default:
      return '¡Qué memoria tan linda!';
  }
}

// Frases fijas de instrucción (sin variables).
export const FRASES_VOZ = {
  leerConDedo: 'Toca cada letra con el dedo.',
  leerConDedoPalabras: 'Toca cada palabra con el dedo.',
  memoria: 'Escucha los sonidos y recuérdalos.',
  trazo: 'Toca el puntito y sigue la letra con el dedo.',
  palabrasDesordenadas: 'Pon las sílabas en orden.',
  silabasTrabadas: 'Pon las letras en orden para formar la sílaba.',
} as const;
