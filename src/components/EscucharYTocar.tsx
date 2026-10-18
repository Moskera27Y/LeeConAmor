import { useState, useCallback } from 'react';
import { speak as speakGlobal } from '../hooks/useVoice';

interface Props {
  objetivo: string;
  opciones: string[];
  correcta: string;
  imagen?: string;
  pista?: string;
  speak: (t: string) => void;
  hablarSecuencia: (t: string[]) => Promise<boolean>;
  onCorrecto: () => void;
  onError: () => void;
  isSpeaking: boolean;
}

export default function EscucharYTocar({
  objetivo, opciones, correcta, imagen, pista, speak, hablarSecuencia, onCorrecto, onError, isSpeaking,
}: Props) {
  const [seleccionada, setSeleccionada] = useState<string | null>(null);
  const [resultado, setResultado] = useState<'correcto' | 'incorrecto' | null>(null);
  const [escuchado, setEscuchado] = useState(false);

  const escucharYResponder = useCallback(async () => {
    if (isSpeaking) return;
    setSeleccionada(null);
    setResultado(null);
    setEscuchado(false);
    await hablarSecuencia([`${objetivo}. ${pista || ''}. Toca: ${objetivo}.`]);
    setEscuchado(true);
  }, [objetivo, pista, hablarSecuencia, isSpeaking]);

  const tocar = (opcion: string) => {
    if (resultado || !escuchado) return;
    setSeleccionada(opcion);
    if (opcion === correcta) {
      setResultado('correcto');
      speak(`¡Muy bien! Dijiste ${objetivo} clarito.`);
      onCorrecto();
    } else {
      setResultado('incorrecto');
      speak(`Casi. El sonido era ${objetivo}.`);
      onError();
    }
  };

  return (
    <div className="escuchar-tocar" style={{ textAlign: 'center', padding: '1rem' }}>
      {imagen && <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>{imagen}</div>}
      <p style={{ fontSize: '1.3rem', fontWeight: '800', color: '#333', margin: '0 0 1rem' }}>
        {resultado ? (resultado === 'correcto' ? '¡Correcto!' : 'Intenta otra vez') : escuchado ? `Toca: ${objetivo}` : 'Escucha a Léo'}
      </p>
      <button
        className="listen-btn"
        onClick={escucharYResponder}
        disabled={isSpeaking || escuchado}
        style={{ marginBottom: '1rem', minHeight: '56px' }}
      >
        {isSpeaking ? '🦉 Escuchando…' : '🔊 Escuchar'}
      </button>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.8rem' }}>
        {opciones.map((op) => (
          <button
            key={op}
            onClick={() => tocar(op)}
            disabled={resultado || !escuchado || isSpeaking}
            className={`letter-btn ${seleccionada === op ? (resultado === 'correcto' ? 'selected' : '') : ''} ${resultado === 'incorrecto' && seleccionada === op ? 'wrong' : ''}`}
            style={{ width: '88px', height: '88px', fontSize: '2rem' }}
          >
            {op}
          </button>
        ))}
      </div>
    </div>
  );
}
