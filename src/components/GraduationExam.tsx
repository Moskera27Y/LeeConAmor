import { useMemo, useState } from 'react';
import { ABECEDARIO, VOCALES } from '../data/motorNiveles';
import { F_GRADUACION } from '../data/frases';

interface Props {
  speak: (t: string) => void;
  isSpeaking: boolean;
  onAprobar: () => void;
  onClose: () => void;
}

// Examen corto de graduación: 2 vocales + 4 del abecedario. Lo aprueba el padre.
export default function GraduationExam({ speak, isSpeaking, onAprobar, onClose }: Props) {
  const preguntas = useMemo(() => {
    const vs = [...VOCALES].sort(() => Math.random() - 0.5).slice(0, 2);
    const cs = ABECEDARIO.filter((l) => !VOCALES.includes(l)).sort(() => Math.random() - 0.5).slice(0, 4);
    return [...vs, ...cs].sort(() => Math.random() - 0.5);
  }, []);
  const [idx, setIdx] = useState(0);
  const [aciertos, setAciertos] = useState(0);
  const [opciones, setOpciones] = useState<string[]>(() => opcionesPara(preguntas[0]));
  const [fin, setFin] = useState(false);
  const [elegida, setElegida] = useState<string | null>(null);

  function opcionesPara(letra: string): string[] {
    const dist = ABECEDARIO.filter((l) => l !== letra).sort(() => Math.random() - 0.5).slice(0, 3);
    return [...dist, letra].sort(() => Math.random() - 0.5);
  }

  const preguntar = () => speak(`Toca la letra ${preguntas[idx]}`);

  const elegir = (l: string) => {
    if (elegida) return;
    setElegida(l);
    const bien = l === preguntas[idx];
    const n = bien ? aciertos + 1 : aciertos;
    setTimeout(() => {
      if (idx + 1 >= preguntas.length) {
        setAciertos(n);
        setFin(true);
        if (n >= 5) {
          speak(F_GRADUACION);
          onAprobar();
        } else {
          speak('Buen intento. Sigue practicando y lo intentamos de nuevo.');
        }
      } else {
        setAciertos(n);
        setElegida(null);
        const ni = idx + 1;
        setIdx(ni);
        setOpciones(opcionesPara(preguntas[ni]));
      }
    }, 900);
  };

  if (fin) {
    return (
      <div className="padres-overlay">
        <div className="padres-card" style={{ textAlign: 'center' }}>
          {aciertos >= 5 ? (
            <>
              <div style={{ fontSize: '4rem' }}>🎓🎉</div>
              <h2>¡Graduada/o!</h2>
              <p>{aciertos}/6 — Ya sabe las vocales y el abecedario.</p>
              <button className="next-btn" onClick={onClose}>Celebrar 💛</button>
            </>
          ) : (
            <>
              <div style={{ fontSize: '4rem' }}>💪</div>
              <h2>{aciertos}/6 — Casi listo</h2>
              <p>Sigue practicando en el repaso infinito y vuelve al examen.</p>
              <button className="next-btn" onClick={onClose}>Seguir practicando</button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="padres-overlay">
      <div className="padres-card" style={{ textAlign: 'center' }}>
        <h2>🎓 Examen ({idx + 1}/6)</h2>
        <p>Pulsa 🔊 para escuchar qué letra debe tocar el peque.</p>
        <button className="btn-escuchar-grande" onClick={preguntar} disabled={isSpeaking} aria-label="Escuchar pregunta">
          🔊
        </button>
        <div className="letters-container">
          {opciones.map((l) => (
            <button
              key={l}
              className={`letter-btn ${elegida === l ? (l === preguntas[idx] ? 'selected' : 'wrong') : ''}`}
              onClick={() => elegir(l)}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="game-actions">
          <button className="ghost-btn" onClick={onClose}>Salir</button>
        </div>
      </div>
    </div>
  );
}
