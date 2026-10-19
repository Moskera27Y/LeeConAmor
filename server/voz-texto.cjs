// Espejo CommonJS de src/data/textoVoz.ts (el generador no puede importar TS).
// server/test-voz.cjs comprueba que ambas versiones dan el mismo resultado.

const REGEX_NO_HABLADO =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{200D}\u{FE0F}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/gu;

function textoHablado(texto) {
  return String(texto)
    .replace(REGEX_NO_HABLADO, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

module.exports = { REGEX_NO_HABLADO, textoHablado };
