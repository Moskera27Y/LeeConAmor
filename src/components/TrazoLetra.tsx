import { useState, useCallback, type MouseEvent, type TouchEvent } from 'react';
import { LETRAS_TRACO, MENSAJES_TRAZO, validarTrazo, type LetraTrazo } from '../lib/trazo';
interface Props {
  speak: (t: string) => void;
  onCorrecto: () => void;
  onError: () => void;
  isSpeaking: boolean;
}

export default function TrazoLetra({
  speak, onCorrecto, onError, isSpeaking,
}: Props) {
  const [actual, setActual] = useState<LetraTrazo | null>(null);
  const [puntos, setPuntos] = useState<{ x: number; y: number }[]>([]);
  const [completado, setCompletado] = useState(false);
  const [intentos, setIntentos] = useState(0);
  const [aviso, setAviso] = useState('');

  const iniciar = useCallback(() => {
    const letra = LETRAS_TRACO[Math.floor(Math.random() * LETRAS_TRACO.length)];
    setActual(letra);
    setPuntos([]);
    setCompletado(false);
    setIntentos(0);
    setAviso('');
  }, []);

  const manejarInicio = useCallback((e: TouchEvent | MouseEvent) => {
    if (!actual || completado) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const t = e.touches;
    const clientX = t ? t[0].clientX : e.clientX;
    const clientY = t ? t[0].clientY : e.clientY;
    setPuntos([{ x: clientX - rect.left, y: clientY - rect.top }]);
  }, [actual, completado]);

  const manejarMover = useCallback((e: TouchEvent | MouseEvent) => {
    if (!actual || completado || puntos.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const t = e.touches;
    const clientX = t ? t[0].clientX : e.clientX;
    const clientY = t ? t[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    // Ignora el ruido del dedo (micro-movimientos)
    const ultimo = puntos[puntos.length - 1];
    if (Math.hypot(x - ultimo.x, y - ultimo.y) < 2) return;
    setPuntos((prev) => [...prev, { x, y }]);
  }, [actual, completado, puntos]);

  const manejarFin = useCallback(() => {
    if (!actual || completado) return;

    // El mismo nodo que dibuja nos da el tamaño real del lienzo.
    const caja = document.getElementById('lienzo-trazo');
    const ancho = caja?.clientWidth || 300;
    const alto = caja?.clientHeight || 200;

    const r = validarTrazo(puntos, ancho, alto, actual.guias);

    if (r.ok) {
      setCompletado(true);
      setAviso('');
      speak(`¡Muy bien! Trazaste la ${actual.letra}, suena ${actual.fonetica}.`);
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
          <div style={{ fontSize: '3.6rem', fontWeight: '900', color: '#333', lineHeight: 1 }}>
            {actual.letra}
          </div>
          <div
            aria-hidden="true"
            style={{
              position: 'relative',
              margin: '.4rem auto .8rem',
              width: '110px',
              height: '130px',
              color: '#c9bfe0',
              fontSize: '6.5rem',
              lineHeight: '130px',
              fontWeight: '900',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            {actual.letra}
          </div>

          <p style={{ fontSize: '1.15rem', fontWeight: '800', color: '#333', margin: '0 0 .2rem' }}>
            Traza la letra {actual.letra} con tu dedo
          </p>
          <p style={{ fontSize: '.95rem', color: '#6b6880', margin: '0 0 .8rem' }}>
            {actual.fonetica} · intento {intentos + 1}
          </p>

          <div
            id="lienzo-trazo"
            onTouchStart={manejarInicio}
            onTouchMove={(e) => { e.preventDefault(); manejarMover(e); }}
            onTouchEnd={manejarFin}
            onMouseDown={manejarInicio}
            onMouseMove={(e) => { if (e.buttons === 1) manejarMover(e); }}
            onMouseUp={manejarFin}
            onMouseLeave={(e) => { if (e.buttons === 1) manejarFin(e); }}
            style={{
              width: '100%',
              height: '220px',
              border: '3px dashed #ddd2f0',
              borderRadius: '20px',
              position: 'relative',
              background: '#fbf9ff',
              cursor: 'crosshair',
              touchAction: 'none',
            }}
          >
            {/* Puntos guía para que el niño sepa por dónde empezar */}
            {actual.guias.map(([gx, gy], i) => (
              <span
                key={i}
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: `${gx}%`,
                  top: `${gy}%`,
                  width: 14,
                  height: 14,
                  marginLeft: -7,
                  marginTop: -7,
                  borderRadius: '50%',
                  background: '#e6dcff',
                  pointerEvents: 'none',
                }}
              />
            ))}

            {puntos.length > 1 && (
              <svg
                aria-hidden="true"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
              >
                <polyline
                  points={puntos.map((p) => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke="#764ba2"
                  strokeWidth={9}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.85}
                />
              </svg>
            )}

            {puntos.length === 0 && !completado && (
              <div
                style={{
                  position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
                  color: '#a99bc4', fontWeight: '700', fontSize: '.95rem', pointerEvents: 'none',
                }}
              >
                Empieza por un puntito y sigue el de la letra
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