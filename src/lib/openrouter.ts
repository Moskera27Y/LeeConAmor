// Cliente de la recomendación con IA.
// La API key vive SOLO en el servidor (/api/recomendar). Este modulo no tiene secretos.

const BASE_URL = '/api/recomendar';

export interface RespuestaIA {
  nivelRecomendado: number | null;
  etapaRecomendada: string | null;
  observaciones: string[] | null;
}

export async function consultarRecomendacionIA(
  respuestas: Record<string, string>,
  rango: string,
  nombre: string,
  resumenLocal: string
): Promise<RespuestaIA | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 25000);
    const r = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ respuestas, rango, nombre, resumenLocal }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!r.ok) return null;
    const data = (await r.json()) as RespuestaIA;
    const tieneNivel = typeof data?.nivelRecomendado === 'number' && Number.isFinite(data.nivelRecomendado);
    const tieneEtapa = typeof data?.etapaRecomendada === 'string' && data.etapaRecomendada.trim().length > 0;
    const tieneObs = Array.isArray(data?.observaciones) && data.observaciones.length > 0;
    if (!tieneNivel && !tieneEtapa && !tieneObs) return null;
    return data;
  } catch {
    return null;
  }
}