import { useEffect, useRef, useState } from 'react';
import './App.css';
import { READING_CARDS, activarPerfil, esGraduado, loadMotor, loadProfile, loadProfiles, loadProgreso, loadScore, marcarGraduado, saveMotor, saveProgreso, saveScore, type ChildProfile } from './data/curriculum';
import { ETAPAS, avanzar, generarNivel, type EstadoMotor } from './data/motorNiveles';
import { F_ETAPA_SUPERADA, asegurarVozNombre } from './data/frases';
import { supabase, SUPABASE_ACTIVO, cerrarSesionNube, emailSesion } from './lib/supabase';
import { bajarNube, hayPendiente, sincronizarAhora, vigilarConexion } from './lib/sync';
import { useVoice } from './hooks/useVoice';
import BotMessage from './components/BotMessage';
import WelcomeScreen from './components/WelcomeScreen';
import ZonaPadres from './components/ZonaPadres';
import MenuPeques from './components/MenuPeques';
import GraduationExam from './components/GraduationExam';
import AuthPadres from './components/AuthPadres';
import LetterGame from './components/LetterGame';
import ReadingCard from './components/ReadingCard';

declare global {
  interface Window {
    confetti?: (...args: any[]) => void;
  }
}

function esNavegador(): boolean {
  return typeof window !== 'undefined';
}

function App() {
  const [profile, setProfile] = useState<ChildProfile | null>(null);
  const [perfiles, setPerfiles] = useState<ChildProfile[]>([]);
  const [tab, setTab] = useState<'jugar' | 'leer'>('jugar');
  const [showPadres, setShowPadres] = useState(false);
  const [showPeques, setShowPeques] = useState(false);
  const pressTimer = useRef<number | null>(null);
  const [score, setScore] = useState(0);
  const [progress, setProgress] = useState({ done: 0, total: 3 });
  const [readingIndex, setReadingIndex] = useState(0);
  const [motor, setMotor] = useState<EstadoMotor>({ etapa: 'vocales', n: 0, pesos: {}, aciertos: {} });
  const [graduado, setGraduado] = useState(false);
  const [showExamen, setShowExamen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [emailNube, setEmailNube] = useState('');
  const [auth, setAuth] = useState<'cargando' | 'fuera' | 'dentro'>(SUPABASE_ACTIVO ? 'cargando' : 'fuera');
  const [enLinea, setEnLinea] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));

  const refrescar = () => {
    const lista = loadProfiles();
    setPerfiles(lista);
    const activo = loadProfile();
    setProfile(activo);
    if (activo) {
      setScore(loadScore(activo.id));
      setProgress(loadProgreso(activo.id));
      setMotor(loadMotor(activo.id));
      setGraduado(esGraduado(activo.id));
    }
  };

  useEffect(() => {
    refrescar();
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js';
    document.head.appendChild(script);

    if (!esNavegador()) return;

    const sb = supabase();
    if (sb) {
      const initAuth = async () => {
        const { data: { session } } = await sb.auth.getSession();
        const email = session?.user?.email || '';
        setEmailNube(email);
        setAuth(email ? 'dentro' : 'fuera');
        if (email) {
          bajarNube().then(() => {
            refrescar();
            if (hayPendiente()) sincronizarAhora();
          });
        }
      };
      initAuth();

      const { data: sub } = sb.auth.onAuthStateChange(async (_event, session) => {
        const email = session?.user?.email || '';
        setEmailNube(email);
        setAuth(email ? 'dentro' : 'fuera');
        if (email) {
          await bajarNube().then(() => {
            refrescar();
            if (hayPendiente()) sincronizarAhora();
          });
        }
      });

      const stopVig = vigilarConexion((on) => {
        setEnLinea(on);
        if (on && hayPendiente()) sincronizarAhora();
      });

      return () => {
        try {
          document.head.removeChild(script);
        } catch { /* noop */ }
        sub.subscription.unsubscribe();
        stopVig();
      };
    }
    return () => {
      try {
        document.head.removeChild(script);
      } catch { /* noop */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (profile) saveScore(profile.id, score);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score]);

  const elegirPeque = (id: string) => {
    activarPerfil(id);
    setShowPeques(false);
    setShowPadres(false);
    setReadingIndex(0);
    refrescar();
  };

  const voiceEnabled = profile?.voiceEnabled ?? true;
  const { speak, hablarSecuencia, repeat, stop, isSpeaking, muted, toggleMute, fuente, motivo, necesitaToque, probarVoz, reintentarVoz, usarVozBasica } = useVoice(voiceEnabled);

  // Generar el saludo con el nombre UNA vez por niño (queda guardado para siempre)
  useEffect(() => {
    if (profile) asegurarVozNombre(profile.nombre);
  }, [profile]);

  const motivoTexto =
    motivo === 'apagado' ? 'Léo no pudo hablar con su voz suave (prende el backend con iniciar-leeconamor.bat).' :
    motivo === 'key' ? 'Léo no pudo hablar con su voz suave (revisa la clave de Gemini en .env.local).' :
    motivo === 'cuota' ? 'Léo está descansando su voz un momento.' :
    motivo === 'otro' ? 'Léo no pudo hablar con su voz suave.' : '';

  // Mantener presionado el animalito 1.5s abre la zona de padres
  const pressStart = () => {
    pressTimer.current = window.setTimeout(() => setShowPadres(true), 1500);
  };
  const pressEnd = () => {
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
  };

  const pantallaAcceso = (
    <div className="app sky">
      <div className="sky-deco" aria-hidden="true"><span>☁️</span><span>☀️</span><span>🎈</span><span>🌈</span></div>
      <header className="app-header">
        <div className="logo-container"><div className="logo">📚</div><h1 className="title">LeeConAmor</h1></div>
        <p className="subtitle">Primero entra papá o mamá 💛</p>
      </header>
      <main className="app-main">
        <AuthPadres
          bloqueado
          onListo={() => {
            emailSesion().then((em) => {
              setEmailNube(em);
              setAuth(em ? 'dentro' : 'fuera');
            });
          }}
          onClose={() => {}}
        />
      </main>
    </div>
  );

  if (SUPABASE_ACTIVO && auth === 'cargando') {
    return (
      <div className="app sky">
        <div className="sky-deco" aria-hidden="true"><span>☁️</span><span>☀️</span><span>🎈</span><span>🌈</span></div>
        <main className="app-main" style={{ textAlign: 'center', paddingTop: '20vh' }}>
          <div style={{ fontSize: '4rem' }}>🦉</div>
          <p style={{ color: 'white', fontSize: '1.3rem' }}>Léo está despertando…</p>
        </main>
      </div>
    );
  }

  if (SUPABASE_ACTIVO && auth === 'fuera') {
    return pantallaAcceso;
  }

  if (!SUPABASE_ACTIVO) {
    return (
      <div className="app sky">
        <div className="sky-deco" aria-hidden="true"><span>☁️</span><span>☀️</span><span>🎈</span><span>🌈</span></div>
        <main className="app-main" style={{ textAlign: 'center', paddingTop: '15vh' }}>
          <div style={{ fontSize: '4rem' }}>🔧</div>
          <p style={{ color: 'white', fontSize: '1.2rem' }}>La nube no está configurada.<br />Pide al administrador que active el acceso.</p>
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="app sky">
        <div className="sky-deco" aria-hidden="true"><span>☁️</span><span>☀️</span><span>🎈</span><span>🌈</span></div>
        <header className="app-header">
          <div className="logo-container"><div className="logo">📚</div><h1 className="title">LeeConAmor</h1></div>
          <p className="subtitle">Enseña a leer a tus hijos de forma divertida y efectiva</p>
        </header>
        <main className="app-main"><WelcomeScreen onDone={() => setProfile(loadProfile())} /></main>
      </div>
    );
  }

  const levels = [generarNivel(motor, profile.rango)];
  const etapaInfo = ETAPAS.find((e) => e.id === motor.etapa) || ETAPAS[0];
  const etapaIdx = ETAPAS.findIndex((e) => e.id === motor.etapa);
  const cards = READING_CARDS[profile.rango];
  const card = cards[readingIndex % cards.length];
  const pct = Math.min(100, Math.round(((etapaIdx * 6 + Math.min(motor.n, 6)) / 24) * 100));

  const manejarResultado = (r: { aciertos: number; total: number; falladas: string[]; acertadas: string[] }) => {
    if (!profile) return;
    const { nuevo, subioEtapa } = avanzar(motor, r.aciertos, r.total, r.falladas, r.acertadas);
    setMotor(nuevo);
    saveMotor(profile.id, nuevo);
    if (subioEtapa) {
      speak(F_ETAPA_SUPERADA);
      try {
        if (esNavegador()) {
          window.confetti?.({ particleCount: 80, spread: 100, origin: { y: 0.6 } });
        }
      } catch { /* noop */ }
    }
  };

  const avanzarMotor = () => {
    if (!profile) return;
    const nuevo = { ...motor, n: motor.n + 1 };
    setMotor(nuevo);
    saveMotor(profile.id, nuevo);
  };

  return (
    <div className="app sky">
      <div className="sky-deco" aria-hidden="true"><span>☁️</span><span>☀️</span><span>🎈</span><span>🌈</span></div>
      <header className="app-header kid-header">
        <div className="kid-id">
          <span
            className="kid-avatar"
            onPointerDown={pressStart}
            onPointerUp={pressEnd}
            onPointerLeave={pressEnd}
          >
            {profile.avatar}
          </span>
          <div>
            <div className="kid-name">¡Hola, {profile.nombre}! 💛{graduado && ' 🎓'}</div>
            <div className="kid-range">{profile.rango === '3-5' ? '🎨 3-5 Pre-lector' : '📖 6-8 Silábico'}</div>
          </div>
        </div>
        <button className="corner-peques" onClick={() => setShowPeques(true)} title="Zona de padres" aria-label="Zona de padres">
          👪
        </button>
      </header>

      <main className="app-main">
        <div className="progress-tracker progress-grande">
          <div className="progress-score">⭐ {score}</div>
          <div className="progress-label">{etapaInfo.icono} {etapaInfo.nombre} · Nivel {motor.n + 1}</div>
          {necesitaToque && (
            <button className="btn-escuchar-grande touch-to-listen" onClick={repeat} aria-label="Escuchar de nuevo">🔊</button>
          )}
          <div className="progress-bar progress-bar-grande"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
        </div>

        <div className="tabs">
          <button className={`tab ${tab === 'jugar' ? 'active' : ''}`} onClick={() => setTab('jugar')}>🎮 Jugar letras</button>
          <button className={`tab ${tab === 'leer' ? 'active' : ''}`} onClick={() => setTab('leer')}>🎤 Solo lectura</button>
        </div>

        {tab === 'jugar' ? (
          <LetterGame
            key={`${motor.etapa}-${motor.n}`}
            levels={levels}
            nombre={profile.nombre}
            speak={speak}
            isSpeaking={isSpeaking}
            score={score}
            setScore={setScore}
            onProgress={(done, total) => {
              setProgress({ done, total });
              saveProgreso(profile.id, done, total);
            }}
            onRepeat={repeat}
            onResultado={manejarResultado}
            onAvanzar={avanzarMotor}
            tituloNivel={`${etapaInfo.icono} ${etapaInfo.nombre} ${motor.n + 1}`}
          />
        ) : (
          <div className="letter-game">
            <BotMessage
              tipo="info"
              texto={`Vamos a leer juntitos, ${profile.nombre}. Escucha primero y luego pulsa Leer en voz alta.`}
              hablando={isSpeaking}
              nombre={profile.nombre}
              onRepeat={repeat}
            />
            <ReadingCard
              key={`${card.objetivo}-${readingIndex}`}
              objetivo={card.objetivo}
              imagen={card.imagen}
              pista={card.pista}
              nombre={profile.nombre}
              speak={speak}
              hablarSecuencia={hablarSecuencia}
              detener={stop}
              isSpeaking={isSpeaking}
              onBien={(p) => setScore((s) => s + p)}
              onSiguiente={() => setReadingIndex((i) => (i + 1) % cards.length)}
            />
            <div className="game-actions">
              <button className="retry-btn" onClick={() => setReadingIndex((i) => (i + 1) % cards.length)}>➡️ Otra palabrita</button>
            </div>
          </div>
        )}
      </main>

      {showPadres && (
        <ZonaPadres
          nombre={profile.nombre}
          rango={profile.rango}
          avatar={profile.avatar}
          muted={muted}
          onToggleMute={toggleMute}
          onProbarVoz={probarVoz}
          onCallar={stop}
          fuente={fuente}
          motivoTexto={motivoTexto}
          onReintentarVoz={reintentarVoz}
          onVozBasica={usarVozBasica}
          onCambiarPeque={() => {
            setShowPadres(false);
            setShowPeques(true);
          }}
          onClose={() => setShowPadres(false)}
          motor={motor}
          graduado={graduado}
          onExamen={() => {
            setShowPadres(false);
            setShowExamen(true);
          }}
          emailNube={emailNube}
          enLinea={enLinea}
          onNube={() => {
            setShowPadres(false);
            setShowAuth(true);
          }}
          onSalirNube={async () => {
            await cerrarSesionNube();
            setEmailNube('');
            setShowPadres(false);
            setShowPeques(false);
            setShowAuth(false);
            setAuth('fuera');
          }}
        />
      )}

      {showAuth && (
        <AuthPadres
          onListo={() => {
            setShowAuth(false);
          }}
          onClose={() => setShowAuth(false)}
        />
      )}

      {showExamen && (
        <GraduationExam
          speak={speak}
          isSpeaking={isSpeaking}
          onAprobar={() => {
            if (profile) {
              marcarGraduado(profile.id);
              setGraduado(true);
            }
          }}
          onClose={() => setShowExamen(false)}
        />
      )}

      {showPeques && (
        <MenuPeques
          perfiles={perfiles}
          activoId={profile.id}
          onElegir={elegirPeque}
          onNuevoListo={() => {
            refrescar();
            setShowPeques(false);
          }}
          onClose={() => setShowPeques(false)}
        />
      )}

      <footer className="app-footer"><p>© 2026 LeeConAmor - {profile.nombre} aprende con {profile.avatar} y Léo 🦉</p></footer>
    </div>
  );
}

export default App;
