import { useEffect, useRef, useState } from 'react';
import './App.css';
import { READING_CARDS, activarPerfil, esGraduado, loadMotor, loadProfile, loadProfiles, loadProgreso, loadScore, marcarGraduado, saveMotor, saveProfile, saveProgreso, saveScore, type ChildProfile } from './data/curriculum';
import EvaluacionInicial from './components/EvaluacionInicial';
import { ETAPAS, ETAPAS_POR_RANGO, avanzar, asegurarLeccionInicial, etapaDeLeccion, generarNivel, type EstadoMotor, obtenerActividadActual, avanzarActividad, retrocerActividad, obtenerTotalLecciones } from './data/motorNiveles';
import { SECUENCIA_LECCIONES } from './data/secuenciaLecciones';
import { fraseGuiaJuego } from './data/frasesVoz';
import { F_ETAPA_SUPERADA, asegurarVozNombre } from './data/frases';
import { supabase, SUPABASE_ACTIVO, cerrarSesionNube, emailSesion } from './lib/supabase';
import { bajarNube, hayPendiente, sincronizarAhora, vigilarConexion } from './lib/sync';
import { registrarEvento, cargarAdaptabilidad } from './lib/adaptividad';
import { cargarGamificacion, actualizarGamificacion, obtenerInsigniasDesbloqueadas } from './lib/gamificacion';
import EscucharYElige from './components/EscuchaYElige';
import FormarSílabaTrabada from './components/FormarSílabaTrabada';
import PalabrasDesordenadas from './components/PalabrasDesordenadas';
import TrazoLetra from './components/TrazoLetra';
import MemoriaAuditiva from './components/MemoriaAuditiva';
import { useVoice } from './hooks/useVoice';
import BotMessage from './components/BotMessage';
import WelcomeScreen from './components/WelcomeScreen';
import ZonaPadres from './components/ZonaPadres';
import MenuPeques from './components/MenuPeques';
import GraduationExam from './components/GraduationExam';
import AuthPadres from './components/AuthPadres';
import LetterGame from './components/LetterGame';
import ReadingCard from './components/ReadingCard';
import EscucharYTocar from './components/EscucharYTocar';
import FormarSílaba from './components/FormarSílaba';
import SílabaInicial from './components/SílabaInicial';
import FormarPalabra from './components/FormarPalabra';
import LeerConElDedo from './components/LeerConElDedo';
import Storytime from './components/Storytime';

declare global {
  interface Window {
    confetti?: (...args: any[]) => void;
  }
}

function esNavegador(): boolean {
  return typeof window !== 'undefined';
}

function opcionesEscuchar(objetivo: string): string[] {
  const otros = ['A', 'E', 'I', 'O', 'U'].filter((l) => l !== objetivo).slice(0, 3);
  return [...otros, objetivo].sort(() => Math.random() - 0.5);
}

function opcionesSilaba(objetivo: string): string[] {
  const otros = ['MA', 'PA', 'SA', 'LA'].filter((s) => s !== objetivo).slice(0, 3);
  return [...otros, objetivo].sort(() => Math.random() - 0.5);
}

function App() {
  const [profile, setProfile] = useState<ChildProfile | null>(null);
  const [perfiles, setPerfiles] = useState<ChildProfile[]>([]);
  const [tab, setTab] = useState<'jugar' | 'leer' | 'mas'>('jugar');
  const [showPadres, setShowPadres] = useState(false);
  const [showPeques, setShowPeques] = useState(false);
  const pressTimer = useRef<number | null>(null);
  const [score, setScore] = useState(0);
  const [progress, setProgress] = useState({ done: 0, total: 3 });
  const [readingIndex, setReadingIndex] = useState(0);
  const [motor, setMotor] = useState<EstadoMotor>({ etapa: 'vocales', n: 0, pesos: {}, aciertos: {} });
  const [actividadActual, setActividadActual] = useState<any>(null);
  // No se puede pasar de actividad hasta ganar la actual.
  const [actividadGanada, setActividadGanada] = useState(false);
  const [estadoAdaptabilidad, setEstadoAdaptabilidad] = useState<any>(null);
  const [estadoGamificacion, setEstadoGamificacion] = useState<any>(null);
  const [graduado, setGraduado] = useState(false);
  const [showExamen, setShowExamen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [emailNube, setEmailNube] = useState('');
  const [auth, setAuth] = useState<'cargando' | 'fuera' | 'dentro'>(SUPABASE_ACTIVO ? 'cargando' : 'fuera');
  const [enLinea, setEnLinea] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [mostrandoEvaluacion, setMostrandoEvaluacion] = useState(false);
  const [perfilBase, setPerfilBase] = useState<{ nombre: string; rango: import('./data/curriculum').RangeId; avatar: string; voiceOn: boolean } | null>(null);
  const [masJuego, setMasJuego] = useState<'escucha_elige' | 'silaba_trabada' | 'palabras_desordenadas' | 'trazo' | 'memoria' | 'letras' | null>(null);

  // Aplica un cambio de motor y lo persiste, refrescando la actividad visible.
  const aplicarMotor = (nuevo: EstadoMotor) => {
    if (!profile) return;
    saveMotor(profile.id, nuevo);
    setMotor(nuevo);
    setActividadActual(obtenerActividadActual(nuevo, profile.rango));
  };

  // Pasar a la siguiente actividad SOLO si la actual ya se gano.
  // Devuelve false si sigue bloqueada (para que la UI muestre el aviso).
  const avanzarALuego = (forzado = false): boolean => {
    if (!profile) return false;
    if (!forzado && !actividadGanada) return false;
    const base = actividadActual ? motor : asegurarLeccionInicial(motor, profile.rango, profile.evaluacionInicial);
    const eraUltima = !!actividadActual?.esUltimaActividad;
    const leccionActual = actividadActual?.leccion.id;
    const nuevo = avanzarActividad(base, profile.rango);
    aplicarMotor(nuevo);
    setActividadGanada(false);
    const act = obtenerActividadActual(nuevo, profile.rango);
    // Aviso + celebración al cambiar de lección
    if (act && eraUltima && act.leccion.id !== leccionActual) {
      speak(act.leccion.audioCelebracion || F_ETAPA_SUPERADA);
      try {
        if (esNavegador()) {
          window.confetti?.({ particleCount: 100, spread: 120, origin: { y: 0.55 } });
        }
      } catch { /* noop */ }
      setTimeout(() => speak(act.leccion.audioIntro || act.leccion.titulo), 900);
    }
    return true;
  };

  const manejarCorrecto = (actividadId: string) => {
    if (!profile) return;
    setScore((s) => s + 10);
    const ad = registrarEvento(estadoAdaptabilidad, 'acierto', actividadId);
    setEstadoAdaptabilidad(ad);

    const g = actualizarGamificacion(estadoGamificacion, {
      aciertos: 1,
      rachaDias: ad.rachaDias,
      nivelAlcanzado: motor.n + 1,
    });
    setEstadoGamificacion(g.siguiente);
    if (g.nuevasInsignias.length > 0) {
      speak(`¡Insignia nueva: ${g.nuevasInsignias[0].nombre}! ${g.nuevasInsignias[0].descripcion}`);
      try {
        if (esNavegador()) window.confetti?.({ particleCount: 130, spread: 150, origin: { y: 0.5 } });
      } catch { /* noop */ }
    }
    // Actividad ganada: se habilita "Siguiente". El niño avanza cuando pulsa,
    // para que vea con calma lo que acaba de lograr.
    setActividadGanada(true);
  };

  const manejarError = (actividadId: string) => {
    if (!profile) return;
    const ad = registrarEvento(estadoAdaptabilidad || cargarAdaptabilidad(), 'error', actividadId);
    setEstadoAdaptabilidad(ad);
    const g = actualizarGamificacion(estadoGamificacion, { errores: 1, rachaDias: ad.rachaDias });
    setEstadoGamificacion(g.siguiente);
    // Si falla, la actividad sigue pendiente: "Siguiente" permanece bloqueado.
    setActividadGanada(false);
  };

  const refrescar = () => {
    const lista = loadProfiles();
    setPerfiles(lista);
    const activo = loadProfile();
    setProfile(activo);
    if (activo) {
      setScore(loadScore(activo.id));
      setProgress(loadProgreso(activo.id));
      // El motor guarda el avance (incluida la lección activa). Si el niño aún no
      // tiene lección asignada, se le pone la primera de su rango para que el
      // recorrido guiado de lecciones arranque solo.
      const guardado = loadMotor(activo.id);
      const conLeccion = guardado.leccionId
        ? guardado
        : asegurarLeccionInicial(guardado, activo.rango, activo.evaluacionInicial);
      if (!guardado.leccionId) saveMotor(activo.id, conLeccion);
      setMotor(conLeccion);
      setGraduado(esGraduado(activo.id));
      setActividadActual(obtenerActividadActual(conLeccion, activo.rango));
    }
  };

  useEffect(() => {
    if (!esNavegador()) return;

    refrescar();
    setEstadoAdaptabilidad(cargarAdaptabilidad());
    setEstadoGamificacion(cargarGamificacion());
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js';
    document.head.appendChild(script);

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

  // Si hay voz nativa disponible, la app sigue hablando aunque el backend falle,
// así que solo avisamos cuando de verdad no hay ninguna voz.
// Solo avisamos cuando de verdad no hay ninguna voz disponible. La voz del
// navegador es el ultimo recurso, no lo normal.
const motivoTexto =
    motivo === 'key' ? 'No se pudo generar esa frase con la voz clonada. Usa la voz del navegador.' :
    motivo === 'cuota' ? 'Esa frase no se pudo clonar ahora. Usa la voz del navegador.' :
    motivo === 'apagado' ? 'No se pudo contactar con la voz clonada. Usa la voz del navegador.' :
    motivo === 'otro' ? 'Esa frase no se pudo clonar. Usa la voz del navegador.' : '';

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
          <p style={{ color: '#5b3a80', fontSize: '1.3rem' }}>Léo está despertando…</p>
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
          <p style={{ color: '#5b3a80', fontSize: '1.2rem' }}>La nube no está configurada.<br />Pide al administrador que active el acceso.</p>
        </main>
      </div>
    );
  }

  if (!profile) {
    if (mostrandoEvaluacion && perfilBase) {
      return (
        <div className="app sky">
          <div className="sky-deco" aria-hidden="true"><span>☁️</span><span>☀️</span><span>🎈</span><span>🌈</span></div>
          <main className="app-main">
            <EvaluacionInicial
              rango={perfilBase.rango}
              nombre={perfilBase.nombre}
              avatar={perfilBase.avatar}
              onListo={(perfil: any) => {
                saveProfile(perfil);
                try { localStorage.setItem('lee_muted', perfilBase.voiceOn ? '0' : '1'); } catch { /* noop */ }
                setMostrandoEvaluacion(false);
                setPerfilBase(null);
                setProfile(loadProfile());
              }}
            />
          </main>
        </div>
      );
    }
    return (
      <div className="app sky">
        <div className="sky-deco" aria-hidden="true"><span>☁️</span><span>☀️</span><span>🎈</span><span>🌈</span></div>
        <header className="app-header">
          <div className="logo-container"><div className="logo">📚</div><h1 className="title">LeeConAmor</h1></div>
          <p className="subtitle">Enseña a leer a tus hijos de forma divertida y efectiva</p>
        </header>
        <main className="app-main"><WelcomeScreen onDone={() => setProfile(loadProfile())} onEvaluacionListo={(base) => { setPerfilBase(base); setMostrandoEvaluacion(true); }} /></main>
      </div>
    );
  }

  const levels = [generarNivel(motor, profile.rango)];
  const etapaInfo = ETAPAS.find((e) => e.id === motor.etapa) || ETAPAS[0];
  const etapasDelRango = ETAPAS_POR_RANGO[profile.rango];
  const etapaIdx = Math.max(0, etapasDelRango.indexOf(motor.etapa));
  const cards = READING_CARDS[profile.rango];
  const card = cards[readingIndex % cards.length];
  // El progreso se mide sobre las etapas reales del rango (3 etapas en 3-5, 4 en 6-8)
  const pasosPorEtapa = 6;
  const pct = Math.min(100, Math.round(((etapaIdx * pasosPorEtapa + Math.min(motor.n, pasosPorEtapa)) / (etapasDelRango.length * pasosPorEtapa)) * 100));

  // Progreso dentro de la lección guiada
  const totalLecciones = obtenerTotalLecciones(profile.rango);
  const leccionNum = actividadActual
    ? SECUENCIA_LECCIONES[profile.rango].findIndex((l) => l.id === actividadActual.leccion.id) + 1
    : 1;
  const pctLeccion = actividadActual
    ? Math.round(((actividadActual.actividadIndex + 1) / actividadActual.leccion.actividades.length) * 100)
    : 0;

  const manejarResultado = (r: { aciertos: number; total: number; falladas: string[]; acertadas: string[] }) => {
    if (!profile) return;
    const { nuevo, subioEtapa } = avanzar(motor, r.aciertos, r.total, r.falladas, r.acertadas, profile.rango);
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
          <div className="progress-bar progress-bar-grande"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            {isSpeaking && (
              <span className="is-speaking-indicator">
                <span className="speaking-dot" /> Léo está hablando…
              </span>
            )}
            {(necesitaToque || isSpeaking) && (
              <button className="btn-escuchar-grande touch-to-listen" onClick={repeat} aria-label="Escuchar de nuevo">🔊</button>
            )}
          </div>
        </div>

        <div className="tabs">
          <button className={`tab ${tab === 'jugar' ? 'active' : ''}`} onClick={() => { setTab('jugar'); setMasJuego(null); }}>🎮 Jugar letras</button>
          <button className={`tab ${tab === 'leer' ? 'active' : ''}`} onClick={() => { setTab('leer'); setMasJuego(null); }}>🎤 Solo lectura</button>
          <button className={`tab ${tab === 'mas' ? 'active' : ''}`} onClick={() => setTab('mas')}>🎲 Más juegos</button>
        </div>

        {tab === 'jugar' && actividadActual && (
          <div className="actividad-leccion" style={{ maxWidth: '500px', margin: '0 auto' }}>
            <div className="progress-tracker progress-grande" style={{ marginBottom: '1rem' }}>
              <div className="progress-score">⭐ {score}</div>
              <div className="progress-label">
                {actividadActual.leccion.titulo} · {actividadActual.actividadIndex + 1}/{actividadActual.leccion.actividades.length}
              </div>
              <div className="progress-bar progress-bar-grande">
                <div className="progress-fill" style={{ width: `${pctLeccion}%` }} />
              </div>
              <div className="progress-label" style={{ fontSize: '0.8rem', opacity: 0.85, marginTop: '0.35rem' }}>
                Lección {leccionNum}/{totalLecciones} · {etapaInfo.icono} {etapaInfo.nombre}
              </div>
            </div>
            {estadoGamificacion && (
              <div style={{ marginBottom: '1rem', padding: '0.8rem', background: 'rgba(255,255,255,0.9)', borderRadius: '16px' }}>
                <div style={{ fontSize: '0.9rem', color: '#764ba2', marginBottom: '0.5rem', fontWeight: '800' }}>🏆 Tus insignias</div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {obtenerInsigniasDesbloqueadas(estadoGamificacion).map((ins) => (
                    <span key={ins.id} className="insignia-badge" title={ins.descripcion}>{ins.emoji}</span>
                  ))}
                  {obtenerInsigniasDesbloqueadas(estadoGamificacion).length === 0 && (
                    <span style={{ fontSize: '0.88rem', color: '#8a7ba8' }}>Gana tu primera insignia 💛</span>
                  )}
                  {estadoGamificacion.rachaDias > 0 && (
                    <span style={{ marginLeft: 'auto', fontSize: '0.85rem', fontWeight: '800', color: '#ff6b6b' }}>
                      🔥 {estadoGamificacion.rachaDias} {estadoGamificacion.rachaDias === 1 ? 'día' : 'días'}
                    </span>
                  )}
                </div>
              </div>
            )}
            {actividadActual.actividad.tipo === 'escuchar_tocar' && (
              <EscucharYTocar
                objetivo={actividadActual.actividad.objetivo}
                opciones={opcionesEscuchar(actividadActual.actividad.objetivo)}
                correcta={actividadActual.actividad.objetivo}
                imagen={actividadActual.actividad.imagen}
                pista={actividadActual.actividad.pista}
                speak={speak}
                hablarSecuencia={hablarSecuencia}
                onCorrecto={() => manejarCorrecto(actividadActual.actividad.objetivo)}
                onError={() => manejarError(actividadActual.actividad.objetivo)}
                isSpeaking={isSpeaking}
              />
            )}
            {actividadActual.actividad.tipo === 'formar_silaba' && (
              <FormarSílaba
                objetivo={actividadActual.actividad.objetivo}
                letras={actividadActual.actividad.letras || actividadActual.actividad.objetivo.split('')}
                speak={speak}
                hablarSecuencia={hablarSecuencia}
                onCorrecto={() => manejarCorrecto(actividadActual.actividad.objetivo)}
                onError={() => manejarError(actividadActual.actividad.objetivo)}
                isSpeaking={isSpeaking}
              />
            )}
            {actividadActual.actividad.tipo === 'silaba_inicial' && (
              <SílabaInicial
                objetivo={actividadActual.actividad.objetivo}
                palabra={actividadActual.actividad.palabra || actividadActual.actividad.objetivo}
                imagen={actividadActual.actividad.imagen}
                opciones={opcionesSilaba(actividadActual.actividad.objetivo)}
                speak={speak}
                hablarSecuencia={hablarSecuencia}
                onCorrecto={() => manejarCorrecto(actividadActual.actividad.objetivo)}
                onError={() => manejarError(actividadActual.actividad.objetivo)}
                isSpeaking={isSpeaking}
              />
            )}
            {actividadActual.actividad.tipo === 'formar_palabra' && (
              <FormarPalabra
                objetivo={actividadActual.actividad.objetivo}
                silabas={actividadActual.actividad.silabas || actividadActual.actividad.objetivo.split('')}
                imagen={actividadActual.actividad.imagen}
                speak={speak}
                hablarSecuencia={hablarSecuencia}
                onCorrecto={() => manejarCorrecto(actividadActual.actividad.objetivo)}
                onError={() => manejarError(actividadActual.actividad.objetivo)}
                isSpeaking={isSpeaking}
              />
            )}
            {actividadActual.actividad.tipo === 'leer_con_dedo' && (
              <LeerConElDedo
                objetivo={actividadActual.actividad.objetivo}
                imagen={actividadActual.actividad.imagen}
                speak={speak}
                hablarSecuencia={hablarSecuencia}
                onCorrecto={() => manejarCorrecto(actividadActual.actividad.objetivo)}
                onError={() => manejarError(actividadActual.actividad.objetivo)}
                isSpeaking={isSpeaking}
              />
            )}
            {actividadActual.actividad.tipo === 'leer_voz_alta' && (
              <ReadingCard
                objetivo={actividadActual.actividad.objetivo}
                imagen={actividadActual.actividad.imagen || '📖'}
                pista={actividadActual.actividad.pista || ''}
                nombre={profile.nombre}
                speak={speak}
                hablarSecuencia={hablarSecuencia}
                detener={stop}
                isSpeaking={isSpeaking}
                onBien={(p) => {
                  setScore((s) => s + p);
                  manejarCorrecto(actividadActual.actividad.objetivo);
                }}
                onSiguiente={() => avanzarALuego(true)}
              />
            )}
            {actividadActual.actividad.tipo === 'storytime' && (
              <Storytime
                texto={actividadActual.actividad.textoTTS || actividadActual.actividad.objetivo}
                speak={speak}
                hablarSecuencia={hablarSecuencia}
                onTerminado={() => {
                  setScore((s) => s + 20);
                  manejarCorrecto(actividadActual.actividad.objetivo);
                }}
                isSpeaking={isSpeaking}
              />
            )}
            <div style={{ marginTop: '1rem', textAlign: 'center', display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                className="retry-btn"
                onClick={() => {
                  const nuevo = retrocerActividad(motor);
                  if (nuevo !== motor) {
                    aplicarMotor(nuevo);
                    setActividadGanada(false);
                  }
                }}
                disabled={!motor.actividadIdx}
              >
                ⏪ Anterior
              </button>
              <button className="next-btn" onClick={() => avanzarALuego()} disabled={!actividadGanada}>
                {actividadGanada
                  ? (actividadActual.esUltimaActividad ? '🎉 ¡Siguiente lección!' : 'Siguiente →')
                  : '🔒 Acierta para continuar'}
              </button>
            </div>
            {!actividadGanada && (
              <p style={{ textAlign: 'center', color: '#6b6880', fontSize: '0.85rem', marginTop: '0.6rem', fontWeight: '700' }}>
                Repite la actividad hasta acertar. Así no se salta nada.
              </p>
            )}
            <p style={{ textAlign: 'center', color: '#6b6880', fontSize: '0.82rem', marginTop: '0.8rem' }}>
              {actividadActual.leccion.descripcion}
            </p>
          </div>
        )}
        {tab === 'jugar' && !actividadActual && (
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
            instruccionVoz={fraseGuiaJuego(motor.etapa)}
          />
        )}
        {tab === 'leer' && (
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
        {tab === 'mas' && (
          <div className="mas-juegos" style={{ maxWidth: '500px', margin: '0 auto', padding: '1rem' }}>
            <h3 style={{ textAlign: 'center', color: '#764ba2', marginBottom: '1rem' }}>🎲 Más juegos</h3>
            <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <button
                className={`icon-btn ${masJuego === 'escucha_elige' ? 'active-tab' : ''}`}
                onClick={() => setMasJuego('escucha_elige')}
              >
                👂 Escucha y elige
              </button>
              <button
                className={`icon-btn ${masJuego === 'silaba_trabada' ? 'active-tab' : ''}`}
                onClick={() => setMasJuego('silaba_trabada')}
              >
                🧱 Sílabas trabadas
              </button>
              <button
                className={`icon-btn ${masJuego === 'palabras_desordenadas' ? 'active-tab' : ''}`}
                onClick={() => setMasJuego('palabras_desordenadas')}
              >
                🔤 Palabras desordenadas
              </button>
              <button
                className={`icon-btn ${masJuego === 'trazo' ? 'active-tab' : ''}`}
                onClick={() => setMasJuego('trazo')}
              >
                👆 Trazo de letras
              </button>
              <button
                className={`icon-btn ${masJuego === 'memoria' ? 'active-tab' : ''}`}
                onClick={() => setMasJuego('memoria')}
              >
                🧠 Memoria auditiva
              </button>
              <button
                className={`icon-btn ${masJuego === 'letras' ? 'active-tab' : ''}`}
                onClick={() => setMasJuego('letras')}
              >
                🅰️ Juego libre
              </button>
            </div>
            {masJuego === 'letras' && (
              <LetterGame
                key={`libre-${motor.etapa}-${motor.n}`}
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
instruccionVoz={fraseGuiaJuego(motor.etapa)}
            />
          )}
            {masJuego === 'escucha_elige' && (
              <EscucharYElige
                rango={profile.rango}
                speak={speak}
                hablarSecuencia={hablarSecuencia}
                onCorrecto={() => {
                  setScore((s) => s + 10);
                  const g = actualizarGamificacion(estadoGamificacion, { aciertos: 1 });
                  setEstadoGamificacion(g.siguiente);
                }}
                onError={() => {
                  const g = actualizarGamificacion(estadoGamificacion, { errores: 1 });
                  setEstadoGamificacion(g.siguiente);
                }}
                isSpeaking={isSpeaking}
              />
            )}
            {masJuego === 'silaba_trabada' && (
              <FormarSílabaTrabada
                speak={speak}
                hablarSecuencia={hablarSecuencia}
                onCorrecto={() => {
                  setScore((s) => s + 10);
                  const g = actualizarGamificacion(estadoGamificacion, { aciertos: 1 });
                  setEstadoGamificacion(g.siguiente);
                }}
                onError={() => {
                  const g = actualizarGamificacion(estadoGamificacion, { errores: 1 });
                  setEstadoGamificacion(g.siguiente);
                }}
                isSpeaking={isSpeaking}
              />
            )}
            {masJuego === 'palabras_desordenadas' && (
              <PalabrasDesordenadas
                speak={speak}
                hablarSecuencia={hablarSecuencia}
                onCorrecto={() => {
                  setScore((s) => s + 10);
                  const g = actualizarGamificacion(estadoGamificacion, { aciertos: 1 });
                  setEstadoGamificacion(g.siguiente);
                }}
                onError={() => {
                  const g = actualizarGamificacion(estadoGamificacion, { errores: 1 });
                  setEstadoGamificacion(g.siguiente);
                }}
                isSpeaking={isSpeaking}
              />
            )}
            {masJuego === 'trazo' && (
              <TrazoLetra
                speak={speak}
                onCorrecto={() => {
                  setScore((s) => s + 10);
                  const g = actualizarGamificacion(estadoGamificacion, { aciertos: 1 });
                  setEstadoGamificacion(g.siguiente);
                }}
                onError={() => {
                  const g = actualizarGamificacion(estadoGamificacion, { errores: 1 });
                  setEstadoGamificacion(g.siguiente);
                }}
                isSpeaking={isSpeaking}
              />
            )}
            {masJuego === 'memoria' && (
              <MemoriaAuditiva
                speak={speak}
                hablarSecuencia={hablarSecuencia}
                onCorrecto={() => {
                  setScore((s) => s + 10);
                  const g = actualizarGamificacion(estadoGamificacion, { aciertos: 1 });
                  setEstadoGamificacion(g.siguiente);
                }}
                onError={() => {
                  const g = actualizarGamificacion(estadoGamificacion, { errores: 1 });
                  setEstadoGamificacion(g.siguiente);
                }}
                isSpeaking={isSpeaking}
              />
            )}
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
          score={score}
          progreso={progress}
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
              const g = actualizarGamificacion(estadoGamificacion, { graduado: true });
              setEstadoGamificacion(g.siguiente);
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
          onCerrarSesionPadres={() => {
            setProfile(null);
            setPerfiles([]);
            setEmailNube('');
            setAuth('fuera');
            setShowPeques(false);
            setShowPadres(false);
            localStorage.removeItem('leeconamor_activo');
            localStorage.removeItem('lee_recordar');
          }}
        />
      )}

      <footer className="app-footer"><p>© 2026 LeeConAmor - {profile.nombre} aprende con {profile.avatar} y Léo 🦉</p></footer>
    </div>
  );
}

export default App;
