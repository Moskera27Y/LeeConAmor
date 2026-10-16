import { useEffect, useState } from 'react';
import { useReadingLesson } from '../hooks/useReadingLesson';
import { F_BIEN_LECTURA, F_BUEN_ESFUERZO, F_BUEN_INTENTO, F_ESCUCHA_LEE, F_NO_ESCUCHE, comboLectura } from '../data/frases';

interface Props {
  objetivo: string;
  imagen: string;
  pista: string;
  nombre: string;
  speak: (t: string) => void;
  isSpeaking: boolean;
  onBien: (puntos: number) => void;
}

export default function ReadingCard({ objetivo, imagen, pista, nombre, speak, isSpeaking, onBien }: Props) {
  const { grabando, evaluando, oido, intentos, volumen, grabarYEvaluar, reset } = useReadingLesson(objetivo);
  const [lejos, setLejos] = useState(false);

  useEffect(() => {
    reset();
    setLejos(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objetivo]);

  const escuchar = () => speak(comboLectura(objetivo, pista));

  const leer = async () => {
    speak(F_ESCUCHA_LEE);
    const r = await grabarYEvaluar();
    if (r.bien) {
      setLejos(false);
      speak(F_BIEN_LECTURA);
      onBien(20);
    } else if (!r.raw) {
      speak(F_NO_ESCUCHE);
    } else if (r.dist <= 3) {
      // Tono 2: casi lo logra — animar a repetir
      setLejos(false);
      speak(F_BUEN_INTENTO);
    } else {
      // Tono 3: lejos — partir en pedacitos de una vez
      setLejos(true);
      speak(F_BUEN_ESFUERZO);
    }
  };

  return (
    <div className="reading-card">
      <div className="reading-imagen">{imagen}</div>
      <div className="reading-objetivo">{objetivo}</div>
      <div className="reading-pista">💡 {pista}</div>
      <div className="reading-btns">
        <button className="listen-btn" onClick={escuchar}>🔊 Escucha</button>
        <button className="mic-btn" onClick={leer} disabled={grabando || evaluando || isSpeaking}>
          {grabando ? '🎤 Escuchando...' : evaluando ? '💭 Pensando...' : '🎤 Leer en voz alta'}
        </button>
      </div>
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
