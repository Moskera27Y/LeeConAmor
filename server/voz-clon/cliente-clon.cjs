// Clon de la voz de Léo: primero el Space en la nube (CLON_URL) y si no
// responde, el servicio local http://127.0.0.1:7860. Gratis, sin cuotas.
let clonListo = false;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function baseClon() {
  const remoto = (process.env.CLON_URL || '').replace(/\/$/, '');
  return remoto || 'http://127.0.0.1:7860';
}

async function clonarLocal(texto) {
  const cuerpo = JSON.stringify({ texto: String(texto).slice(0, 160) });
  const base = baseClon();
  for (let intento = 1; intento <= 4; intento++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 300000);
    try {
      const r = await fetch(`${base}/clonar`, {
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
    const r = await fetch(`${baseClon()}/salud`, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return false;
    clonListo = true;
    return true;
  } catch {
    return false;
  }
}

module.exports = { clonarLocal, clonSalud };
