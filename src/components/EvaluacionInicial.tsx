import { useState, useCallback } from 'react';
import { PREGUNTAS_EVAL, RangoId, recomendarNivelConIA } from '../hooks/useEvaluacionInicial';
import { saveProfile, type ChildProfile } from '../data/curriculum';

export default function EvaluacionInicial({ rango, nombre, avatar, onListo }: { rango: RangoId; nombre: string; avatar: string; onListo: (perfil: ChildProfile) => void }) {
  const [idx, setIdx] = useState(0);
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [error, setError] = useState('');

  const misPreguntas = PREGUNTAS_EVAL.filter((p) => p.rango === rango);
  const pregunta = misPreguntas[idx];
  const finalizado = idx >= misPreguntas.length;

  const responder = useCallback((valor: string) => {
    setRespuestas((prev) => ({ ...prev, [pregunta.id]: valor }));
    if (idx + 1 < misPreguntas.length) {
      setIdx((i) => i + 1);
    } else {
      finalizar();
    }
  }, [pregunta, idx, misPreguntas.length]);

  const finalizar = async () => {
    setCargando(true);
    setError('');
    try {
      const rec = await recomendarNivelConIA(respuestas, rango, nombre);
      setResultado(rec);
      const perfil: ChildProfile = {
        id: `peque_${Date.now()}`,
        nombre,
        rango,
        avatar,
        voiceEnabled: true,
        createdAt: Date.now(),
        etapa: rec.etapaRecomendada,
        nivel: rec.nivelRecomendado,
        evaluacionInicial: rec,
      };
      saveProfile(perfil);
      try { localStorage.setItem('lee_muted', '0'); } catch { /* noop */ }
      onListo(perfil);
    } catch (e: any) {
      setError('No se pudo completar la evaluación. Se usará el nivel inicial por defecto.');
      const perfil: ChildProfile = {
        id: `peque_${Date.now()}`,
        nombre,
        rango,
        avatar,
        voiceEnabled: true,
        createdAt: Date.now(),
        etapa: 'vocales',
        nivel: 0,
      };
      saveProfile(perfil);
      onListo(perfil);
    } finally {
      setCargando(false);
    }
  };

  const progress = finalizado ? 100 : Math.round(((idx) / misPreguntas.length) * 100);

  if (cargando && !resultado) {
    return (
      <div className="app sky" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1rem' }}>
        <div style={{ fontSize: '3rem' }}>🦉</div>
        <p style={{ color: 'white', fontSize: '1.2rem', marginTop: '1rem' }}>Léo está evaluando…</p>
      </div>
    );
  }

  if (finalizado && resultado) {
    return (
      <div className="app sky" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎯</div>
        <h2 style={{ color: 'white', margin: '0.5rem 0' }}>Evaluación terminada, {nombre}</h2>
        <p style={{ color: 'rgba(255,255,255,0.9)', maxWidth: '400px', margin: '0 auto 1rem' }}>
          Nivel recomendado: <strong>{resultado.nivelRecomendado}</strong> · Etapa: <strong>{resultado.etapaRecomendada}</strong>
        </p>
        {resultado.observaciones && resultado.observaciones.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '12px', padding: '1rem', maxWidth: '400px', margin: '0 auto', color: 'white', fontSize: '0.95rem' }}>
            {resultado.observaciones.map((o: string, i: number) => <div key={i}>• {o}</div>)}
          </div>
        )}
        <button
          className="next-btn big"
          onClick={() => {
            // Se maneja en onListo del padre
          }}
          style={{ marginTop: '1.5rem' }}
        >
          ¡Empezar a leer!
        </button>
      </div>
    );
  }

  if (!pregunta) return null;

  return (
    <div className="app sky" style={{ minHeight: '100vh', padding: '1rem', display: 'flex', flexDirection: 'column' }}>
      <header className="app-header" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🦉</div>
        <h1 style={{ color: 'white', margin: '0' }}>Evaluación de {nombre}</h1>
        <p style={{ color: 'rgba(255,255,255,0.9)', margin: '0.25rem 0 0' }}>{rango === '3-5' ? '3 a 5 · Pre-lector' : '6 a 8 · Silábico'}</p>
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
