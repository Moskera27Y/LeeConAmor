// =============================================================================
// Espejo CommonJS de src/data/frasesVoz.ts + listas de entrada de los juegos.
//
// El generador (server/precache-clon.cjs) NO puede importar TypeScript, así que
// este archivo reproduce las mismas funciones y las mismas listas cerradas.
// server/test-voz.cjs comprueba, con esbuild, que ambas versiones producen
// exactamente las mismas frases (paridad TS ↔ CJS).
// =============================================================================

const VOCALES_JUEGO = 'AEIOU';

const SILABAS_JUEGO = [
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

const PALABRAS_JUEGO = [
  'MAMA', 'PAPA', 'PERA', 'SOL', 'LUNA', 'SOLAR', 'AMOR',
  'CASA', 'SAPO', 'SOPA', 'BEBE', 'TARDE', 'DADO', 'RATA', 'FARO',
  'EME', 'IMÁN', 'OMAR', 'PRADO', 'BRAZO',
];

function tipoObjetivo(objetivo) {
  const o = String(objetivo).trim();
  if (o.includes(' ')) return 'oracion';
  if (o.length <= 1) return VOCALES_JUEGO.includes(o.toUpperCase()) ? 'vocal' : 'letra';
  if (o.length === 2) return 'silaba';
  if (PALABRAS_JUEGO.includes(o.toUpperCase())) return 'palabra';
  if (/^[^AEIOUÁÉÍÓÚ]{2}[AEIOUÁÉÍÓÚ]$/i.test(o)) return 'silaba';
  return 'palabra';
}

function fraseToca(objetivo) {
  const t = tipoObjetivo(objetivo);
  const o = String(objetivo).trim().toUpperCase();
  if (t === 'vocal') return `Toca la vocal ${o}.`;
  if (t === 'letra') return `Toca la letra ${o}.`;
  if (t === 'silaba') return `Toca la sílaba ${o}.`;
  if (t === 'palabra') return `Toca la palabra ${o}.`;
  return 'Toca y escucha esta oración.';
}

function fraseSilabaInicial(palabra) {
  return `¿Cuál es la primera sílaba de ${String(palabra).trim().toUpperCase()}?`;
}

function fraseFormaSílaba(silaba) {
  return `Forma la sílaba ${String(silaba).trim().toUpperCase()}.`;
}

function fraseFormaPalabra(palabra) {
  return `Forma la palabra ${String(palabra).trim().toUpperCase()}.`;
}

function fraseInsignia(nombre) {
  return `¡Insignia nueva: ${nombre}!`;
}

function fraseImagen(nombreConArticulo) {
  const n = String(nombreConArticulo).trim();
  if (/^el\s/i.test(n)) return `Toca la imagen del ${n.slice(3)}.`;
  return `Toca la imagen de ${n}.`;
}

function recompensaEtapa(etapa) {
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

const FRASES_VOZ = {
  leerConDedo: 'Toca cada letra con el dedo.',
  leerConDedoPalabras: 'Toca cada palabra con el dedo.',
  memoria: 'Escucha los sonidos y recuérdalos.',
  trazo: 'Toca el puntito y sigue la letra con el dedo.',
  palabrasDesordenadas: 'Pon las sílabas en orden.',
  silabasTrabadas: 'Pon las letras en orden para formar la sílaba.',
};

// --- Listas de entrada de los juegos (deben coincidir con los componentes) ---
const LETRAS = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');
const VOCALES = ['A', 'E', 'I', 'O', 'U'];

const SILABAS_TRABADAS = ['PRA', 'TRA', 'BRA', 'CRA', 'GRA', 'FRA', 'DRA', 'CLA'];

const PALABRAS_DESORDENADAS = ['MAMA', 'PAPA', 'PERA', 'SOL', 'LUNA', 'CASA', 'SAPO', 'SOPA'];

const PALABRAS_ESCUCHA_Y_ELIGE = [
  'la casa', 'el sol', 'la luna', 'el perro', 'el gato', 'el papá', 'la mamá', 'la pera',
  'el elefante', 'la mariposa', 'el teléfono', 'la computadora', 'la escuela', 'el hospital',
  'la biblioteca', 'la playa',
];

const INSIGNIAS = [
  'Primera sílaba', 'Primera palabra', 'Primera oración',
  'Racha de 3 días', 'Racha de 5 días', 'Cinco aciertos', 'Diez aciertos', 'Sin errores', 'Graduado',
];

const ETAPAS = ['vocales', 'silabas', 'palabras', 'repaso'];

module.exports = {
  VOCALES_JUEGO,
  SILABAS_JUEGO,
  PALABRAS_JUEGO,
  tipoObjetivo,
  fraseToca,
  fraseSilabaInicial,
  fraseFormaSílaba,
  fraseFormaPalabra,
  fraseInsignia,
  fraseImagen,
  recompensaEtapa,
  FRASES_VOZ,
  LETRAS,
  VOCALES,
  SILABAS_TRABADAS,
  PALABRAS_DESORDENADAS,
  PALABRAS_ESCUCHA_Y_ELIGE,
  INSIGNIAS,
  ETAPAS,
};
