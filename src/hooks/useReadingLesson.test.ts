import { describe, expect, it } from 'vitest';
import { evaluarLectura, levenshtein, normalizeEs } from './useReadingLesson';

describe('useReadingLesson · evaluación de lectura', () => {
  it('normaliza mayúsculas, acentos y signos', () => {
    expect(normalizeEs('  ¡MAMÁ!  ')).toBe('mama');
    expect(normalizeEs('Crayón.')).toBe('crayon');
  });

  it('trata la eñe como una letra normal', () => {
    expect(normalizeEs('ÑANDÚ')).toBe('nandu');
    expect(normalizeEs('año')).toBe('ano');
  });

  it('calcula la distancia de edición', () => {
    expect(levenshtein('mama', 'mama')).toBe(0);
    expect(levenshtein('mama', 'mami')).toBe(1);
    expect(levenshtein('sol', 'solo')).toBe(1);
    expect(levenshtein('', 'luna')).toBe(4);
  });

  it('no cuenta una respuesta vacía como acierto', () => {
    const oido = normalizeEs('');
    const objetivo = normalizeEs('A');
    expect(oido.length).toBe(0);
    expect(oido === objetivo).toBe(false);
  });
});

describe('evaluarLectura · letra de una sola grafía', () => {
  it('acepta la letra dicha sola', () => {
    expect(evaluarLectura('A', 'A').bien).toBe(true);
    expect(evaluarLectura('A', 'a').bien).toBe(true);
    expect(evaluarLectura('A', 'A.').bien).toBe(true);
  });

  it('rechaza una palabra que solo contiene la letra', () => {
    expect(evaluarLectura('A', 'CASA').bien).toBe(false);
    expect(evaluarLectura('A', 'PALABRA').bien).toBe(false);
    expect(evaluarLectura('A', 'LA MESA').bien).toBe(false);
  });

  it('rechaza otra letra', () => {
    expect(evaluarLectura('A', 'E').bien).toBe(false);
    expect(evaluarLectura('M', 'N').bien).toBe(false);
  });
});

describe('evaluarLectura · sílaba y palabra', () => {
  it('acepta la palabra exacta', () => {
    expect(evaluarLectura('CASA', 'CASA').bien).toBe(true);
    expect(evaluarLectura('SOL', 'sol.').bien).toBe(true);
    expect(evaluarLectura('PAPÁ', 'papa').bien).toBe(true);
  });

  it('tolera una sola letra distinta', () => {
    expect(evaluarLectura('SOL', 'SAL').bien).toBe(true);
    expect(evaluarLectura('CASA', 'CAMA').bien).toBe(true);
    expect(evaluarLectura('PAPA', 'MAPA').bien).toBe(true);
  });

  it('rechaza dos o más letras de diferencia', () => {
    expect(evaluarLectura('MAMA', 'PAPA').bien).toBe(false);
    expect(evaluarLectura('PERA', 'PERRO').bien).toBe(false);
    expect(evaluarLectura('LA', 'EL').bien).toBe(false);
  });

  it('acepta el objetivo dentro de una frase reconocida', () => {
    expect(evaluarLectura('SOL', 'EL SOL').bien).toBe(true);
    expect(evaluarLectura('CASA', 'MI CASA').bien).toBe(true);
    expect(evaluarLectura('LA', 'LA').bien).toBe(true);
  });
});

describe('evaluarLectura · ruido del reconocedor', () => {
  it('ignora muletillas sueltas', () => {
    expect(evaluarLectura('CASA', 'eh casa').bien).toBe(true);
    expect(evaluarLectura('CASA', 'este, casa').bien).toBe(true);
  });

  it('no inventa un acierto cuando solo se oyen muletillas', () => {
    expect(evaluarLectura('CASA', 'eh').bien).toBe(false);
    expect(evaluarLectura('CASA', 'mmm').bien).toBe(false);
  });

  it('no acierta con aire o silencio', () => {
    expect(evaluarLectura('CASA', '').bien).toBe(false);
    expect(evaluarLectura('CASA', '   ').bien).toBe(false);
    expect(evaluarLectura('A', '').bien).toBe(false);
  });

  it('marca el motivo para elegir el mensaje al peque', () => {
    expect(evaluarLectura('CASA', '').motivo).toBe('sin-audio');
    expect(evaluarLectura('CASA', 'eh').motivo).toBe('solo-muletillas');
    expect(evaluarLectura('CASA', 'CASA').motivo).toBe('acierto');
    expect(evaluarLectura('CASA', 'PERRO').motivo).toBe('distinto');
  });

  it('devuelve la distancia para graduar el ánimo', () => {
    expect(evaluarLectura('SOL', 'SAL').distancia).toBe(1);
    expect(evaluarLectura('MAMA', 'PAPA').distancia).toBe(2);
  });
});
