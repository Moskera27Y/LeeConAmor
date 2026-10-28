import { useCallback, useEffect, useRef, useState } from 'react';

export type MotivoLectura = 'acierto' | 'distinto' | 'sin-audio' | 'solo-muletillas';

export interface ResultadoLectura {
  bien: boolean;
  motivo: MotivoLectura;
  distancia: number;
}

export interface VeredictoGrabado extends ResultadoLectura {
  raw: string;
  cancelado: boolean;
}

const MULETILLAS = new Set([
  'eh', 'ehm', 'em', 'emm', 'mmm', 'mm', 'mh', 'hm', 'ah', 'ahh', 'oh', 'uh',
  'este', 'esto', 'bueno', 'pues', 'ok', 'okay', 'oc', 'aja', 'verdad', 'digamos',
]);

const MS_SILENCIO_FIN = 1100;
const MS_MAX_GRABACION = 10000;
const MS_GRABACION_SIN_ANALIZADOR = 6000;
const MS_CALIBRACION_RUIDO = 350;
const UMBRAL_RUIDO_MINIMO = 0.012;

export const VEREDICTO_CANCELADO: VeredictoGrabado = {
  bien: false,
  motivo: 'sin-audio',
  distancia: 999,
  raw: '',
  cancelado: true,
};

export function normalizeEs(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zñ\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
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

function palabras(texto: string): string[] {
  return texto ? texto.split(' ').filter(Boolean) : [];
}

function sinMuletillas(texto: string): string {
  return palabras(texto).filter((p) => !MULETILLAS.has(p)).join(' ');
}

export function evaluarLectura(objetivo: string, oido: string): ResultadoLectura {
  const esperado = normalizeEs(objetivo);
  const crudo = normalizeEs(oido);
  if (!crudo) return { bien: false, motivo: 'sin-audio', distancia: esperado.length };
  const limpio = sinMuletillas(crudo);
  if (!limpio) return { bien: false, motivo: 'solo-muletillas', distancia: esperado.length };

  const dichas = palabras(limpio);

  if (esperado.length === 1) {
    const acerto = dichas.includes(esperado);
    return { bien: acerto, motivo: acerto ? 'acierto' : 'distinto', distancia: acerto ? 0 : 1 };
  }

  const distancia = Math.min(...[...dichas, limpio].map((c) => levenshtein(c, esperado)));
  const bien = limpio.includes(esperado) || distancia <= 1;
  return { bien, motivo: bien ? 'acierto' : 'distinto', distancia };
}

function esNavegador(): boolean {
  return typeof window !== 'undefined';
}

function microDisponible(): boolean {
  return esNavegador() && Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== 'undefined';
}

function hayAnalizador(): boolean {
  return esNavegador() && Boolean(window.AudioContext || (window as any).webkitAudioContext);
}

function reconocimientoNativoDisponible(): boolean {
  return esNavegador() && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

function cortarPista(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

function formatoGrabacion(): { mimeType: string | undefined; extension: string } {
  const candidatos = [
    { mimeType: 'audio/webm;codecs=opus', extension: 'webm' },
    { mimeType: 'audio/webm', extension: 'webm' },
    { mimeType: 'audio/ogg;codecs=opus', extension: 'ogg' },
    { mimeType: 'audio/mp4', extension: 'm4a' },
  ];
  for (const c of candidatos) {
    try {
      if (MediaRecorder.isTypeSupported(c.mimeType)) return c;
    } catch { /* formato no soportado */ }
  }
  return { mimeType: undefined, extension: 'webm' };
}

function textoAprovechable(texto: string | null): string | null {
  if (!texto) return null;
  const limpio = sinMuletillas(normalizeEs(String(texto)));
  return limpio.length > 0 ? String(texto).trim() : null;
}

async function primerTextoUtil(promesas: Promise<string | null>[]): Promise<string | null> {
  return new Promise((resolver) => {
    let pendientes = promesas.length;
    let cerrado = false;
    const terminar = (valor: string | null) => {
      if (cerrado) return;
      cerrado = true;
      resolver(valor);
    };
    if (pendientes === 0) return terminar(null);
    for (const p of promesas) {
      Promise.resolve(p)
        .then((t) => {
          pendientes -= 1;
          const util = textoAprovechable(t);
          if (util) return terminar(util);
          if (pendientes === 0) terminar(null);
        })
        .catch(() => {
          pendientes -= 1;
          if (pendientes === 0) terminar(null);
        });
    }
  });
}

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
    webkitAudioContext?: any;
  }
}

function escucharNativo(timeoutMs = 7000): Promise<string | null> {
  return new Promise((resolve) => {
    if (!reconocimientoNativoDisponible()) return resolve(null);
    const Reconocedor = window.SpeechRecognition || window.webkitSpeechRecognition;
    try {
      const rec = new Reconocedor();
      rec.lang = 'es-ES';
      rec.interimResults = true;
      rec.continuous = false;
      rec.maxAlternatives = 3;
      let cerrado = false;
      let mejor = '';
      const cerrar = (valor: string | null) => {
        if (cerrado) return;
        cerrado = true;
        window.clearTimeout(timer);
        resolve(valor);
      };
      const timer = window.setTimeout(() => {
        try { rec.stop(); } catch { /* ya detenido */ }
        cerrar(mejor || null);
      }, timeoutMs);
      rec.onresult = (e: any) => {
        const resultados = e?.results || [];
        for (let i = 0; i < resultados.length; i++) {
          const alternativas = resultados[i] || [];
          for (let j = 0; j < alternativas.length; j++) {
            const texto = String(alternativas[j]?.transcript || '').trim();
            if (texto.length > mejor.length) mejor = texto;
          }
        }
        const ultimo = resultados[resultados.length - 1];
        if (ultimo?.isFinal && mejor) {
          try { rec.stop(); } catch { /* ya detenido */ }
          cerrar(mejor);
        }
      };
      rec.onerror = () => cerrar(mejor || null);
      rec.onend = () => cerrar(mejor || null);
      rec.start();
    } catch {
      resolve(null);
    }
  });
}

async function transcribirEnNube(blob: Blob, extension: string): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), 20000);
  try {
    const form = new FormData();
    form.append('audio', blob, `lectura.${extension}`);
    const r = await fetch('/api/transcribe', { method: 'POST', body: form, signal: ctrl.signal });
    if (!r.ok) return null;
    const data = await r.json();
    const texto = typeof data?.texto === 'string' ? data.texto.trim() : '';
    return texto || null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

interface Grabacion {
  blob: Blob;
  extension: string;
}

export function useReadingLesson(objetivo: string) {
  const [grabando, setGrabando] = useState(false);
  const [evaluando, setEvaluando] = useState(false);
  const [oido, setOido] = useState('');
  const [intentos, setIntentos] = useState(0);
  const [volumen, setVolumen] = useState(0);
  const [escuchandoVoz, setEscuchandoVoz] = useState(false);
  const [motivo, setMotivo] = useState<MotivoLectura | null>(null);
  const [distancia, setDistancia] = useState<number | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const reconocimientoRef = useRef<any>(null);
  const chunks = useRef<Blob[]>([]);
  const canceladoRef = useRef(false);

  const detenerGrabacion = useCallback(() => {
    canceladoRef.current = true;
    try { mediaRef.current?.stop(); } catch { /* ya detenido */ }
    try { reconocimientoRef.current?.abort(); } catch { /* ya cerrado */ }
    reconocimientoRef.current = null;
    cortarPista(streamRef.current);
    streamRef.current = null;
    setGrabando(false);
    setEvaluando(false);
    setVolumen(0);
    setEscuchandoVoz(false);
  }, []);

  const convertir = useCallback(
    (textoOido: string | null): VeredictoGrabado => {
      const raw = textoOido || '';
      const veredicto = evaluarLectura(objetivo, raw);
      setOido(raw);
      setMotivo(veredicto.motivo);
      setDistancia(veredicto.distancia);
      setIntentos((i) => i + 1);
      return { ...veredicto, raw, cancelado: false };
    },
    [objetivo],
  );

  const grabarConVAD = useCallback(async (stream: MediaStream): Promise<Grabacion> => {
    const formato = formatoGrabacion();
    chunks.current = [];
    const mr = new MediaRecorder(stream, formato.mimeType ? { mimeType: formato.mimeType } : undefined);
    mediaRef.current = mr;
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.current.push(e.data);
    };
    const detenido = new Promise<Blob>((res) => {
      mr.onstop = () => res(new Blob(chunks.current, { type: formato.mimeType || 'audio/webm' }));
      mr.onerror = () => res(new Blob([], { type: formato.mimeType || 'audio/webm' }));
    });

    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    let ctx: AudioContext | null = null;
    let intervalo = 0;
    try {
      if (Ctx) {
        ctx = new Ctx();
        if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
      }
      const analizador = ctx ? (() => {
        const nodo = ctx.createAnalyser();
        nodo.fftSize = 1024;
        ctx.createMediaStreamSource(stream).connect(nodo);
        return nodo;
      })() : null;

      await new Promise<void>((listo) => {
        let cerrado = false;
        const terminar = () => {
          if (cerrado) return;
          cerrado = true;
          listo();
        };
        try {
          mr.start(250);
        } catch {
          terminar();
          return;
        }
        if (!analizador) {
          intervalo = window.setInterval(() => setVolumen(0.5), 120);
          window.setTimeout(terminar, MS_GRABACION_SIN_ANALIZADOR);
          return;
        }
        const buffer = new Float32Array(analizador.fftSize);
        const inicio = Date.now();
        let ruidoBase = 0;
        let muestrasRuido = 0;
        let silencioDesde = 0;
        let huboVoz = false;
        let ultimoPintado = 0;
        intervalo = window.setInterval(() => {
          if (canceladoRef.current) return terminar();
          analizador.getFloatTimeDomainData(buffer);
          let suma = 0;
          for (let i = 0; i < buffer.length; i++) suma += buffer[i] * buffer[i];
          const rms = Math.sqrt(suma / buffer.length);
          const ahora = Date.now();
          if (ahora - ultimoPintado > 100) {
            ultimoPintado = ahora;
            setVolumen(Math.min(1, rms * 8));
          }
          if (ahora - inicio < MS_CALIBRACION_RUIDO) {
            ruidoBase += rms;
            muestrasRuido += 1;
            return;
          }
          const umbral = Math.max(UMBRAL_RUIDO_MINIMO, (ruidoBase / Math.max(1, muestrasRuido)) * 3);
          if (rms > umbral) {
            huboVoz = true;
            silencioDesde = ahora;
            setEscuchandoVoz(true);
          }
          if (huboVoz && ahora - silencioDesde > MS_SILENCIO_FIN) return terminar();
          if (ahora - inicio > MS_MAX_GRABACION) return terminar();
        }, 50);
      });
    } finally {
      window.clearInterval(intervalo);
      setVolumen(0);
      setEscuchandoVoz(false);
      try { mr.stop(); } catch { /* ya detenido */ }
      const blob = await detenido;
      try { await ctx?.close(); } catch { /* ya cerrado */ }
      return { blob, extension: formato.extension };
    }
  }, []);

  const grabarYEvaluar = useCallback(async (): Promise<VeredictoGrabado> => {
    canceladoRef.current = false;
    setMotivo(null);
    setDistancia(null);

    if (!microDisponible()) {
      const nativo = await escucharNativo();
      if (canceladoRef.current) return VEREDICTO_CANCELADO;
      return convertir(nativo);
    }

    let stream: MediaStream | null = null;
    try {
      setGrabando(true);
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      if (canceladoRef.current) {
        cortarPista(stream);
        return VEREDICTO_CANCELADO;
      }

      const grabacion = await grabarConVAD(stream);
      setGrabando(false);
      if (canceladoRef.current) return VEREDICTO_CANCELADO;

      const nube = grabacion.blob.size > 1200
        ? transcribirEnNube(grabacion.blob, grabacion.extension)
        : Promise.resolve(null);
      const nativo = reconocimientoNativoDisponible() ? escucharNativo() : Promise.resolve(null);

      setEvaluando(true);
      const texto = await primerTextoUtil([nube, nativo]);
      setEvaluando(false);
      if (canceladoRef.current) return VEREDICTO_CANCELADO;
      return convertir(texto);
    } catch {
      setGrabando(false);
      setEvaluando(false);
      if (canceladoRef.current) return VEREDICTO_CANCELADO;
      const nativo = await escucharNativo();
      if (canceladoRef.current) return VEREDICTO_CANCELADO;
      return convertir(nativo);
    } finally {
      cortarPista(stream);
      streamRef.current = null;
    }
  }, [convertir, grabarConVAD]);

  const reset = useCallback(() => {
    canceladoRef.current = true;
    try { mediaRef.current?.stop(); } catch { /* ya detenido */ }
    try { reconocimientoRef.current?.abort(); } catch { /* ya cerrado */ }
    reconocimientoRef.current = null;
    cortarPista(streamRef.current);
    streamRef.current = null;
    setGrabando(false);
    setEvaluando(false);
    setOido('');
    setIntentos(0);
    setVolumen(0);
    setEscuchandoVoz(false);
    setMotivo(null);
    setDistancia(null);
  }, []);

  useEffect(() => {
    return () => {
      canceladoRef.current = true;
      try { mediaRef.current?.stop(); } catch { /* ya detenido */ }
      try { reconocimientoRef.current?.abort(); } catch { /* ya cerrado */ }
      reconocimientoRef.current = null;
      cortarPista(streamRef.current);
      streamRef.current = null;
    };
  }, []);

  return {
    grabando,
    evaluando,
    oido,
    intentos,
    volumen,
    escuchandoVoz,
    motivo,
    distancia,
    grabarYEvaluar,
    reset,
    detenerGrabacion,
    hayAnalizador: hayAnalizador(),
    hayReconocimientoNativo: reconocimientoNativoDisponible(),
  };
}
