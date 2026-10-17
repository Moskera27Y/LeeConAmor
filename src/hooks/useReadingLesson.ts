import { useCallback, useRef, useState } from 'react';

export function normalizeEs(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zñ]/g, '');
}

export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

function esNavegador(): boolean {
  return typeof window !== 'undefined' && typeof window.webkitSpeechRecognition !== 'undefined';
}

async function transcribeWithWhisper(blob: Blob, objetivo: string): Promise<string | null> {
  try {
    const form = new FormData();
    form.append('audio', blob, 'lectura.webm');
    form.append('objetivo', objetivo);
    const r = await fetch('/api/transcribe', { method: 'POST', body: form });
    if (!r.ok) return null;
    const data = await r.json();
    return (data?.texto as string) || null;
  } catch {
    return null;
  }
}

// Reintenta la transcripción una vez si el audio trae contenido real
async function transcribeConReintento(blob: Blob, objetivo: string): Promise<string | null> {
  const primero = await transcribeWithWhisper(blob, objetivo);
  if (primero) return primero;
  if (blob.size < 2000) return null;
  await new Promise((r) => setTimeout(r, 1000));
  return transcribeWithWhisper(blob, objetivo);
}

function listenNative(timeoutMs = 6000): Promise<string | null> {
  return new Promise((resolve) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return resolve(null);
    try {
      const rec = new SR();
      rec.lang = 'es-ES';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      let done = false;
      const timer = setTimeout(() => {
        if (!done) {
          done = true;
          try { rec.stop(); } catch { /* noop */ }
          resolve(null);
        }
      }, timeoutMs);
      rec.onresult = (e: any) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        const t = e.results?.[0]?.[0]?.transcript || '';
        resolve(t);
      };
      rec.onerror = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(null);
      };
      rec.onend = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(null);
      };
      rec.start();
    } catch {
      resolve(null);
    }
  });
}

export function useReadingLesson(objetivo: string) {
  const [grabando, setGrabando] = useState(false);
  const [evaluando, setEvaluando] = useState(false);
  const [oido, setOido] = useState('');
  const [intentos, setIntentos] = useState(0);
  const [volumen, setVolumen] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const evaluar = useCallback(
    async (textoOido: string | null) => {
      setEvaluando(true);
      const raw = textoOido || '';
      setOido(raw);
      const normOido = normalizeEs(raw);
      const normObj = normalizeEs(objetivo);
      const dist = levenshtein(normOido, normObj);
      const bien = normOido.length > 0 && (normOido === normObj || dist <= 1 || normOido.includes(normObj));
      setIntentos((i) => i + 1);
      setEvaluando(false);
      return { bien, raw, dist };
    },
    [objetivo]
  );

  // Graba con detección de voz: empieza al oír al niño y corta con 1s de
  // silencio (máx 8s). Sin VAD del navegador no hay forma fiable: esto es local.
  const grabarConVAD = useCallback(async (stream: MediaStream): Promise<Blob> => {
    chunks.current = [];
    const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : undefined });
    mediaRef.current = mr;
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.current.push(e.data);
    };
    const stopped: Promise<Blob> = new Promise((res) => {
      mr.onstop = () => {
        res(new Blob(chunks.current, { type: 'audio/webm' }));
      };
    });

    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    let raf = 0;
    let ctx: AudioContext | null = null;
    try {
      ctx = new Ctx();
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 512;
      src.connect(an);
      const buf = new Float32Array(an.fftSize);
      const UMBRAL = 0.02;
      let empezo = false;
      let silencioDesde = 0;
      const inicio = Date.now();
      let ultimoVol = 0;
      await new Promise<void>((listo) => {
        mr.start();
        const vigilar = () => {
          an.getFloatTimeDomainData(buf);
          let suma = 0;
          for (let i = 0; i < buf.length; i++) suma += buf[i] * buf[i];
          const rms = Math.sqrt(suma / buf.length);
          if (Date.now() - ultimoVol > 100) {
            ultimoVol = Date.now();
            setVolumen(Math.min(1, rms * 8));
          }
          const ahora = Date.now();
          if (rms > UMBRAL) {
            empezo = true;
            silencioDesde = ahora;
          }
          if (empezo && ahora - silencioDesde > 1000) return listo();
          if (!empezo && ahora - inicio > 2500) return listo();
          if (ahora - inicio > 8000) return listo();
          raf = requestAnimationFrame(vigilar);
        };
        vigilar();
      });
    } finally {
      cancelAnimationFrame(raf);
      setVolumen(0);
      try {
        mr.stop();
      } catch { /* noop */ }
      const blob = await stopped;
      try {
        await ctx?.close();
      } catch { /* noop */ }
      return blob;
    }
  }, []);

  const grabarYEvaluar = useCallback(async () => {
    // Intenta MediaRecorder + Whisper, con fallback nativo
    if (!navigator.mediaDevices?.getUserMedia) {
      const t = await listenNative();
      return evaluar(t);
    }
    let stream: MediaStream | null = null;
    try {
      setGrabando(true);
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const blob = await grabarConVAD(stream);
      setGrabando(false);
      const textoWhisper = await transcribeConReintento(blob, objetivo);
      if (textoWhisper) return evaluar(textoWhisper);
      const t2 = await listenNative(5000);
      return evaluar(t2);
    } catch {
      setGrabando(false);
      const t = await listenNative();
      return evaluar(t);
    } finally {
      stream?.getTracks().forEach((t) => t.stop());
    }
  }, [evaluar, objetivo, grabarConVAD]);

  const reset = useCallback(() => {
    setOido('');
    setIntentos(0);
    setVolumen(0);
  }, []);

  return { grabando, evaluando, oido, intentos, volumen, grabarYEvaluar, reset };
}
