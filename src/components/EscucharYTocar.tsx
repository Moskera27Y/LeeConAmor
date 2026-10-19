import { useState, useCallback } from 'react';
import { FRASES_VOZ } from '../data/frasesVoz';
import { F_BIEN_LECTURA, F_ERROR_CASI } from '../data/frases';

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
    await hablarSecuencia([FRASES_VOZ.escuchaYTocar]);
    setEscuchado(true);
  }, [objetivo, pista, hablarSecuencia, isSpeaking]);

  const tocar = (opcion: string) => {
    if (resultado || !escuchado) return;
    setSeleccionada(opcion);
    if (opcion === correcta) {
      setResultado('correcto');
      speak(F_BIEN_LECTURA);
      onCorrecto();
    } else {
      setResultado('incorrecto');
      speak(F_ERROR_CASI);
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
