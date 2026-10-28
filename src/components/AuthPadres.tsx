import { useState } from 'react';
import { leerRecordar, setRecordar, supabase, SUPABASE_ACTIVO } from '../lib/supabase';
import { useFocoAtrapado } from '../hooks/useFocoAtrapado';

interface Props {
  onListo: () => void;
  onClose: () => void;
  // bloqueado = puerta de entrada: se puede jugar sin cuenta (modo local).
  bloqueado?: boolean;
  onSinCuenta?: () => void;
}

// Inicio de sesión y registro de padres: correo+contraseña y Google.
export default function AuthPadres({ onListo, onClose, bloqueado, onSinCuenta }: Props) {
  const [modo, setModo] = useState<'entrar' | 'registro'>('entrar');
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [nombre, setNombre] = useState('');
  const [recordar, setRecordarUi] = useState(() => leerRecordar());
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const cerrar = bloqueado ? () => {} : onClose;
  const refContenedor = useFocoAtrapado(true, cerrar);

  if (!SUPABASE_ACTIVO) {
    return (
      <div className="padres-overlay" role="dialog" aria-modal="true" aria-label="Nube no configurada" ref={refContenedor}>
        <div className="padres-card" style={{ textAlign: 'center' }}>
          <h2>☁️ Nube no configurada</h2>
          <p>El juego funciona guardando en este dispositivo. Para sincronizar entre dispositivos, configura Supabase (ver README sección Nube).</p>
          <button className="ghost-btn" onClick={onClose}>Volver</button>
        </div>
      </div>
    );
  }

  const guardar = async () => {
    setError('');
    setCargando(true);
    try {
      setRecordar(recordar);
      const sb = supabase(recordar);
      if (!sb) throw new Error('Sin conexión');
      if (modo === 'registro') {
        const { data, error } = await sb.auth.signUp({
          email: email.trim(),
          password: clave,
          options: { data: { nombre: nombre.trim() || 'Papá/Mamá' } },
        });
        if (error) throw error;
        if (!data.session) {
          // Confirm email activado en Supabase: debe abrir su correo
          setError('¡Cuenta creada! Revisa tu correo y confirma el enlace, luego entra.');
          setModo('entrar');
          return;
        }
      } else {
        const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password: clave });
        if (error) throw error;
      }
      onListo();
    } catch (e: any) {
      setError(e?.message || 'No se pudo entrar. Revisa correo y clave.');
    } finally {
      setCargando(false);
    }
  };

  const conGoogle = async () => {
    setError('');
    try {
      setRecordar(recordar);
      const sb = supabase(recordar);
      if (!sb) throw new Error('Sin conexión');
      const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (e: any) {
      setError(e?.message || 'Google no respondió. Intenta de nuevo.');
    }
  };

  return (
    <div className="padres-overlay" role="dialog" aria-modal="true" aria-label="Cuenta de padres" ref={refContenedor}>
      <div className="padres-card">
        <h2>👪 Cuenta de padres</h2>
        <p className="padres-sub">Guarda el progreso en la nube y úsalo en varios dispositivos.</p>
        <div className="tabs">
          <button className={`tab ${modo === 'entrar' ? 'active' : ''}`} onClick={() => setModo('entrar')}>Entrar</button>
          <button className={`tab ${modo === 'registro' ? 'active' : ''}`} onClick={() => setModo('registro')}>Registrarse</button>
        </div>
        {modo === 'registro' && (
          <>
            <label className="field-label" htmlFor="padre-nombre">Tu nombre</label>
            <input id="padre-nombre" className="field-input" value={nombre} maxLength={40} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: María" />
          </>
        )}
        <label className="field-label" htmlFor="padre-correo">Correo</label>
        <input id="padre-correo" className="field-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@ejemplo.com" autoComplete="email" />
        <label className="field-label" htmlFor="padre-clave">Contraseña (mínimo 6 letras)</label>
        <input id="padre-clave" className="field-input" type="password" value={clave} onChange={(e) => setClave(e.target.value)} placeholder="••••••" autoComplete="current-password" />
        <label className="check-row" htmlFor="recordar-sesion">
          <input
            id="recordar-sesion"
            type="checkbox"
            checked={recordar}
            onChange={(e) => {
              setRecordarUi(e.target.checked);
              setRecordar(e.target.checked);
            }}
          />
          🔒 Recordar sesión en este aparato
        </label>
        {error && <div className="mic-status">⚠️ {error}</div>}
        <div className="game-actions">
          <button className="next-btn" onClick={guardar} disabled={cargando || !email || clave.length < 6}>
            {cargando ? 'Entrando…' : modo === 'registro' ? 'Crear cuenta 💛' : 'Entrar'}
          </button>
        </div>
        <div className="game-actions">
          <button className="ghost-btn" onClick={conGoogle}>🔵 Seguir con Google</button>
          {!bloqueado && <button className="ghost-btn" onClick={onClose}>Volver</button>}
        </div>
        {bloqueado && onSinCuenta && (
          <div className="game-actions">
            <button className="ghost-btn" onClick={onSinCuenta}>🎈 Jugar sin cuenta (solo este dispositivo)</button>
          </div>
        )}
        {bloqueado && (
          <p className="privacy-note" style={{ marginTop: '0.8rem' }}>
            Sin cuenta, el progreso queda solo en este aparato. Puedes crear la cuenta más tarde desde la Zona de padres.
          </p>
        )}
      </div>
    </div>
  );
}
