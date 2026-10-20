// Confeti local (canvas-confetti ya está en package.json desde antes).
// Se carga bajo demanda para no pesar en el arranque de la app.
export async function petardos(opciones: Record<string, unknown> = {}) {
  try {
    const mod = await import('canvas-confetti');
    mod.default({
      particleCount: 80,
      spread: 110,
      origin: { y: 0.6 },
      ...opciones,
    });
  } catch {
    /* sin confeti, la app sigue */
  }
}
