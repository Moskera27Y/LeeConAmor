import { useState, useCallback, useEffect, useRef } from 'react';
import { PREGUNTAS_EVAL, recomendarNivelConIA, type RangoId, type ResultadoEval } from '../hooks/useEvaluacionInicial';
import { nuevoId, type ChildProfile } from '../data/curriculum';

export default function EvaluacionInicial({ rango, nombre, avatar, onListo }: { rango: RangoId; nombre: string; avatar: string; onListo: (perfil: ChildProfile) => void }) {
  const [idx, setIdx] = useState(0);
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoEval | null>(null);
  const [perfilFinal, setPerfilFinal] = useState<ChildProfile | null>(null);
  const [terminado, setTerminado] = useState(false);
  const [error, setError] = useState('');
  // Evita dobles toques: en la última pregunta podían lanzarse dos
  // evaluaciones y crear dos perfiles.
  const enviandoRef = useRef(false);

  useEffect(() => {
    enviandoRef.current = false;
  }, [idx]);

  const misPreguntas = PREGUNTAS_EVAL.filter((p) => p.rango === rango);
  const pregunta = misPreguntas[idx];
  const finalizado = idx >= misPreguntas.length;

  const finalizar = useCallback(async (respuestasFinales: Record<string, string>) => {
    setCargando(true);
    setError('');
    let perfil: ChildProfile = {
      id: nuevoId(),
      nombre,
      rango,
      avatar,
      voiceEnabled: true,
      createdAt: Date.now(),
      etapa: 'vocales',
      nivel: 0,
    };
    try {
      const rec = await recomendarNivelConIA(respuestasFinales, rango, nombre);
      setResultado(rec);
      perfil = {
        ...perfil,
        etapa: rec.etapaRecomendada,
        nivel: rec.nivelRecomendado,
        evaluacionInicial: rec,
      };
    } catch {
      const base: ResultadoEval = {
        rango,
        puntaje: 0,
        total: 0,
        nivelRecomendado: 0,
        etapaRecomendada: 'vocales',
        observaciones: [],
      };
      setError('No se pudo consultar la IA. Se usará el nivel inicial por defecto.');
      // Aunque falle la red, el peque siempre puede empezar con un perfil válido.
      perfil = { ...perfil, etapa: base.etapaRecomendada, nivel: base.nivelRecomendado, evaluacionInicial: base };
      setResultado(base);
    }
    // El guardado y la navegación los hace el padre (WelcomeScreen/App), que
    // además asigna la lección inicial. Aquí solo preparamos el perfil.
    setPerfilFinal(perfil);
    setCargando(false);
    setTerminado(true);
  }, [rango, nombre, avatar]);

  const responder = useCallback((valor: string) => {
    if (!pregunta || enviandoRef.current) return;
    enviandoRef.current = true;
    // Se incluye la respuesta recién pulsada: antes la última se perdía.
    const nuevas = { ...respuestas, [pregunta.id]: valor };
    setRespuestas(nuevas);
    if (idx + 1 < misPreguntas.length) {
      setIdx((i) => i + 1);
    } else {
      finalizar(nuevas);
    }
  }, [pregunta, respuestas, idx, misPreguntas.length, finalizar]);

  const progress = finalizado ? 100 : Math.round(((idx) / misPreguntas.length) * 100);

  if (cargando) {
    return (
      <div className="app sky" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1rem' }}>
        <div style={{ fontSize: '3rem' }}>🦉</div>
        <p style={{ color: '#5b3a80', fontSize: '1.2rem', marginTop: '1rem' }}>Léo está evaluando…</p>
      </div>
    );
  }

  if (terminado && perfilFinal) {
    const nivel = resultado?.nivelRecomendado ?? perfilFinal.nivel;
    const etapa = resultado?.etapaRecomendada ?? perfilFinal.etapa;
    const observaciones = resultado?.observaciones ?? [];
    return (
      <div className="app sky" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎯</div>
        <h2 style={{ color: '#5b3a80', margin: '0.5rem 0' }}>¡Evaluación terminada, {nombre}!</h2>
        <p style={{ color: '#6b6880', maxWidth: '420px', margin: '0 auto 1rem', fontWeight: '700' }}>
          Nivel recomendado: <strong>{nivel}</strong> · Etapa: <strong>{etapa}</strong>
        </p>
        {error && <p style={{ color: '#ff6b6b', maxWidth: '420px', margin: '0 auto 1rem' }}>{error}</p>}
        {observaciones.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.9)', borderRadius: '16px', padding: '1rem', maxWidth: '420px', margin: '0 auto', color: '#333', fontSize: '0.95rem', textAlign: 'left' }}>
            <strong style={{ display: 'block', marginBottom: '0.4rem' }}>Para la familia:</strong>
            {observaciones.map((o: string, i: number) => <div key={i}>• {o}</div>)}
          </div>
        )}
        <button
          className="next-btn big"
          onClick={() => onListo(perfilFinal)}
          style={{ marginTop: '1.5rem', fontSize: '1.1rem', minHeight: '60px' }}
        >
          ¡Empezar a leer! 💛
        </button>
      </div>
    );
  }

  if (!pregunta) return null;

  return (
    <div className="app sky" style={{ minHeight: '100vh', padding: '1rem', display: 'flex', flexDirection: 'column' }}>
      <header className="app-header" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🦉</div>
        <h1 style={{ color: '#5b3a80', margin: '0' }}>Evaluación de {nombre}</h1>
        <p style={{ color: '#6b6880', margin: '0.25rem 0 0' }}>{rango === '3-5' ? '3 a 5 · Pre-lector' : '6 a 8 · Silábico'}</p>
      </header>

      <div className="progress-tracker progress-grande" style={{ maxWidth: '500px', margin: '0 auto 1.5rem' }}>
         <div className="progress-label">Pregunta {idx + 1} de {misPreguntas.length}</div>
        <div className="progress-bar progress-bar-grande">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <main className="app-main" style={{ maxWidth: '500px', margin: '0 auto', flex: 1 }}>
        <div style={{ background: 'white', borderRadius: '22px', padding: '1.5rem', boxShadow: '0 6px 24px rgba(0,0,0,.18)', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{pregunta.tipo === 'vocal' ? '🔤' : pregunta.tipo === 'silaba_inicial' ? '🔊' : '📖'}</div>
          <p style={{ fontSize: '1.4rem', fontWeight: '800', color: '#333', margin: '0 0 1.5rem' }}>{pregunta.enunciado}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.8rem' }}>
            {(pregunta.opciones || []).map((op) => (
              <button
                key={op}
                onClick={() => responder(op)}
                className="letter-btn"
                style={{ width: '88px', height: '88px', fontSize: '2rem' }}
              >
                {op}
              </button>
            ))}
          </div>
          {error && <p style={{ color: '#ff6b6b', marginTop: '1rem', fontSize: '0.9rem' }}>{error}</p>}
        </div>
      </main>
    </div>
  );
}
