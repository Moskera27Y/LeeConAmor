// Biblioteca de cuentos para Storytime (lectura palabra a palabra).
//
// Reglas de oro (iguales que las frases):
//  - Palabras cortas y silábicas, del vocabulario que el peque ya ve en los
//    juegos (MAMA, SOL, LUNA, CASA...), para que casi todo tenga audio clonado.
//  - server/precache-clon.cjs escanea este archivo y genera el audio de cada
//    palabra nueva con la voz clonada de Léo (npm run voz:clon).

export interface Cuento {
  id: string;
  titulo: string;
  emoji: string;
  texto: string;
}

export const CUENTOS: Cuento[] = [
  {
    id: 'el_sol_y_la_luna',
    titulo: 'El sol y la luna',
    emoji: '🌞',
    texto: 'El sol sale. La luna mira. El sol da luz al día. La luna da luz a la noche. Adiós sol. Hola luna.',
  },
  {
    id: 'la_casa_de_mama',
    titulo: 'La casa de mamá',
    emoji: '🏠',
    texto: 'Mamá me ama. Yo amo a mamá. En la casa hay una mesa. En la mesa hay una pera. Mamá me da la pera. Yo digo: amor.',
  },
  {
    id: 'el_sapo_solo',
    titulo: 'El sapo solo',
    emoji: '🐸',
    texto: 'El sapo está solo. Mira la luna. Mira el sol. Nadie está aquí. ¡Hola! Dice una rata. Ya no está solo.',
  },
];
