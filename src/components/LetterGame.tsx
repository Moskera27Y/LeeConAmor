import { useCallback, useEffect, useState } from 'react';
import type { Level } from '../data/curriculum';
import { F_ERROR_CASI, F_FELICIDADES_FIN, F_NIVEL_OK } from '../data/frases';
import BotMessage from './BotMessage';

declare global {
  interface Window {
    confetti?: any;
  }
}

interface Props {
  levels: Level[];
  nombre: string;
  speak: (t: string) => void;
  isSpeaking: boolean;
  score: number;
  setScore: (fn: (s: number) => number) => void;
  onProgress: (completados: number, total: number) => void;
  onRepeat: () => void;
  onResultado?: (r: { aciertos: number; total: number; falladas: string[]; acertadas: string[] }) => void;
  // Modo motor infinito: el padre App decide el siguiente nivel
  onAvanzar?: () => void;
  tituloNivel?: string;
}

const PRAISE = ['¡Muy bien! 🎉', '¡Genial! ⭐', '¡Súper! 🌈', '¡Hermoso! 💛'];

async function boomConfetti(colores?: string[]) {
  try {
    if (window.confetti) {
      window.confetti({ particleCount: 30, spread: 60, origin: { y: 0.7 }, colors: colores });
      return;
    }
    const mod = await import('canvas-confetti');
    mod.default({ particleCount: 30, spread: 60, origin: { y: 0.7 }, colors: colores });
  } catch { /* noop */ }
}

export default function LetterGame({ levels, nombre, speak, isSpeaking, score, setScore, onProgress, onRepeat, onResultado, onAvanzar, tituloNivel }: Props) {
  const [currentLevel, setCurrentLevel] = useState(1);
  const [letters, setLetters] = useState<string[]>([]);
  const [selectedLetters, setSelectedLetters] = useState<string[]>([]);
  const [wrongLetters, setWrongLetters] = useState<string[]>([]);
  const [botTipo, setBotTipo] = useState<'bien' | 'mal' | 'info'>('info');
  const [botTexto, setBotTexto] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [completedLevels, setCompletedLevels] = useState<number[]>([]);
  const [reportado, setReportado] = useState<number[]>([]);

  const config: Level = levels.find((l) => l.id === currentLevel) || levels[0];

  const generateLetters = useCallback(() => {
    const targets = config.targetLetters;
    const alphabet = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');
    const others = alphabet.filter((l) => !targets.includes(l));
    const extra = Array.from({ length: 4 }, () => others[Math.floor(Math.random() * others.length)]);
    // Objetivos siempre presentes: solo se recorta el relleno aleatorio
    const resto = 6 - targets.length;
    const mix = [...targets, ...extra.slice(0, Math.max(0, resto))].sort(() => Math.random() - 0.5);
    setLetters(mix);
    setSelectedLetters([]);
    setWrongLetters([]);
    setFoundWords([]);
    // Hablado: solo la instrucción fija (pregrabada). Los detalles van en pantalla.
    const intro = `${config.instruction} Buscamos: ${targets.join(', ')}.`;
    setBotTipo('info');
    setBotTexto(intro);
    speak(config.instruction);
  }, [config, speak]);

  useEffect(() => {
    generateLetters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLevel]);

  useEffect(() => {
    onProgress(completedLevels.length, levels.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedLevels.length]);

  const isLevelComplete = () => {
    const targets = config.targetLetters;
    return targets.every((t) => selectedLetters.includes(t)) && selectedLetters.length >= Math.min(3, targets.length);
  };

  // Reportar resultado una sola vez por nivel (alimenta el motor infinito)
  useEffect(() => {
    if (isLevelComplete() && onResultado && !reportado.includes(config.id)) {
      setReportado((p) => [...p, config.id]);
      onResultado({
        aciertos: selectedLetters.length,
        total: selectedLetters.length + wrongLetters.length,
        falladas: [...new Set(wrongLetters)],
        acertadas: [...new Set(selectedLetters)],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLetters, wrongLetters, config.id]);

  const handleLetterClick = (letter: string) => {
    if (isLevelComplete() || selectedLetters.includes(letter)) return;
    if (wrongLetters.includes(letter)) return;

    if (config.targetLetters.includes(letter)) {
      const next = [...selectedLetters, letter];
      setSelectedLetters(next);
      const word = next.join('');
      const praise = PRAISE[Math.floor(Math.random() * PRAISE.length)];
      setScore((s) => s + 10);
      if (config.wordsToHighlight.some((w) => w.startsWith(word)) && word.length >= 2) {
        setFoundWords((p) => (p.includes(word) ? p : [...p, word]));
        setBotTipo('bien');
        setBotTexto(`${praise} ${nombre}, formaste ${word}.`);
        speak(praise);
        setScore((s) => s + 5);
        boomConfetti();
      } else {
        const fon = config.phonetics[letter] || letter;
        setBotTipo('bien');
        setBotTexto(`${praise} ${nombre}, esa es la ${letter}, suena ${fon}.`);
        speak(praise);
        boomConfetti();
      }
      if (config.targetLetters.every((t) => next.includes(t)) && next.length >= Math.min(3, config.targetLetters.length)) {
        if (!completedLevels.includes(config.id)) setCompletedLevels((p) => [...p, config.id]);
        setBotTipo('bien');
        setBotTexto(`${F_NIVEL_OK} ${config.reward}`);
        speak(config.reward);
      }
    } else {
      setWrongLetters((p) => [...p, letter]);
      setAttempts((a) => a + 1);
      setScore((s) => Math.max(0, s - 5));
      setBotTipo('mal');
      setBotTexto(`¡Casi, ${nombre}! Esa es la ${letter}. Aquí buscamos: ${config.targetLetters.join(', ')}. ${config.phonetics[config.targetLetters[0]] || ''} Prueba otra vez con amor ❤️`);
      speak(F_ERROR_CASI);
      boomConfetti(['#ff6b6b', '#ffc107', '#ff9f40']);
      setTimeout(() => {
        setWrongLetters((p) => p.filter((l) => l !== letter));
      }, 1500);
    }
  };

  const retry = () => {
    generateLetters();
  };

  const nextLevel = () => {
    if (onAvanzar) {
      setScore((s) => s + 30);
      onAvanzar();
      return;
    }
    if (currentLevel < levels.length) {
      setCurrentLevel((c) => c + 1);
      setScore((s) => s + 30);
    } else {
      setScore((s) => s + 50);
      setBotTipo('bien');
      setBotTexto(`¡Felicidades, ${nombre}! Terminaste todo. Ahora lees por tu cuenta. 🎉`);
      speak(F_FELICIDADES_FIN);
      boomConfetti();
    }
  };

  const complete = isLevelComplete();

  return (
    <div className="letter-game">
      <div className="game-header">
        <h2 className="level-title">
          {tituloNivel || `Nivel ${currentLevel} - ${config.titulo}`}
          <span className="level-badge">{config.descripcion}</span>
        </h2>
        <div className="score-display">⭐ Puntos de {nombre}: <span className="score">{score}</span> · intentos con amor: {attempts}</div>

        <BotMessage tipo={botTipo} texto={botTexto} hablando={isSpeaking} nombre={nombre} onRepeat={onRepeat} />

        <div className="level-instruction"><p>🎯 {config.instruction}</p><p className="targets">Busca: {config.targetLetters.join(' · ')}</p></div>

        {selectedLetters.length > 0 && <div className="selected-letters">✅ Correctas: {selectedLetters.join(' ')}</div>}
        {foundWords.length > 0 && <div className="found-words">🌟 Palabras: {foundWords.join(', ')}</div>}
      </div>

      <div className="letters-container">
        {letters.map((letter, i) => (
          <button
            key={`${letter}-${i}`}
            className={`letter-btn ${selectedLetters.includes(letter) ? 'selected' : ''} ${wrongLetters.includes(letter) ? 'wrong' : ''}`}
            onClick={() => handleLetterClick(letter)}
            style={{ animationDelay: `${i * 80}ms` }}
            aria-label={`Letra ${letter}`}
          >
            {letter}
          </button>
        ))}
      </div>

      {complete && (onAvanzar || currentLevel < levels.length) && <div className="level-complete">🎉 ¡Nivel completado! {config.reward}</div>}
      {complete && !onAvanzar && currentLevel >= levels.length && (
        <div className="game-complete">🎉🎉 ¡FELICIDADES {nombre}! Terminaste todo.<br />Ahora puedes leer por tu cuenta.</div>
      )}

      <div className="game-actions">
        <button className="retry-btn" onClick={retry}>🔄 Intentar de nuevo este nivel</button>
        <button className="next-btn" onClick={nextLevel} disabled={!complete} title={!complete ? 'Termina primero con amor' : ''}>
          {!complete ? '🔒 Termina primero' : !onAvanzar && currentLevel >= levels.length ? '🎉 JUGAR OTRA VEZ' : 'SIGUIENTE NIVEL →'}
        </button>
      </div>
      <div className="score-hint">Puntaje actual: {score} (acierto +10, error -5 sin bajar de 0)</div>
    </div>
  );
}
