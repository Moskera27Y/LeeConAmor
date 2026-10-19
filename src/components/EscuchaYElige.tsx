import { useState, useCallback } from 'react';
import { F_BIEN_LECTURA, F_ERROR_CASI } from '../data/frases';
import { fraseImagen } from '../data/frasesVoz';

interface OpcionImagen {
  id: string;
  emoji: string;
  texto: string;
  nombre: string;
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
  { id: 'casa', emoji: '🏠', texto: 'CASA', nombre: 'la casa' },
  { id: 'sol', emoji: '☀️', texto: 'SOL', nombre: 'el sol' },
  { id: 'luna', emoji: '🌙', texto: 'LUNA', nombre: 'la luna' },
  { id: 'perro', emoji: '🐶', texto: 'PERRO', nombre: 'el perro' },
  { id: 'gato', emoji: '🐱', texto: 'GATO', nombre: 'el gato' },
  { id: 'papa', emoji: '👨', texto: 'PAPÁ', nombre: 'el papá' },
  { id: 'mama', emoji: '👩', texto: 'MAMÁ', nombre: 'la mamá' },
  { id: 'pera', emoji: '🍐', texto: 'PERA', nombre: 'la pera' },
];

const OPCIONES_6_8: OpcionImagen[] = [
  { id: 'elefante', emoji: '🐘', texto: 'ELEFANTE', nombre: 'el elefante' },
  { id: 'mariposa', emoji: '🦋', texto: 'MARIPOSA', nombre: 'la mariposa' },
  { id: 'telefono', emoji: '📞', texto: 'TELÉFONO', nombre: 'el teléfono' },
  { id: 'computadora', emoji: '💻', texto: 'COMPUTADORA', nombre: 'la computadora' },
  { id: 'escuela', emoji: '🏫', texto: 'ESCUELA', nombre: 'la escuela' },
  { id: 'hospital', emoji: '🏥', texto: 'HOSPITAL', nombre: 'el hospital' },
  { id: 'biblioteca', emoji: '📚', texto: 'BIBLIOTECA', nombre: 'la biblioteca' },
  { id: 'playa', emoji: '🏖️', texto: 'PLAYA', nombre: 'la playa' },
];

export default function EscuchaYElige({
  rango, speak, hablarSecuencia, onCorrecto, onError, isSpeaking,
}: Props) {
  const [opciones, setOpciones] = useState<OpcionImagen[]>([]);
  const [seleccionada, setSeleccionada] = useState<string | null>(null);
  const [resultado, setResultado] = useState<'correcto' | 'incorrecto' | null>(null);
  const [objetivoActual, setObjetivoActual] = useState<OpcionImagen | null>(null);
  const [escuchando, setEscuchando] = useState(false);
  const [escuchado, setEscuchado] = useState(false);

  const todasLasOpciones = rango === '3-5' ? OPCIONES_3_5 : OPCIONES_6_8;

  const hablarObjetivo = useCallback(async (objetivo: OpcionImagen) => {
    // Dice exactamente qué imagen tocar: "Toca la imagen de la casa."
    await hablarSecuencia([fraseImagen(objetivo.nombre)]);
  }, [hablarSecuencia]);

  const iniciarRonda = useCallback(async () => {
    if (isSpeaking) return;
    setSeleccionada(null);
    setResultado(null);
    setEscuchado(false);
    setEscuchando(true);

    const mezcladas = [...todasLasOpciones].sort(() => Math.random() - 0.5).slice(0, 3);
    setOpciones(mezcladas);

    const objetivo = mezcladas[Math.floor(Math.random() * mezcladas.length)];
    setObjetivoActual(objetivo);

    await hablarObjetivo(objetivo);
    setEscuchando(false);
    setEscuchado(true);
  }, [hablarObjetivo, isSpeaking, todasLasOpciones]);

  const repetir = () => {
    if (!objetivoActual || escuchando || resultado) return;
    hablarObjetivo(objetivoActual);
  };

  const elegir = (opcion: OpcionImagen) => {
    if (resultado || !objetivoActual || escuchando) return;
    setSeleccionada(opcion.id);

    if (opcion.id === objetivoActual.id) {
      setResultado('correcto');
      speak(F_BIEN_LECTURA);
      onCorrecto();
    } else {
      setResultado('incorrecto');
      speak(F_ERROR_CASI);
      onError();
    }
  };

  const siguienteRonda = () => {
    setResultado(null);
    setSeleccionada(null);
    setObjetivoActual(null);
    setOpciones([]);
    setEscuchado(false);
    iniciarRonda();
  };

  return (
    <div className="escucha-elige" style={{ textAlign: 'center', padding: '1rem' }}>
      <p style={{ fontSize: '1.3rem', fontWeight: '800', color: '#333', margin: '0 0 1rem' }}>
        {resultado ? (resultado === 'correcto' ? '¡Correcto!' : 'Intenta otra vez') : escuchando ? 'Escucha a Léo…' : escuchado ? 'Toca la imagen que dijo Léo' : 'Toca 🔊 para empezar'}
      </p>

      <button
        className="listen-btn"
        onClick={iniciarRonda}
        disabled={isSpeaking || escuchando}
        style={{ marginBottom: '1.5rem', minHeight: '56px' }}
      >
        {escuchando ? '🦉 Escuchando…' : isSpeaking ? '💛 Léo habla…' : '🔊 Escuchar'}
      </button>

      {objetivoActual && !resultado && (
        <button
          className="ghost-btn"
          onClick={repetir}
          disabled={escuchando}
          style={{ marginLeft: '0.6rem', minHeight: '48px' }}
        >
          🔁 Repetir
        </button>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        {opciones.map((op) => {
          const estáSeleccionada = seleccionada === op.id;
          const estáCorrecta = resultado === 'correcto' && op.id === objetivoActual?.id;
          const estáIncorrecta = resultado === 'incorrecto' && estáSeleccionada && !estáCorrecta;
          return (
            <button
              key={op.id}
              onClick={() => elegir(op)}
              disabled={!escuchado || escuchando}
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

      {resultado && (
        <div style={{ marginTop: '1.2rem', textAlign: 'center' }}>
          <button className="next-btn" onClick={siguienteRonda} disabled={isSpeaking} style={{ minHeight: '52px' }}>
            {resultado === 'correcto' ? '➡️ Otra ronda' : '🔄 Intentar otra vez'}
          </button>
        </div>
      )}

      {!resultado && opciones.length === 0 && (
        <p style={{ color: '#666', fontSize: '0.9rem' }}>Toca "Escuchar" para empezar</p>
      )}
    </div>
  );
}
