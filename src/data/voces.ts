export interface VozOpcion {
  id: string;
  nombre: string;
  desc: string;
}

export const VOZ_UNICA = 'Callirrhoe';

// Léo tiene una sola voz: Callirrhoe (femenina, alegre, habla español natural).
export const VOCES: VozOpcion[] = [
  { id: VOZ_UNICA, nombre: 'Callirrhoe', desc: 'La voz de Léo 💛' },
];

const KEY = 'lee_voz';

export function getVoz(): string {
  return VOZ_UNICA;
}

export function setVoz(_id: string) {
  try {
    localStorage.setItem(KEY, VOZ_UNICA);
  } catch { /* noop */ }
}
