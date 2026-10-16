import { useState } from 'react';
import VoicePicker from './VoicePicker';
import MapaDominio from './MapaDominio';
import type { EstadoMotor } from '../data/motorNiveles';

interface Props {
  nombre: string;
  rango: string;
  avatar: string;
  muted: boolean;
  onToggleMute: () => void;
  onProbarVoz: () => void;
  onCallar: () => void;
  fuente: string;
  motivoTexto: string;
  onReintentarVoz: () => void;
  onVozBasica: () => void;
  onCambiarPeque: () => void;
  onClose: () => void;
  motor: EstadoMotor;
  graduado: boolean;
  onExamen: () => void;
  emailNube: string;
  enLinea: boolean;
  onNube: () => void;
  onSalirNube: () => void;
}

// Zona solo para papá/mamá: primero una suma fácil que el peque no resuelve.
export default function ZonaPadres(p: Props) {
  const [a] = useState(() => 2 + Math.floor(Math.random() * 5));
  const [b] = useState(() => 3 + Math.floor(Math.random() * 4));
  const [resp, setResp] = useState('');
  const [abierto, setAbierto] = useState(false);

  if (!abierto) {
    return (
      <div className="padres-overlay">
        <div className="padres-card">
          <h2>🔒 Zona de padres</h2>
          <p>Solo adultos: ¿cuánto es {a} + {b}?</p>
          <input
            className="field-input"
            inputMode="numeric"
            value={resp}
            onChange={(e) => setResp(e.target.value)}
            placeholder="Respuesta"
          />
          <div className="game-actions">
            <button
              className="next-btn"
              onClick={() => {
                if (Number(resp) === a + b) setAbierto(true);
                else setResp('');
              }}
            >
              Entrar
            </button>
            <button className="ghost-btn" onClick={p.onClose}>Volver al juego</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="padres-overlay">
      <div className="padres-card">
        <h2>👪 Zona de padres</h2>
        <p className="padres-sub">{p.avatar} {p.nombre} · {p.rango === '3-5' ? '3-5 Pre-lector' : '6-8 Silábico'} · voz {p.fuente === 'nativa' ? 'básica' : 'suave'}</p>
        <VoicePicker onProbar={p.onProbarVoz} />
        <MapaDominio motor={p.motor} />
        <div className="padres-row">
          {p.graduado ? (
            <span className="peque-stars">🎓 Ya graduada/o ¡felicidades!</span>
          ) : (
            <button className="next-btn" onClick={p.onExamen}>🎓 Mi hija ya lo sabe: examen</button>
          )}
        </div>
        <div className="padres-row">
          <button className="icon-btn" onClick={p.onToggleMute}>{p.muted ? '🔇 Activar voz' : '🔈 Silenciar voz'}</button>
          <button className="icon-btn" onClick={p.onCallar}>🤫 Callar a Léo</button>
        </div>
        {p.motivoTexto && (
          <div className="voice-warning">
            ⚠️ {p.motivoTexto}
            <div className="voice-warning-btns">
              <button className="retry-btn" onClick={p.onReintentarVoz}>🔄 Reintentar voz suave</button>
              <button className="ghost-btn" onClick={p.onVozBasica}>usar voz básica</button>
            </div>
          </div>
        )}
        <div className="padres-row">
          {p.emailNube ? (
            <>
              <span className="peque-stars">☁️ {p.emailNube} {p.enLinea ? '· en línea ✓' : '· sin internet…'}</span>
              <button className="ghost-btn" onClick={p.onSalirNube}>🔓 Cerrar sesión</button>
            </>
          ) : (
            <button className="ghost-btn" onClick={p.onNube}>☁️ Guardar en la nube</button>
          )}
        </div>
        <div className="padres-row">
          <button className="ghost-btn" onClick={p.onCambiarPeque}>👪 Cambiar peque</button>
          <button className="next-btn" onClick={p.onClose}>Volver al juego 💛</button>
        </div>
      </div>
    </div>
  );
}
