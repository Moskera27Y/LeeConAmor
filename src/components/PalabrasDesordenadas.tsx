import { useState, useCallback } from 'react';

interface PalabraDesordenada {
  id: string;
  palabra: string;
  silabas: string[];
  imagen: string;
}

const PALABRAS: PalabraDesordenada[] = [
  { id: 'mama', palabra: 'MAMA', silabas: ['MA', 'MA'], imagen: '🤱' },
  { id: 'papa', palabra: 'PAPA', silabas: ['PA', 'PA'], imagen: '👨' },
  { id: 'pera', palabra: 'PERA', silabas: ['PE', 'RA'], imagen: '🍐' },
  { id: 'sol', palabra: 'SOL', silabas: ['SO', 'L'], imagen: '☀️' },
  { id: 'luna', palabra: 'LUNA', silabas: ['LU', 'NA'], imagen: '🌙' },
  { id: 'casa', palabra: 'CASA', silabas: ['CA', 'SA'], imagen: '🏠' },
  { id: 'sapo', palabra: 'SAPO', silabas: ['SA', 'PO'], imagen: '🐸' },
  { id: 'sopa', palabra: 'SOPA', silabas: ['SO', 'PA'], imagen: '🍲' },
];

interface Props {
  speak: (t: string) => void;
  hablarSecuencia: (t: string[]) => Promise<boolean>;
  onCorrecto: () => void;
  onError: () => void;
  isSpeaking: boolean;
}

export default function PalabrasDesordenadas({
  speak, hablarSecuencia, onCorrecto, onError, isSpeaking,
}: Props) {
  const [actual, setActual] = useState<PalabraDesordenada | null>(null);
  const [formada, setFormada] = useState<string>('');
  const [resultado, setResultado] = useState<'correcto' | 'incorrecto' | null>(null);
  const [silabasUsadas, setSilabasUsadas] = useState<string[]>([]);

  const iniciar = useCallback(() => {
    const palabra = PALABRAS[Math.floor(Math.random() * PALABRAS.length)];
    setActual(palabra);
    setFormada('');
    setResultado(null);
    setSilabasUsadas([]);
  }, []);

  const agregarSilaba = (silaba: string) => {
    if (resultado || !actual) return;
    const siguiente = formada + silaba;
    if (!actual.palabra.startsWith(siguiente)) {
      setResultado('incorrecto');
      speak(`Casi. La palabra es ${actual.palabra}. Intenta otra vez.`);
      onError();
      setFormada('');
      setSilabasUsadas([]);
      return;
    }
    setFormada(siguiente);
    setSilabasUsadas([...silabasUsadas, silaba]);
    speak(silaba);
    if (siguiente === actual.palabra) {
      setResultado('correcto');
      speak(`¡Muy bien! Formaste ${actual.palabra}.`);
      onCorrecto();
    }
  };

  const borrar = () => {
    if (resultado || silabasUsadas.length === 0) return;
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

  return (
    <div className="palabras-desordenadas" style={{ textAlign: 'center', padding: '1rem' }}>
      {!actual && (
        <button
          className="listen-btn"
          onClick={iniciar}
          style={{ marginBottom: '1rem', minHeight: '56px' }}
        >
          🔊 Empezar palabras desordenadas
        </button>
      )}

      {actual && (
        <>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>{actual.imagen}</div>
          <p style={{ fontSize: '1.3rem', fontWeight: '800', color: '#333', margin: '0 0 0.5rem' }}>
            Forma: {actual.palabra}
          </p>
          <div style={{ fontSize: '3rem', fontWeight: '900', color: '#764ba2', margin: '1rem 0', minHeight: '3rem' }}>
            {formada || '—'}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
            {[...new Set(actual.silabas)].map((s) => (
              <button
                key={s}
                onClick={() => agregarSilaba(s)}
                disabled={resultado || formada.length >= actual.palabra.length || isSpeaking}
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
        </>
      )}
    </div>
  );
}
