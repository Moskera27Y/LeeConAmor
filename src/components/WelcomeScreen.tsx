import { useEffect, useRef, useState } from 'react';
import { AVATARS, saveProfile, type RangeId } from '../data/curriculum';
import VoicePicker from './VoicePicker';
import EvaluacionInicial from './EvaluacionInicial';

interface Props {
  onDone: () => void;
}

export default function WelcomeScreen({ onDone }: Props) {
  const [nombre, setNombre] = useState('');
  const [rango, setRango] = useState<RangeId>('3-5');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [voiceOn, setVoiceOn] = useState(true);
  const [micOk, setMicOk] = useState<string>('');
  const [mostrandoEvaluacion, setMostrandoEvaluacion] = useState(false);
  const [perfilBase, setPerfilBase] = useState<{ nombre: string; rango: RangeId; avatar: string; voiceOn: boolean } | null>(null);
  const vivoRef = useRef(true);

  useEffect(() => {
    vivoRef.current = true;
    return () => {
      vivoRef.current = false;
    };
  }, []);

  const probarMicro = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Si el adulto cerró esta pantalla mientras el navegador pedía permiso,
      // no dejamos el micrófono encendido.
      stream.getTracks().forEach((t) => t.stop());
      if (vivoRef.current) setMicOk('✅ Micrófono listo para leer contigo');
    } catch {
      if (vivoRef.current) setMicOk('⚠️ No pudimos usar el micrófono. Revisa el permiso del navegador.');
    }
  };

  const guardar = () => {
    const limpio = nombre.trim().slice(0, 20) || 'Peque';
    // Primero la evaluación (siempre) y después se guarda el perfil completo.
    // Así el recorrido guiado arranca con la etapa recomendada y el alta
    // funciona igual desde la pantalla inicial y desde "Nuevo peque".
    setPerfilBase({ nombre: limpio, rango, avatar, voiceOn });
    setMostrandoEvaluacion(true);
  };

  if (mostrandoEvaluacion && perfilBase) {
    return (
      <EvaluacionInicial
        rango={perfilBase.rango}
        nombre={perfilBase.nombre}
        avatar={perfilBase.avatar}
        onListo={(perfil) => {
          const final = { ...perfil, voiceEnabled: perfilBase.voiceOn };
          saveProfile(final);
          try { localStorage.setItem('lee_muted', perfilBase.voiceOn ? '0' : '1'); } catch { /* noop */ }
          onDone();
        }}
      />
    );
  }

  return (
    <div className="welcome-card">
      <div className="welcome-hero">🦉📚</div>
      <h2>Hola papá y mamá 👋</h2>
      <p className="welcome-sub">Cuéntanos de tu peque para adaptar la enseñanza con amor.</p>

      <label className="field-label">Primer nombre del niño/a</label>
      <input
        className="field-input"
        placeholder="Ej: Sofi"
        value={nombre}
        maxLength={20}
        onChange={(e) => setNombre(e.target.value)}
      />

      <label className="field-label">Elige el rango de edad</label>
      <div className="range-grid">
        <button
          type="button"
          className={`range-card ${rango === '3-5' ? 'active' : ''}`}
          onClick={() => setRango('3-5')}
        >
          <span className="range-emoji">🎨</span>
          <strong>3 a 5 · Pre-lector</strong>
          <small>Escuchar, vocales y sonidos. Sin prisa.</small>
        </button>
        <button
          type="button"
          className={`range-card ${rango === '6-8' ? 'active' : ''}`}
          onClick={() => setRango('6-8')}
        >
          <span className="range-emoji">📖</span>
          <strong>6 a 8 · Silábico</strong>
          <small>Sílabas, palabras y oraciones.</small>
        </button>
      </div>

      <label className="field-label">Elige su animalito</label>
      <div className="avatar-row">
        {AVATARS.map((a) => (
          <button key={a} type="button" className={`avatar-btn ${avatar === a ? 'active' : ''}`} onClick={() => setAvatar(a)}>
            {a}
          </button>
        ))}
      </div>

      <VoicePicker />

      <div className="welcome-row">
        <label className="check-row">
          <input type="checkbox" checked={voiceOn} onChange={(e) => setVoiceOn(e.target.checked)} />
          🔊 Voz suave de Léo activada
        </label>
        <button type="button" className="ghost-btn" onClick={probarMicro}>🎤 Probar micrófono</button>
      </div>
      {micOk && <div className="mic-status">{micOk}</div>}
      <p className="privacy-note">🔒 Sin cuenta, el progreso queda en este dispositivo. Con cuenta, se sincroniza para seguir en otro equipo. El audio de lectura se usa solo para transcribirlo y no se guarda en la app.</p>

      <button className="next-btn big" onClick={guardar}>Empezar a leer con amor 💛</button>
    </div>
  );
}

