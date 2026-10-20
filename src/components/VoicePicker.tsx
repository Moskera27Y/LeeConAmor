import { VOCES } from '../data/voces';
import { useRef, useState } from 'react';

interface Props {
  compacto?: boolean;
  onProbar?: () => void;
  onCambiar?: (id: string) => void;
}

// Léo tiene una sola voz (Callirrhoe): se muestra insignia fija + probar.
export default function VoicePicker({ compacto, onProbar }: Props) {
  const [probando, setProbando] = useState(false);
  const [error, setError] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const voz = VOCES[0];

  const probarDirecto = async () => {
    if (onProbar) {
      onProbar();
      return;
    }
    setProbando(true);
    setError('');
    try {
      audioRef.current?.pause();
      const r = await fetch('/api/voz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: 'Hola, soy Léo. Vamos a leer juntitos con amor.', voz: voz.id }),
      });
      if (r.ok) {
        const data = await r.json();
        if (data?.audio) {
          const a = new Audio(`data:${data.mime || 'audio/wav'};base64,${data.audio}`);
          audioRef.current = a;
          a.onended = () => setProbando(false);
          a.onerror = () => {
            setProbando(false);
            setError('El audio no se pudo reproducir. Prueba otra vez.');
          };
          await a.play();
          return;
        }
      }
      setError('No pudimos probar la voz ahora. Revisa la conexión.');
    } catch {
      setError('No pudimos probar la voz ahora. Revisa la conexión.');
    }
    setProbando(false);
  };

  if (compacto) {
    return (
      <span className="voice-picker-compact" title={`Voz de Léo: ${voz.nombre}`}>
        🎀 {voz.nombre}
        <button className="icon-btn" onClick={probarDirecto} title="Probar voz de Léo">▶️</button>
      </span>
    );
  }

  return (
    <div className="voice-picker">
      <label className="field-label">🎀 Voz de Léo</label>
      <div className="voice-fixed">
        <strong>💬 {voz.nombre}</strong>
        <small>{voz.desc}</small>
      </div>
      <button type="button" className="ghost-btn" onClick={probarDirecto} disabled={probando}>
        {probando ? '💬 Sonando...' : '▶️ Probar cómo suena'}
      </button>
      {error && <small style={{ color: '#b23b3b', display: 'block', marginTop: '0.4rem' }}>⚠️ {error}</small>}
    </div>
  );
}
