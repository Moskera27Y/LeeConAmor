import { useState, useCallback, useEffect, useRef } from 'react';
import { F_BIEN_LECTURA, F_ERROR_CASI } from '../data/frases';
import { FRASES_VOZ } from '../data/frasesVoz';

interface SonidoMemoria {
  id: string;
  emoji: string;
  texto: string;
}

const SONIDOS: SonidoMemoria[] = [
  { id: 'a', emoji: '🍎', texto: 'A' },
  { id: 'e', emoji: '🐘', texto: 'E' },
  { id: 'i', emoji: '🏝️', texto: 'I' },
  { id: 'o', emoji: '⚽', texto: 'O' },
  { id: 'u', emoji: '🍇', texto: 'U' },
  { id: 'ma', emoji: '👋', texto: 'MA' },
  { id: 'pa', emoji: '👨', texto: 'PA' },
  { id: 'sa', emoji: '🐍', texto: 'SA' },
  { id: 'la', emoji: '🌙', texto: 'LA' },
  { id: 'ta', emoji: '🥁', texto: 'TA' },
];

interface Props {
  speak: (t: string) => void;
  hablarSecuencia: (t: string[]) => Promise<boolean>;
  onCorrecto: () => void;
  onError: () => void;
  isSpeaking: boolean;
  sinVoz?: boolean;
}

export default function MemoriaAuditiva({
  speak, hablarSecuencia, onCorrecto, onError, isSpeaking, sinVoz = false,
}: Props) {
  const [secuencia, setSecuencia] = useState<string[]>([]);
  const [turnoUsuario, setTurnoUsuario] = useState<number>(0);
  const [resultado, setResultado] = useState<'correcto' | 'incorrecto' | null>(null);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [nivel, setNivel] = useState(1);
  const [pistaVisible, setPistaVisible] = useState(false);
  const timers = useRef<number[]>([]);

  const NIVEL_MAX = 6;

  const programar = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  };

  useEffect(() => {
    return () => {
      timers.current.forEach((id) => window.clearTimeout(id));
      timers.current = [];
    };
  }, []);

  const textoDe = useCallback((id: string) => SONIDOS.find((s) => s.id === id)?.texto || id, []);

  const reproducir = useCallback(async (ids: string[], instruccion: boolean) => {
    setReproduciendo(true);
    const textos = ids.map((id) => textoDe(id));
    const frases: string[] = instruccion ? [FRASES_VOZ.memoria, ...textos] : textos;
    await hablarSecuencia(frases);
    setReproduciendo(false);
  }, [hablarSecuencia, textoDe]);

  const iniciarSecuencia = useCallback(async (nivelActual: number) => {
    setResultado(null);
    setTurnoUsuario(0);
    setPistaVisible(sinVoz);
    const nuevaSecuencia: string[] = [];
    for (let i = 0; i < nivelActual; i++) {
      const sonido = SONIDOS[Math.floor(Math.random() * SONIDOS.length)];
      nuevaSecuencia.push(sonido.id);
    }
    setSecuencia(nuevaSecuencia);
    // Habla la instrucción y luego la secuencia completa, sin cortarse.
    await reproducir(nuevaSecuencia, true);
  }, [reproducir, sinVoz]);

  const repetir = () => {
    if (reproduciendo || !secuencia.length) return;
    setTurnoUsuario(0);
    reproducir(secuencia, false);
  };

  const elegirSonido = (id: string) => {
    if (resultado || reproduciendo) return;
    const esperado = secuencia[turnoUsuario];
    if (id === esperado) {
      setTurnoUsuario(turnoUsuario + 1);
      if (turnoUsuario + 1 >= secuencia.length) {
        setResultado('correcto');
        speak(F_BIEN_LECTURA);
        const siguienteNivel = Math.min(NIVEL_MAX, nivel + 1);
        setNivel(siguienteNivel);
        onCorrecto();
        programar(() => {
          setResultado(null);
          iniciarSecuencia(siguienteNivel);
        }, 1800);
      }
    } else {
      setResultado('incorrecto');
      speak(F_ERROR_CASI);
      onError();
      programar(() => {
        setResultado(null);
        setNivel(1);
        iniciarSecuencia(1);
      }, 2000);
    }
  };

  useEffect(() => {
    iniciarSecuencia(nivel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPistaVisible(sinVoz && secuencia.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sinVoz]);

  return (
    <div className="memoria-auditiva" style={{ textAlign: 'center', padding: '1rem' }}>
      <p style={{ fontSize: '1.3rem', fontWeight: '800', color: '#333', margin: '0 0 1rem' }}>
        {resultado ? (resultado === 'correcto' ? '¡Correcto!' : 'Intenta otra vez') : reproduciendo ? 'Escucha la secuencia…' : 'Memoriza y repite'}
      </p>
      <p style={{ fontSize: '1rem', color: '#666', margin: '0 0 1rem' }}>
        Nivel {nivel}/{NIVEL_MAX} · Recuerda {secuencia.length} sonido{secuencia.length !== 1 ? 's' : ''}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.6rem', marginBottom: '1rem' }}>
        {SONIDOS.map((s) => (
          <button
            key={s.id}
            onClick={() => elegirSonido(s.id)}
            disabled={!!resultado || reproduciendo || turnoUsuario >= secuencia.length}
            className={`letter-btn ${turnoUsuario > 0 && secuencia[turnoUsuario - 1] === s.id ? 'selected' : ''}`}
            style={{
              width: '72px',
              height: '72px',
              fontSize: '2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.25rem',
            }}
          >
            <span>{s.emoji}</span>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#333' }}>{s.texto}</span>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <button
          className="listen-btn"
          onClick={repetir}
          disabled={reproduciendo || !secuencia.length || sinVoz}
          style={{ minHeight: '48px' }}
        >
          {reproduciendo ? '🦉 Escuchando…' : '🔁 Repetir'}
        </button>
        {sinVoz && (
          <button
            className="ghost-btn"
            onClick={() => setPistaVisible((v) => !v)}
            disabled={!secuencia.length}
            style={{ minHeight: '48px' }}
          >
            {pistaVisible ? '🙈 Ocultar pista' : '👀 Ver pista'}
          </button>
        )}
      </div>

      {sinVoz && pistaVisible && secuencia.length > 0 && (
        <div style={{ marginBottom: '0.8rem' }} aria-label="Pista visual de la secuencia">
          <p style={{ color: '#666', fontSize: '0.9rem', margin: '0 0 0.4rem' }}>
            Voz apagada: mira la secuencia y luego repítela.
          </p>
          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {secuencia.map((id, i) => {
              const s = SONIDOS.find((x) => x.id === id);
              return (
                <span key={`${id}-${i}`} className="memoria-pista" style={{ fontSize: '1.8rem' }}>
                  {s?.emoji || id}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {!secuencia.length && !reproduciendo && !resultado && (
        <p style={{ color: '#666', fontSize: '0.9rem' }}>Preparando secuencia…</p>
      )}
    </div>
  );
}
