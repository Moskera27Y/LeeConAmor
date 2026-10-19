// =============================================================================
// TODAS las frases que Léo puede decir.
//
// Aqui no hay texto con variables: cada frase es fija y se pregenera con la
// voz CLONADA (npm run voz:clon). Asi el niño siempre oye la misma voz buena
// y nunca caemos en una voz sintética.
//
// Cuando haya que mencionar una letra, silaba o palabra concreta, se habla en
// dos pasos con la voz de la pausa ("¡Muy bien!") y luego el termino suelto
// ("MA"), que tambien esta pregenerado.
// =============================================================================

export const FRASES_VOZ = {
  // --- juego libre de letras ---
  juegoLetrasVocales: 'Escucha a Léo y toca la vocal.',
  juegoLetrasSilabas: 'Junta las sílabas que dice Léo.',
  juegoLetrasPalabras: 'Busca las letras que pide Léo.',
  juegoLetrasRepaso: 'Repasemos juntitos las letras.',

  // --- écoute y toca (lecciones) ---
  escuchaYTocar: 'Escucha y toca la letra correcta.',

  // --- sílaba inicial ---
  silabaInicial: 'Toca la primera sílaba.',

  // --- leer con el dedo ---
  leerConDedo: 'Toca cada letra con el dedo.',

  // --- solo lectura ---
  leerVozAlta: 'Escucha primero y luego léelo tú.',

  // --- evaluar ---
  evaluacion: 'Vamos a ver qué letritas ya conoces.',

  // --- graduación ---
  examen: 'Toca la vocal correcta.',

  // --- memoria auditiva ---
  memoria: 'Escucha los sonidos y recuérdalos.',

  // --- trazo ---
  trazo: 'Toca el puntito y sigue la letra con el dedo.',

  // --- palabras desordenadas ---
  palabrasDesordenadas: 'Pon las sílabas en orden.',

  // --- sílabas trabadas ---
  silabasTrabadas: 'Pon las letras en orden para formar la sílaba.',

  // --- escucha y elige ---
  escuchaYElige: 'Escucha y toca la imagen correcta.',
} as const;

/** Frase de guía según la etapa del motor (para el juego libre de letras). */
export function fraseGuiaJuego(etapa: string): string {
  switch (etapa) {
    case 'vocales':
      return FRASES_VOZ.juegoLetrasVocales;
    case 'silabas':
      return FRASES_VOZ.juegoLetrasSilabas;
    case 'palabras':
      return FRASES_VOZ.juegoLetrasPalabras;
    default:
      return FRASES_VOZ.juegoLetrasRepaso;
  }
}