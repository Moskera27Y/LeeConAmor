import { useState, useCallback, type MouseEvent, type TouchEvent } from 'react';

interface LetraTrazo {
  letra: string;
  fonetica: string;
  imagen: string;
}

const LETRAS_TRACO: LetraTrazo[] = [
  { letra: 'A', fonetica: 'aaa como manzana', imagen: '🍎' },
  { letra: 'E', fonetica: 'eee como elefante', imagen: '🐘' },
  { letra: 'I', fonetica: 'iii como isla', imagen: '🏝️' },
  { letra: 'O', fonetica: 'ooo como oso', imagen: '⚽' },
  { letra: 'U', fonetica: 'uuu como uva', imagen: '🍇' },
  { letra: 'M', fonetica: 'mmm como mamá', imagen: '👩' },
  { letra: 'P', fonetica: 'ppp como papá', imagen: '👨' },
  { letra: 'S', fonetica: 'sss como serpiente', imagen: '🐍' },
  { letra: 'L', fonetica: 'lll como luna', imagen: '🌙' },
  { letra: 'T', fonetica: 'ttt como tambor', imagen: '🥁' },
];

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

  const iniciar = useCallback(() => {
    const letra = LETRAS_TRACO[Math.floor(Math.random() * LETRAS_TRACO.length)];
    setActual(letra);
    setPuntos([]);
    setCompletado(false);
  }, []);

  const manejarInicio = useCallback((e: TouchEvent | MouseEvent) => {
    if (!actual || completado) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setPuntos([{ x: clientX - rect.left, y: clientY - rect.top }]);
  }, [actual, completado]);

  const manejarMover = useCallback((e: TouchEvent | MouseEvent) => {
    if (!actual || completado || puntos.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setPuntos((prev) => [...prev, { x: clientX - rect.left, y: clientY - rect.top }]);
  }, [actual, completado, puntos.length]);

  const manejarFin = useCallback(() => {
    if (!actual || completado) return;
    setCompletado(true);
    speak(`¡Muy bien! Trazaste la ${actual.letra}, suena ${actual.fonetica}.`);
    onCorrecto();
  }, [actual, speak, onCorrecto]);

  return (
    <div className="trazo-letra" style={{ textAlign: 'center', padding: '1rem' }}>
      {!actual && (
        <button
          className="listen-btn"
          onClick={iniciar}
          style={{ marginBottom: '1rem', minHeight: '56px' }}
        >
          🔊 Empezar trazo de letras
        </button>
      )}

      {actual && (
        <>
          <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>{actual.letra}</div>
          <div style={{ fontSize: '4rem', marginBottom: '0.5rem', opacity: 0.3 }}>{actual.letra}</div>
          <p style={{ fontSize: '1.3rem', fontWeight: '800', color: '#333', margin: '0 0 0.5rem' }}>
            Traza la letra {actual.letra} con tu dedo
          </p>
          <p style={{ fontSize: '1rem', color: '#666', margin: '0 0 1rem' }}>{actual.fonetica}</p>
          <div
            style={{
              width: '100%',
              height: '200px',
              border: '2px dashed #e5e7eb',
              borderRadius: '16px',
              position: 'relative',
              background: '#fafafa',
            }}
            onTouchStart={manejarInicio}
            onTouchMove={(e) => { e.preventDefault(); manejarMover(e); }}
            onTouchEnd={manejarFin}
            onMouseDown={manejarInicio}
            onMouseMove={manejarMover}
            onMouseUp={manejarFin}
          >
            {puntos.map((p, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: p.x,
                  top: p.y,
                  width: '8px',
                  height: '8px',
                  background: '#764ba2',
                  borderRadius: '50%',
                  transform: 'translate(-50%, -50%)',
                  opacity: 0.8,
                }}
              />
            ))}
            {completado && (
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '3rem' }}>✅</div>
            )}
          </div>
          <div style={{ marginTop: '1rem' }}>
            <button
              onClick={reiniciarLetra}
              disabled={!completado || isSpeaking}
              className="ghost-btn"
              style={{ minHeight: '48px', fontSize: '0.9rem', marginRight: '0.5rem' }}
            >
              🔄 Otra letra
            </button>
          </div>
        </>
      )}

      {!actual && (
        <button
          className="listen-btn"
          onClick={iniciar}
          style={{ minHeight: '56px' }}
        >
          👆 Empezar trazo
        </button>
      )}
    </div>
  );

  function reiniciarLetra() {
    setPuntos([]);
    setCompletado(false);
  }
}
