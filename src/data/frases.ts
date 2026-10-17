// Frases CANÓNICAS que Léo HABLA (sin nombres ni datos variables).
// Todas deben existir en src/data/audioFijo.ts para pregenerarse.
// Lo variable (nombre, letra elegida, lo oído) solo se MUESTRA en pantalla.

export const F_ERROR_CASI = '¡Casi! Prueba otra vez con amor ❤️';
export const F_ESCUCHA_LEE = 'Te escucho. Lee en voz alta.';
export const F_BIEN_LECTURA = '¡Qué lindo leíste! 🌟';
export const F_NO_ESCUCHE = 'No te oí bien. Probemos otra vez con amor.';
export const F_BUEN_ESFUERZO = '¡Buen esfuerzo! Vamos juntitos despacio.';
export const F_BUEN_INTENTO = '¡Buen intento! Una vez más.';
export const F_FELICIDADES_FIN = '¡Felicidades! Terminaste todo. Ahora lees por tu cuenta. 🎉';
export const F_NIVEL_OK = '¡Nivel completado!';
export const F_ETAPA_SUPERADA = '¡Increíble! Subiste de etapa. Vamos por más. 🎉';
export const F_GRADUACION = '¡Felicidades! Ya sabes las vocales y el abecedario. Eres un gran lector. 🎓';

export const REINTENTOS_LECTURA = [F_BUEN_INTENTO, F_BUEN_ESFUERZO, F_NO_ESCUCHE];

// Combo exacto hablado en Solo lectura: `${objetivo}. ${pista}. Repite conmigo.`
export function comboLectura(objetivo: string, pista: string): string {
  return `${objetivo}. ${pista}. Repite conmigo.`;
}

// Saludo con nombre: se genera UNA vez por niño y queda guardado para siempre.
export function saludoNombre(nombre: string): string {
  return `¡Hola, ${nombre}! Vamos a leer juntitos.`;
}

// Feedback con nombre (se genera vía TTS con el clon de Léo)
export function felicitarNombre(nombre: string, objetivo: string): string {
  return `¡Muy bien, ${nombre}! Dijiste ${objetivo} clarito. 🌟`;
}

export function corregirNombre(nombre: string, pista: string): string {
  return `Casi, ${nombre}, vamos juntitos, despacio: ${pista}.`;
}

export function animarNombre(nombre: string): string {
  return `Tú puedes, ${nombre}. Escucha otra vez e inténtalo.`;
}

// Ejemplo de guía para lectura (para hablarSecuencia)
export function ejemploGuia(objetivo: string, pista: string): string[] {
  return ['Escucha con atención.', `${objetivo}. ${pista}.`, 'Ahora tú. Léelo en voz alta.'];
}

// Saludo con nombre: se genera UNA vez por niño y queda guardado para siempre.
export async function asegurarVozNombre(nombre: string): Promise<void> {
  const key = `lee_saludo_${nombre}`;
  try {
    if (localStorage.getItem(key) === '1') return;
  } catch { /* noop */ }
  try {
    const r = await fetch('/api/voz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto: saludoNombre(nombre), voz: 'Callirrhoe' }),
    });
    if (r.ok) {
      try {
        localStorage.setItem(key, '1');
      } catch { /* noop */ }
    }
  } catch { /* noop */ }
}

// Frases que necesitan audio pregrabado (sin variables)
export const FRASES_FIJAS = [
  'Hola, soy Léo. Vamos a leer juntitos.',
  'Hola peque. Escucha a Léo y toca la vocal que escuches. Empezamos con A, E y O.',
  'Vamos a escuchar sonidos: mmm como mamá y sss como serpiente. Toca la letra del sonido.',
  'Juntamos sonidos: mmm con aaa forman MA. Busca M y A para formar MA.',
  'Junta las letras para formar MA, PA y LA. Escucha: mmm-aaa dice MA.',
  'Forma palabras que puedes leer: MAMA, PAPA y PERA. Escucha despacio: pe-eee-ra.',
  'Lee la oración completita y luego dime qué entendiste. Escucha primero a Léo.',
  '¡Escuchaste muy bien las vocales!',
  '¡Qué oído tan lindo!',
  '¡Formaste tu primera sílaba!',
  '¡Armaste sílabas muy bien!',
  '¡Leíste palabras de verdad!',
  '¡Lees oraciones enteras!',
  '¡Muy bien!',
  '¡Genial!',
  '¡Súper!',
  '¡Hermoso!',
  '¡Casi! Prueba otra vez con amor ❤️',
  'Te escucho. Lee en voz alta.',
  '¡Qué lindo leíste! 🌟',
  'No te oí bien. Probemos otra vez con amor.',
  '¡Buen esfuerzo! Vamos juntitos despacio.',
  '¡Buen intento! Una vez más.',
  '¡Felicidades! Terminaste todo. Ahora lees por tu cuenta. 🎉',
  '¡Nivel completado!',
  '¡Increíble! Subiste de etapa. Vamos por más. 🎉',
  '¡Felicidades! Ya sabes las vocales y el abecedario. Eres un gran lector. 🎓',
  'A. aaa como manzana. Repite conmigo.',
  'E. eee como elefante. Repite conmigo.',
  'O. ooo como oso. Repite conmigo.',
  'MA. mmm con aaa, MA. Repite conmigo.',
  'MAMA. ma-ma, despacio ma-ma. Repite conmigo.',
  'PAPA. pa-pa, despacio pa-pa. Repite conmigo.',
  'PERA. pe-ra, despacio pe-ra. Repite conmigo.',
  'SOL. sol, sss-ooo-lll. Repite conmigo.',
];
