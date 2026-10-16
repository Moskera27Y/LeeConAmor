import { useState } from 'react';
import { AVATARS, saveProfile, type RangeId } from '../data/curriculum';
import VoicePicker from './VoicePicker';

interface Props {
  onDone: () => void;
}

export default function WelcomeScreen({ onDone }: Props) {
  const [nombre, setNombre] = useState('');
  const [rango, setRango] = useState<RangeId>('3-5');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [voiceOn, setVoiceOn] = useState(true);
  const [micOk, setMicOk] = useState<string>('');

  const probarMicro = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicOk('✅ Micrófono listo para leer contigo');
    } catch {
      setMicOk('⚠️ No pudimos usar el micrófono. Revisa el permiso del navegador.');
    }
  };

  const guardar = () => {
    const limpio = nombre.trim().slice(0, 20) || 'Peque';
    saveProfile({ nombre: limpio, rango, avatar, voiceEnabled: voiceOn, createdAt: Date.now() });
    try {
      localStorage.setItem('lee_muted', voiceOn ? '0' : '1');
    } catch { /* noop */ }
    onDone();
  };

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
      <p className="privacy-note">🔒 Los datos quedan solo en este dispositivo. El audio para evaluar lectura no se guarda.</p>

      <button className="next-btn big" onClick={guardar}>Empezar a leer con amor 💛</button>
    </div>
  );
}
