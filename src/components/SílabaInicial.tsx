import { useState, useCallback } from 'react';
import { fraseSilabaInicial } from '../data/frasesVoz';
import { F_BIEN_LECTURA, F_ERROR_CASI } from '../data/frases';

interface Props {
  objetivo: string;
  palabra: string;
  imagen?: string;
  opciones: string[];
  speak: (t: string) => void;
  hablarSecuencia: (t: string[]) => Promise<boolean>;
  onCorrecto: () => void;
  onError: () => void;
  isSpeaking: boolean;
}

export default function SílabaInicial({
  objetivo, palabra, imagen, opciones, speak, hablarSecuencia, onCorrecto, onError, isSpeaking,
}: Props) {
  const [seleccionada, setSeleccionada] = useState<string | null>(null);
  const [resultado, setResultado] = useState<'correcto' | 'incorrecto' | null>(null);
  const [escuchado, setEscuchado] = useState(false);

  const escuchar = useCallback(async () => {
    if (isSpeaking) return;
    setSeleccionada(null);
    setResultado(null);
    setEscuchado(false);
    await hablarSecuencia([fraseSilabaInicial(palabra)]);
    setEscuchado(true);
  }, [palabra, objetivo, hablarSecuencia, isSpeaking]);

  const tocar = (opcion: string) => {
    if (resultado || !escuchado) return;
    setSeleccionada(opcion);
    if (opcion === objetivo) {
      setResultado('correcto');
      speak(F_BIEN_LECTURA);
      onCorrecto();
    } else {
      setResultado('incorrecto');
      speak(F_ERROR_CASI);
      onError();
    }
  };

  const reintentar = () => {
    setSeleccionada(null);
    setResultado(null);
    setEscuchado(true);
  };

  return (
    <div className="silaba-inicial" style={{ textAlign: 'center', padding: '1rem' }}>
      {imagen && <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>{imagen}</div>}
      <p style={{ fontSize: '1.3rem', fontWeight: '800', color: '#333', margin: '0 0 1rem' }}>
        {resultado ? (resultado === 'correcto' ? '¡Correcto!' : 'Intenta otra vez') : escuchado ? `¿Cuál es la primera sílaba de ${palabra}?` : 'Escucha a Léo'}
      </p>
      <button
        className="listen-btn"
        onClick={escuchar}
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
            disabled={resultado !== null || !escuchado || isSpeaking}
            className={`letter-btn ${seleccionada === op ? (resultado === 'correcto' ? 'selected' : '') : ''} ${resultado === 'incorrecto' && seleccionada === op ? 'wrong' : ''}`}
            style={{ width: '88px', height: '88px', fontSize: '2rem' }}
          >
            {op}
          </button>
        ))}
      </div>
      {resultado === 'incorrecto' && (
        <button className="retry-btn" onClick={reintentar} style={{ marginTop: '1rem', minHeight: '48px' }}>
          🔄 Intentar otra vez
        </button>
      )}
    </div>
  );
}
