import { useState, useCallback, useEffect } from 'react';

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
  const palabras = texto.split(' ');
  const [audioIdx, setAudioIdx] = useState(0);

  const leerSiguiente = useCallback(async () => {
    if (audioIdx >= palabras.length) {
      setTerminado(true);
      onTerminado();
      return;
    }
    setPalabraActiva(audioIdx);
    speak(palabras[audioIdx]);
    // Esperar un poco antes de la siguiente palabra
    setTimeout(() => {
      setAudioIdx((siguiente) => siguiente + 1);
    }, 600);
  }, [palabras, audioIdx, speak, onTerminado]);

  const empezar = useCallback(() => {
    setPalabraActiva(null);
    setAudioIdx(0);
    setTerminado(false);
    leerSiguiente();
  }, [leerSiguiente]);

  useEffect(() => {
    if (!terminado && audioIdx === 0 && palabras.length > 0) {
      empezar();
    }
  }, [empezar, terminado, audioIdx, palabras.length]);

  return (
    <div className="storytime" style={{ textAlign: 'center', padding: '1rem', background: 'rgba(255,255,255,0.2)', borderRadius: '22px', margin: '1rem 0' }}>
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
      {terminado && (
        <div style={{ marginTop: '1rem' }}>
          <p style={{ color: '#28a745', fontWeight: '800' }}>¡Cuento terminado!</p>
        </div>
      )}
    </div>
  );
}
