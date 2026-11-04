import { useState } from 'react';
import Storytime from './Storytime';
import { CUENTOS, type Cuento } from '../data/cuentos';

interface Props {
  speak: (t: string) => void;
  hablarSecuencia: (t: string[]) => Promise<boolean>;
  onTerminado: (cuento: Cuento) => void;
  isSpeaking: boolean;
  detener: () => void;
  muted: boolean;
}

// Biblioteca de cuentos: el peque elige cuál leer y Storytime lo lee
// palabra a palabra con la voz clonada de Léo.
export default function BibliotecaCuentos({
  speak, hablarSecuencia, onTerminado, isSpeaking, detener, muted,
}: Props) {
  const [elegido, setElegido] = useState<Cuento | null>(null);

  if (elegido) {
    return (
      <div>
        <button
          className="ghost-btn"
          onClick={() => { detener(); setElegido(null); }}
          style={{ marginBottom: '0.6rem', minHeight: '44px' }}
        >
          ⬅️ Otros cuentos
        </button>
        <Storytime
          texto={elegido.texto}
          speak={speak}
          hablarSecuencia={hablarSecuencia}
          onTerminado={() => onTerminado(elegido)}
          isSpeaking={isSpeaking}
          detener={detener}
          muted={muted}
        />
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', padding: '1rem' }}>
      <p style={{ fontSize: '1.3rem', fontWeight: '800', color: '#333', margin: '0 0 1rem' }}>
        📚 Elige un cuento
      </p>
      <div style={{ display: 'grid', gap: '0.8rem', maxWidth: '420px', margin: '0 auto' }}>
        {CUENTOS.map((c) => (
          <button
            key={c.id}
            className="listen-btn"
            onClick={() => setElegido(c)}
            style={{ minHeight: '64px', display: 'flex', alignItems: 'center', gap: '0.8rem', justifyContent: 'flex-start', padding: '0.8rem 1rem', whiteSpace: 'normal', textAlign: 'left' }}
          >
            <span style={{ fontSize: '1.8rem', flexShrink: 0 }}>{c.emoji}</span>
            <span style={{ textAlign: 'left', overflowWrap: 'anywhere' }}>
              <strong style={{ fontSize: '1.05rem' }}>{c.titulo}</strong>
              <br />
              <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>{c.texto.split(' ').length} palabras · Léo te lee</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
