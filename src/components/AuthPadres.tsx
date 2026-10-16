import { useState } from 'react';
import { supabase, SUPABASE_ACTIVO } from '../lib/supabase';

interface Props {
  onListo: () => void;
  onClose: () => void;
}

// Inicio de sesión y registro de padres: correo+contraseña y Google.
export default function AuthPadres({ onListo, onClose }: Props) {
  const [modo, setModo] = useState<'entrar' | 'registro'>('entrar');
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  if (!SUPABASE_ACTIVO) {
    return (
      <div className="padres-overlay">
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
      const sb = supabase();
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
      const sb = supabase();
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
    <div className="padres-overlay">
      <div className="padres-card">
        <h2>👪 Cuenta de padres</h2>
        <p className="padres-sub">Guarda el progreso en la nube y úsalo en varios dispositivos.</p>
        <div className="tabs">
          <button className={`tab ${modo === 'entrar' ? 'active' : ''}`} onClick={() => setModo('entrar')}>Entrar</button>
          <button className={`tab ${modo === 'registro' ? 'active' : ''}`} onClick={() => setModo('registro')}>Registrarse</button>
        </div>
        {modo === 'registro' && (
          <>
            <label className="field-label">Tu nombre</label>
            <input className="field-input" value={nombre} maxLength={40} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: María" />
          </>
        )}
        <label className="field-label">Correo</label>
        <input className="field-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@ejemplo.com" />
        <label className="field-label">Contraseña (mínimo 6 letras)</label>
        <input className="field-input" type="password" value={clave} onChange={(e) => setClave(e.target.value)} placeholder="••••••" />
        {error && <div className="mic-status">⚠️ {error}</div>}
        <div className="game-actions">
          <button className="next-btn" onClick={guardar} disabled={cargando || !email || clave.length < 6}>
            {cargando ? 'Entrando…' : modo === 'registro' ? 'Crear cuenta 💛' : 'Entrar'}
          </button>
        </div>
        <div className="game-actions">
          <button className="ghost-btn" onClick={conGoogle}>🔵 Seguir con Google</button>
          <button className="ghost-btn" onClick={onClose}>Volver</button>
        </div>
      </div>
    </div>
  );
}
