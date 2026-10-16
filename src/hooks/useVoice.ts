import { useCallback, useEffect, useRef, useState } from 'react';
import { VOZ_UNICA, getVoz, setVoz } from '../data/voces';
import { AUDIO_FIJO } from '../data/audioFijo';

export type MotivoVoz = null | 'apagado' | 'key' | 'cuota' | 'otro';

function pickSpanishVoice(): SpeechSynthesisVoice | null {
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

// Voz híbrida: SOLO la suave de Gemini. Si falla, NO suena ningún robot:
// muestra el motivo y un botón para reintentar. La básica solo suena si el
// adulto la pide a propósito (usarVozBasica).
export function useVoice(enabled: boolean) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [fuente, setFuente] = useState<'gemini' | 'nativa' | 'ninguna'>('ninguna');
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

  const stopTodo = useCallback(() => {
    try {
      audioRef.current?.pause();
      audioRef.current = null;
    } catch { /* noop */ }
    try {
      window.speechSynthesis.cancel();
    } catch { /* noop */ }
    setIsSpeaking(false);
  }, []);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const load = () => {
      window.speechSynthesis.getVoices();
      setVoiceReady(true);
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => stopTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sonarNativa = useCallback((texto: string) => {
    if ('speechSynthesis' in window) {
      setFuente('nativa');
      setIsSpeaking(true);
      speakNativo(texto, () => setIsSpeaking(true), () => setIsSpeaking(false));
    } else {
      setFuente('ninguna');
      setIsSpeaking(false);
    }
  }, []);

  const reproducirUrl = useCallback(
    (url: string, textoRespaldo: string) => {
      stopTodo();
      setIsSpeaking(true);
      const a = new Audio(url);
      audioRef.current = a;
      a.onended = () => setIsSpeaking(false);
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

  const speak = useCallback(
    async (texto: string) => {
      if (!enabled || muted) return;
      const corto = texto.length > 160 ? texto.slice(0, 160) : texto;
      lastText.current = corto;
      const voz = VOZ_UNICA;
      const cacheKey = `v4:${voz}:${corto}`;
      if (lastAudio.current && lastAudio.current.texto === corto && lastAudio.current.voz === voz) {
        reproducirUrl(lastAudio.current.url, corto);
        setFuente('gemini');
        setMotivo(null);
        return;
      }
      const enCache = cache.current.get(cacheKey);
      if (enCache) {
        lastAudio.current = { url: enCache, texto: corto, voz };
        reproducirUrl(enCache, corto);
        setFuente('gemini');
        setMotivo(null);
        return;
      }
      // Audio fijo pregenerado (public/audio): no gasta cuota jamás
      const fijo = AUDIO_FIJO[corto];
      if (fijo) {
        lastAudio.current = { url: fijo, texto: corto, voz };
        reproducirUrl(fijo, corto);
        setFuente('gemini');
        setMotivo(null);
        return;
      }
      try {
        const r = await fetch('/api/voz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texto: corto, voz }),
        });
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
            reproducirUrl(url, corto);
            setFuente('gemini');
            setMotivo(null);
            return;
          }
        }
        let msg = '';
        try {
          msg = (await r.json())?.error || '';
        } catch { /* noop */ }
        setMotivo(clasificarError(msg, r.status));
      } catch {
        setMotivo('apagado');
      }
      // Sin robot automático: solo voz suave. El adulto reintenta con el botón.
      setFuente('ninguna');
      setIsSpeaking(false);
    },
    [enabled, muted, reproducirUrl]
  );

  // Primer toque del niño/adulto desbloquea el audio del navegador
  useEffect(() => {
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
      reproducirUrl(lastAudio.current.url, lastAudio.current.texto);
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

  return { speak, repeat, stop: stopTodo, isSpeaking, muted, toggleMute, voiceReady, fuente, motivo, necesitaToque, vozNombre, cambiarVoz, probarVoz, reintentarVoz, usarVozBasica };
}
