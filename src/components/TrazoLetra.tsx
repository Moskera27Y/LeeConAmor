import { useState, useCallback, useMemo, type PointerEvent as ReactPointerEvent } from 'react';
import { LETRAS_TRACO, MENSAJES_TRAZO, muestrearTrazo, validarTrazo, type LetraTrazo } from '../lib/trazo';
import { FRASES_VOZ } from '../data/frasesVoz';
import { F_BIEN_LECTURA } from '../data/frases';

interface Props {
  speak: (t: string) => void;
  hablarSecuencia: (t: string[]) => Promise<boolean>;
  onCorrecto: () => void;
  onError: () => void;
  isSpeaking: boolean;
}

type Punto = { x: number; y: number };

// Píxeles del lienzo -> espacio 0-100 de la letra (igual que el SVG con
// preserveAspectRatio="xMidYMid meet": cuadrado centrado con letterboxing).
function aEspacioLetra(clientX: number, clientY: number, rect: DOMRect): Punto {
  const escala = Math.min(rect.width / 100, rect.height / 100);
  const margenX = (rect.width - 100 * escala) / 2;
  const margenY = (rect.height - 100 * escala) / 2;
  return {
    x: (clientX - rect.left - margenX) / escala,
    y: (clientY - rect.top - margenY) / escala,
  };
}

export default function TrazoLetra({
  speak, hablarSecuencia, onCorrecto, onError, isSpeaking,
}: Props) {
  const [actual, setActual] = useState<LetraTrazo | null>(null);
  const [puntos, setPuntos] = useState<Punto[]>([]);
  const [completado, setCompletado] = useState(false);
  const [intentos, setIntentos] = useState(0);
  const [aviso, setAviso] = useState('');

  // Misma trayectoria para dibujar la letra, los puntitos y validar.
  const trayectoria = useMemo(() => (actual ? muestrearTrazo(actual.d, 4) : []), [actual]);
  const inicio = trayectoria[0];

  const iniciar = useCallback(() => {
    const letra = LETRAS_TRACO[Math.floor(Math.random() * LETRAS_TRACO.length)];
    setActual(letra);
    setPuntos([]);
    setCompletado(false);
    setIntentos(0);
    setAviso('');
    hablarSecuencia([FRASES_VOZ.trazo]);
  }, [hablarSecuencia]);

  const manejarInicio = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!actual || completado) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* noop */ }
    const rect = e.currentTarget.getBoundingClientRect();
    setPuntos([aEspacioLetra(e.clientX, e.clientY, rect)]);
  }, [actual, completado]);

  const manejarMover = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!actual || completado) return;
    // Ratón: solo con el botón pulsado. Dedo/lápiz: mientras toca la pantalla.
    if (e.pointerType !== 'touch' && e.buttons !== 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const p = aEspacioLetra(e.clientX, e.clientY, rect);
    setPuntos((prev) => {
      if (prev.length === 0) return prev;
      const ultimo = prev[prev.length - 1];
      if (Math.hypot(p.x - ultimo.x, p.y - ultimo.y) < 1) return prev;
      return [...prev, p];
    });
  }, [actual, completado]);

  const manejarFin = useCallback(() => {
    if (!actual || completado) return;
    // Un toque sin arrastre no es un intento fallido: no se penaliza.
    if (puntos.length < 2) {
      setPuntos([]);
      return;
    }

    const r = validarTrazo(puntos, actual.d);
    if (r.ok) {
      setCompletado(true);
      setAviso('');
      speak(F_BIEN_LECTURA);
      onCorrecto();
      return;
    }

    // No cuenta como acierto: el niño repite hasta salir la forma.
    setIntentos((i) => i + 1);
    setPuntos([]);
    setAviso(MENSAJES_TRAZO[r.motivo]);
    onError();
  }, [actual, completado, puntos, speak, onCorrecto, onError]);

  const limpiar = () => {
    setPuntos([]);
    setAviso('');
  };

  return (
    <div className="trazo-letra" style={{ textAlign: 'center' }}>
      {!actual && (
        <button className="listen-btn" onClick={iniciar} style={{ marginBottom: '1rem', minHeight: '56px' }}>
          👆 Empezar trazo de letras
        </button>
      )}

      {actual && (
        <>
          <p style={{ fontSize: '1.15rem', fontWeight: '800', color: '#333', margin: '0 0 .2rem' }}>
            Traza la letra {actual.letra} con tu dedo
          </p>
          <p style={{ fontSize: '.95rem', color: '#6b6880', margin: '0 0 .8rem' }}>
            {actual.fonetica} · intento {intentos + 1}
          </p>

          <div
            id="lienzo-trazo"
            onPointerDown={manejarInicio}
            onPointerMove={manejarMover}
            onPointerUp={manejarFin}
            onPointerCancel={() => setPuntos([])}
            style={{
              width: 'min(88vw, 340px)',
              aspectRatio: '1 / 1',
              margin: '0 auto',
              border: '3px dashed #ddd2f0',
              borderRadius: '20px',
              position: 'relative',
              background: '#fbf9ff',
              cursor: 'crosshair',
              touchAction: 'none',
              overflow: 'hidden',
            }}
          >
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="xMidYMid meet"
              aria-hidden="true"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
            >
              {/* La letra: misma trayectoria que valida el trazo */}
              <path
                d={actual.d}
                fill="none"
                stroke="#e6dcff"
                strokeWidth={8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Puntitos guía sobre la misma letra */}
              {trayectoria.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={1.6} fill="#c9b7ea" />
              ))}
              {/* Círculo verde de inicio */}
              {inicio && (
                <>
                  <circle cx={inicio.x} cy={inicio.y} r={5.5} fill="#7ed957" opacity={0.35} className="trazo-inicio-pulso" />
                  <circle cx={inicio.x} cy={inicio.y} r={3.4} fill="#39b54a" stroke="#fff" strokeWidth={1.2} />
                </>
              )}
              {/* Trazo del niño */}
              {puntos.length > 1 && (
                <polyline
                  points={puntos.map((p) => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke="#764ba2"
                  strokeWidth={7}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.85}
                />
              )}
            </svg>

            {puntos.length === 0 && !completado && (
              <div
                style={{
                  position: 'absolute', inset: 0, display: 'grid', placeItems: 'end center',
                  paddingBottom: '0.6rem',
                  color: '#a99bc4', fontWeight: '700', fontSize: '.9rem', pointerEvents: 'none',
                }}
              >
                Empieza en el círculo verde y sigue los puntitos
              </div>
            )}

            {completado && (
              <div
                style={{
                  position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
                  fontSize: '3rem', pointerEvents: 'none',
                }}
              >
                ✅
              </div>
            )}
          </div>

          {aviso && (
            <p
              style={{
                marginTop: '.8rem', padding: '.7rem .9rem', borderRadius: '14px',
                background: '#fff4f3', border: '2px solid #ffc9c4',
                color: '#a5342c', fontWeight: '800', fontSize: '.95rem',
              }}
            >
              {aviso}
            </p>
          )}

          <div style={{ marginTop: '1rem', display: 'flex', gap: '.6rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {!completado && puntos.length > 0 && (
              <button onClick={limpiar} className="ghost-btn" style={{ minHeight: '48px' }}>
                🧽 Borrar
              </button>
            )}
            {completado && (
              <button onClick={iniciar} className="next-btn" style={{ minHeight: '48px' }}>
                ➡️ Otra letra
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
