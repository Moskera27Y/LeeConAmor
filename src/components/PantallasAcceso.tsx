import { lazy, Suspense } from 'react';
import WelcomeScreen from './WelcomeScreen';

// Pantallas de acceso compartidas. Extraídas de App.tsx para que el
// componente principal se quede con la lógica del juego, no con el shell.
const AuthPadres = lazy(() => import('./AuthPadres'));

export function Cargando({ texto = 'Cargando juego…' }: { texto?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '2rem', color: '#764ba2', fontWeight: '700' }}>
      <div style={{ fontSize: '2rem' }}>🦉</div>
      {texto}
    </div>
  );
}

// Mientras se comprueba la sesión de Supabase.
export function PantallaDespertando() {
  return (
    <div className="app sky">
      <div className="sky-deco" aria-hidden="true"><span>☁️</span><span>☀️</span><span>🎈</span><span>🌈</span></div>
      <main className="app-main" style={{ textAlign: 'center', paddingTop: '20vh' }}>
        <div style={{ fontSize: '4rem' }}>🦉</div>
        <p style={{ color: '#5b3a80', fontSize: '1.3rem' }}>Léo está despertando…</p>
      </main>
    </div>
  );
}

// Puerta de entrada con cuenta (o jugar sin cuenta).
export function PantallaAcceso({ onListo, onSinCuenta }: { onListo: () => void; onSinCuenta: () => void }) {
  return (
    <div className="app sky">
      <div className="sky-deco" aria-hidden="true"><span>☁️</span><span>☀️</span><span>🎈</span><span>🌈</span></div>
      <header className="app-header">
        <div className="logo-container"><div className="logo">📚</div><h1 className="title">LeeConAmor</h1></div>
        <p className="subtitle">Entra o juega sin cuenta 💛</p>
      </header>
      <main className="app-main">
        <Suspense fallback={<Cargando texto="Cargando acceso…" />}>
          <AuthPadres
            bloqueado
            onListo={onListo}
            onSinCuenta={onSinCuenta}
            onClose={() => {}}
          />
        </Suspense>
      </main>
    </div>
  );
}

// Portada para crear el primer peque.
export function PantallaPortada({ onDone }: { onDone: () => void }) {
  return (
    <div className="app sky">
      <div className="sky-deco" aria-hidden="true"><span>☁️</span><span>☀️</span><span>🎈</span><span>🌈</span></div>
      <header className="app-header">
        <div className="logo-container"><div className="logo">📚</div><h1 className="title">LeeConAmor</h1></div>
        <p className="subtitle">Enseña a leer a tus hijos de forma divertida y efectiva</p>
      </header>
      <main className="app-main"><WelcomeScreen onDone={onDone} /></main>
    </div>
  );
}
