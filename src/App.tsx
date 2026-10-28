import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import { READING_CARDS, activarPerfil, esGraduado, limpiarDatosLocales, loadMotor, loadProfile, loadProfiles, loadProgreso, loadScore, marcarGraduado, saveMotor, saveProfile, saveProgreso, saveScore, type ChildProfile } from './data/curriculum';
import { ETAPAS, ETAPAS_POR_RANGO, asegurarLeccionInicial, esUltimaLeccion, generarNivel, letrasDeObjetivo, numeroLeccionActual, obtenerActividadActual, avanzarActividad, retrocerActividad, obtenerTotalLecciones, progresoCurso, ABECEDARIO, type EstadoMotor } from './data/motorNiveles';
import { fraseInsignia, tipoObjetivo, VOCALES_JUEGO, PALABRAS_JUEGO, SILABAS_JUEGO } from './data/frasesVoz';
import { F_ETAPA_SUPERADA, asegurarVozNombre } from './data/frases';
import { supabase, SUPABASE_ACTIVO, cerrarSesionNube, emailSesion } from './lib/supabase';
import { bajarNube, hayPendiente, sincronizarAhora, vigilarConexion } from './lib/sync';
import { registrarEvento, cargarAdaptabilidad } from './lib/adaptividad';
import { cargarGamificacion, actualizarGamificacion, obtenerInsigniasDesbloqueadas, otorgarInsignia, type InsigniaId } from './lib/gamificacion';
import { petardos } from './lib/confetti';
// Juegos secundarios: se descargan al abrir su pestaña, no en el arranque.
const EscuchaYElige = lazy(() => import('./components/EscuchaYElige'));
const FormarSílabaTrabada = lazy(() => import('./components/FormarSílabaTrabada'));
const PalabrasDesordenadas = lazy(() => import('./components/PalabrasDesordenadas'));
const TrazoLetra = lazy(() => import('./components/TrazoLetra'));
const MemoriaAuditiva = lazy(() => import('./components/MemoriaAuditiva'));
import { useVoice } from './hooks/useVoice';
import BotMessage from './components/BotMessage';
import WelcomeScreen from './components/WelcomeScreen';
import ZonaPadres from './components/ZonaPadres';
import MenuPeques from './components/MenuPeques';
const GraduationExam = lazy(() => import('./components/GraduationExam'));
const AuthPadres = lazy(() => import('./components/AuthPadres'));
import LetterGame from './components/LetterGame';
import ReadingCard from './components/ReadingCard';
import EscucharYTocar from './components/EscucharYTocar';
import FormarSílaba from './components/FormarSílaba';
import SílabaInicial from './components/SílabaInicial';
import FormarPalabra from './components/FormarPalabra';
import LeerConElDedo from './components/LeerConElDedo';
import Storytime from './components/Storytime';

function esNavegador(): boolean {
  return typeof window !== 'undefined';
}

function Cargando({ texto = 'Cargando juego…' }: { texto?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '2rem', color: '#764ba2', fontWeight: '700' }}>
      <div style={{ fontSize: '2rem' }}>🦉</div>
      {texto}
    </div>
  );
}

// Opciones del MISMO tipo que el objetivo (vocales con vocales, letras con
// letras, sílabas con sílabas, palabras con palabras).
function opcionesEscuchar(objetivo: string): string[] {
  const o = objetivo.trim().toUpperCase();
  const tipo = tipoObjetivo(o);
  let pool: string[];
  if (tipo === 'vocal') pool = VOCALES_JUEGO.split('');
  else if (tipo === 'letra') pool = ABECEDARIO;
  else if (tipo === 'silaba') pool = SILABAS_JUEGO;
  else pool = PALABRAS_JUEGO;
  const otros = pool.filter((x) => x !== o).sort(() => Math.random() - 0.5).slice(0, 3);
  return [o, ...otros].sort(() => Math.random() - 0.5);
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
  const [auth, setAuth] = useState<'cargando' | 'fuera' | 'dentro' | 'local'>(SUPABASE_ACTIVO ? 'cargando' : 'local');
  const [enLinea, setEnLinea] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [masJuego, setMasJuego] = useState<'escucha_elige' | 'silaba_trabada' | 'palabras_desordenadas' | 'trazo' | 'memoria' | 'letras' | null>(null);
  const [finCurso, setFinCurso] = useState(false);
  // Modo sin cuenta: no se intenta bajar/subir nada hasta que el adulto entre.
  const modoLocalRef = useRef(!SUPABASE_ACTIVO);

  // Todos los hooks van antes de cualquier return condicional (reglas de React).
  const voiceEnabled = profile?.voiceEnabled ?? true;
  const { speak, hablarSecuencia, repeat, stop, isSpeaking, muted, toggleMute, fuente, motivo, necesitaToque, probarVoz, reintentarVoz, usarVozBasica } = useVoice(voiceEnabled);
  // Si el perfil se creó sin voz, la UI debe ofrecer la salida manual en vez
  // de un botón de lectura que no puede sonar.
  const sinVoz = muted || !voiceEnabled;

  // Las opciones se generan UNA vez por actividad: si cambian en cada
  // re-render (por el marcador o una insignia), los botones se mueven bajo
  // el dedo del peque.
  const opcionesActividad = useMemo(
    () => (actividadActual ? opcionesEscuchar(actividadActual.actividad.objetivo) : []),
    [actividadActual?.leccion.id, actividadActual?.actividadIndex],
  );

  // Generar el saludo con el nombre UNA vez por niño (queda guardado para siempre)
  useEffect(() => {
    if (profile) asegurarVozNombre(profile.nombre);
  }, [profile]);

  // Aplica un cambio de motor y lo persiste, refrescando la actividad visible.
  const aplicarMotor = (nuevo: EstadoMotor) => {
    if (!profile) return;
    saveMotor(profile.id, nuevo);
    setMotor(nuevo);
    setActividadActual(obtenerActividadActual(nuevo, profile.rango));
  };

  // Fin del recorrido: graduación real (no se reinicia en silencio).
  const terminarCurso = () => {
    if (!profile) return;
    marcarGraduado(profile.id);
    setGraduado(true);
    let estado = estadoGamificacion || cargarGamificacion(profile.id);
    const g = actualizarGamificacion(estado, { graduado: true }, profile.id);
    estado = g.siguiente;
    const nuevas = [...g.nuevasInsignias];
    const extra = otorgarInsignia(estado, 'graduado', profile.id);
    estado = extra.siguiente;
    nuevas.push(...extra.nuevasInsignias);
    setEstadoGamificacion(estado);
    setFinCurso(true);
    setActividadGanada(false);
    speak(F_ETAPA_SUPERADA);
    void petardos({ particleCount: 180, spread: 180, origin: { y: 0.45 } });
    if (nuevas.length > 0) {
      window.setTimeout(() => speak(fraseInsignia(nuevas[0].nombre)), 900);
    }
  };

  // Pasar a la siguiente actividad SOLO si la actual ya se gano.
  // Devuelve false si sigue bloqueada (para que la UI muestre el aviso).
  const avanzarALuego = (forzado = false): boolean => {
    if (!profile) return false;
    if (!forzado && !actividadGanada) return false;
    // La última actividad de la última lección gradúa; no vuelve al inicio
    // como si nada hubiera pasado.
    if (actividadActual?.esUltimaActividad && esUltimaLeccion(profile.rango, motor)) {
      terminarCurso();
      return true;
    }
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
      void petardos({ particleCount: 100, spread: 120, origin: { y: 0.55 } });
      window.setTimeout(() => speak(act.leccion.audioIntro || act.leccion.titulo), 900);
    }
    return true;
  };

  const manejarCorrecto = (objetivo: string) => {
    if (!profile) return;
    setScore((s) => s + 10);

    // Motor: dominio por letra del objetivo (no por actividad abstracta).
    const letras = letrasDeObjetivo(objetivo);
    setMotor((prev) => {
      const aciertos = { ...prev.aciertos };
      letras.forEach((l) => { aciertos[l] = (aciertos[l] || 0) + 1; });
      const nuevo = { ...prev, aciertos };
      saveMotor(profile.id, nuevo);
      return nuevo;
    });

    const ad = registrarEvento(
      estadoAdaptabilidad || cargarAdaptabilidad(profile.id),
      'acierto',
      objetivo,
      profile.id,
    );
    setEstadoAdaptabilidad(ad);

    let estado = estadoGamificacion || cargarGamificacion(profile.id);
    const g = actualizarGamificacion(estado, {
      aciertos: 1,
      rachaDias: ad.rachaDias,
      nivelAlcanzado: motor.n + 1,
    }, profile.id);
    estado = g.siguiente;
    const nuevas = [...g.nuevasInsignias];

    // Insignias de "primera vez" según lo que de verdad acaba de lograr.
    const tipo = tipoObjetivo(objetivo);
    const tipoActividad = actividadActual?.actividad.tipo;
    const otorgar = (id: InsigniaId) => {
      const r = otorgarInsignia(estado, id, profile.id);
      estado = r.siguiente;
      nuevas.push(...r.nuevasInsignias);
    };
    if (tipo === 'silaba' || tipoActividad === 'formar_silaba') otorgar('primera_silaba');
    if (tipo === 'palabra') otorgar('primera_palabra');
    if (tipo === 'oracion' || tipoActividad === 'storytime') otorgar('primera_oracion');

    setEstadoGamificacion(estado);
    if (nuevas.length > 0) {
      speak(fraseInsignia(nuevas[0].nombre));
      void petardos({ particleCount: 130, spread: 150, origin: { y: 0.5 } });
    }
    // Actividad ganada: se habilita "Siguiente". El niño avanza cuando pulsa,
    // para que vea con calma lo que acaba de lograr.
    setActividadGanada(true);
  };

  const manejarError = (objetivo: string) => {
    if (!profile) return;
    const letras = letrasDeObjetivo(objetivo);
    setMotor((prev) => {
      const pesos = { ...prev.pesos };
      letras.forEach((l) => { pesos[l] = (pesos[l] || 0) + 1; });
      const nuevo = { ...prev, pesos };
      saveMotor(profile.id, nuevo);
      return nuevo;
    });

    const ad = registrarEvento(
      estadoAdaptabilidad || cargarAdaptabilidad(profile.id),
      'error',
      objetivo,
      profile.id,
    );
    setEstadoAdaptabilidad(ad);
    const g = actualizarGamificacion(
      estadoGamificacion || cargarGamificacion(profile.id),
      { errores: 1, rachaDias: ad.rachaDias },
      profile.id,
    );
    setEstadoGamificacion(g.siguiente);
    // Si falla, la actividad sigue pendiente: "Siguiente" permanece bloqueado.
    setActividadGanada(false);
  };

  // Juegos libres: suman puntos y estadísticas, pero no bloquean el recorrido.
  const registrarJuegoLibre = (tipo: 'acierto' | 'error') => {
    if (!profile) return;
    if (tipo === 'acierto') setScore((s) => s + 10);
    const ad = registrarEvento(
      estadoAdaptabilidad || cargarAdaptabilidad(profile.id),
      tipo,
      'juego_libre',
      profile.id,
    );
    setEstadoAdaptabilidad(ad);
    const g = actualizarGamificacion(
      estadoGamificacion || cargarGamificacion(profile.id),
      tipo === 'acierto'
        ? { aciertos: 1, rachaDias: ad.rachaDias }
        : { errores: 1, rachaDias: ad.rachaDias },
      profile.id,
    );
    setEstadoGamificacion(g.siguiente);
    if (g.nuevasInsignias.length > 0) {
      speak(fraseInsignia(g.nuevasInsignias[0].nombre));
      void petardos({ particleCount: 100, spread: 120, origin: { y: 0.5 } });
    }
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
      let conLeccion = guardado.leccionId
        ? guardado
        : asegurarLeccionInicial(guardado, activo.rango, activo.evaluacionInicial);
      // Currículo actualizado o guardado corrupto: si la lección/actividad ya
      // no existe, se repara en vez de dejar al peque sin recorrido.
      if (!obtenerActividadActual(conLeccion, activo.rango)) {
        conLeccion = asegurarLeccionInicial(
          { ...conLeccion, leccionId: undefined, actividadIdx: 0 },
          activo.rango,
          activo.evaluacionInicial,
        );
        saveMotor(activo.id, conLeccion);
      } else if (!guardado.leccionId) {
        saveMotor(activo.id, conLeccion);
      }
      setMotor(conLeccion);
      setGraduado(esGraduado(activo.id));
      setActividadActual(obtenerActividadActual(conLeccion, activo.rango));
      setEstadoAdaptabilidad(cargarAdaptabilidad(activo.id));
      setEstadoGamificacion(cargarGamificacion(activo.id));
      // No se toca actividadGanada/finCurso: una sincronización de fondo no
      // debe borrar el acierto que el peque acaba de conseguir.
    } else {
      setScore(0);
      setProgress({ done: 0, total: 3 });
      setEstadoAdaptabilidad(null);
      setEstadoGamificacion(null);
      setGraduado(false);
      setActividadActual(null);
      setActividadGanada(false);
      setFinCurso(false);
    }
  };

  // Entrar a la nube (o detectar que no hay sesión). Al bajar, se refresca el
  // perfil activo para que el peque vea el avance de la nube.
  const entrarNube = async () => {
    const email = await emailSesion();
    setEmailNube(email);
    if (!email) {
      if (!modoLocalRef.current) setAuth(SUPABASE_ACTIVO ? 'fuera' : 'local');
      return;
    }
    modoLocalRef.current = false;
    setAuth('dentro');
    const bajo = await bajarNube();
    refrescar();
    // Si no se pudo bajar (red), no se sube: pisaría un avance más nuevo de
    // otro dispositivo. Se reintenta cuando vuelva la conexión.
    if (bajo && hayPendiente()) await sincronizarAhora(true);
  };

  // Cerrar sesión: sube lo pendiente (best effort) y borra los datos locales.
  // La nube conserva todo; al volver a entrar se descarga de nuevo.
  const salirCuenta = async () => {
    const eraLocal = modoLocalRef.current;
    const mensaje = eraLocal
      ? '¿Salir y borrar los datos de este dispositivo? La nube no se toca; si no tienes cuenta, el progreso local se perderá.'
      : '¿Cerrar sesión? Tu progreso queda guardado en la nube y volverá al entrar de nuevo.';
    if (typeof window !== 'undefined' && !window.confirm(mensaje)) return;
    stop();
    try {
      if (!eraLocal && hayPendiente()) {
        const guardado = await sincronizarAhora();
        if (!guardado && !window.confirm('No pudimos guardar los últimos cambios en la nube. Si cierras ahora, se borrarán de este dispositivo. ¿Cerrar de todos modos?')) {
          return;
        }
      }
    } catch { /* best effort */ }
    await cerrarSesionNube();
    limpiarDatosLocales();
    setProfile(null);
    setPerfiles([]);
    setScore(0);
    setProgress({ done: 0, total: 3 });
    setActividadActual(null);
    setEstadoAdaptabilidad(null);
    setEstadoGamificacion(null);
    setGraduado(false);
    setMotor({ etapa: 'vocales', n: 0, pesos: {}, aciertos: {} });
    setEmailNube('');
    modoLocalRef.current = eraLocal || !SUPABASE_ACTIVO;
    setAuth(eraLocal || !SUPABASE_ACTIVO ? 'local' : 'fuera');
    setShowPeques(false);
    setShowPadres(false);
    setShowAuth(false);
    setShowExamen(false);
    setFinCurso(false);
  };

  useEffect(() => {
    if (!esNavegador()) return;

    refrescar();

    const stopVig = vigilarConexion((on) => {
      setEnLinea(on);
      if (on && hayPendiente()) {
        void sincronizarAhora().then((ok) => { if (ok) refrescar(); });
      }
    });

    const sb = supabase();
    if (!sb) {
      setAuth('local');
      return stopVig;
    }

    // Si la red o Supabase tardan, no dejamos la app en "despertando" para
    // siempre: a los 5 s se ofrece entrar o jugar sin cuenta.
    const rescate = window.setTimeout(() => {
      setAuth((actual) => (actual === 'cargando' ? 'fuera' : actual));
    }, 5000);

    const initAuth = async () => {
      try {
        const { data: { session } } = await sb.auth.getSession();
        if (session?.user?.email) {
          await entrarNube();
        } else if (!modoLocalRef.current) {
          setAuth(SUPABASE_ACTIVO ? 'fuera' : 'local');
        }
      } catch {
        if (!modoLocalRef.current) setAuth('fuera');
      } finally {
        window.clearTimeout(rescate);
      }
    };
    initAuth();

    const { data: sub } = sb.auth.onAuthStateChange(async (evento, session) => {
      const email = session?.user?.email || '';
      setEmailNube(email);
      if (email) {
        modoLocalRef.current = false;
        setAuth('dentro');
        if (evento === 'SIGNED_IN' || evento === 'INITIAL_SESSION') {
          setActividadGanada(false);
          setFinCurso(false);
        }
        const bajo = await bajarNube();
        refrescar();
        if (bajo && hayPendiente()) await sincronizarAhora(true);
      } else if (evento === 'SIGNED_OUT' || !modoLocalRef.current) {
        if (!modoLocalRef.current) setAuth('fuera');
      }
    });

    return () => {
      window.clearTimeout(rescate);
      sub.subscription.unsubscribe();
      stopVig();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (profile) saveScore(profile.id, score);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score]);

  // Sincronización de fondo: sin esto, los cambios de una sesión iniciada
  // quedaban pendientes hasta el siguiente inicio de sesión.
  useEffect(() => {
    if (!SUPABASE_ACTIVO || auth !== 'dentro' || modoLocalRef.current || !hayPendiente()) return;
    const subir = () => {
      if (!hayPendiente()) return;
      void sincronizarAhora().then((ok) => {
        if (ok) refrescar();
      });
    };
    const t = window.setTimeout(subir, 8000);
    const alOcultar = () => {
      if (document.visibilityState === 'hidden') subir();
    };
    document.addEventListener('visibilitychange', alOcultar);
    window.addEventListener('pagehide', subir);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('visibilitychange', alOcultar);
      window.removeEventListener('pagehide', subir);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, motor, score, estadoGamificacion, estadoAdaptabilidad, profile?.id]);

  // Si una sincronización mueve al peque a otra actividad, el "acierto" de la
  // actividad anterior no debe desbloquear "Siguiente" en la nueva.
  useEffect(() => {
    setActividadGanada(false);
  }, [actividadActual?.leccion.id, actividadActual?.actividadIndex]);

  const elegirPeque = (id: string) => {
    activarPerfil(id);
    setShowPeques(false);
    setShowPadres(false);
    setReadingIndex(0);
    setActividadGanada(false);
    setFinCurso(false);
    refrescar();
  };

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

  // El interruptor de voz actualiza también el perfil: si el peque se creó
  // sin voz, al activarla no debe quedar bloqueada para siempre.
  const alternarVoz = () => {
    const activar = sinVoz;
    // "muted" y "voiceEnabled" pueden estar desincronizados en perfiles
    // antiguos; se normalizan ambos para que el botón haga lo que promete.
    if (activar && muted) toggleMute();
    if (!activar && !muted) toggleMute();
    if (profile && profile.voiceEnabled !== activar) {
      const actualizado = { ...profile, voiceEnabled: activar };
      saveProfile(actualizado);
      setProfile(actualizado);
    }
  };

  const pantallaAcceso = (
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
            onListo={() => { void entrarNube(); }}
            onSinCuenta={() => {
              modoLocalRef.current = true;
              setEmailNube('');
              setAuth('local');
            }}
            onClose={() => {}}
          />
        </Suspense>
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

  if (!profile) {
    return (
      <div className="app sky">
        <div className="sky-deco" aria-hidden="true"><span>☁️</span><span>☀️</span><span>🎈</span><span>🌈</span></div>
        <header className="app-header">
          <div className="logo-container"><div className="logo">📚</div><h1 className="title">LeeConAmor</h1></div>
          <p className="subtitle">Enseña a leer a tus hijos de forma divertida y efectiva</p>
        </header>
        <main className="app-main"><WelcomeScreen onDone={refrescar} /></main>
      </div>
    );
  }

  const levels = [generarNivel(motor, profile.rango)];
  const etapaInfo = ETAPAS.find((e) => e.id === motor.etapa) || ETAPAS[0];
  const cards = READING_CARDS[profile.rango];
  const card = cards[readingIndex % cards.length];
  // Progreso real del curso guiado (lecciones y actividades).
  const pct = graduado ? 100 : progresoCurso(profile.rango, motor);
  const totalLecciones = obtenerTotalLecciones(profile.rango);
  const leccionNum = numeroLeccionActual(profile.rango, motor);
  const pctLeccion = actividadActual
    ? Math.round(((actividadActual.actividadIndex + 1) / actividadActual.leccion.actividades.length) * 100)
    : 0;
  // Fuerza un montaje limpio al cambiar de actividad. Sin esto, dos
  // actividades seguidas del mismo tipo compartían "correcto"/"escuchado"
  // y la siguiente aparecía bloqueada.
  const claveActividad = `${actividadActual?.leccion.id || 'sin-leccion'}-${actividadActual?.actividadIndex ?? -1}`;

  // El juego libre reporta el resultado al TERMINAR la ronda. Aquí solo se
  // guarda el dominio; el avance de nivel ocurre una única vez al pulsar
  // "Siguiente nivel" (antes se avanzaba dos veces).
  const manejarResultado = (r: { aciertos: number; total: number; falladas: string[]; acertadas: string[] }) => {
    if (!profile) return;
    setMotor((prev) => {
      const pesos = { ...prev.pesos };
      const ac = { ...prev.aciertos };
      r.falladas.forEach((l) => { pesos[l] = (pesos[l] || 0) + 1; });
      r.acertadas.forEach((l) => { ac[l] = (ac[l] || 0) + 1; });
      const nuevo = { ...prev, pesos, aciertos: ac };
      saveMotor(profile.id, nuevo);
      return nuevo;
    });
  };

  const avanzarMotor = () => {
    if (!profile) return;
    const orden = ETAPAS_POR_RANGO[profile.rango];
    const idxEtapa = orden.indexOf(motor.etapa);
    const siguienteN = motor.n + 1;
    const subeEtapa = siguienteN > 0 && siguienteN % 6 === 0 && idxEtapa >= 0 && idxEtapa < orden.length - 1;
    setMotor((prev) => {
      const nuevo = subeEtapa
        ? { ...prev, etapa: orden[idxEtapa + 1], n: 0 }
        : { ...prev, n: siguienteN };
      saveMotor(profile.id, nuevo);
      return nuevo;
    });
    if (subeEtapa) {
      speak(F_ETAPA_SUPERADA);
      void petardos({ particleCount: 80, spread: 100, origin: { y: 0.6 } });
    }
  };

  return (
    <div className="app sky">
      <div className="sky-deco" aria-hidden="true"><span>☁️</span><span>☀️</span><span>🎈</span><span>🌈</span></div>
      <header className="app-header kid-header">
        <div className="kid-id">
          <span
            className="kid-avatar"
            role="img"
            aria-label={`Avatar de ${profile.nombre}`}
            onPointerDown={pressStart}
            onPointerUp={pressEnd}
            onPointerLeave={pressEnd}
          >
            {profile.avatar}
          </span>
          <div>
            <h1 className="kid-name">¡Hola, {profile.nombre}! 💛{graduado && ' 🎓'}</h1>
            <p className="kid-range">{profile.rango === '3-5' ? '🎨 3-5 Pre-lector' : '📖 6-8 Silábico'}</p>
          </div>
        </div>
        <button className="corner-peques" onClick={() => setShowPeques(true)} aria-label="Zona de padres">
          👪
        </button>
      </header>

      <main className="app-main">
        <div className="progress-tracker progress-grande">
          <div className="progress-score">⭐ {score}</div>
          <h2 className="progress-label">
            {graduado ? '🎓 Curso completado' : `📖 Curso de lectura · Lección ${leccionNum}/${totalLecciones}`}
          </h2>
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
              <h3 className="progress-label">
                {actividadActual.leccion.titulo} · {actividadActual.actividadIndex + 1}/{actividadActual.leccion.actividades.length}
              </h3>
              <div className="progress-bar progress-bar-grande">
                <div className="progress-fill" style={{ width: `${pctLeccion}%` }} />
              </div>
              <p className="progress-label" style={{ fontSize: '0.82rem', opacity: 0.85, marginTop: '0.35rem' }}>
                Lección {leccionNum}/{totalLecciones} · {etapaInfo.icono} {etapaInfo.nombre}
              </p>
            </div>
            {estadoGamificacion && (
              <div style={{ marginBottom: '1rem', padding: '0.8rem', background: 'rgba(255,255,255,0.9)', borderRadius: '16px' }}>
                <h4 style={{ fontSize: '0.9rem', color: '#764ba2', marginBottom: '0.5rem', fontWeight: '800' }}>🏆 Tus insignias</h4>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {obtenerInsigniasDesbloqueadas(estadoGamificacion).map((ins) => (
                    <span key={ins.id} className="insignia-badge" title={ins.descripcion}>{ins.emoji}</span>
                  ))}
                  {obtenerInsigniasDesbloqueadas(estadoGamificacion).length === 0 && (
                    <span style={{ fontSize: '0.88rem', color: '#5f5670' }}>Gana tu primera insignia 💛</span>
                  )}
                  {estadoGamificacion.rachaDias > 0 && (
                    <span style={{ marginLeft: 'auto', fontSize: '0.9rem', fontWeight: '800', color: '#b3261e' }}>
                      🔥 {estadoGamificacion.rachaDias} {estadoGamificacion.rachaDias === 1 ? 'día' : 'días'}
                    </span>
                  )}
                </div>
              </div>
            )}
            {actividadActual.actividad.tipo === 'escuchar_tocar' && (
              <EscucharYTocar
                key={claveActividad}
                objetivo={actividadActual.actividad.objetivo}
                opciones={opcionesActividad}
                correcta={actividadActual.actividad.objetivo}
                speak={speak}
                hablarSecuencia={hablarSecuencia}
                onCorrecto={() => manejarCorrecto(actividadActual.actividad.objetivo)}
                onError={() => manejarError(actividadActual.actividad.objetivo)}
                isSpeaking={isSpeaking}
              />
            )}
            {actividadActual.actividad.tipo === 'formar_silaba' && (
              <FormarSílaba
                key={claveActividad}
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
                key={claveActividad}
                objetivo={actividadActual.actividad.objetivo}
                palabra={actividadActual.actividad.palabra || actividadActual.actividad.objetivo}
                imagen={actividadActual.actividad.imagen}
                opciones={opcionesActividad}
                speak={speak}
                hablarSecuencia={hablarSecuencia}
                onCorrecto={() => manejarCorrecto(actividadActual.actividad.objetivo)}
                onError={() => manejarError(actividadActual.actividad.objetivo)}
                isSpeaking={isSpeaking}
              />
            )}
            {actividadActual.actividad.tipo === 'formar_palabra' && (
              <FormarPalabra
                key={claveActividad}
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
                key={claveActividad}
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
                key={claveActividad}
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
                key={claveActividad}
                texto={actividadActual.actividad.textoTTS || actividadActual.actividad.objetivo}
                speak={speak}
                hablarSecuencia={hablarSecuencia}
                onTerminado={() => {
                  setScore((s) => s + 20);
                  manejarCorrecto(actividadActual.actividad.objetivo);
                }}
                isSpeaking={isSpeaking}
                detener={stop}
                muted={sinVoz}
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
            hablarSecuencia={hablarSecuencia}
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
            <Suspense fallback={<Cargando />}>
            {masJuego === 'letras' && (
              <LetterGame
                key={`libre-${motor.etapa}-${motor.n}`}
                levels={levels}
                nombre={profile.nombre}
                speak={speak}
                hablarSecuencia={hablarSecuencia}
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
          )}
            {masJuego === 'escucha_elige' && (
              <EscuchaYElige
                rango={profile.rango}
                speak={speak}
                hablarSecuencia={hablarSecuencia}
                onCorrecto={() => registrarJuegoLibre('acierto')}
                onError={() => registrarJuegoLibre('error')}
                isSpeaking={isSpeaking}
                sinVoz={sinVoz}
              />
            )}
            {masJuego === 'silaba_trabada' && (
              <FormarSílabaTrabada
                speak={speak}
                hablarSecuencia={hablarSecuencia}
                onCorrecto={() => registrarJuegoLibre('acierto')}
                onError={() => registrarJuegoLibre('error')}
                isSpeaking={isSpeaking}
              />
            )}
            {masJuego === 'palabras_desordenadas' && (
              <PalabrasDesordenadas
                speak={speak}
                hablarSecuencia={hablarSecuencia}
                onCorrecto={() => registrarJuegoLibre('acierto')}
                onError={() => registrarJuegoLibre('error')}
                isSpeaking={isSpeaking}
              />
            )}
            {masJuego === 'trazo' && (
              <TrazoLetra
                speak={speak}
                hablarSecuencia={hablarSecuencia}
                onCorrecto={() => registrarJuegoLibre('acierto')}
                onError={() => registrarJuegoLibre('error')}
                isSpeaking={isSpeaking}
              />
            )}
            {masJuego === 'memoria' && (
              <MemoriaAuditiva
                speak={speak}
                hablarSecuencia={hablarSecuencia}
                onCorrecto={() => registrarJuegoLibre('acierto')}
                onError={() => registrarJuegoLibre('error')}
                isSpeaking={isSpeaking}
                sinVoz={sinVoz}
              />
            )}
            </Suspense>
          </div>
        )}
      </main>

      {showPadres && (
        <ZonaPadres
          nombre={profile.nombre}
          rango={profile.rango}
          avatar={profile.avatar}
          muted={sinVoz}
          onToggleMute={alternarVoz}
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
          leccionNum={leccionNum}
          totalLecciones={totalLecciones}
          pctCurso={pct}
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
          onSalirNube={() => { void salirCuenta(); }}
        />
      )}

      {showAuth && (
        <Suspense fallback={<Cargando texto="Cargando acceso…" />}>
          <AuthPadres
            onListo={() => {
              setShowAuth(false);
              setActividadGanada(false);
              setFinCurso(false);
              void entrarNube();
            }}
            onClose={() => setShowAuth(false)}
          />
        </Suspense>
      )}

      {showExamen && (
        <Suspense fallback={<Cargando texto="Preparando el examen…" />}>
          <GraduationExam
            speak={speak}
            isSpeaking={isSpeaking}
            onAprobar={() => {
              if (!profile) return;
              marcarGraduado(profile.id);
              setGraduado(true);
              const g = actualizarGamificacion(
                estadoGamificacion || cargarGamificacion(profile.id),
                { graduado: true },
                profile.id,
              );
              const extra = otorgarInsignia(g.siguiente, 'graduado', profile.id);
              setEstadoGamificacion(extra.siguiente);
              if (extra.nuevasInsignias.length > 0) {
                speak(fraseInsignia(extra.nuevasInsignias[0].nombre));
                void petardos({ particleCount: 160, spread: 160, origin: { y: 0.45 } });
              }
            }}
            onClose={() => setShowExamen(false)}
          />
        </Suspense>
      )}

      {showPeques && (
        <MenuPeques
          perfiles={perfiles}
          activoId={profile.id}
          onElegir={elegirPeque}
          onNuevoListo={() => {
            setActividadGanada(false);
            setFinCurso(false);
            refrescar();
            setShowPeques(false);
          }}
          onClose={() => setShowPeques(false)}
          onCerrarSesionPadres={() => { void salirCuenta(); }}
        />
      )}

      {finCurso && (
        <div className="padres-overlay" role="dialog" aria-modal="true" aria-label="Curso completado">
          <div className="padres-card" style={{ textAlign: 'center', maxWidth: '460px' }}>
            <div style={{ fontSize: '4rem' }} aria-hidden="true">🎓🎉</div>
            <h2>¡Curso completado, {profile.nombre}!</h2>
            <p style={{ color: '#5b3a80', fontWeight: '700' }}>
              Terminaste todo el recorrido de lectura con ⭐ {score} puntos.
              Léo está muy orgulloso de ti.
            </p>
            <div className="game-actions" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                className="next-btn"
                onClick={() => {
                  setFinCurso(false);
                  const nuevo = avanzarActividad(motor, profile.rango);
                  aplicarMotor(nuevo);
                  setActividadGanada(false);
                }}
              >
                🔁 Seguir repasando
              </button>
              <button
                className="ghost-btn"
                onClick={() => {
                  setFinCurso(false);
                  setShowPadres(true);
                }}
              >
                📊 Ver mi progreso
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="app-footer"><p>© 2026 LeeConAmor - {profile.nombre} aprende con {profile.avatar} y Léo 🦉</p></footer>
    </div>
  );
}

export default App;
