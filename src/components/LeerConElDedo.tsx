import { useState, useEffect } from 'react';
import { FRASES_VOZ } from '../data/frasesVoz';
import { F_BIEN_LECTURA } from '../data/frases';

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
  const [tocadas, setTocadas] = useState<Set<number>>(new Set());
  const [resultado, setResultado] = useState<'correcto' | 'incorrecto' | null>(null);
  const esOracion = objetivo.includes(' ');
  // En oraciones se toca palabra por palabra; en letras, letra por letra.
  const piezas = esOracion ? objetivo.split(/\s+/) : objetivo.split('');

  useEffect(() => {
    // Al entrar, Léo dice qué hacer (con la voz clonada).
    hablarSecuencia([esOracion ? FRASES_VOZ.leerConDedoPalabras : FRASES_VOZ.leerConDedo]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objetivo]);

  const tocarPieza = (idx: number) => {
    if (resultado || tocadas.has(idx)) return;
    const nuevas = new Set(tocadas).add(idx);
    setTocadas(nuevas);
    if (nuevas.size === piezas.length) {
      setResultado('correcto');
      // Primero la palabra/oración completa, luego el elogio.
      hablarSecuencia([objetivo, F_BIEN_LECTURA]);
      onCorrecto();
      return;
    }
    speak(piezas[idx]);
  };

  const reiniciar = () => {
    setTocadas(new Set());
    setResultado(null);
  };

  return (
    <div className="leer-dedo" style={{ textAlign: 'center', padding: '1rem' }}>
      {imagen && !esOracion && <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>{imagen}</div>}
      <p style={{ fontSize: '1.3rem', fontWeight: '800', color: '#333', margin: '0 0 1rem' }}>
        {esOracion ? 'Toca cada palabra para leer la oración' : `Toca cada letra para oír su sonido: ${objetivo}`}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
        {piezas.map((pieza, idx) => (
          <button
            key={`${pieza}-${idx}`}
            onClick={() => tocarPieza(idx)}
            disabled={tocadas.has(idx) || resultado === 'correcto'}
            className={`letter-btn ${tocadas.has(idx) ? 'selected' : ''}`}
            style={{
              width: esOracion ? 'auto' : '72px',
              minWidth: esOracion ? '96px' : undefined,
              height: '72px',
              padding: esOracion ? '0 0.8rem' : undefined,
              fontSize: esOracion ? '1.6rem' : '2rem',
              opacity: tocadas.has(idx) ? 0.6 : 1,
            }}
          >
            {pieza}
          </button>
        ))}
      </div>
      {resultado === 'correcto' && (
        <p style={{ color: '#28a745', fontWeight: '800' }}>¡Leíste {objetivo}!</p>
      )}
      <button
        onClick={reiniciar}
        disabled={resultado === 'correcto'}
        className="ghost-btn"
        style={{ minHeight: '48px', fontSize: '0.9rem', marginTop: '0.5rem' }}
      >
        🔄 Volver a leer
      </button>
    </div>
  );
}
