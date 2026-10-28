import { useState } from 'react';
import VoicePicker from './VoicePicker';
import MapaDominio from './MapaDominio';
import { useFocoAtrapado } from '../hooks/useFocoAtrapado';
import type { EstadoMotor } from '../data/motorNiveles';
import { dominio } from '../data/motorNiveles';

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
  score?: number;
  progreso?: { done: number; total: number };
  leccionNum?: number;
  totalLecciones?: number;
  pctCurso?: number;
}

// Zona solo para papá/mamá: primero una suma fácil que el peque no resuelve.
export default function ZonaPadres(p: Props) {
  const [a] = useState(() => 2 + Math.floor(Math.random() * 5));
  const [b] = useState(() => 3 + Math.floor(Math.random() * 4));
  const [resp, setResp] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [vista, setVista] = useState<'resumen' | 'consejos' | 'offline'>( 'resumen');
  const refContenedor = useFocoAtrapado(true, p.onClose);

  if (!abierto) {
    return (
      <div className="padres-overlay" role="dialog" aria-modal="true" aria-label="Zona de padres" ref={refContenedor}>
        <div className="padres-card">
          <h2>🔒 Zona de padres</h2>
          <p>Solo adultos: ¿cuánto es {a} + {b}?</p>
          <label className="field-label" htmlFor="respuesta-padres">Respuesta</label>
          <input
            id="respuesta-padres"
            className="field-input"
            inputMode="numeric"
            value={resp}
            onChange={(e) => setResp(e.target.value)}
            placeholder="Respuesta"
            autoFocus
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

  const letrasDificiles = Object.entries(p.motor.pesos)
    .filter(([_, f]) => f > 0)
    .map(([letra, f]) => ({ letra, fallos: f }))
    .sort((a, b) => b.fallos - a.fallos)
    .slice(0, 5);

  const consejos =
    p.rango === '3-5'
      ? [
          'Practica las vocales A, E, I, O, U pidiendo a tu peque que las busque en carteles de la calle.',
          'Juega a "veo veo" con sonidos: "veo algo que empieza con M".',
          'Lee cuentos en voz alta y señala cada palabra con el dedo.',
        ]
      : [
          'Pide a tu peque que te lea en voz alta las sílabas que aprende cada día.',
          'Forma palabras con imanes de nevera o letras recortadas de papel.',
          'Practica la lectura de sílabas trabadas (PRA, TRA, BRA) con palabras como "prado" o "brazo".',
        ];

  const nombreFuente = p.fuente === 'clon' ? 'suave' : p.fuente === 'nativa' ? 'básica' : 'sin voz';
  const etapaNombre = p.motor.etapa === 'vocales' ? 'Vocales'
    : p.motor.etapa === 'silabas' ? 'Sílabas'
    : p.motor.etapa === 'palabras' ? 'Palabras'
    : 'Oraciones';

  return (
    <div className="padres-overlay" role="dialog" aria-modal="true" aria-label="Zona de padres" ref={refContenedor}>
      <div className="padres-card">
        <h2>👪 Zona de padres</h2>
        <p className="padres-sub">{p.avatar} {p.nombre} · {p.rango === '3-5' ? '3-5 Pre-lector' : '6-8 Silábico'} · voz {nombreFuente}</p>

        <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <button
            className={`icon-btn ${vista === 'resumen' ? 'active-tab' : ''}`}
            onClick={() => setVista('resumen')}
          >
            📊 Resumen
          </button>
          <button
            className={`icon-btn ${vista === 'consejos' ? 'active-tab' : ''}`}
            onClick={() => setVista('consejos')}
          >
            💡 Consejos
          </button>
          <button
            className={`icon-btn ${vista === 'offline' ? 'active-tab' : ''}`}
            onClick={() => setVista('offline')}
          >
            🖨️ Offline
          </button>
        </div>

        {vista === 'resumen' && (
          <div className="padres-resumen">
            <h3 style={{ margin: '0 0 0.8rem', color: '#764ba2', fontSize: '1.1rem' }}>Progreso de {p.nombre}</h3>
            <div style={{ background: '#f7f4fd', borderRadius: '14px', padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Etapa actual:</span>
                <strong>{etapaNombre}</strong>
              </div>
              {p.leccionNum && p.totalLecciones ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Lección:</span>
                  <strong>{p.leccionNum} / {p.totalLecciones}</strong>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Nivel:</span>
                  <strong>{p.motor.n + 1}</strong>
                </div>
              )}
              {typeof p.pctCurso === 'number' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Progreso del curso:</span>
                  <strong>{p.pctCurso}%</strong>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Puntuación:</span>
                <strong>⭐ {p.score ?? 0}</strong>
              </div>
              {p.progreso && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Juego libre:</span>
                  <strong>{p.progreso.done} / {p.progreso.total}</strong>
                </div>
              )}
            </div>
            {letrasDificiles.length > 0 && (
              <div>
                <h4 style={{ margin: '0 0 0.5rem', color: '#b3261e', fontSize: '1rem' }}>⚠️ Letras que le cuestan más</h4>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  {letrasDificiles.map(({ letra, fallos }) => (
                    <span key={letra} style={{ background: 'rgba(255,107,107,0.2)', borderRadius: '8px', padding: '0.4rem 0.8rem', fontSize: '0.9rem', color: '#b3261e' }}>
                      {letra} ({fallos} fallos)
                    </span>
                  ))}
                </div>
              </div>
            )}
            {letrasDificiles.length === 0 && (
              <p style={{ color: '#6b6880', fontSize: '0.9rem' }}>Aún no hay fallos registrados. Sigue practicando para ver el mapa de dominio.</p>
            )}
            {p.graduado && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(40,167,69,0.2)', borderRadius: '12px', color: '#186a3b', fontWeight: '700' }}>
                🎓 Ya graduada/o ¡felicidades!
              </div>
            )}
          </div>
        )}

        {vista === 'consejos' && (
          <div className="padres-consejos">
            <h3 style={{ margin: '0 0 0.8rem', color: '#764ba2', fontSize: '1.1rem' }}>Consejos para practicar en casa</h3>
            <ul style={{ color: '#4a4757', lineHeight: '1.8', paddingLeft: '1.2rem' }}>
              {consejos.map((c, i) => (
                <li key={i} style={{ marginBottom: '0.6rem' }}>
                  {c}
                </li>
              ))}
            </ul>
            <p style={{ color: '#6b6880', fontSize: '0.85rem', marginTop: '1rem' }}>
              💡 Sesiones cortas de 15-30 minutos funcionan mejor que una larga.
            </p>
          </div>
        )}

        {vista === 'offline' && (
          <div className="padres-offline">
            <h3 style={{ margin: '0 0 0.8rem', color: '#764ba2', fontSize: '1.1rem' }}>Actividades para imprimir y hacer en papel</h3>
            <ul style={{ color: '#4a4757', lineHeight: '1.8', paddingLeft: '1.2rem' }}>
              <li style={{ marginBottom: '0.6rem' }}>🔤 Tarjetas de letras: recorta letras de revistas y pégalas en una hoja.</li>
              <li style={{ marginBottom: '0.6rem' }}>🧱 Sílabas con plastilina: moldea las letras de cada sílaba.</li>
              <li style={{ marginBottom: '0.6rem' }}>📖 Búsqueda de letras: busca una letra específica en un periódico y circúlala.</li>
              <li style={{ marginBottom: '0.6rem' }}>🎨 Dibuja la letra objetivo y decórala con cosas que empiecen por esa letra.</li>
            </ul>
          </div>
        )}

        <VoicePicker onProbar={p.onProbarVoz} />
        <MapaDominio motor={p.motor} />
        <div className="padres-row">
          {p.graduado ? (
            <span className="peque-stars">🎓 Ya graduada/o ¡felicidades!</span>
          ) : (
            <button className="next-btn" onClick={p.onExamen}>🎓 Mi peque ya lo sabe: examen</button>
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
