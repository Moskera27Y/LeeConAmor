import { supabase, SUPABASE_ACTIVO } from './supabase';
import { loadMotor, loadScore, esGraduado, loadProfiles, saveProfile, nuevoId, type ChildProfile } from '../data/curriculum';

// Orden canónico de etapas (de menor a mayor dificultad) para comparar avances.
const ORDEN_ETAPAS = ['vocales', 'silabas', 'palabras', 'oraciones'];

function pesoEtapa(etapa: string): number {
  const i = ORDEN_ETAPAS.indexOf(etapa);
  return i < 0 ? 0 : i * 100;
}

const PENDIENTE = 'lee_sync_pendiente';
const NUBE = (idLocal: string) => `lee_nube_${idLocal}`;

export function hayPendiente(): boolean {
  try {
    return localStorage.getItem(PENDIENTE) === '1';
  } catch {
    return false;
  }
}
function limpiarPendiente() {
  try {
    localStorage.removeItem(PENDIENTE);
  } catch { /* noop */ }
}

async function idNube(sb: any, padreId: string, local: ChildProfile, graduado: boolean): Promise<string> {
  try {
    const previo = localStorage.getItem(NUBE(local.id));
    if (previo) return previo;
  } catch { /* noop */ }
  const { data: mismos } = await sb.from('hijos').select('id').eq('padre_id', padreId).eq('nombre', local.nombre).limit(1);
  if (mismos && mismos.length > 0) {
    try {
      localStorage.setItem(NUBE(local.id), mismos[0].id);
    } catch { /* noop */ }
    return mismos[0].id as string;
  }
  const { data, error } = await sb
    .from('hijos')
    .insert({ padre_id: padreId, nombre: local.nombre, avatar: local.avatar, rango: local.rango, graduado })
    .select('id')
    .single();
  if (error || !data) throw error || new Error('sin id');
  try {
    localStorage.setItem(NUBE(local.id), (data as any).id);
  } catch { /* noop */ }
  return (data as any).id as string;
}

// Sube todo lo local pendiente. El juego sigue funcionando sin internet.
export async function sincronizarAhora(): Promise<boolean> {
  if (!SUPABASE_ACTIVO) return false;
  const sb = supabase();
  if (!sb) return false;
  try {
    const { data: ses } = await sb.auth.getSession();
    const uid = ses?.session?.user?.id;
    if (!uid) return false;
    const email = ses.session?.user?.email || '';
    await sb.from('padres').upsert({ id: uid, email });
    const locales = loadProfiles();
    for (const l of locales) {
      const motor = loadMotor(l.id);
      const nubeId = await idNube(sb, uid, l, esGraduado(l.id));
      await sb.from('hijos').update({
        avatar: l.avatar,
        rango: l.rango,
        graduado: esGraduado(l.id),
        updated_at: new Date().toISOString(),
      }).eq('id', nubeId);
      await sb.from('progreso').upsert({
        hijo_id: nubeId,
        etapa: motor.etapa,
        n: motor.n,
        pesos: motor.pesos,
        aciertos: motor.aciertos,
        score: loadScore(l.id),
        leccion_id: motor.leccionId || null,
        actividad_idx: motor.actividadIdx ?? null,
        updated_at: new Date().toISOString(),
      });
    }
    limpiarPendiente();
    return true;
  } catch {
    return false;
  }
}

// Baja la nube a este dispositivo (al entrar). Gana lo más reciente por hijo.
export async function bajarNube(): Promise<boolean> {
  if (!SUPABASE_ACTIVO) return false;
  const sb = supabase();
  if (!sb) return false;
  try {
    const { data: ses } = await sb.auth.getSession();
    const uid = ses?.session?.user?.id;
    if (!uid) return false;
    const { data: hijos } = await sb.from('hijos').select('*').eq('padre_id', uid);
    if (!hijos) return true;
    for (const h of hijos as any[]) {
      const { data: prog } = await sb.from('progreso').select('*').eq('hijo_id', h.id).single();
      const locales = loadProfiles();
      let local = locales.find((l) => l.nombre === h.nombre);
      if (!local) {
        local = { id: nuevoId(), nombre: h.nombre, avatar: h.avatar || '🦁', rango: h.rango === '6-8' ? '6-8' : '3-5', voiceEnabled: true, createdAt: Date.now() };
        saveProfile(local);
      }
      try {
        localStorage.setItem(NUBE(local.id), h.id);
      } catch { /* noop */ }
      if (prog) {
        const aqui = loadMotor(local.id);
        // Si la nube trae más avance, adoptarlo (mismo criterio etapa+nivel)
        const aquiN = (pesoEtapa(aqui.etapa) || aqui.n);
        const allaN = (pesoEtapa(prog.etapa) || prog.n || 0);
        if (allaN > aquiN) {
          const motorNube = {
            etapa: prog.etapa || aqui.etapa,
            n: prog.n || 0,
            pesos: prog.pesos || {},
            aciertos: prog.aciertos || {},
            ...(prog.leccion_id ? { leccionId: prog.leccion_id } : {}),
            ...(prog.actividad_idx != null ? { actividadIdx: prog.actividad_idx } : {}),
          };
          try {
            localStorage.setItem(`lee_motor_${local.id}`, JSON.stringify(motorNube));
            localStorage.setItem(`lee_score_${local.id}`, String(prog.score || 0));
            if (h.graduado) localStorage.setItem(`lee_graduado_${local.id}`, '1');
          } catch { /* noop */ }
        }
      }
    }
    return true;
  } catch {
    return false;
  }
}

export function vigilarConexion(onCambio: (online: boolean) => void) {
  const fn = () => onCambio(navigator.onLine);
  window.addEventListener('online', fn);
  window.addEventListener('offline', fn);
  return () => {
    window.removeEventListener('online', fn);
    window.removeEventListener('offline', fn);
  };
}
