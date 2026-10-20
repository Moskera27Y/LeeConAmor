import { useState, useCallback } from 'react';
import { FRASES_VOZ, fraseFormaSílaba } from '../data/frasesVoz';
import { F_BIEN_LECTURA, F_ERROR_CASI } from '../data/frases';

interface SilabaTrabada {
  id: string;
  silaba: string;
  imagen: string;
  palabra: string;
  letras: string[];
}

const SÍLABAS_TRABADAS: SilabaTrabada[] = [
  { id: 'pra', silaba: 'PRA', imagen: '🌾', palabra: 'PRADO', letras: ['P', 'R', 'A'] },
  { id: 'tra', silaba: 'TRA', imagen: '🚂', palabra: 'TRAJE', letras: ['T', 'R', 'A'] },
  { id: 'bra', silaba: 'BRA', imagen: '💪', palabra: 'BRAZO', letras: ['B', 'R', 'A'] },
  { id: 'cra', silaba: 'CRA', imagen: '🦀', palabra: 'CRAYÓN', letras: ['C', 'R', 'A'] },
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
  const [letrasMezcladas, setLetrasMezcladas] = useState<string[]>([]);

  const iniciar = useCallback(() => {
    const silaba = SÍLABAS_TRABADAS[Math.floor(Math.random() * SÍLABAS_TRABADAS.length)];
    setActual(silaba);
    setFormada('');
    setResultado(null);
    setLetrasUsadas([]);
    setLetrasMezcladas([...silaba.letras].sort(() => Math.random() - 0.5));
    // Instrucción clara: "Pon las letras en orden…" + "Forma la sílaba PRA."
    hablarSecuencia([FRASES_VOZ.silabasTrabadas, fraseFormaSílaba(silaba.silaba)]);
  }, [hablarSecuencia]);

  const agregarLetra = (letra: string) => {
    if (resultado === 'correcto' || !actual) return;
    const siguiente = formada + letra;
    if (!actual.silaba.startsWith(siguiente)) {
      setResultado('incorrecto');
      setFormada('');
      setLetrasUsadas([]);
      speak(F_ERROR_CASI);
      onError();
      return;
    }
    setFormada(siguiente);
    setLetrasUsadas([...letrasUsadas, letra]);
    if (siguiente === actual.silaba) {
      setResultado('correcto');
      // Primero la sílaba completa, luego el elogio: sin cortar sonidos.
      hablarSecuencia([actual.silaba, F_BIEN_LECTURA]);
      onCorrecto();
      return;
    }
    speak(letra);
  };

  const borrar = () => {
    if (resultado === 'correcto' || letrasUsadas.length === 0) return;
    const nuevas = [...letrasUsadas];
    const ultima = nuevas.pop();
    if (ultima) {
      setLetrasUsadas(nuevas);
      setFormada(formada.slice(0, -ultima.length));
      setResultado(null);
    }
  };

  const reiniciar = () => {
    setFormada('');
    setLetrasUsadas([]);
    setResultado(null);
  };

  const siguiente = () => {
    iniciar();
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
            {letrasMezcladas.map((l, i) => (
              <button
                key={`${l}-${i}`}
                onClick={() => agregarLetra(l)}
                disabled={!!resultado || formada.length >= actual.silaba.length}
                className={`letter-btn ${formada.endsWith(l) && !resultado ? 'selected' : ''}`}
                style={{ width: '72px', height: '72px', fontSize: '2rem' }}
              >
                {l}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={borrar}
              disabled={letrasUsadas.length === 0 || resultado === 'correcto'}
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
                ➡️ Otra sílaba
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
