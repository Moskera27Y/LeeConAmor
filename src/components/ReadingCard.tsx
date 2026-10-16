import { useEffect, useState } from 'react';
import { useReadingLesson } from '../hooks/useReadingLesson';
import {
  F_BIEN_LECTURA,
  F_BUEN_ESFUERZO,
  F_BUEN_INTENTO,
  F_ESCUCHA_LEE,
  F_NO_ESCUCHE,
  animarNombre,
  comboLectura,
  corregirNombre,
  ejemploGuia,
  felicitarNombre,
} from '../data/frases';

interface Props {
  objetivo: string;
  imagen: string;
  pista: string;
  nombre: string;
  speak: (t: string) => void;
  hablarSecuencia: (t: string[]) => Promise<boolean>;
  detener: () => void;
  isSpeaking: boolean;
  onBien: (puntos: number) => void;
  onSiguiente: () => void;
}

// Lección guiada: ejemplo → el niño repite → corrección amable → avance auto.
export default function ReadingCard({ objetivo, imagen, pista, nombre, speak, hablarSecuencia, detener, isSpeaking, onBien, onSiguiente }: Props) {
  const { grabando, evaluando, oido, intentos, volumen, grabarYEvaluar, reset } = useReadingLesson(objetivo);
  const [lejos, setLejos] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [fase, setFase] = useState('');

  useEffect(() => {
    reset();
    setLejos(false);
    setOcupado(false);
    setFase('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objetivo]);

  const bloqueado = ocupado || grabando || evaluando || isSpeaking;

  // 🔊 Escucha: guía completa con ejemplo claro, sin traslapes
  const escuchar = async () => {
    if (bloqueado) return;
    setOcupado(true);
    setFase('Escucha el ejemplo…');
    await hablarSecuencia(ejemploGuia(objetivo, pista));
    setOcupado(false);
    setFase('');
  };

  // 🎤 Leer: Léo avisa, escucha al niño, corrige amable o celebra y avanza solo
  const leer = async () => {
    if (bloqueado) return;
    setOcupado(true);
    setFase('Léo te habla…');
    const avisoOk = await hablarSecuencia([F_ESCUCHA_LEE]);
    if (!avisoOk) {
      setOcupado(false);
      setFase('');
      return; // el adulto/niño tocó otra cosa: no grabar encima
    }
    setFase('');
    const r = await grabarYEvaluar();
    if (r.bien) {
      setLejos(false);
      onBien(20);
      setFase('¡Lo lograste! 🎉');
      const finOk = await hablarSecuencia([felicitarNombre(nombre, objetivo), F_BIEN_LECTURA]);
      setOcupado(false);
      setFase('');
      if (finOk) {
        await new Promise((res) => setTimeout(res, 1200)); // celebra antes de avanzar
        onSiguiente();
      }
      return;
    }
    setOcupado(false);
    if (!r.raw) {
      setFase('');
      speak(F_NO_ESCUCHE);
    } else if (r.dist <= 3) {
      // Casi: corrección amable con su nombre
      setLejos(false);
      setFase('Casi, casi…');
      speak(corregirNombre(nombre, pista));
    } else if (intentos + 1 >= 3) {
      setLejos(true);
      setFase('');
      speak(F_BUEN_ESFUERZO);
    } else {
      // Variedad amable para no sonar a regaño repetido
      setLejos(false);
      setFase('');
      speak(intentos % 2 === 0 ? animarNombre(nombre) : F_BUEN_INTENTO);
    }
  };

  return (
    <div className="reading-card">
      <div className="reading-imagen">{imagen}</div>
      <div className="reading-objetivo">{objetivo}</div>
      <div className="reading-pista">💡 {pista}</div>
      {fase && <div className="reading-fase">{fase}</div>}
      <div className="reading-btns">
        <button className="listen-btn" onClick={escuchar} disabled={bloqueado}>🔊 Escucha el ejemplo</button>
        <button className="mic-btn" onClick={leer} disabled={bloqueado}>
          {grabando ? '🎤 Escuchando...' : evaluando ? '💭 Pensando...' : ocupado ? '💛 Léo habla…' : '🎤 Leer en voz alta'}
        </button>
      </div>
      {(bloqueado || grabando) && (
        <button className="ghost-btn" onClick={() => { detener(); setOcupado(false); setFase(''); }}>
          ⏹ Parar
        </button>
      )}
      {grabando && (
        <div className="vol-wrap" aria-hidden="true">
          <div className="vol-bar"><div className="vol-fill" style={{ width: `${Math.round(volumen * 100)}%` }} /></div>
          <small>🎤 Te escucho… habla ahora</small>
        </div>
      )}
      {oido && <div className="reading-oido">Te escuché: “{oido}” · intento {intentos}</div>}
      {(lejos || intentos >= 3) && (
        <div className="reading-ayuda">Léo te ayuda: partimos en pedacitos 👉 {objetivo.split('').join('-')} · {pista}</div>
      )}
    </div>
  );
}
