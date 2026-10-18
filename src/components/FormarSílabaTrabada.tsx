import { useState, useCallback } from 'react';

interface SilabaTrabada {
  id: string;
  silaba: string;
  imagen: string;
  palabra: string;
  letras: string[];
}

const SÍLABAS_TRABADAS: SilabaTrabada[] = [
  { id: 'pra', silaba: 'PRA', imagen: '🌾', palabra: 'PRADO', letras: ['P', 'R', 'A'] },
  { id: 'tra', silaba: 'TRA', imagen: '🚂', palabra: 'TRAN', letras: ['T', 'R', 'A'] },
  { id: 'bra', silaba: 'BRA', imagen: '💪', palabra: 'BRAZO', letras: ['B', 'R', 'A'] },
  { id: 'cra', silaba: 'CRA', imagen: '🦀', palabra: 'CRAN', letras: ['C', 'R', 'A'] },
  { id: 'gra', silaba: 'GRA', imagen: '🧱', palabra: 'GRADO', letras: ['G', 'R', 'A'] },
  { id: 'fra', silaba: 'FRA', imagen: '🌸', palabra: 'FRASE', letras: ['F', 'R', 'A'] },
  { id: 'dra', silaba: 'DRA', imagen: '🐉', palabra: 'DRAGÓN', letras: ['D', 'R', 'A'] },
  { id: 'cla', silaba: 'CLA', imagen: '🔑', palabra: 'CLASE', letras: ['C', 'L', 'A'] },
];

interface Props {
  speak: (t: string) => void;
  hablarSecuencia: (t: string[]) => Promise<boolean>;
  onCorrecto: () => void;
  onError: () => void;
  isSpeaking: boolean;
}

export default function FormarSílabaTrabada({
  speak, hablarSecuencia, onCorrecto, onError, isSpeaking,
}: Props) {
  const [actual, setActual] = useState<SilabaTrabada | null>(null);
  const [formada, setFormada] = useState<string>('');
  const [resultado, setResultado] = useState<'correcto' | 'incorrecto' | null>(null);
  const [letrasUsadas, setLetrasUsadas] = useState<string[]>([]);

  const iniciar = useCallback(() => {
    const silaba = SÍLABAS_TRABADAS[Math.floor(Math.random() * SÍLABAS_TRABADAS.length)];
    setActual(silaba);
    setFormada('');
    setResultado(null);
    setLetrasUsadas([]);
  }, []);

  const agregarLetra = (letra: string) => {
    if (resultado || !actual) return;
    const siguiente = formada + letra;
    if (!actual.silaba.startsWith(siguiente)) {
      setResultado('incorrecto');
      speak(`Casi. La sílaba es ${actual.silaba}. Intenta otra vez.`);
      onError();
      setFormada('');
      setLetrasUsadas([]);
      return;
    }
    setFormada(siguiente);
    setLetrasUsadas([...letrasUsadas, letra]);
    speak(letra);
    if (siguiente === actual.silaba) {
      setResultado('correcto');
      speak(`¡Muy bien! Formaste ${actual.silaba}.`);
      onCorrecto();
    }
  };

  const borrar = () => {
    if (resultado || letrasUsadas.length === 0) return;
    const ultima = letrasUsadas.pop();
    if (ultima) {
      setLetrasUsadas(letrasUsadas);
      setFormada(formada.slice(0, -ultima.length));
    }
  };

  const reiniciar = () => {
    setFormada('');
    setLetrasUsadas([]);
    setResultado(null);
  };

  return (
    <div className="formar-silaba-trabada" style={{ textAlign: 'center', padding: '1rem' }}>
      {!actual && (
        <button
          className="listen-btn"
          onClick={iniciar}
          style={{ marginBottom: '1rem', minHeight: '56px' }}
        >
          🔊 Empezar sílabas trabadas
        </button>
      )}

      {actual && (
        <>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>{actual.imagen}</div>
          <p style={{ fontSize: '1.3rem', fontWeight: '800', color: '#333', margin: '0 0 0.5rem' }}>
            Forma: {actual.silaba}
          </p>
          <div style={{ fontSize: '3rem', fontWeight: '900', color: '#764ba2', margin: '1rem 0', minHeight: '3rem' }}>
            {formada || '—'}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
            {[...new Set(actual.letras)].map((l) => (
              <button
                key={l}
                onClick={() => agregarLetra(l)}
                disabled={resultado || formada.length >= actual.silaba.length || isSpeaking}
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
              disabled={letrasUsadas.length === 0 || resultado || isSpeaking}
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
        </>
      )}
    </div>
  );
}
