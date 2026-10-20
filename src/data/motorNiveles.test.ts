import { describe, expect, it } from 'vitest';
import {
  asegurarLeccionInicial,
  avanzarActividad,
  esUltimaLeccion,
  letrasDeObjetivo,
  numeroLeccionActual,
  obtenerTotalLecciones,
  progresoCurso,
  retrocerActividad,
  type EstadoMotor,
} from './motorNiveles';
import { SECUENCIA_LECCIONES } from './secuenciaLecciones';

const base: EstadoMotor = { etapa: 'vocales', n: 0, pesos: {}, aciertos: {} };

describe('motorNiveles · recorrido guiado', () => {
  it('normaliza letras del objetivo sin acentos ni símbolos', () => {
    expect(letrasDeObjetivo('crayón')).toEqual(['C', 'R', 'A', 'Y', 'O', 'N']);
    expect(letrasDeObjetivo('¡MAMÁ!')).toEqual(['M', 'A']);
    expect(letrasDeObjetivo('')).toEqual([]);
  });

  it('asigna la primera lección recomendada por la evaluación', () => {
    const motor = asegurarLeccionInicial(base, '6-8', { etapaRecomendada: 'silabas_trabadas' });
    const leccion = SECUENCIA_LECCIONES['6-8'].find((l) => l.id === motor.leccionId);
    expect(leccion?.etapa).toBe('silabas_trabadas');
    expect(motor.actividadIdx).toBe(0);
  });

  it('numera lecciones y detecta la última', () => {
    const ultima = SECUENCIA_LECCIONES['3-5'][SECUENCIA_LECCIONES['3-5'].length - 1];
    const motor: EstadoMotor = { ...base, leccionId: ultima.id, actividadIdx: 0 };
    expect(numeroLeccionActual('3-5', motor)).toBe(obtenerTotalLecciones('3-5'));
    expect(esUltimaLeccion('3-5', motor)).toBe(true);
    expect(esUltimaLeccion('3-5', { ...base, leccionId: 'l_35_vocales_a' })).toBe(false);
  });

  it('el progreso llega al 100% solo al terminar la última actividad', () => {
    const rango = '3-5' as const;
    const ultima = SECUENCIA_LECCIONES[rango][SECUENCIA_LECCIONES[rango].length - 1];
    const enUltimaActividad: EstadoMotor = {
      ...base,
      leccionId: ultima.id,
      actividadIdx: ultima.actividades.length - 1,
    };
    expect(progresoCurso(rango, enUltimaActividad)).toBeLessThan(100);
    const trasTerminar = avanzarActividad(enUltimaActividad, rango);
    // En la última lección, avanzar vuelve al inicio del curso (repaso).
    expect(trasTerminar.leccionId).toBe(SECUENCIA_LECCIONES[rango][0].id);
    expect(trasTerminar.actividadIdx).toBe(0);
    expect(trasTerminar.etapa).toBe('vocales');
  });

  it('retrocede solo si hay actividad anterior', () => {
    const motor: EstadoMotor = { ...base, leccionId: 'l_35_vocales_a', actividadIdx: 2 };
    expect(retrocerActividad(motor).actividadIdx).toBe(1);
    const cero = { ...motor, actividadIdx: 0 };
    expect(retrocerActividad(cero)).toBe(cero);
  });
});
