// Clon local de la voz de Léo (XTTS-v2, español). Gratis, sin claves ni cuotas.
// Uso: prender con iniciar-voz-clon.bat (puerto 7860).
// El backend Node lo usa solo cuando el audio no está en fijos ni caché.
let clonListo = false;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function clonarLocal(texto) {
  const cuerpo = JSON.stringify({ texto: String(texto).slice(0, 160) });
  for (let intento = 1; intento <= 4; intento++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 300000);
    try {
      const r = await fetch('http://127.0.0.1:7860/clonar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: cuerpo,
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!r.ok) {
        if (intento < 4) await sleep(20000);
        continue;
      }
      const data = await r.json();
      if (!data?.audio) {
        if (intento < 4) await sleep(20000);
        continue;
      }
      return { audio: data.audio, mime: 'audio/wav', voz: 'Callirrhoe', clon: true };
    } catch {
      clearTimeout(timer);
      // El servicio puede estar cargando el modelo (~1 min): esperar y reintentar
      if (intento < 4) await sleep(25000);
    }
  }
  return null;
}

async function clonSalud() {
  try {
    const r = await fetch('http://127.0.0.1:7860/salud', { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return false;
    clonListo = true;
    return true;
  } catch {
    return false;
  }
}

module.exports = { clonarLocal, clonSalud };
