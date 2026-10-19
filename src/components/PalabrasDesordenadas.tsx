import { useState, useCallback } from 'react';
import { FRASES_VOZ, fraseFormaPalabra } from '../data/frasesVoz';
import { F_BIEN_LECTURA, F_ERROR_CASI } from '../data/frases';

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

// Sílaba extra para que siempre haya opciones de sobra (mínimo 4 botones).
const EXTRAS = ['MA', 'PA', 'LA', 'SA', 'PE', 'RA', 'SO', 'LU', 'NA', 'CA', 'PO', 'TA'];

interface OpcionSilaba {
  id: string;
  silaba: string;
}

function opcionesDePalabra(p: PalabraDesordenada): OpcionSilaba[] {
  const propias = p.silabas.map((s, i) => ({ id: `p-${i}-${s}`, silaba: s }));
  const extras = EXTRAS.filter((s) => !p.silabas.includes(s))
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.max(0, 4 - propias.length))
    .map((s, i) => ({ id: `x-${i}-${s}`, silaba: s }));
  return [...propias, ...extras].sort(() => Math.random() - 0.5);
}

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
  const [opciones, setOpciones] = useState<OpcionSilaba[]>([]);

  const iniciar = useCallback(() => {
    const palabra = PALABRAS[Math.floor(Math.random() * PALABRAS.length)];
    setActual(palabra);
    setFormada('');
    setResultado(null);
    setSilabasUsadas([]);
    setOpciones(opcionesDePalabra(palabra));
    // Instrucción clara: "Pon las sílabas en orden." + "Forma la palabra MAMA."
    hablarSecuencia([FRASES_VOZ.palabrasDesordenadas, fraseFormaPalabra(palabra.palabra)]);
  }, [hablarSecuencia]);

  const agregarSilaba = (silaba: string) => {
    if (resultado === 'correcto' || !actual) return;
    const siguiente = formada + silaba;
    if (!actual.palabra.startsWith(siguiente)) {
      setResultado('incorrecto');
      speak(F_ERROR_CASI);
      onError();
      return;
    }
    setFormada(siguiente);
    setSilabasUsadas([...silabasUsadas, silaba]);
    if (siguiente === actual.palabra) {
      setResultado('correcto');
      // Primero la palabra completa, luego el elogio: sin cortar sonidos.
      hablarSecuencia([actual.palabra, F_BIEN_LECTURA]);
      onCorrecto();
      return;
    }
    speak(silaba);
  };

  const borrar = () => {
    if (resultado === 'correcto' || silabasUsadas.length === 0) return;
    const nuevas = [...silabasUsadas];
    const ultima = nuevas.pop();
    if (ultima) {
      setSilabasUsadas(nuevas);
      setFormada(formada.slice(0, -ultima.length));
      setResultado(null);
    }
  };

  const reiniciar = () => {
    setFormada('');
    setSilabasUsadas([]);
    setResultado(null);
  };

  const siguiente = () => {
    iniciar();
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
            {opciones.map((op) => (
              <button
                key={op.id}
                onClick={() => agregarSilaba(op.silaba)}
                disabled={resultado === 'correcto' || formada.length >= actual.palabra.length}
                className={`letter-btn ${formada.endsWith(op.silaba) && !resultado ? 'selected' : ''}`}
                style={{ width: '92px', height: '92px', fontSize: '1.8rem' }}
              >
                {op.silaba}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={borrar}
              disabled={silabasUsadas.length === 0 || resultado === 'correcto'}
              className="ghost-btn"
              style={{ minHeight: '48px', fontSize: '0.9rem' }}
            >
              ⌫ Borrar
            </button>
            <button
              onClick={reiniciar}
              className="ghost-btn"
              style={{ minHeight: '48px', fontSize: '0.9rem' }}
            >
              {resultado === 'incorrecto' ? '🔄 Reintentar' : '🔄 Reiniciar'}
            </button>
            {resultado === 'correcto' && (
              <button onClick={siguiente} className="next-btn" style={{ minHeight: '48px', fontSize: '0.9rem' }}>
                ➡️ Otra palabra
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
