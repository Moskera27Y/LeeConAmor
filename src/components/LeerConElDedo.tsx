import { useState, useCallback, useEffect } from 'react';

interface Props {
  objetivo: string;
  imagen?: string;
  speak: (t: string) => void;
  hablarSecuencia: (t: string[]) => Promise<boolean>;
  onCorrecto: () => void;
  onError: () => void;
  isSpeaking: boolean;
}

export default function LeerConElDedo({
  objetivo, imagen, speak, hablarSecuencia, onCorrecto, onError, isSpeaking,
}: Props) {
  const [letrasTocadas, setLetrasTocadas] = useState<Set<number>>(new Set());
  const [resultado, setResultado] = useState<'correcto' | 'incorrecto' | null>(null);
  const letras = objetivo.split('');

  const tocarLetra = (idx: number) => {
    if (resultado || letrasTocadas.has(idx)) return;
    setLetrasTocadas((prev) => new Set(prev).add(idx));
    speak(letras[idx]);
    if (letrasTocadas.size + 1 === letras.length) {
      setResultado('correcto');
      speak(`¡Muy bien! Leíste ${objetivo}.`);
      onCorrecto();
    }
  };

  const reiniciar = () => {
    setLetrasTocadas(new Set());
    setResultado(null);
  };

  useEffect(() => {
    if (resultado === 'correcto') return;
    // Auto-leer la primera letra después de un momento si no hay interacción
  }, []);

  return (
    <div className="leer-dedo" style={{ textAlign: 'center', padding: '1rem' }}>
      {imagen && <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>{imagen}</div>}
      <p style={{ fontSize: '1.3rem', fontWeight: '800', color: '#333', margin: '0 0 1rem' }}>
        Toca cada letra para oír su sonido: {objetivo}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
        {letras.map((letra, idx) => (
          <button
            key={`${letra}-${idx}`}
            onClick={() => tocarLetra(idx)}
            disabled={letrasTocadas.has(idx) || resultado || isSpeaking}
            className={`letter-btn ${letrasTocadas.has(idx) ? 'selected' : ''}`}
            style={{
              width: '72px',
              height: '72px',
              fontSize: '2rem',
              opacity: letrasTocadas.has(idx) ? 0.6 : 1,
            }}
          >
            {letra}
          </button>
        ))}
      </div>
      {resultado === 'correcto' && (
        <p style={{ color: '#28a745', fontWeight: '800' }}>¡Leíste ${objetivo}!</p>
      )}
      <button
        onClick={reiniciar}
        disabled={resultado || isSpeaking}
        className="ghost-btn"
        style={{ minHeight: '48px', fontSize: '0.9rem', marginTop: '0.5rem' }}
      >
        🔄 Volver a leer
      </button>
    </div>
  );
}
