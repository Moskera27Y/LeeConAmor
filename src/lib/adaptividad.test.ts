import { beforeEach, describe, expect, it } from 'vitest';
import { cargarAdaptabilidad, registrarEvento } from './adaptividad';

beforeEach(() => {
  localStorage.clear();
});

describe('adaptabilidad por peque', () => {
  it('guarda rachas separadas por niño', () => {
    let ana = cargarAdaptabilidad('ana');
    ana = registrarEvento(ana, 'acierto', 'MAMA', 'ana');
    ana = registrarEvento(ana, 'acierto', 'MAMA', 'ana');
    let leo = cargarAdaptabilidad('leo');
    leo = registrarEvento(leo, 'error', 'SOL', 'leo');

    expect(cargarAdaptabilidad('ana').rachaAciertos).toBe(2);
    expect(cargarAdaptabilidad('leo').rachaErrores).toBe(1);
    expect(cargarAdaptabilidad('leo').rachaAciertos).toBe(0);
  });

  it('un fallo corta la racha de aciertos', () => {
    let estado = cargarAdaptabilidad('ana');
    estado = registrarEvento(estado, 'acierto', 'A', 'ana');
    estado = registrarEvento(estado, 'error', 'A', 'ana');
    expect(estado.rachaAciertos).toBe(0);
    expect(estado.rachaErrores).toBe(1);
  });
});
