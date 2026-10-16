import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const SUPABASE_ACTIVO = Boolean(URL && ANON);

const PREF_RECORDAR = 'lee_recordar';

// "Recordar sesión": ON = persiste semanas en este aparato (localStorage);
// OFF = solo memoria (al cerrar la pestaña se cierra la sesión).
export function leerRecordar(): boolean {
  try {
    return localStorage.getItem(PREF_RECORDAR) !== '0';
  } catch {
    return true;
  }
}

export function setRecordar(v: boolean) {
  try {
    localStorage.setItem(PREF_RECORDAR, v ? '1' : '0');
  } catch { /* noop */ }
  clientePersistente = null;
  clienteTemporal = null;
}

const memoria: Record<string, string> = {};
const almacenTemporal = {
  getItem: (k: string) => (k in memoria ? memoria[k] : null),
  setItem: (k: string, v: string) => {
    memoria[k] = v;
  },
  removeItem: (k: string) => {
    delete memoria[k];
  },
};

let clientePersistente: SupabaseClient | null = null;
let clienteTemporal: SupabaseClient | null = null;

export function supabase(recordar?: boolean): SupabaseClient | null {
  if (!SUPABASE_ACTIVO) return null;
  const r = recordar ?? leerRecordar();
  if (r) {
    if (!clientePersistente) {
      clientePersistente = createClient(URL as string, ANON as string, {
        auth: { storage: localStorage, persistSession: true, autoRefreshToken: true },
      });
    }
    return clientePersistente;
  }
  if (!clienteTemporal) {
    clienteTemporal = createClient(URL as string, ANON as string, {
      auth: { storage: almacenTemporal, persistSession: false, autoRefreshToken: false },
    });
  }
  return clienteTemporal;
}

// Email de la sesión activa en cualquiera de los dos clientes (o '' si no hay).
export async function emailSesion(): Promise<string> {
  if (!SUPABASE_ACTIVO) return '';
  try {
    const { data } = await supabase(true).auth.getSession();
    const em = data?.session?.user?.email || '';
    if (em) return em;
  } catch { /* noop */ }
  try {
    const { data } = await supabase(false).auth.getSession();
    return data?.session?.user?.email || '';
  } catch { /* noop */ }
  return '';
}
export async function cerrarSesionNube(): Promise<void> {
  try {
    await clientePersistente?.auth.signOut();
  } catch { /* noop */ }
  try {
    await clienteTemporal?.auth.signOut();
  } catch { /* noop */ }
  for (const k of Object.keys(memoria)) delete memoria[k];
}
