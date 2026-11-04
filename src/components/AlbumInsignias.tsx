import { TODAS_LAS_INSIGNIAS, type InsigniaId } from '../lib/gamificacion';
import { useFocoAtrapado } from '../hooks/useFocoAtrapado';

interface Props {
  desbloqueadas: InsigniaId[];
  onClose: () => void;
}

// Álbum de insignias del peque: todas las existentes, ganadas y por ganar.
// Colección estilo cromos para motivar el recorrido completo.
export default function AlbumInsignias({ desbloqueadas, onClose }: Props) {
  const refContenedor = useFocoAtrapado(true, onClose);
  const conseguidas = TODAS_LAS_INSIGNIAS.filter((i) => desbloqueadas.includes(i.id));

  return (
    <div className="padres-overlay" role="dialog" aria-modal="true" aria-label="Álbum de insignias" ref={refContenedor}>
      <div className="padres-card" style={{ textAlign: 'center', maxWidth: '520px' }}>
        <h2>🏅 Mi álbum de insignias</h2>
        <p className="padres-sub">
          {conseguidas.length} de {TODAS_LAS_INSIGNIAS.length} conseguidas · ¡sigue jugando para completarlo!
        </p>
        <div
          style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
            gap: '0.7rem', margin: '1rem 0',
          }}
        >
          {TODAS_LAS_INSIGNIAS.map((i) => {
            const conseguida = desbloqueadas.includes(i.id);
            return (
              <div
                key={i.id}
                title={i.descripcion}
                style={{
                  borderRadius: '16px',
                  padding: '0.8rem 0.5rem',
                  border: `2px solid ${conseguida ? '#ffd166' : '#e4dcf3'}`,
                  background: conseguida ? 'rgba(255,209,102,0.18)' : '#f6f3fb',
                  opacity: conseguida ? 1 : 0.65,
                }}
              >
                <div style={{ fontSize: '2rem', filter: conseguida ? 'none' : 'grayscale(1)' }} aria-hidden="true">
                  {conseguida ? i.emoji : '❔'}
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#4a3b66', marginTop: '0.25rem' }}>
                  {conseguida ? i.nombre : 'Por ganar'}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#6b6880', marginTop: '0.15rem' }}>
                  {i.descripcion}
                </div>
              </div>
            );
          })}
        </div>
        <div className="padres-row">
          <button className="next-btn" onClick={onClose}>Seguir jugando 💛</button>
        </div>
      </div>
    </div>
  );
}
