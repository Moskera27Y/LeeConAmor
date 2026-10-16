// Voz de Léo con Gemini TTS (femenina, natural). La key NUNCA sale al frontend.
// Vercel: define GEMINI_API_KEY (gratis en https://aistudio.google.com).
// Sin key -> el frontend usa la voz nativa del navegador automáticamente.

const VOCES_VALIDAS = ['Callirrhoe'];
const CACHE = new Map<string, { audio: string; mime: string; voz: string }>();
// Modelos en orden: lite (más cuota) y luego el normal como respaldo.
const TTS_MODELS = [
  process.env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-lite-preview-tts',
  'gemini-2.5-flash-preview-tts',
].filter((v, i, a) => v && a.indexOf(v) === i);

// Gemini devuelve PCM crudo (no WAV): hay que envolverlo para que el navegador lo reproduzca.
function pcmToWavBase64(b64: string, mime: string): { audio: string; mime: string } {
  const raw = Buffer.from(b64, 'base64');
  if (raw.length >= 4 && raw.slice(0, 4).toString() === 'RIFF') return { audio: b64, mime: 'audio/wav' };
  const m = /rate=(\d+)/i.exec(mime || '');
  const sampleRate = m ? parseInt(m[1], 10) : 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + raw.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE((sampleRate * numChannels * bitsPerSample) / 8, 28);
  header.writeUInt16LE((numChannels * bitsPerSample) / 8, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(raw.length, 40);
  return { audio: Buffer.concat([header, raw]).toString('base64'), mime: 'audio/wav' };
}

function geminiKeys(): string[] {
  return String(process.env.GEMINI_API_KEY || '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const keys = geminiKeys();
  if (!keys.length) {
    res.status(501).json({ error: 'Falta GEMINI_API_KEY en servidor. Usa voz nativa.' });
    return;
  }
  const texto = String(req.body?.texto || '').slice(0, 160);
  const voz = 'Callirrhoe';
  if (!texto) {
    res.status(400).json({ error: 'Falta texto' });
    return;
  }
  const ck = `v4:${voz}:${texto}`;
  const hit = CACHE.get(ck);
  if (hit) {
    res.status(200).json({ ...hit, cache: true });
    return;
  }
  try {
    let ultimoError = 'Ningun modelo de voz disponible';
    let ultimoStatus = 500;
    for (const apiKey of keys) {
      for (const modelo of TTS_MODELS) {
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                { parts: [{ text: `Habla como una maestra dulce y alegre para ninos pequenos, despacio y con carino: ${texto}` }] },
              ],
              generationConfig: {
                responseModalities: ['AUDIO'],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voz } } },
              },
            }),
          }
        );
        if (r.status === 404) continue;
        if (r.status === 429) {
          ultimoError = 'Cuota gratis de Gemini agotada, intentalo mas tarde';
          ultimoStatus = 502;
          break; // esta clave no tiene cuota: probar la siguiente
        }
        if (r.status === 400 || r.status === 401 || r.status === 403) {
          ultimoError = 'API key de Gemini invalida';
          ultimoStatus = 401;
          break; // clave mala: probar la siguiente
        }
        if (!r.ok) {
          ultimoError = `Gemini devolvio ${r.status}`;
          ultimoStatus = 500;
          continue;
        }
        const data = (await r.json()) as any;
        const parts = data?.candidates?.[0]?.content?.parts || [];
        const audio = parts.find((p: any) => p?.inlineData?.data);
        if (!audio) {
          res.status(502).json({ error: 'Gemini no devolvio audio' });
          return;
        }
        const out = pcmToWavBase64(audio.inlineData.data, audio.inlineData.mimeType || 'audio/wav');
        const full = { audio: out.audio, mime: out.mime, voz, modelo };
        CACHE.set(ck, full);
        if (CACHE.size > 200) CACHE.delete(CACHE.keys().next().value as string);
        res.status(200).json({ ...full, cache: false });
        return;
      }
    }
    res.status(ultimoStatus).json({ error: ultimoError });
  } catch {
    res.status(500).json({ error: 'Error generando voz' });
  }
}
