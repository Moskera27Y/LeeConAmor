import { useState, useCallback, useEffect, useRef } from 'react';

interface Props {
  texto: string;
  speak: (t: string) => void;
  hablarSecuencia: (t: string[]) => Promise<boolean>;
  onTerminado: () => void;
  isSpeaking: boolean;
  detener?: () => void;
  muted?: boolean;
}

export default function Storytime({
  texto, speak, hablarSecuencia, onTerminado, isSpeaking, detener, muted,
}: Props) {
  const [palabraActiva, setPalabraActiva] = useState<number | null>(null);
  const [terminado, setTerminado] = useState(false);
  const [leyendo, setLeyendo] = useState(false);
  const avisado = useRef(false);
  const cancelado = useRef(false);
  const generacion = useRef(0);
  const palabras = texto.split(/\s+/).filter(Boolean);

  // Si el cuento cambia o el componente se desmonta, se invalida la lectura
  // anterior y se permite volver a completar. Sin esto, el segundo cuento
  // nunca llamaba a onTerminado y la voz seguía al cambiar de pestaña.
  useEffect(() => {
    generacion.current += 1;
    cancelado.current = true;
    avisado.current = false;
    setTerminado(false);
    setLeyendo(false);
    setPalabraActiva(null);
    return () => {
      generacion.current += 1;
      cancelado.current = true;
      detener?.();
    };
  }, [texto, detener]);

  const leerTodo = useCallback(async () => {
    if (leyendo) return;
    const miGeneracion = ++generacion.current;
    cancelado.current = false;
    setLeyendo(true);
    setTerminado(false);
    for (let i = 0; i < palabras.length; i++) {
      if (cancelado.current || generacion.current !== miGeneracion) break;
      setPalabraActiva(i);
      // Cada palabra espera a que termine su audio: sin cortes ni traslapes.
      const ok = await hablarSecuencia([palabras[i]]);
      if (!ok || cancelado.current || generacion.current !== miGeneracion) {
        setPalabraActiva(null);
        setLeyendo(false);
        return;
      }
    }
    setPalabraActiva(null);
    setLeyendo(false);
    setTerminado(true);
    if (!avisado.current && !cancelado.current && generacion.current === miGeneracion) {
      avisado.current = true;
      onTerminado();
    }
  }, [palabras, hablarSecuencia, leyendo, onTerminado]);

  const parar = () => {
    generacion.current += 1;
    cancelado.current = true;
    detener?.();
    setLeyendo(false);
    setPalabraActiva(null);
  };

  // Salida accesible: con la voz silenciada o sin audio disponible, el peque
  // (o el adulto) puede confirmar que terminó de leer sin quedar bloqueado.
  const terminarManual = () => {
    if (avisado.current) return;
    generacion.current += 1;
    cancelado.current = true;
    detener?.();
    setLeyendo(false);
    setPalabraActiva(null);
    setTerminado(true);
    avisado.current = true;
    onTerminado();
  };

  return (
    <div className="storytime" style={{ textAlign: 'center', margin: '1rem 0' }}>
      <p style={{ fontSize: '1.2rem', fontWeight: '800', color: '#764ba2', marginBottom: '1rem' }}>
        📖 Storytime con Léo
      </p>
      <div style={{ fontSize: '1.5rem', lineHeight: '2', margin: '1rem 0', minHeight: '4rem' }}>
        {palabras.map((p, i) => (
          <span
            key={`${p}-${i}`}
            style={{
              margin: '0 0.2rem',
              fontWeight: palabraActiva === i ? '900' : 'normal',
              color: palabraActiva === i ? '#764ba2' : '#333',
              transform: palabraActiva === i ? 'scale(1.1)' : 'scale(1)',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
            }}
            onClick={() => {
              setPalabraActiva(i);
              speak(p);
            }}
          >
            {p}
          </span>
        ))}
      </div>
      <button
        className="listen-btn"
        onClick={leerTodo}
        disabled={leyendo || muted}
        style={{ minHeight: '48px' }}
      >
        {muted ? '🔇 Voz silenciada' : leyendo ? '🦉 Leyendo…' : '🔊 Leer el cuento'}
      </button>
      {leyendo && !muted && (
        <button className="ghost-btn" onClick={parar} style={{ marginLeft: '0.6rem', minHeight: '48px' }}>
          ⏹ Parar
        </button>
      )}
      {!leyendo && !terminado && (
        <button className="ghost-btn" onClick={terminarManual} style={{ marginLeft: '0.6rem', minHeight: '48px' }}>
          ✅ Ya lo leí
        </button>
      )}
      {terminado && (
        <div style={{ marginTop: '1rem' }}>
          <p style={{ color: '#28a745', fontWeight: '800' }}>¡Cuento terminado!</p>
        </div>
      )}
    </div>
  );
}
