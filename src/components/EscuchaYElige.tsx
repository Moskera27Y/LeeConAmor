import { useState, useCallback } from 'react';

interface OpcionImagen {
  id: string;
  emoji: string;
  texto: string;
  audioTexto: string;
}

interface Props {
  rango: '3-5' | '6-8';
  speak: (t: string) => void;
  hablarSecuencia: (t: string[]) => Promise<boolean>;
  onCorrecto: () => void;
  onError: () => void;
  isSpeaking: boolean;
}

const OPCIONES_3_5: OpcionImagen[] = [
  { id: 'casa', emoji: '🏠', texto: 'CASA', audioTexto: 'casa' },
  { id: 'sol', emoji: '☀️', texto: 'SOL', audioTexto: 'sol' },
  { id: 'luna', emoji: '🌙', texto: 'LUNA', audioTexto: 'luna' },
  { id: 'perro', emoji: '🐶', texto: 'PERRO', audioTexto: 'perro' },
  { id: 'gato', emoji: '🐱', texto: 'GATO', audioTexto: 'gato' },
  { id: 'papa', emoji: '👨', texto: 'PAPA', audioTexto: 'papa' },
  { id: 'mama', emoji: '👩', texto: 'MAMA', audioTexto: 'mama' },
  { id: 'pera', emoji: '🍐', texto: 'PERA', audioTexto: 'pera' },
];

const OPCIONES_6_8: OpcionImagen[] = [
  { id: 'elefante', emoji: '🐘', texto: 'ELEFANTE', audioTexto: 'elefante' },
  { id: 'mariposa', emoji: '🦋', texto: 'MARIPOSA', audioTexto: 'mariposa' },
  { id: 'telefono', emoji: '📞', texto: 'TELÉFONO', audioTexto: 'telefono' },
  { id: 'computadora', emoji: '💻', texto: 'COMPUTADORA', audioTexto: 'computadora' },
  { id: 'escuela', emoji: '🏫', texto: 'ESCUELA', audioTexto: 'escuela' },
  { id: 'hospital', emoji: '🏥', texto: 'HOSPITAL', audioTexto: 'hospital' },
  { id: 'biblioteca', emoji: '📚', texto: 'BIBLIOTECA', audioTexto: 'biblioteca' },
  { id: 'playa', emoji: '🏖️', texto: 'PLAYA', audioTexto: 'playa' },
];

export default function EscuchaYElige({
  rango, speak, hablarSecuencia, onCorrecto, onError, isSpeaking,
}: Props) {
  const [opciones, setOpciones] = useState<OpcionImagen[]>([]);
  const [seleccionada, setSeleccionada] = useState<string | null>(null);
  const [resultado, setResultado] = useState<'correcto' | 'incorrecto' | null>(null);
  const [objetivoActual, setObjetivoActual] = useState<OpcionImagen | null>(null);
  const [escuchando, setEscuchando] = useState(false);

  const todasLasOpciones = rango === '3-5' ? OPCIONES_3_5 : OPCIONES_6_8;

  const iniciarRonda = useCallback(async () => {
    if (isSpeaking) return;
    setSeleccionada(null);
    setResultado(null);
    setEscuchando(true);

    const mezcladas = [...todasLasOpciones].sort(() => Math.random() - 0.5).slice(0, 3);
    setOpciones(mezcladas);

    const objetivo = mezcladas[Math.floor(Math.random() * mezcladas.length)];
    setObjetivoActual(objetivo);

    await hablarSecuencia([`¿Dónde está ${objetivo.texto}?`]);
    setEscuchando(false);
  }, [hablarSecuencia, isSpeaking, rango, todasLasOpciones]);

  const elegir = (opcion: OpcionImagen) => {
    if (resultado || !objetivoActual) return;
    setSeleccionada(opcion.id);

    if (opcion.id === objetivoActual.id) {
      setResultado('correcto');
      speak(`¡Muy bien! Encontraste ${opcion.texto}.`);
      onCorrecto();
    } else {
      setResultado('incorrecto');
      speak(`Casi. Buscábamos ${objetivoActual.texto}. Intenta otra vez.`);
      onError();
    }
  };

  const reiniciar = () => {
    setResultado(null);
    setSeleccionada(null);
    setObjetivoActual(null);
  };

  return (
    <div className="escucha-elige" style={{ textAlign: 'center', padding: '1rem' }}>
      <p style={{ fontSize: '1.3rem', fontWeight: '800', color: '#333', margin: '0 0 1rem' }}>
        {resultado ? (resultado === 'correcto' ? '¡Correcto!' : 'Intenta otra vez') : escuchando ? 'Escucha a Léo…' : 'Toca 🔊 para empezar'}
      </p>

      <button
        className="listen-btn"
        onClick={iniciarRonda}
        disabled={isSpeaking || escuchando || resultado === 'correcto'}
        style={{ marginBottom: '1.5rem', minHeight: '56px' }}
      >
        {escuchando ? '🦉 Escuchando…' : '🔊 Escuchar'}
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        {opciones.map((op) => {
          const estáSeleccionada = seleccionada === op.id;
          const estáCorrecta = resultado === 'correcto' && op.id === objetivoActual?.id;
          const estáIncorrecta = resultado === 'incorrecto' && estáSeleccionada && !estáCorrecta;
          return (
            <button
              key={op.id}
              onClick={() => elegir(op)}
              disabled={resultado || !escuchando || isSpeaking}
              className={`letter-btn ${estáSeleccionada ? (estáCorrecta ? 'selected' : estáIncorrecta ? 'wrong' : '') : ''}`}
              style={{
                width: '100%',
                height: '120px',
                fontSize: '3rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              <span>{op.emoji}</span>
              <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#333' }}>{op.texto}</span>
            </button>
          );
        })}
      </div>

      {!resultado && opciones.length === 0 && (
        <p style={{ color: '#666', fontSize: '0.9rem' }}>Toca "Escuchar" para empezar</p>
      )}
    </div>
  );
}
