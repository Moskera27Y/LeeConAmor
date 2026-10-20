import { useCallback, useEffect, useRef, useState } from 'react';

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
  // El reconocimiento nativo es opcional: MediaRecorder + Whisper también
  // funciona en navegadores sin SpeechRecognition (por ejemplo Firefox).
  return typeof window !== 'undefined';
}

async function transcribeWithWhisper(blob: Blob, objetivo: string): Promise<string | null> {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 25000);
  try {
    const form = new FormData();
    form.append('audio', blob, 'lectura.webm');
    form.append('objetivo', objetivo);
    const r = await fetch('/api/transcribe', { method: 'POST', body: form, signal: ctrl.signal });
    if (!r.ok) return null;
    const data = await r.json();
    return (data?.texto as string) || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
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

function listenNative(timeoutMs = 6000, onStart?: (rec: any) => void): Promise<string | null> {
  return new Promise((resolve) => {
    if (!esNavegador()) return resolve(null);
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return resolve(null);
    try {
      const rec = new SR();
      onStart?.(rec);
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
  const streamRef = useRef<MediaStream | null>(null);
  const reconocimientoRef = useRef<any>(null);
  const chunks = useRef<Blob[]>([]);
  const canceladoRef = useRef(false);

  // El botón "Parar" corta de verdad la grabación y el micrófono.
  const detenerGrabacion = useCallback(() => {
    canceladoRef.current = true;
    try {
      mediaRef.current?.stop();
    } catch { /* noop */ }
    try {
      reconocimientoRef.current?.abort();
    } catch { /* noop */ }
    reconocimientoRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setGrabando(false);
    setEvaluando(false);
    setVolumen(0);
  }, []);

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
    if (!esNavegador()) return new Blob([]);
    chunks.current = [];
    const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : undefined });
    mediaRef.current = mr;
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.current.push(e.data);
    };
    let resolver!: (b: Blob) => void;
    const stopped: Promise<Blob> = new Promise((res) => {
      resolver = res;
      mr.onstop = () => {
        res(new Blob(chunks.current, { type: 'audio/webm' }));
      };
      // Si el grabador falla antes de arrancar, no dejamos la promesa colgada.
      mr.onerror = () => res(new Blob([], { type: 'audio/webm' }));
    });

    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    let raf = 0;
    let ctx: AudioContext | null = null;
    let ultimoVol = 0;
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
      await new Promise<void>((listo) => {
        try {
          mr.start();
        } catch {
          resolver(new Blob([], { type: 'audio/webm' }));
          listo();
          return;
        }
        const vigilar = () => {
          if (canceladoRef.current) return listo();
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
    canceladoRef.current = false;
    // Intenta MediaRecorder + Whisper, con fallback nativo
    if (!esNavegador() || !navigator.mediaDevices?.getUserMedia) {
      const t = await listenNative(6000, (rec) => { reconocimientoRef.current = rec; });
      reconocimientoRef.current = null;
      if (canceladoRef.current) return { bien: false, raw: '', dist: 999, cancelado: true };
      return { ...(await evaluar(t)), cancelado: false };
    }
    let stream: MediaStream | null = null;
    try {
      setGrabando(true);
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      // Si el componente se desmontó mientras el navegador pedía permiso,
      // cerramos el micrófono en cuanto se concede y no grabamos nada.
      if (canceladoRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return { bien: false, raw: '', dist: 999, cancelado: true };
      }
      const blob = await grabarConVAD(stream);
      setGrabando(false);
      if (canceladoRef.current) {
        return { bien: false, raw: '', dist: 999, cancelado: true };
      }
      const textoWhisper = await transcribeConReintento(blob, objetivo);
      if (canceladoRef.current) {
        return { bien: false, raw: '', dist: 999, cancelado: true };
      }
      if (textoWhisper) return { ...(await evaluar(textoWhisper)), cancelado: false };
      const t2 = await listenNative(5000, (rec) => { reconocimientoRef.current = rec; });
      reconocimientoRef.current = null;
      if (canceladoRef.current) {
        return { bien: false, raw: '', dist: 999, cancelado: true };
      }
      return { ...(await evaluar(t2)), cancelado: false };
    } catch {
      setGrabando(false);
      if (canceladoRef.current) {
        return { bien: false, raw: '', dist: 999, cancelado: true };
      }
      const t = await listenNative(6000, (rec) => { reconocimientoRef.current = rec; });
      reconocimientoRef.current = null;
      if (canceladoRef.current) return { bien: false, raw: '', dist: 999, cancelado: true };
      return { ...(await evaluar(t)), cancelado: false };
    } finally {
      stream?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, [evaluar, objetivo, grabarConVAD]);

  const reset = useCallback(() => {
    canceladoRef.current = true;
    try {
      mediaRef.current?.stop();
    } catch { /* noop */ }
    try {
      reconocimientoRef.current?.abort();
    } catch { /* noop */ }
    reconocimientoRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setGrabando(false);
    setEvaluando(false);
    setOido('');
    setIntentos(0);
    setVolumen(0);
  }, []);

  // Privacidad: al salir de la actividad se apaga el micrófono aunque el
  // componente se desmonte a mitad de una grabación.
  useEffect(() => {
    return () => {
      canceladoRef.current = true;
      try {
        mediaRef.current?.stop();
      } catch { /* noop */ }
      try {
        reconocimientoRef.current?.abort();
      } catch { /* noop */ }
      reconocimientoRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  return { grabando, evaluando, oido, intentos, volumen, grabarYEvaluar, reset, detenerGrabacion };
}
