import { useEffect, useRef, useState } from 'react';

interface Props {
  ocupado: boolean;
  restante: number;
}

// Indicador global de espera de voz. Mientras Léo habla muestra cuántos
// segundos faltan (contador grande); al terminar, un breve "¡Ya puedes
// tocar!" para que el peque sepa cuándo marcar su respuesta sin cortar el
// audio. Vive en App (posición fija), así que cubre todos los juegos.
export default function IndicadorVoz({ ocupado, restante }: Props) {
  const [ya, setYa] = useState(false);
  const previo = useRef(ocupado);

  useEffect(() => {
    // Transición ocupado -> libre: muestra "¡Ya!" un momento.
    if (previo.current && !ocupado) {
      setYa(true);
      const t = window.setTimeout(() => setYa(false), 1600);
      previo.current = ocupado;
      return () => window.clearTimeout(t);
    }
    previo.current = ocupado;
  }, [ocupado]);

  if (!ocupado && !ya) return null;

  return (
    <div
      className={`voz-indicador ${ya ? 'voz-indicador-ya' : 'voz-indicador-espera'}`}
      role="status"
      aria-live="polite"
    >
      {ocupado ? (
        <>
          <span className="voz-indicador-icono" aria-hidden="true">🎧</span>
          <span className="voz-indicador-texto">Léo está hablando…</span>
          {restante > 0 && <b className="voz-contador" aria-hidden="true">{restante}</b>}
        </>
      ) : (
        <>
          <span className="voz-indicador-icono" aria-hidden="true">👆</span>
          <span className="voz-indicador-texto">¡Ya puedes tocar!</span>
        </>
      )}
    </div>
  );
}
