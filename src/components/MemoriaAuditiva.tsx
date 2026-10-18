import { useState, useCallback, useEffect } from 'react';

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
}

export default function MemoriaAuditiva({
  speak, hablarSecuencia, onCorrecto, onError, isSpeaking,
}: Props) {
  const [secuencia, setSecuencia] = useState<string[]>([]);
  const [turnoUsuario, setTurnoUsuario] = useState<number>(0);
  const [resultado, setResultado] = useState<'correcto' | 'incorrecto' | null>(null);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [nivel, setNivel] = useState(1);

  const iniciarSecuencia = useCallback(async () => {
    setResultado(null);
    setTurnoUsuario(0);
    setReproduciendo(true);

    const nuevaSecuencia: string[] = [];
    for (let i = 0; i < nivel; i++) {
      const sonido = SONIDOS[Math.floor(Math.random() * SONIDOS.length)];
      nuevaSecuencia.push(sonido.id);
    }
    setSecuencia(nuevaSecuencia);

    for (const id of nuevaSecuencia) {
      const sonido = SONIDOS.find((s) => s.id === id)!;
      speak(sonido.texto);
      await new Promise((r) => setTimeout(r, 1200));
    }
    setReproduciendo(false);
  }, [nivel, speak, hablarSecuencia]);

  const elegirSonido = (id: string) => {
    if (resultado || reproduciendo) return;
    const esperado = secuencia[turnoUsuario];
    if (id === esperado) {
      setTurnoUsuario(turnoUsuario + 1);
      if (turnoUsuario + 1 >= secuencia.length) {
        setResultado('correcto');
        speak(`¡Muy bien! Recordaste ${secuencia.length} sonidos.`);
        setNivel(nivel + 1);
        onCorrecto();
        setTimeout(() => {
          setResultado(null);
          setTurnoUsuario(0);
          setSecuencia([]);
          iniciarSecuencia();
        }, 2000);
      }
    } else {
      setResultado('incorrecto');
      speak(`Casi. La secuencia era diferente. Intenta otra vez.`);
      onError();
      setTimeout(() => {
        setResultado(null);
        setTurnoUsuario(0);
        setSecuencia([]);
        setNivel(1);
        iniciarSecuencia();
      }, 2000);
    }
  };

  useEffect(() => {
    iniciarSecuencia();
  }, [iniciarSecuencia]);

  return (
    <div className="memoria-auditiva" style={{ textAlign: 'center', padding: '1rem' }}>
      <p style={{ fontSize: '1.3rem', fontWeight: '800', color: '#333', margin: '0 0 1rem' }}>
        {resultado ? (resultado === 'correcto' ? '¡Correcto!' : 'Intenta otra vez') : reproduciendo ? 'Escucha la secuencia…' : 'Memoriza y repite'}
      </p>
      <p style={{ fontSize: '1rem', color: '#666', margin: '0 0 1rem' }}>
        Nivel {nivel} · Recuerda {secuencia.length} sonido{secuencia.length !== 1 ? 's' : ''}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.6rem', marginBottom: '1rem' }}>
        {SONIDOS.map((s) => (
          <button
            key={s.id}
            onClick={() => elegirSonido(s.id)}
            disabled={resultado || reproduciendo || isSpeaking || turnoUsuario >= secuencia.length}
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

      {!secuencia.length && !reproduciendo && !resultado && (
        <p style={{ color: '#666', fontSize: '0.9rem' }}>Preparando secuencia…</p>
      )}
    </div>
  );
}
