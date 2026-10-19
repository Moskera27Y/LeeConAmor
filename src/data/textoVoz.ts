// =============================================================================
// Normalización del texto HABLADO.
//
// El clon no pronuncia emojis ni símbolos: se quitan para que la frase que la
// app pide en tiempo de ejecución coincida EXACTAMENTE con la clave que generó
// `npm run voz:clon`. Sin esto, textos como "¡Muy bien! 🎉" no encontraban su
// audio y sonaban con la voz del navegador (el bug de "se cambió la voz").
//
// Debe mantenerse idéntica a server/voz-texto.cjs; server/test-voz.cjs lo
// comprueba en cada test.
// =============================================================================

export const REGEX_NO_HABLADO =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{200D}\u{FE0F}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/gu;

export function textoHablado(texto: string): string {
  return String(texto)
    .replace(REGEX_NO_HABLADO, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
