// Frases CANÓNICAS que Léo HABLA (sin nombres ni datos variables).
// Todas deben existir en src/data/audioFijo.ts para pregenerarse.
// Lo variable (nombre, letra elegida, lo oído) solo se MUESTRA en pantalla.

export const F_ERROR_CASI = '¡Casi! Prueba otra vez con amor ❤️';
export const F_ESCUCHA_LEE = 'Te escucho. Lee en voz alta.';
export const F_BIEN_LECTURA = '¡Qué lindo leíste! 🌟';
export const F_NO_ESCUCHE = 'No te oí bien. Probemos otra vez con amor.';
export const F_BUEN_ESFUERZO = '¡Buen esfuerzo! Vamos juntitos despacio.';
export const F_BUEN_INTENTO = '¡Buen intento! Una vez más.';
export const F_BUEN_INTENTO_EXAMEN = 'Buen intento. Sigue practicando y lo intentamos de nuevo.';
export const F_FELICIDADES_FIN = '¡Felicidades! Terminaste todo. Ahora lees por tu cuenta. 🎉';
export const F_NIVEL_OK = '¡Nivel completado!';
export const F_ETAPA_SUPERADA = '¡Increíble! Subiste de etapa. Vamos por más. 🎉';
export const F_GRADUACION = '¡Felicidades! Ya sabes las vocales y el abecedario. Eres un gran lector. 🎓';

export const REINTENTOS_LECTURA = [F_BUEN_INTENTO, F_BUEN_ESFUERZO, F_NO_ESCUCHE];

// Saludo con el nombre: si el audio del niño ya esta pregenerado se usa,
// si no, el saludo generico (tambien pregenerado con la voz clonada).
export function saludoNombre(nombre: string): string {
  return conNombre(`¡Hola, ${nombre}! Vamos a leer juntitos.`, '¡Hola! Vamos a leer juntitos.');
}

// Feedback con el nombre del niño.
// Solo varies en el NOMBRE (no en la palabra ni la pista) para que el audio
// se pueda pregenerar con la voz clonada una vez por nombre.
// Si ese audio no existe todavita, se usa la version sin nombre: tambien
// esta pregenerada, asi que siempre se oye la voz de Leo.
import { AUDIO_FIJO } from './audioFijo';
import { textoHablado } from './textoVoz';

function conNombre(texto: string, respaldo: string): string {
  return AUDIO_FIJO[textoHablado(texto)] ? texto : respaldo;
}

export function felicitarNombre(nombre: string, _objetivo?: string): string {
  return conNombre(`¡Muy bien, ${nombre}! ¡Qué bien leíste! 🌟`, F_BIEN_LECTURA);
}

export function corregirNombre(nombre: string, _pista?: string): string {
  return conNombre(`¡Casi, ${nombre}! Vamos juntitos, despacio.`, '¡Buen esfuerzo! Vamos juntitos despacio.');
}

export function animarNombre(nombre: string): string {
  return conNombre(`Tú puedes, ${nombre}. Escucha otra vez e inténtalo.`, F_BUEN_INTENTO);
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
  '¡Formaste tu primera sílaba!',
  '¡Armaste sílabas muy bien!',
  '¡Leíste palabras de verdad!',
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
  'Buen intento. Sigue practicando y lo intentamos de nuevo.',
  '¡Felicidades! Terminaste todo. Ahora lees por tu cuenta. 🎉',
  '¡Nivel completado!',
  '¡Increíble! Subiste de etapa. Vamos por más. 🎉',
  '¡Felicidades! Ya sabes las vocales y el abecedario. Eres un gran lector. 🎓',
];
