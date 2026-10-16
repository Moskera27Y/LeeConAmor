import { useState } from 'react';
import { loadProgreso, loadScore, type ChildProfile } from '../data/curriculum';
import WelcomeScreen from './WelcomeScreen';

interface Props {
  perfiles: ChildProfile[];
  activoId: string;
  onElegir: (id: string) => void;
  onNuevoListo: () => void;
  onClose: () => void;
}

// Menú gráfico de peques para turnarse (solo adultos: primero una suma fácil).
export default function MenuPeques({ perfiles, activoId, onElegir, onNuevoListo, onClose }: Props) {
  const [a] = useState(() => 2 + Math.floor(Math.random() * 5));
  const [b] = useState(() => 3 + Math.floor(Math.random() * 4));
  const [resp, setResp] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [nuevo, setNuevo] = useState(false);

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
            <button className="ghost-btn" onClick={onClose}>Volver al juego</button>
          </div>
        </div>
      </div>
    );
  }

  if (nuevo) {
    return (
      <div className="padres-overlay">
        <div className="padres-card">
          <WelcomeScreen
            onDone={() => {
              setNuevo(false);
              onNuevoListo();
            }}
          />
          <div className="game-actions">
            <button className="ghost-btn" onClick={() => setNuevo(false)}>← Ver peques</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="padres-overlay">
      <div className="padres-card peques-card">
        <h2>👪 ¿Quién aprende ahora?</h2>
        <p className="padres-sub">Cada peque guarda su propio progreso y puntaje.</p>
        <div className="peques-grid">
          {perfiles.map((p) => {
            const sc = loadScore(p.id);
            const pr = loadProgreso(p.id);
            const pct = pr.total === 0 ? 0 : Math.round((pr.done / pr.total) * 100);
            return (
              <button
                key={p.id}
                type="button"
                className={`peque-card ${p.id === activoId ? 'active' : ''}`}
                onClick={() => onElegir(p.id)}
              >
                <span className="peque-avatar">{p.avatar}</span>
                <strong>{p.nombre}</strong>
                <small>{p.rango === '3-5' ? '🎨 3-5' : '📖 6-8'}</small>
                <span className="peque-stars">⭐ {sc}</span>
                <div className="peque-bar"><div className="peque-fill" style={{ width: `${pct}%` }} /></div>
                <small>{pct}% · nivel {Math.min(pr.done + 1, pr.total)}</small>
              </button>
            );
          })}
          <button type="button" className="peque-card peque-nuevo" onClick={() => setNuevo(true)}>
            <span className="peque-avatar">＋</span>
            <strong>Nuevo peque</strong>
            <small>Nombre, edad y avatar</small>
          </button>
        </div>
        <div className="game-actions">
          <button className="ghost-btn" onClick={onClose}>Volver al juego 💛</button>
        </div>
      </div>
    </div>
  );
}
