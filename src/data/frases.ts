// Frases CANÓNICAS que Léo HABLA (sin nombres ni datos variables).
// Todas deben existir en server/frases-fijas.cjs para pregenerarse.
// Lo variable (nombre, letra elegida, lo oído) solo se MUESTRA en pantalla.

export const F_ERROR_CASI = '¡Casi! Prueba otra vez con amor ❤️';
export const F_ESCUCHA_LEE = 'Te escucho. Lee en voz alta.';
export const F_BIEN_LECTURA = '¡Qué lindo leíste! 🌟';
export const F_NO_ESCUCHE = 'No te pude escuchar bien. Probemos otra vez con amor.';
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
