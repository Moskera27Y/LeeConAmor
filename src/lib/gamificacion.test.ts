import { beforeEach, describe, expect, it } from 'vitest';
import {
  actualizarGamificacion,
  cargarGamificacion,
  guardarGamificacion,
  otorgarInsignia,
} from './gamificacion';

beforeEach(() => {
  localStorage.clear();
});

describe('gamificación por peque', () => {
  it('separa el progreso de cada niño', () => {
    const estado = cargarGamificacion('ana');
    guardarGamificacion({ ...estado, aciertosTotales: 7 }, 'ana');
    expect(cargarGamificacion('ana').aciertosTotales).toBe(7);
    expect(cargarGamificacion('leo').aciertosTotales).toBe(0);
  });

  it('otorga insignias manuales una sola vez', () => {
    const estado = cargarGamificacion('ana');
    const primera = otorgarInsignia(estado, 'primera_palabra', 'ana');
    expect(primera.nuevasInsignias.map((i) => i.id)).toEqual(['primera_palabra']);
    const repetida = otorgarInsignia(primera.siguiente, 'primera_palabra', 'ana');
    expect(repetida.nuevasInsignias).toEqual([]);
  });

  it('desbloquea "sin errores" con 10 aciertos limpios', () => {
    let estado = cargarGamificacion('ana');
    for (let i = 0; i < 10; i++) {
      estado = actualizarGamificacion(estado, { aciertos: 1 }, 'ana').siguiente;
    }
    expect(estado.insignias).toContain('sin_errores');
    expect(estado.insignias).toContain('diez_aciertos');
  });

  it('un fallo antes de los 10 aciertos impide "sin errores"', () => {
    let estado = cargarGamificacion('ana');
    for (let i = 0; i < 5; i++) {
      estado = actualizarGamificacion(estado, { aciertos: 1 }, 'ana').siguiente;
    }
    estado = actualizarGamificacion(estado, { errores: 1 }, 'ana').siguiente;
    for (let i = 0; i < 5; i++) {
      estado = actualizarGamificacion(estado, { aciertos: 1 }, 'ana').siguiente;
    }
    expect(estado.insignias).toContain('diez_aciertos');
    expect(estado.insignias).not.toContain('sin_errores');
  });
});
