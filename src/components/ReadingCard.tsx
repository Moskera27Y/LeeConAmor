import { useEffect, useRef, useState } from 'react';
import { useReadingLesson } from '../hooks/useReadingLesson';
import { F_BIEN_LECTURA, F_BUEN_ESFUERZO, F_BUEN_INTENTO, F_ESCUCHA_LEE, F_NO_ESCUCHE, animarNombre, corregirNombre, felicitarNombre } from '../data/frases';

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

const AVISO_SIN_MICRO = 'Este navegador no deja usar el micrófono aquí. Abre la página en https o en localhost.';

export default function ReadingCard({ objetivo = '', imagen = '', pista = '', nombre = '', speak = () => {}, hablarSecuencia = async () => false, detener = () => {}, isSpeaking = false, onBien = () => {}, onSiguiente = () => {} }: Props & { key?: string }) {
  const { grabando, evaluando, oido, intentos, volumen, escuchandoVoz, motivo, distancia, grabarYEvaluar, reset, detenerGrabacion, hayReconocimientoNativo } = useReadingLesson(objetivo);
  const [lejos, setLejos] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [fase, setFase] = useState('');
  const [saltando, setSaltando] = useState(false);
  const [sinMicro, setSinMicro] = useState(!navigator.mediaDevices?.getUserMedia && !hayReconocimientoNativo);
  const cancelado = useRef(false);

  useEffect(() => {
    cancelado.current = true;
    reset();
    setLejos(false);
    setOcupado(false);
    setFase('');
    setSaltando(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objetivo]);

  useEffect(() => {
    return () => {
      cancelado.current = true;
      detener();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bloqueado = ocupado || grabando || evaluando || isSpeaking;

  const escuchar = async () => {
    if (bloqueado) return;
    cancelado.current = false;
    setOcupado(true);
    setFase('Escucha la letra…');
    // Solo lee la letra/palabra: claro y sin frases confusas.
    await hablarSecuencia([objetivo]);
    if (cancelado.current) return;
    setOcupado(false);
    setFase('');
  };

  // Si el micrófono no está disponible o falla tres veces, no se deja al
  // peque atrapado en la actividad: puede continuar y practicar después.
  const continuarSinMicro = () => {
    if (saltando) return;
    setSaltando(true);
    onBien(5);
    window.setTimeout(() => {
      if (!cancelado.current) onSiguiente();
    }, 700);
  };

  const fraseDeAnimo = () => {
    if (motivo === 'sin-audio') return F_NO_ESCUCHE;
    if (motivo === 'solo-muletillas') return F_BUEN_INTENTO;
    if (distancia !== null && distancia <= 3) return corregirNombre(nombre, pista);
    return intentos % 2 === 0 ? animarNombre(nombre) : F_BUEN_INTENTO;
  };

  const leer = async () => {
    if (bloqueado) return;
    cancelado.current = false;
    setOcupado(true);
    setFase('Léo te habla…');
    // Si la voz está silenciada, no se bloquea la lectura: el peque puede
    // practicar igual (solo se pierde la instrucción hablada).
    await hablarSecuencia([F_ESCUCHA_LEE]);
    if (cancelado.current) {
      setOcupado(false);
      setFase('');
      return;
    }
    setFase('');
    const r = await grabarYEvaluar();
    if (r.cancelado || cancelado.current) {
      setOcupado(false);
      setFase('');
      return;
    }
    if (r.bien) {
      setLejos(false);
      onBien(20);
      setFase('¡Lo lograste! 🎉');
      const finOk = await hablarSecuencia([felicitarNombre(nombre, objetivo), F_BIEN_LECTURA]);
      if (cancelado.current) return;
      setOcupado(false);
      setFase('');
      if (finOk) {
        await new Promise((res) => setTimeout(res, 1200));
        if (!cancelado.current) onSiguiente();
      }
      return;
    }
    setOcupado(false);
    if (cancelado.current) return;

    const repitePorEncima = intentos + 1 >= 3;
    const casi = !repitePorEncima && motivo === 'distinto' && distancia !== null && distancia <= 3;
    if (r.motivo === 'sin-audio') {
      setFase('');
    } else if (r.motivo === 'solo-muletillas') {
      setFase('Te oí, pero no la palabra...');
    } else if (casi) {
      setFase('Casi, casi...');
    } else {
      setFase('');
    }
    setLejos(repitePorEncima);
    speak(repitePorEncima ? F_BUEN_ESFUERZO : fraseDeAnimo());
  };

  const mostrarAyuda = lejos || intentos >= 3 || sinMicro;

  return (
    <div className="reading-card">
      <div className="reading-imagen">{imagen}</div>
      <div className="reading-objetivo">{objetivo}</div>
      <div className="reading-pista">💡 {pista}</div>
      {fase && <div className="reading-fase">{fase}</div>}
      <div className="reading-btns">
        <button className="listen-btn" onClick={escuchar} disabled={bloqueado}>🔊 Escucha el ejemplo</button>
        <button className="mic-btn" onClick={leer} disabled={bloqueado}>
          {grabando ? (escuchandoVoz ? '🎤 Te escucho...' : '🎤 Escuchando...') : evaluando ? '💭 Pensando...' : ocupado ? '💛 Léo habla…' : '🎤 Leer en voz alta'}
        </button>
      </div>
      {(bloqueado || grabando) && (
        <button className="ghost-btn" onClick={() => { cancelado.current = true; detener(); detenerGrabacion(); setOcupado(false); setFase(''); }}>
          ⏹ Parar
        </button>
      )}
      {grabando && (
        <div className="vol-wrap" aria-hidden="true">
          <div className="vol-bar"><div className="vol-fill" style={{ width: `${Math.round(volumen * 100)}%` }} /></div>
          <small>{escuchandoVoz ? '🎤 Te escucho… habla ahora' : '🎤 Acércate al micrófono y lee'}</small>
        </div>
      )}
      {oido && <div className="reading-oido">Te escuché: “{oido}” · intento {intentos}</div>}
      {mostrarAyuda && (
        <>
          <div className="reading-ayuda">Léo te ayuda: partimos en pedacitos 👉 {objetivo.split('').join('-')} · {pista}</div>
          {sinMicro && <p className="reading-aviso">{AVISO_SIN_MICRO}</p>}
          {!ocupado && !saltando && (
            <>
              <p className="reading-aviso">
                ¿El micrófono no funciona? Puedes continuar y practicar después.
              </p>
              <button className="ghost-btn" onClick={continuarSinMicro} style={{ minHeight: '48px' }}>
                ➡️ Ya lo intenté
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
