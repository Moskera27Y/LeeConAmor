import { useState } from 'react';
import { loadProgreso, loadScore, type ChildProfile } from '../data/curriculum';
import WelcomeScreen from './WelcomeScreen';

interface Props {
  perfiles: ChildProfile[];
  activoId: string;
  onElegir: (id: string) => void;
  onNuevoListo: () => void;
  onClose: () => void;
  onCerrarSesionPadres?: () => void;
}

// Menú gráfico de peques para turnarse (solo adultos: primero una suma fácil).
// Ventana modal bien presentada con tarjetas bonitas y botón de cerrar sesión.
export default function MenuPeques({
  perfiles,
  activoId,
  onElegir,
  onNuevoListo,
  onClose,
  onCerrarSesionPadres,
}: Props) {
  const [a] = useState(() => 2 + Math.floor(Math.random() * 5));
  const [b] = useState(() => 3 + Math.floor(Math.random() * 4));
  const [resp, setResp] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [nuevo, setNuevo] = useState(false);

  // Pantalla de verificación de adulto (suma fácil)
  if (!abierto) {
    return (
      <div className="padres-modal-overlay" onClick={onClose}>
        <div className="padres-modal-card" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>🔒 Zona de padres</h2>
            <button className="btn-cerrar-modal" onClick={onClose}>✕</button>
          </div>
          <p style={{ textAlign: 'center', margin: '0 0 1.5rem', color: '#333' }}>
            Solo adultos: ¿cuánto es <strong>{a} + {b}</strong>?
          </p>
          <input
            className="field-input"
            inputMode="numeric"
            value={resp}
            onChange={(e) => setResp(e.target.value)}
            placeholder="Respuesta"
            autoFocus
          />
          <div className="game-actions" style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center', flexWrap: 'wrap' }}>
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

  // Pantalla de crear nuevo peque
  if (nuevo) {
    return (
      <div className="padres-modal-overlay" onClick={onClose}>
        <div className="padres-modal-card" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>➕ Nuevo peque</h2>
            <button className="btn-cerrar-modal" onClick={() => setNuevo(false)}>✕</button>
          </div>
          <WelcomeScreen
            onDone={() => {
              setNuevo(false);
              onNuevoListo();
            }}
          />
          <div className="game-actions" style={{ justifyContent: 'center', marginTop: '1rem' }}>
            <button className="ghost-btn" onClick={() => setNuevo(false)}>← Ver peques</button>
          </div>
        </div>
      </div>
    );
  }

  // Pantalla principal: elegir peque
  return (
    <div className="padres-modal-overlay" onClick={onClose}>
      <div className="padres-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>👪 ¿Quién aprende ahora?</h2>
          <button className="btn-cerrar-modal" onClick={onClose}>✕</button>
        </div>
        <p className="padres-sub">Cada peque guarda su propio progreso y puntaje.</p>

        <div className="peques-modal-grid">
          {perfiles.map((p) => {
            const sc = loadScore(p.id);
            const pr = loadProgreso(p.id);
            const pct = pr.total === 0 ? 0 : Math.round((pr.done / pr.total) * 100);
            const esActivo = p.id === activoId;
            return (
              <button
                key={p.id}
                type="button"
                className={`peque-card-modal ${esActivo ? 'active' : ''}`}
                onClick={() => onElegir(p.id)}
              >
                <span className="peque-avatar-modal">{p.avatar}</span>
                <strong>{p.nombre}</strong>
                <small>{p.rango === '3-5' ? '🎨 3-5' : '📖 6-8'}</small>
                <span className="peque-stars-modal">⭐ {sc}</span>
                <div className="peque-bar-modal">
                  <div className="peque-fill-modal" style={{ width: `${pct}%` }} />
                </div>
                <small>{pct}% completado</small>
              </button>
            );
          })}
          <button type="button" className="peque-card-modal peque-nuevo-modal" onClick={() => setNuevo(true)}>
            <span className="peque-avatar-modal">＋</span>
            <strong>Nuevo peque</strong>
            <small>Nombre, edad y avatar</small>
          </button>
        </div>

        <div className="game-actions" style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1.5rem' }}>
          {onCerrarSesionPadres && (
            <button className="btn-cerrar-sesion" onClick={onCerrarSesionPadres}>
              🚪 Cerrar sesión
            </button>
          )}
          <button className="ghost-btn" onClick={onClose}>Volver al juego 💛</button>
        </div>
      </div>
    </div>
  );
}
