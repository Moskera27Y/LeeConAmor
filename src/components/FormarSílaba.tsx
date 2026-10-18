import { useState, useCallback } from 'react';

interface Props {
  objetivo: string;
  letras: string[];
  speak: (t: string) => void;
  hablarSecuencia: (t: string[]) => Promise<boolean>;
  onCorrecto: () => void;
  onError: () => void;
  isSpeaking: boolean;
}

export default function FormarSílaba({
  objetivo, letras, speak, hablarSecuencia, onCorrecto, onError, isSpeaking,
}: Props) {
  const [formada, setFormada] = useState<string>('');
  const [resultado, setResultado] = useState<'correcto' | 'incorrecto' | null>(null);

  const agregarLetra = (letra: string) => {
    if (resultado || formada.length >= objetivo.length) return;
    setFormada(formada + letra);
    speak(letra);
    if (formada + letra === objetivo) {
      setResultado('correcto');
      speak(`¡Muy bien! ${objetivo}.`);
      onCorrecto();
    } else if (formada + letra.length > 0 && !objetivo.startsWith(formada + letra)) {
      setResultado('incorrecto');
      speak(`Casi. Intenta otra vez.`);
      onError();
    }
  };

  const borrar = () => {
    if (resultado) return;
    setFormada(formada.slice(0, -1));
  };

  const reiniciar = () => {
    setFormada('');
    setResultado(null);
  };

  return (
    <div className="formar-silaba" style={{ textAlign: 'center', padding: '1rem' }}>
      <p style={{ fontSize: '1.3rem', fontWeight: '800', color: '#333', margin: '0 0 0.5rem' }}>
        Forma: {objetivo}
      </p>
      <div style={{ fontSize: '3rem', fontWeight: '900', color: '#764ba2', margin: '1rem 0', minHeight: '3rem' }}>
        {formada || '—'}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
        {letras.map((l) => (
          <button
            key={l}
            onClick={() => agregarLetra(l)}
            disabled={resultado || formada.length >= objetivo.length || isSpeaking}
            className="letter-btn"
            style={{ width: '72px', height: '72px', fontSize: '2rem' }}
          >
            {l}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center' }}>
        <button
          onClick={borrar}
          disabled={formada.length === 0 || resultado || isSpeaking}
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
