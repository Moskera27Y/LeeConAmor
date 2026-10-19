import { useState, useCallback, useRef } from 'react';

interface Props {
  texto: string;
  speak: (t: string) => void;
  hablarSecuencia: (t: string[]) => Promise<boolean>;
  onTerminado: () => void;
  isSpeaking: boolean;
}

export default function Storytime({
  texto, speak, hablarSecuencia, onTerminado, isSpeaking,
}: Props) {
  const [palabraActiva, setPalabraActiva] = useState<number | null>(null);
  const [terminado, setTerminado] = useState(false);
  const [leyendo, setLeyendo] = useState(false);
  const avisado = useRef(false);
  const palabras = texto.split(/\s+/).filter(Boolean);

  const leerTodo = useCallback(async () => {
    if (leyendo) return;
    setLeyendo(true);
    setTerminado(false);
    for (let i = 0; i < palabras.length; i++) {
      setPalabraActiva(i);
      // Cada palabra espera a que termine su audio: sin cortes ni traslapes.
      const ok = await hablarSecuencia([palabras[i]]);
      if (!ok) {
        setPalabraActiva(null);
        setLeyendo(false);
        return;
      }
    }
    setPalabraActiva(null);
    setLeyendo(false);
    setTerminado(true);
    if (!avisado.current) {
      avisado.current = true;
      onTerminado();
    }
  }, [palabras, hablarSecuencia, leyendo, onTerminado]);

  return (
    <div className="storytime" style={{ textAlign: 'center', margin: '1rem 0' }}>
      <p style={{ fontSize: '1.2rem', fontWeight: '800', color: '#764ba2', marginBottom: '1rem' }}>
        📖 Storytime con Léo
      </p>
      <div style={{ fontSize: '1.5rem', lineHeight: '2', margin: '1rem 0', minHeight: '4rem' }}>
        {palabras.map((p, i) => (
          <span
            key={`${p}-${i}`}
            style={{
              margin: '0 0.2rem',
              fontWeight: palabraActiva === i ? '900' : 'normal',
              color: palabraActiva === i ? '#764ba2' : '#333',
              transform: palabraActiva === i ? 'scale(1.1)' : 'scale(1)',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
            }}
            onClick={() => {
              setPalabraActiva(i);
              speak(p);
            }}
          >
            {p}
          </span>
        ))}
      </div>
      <button
        className="listen-btn"
        onClick={leerTodo}
        disabled={leyendo}
        style={{ minHeight: '48px' }}
      >
        {leyendo ? '🦉 Leyendo…' : '🔊 Leer el cuento'}
      </button>
      {terminado && (
        <div style={{ marginTop: '1rem' }}>
          <p style={{ color: '#28a745', fontWeight: '800' }}>¡Cuento terminado!</p>
        </div>
      )}
    </div>
  );
}
