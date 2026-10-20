import { useState, useEffect } from 'react';
import { fraseFormaSílaba } from '../data/frasesVoz';
import { F_BIEN_LECTURA, F_ERROR_CASI } from '../data/frases';

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

  const escuchar = () => {
    hablarSecuencia([fraseFormaSílaba(objetivo)]);
  };

  useEffect(() => {
    // Al entrar, Léo dice qué sílaba formar.
    hablarSecuencia([fraseFormaSílaba(objetivo)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objetivo]);

  const agregarLetra = (letra: string) => {
    if (resultado || formada.length >= objetivo.length) return;
    const siguiente = formada + letra;
    if (siguiente === objetivo) {
      setFormada(siguiente);
      setResultado('correcto');
      // Primero la sílaba completa, luego el elogio: sin cortar sonidos.
      hablarSecuencia([objetivo, F_BIEN_LECTURA]);
      onCorrecto();
      return;
    }
    setFormada(siguiente);
    if (!objetivo.startsWith(siguiente)) {
      setResultado('incorrecto');
      speak(F_ERROR_CASI);
      onError();
      return;
    }
    speak(letra);
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
      <button
        className="listen-btn"
        onClick={escuchar}
        style={{ marginBottom: '0.8rem', minHeight: '48px' }}
      >
        🔊 Escuchar
      </button>
      <div style={{ fontSize: '3rem', fontWeight: '900', color: '#764ba2', margin: '1rem 0', minHeight: '3rem' }}>
        {formada || '—'}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
        {letras.map((l) => (
          <button
            key={l}
            onClick={() => agregarLetra(l)}
            disabled={resultado !== null || formada.length >= objetivo.length}
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
          disabled={formada.length === 0 || resultado !== null}
          className="ghost-btn"
          style={{ minHeight: '48px', fontSize: '0.9rem' }}
        >
          ⌫ Borrar
        </button>
        <button
          onClick={reiniciar}
          disabled={resultado === 'correcto'}
          className="ghost-btn"
          style={{ minHeight: '48px', fontSize: '0.9rem' }}
        >
          {resultado === 'incorrecto' ? '🔄 Reintentar' : '🔄 Reiniciar'}
        </button>
      </div>
    </div>
  );
}
