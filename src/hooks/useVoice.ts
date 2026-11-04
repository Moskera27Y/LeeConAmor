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

function speakNativo(texto: string, onStart: () => void, onEnd: () => void, rate = 0.85) {
  if (!esNavegador()) {
    onEnd();
    return;
  }
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = 'es-ES';
    u.rate = rate;
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

// Tope de frases del clon guardadas en memoria. Con data-URLs base64 podían
// acumularse decenas de MB en tablets modestas; ahora se guardan como Blob
// (object URL) y se revocan al salir de la caché.
const MAX_AUDIO_CACHE = 24;

function dataUrlABlobUrl(base64: string, mime: string): string {
  try {
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return URL.createObjectURL(new Blob([bytes], { type: mime }));
  } catch {
    return `data:${mime};base64,${base64}`;
  }
}

function revocarUrl(url: string | undefined) {
  if (url && url.startsWith('blob:')) {
    try { URL.revokeObjectURL(url); } catch { /* noop */ }
  }
}

// Voz de Léo = la CLONADA (ver api/voz.ts y public/audio). Orden:
//   1. audio pregenerado con el clon  -> lo normal, gratis e instantaneo
//   2. /api/voz -> llama al clon (Space o local)
//   3. voz del navegador -> solo si el clon no existe en absoluto
// Nunca se usa una voz sintetica de pago.
export function useVoice(enabled: boolean) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  // Voz ocupada de punta a punta: true desde que se pide una frase hasta que
  // terminó de sonar INCLUIDOS los respiros entre frases de una secuencia.
  // Es la señal que usan los juegos para saber cuándo el peque puede tocar.
  const [vozOcupada, setVozOcupada] = useState(false);
  // Segundos que faltan del clip actual (contador del indicador de espera).
  const [restante, setRestante] = useState(0);
  const [fuente, setFuente] = useState<'clon' | 'nativa' | 'ninguna'>('ninguna');
  const [motivo, setMotivo] = useState<MotivoVoz>(null);
  const [necesitaToque, setNecesitaToque] = useState(false);
  const [vozNombre, setVozNombreState] = useState(getVoz());
  // Voz despacio (para primeros lectores): baja la velocidad del clon y de
  // la voz nativa. Se guarda por dispositivo.
  const [vozLenta, setVozLenta] = useState(() => {
    try {
      return localStorage.getItem('lee_voz_lenta') === '1';
    } catch {
      return false;
    }
  });
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
    setVozOcupada(false);
    setRestante(0);
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
    return () => {
      stopTodo();
      for (const url of cache.current.values()) revocarUrl(url);
      cache.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Suelta la señal de "voz ocupada" (fin de frase o secuencia).
  const soltarVoz = useCallback(() => {
    setVozOcupada(false);
    setRestante(0);
  }, []);

  // Voz nativa esperando su final real (antes se asumían 1500 ms fijos y se
  // cortaba la app aunque la frase siguiera sonando). El tope es solo red de
  // seguridad: si onend no llega, no dejar la app esperando para siempre.
  const sonarNativaYEsperar = useCallback((texto: string) => {
    return new Promise<void>((resolve) => {
      if (!esNavegador()) return resolve();
      let terminado = false;
      const fin = () => {
        if (terminado) return;
        terminado = true;
        setIsSpeaking(false);
        resolve();
      };
      setFuente('nativa');
      setIsSpeaking(true);
      speakNativo(texto, () => setIsSpeaking(true), fin, vozLenta ? 0.68 : 0.85);
      setTimeout(fin, Math.min(18000, Math.max(2200, texto.length * 100)));
    });
  }, [vozLenta]);

  // Reproduce una URL y resuelve true solo si la frase terminó sonando con el
  // turno vigente. reproducirUrl (fire-and-forget) y hablarSecuencia lo usan.
  const reproducirYEsperar = useCallback((url: string, turno: number): Promise<boolean> => {
    return new Promise<boolean>((fin) => {
      if (turno !== turnoRef.current) return fin(false); // una voz más nueva tomó el turno
      stopTodoBase();
      setVozOcupada(true);
      setIsSpeaking(true);
      const a = new Audio(url);
      audioRef.current = a;
      // Voz despacio: reproduce el audio clonado un poco más lento.
      a.playbackRate = vozLenta ? 0.85 : 1;
      // Contador del indicador de espera: segundos que faltan del clip.
      a.ontimeupdate = () => {
        if (turno !== turnoRef.current) return;
        const d = a.duration;
        if (Number.isFinite(d) && d > 0) setRestante(Math.max(1, Math.ceil(d - a.currentTime)));
      };
      a.onended = () => {
        if (turno === turnoRef.current) {
          setIsSpeaking(false);
          soltarVoz();
        }
        fin(turno === turnoRef.current);
      };
      a.onerror = () => {
        // Audio dañado: no sonar robot, avisar y dejar reintentar
        if (turno === turnoRef.current) {
          setIsSpeaking(false);
          soltarVoz();
          setFuente('ninguna');
          setMotivo('otro');
        }
        fin(false);
      };
      a.play().catch((err: { name?: string } | null) => {
        // Chrome bloquea audio sin gesto previo del usuario
        if (err?.name === 'NotAllowedError' && turno === turnoRef.current) {
          setNecesitaToque(true);
          setIsSpeaking(false);
          soltarVoz();
        } else if (turno === turnoRef.current) {
          setIsSpeaking(false);
          soltarVoz();
          setFuente('ninguna');
          setMotivo('otro');
        }
        fin(false);
      });
    });
  }, [stopTodoBase, soltarVoz, vozLenta]);

  const reproducirUrl = useCallback(
    (url: string, turno: number) => {
      void reproducirYEsperar(url, turno);
    },
    [reproducirYEsperar],
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
      let timeoutId: number | undefined;
      let expiro = false;
      try {
        const ctrl = new AbortController();
        fetchCtrl.current = ctrl;
        // Si el clon no responde, se cae a la voz nativa en vez de dejar la
        // interfaz esperando hasta el límite del servidor.
        timeoutId = window.setTimeout(() => { expiro = true; ctrl.abort(); }, 25000);
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
            const url = dataUrlABlobUrl(data.audio, data.mime || 'audio/wav');
            cache.current.set(cacheKey, url);
            while (cache.current.size > MAX_AUDIO_CACHE) {
              const primera = cache.current.keys().next().value;
              if (!primera) break;
              const vieja = cache.current.get(primera);
              cache.current.delete(primera);
              // Si la última frase sonada era la expulsada, repeat() debe
              // volver a resolverla en vez de reproducir una URL muerta.
              if (vieja && lastAudio.current?.url === vieja) lastAudio.current = null;
              revocarUrl(vieja);
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
        if (err?.name === 'AbortError') {
          // Abort por cancelación (una voz nueva tomó el turno) o por timeout
          // del clon. Solo avisamos si la frase sigue vigente.
          if (expiro && turno === turnoRef.current) setMotivo('apagado');
          return null;
        }
        if (turno === turnoRef.current) setMotivo('apagado');
        return null;
      } finally {
        if (timeoutId) window.clearTimeout(timeoutId);
      }
    },
    []
  );

  const speak = useCallback(
    async (texto: string) => {
      if (!enabled || muted) return;
      const turno = turnoRef.current + 1;
      turnoRef.current = turno;
      setVozOcupada(true);
      // El clon no pronuncia emojis: se limpian para que la clave coincida
      // con la generada por `npm run voz:clon`.
      const corto = textoHablado(texto).slice(0, 160);
      lastText.current = corto;
      const voz = VOZ_UNICA;
      const url = await resolverAudio(corto, voz, turno);
      if (turno !== turnoRef.current) return; // otra voz tomó el turno
      if (!url) {
        // Ultimo recurso: voz del navegador (solo si el clon no esta disponible).
        // Se conserva el motivo para que la zona de padres sepa que el clon falló.
        setFuente('nativa');
        await sonarNativaYEsperar(corto);
        if (turno === turnoRef.current) soltarVoz();
        return;
      }
      setFuente('clon');
      setMotivo(null);
      reproducirUrl(url, turno); // reproducirYEsperar suelta la voz al terminar
    },
    [enabled, muted, reproducirUrl, resolverAudio, sonarNativaYEsperar, soltarVoz]
  );

  // Habla varios textos en orden, sin traslapes. Si llega un speak() nuevo,
  // la secuencia se cancela. Resuelve true solo si terminó completa.
  const hablarSecuencia = useCallback(
    async (textos: string[]): Promise<boolean> => {
      if (!enabled || muted) return false;
      const turno = turnoRef.current + 1;
      turnoRef.current = turno;
      setVozOcupada(true);
      const voz = VOZ_UNICA;
      for (const t of textos) {
        if (turno !== turnoRef.current) return false;
        const corto = textoHablado(t).slice(0, 160);
        lastText.current = corto;
        const url = await resolverAudio(corto, voz, turno);
        if (turno !== turnoRef.current) return false;
        if (!url) {
          // Ultimo recurso: voz del navegador (se espera a que termine).
          // Se conserva el motivo para el aviso de la zona de padres.
          await sonarNativaYEsperar(corto);
          if (turno !== turnoRef.current) return false;
          continue;
        }
        setFuente('clon');
        setMotivo(null);
        const ok = await reproducirYEsperar(url, turno);
        if (turno !== turnoRef.current) return false;
        if (!ok) { soltarVoz(); return false; }
        // Sigue siendo el turno de la voz durante el respiro: así el
        // indicador de espera no parpadea entre frases.
        setVozOcupada(true);
        await new Promise((r) => setTimeout(r, 250)); // respiro entre frases
      }
      soltarVoz();
      return true;
    },
    [enabled, muted, resolverAudio, reproducirYEsperar, sonarNativaYEsperar, soltarVoz]
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
    if (!enabled || muted) return;
    setNecesitaToque(false);
    const texto = lastText.current;
    if (!texto) return;
    // Re-resuelve SIEMPRE la última frase pedida. Reproducir lastAudio a
    // ciegas podía sonar una frase ANTERIOR (p. ej. "Toca la letra N" de la
    // ronda pasada) cuando el speak de la ronda actual falló o fue cancelado.
    const turno = turnoRef.current + 1;
    turnoRef.current = turno;
    if (lastAudio.current && lastAudio.current.texto === texto) {
      // Misma frase: replay instantáneo del audio ya resuelto.
      reproducirUrl(lastAudio.current.url, turno);
      return;
    }
    speak(texto);
  }, [enabled, muted, speak, reproducirUrl]);

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
    if (!lastText.current) return;
    const turno = turnoRef.current + 1;
    turnoRef.current = turno;
    setVozOcupada(true);
    void sonarNativaYEsperar(lastText.current).then(() => {
      if (turno === turnoRef.current) soltarVoz();
    });
  }, [sonarNativaYEsperar, soltarVoz]);

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

  const toggleVozLenta = useCallback(() => {
    setVozLenta((v) => {
      const next = !v;
      try {
        localStorage.setItem('lee_voz_lenta', next ? '1' : '0');
      } catch { /* noop */ }
      return next;
    });
  }, []);

  return { speak, hablarSecuencia, repeat, stop: stopTodo, isSpeaking, vozOcupada, restanteSeg: restante, muted, toggleMute, vozLenta, toggleVozLenta, voiceReady, fuente, motivo, necesitaToque, vozNombre, cambiarVoz, probarVoz, reintentarVoz, usarVozBasica };
}
