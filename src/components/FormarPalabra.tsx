import { useState, useCallback } from 'react';
import { F_BIEN_LECTURA, F_ERROR_CASI } from '../data/frases';

interface Props {
  objetivo: string;
  silabas: string[];
  imagen?: string;
  speak: (t: string) => void;
  hablarSecuencia: (t: string[]) => Promise<boolean>;
  onCorrecto: () => void;
  onError: () => void;
  isSpeaking: boolean;
}

export default function FormarPalabra({
  objetivo, silabas, imagen, speak, hablarSecuencia, onCorrecto, onError, isSpeaking,
}: Props) {
  const [formada, setFormada] = useState<string>('');
  const [resultado, setResultado] = useState<'correcto' | 'incorrecto' | null>(null);
  const [silabasUsadas, setSilabasUsadas] = useState<string[]>([]);

  const agregarSilaba = (silaba: string) => {
    if (resultado || formada.length >= objetivo.length) return;
    const siguiente = formada + silaba;
    if (!objetivo.startsWith(siguiente)) {
      setResultado('incorrecto');
      speak(F_ERROR_CASI);
      setSilabasUsadas([]);
      setFormada('');
      onError();
      return;
    }
    setFormada(siguiente);
    setSilabasUsadas([...silabasUsadas, silaba]);
    speak(silaba);
    if (siguiente === objetivo) {
      setResultado('correcto');
      speak(F_BIEN_LECTURA);
      onCorrecto();
    }
  };

  const borrar = () => {
    if (resultado) return;
    const ultima = silabasUsadas.pop();
    if (ultima) {
      setSilabasUsadas(silabasUsadas);
      setFormada(formada.slice(0, -ultima.length));
    }
  };

  const reiniciar = () => {
    setFormada('');
    setSilabasUsadas([]);
    setResultado(null);
  };

  const silabasUnicas = [...new Set(silabas)];

  return (
    <div className="formar-palabra" style={{ textAlign: 'center', padding: '1rem' }}>
      {imagen && <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>{imagen}</div>}
      <p style={{ fontSize: '1.3rem', fontWeight: '800', color: '#333', margin: '0 0 0.5rem' }}>
        Forma: {objetivo}
      </p>
      <div style={{ fontSize: '3rem', fontWeight: '900', color: '#764ba2', margin: '1rem 0', minHeight: '3rem' }}>
        {formada || '—'}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
        {silabasUnicas.map((s) => (
          <button
            key={s}
            onClick={() => agregarSilaba(s)}
            disabled={resultado || formada.length >= objetivo.length || isSpeaking}
            className="letter-btn"
            style={{ width: '92px', height: '92px', fontSize: '1.8rem' }}
          >
            {s}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center' }}>
        <button
          onClick={borrar}
          disabled={silabasUsadas.length === 0 || resultado || isSpeaking}
          className="ghost-btn"
          style={{ minHeight: '48px', fontSize: '0.9rem' }}
        >
          ⌫ Borrar
        </button>
        <button
          onClick={reiniciar}
          disabled={resultado || isSpeaking}
          className="ghost-btn"
          style={{ minHeight: '48px', fontSize: '0.9rem' }}
        >
          🔄 Reiniciar
        </button>
      </div>
    </div>
  );
}
