import { useCallback, useEffect, useRef, useState } from 'react';
import { VOZ_UNICA, getVoz, setVoz } from '../data/voces';
import { AUDIO_FIJO } from '../data/audioFijo';
import { textoHablado } from '../data/textoVoz';

export type MotivoVoz = null | 'apagado' | 'key' | 'cuota' | 'otro';

// Helper: verificar si estamos en el navegador (cliente)
function esNavegador(): boolean {
  return typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined';
}

function pickSpanishVoice(): SpeechSynthesisVoice | null {
  if (!esNavegador()) return null;
  try {
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;
    const es = voices.filter((v) => v.lang.toLowerCase().startsWith('es'));
    if (es.length === 0) return null;
    return (
      es.find((v) => /sabina|dalia|paulina|helena|laura|lucia|female|niña|nina|infantil/i.test(v.name)) ||
      es.find((v) => v.lang.toLowerCase() === 'es-es') ||
      es.find((v) => v.lang.toLowerCase() === 'es-mx') ||
      es[0] ||
      null
    );
  } catch {
    return null;
  }
}

function speakNativo(texto: string, onStart: () => void, onEnd: () => void) {
  if (!esNavegador()) {
    onEnd();
    return;
  }
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = 'es-ES';
    u.rate = 0.85;
    u.pitch = 1.15;
    u.volume = 1.0;
    const v = pickSpanishVoice();
    if (v) u.voice = v;
    u.onstart = onStart;
    u.onend = onEnd;
    u.onerror = onEnd;
    window.speechSynthesis.speak(u);
  } catch {
    onEnd();
  }
}

function clasificarError(msg: string, status: number): Exclude<MotivoVoz, null> {
  const m = (msg || '').toLowerCase();
  if (status === 401 || m.includes('invalida')) return 'key';
  if (status === 502 || m.includes('cuota')) return 'cuota';
  return 'apagado';
}

// Voz de Léo = la CLONADA (ver api/voz.ts y public/audio). Orden:
//   1. audio pregenerado con el clon  -> lo normal, gratis e instantaneo
//   2. /api/voz -> llama al clon (Space o local)
//   3. voz del navegador -> solo si el clon no existe en absoluto
// Nunca se usa una voz sintetica de pago.
export function useVoice(enabled: boolean) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [fuente, setFuente] = useState<'clon' | 'nativa' | 'ninguna'>('ninguna');
  const [motivo, setMotivo] = useState<MotivoVoz>(null);
  const [necesitaToque, setNecesitaToque] = useState(false);
  const [vozNombre, setVozNombreState] = useState(getVoz());
  const [muted, setMuted] = useState(() => {
    try {
      return localStorage.getItem('lee_muted') === '1';
    } catch {
      return false;
    }
  });
  const lastText = useRef('');
  const lastAudio = useRef<{ url: string; texto: string; voz: string } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cache = useRef(new Map<string, string>());
  const [voiceReady, setVoiceReady] = useState(false);
  // Cola de habla: cada speak() nuevo invalida al anterior (fin de traslapes)
  const turnoRef = useRef(0);
  const fetchCtrl = useRef<AbortController | null>(null);

  const stopTodoBase = useCallback(() => {
    try {
      fetchCtrl.current?.abort();
    } catch { /* noop */ }
    fetchCtrl.current = null;
    try {
      audioRef.current?.pause();
      audioRef.current = null;
    } catch { /* noop */ }
    if (esNavegador()) {
      try {
        window.speechSynthesis.cancel();
      } catch { /* noop */ }
    }
    setIsSpeaking(false);
  }, []);

  const stopTodo = useCallback(() => {
    turnoRef.current += 1;
    stopTodoBase();
  }, [stopTodoBase]);

  useEffect(() => {
    if (!esNavegador()) return;
    const load = () => {
      try {
        window.speechSynthesis.getVoices();
        setVoiceReady(true);
      } catch { /* noop */ }
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => stopTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sonarNativa = useCallback((texto: string) => {
    if (!esNavegador()) return;
    setFuente('nativa');
    setIsSpeaking(true);
    speakNativo(texto, () => setIsSpeaking(true), () => setIsSpeaking(false));
  }, []);

  const reproducirUrl = useCallback(
    (url: string, textoRespaldo: string, turno: number) => {
      if (turno !== turnoRef.current) return; // una voz más nueva tomó el turno
      stopTodoBase();
      setIsSpeaking(true);
      const a = new Audio(url);
      audioRef.current = a;
      a.onended = () => {
        if (turno === turnoRef.current) setIsSpeaking(false);
      };
      a.onerror = () => {
        // Audio dañado: no sonar robot, avisar y dejar reintentar
        setIsSpeaking(false);
        setFuente('ninguna');
        setMotivo('otro');
      };
      a.play().catch((err: any) => {
        // Chrome bloquea audio sin gesto previo del usuario
        if (err?.name === 'NotAllowedError') {
          setNecesitaToque(true);
          setIsSpeaking(false);
          return;
        }
        setIsSpeaking(false);
        setFuente('ninguna');
        setMotivo('otro');
      });
    },
    [stopTodo]
  );

  // Resuelve un texto a URL de audio reproducible (cachés + fijos + backend).
  // Devuelve null si fue cancelado o falló. Nunca habla por sí sola.
  const resolverAudio = useCallback(
    async (corto: string, voz: string, turno: number): Promise<string | null> => {
      const cacheKey = `v4:${voz}:${corto}`;
      if (lastAudio.current && lastAudio.current.texto === corto && lastAudio.current.voz === voz) {
        return lastAudio.current.url;
      }
      const enCache = cache.current.get(cacheKey);
      if (enCache) {
        lastAudio.current = { url: enCache, texto: corto, voz };
        return enCache;
      }
      const fijo = AUDIO_FIJO[corto];
      if (fijo) {
        lastAudio.current = { url: fijo, texto: corto, voz };
        return fijo;
      }
      try {
        const ctrl = new AbortController();
        fetchCtrl.current = ctrl;
        const r = await fetch('/api/voz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texto: corto, voz }),
          signal: ctrl.signal,
        });
        if (turno !== turnoRef.current) return null;
        if (r.ok) {
          const data = await r.json();
          if (data?.audio) {
            const url = `data:${data.mime || 'audio/wav'};base64,${data.audio}`;
            cache.current.set(cacheKey, url);
            if (cache.current.size > 60) {
              const first = cache.current.keys().next().value;
              if (first) cache.current.delete(first);
            }
            lastAudio.current = { url, texto: corto, voz };
            return url;
          }
        }
        let msg = '';
        try {
          msg = (await r.json())?.error || '';
        } catch { /* noop */ }
        if (turno === turnoRef.current) setMotivo(clasificarError(msg, r.status));
        return null;
      } catch (err: any) {
        if (err?.name === 'AbortError') return null; // cancelado por una voz nueva
        if (turno === turnoRef.current) setMotivo('apagado');
        return null;
      }
    },
    []
  );

  const speak = useCallback(
    async (texto: string) => {
      if (!enabled || muted) return;
      const turno = turnoRef.current + 1;
      turnoRef.current = turno;
      // El clon no pronuncia emojis: se limpian para que la clave coincida
      // con la generada por `npm run voz:clon`.
      const corto = textoHablado(texto).slice(0, 160);
      lastText.current = corto;
      const voz = VOZ_UNICA;
      const url = await resolverAudio(corto, voz, turno);
      if (turno !== turnoRef.current) return; // otra voz tomó el turno
      if (!url) {
        // Ultimo recurso: voz del navegador (solo si el clon no esta disponible)
        setFuente('nativa');
        setMotivo(null);
        sonarNativa(corto);
        return;
      }
      setFuente('clon');
      setMotivo(null);
      reproducirUrl(url, corto, turno);
    },
    [enabled, muted, reproducirUrl, resolverAudio, sonarNativa]
  );

  // Habla varios textos en orden, sin traslapes. Si llega un speak() nuevo,
  // la secuencia se cancela. Resuelve true solo si terminó completa.
  const hablarSecuencia = useCallback(
    async (textos: string[]): Promise<boolean> => {
      if (!enabled || muted) return false;
      const turno = turnoRef.current + 1;
      turnoRef.current = turno;
      const voz = VOZ_UNICA;
      for (const t of textos) {
        if (turno !== turnoRef.current) return false;
        const corto = textoHablado(t).slice(0, 160);
        lastText.current = corto;
        const url = await resolverAudio(corto, voz, turno);
        if (turno !== turnoRef.current || !url) {
          // Ultimo recurso: voz del navegador
          setFuente('nativa');
          setMotivo(null);
          sonarNativa(corto);
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        setFuente('clon');
        setMotivo(null);
        const ok = await new Promise<boolean>((fin) => {
          if (turno !== turnoRef.current) return fin(false);
          stopTodoBase();
          setIsSpeaking(true);
          const a = new Audio(url);
          audioRef.current = a;
          a.onended = () => {
            if (turno === turnoRef.current) setIsSpeaking(false);
            fin(turno === turnoRef.current);
          };
          a.onerror = () => {
            if (turno === turnoRef.current) {
              setIsSpeaking(false);
              setFuente('ninguna');
              setMotivo('otro');
            }
            fin(false);
          };
          a.play().catch((err: any) => {
            if (err?.name === 'NotAllowedError' && turno === turnoRef.current) {
              setNecesitaToque(true);
              setIsSpeaking(false);
            } else if (turno === turnoRef.current) {
              setIsSpeaking(false);
              setFuente('ninguna');
              setMotivo('otro');
            }
            fin(false);
          });
        });
        if (!ok) return false;
        await new Promise((r) => setTimeout(r, 250)); // respiro entre frases
      }
      return true;
    },
    [enabled, muted, resolverAudio, stopTodoBase, sonarNativa]
  );

  // Primer toque del niño/adulto desbloquea el audio del navegador
  useEffect(() => {
    if (!esNavegador()) return;
    const desbloquear = () => {
      setNecesitaToque(false);
      if (lastText.current) speak(lastText.current);
    };
    window.addEventListener('pointerdown', desbloquear, { once: true });
    window.addEventListener('keydown', desbloquear, { once: true });
    return () => {
      window.removeEventListener('pointerdown', desbloquear);
      window.removeEventListener('keydown', desbloquear);
    };
  }, [speak]);

  const repeat = useCallback(() => {
    setNecesitaToque(false);
    if (lastAudio.current) {
      reproducirUrl(lastAudio.current.url, lastAudio.current.texto, turnoRef.current);
      return;
    }
    if (lastText.current) speak(lastText.current);
  }, [speak, reproducirUrl]);

  const cambiarVoz = useCallback(
    (_id: string) => {
      // Voz única: siempre Callirrhoe
      setVoz(VOZ_UNICA);
      setVozNombreState(VOZ_UNICA);
      lastAudio.current = null;
      stopTodo();
    },
    [stopTodo]
  );

  const probarVoz = useCallback(() => {
    setNecesitaToque(false);
    speak('Hola, soy Léo. Vamos a leer juntitos con amor.');
  }, [speak]);

  // Reintenta la última frase con la voz suave (botón del aviso)
  const reintentarVoz = useCallback(() => {
    setMotivo(null);
    setNecesitaToque(false);
    if (lastText.current) speak(lastText.current);
  }, [speak]);

  // Solo para emergencias, si el adulto lo pide a propósito
  const usarVozBasica = useCallback(() => {
    setMotivo(null);
    setNecesitaToque(false);
    if (lastText.current) sonarNativa(lastText.current);
  }, [sonarNativa]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      try {
        localStorage.setItem('lee_muted', next ? '1' : '0');
      } catch { /* noop */ }
      if (next) stopTodo();
      return next;
    });
  }, [stopTodo]);

  return { speak, hablarSecuencia, repeat, stop: stopTodo, isSpeaking, muted, toggleMute, voiceReady, fuente, motivo, necesitaToque, vozNombre, cambiarVoz, probarVoz, reintentarVoz, usarVozBasica };
}
