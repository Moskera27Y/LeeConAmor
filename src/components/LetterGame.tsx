import { useCallback, useEffect, useRef, useState } from 'react';
import type { Level } from '../data/curriculum';
import BotMessage from './BotMessage';
import { ABECEDARIO } from '../data/motorNiveles';
import { F_ERROR_CASI, F_NIVEL_OK } from '../data/frases';
import { fraseToca } from '../data/frasesVoz';

declare global {
  interface Window {
    confetti?: (...args: any[]) => void;
  }
}

interface Props {
  levels: Level[];
  nombre: string;
  speak: (t: string) => void;
  hablarSecuencia?: (t: string[]) => Promise<boolean>;
  isSpeaking: boolean;
  score: number;
  setScore: (fn: (s: number) => number) => void;
  onProgress: (completados: number, total: number) => void;
  onRepeat: () => void;
  onResultado?: (r: { aciertos: number; total: number; falladas: string[]; acertadas: string[] }) => void;
  onAvanzar?: () => void;
  tituloNivel?: string;
}

const PRAISE = ['¡Muy bien! 🎉', '¡Genial! ⭐', '¡Súper! 🌈', '¡Hermoso! 💛'];

function barajar<T>(lista: T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

async function boomConfetti(colores?: string[]) {
  try {
    if (typeof window !== 'undefined' && window.confetti) {
      window.confetti({ particleCount: 30, spread: 60, origin: { y: 0.7 }, colors: colores });
      return;
    }
    const mod = await import('canvas-confetti');
    mod.default({ particleCount: 30, spread: 60, origin: { y: 0.7 }, colors: colores });
  } catch { /* noop */ }
}

export default function LetterGame({
  levels = [], nombre = '', speak = () => {}, hablarSecuencia, isSpeaking = false,
  score = 0, setScore = (s) => s, onProgress = () => {}, onRepeat = () => {},
  onResultado, onAvanzar, tituloNivel,
}: Props & { key?: string }) {
  const config: Level | undefined = levels[0];

  const [targets, setTargets] = useState<string[]>([]);
  const [ronda, setRonda] = useState(0);
  const [target, setTarget] = useState('');
  const [opciones, setOpciones] = useState<string[]>([]);
  const [elegida, setElegida] = useState<string | null>(null);
  const [resultado, setResultado] = useState<'correcto' | 'incorrecto' | null>(null);
  const [aciertos, setAciertos] = useState(0);
  const [intentos, setIntentos] = useState(0);
  const [falladas, setFalladas] = useState<string[]>([]);
  const [completado, setCompletado] = useState(false);
  const [reportado, setReportado] = useState(false);
  const [botTipo, setBotTipo] = useState<'bien' | 'mal' | 'info'>('info');
  const [botTexto, setBotTexto] = useState('');
  const temporizador = useRef<number | null>(null);

  // Una sola ronda a la vez: el niño escucha UNA letra y la busca.
  const armarRonda = useCallback((letra: string) => {
    if (!config) return;
    setTarget(letra);
    setResultado(null);
    setElegida(null);
    const distractores = (config.distractores || []).filter((d) => d && d !== letra);
    const relleno = barajar(ABECEDARIO.filter((l) => l !== letra && !distractores.includes(l)));
    const opcionesRonda = barajar([letra, ...[...distractores, ...relleno].slice(0, 3)]);
    setOpciones(opcionesRonda);
    setBotTipo('info');
    setBotTexto(`${config.descripcion}. Escucha a Léo y toca la letra.`);
    speak(fraseToca(letra));
  }, [config, speak]);

  // Preparar el nivel (una vez por nivel).
  useEffect(() => {
    if (!config) return;
    if (temporizador.current) window.clearTimeout(temporizador.current);
    const orden = barajar(Array.from(new Set(config.targetLetters || [])));
    setTargets(orden);
    setRonda(0);
    setAciertos(0);
    setIntentos(0);
    setFalladas([]);
    setCompletado(false);
    setReportado(false);
    if (orden[0]) armarRonda(orden[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.id]);

  useEffect(() => {
    return () => {
      if (temporizador.current) window.clearTimeout(temporizador.current);
    };
  }, []);

  const siguienteRonda = useCallback(() => {
    const i = ronda + 1;
    if (i >= targets.length) {
      setCompletado(true);
      return;
    }
    setRonda(i);
    armarRonda(targets[i]);
  }, [ronda, targets, armarRonda]);

  // Al completar: reportar al motor una sola vez y celebrar con la voz clonada.
  useEffect(() => {
    if (!completado || reportado || !config) return;
    setReportado(true);
    setBotTipo('bien');
    setBotTexto(`${F_NIVEL_OK} ${config.reward}`);
    if (hablarSecuencia) hablarSecuencia([F_NIVEL_OK, config.reward]);
    else speak(config.reward);
    boomConfetti();
    if (onResultado) {
      const falladasUnicas = Array.from(new Set<string>(falladas));
      const acertadasUnicas = Array.from(new Set<string>(targets));
      onResultado({
        aciertos,
        total: Math.max(1, aciertos + intentos),
        falladas: falladasUnicas,
        acertadas: acertadasUnicas,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completado]);

  useEffect(() => {
    onProgress(completado ? targets.length : ronda, Math.max(1, targets.length));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ronda, completado, targets.length]);

  const tocar = (letra: string) => {
    if (!config || resultado || completado) return;
    setElegida(letra);
    if (letra === target) {
      setResultado('correcto');
      setAciertos((n) => n + 1);
      setScore((s) => s + 10);
      const praise = PRAISE[Math.floor(Math.random() * PRAISE.length)];
      setBotTipo('bien');
      setBotTexto(`${praise} ${nombre}, esa es la letra ${target}.`);
      speak(praise);
      boomConfetti();
      temporizador.current = window.setTimeout(siguienteRonda, 1200);
    } else {
      setResultado('incorrecto');
      setIntentos((n) => n + 1);
      setFalladas((f) => (f.includes(letra) ? f : [...f, letra]));
      setScore((s) => Math.max(0, s - 5));
      setBotTipo('mal');
      setBotTexto(`¡Casi, ${nombre}! Esa es la ${letra}. Buscamos la ${target}. Prueba otra vez con amor ❤️`);
      speak(F_ERROR_CASI);
      temporizador.current = window.setTimeout(() => {
        setResultado(null);
        setElegida(null);
      }, 1200);
    }
  };

  const reintentar = () => {
    if (!config) return;
    const orden = barajar(Array.from(new Set(config.targetLetters || [])));
    setTargets(orden);
    setRonda(0);
    setAciertos(0);
    setIntentos(0);
    setFalladas([]);
    setCompletado(false);
    setReportado(false);
    if (orden[0]) armarRonda(orden[0]);
  };

  if (!config) return null;

  const totalRondas = Math.max(1, targets.length);

  return (
    <div className="letter-game">
      <div className="game-header">
        <h2 className="level-title">
          {tituloNivel || config.titulo}
          <span className="level-badge">{config.descripcion}</span>
        </h2>
        <div className="score-display">⭐ Puntos de {nombre}: <span className="score">{score}</span> · intentos con amor: {intentos}</div>

        <BotMessage tipo={botTipo} texto={botTexto} hablando={isSpeaking} nombre={nombre} onRepeat={onRepeat} />

        <div className="level-instruction">
          <p>🎯 Escucha a Léo y toca la letra que dice</p>
          <p className="targets">Ronda {Math.min(ronda + 1, totalRondas)} de {totalRondas}</p>
        </div>

        {aciertos > 0 && <div className="selected-letters">✅ Aciertos: {aciertos}</div>}
      </div>

      <div className="letters-container">
        {opciones.map((letra, i) => (
          <button
            key={`${letra}-${i}`}
            className={`letter-btn ${resultado === 'correcto' && elegida === letra ? 'selected' : ''} ${resultado === 'incorrecto' && elegida === letra ? 'wrong' : ''}`}
            onClick={() => tocar(letra)}
            disabled={!!resultado || completado}
            style={{ animationDelay: `${i * 80}ms` }}
            aria-label={`Letra ${letra}`}
          >
            {letra}
          </button>
        ))}
      </div>

      {completado && <div className="level-complete">🎉 ¡Nivel completado! {config.reward}</div>}

      <div className="game-actions">
        <button className="retry-btn" onClick={reintentar}>🔄 Intentar de nuevo este nivel</button>
        <button
          className="next-btn"
          onClick={() => {
            setScore((s) => s + 30);
            if (onAvanzar) onAvanzar();
            else reintentar();
          }}
          disabled={!completado}
          title={!completado ? 'Termina primero con amor' : ''}
        >
          {!completado ? '🔒 Termina primero' : 'SIGUIENTE NIVEL →'}
        </button>
      </div>
      <div className="score-hint">Puntuación actual: {score} (acierto +10, error -5 sin bajar de 0)</div>
    </div>
  );
}
