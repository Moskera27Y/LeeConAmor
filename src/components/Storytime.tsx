import { useState, useCallback, useEffect, useMemo, useRef } from 'react';

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
  const [rangoActivo, setRangoActivo] = useState<[number, number] | null>(null);
  const [terminado, setTerminado] = useState(false);
  const [leyendo, setLeyendo] = useState(false);
  const avisado = useRef(false);
  const cancelado = useRef(false);
  const generacion = useRef(0);
  const palabras = texto.split(/\s+/).filter(Boolean);

  // Se lee en TROZOS de 3 palabras: el clon suena entero y natural (las
  // palabras sueltas a veces salían raras). Debe coincidir EXACTO con el
  // troceado de server/precache-clon.cjs, que genera el audio de cada trozo.
  const tamTrozo = 3;
  const trozos = useMemo(() => {
    const salida: { texto: string; desde: number; hasta: number }[] = [];
    for (let i = 0; i < palabras.length; i += tamTrozo) {
      const hasta = Math.min(i + tamTrozo, palabras.length) - 1;
      salida.push({ texto: palabras.slice(i, hasta + 1).join(' '), desde: i, hasta });
    }
    return salida;
  }, [palabras]);

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
    setRangoActivo(null);
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
    for (const trozo of trozos) {
      if (cancelado.current || generacion.current !== miGeneracion) break;
      setRangoActivo([trozo.desde, trozo.hasta]);
      // Cada trozo espera a que termine su audio: sin cortes ni traslapes.
      const ok = await hablarSecuencia([trozo.texto]);
      if (!ok || cancelado.current || generacion.current !== miGeneracion) {
        setRangoActivo(null);
        setLeyendo(false);
        return;
      }
    }
    setRangoActivo(null);
    setLeyendo(false);
    setTerminado(true);
    if (!avisado.current && !cancelado.current && generacion.current === miGeneracion) {
      avisado.current = true;
      onTerminado();
    }
  }, [trozos, hablarSecuencia, leyendo, onTerminado]);

  const parar = () => {
    generacion.current += 1;
    cancelado.current = true;
    detener?.();
    setLeyendo(false);
    setPalabraActiva(null);
    setRangoActivo(null);
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
    setRangoActivo(null);
    setTerminado(true);
    avisado.current = true;
    onTerminado();
  };

  const enRangoActivo = (i: number) =>
    rangoActivo !== null && i >= rangoActivo[0] && i <= rangoActivo[1];

  return (
    <div className="storytime" style={{ textAlign: 'center', margin: '1rem 0', maxWidth: '100%' }}>
      <p style={{ fontSize: '1.2rem', fontWeight: '800', color: '#764ba2', marginBottom: '1rem' }}>
        📖 Storytime con Léo
      </p>
      <div
        style={{
          fontSize: 'clamp(1.05rem, 4vw, 1.35rem)',
          lineHeight: 2,
          margin: '1rem 0',
          minHeight: '4rem',
          maxWidth: '100%',
          overflowWrap: 'anywhere',
        }}
      >
        {palabras.map((p, i) => (
          <span
            key={`${p}-${i}`}
            style={{
              margin: '0 0.2rem',
              fontWeight: enRangoActivo(i) || palabraActiva === i ? '900' : 'normal',
              color: enRangoActivo(i) || palabraActiva === i ? '#764ba2' : '#333',
              transform: enRangoActivo(i) || palabraActiva === i ? 'scale(1.08)' : 'scale(1)',
              transition: 'all 0.2s ease',
              cursor: leyendo ? 'default' : 'pointer',
              display: 'inline-block',
            }}
            onClick={() => {
              if (leyendo) return;
              setPalabraActiva(i);
              setRangoActivo(null);
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
