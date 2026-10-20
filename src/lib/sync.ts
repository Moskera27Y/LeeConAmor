import { supabase, SUPABASE_ACTIVO } from './supabase';
import {
  loadMotor, loadScore, esGraduado, loadProfiles, saveProfile, nuevoId,
  motorKey, scoreKey, graduadoKey, idPerfilActivo, activarPerfil, versionSync, type ChildProfile,
} from '../data/curriculum';
import { SECUENCIA_LECCIONES } from '../data/secuenciaLecciones';
import { cargarGamificacion, guardarGamificacion, type EstadoGamificacion } from './gamificacion';
import { cargarAdaptabilidad, guardarAdaptabilidad, type EstadoAdaptabilidad } from './adaptividad';

// Orden canónico de etapas (de menor a mayor dificultad) para comparar avances.
const ORDEN_ETAPAS = ['vocales', 'silabas', 'palabras', 'oraciones'];

function pesoEtapa(etapa: string): number {
  const i = ORDEN_ETAPAS.indexOf(etapa);
  return i < 0 ? 0 : i * 100;
}

// Valor comparable de avance. El recorrido guiado manda: una lección concreta
// siempre es más precisa que el contador clásico por etapas.
function combinarMax(
  local: Record<string, number> = {},
  nube: Record<string, number> = {},
): Record<string, number> {
  const salida = { ...local };
  for (const [k, v] of Object.entries(nube)) {
    const n = Number(v);
    if (Number.isFinite(n)) salida[k] = Math.max(salida[k] || 0, n);
  }
  return salida;
}

function avance(rango: '3-5' | '6-8', motor: { etapa?: string; n?: number; leccionId?: string | null; actividadIdx?: number | null }) {
  if (motor.leccionId) {
    const idx = SECUENCIA_LECCIONES[rango].findIndex((l) => l.id === motor.leccionId);
    if (idx >= 0) {
      return { guiado: true, valor: idx * 1000 + Math.max(0, motor.actividadIdx ?? 0) };
    }
  }
  return { guiado: false, valor: pesoEtapa(motor.etapa || 'vocales') + (motor.n || 0) };
}

const PENDIENTE = 'lee_sync_pendiente';
const NUBE = (idLocal: string) => `lee_nube_${idLocal}`;

function nubeVinculada(idLocal: string): string {
  try {
    return localStorage.getItem(NUBE(idLocal)) || '';
  } catch {
    return '';
  }
}

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
  const { data: mismos, error: errBusca } = await sb.from('hijos').select('id').eq('padre_id', padreId).eq('nombre', local.nombre);
  if (errBusca) throw errBusca;
  const yaVinculados = new Set(
    loadProfiles().map((p) => nubeVinculada(p.id)).filter(Boolean),
  );
  const libre = (mismos || []).find((m: any) => !yaVinculados.has(m.id));
  if (libre) {
    try {
      localStorage.setItem(NUBE(local.id), libre.id);
    } catch { /* noop */ }
    return libre.id as string;
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

// Evita dos subidas simultáneas (login + sincronización de fondo) que podrían
// duplicar hijos recién creados en la nube.
let syncEnCurso: Promise<boolean> | null = null;

export function sincronizarAhora(yaBajado = false): Promise<boolean> {
  if (syncEnCurso) return syncEnCurso;
  syncEnCurso = sincronizarInterno(yaBajado).finally(() => {
    syncEnCurso = null;
  });
  return syncEnCurso;
}

// Sube todo lo local pendiente. El juego sigue funcionando sin internet.
// Antes de subir se baja la nube: si otro equipo avanzó más, se adopta su
// avance en vez de pisarlo con datos viejos de este dispositivo.
async function sincronizarInterno(yaBajado = false): Promise<boolean> {
  if (!SUPABASE_ACTIVO) return false;
  const sb = supabase();
  if (!sb) return false;
  if (!yaBajado) {
    const bajo = await bajarNube();
    if (!bajo) return false;
  }
  // Se captura después de bajar: bajar puede marcar cambios locales.
  const versionInicio = versionSync();
  try {
    const { data: ses } = await sb.auth.getSession();
    const uid = ses?.session?.user?.id;
    if (!uid) return false;
    const email = ses.session?.user?.email || '';
    const { error: errPadre } = await sb.from('padres').upsert({ id: uid, email });
    if (errPadre) throw errPadre;
    const locales = loadProfiles();
    for (const l of locales) {
      const motor = loadMotor(l.id);
      const nubeId = await idNube(sb, uid, l, esGraduado(l.id));
      const { error: errHijo } = await sb.from('hijos').update({
        nombre: l.nombre,
        avatar: l.avatar,
        rango: l.rango,
        graduado: esGraduado(l.id),
        updated_at: new Date().toISOString(),
      }).eq('id', nubeId);
      if (errHijo) throw errHijo;
      const baseProgreso = {
        hijo_id: nubeId,
        etapa: motor.etapa,
        n: motor.n,
        pesos: motor.pesos,
        aciertos: motor.aciertos,
        score: loadScore(l.id),
        leccion_id: motor.leccionId || null,
        actividad_idx: motor.actividadIdx ?? null,
        updated_at: new Date().toISOString(),
      };
      let { error: errProg } = await sb.from('progreso').upsert({
        ...baseProgreso,
        gamificacion: cargarGamificacion(l.id),
        adaptabilidad: cargarAdaptabilidad(l.id),
      });
      if (errProg) {
        // Compatibilidad con bases creadas antes de las columnas nuevas:
        // se reintenta el guardado básico en vez de romper toda la nube.
        const { error: errLegacy } = await sb.from('progreso').upsert(baseProgreso);
        errProg = errLegacy;
      }
      if (errProg) throw errProg;
    }
    // Solo se limpia si TODAS las escrituras salieron bien y no hubo cambios
    // nuevos mientras subía; si no, se reintenta sin perder avances.
    const sinCambiosNuevos = versionSync() === versionInicio;
    if (sinCambiosNuevos) limpiarPendiente();
    return sinCambiosNuevos;
  } catch {
    return false;
  }
}

// Baja la nube a este dispositivo (al entrar). Gana lo más reciente por hijo.
// Un lock evita que dos eventos de auth simultáneos creen perfiles locales
// duplicados para el mismo hijo de la nube.
let bajaEnCurso: Promise<boolean> | null = null;

export function bajarNube(): Promise<boolean> {
  if (bajaEnCurso) return bajaEnCurso;
  bajaEnCurso = bajarNubeInterno().finally(() => {
    bajaEnCurso = null;
  });
  return bajaEnCurso;
}

async function bajarNubeInterno(): Promise<boolean> {
  if (!SUPABASE_ACTIVO) return false;
  const sb = supabase();
  if (!sb) return false;
  try {
    const { data: ses } = await sb.auth.getSession();
    const uid = ses?.session?.user?.id;
    if (!uid) return false;
    const { data: hijos, error: errHijos } = await sb.from('hijos').select('*').eq('padre_id', uid);
    if (errHijos) throw errHijos;
    if (!hijos) return true;
    // saveProfile activa el último perfil guardado; al bajar varios hijos
    // eso cambiaría el peque activo sin querer. Se restaura al terminar.
    const activoAntes = idPerfilActivo();
    let fallo = false;
    for (const h of hijos as any[]) {
      const rango: '3-5' | '6-8' = h.rango === '6-8' ? '6-8' : '3-5';
      const { data: prog, error: errProg } = await sb.from('progreso').select('*').eq('hijo_id', h.id).maybeSingle();
      if (errProg) throw errProg;
      const locales = loadProfiles();
      // Primero se busca el vínculo por id; el nombre solo sirve para adoptar
      // un perfil local que todavía no está vinculado. Así dos peques con el
      // mismo nombre no se pisan entre sí.
      let local = locales.find((l) => nubeVinculada(l.id) === h.id);
      if (!local) {
        local = locales.find((l) => l.nombre === h.nombre && !nubeVinculada(l.id));
      }
      if (!local) {
        local = { id: nuevoId(), nombre: h.nombre, avatar: h.avatar || '🦁', rango, voiceEnabled: true, createdAt: Date.now() };
        saveProfile(local);
      }
      try {
        localStorage.setItem(NUBE(local.id), h.id);
      } catch { /* noop */ }
      try {
        if (h.graduado) localStorage.setItem(graduadoKey(local.id), '1');
        if (prog) {
          const aqui = avance(rango, loadMotor(local.id));
          const alla = avance(rango, {
            etapa: prog.etapa,
            n: prog.n,
            leccionId: prog.leccion_id,
            actividadIdx: prog.actividad_idx,
          });
          const scoreAqui = loadScore(local.id);
          const scoreAlla = Number(prog.score || 0);
          // Adopta la nube si trae un recorrido guiado más avanzado, o si
          // ambos están empatados pero la nube tiene más puntos. Un guardado
          // clásico (sin lección) nunca pisa un recorrido guiado local.
          const adoptar = alla.guiado
            ? (!aqui.guiado || alla.valor > aqui.valor || (alla.valor === aqui.valor && scoreAlla > scoreAqui))
            : (!aqui.guiado && alla.valor > aqui.valor);
          if (adoptar) {
            const motorLocal = loadMotor(local.id);
            const motorNube = {
              etapa: prog.etapa || 'vocales',
              n: prog.n || 0,
              // El avance viene de la nube, pero no se pierde el dominio ni
              // los fallos que este dispositivo ya había registrado.
              pesos: combinarMax(motorLocal.pesos, prog.pesos || {}),
              aciertos: combinarMax(motorLocal.aciertos, prog.aciertos || {}),
              ...(prog.leccion_id ? { leccionId: prog.leccion_id } : {}),
              ...(prog.actividad_idx != null ? { actividadIdx: prog.actividad_idx } : {}),
            };
            localStorage.setItem(motorKey(local.id), JSON.stringify(motorNube));
          }
          // La puntuación es acumulativa: nunca se pierde la mayor de las dos.
          if (scoreAlla > scoreAqui) {
            localStorage.setItem(scoreKey(local.id), String(scoreAlla));
          }
          // Insignias y racha también viajan. Se adopta la nube si trae más
          // avance; las insignias se unen para no perder ninguna.
          if (prog.gamificacion) {
            const nubeG = prog.gamificacion as Partial<EstadoGamificacion>;
            const localG = cargarGamificacion(local.id);
            const aciertosNube = Number(nubeG.aciertosTotales || 0);
            const insigniasNube = Array.isArray(nubeG.insignias) ? nubeG.insignias : [];
            const insigniasUnidas = [...new Set([...localG.insignias, ...insigniasNube])];
            const aciertosUnidos = Math.max(localG.aciertosTotales, aciertosNube);
            const adoptarG = aciertosNube > localG.aciertosTotales
              || (!!nubeG.graduado && !localG.graduado)
              || insigniasNube.length > localG.insignias.length;
            // Aunque la nube no vaya "más adelante", las insignias se unen:
            // dos equipos pueden tener logros distintos con el mismo contador.
            if (adoptarG || insigniasUnidas.length > localG.insignias.length || aciertosUnidos > localG.aciertosTotales) {
              guardarGamificacion({
                ...localG,
                ...(adoptarG ? nubeG : {}),
                insignias: insigniasUnidas,
                aciertosTotales: aciertosUnidos,
              } as EstadoGamificacion, local.id);
            }
          }
          if (prog.adaptabilidad) {
            const nubeA = prog.adaptabilidad as Partial<EstadoAdaptabilidad>;
            const localA = cargarAdaptabilidad(local.id);
            const fechaNube = nubeA.ultimaFechaSesion || '';
            if (fechaNube > (localA.ultimaFechaSesion || '')) {
              guardarAdaptabilidad({ ...localA, ...nubeA } as EstadoAdaptabilidad, local.id);
            }
          }
        }
      } catch {
        // No se debe subir si este hijo no quedó bien bajado: se pisaría la
        // nube con datos locales viejos. Se reintenta en la próxima conexión.
        fallo = true;
      }
    }
    if (activoAntes) activarPerfil(activoAntes);
    return !fallo;
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
