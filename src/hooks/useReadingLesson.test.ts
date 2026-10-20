import { describe, expect, it } from 'vitest';
import { levenshtein, normalizeEs } from './useReadingLesson';

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
