import { useEffect, useMemo, useRef, useState } from 'react';
import { ABECEDARIO, VOCALES } from '../data/motorNiveles';
import { fraseToca } from '../data/frasesVoz';
import { F_BUEN_INTENTO_EXAMEN, F_GRADUACION } from '../data/frases';
import { useFocoAtrapado } from '../hooks/useFocoAtrapado';

interface Props {
  speak: (t: string) => void;
  isSpeaking: boolean;
  onAprobar: () => void;
  onClose: () => void;
}

type PreguntaExamen = { tipo: 'letra' | 'palabra'; valor: string };

const PALABRAS_EXAMEN = ['MAMA', 'PAPA', 'PERA', 'SOL', 'LUNA'];

// Examen corto de graduación: 2 vocales + 2 consonantes + 2 palabras.
export default function GraduationExam({ speak, isSpeaking, onAprobar, onClose }: Props) {
  const preguntas = useMemo<PreguntaExamen[]>(() => {
    const vs = [...VOCALES].sort(() => Math.random() - 0.5).slice(0, 2).map((valor) => ({ tipo: 'letra' as const, valor }));
    const cs = ABECEDARIO.filter((l) => !VOCALES.includes(l))
      .sort(() => Math.random() - 0.5)
      .slice(0, 2)
      .map((valor) => ({ tipo: 'letra' as const, valor }));
    const ps = [...PALABRAS_EXAMEN]
      .sort(() => Math.random() - 0.5)
      .slice(0, 2)
      .map((valor) => ({ tipo: 'palabra' as const, valor }));
    return [...vs, ...cs, ...ps].sort(() => Math.random() - 0.5);
  }, []);
  const [idx, setIdx] = useState(0);
  const [aciertos, setAciertos] = useState(0);
  const [opciones, setOpciones] = useState<string[]>(() => opcionesPara(preguntas[0]));
  const [fin, setFin] = useState(false);
  const [elegida, setElegida] = useState<string | null>(null);
  const temporizador = useRef<number | null>(null);
  const refContenedor = useFocoAtrapado(true, onClose);

  useEffect(() => {
    return () => {
      if (temporizador.current) window.clearTimeout(temporizador.current);
    };
  }, []);

  const cerrar = () => {
    if (temporizador.current) window.clearTimeout(temporizador.current);
    temporizador.current = null;
    onClose();
  };

  function opcionesPara(pregunta: PreguntaExamen): string[] {
    const pool = pregunta.tipo === 'palabra' ? PALABRAS_EXAMEN : ABECEDARIO;
    const dist = pool.filter((l) => l !== pregunta.valor).sort(() => Math.random() - 0.5).slice(0, 3);
    return [...dist, pregunta.valor].sort(() => Math.random() - 0.5);
  }

  const preguntar = () => {
    // Una sola frase clara: "Toca la vocal A." / "Toca la letra M." /
    // "Toca la palabra MAMA."
    speak(fraseToca(preguntas[idx].valor));
  };

  const elegir = (l: string) => {
    if (elegida) return;
    setElegida(l);
    const bien = l === preguntas[idx].valor;
    const n = bien ? aciertos + 1 : aciertos;
    temporizador.current = window.setTimeout(() => {
      if (idx + 1 >= preguntas.length) {
        setAciertos(n);
        setFin(true);
        if (n >= 5) {
          speak(F_GRADUACION);
          onAprobar();
        } else {
          speak(F_BUEN_INTENTO_EXAMEN);
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
      <div className="padres-overlay" role="dialog" aria-modal="true" aria-label="Resultado del examen" ref={refContenedor}>
        <div className="padres-card" style={{ textAlign: 'center' }}>
          {aciertos >= 5 ? (
            <>
              <div style={{ fontSize: '4rem' }}>🎓🎉</div>
              <h2>¡Graduada/o!</h2>
              <p>{aciertos}/6 — Ya reconoce letras y lee palabras.</p>
              <button className="next-btn" onClick={cerrar}>Celebrar 💛</button>
            </>
          ) : (
            <>
              <div style={{ fontSize: '4rem' }}>💪</div>
              <h2>{aciertos}/6 — Casi listo</h2>
              <p>Sigue practicando en el repaso infinito y vuelve al examen.</p>
              <button className="next-btn" onClick={cerrar}>Seguir practicando</button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="padres-overlay" role="dialog" aria-modal="true" aria-label="Examen de graduación" ref={refContenedor}>
      <div className="padres-card" style={{ textAlign: 'center' }}>
        <h2>🎓 Examen ({idx + 1}/6)</h2>
        <p>Pulsa 🔊 para escuchar qué letra o palabra debe tocar el peque.</p>
        <button className="btn-escuchar-grande" onClick={preguntar} disabled={isSpeaking} aria-label="Escuchar pregunta">
          🔊
        </button>
        <div className="letters-container">
          {opciones.map((l) => (
            <button
              key={l}
              className={`letter-btn ${elegida === l ? (l === preguntas[idx].valor ? 'selected' : 'wrong') : ''}`}
              onClick={() => elegir(l)}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="game-actions">
          <button className="ghost-btn" onClick={cerrar}>Salir</button>
        </div>
      </div>
    </div>
  );
}
