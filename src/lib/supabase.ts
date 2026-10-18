import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const SUPABASE_ACTIVO = Boolean(URL && ANON);

// "Recordar sesión": ON = persiste semanas en este aparato (localStorage);
// OFF = solo memoria (al cerrar la pestaña se cierra la sesión).
export function leerRecordar(): boolean {
  try {
    return localStorage.getItem('lee_recordar') !== '0';
  } catch {
    return true;
  }
}

export function setRecordar(v: boolean) {
  try {
    localStorage.setItem('lee_recordar', v ? '1' : '0');
  } catch { /* noop */ }
}

let cliente: SupabaseClient | null = null;
let sesionPersistida = true;

export function supabase(recordarSesion?: boolean): SupabaseClient | null {
  if (!SUPABASE_ACTIVO) return null;
  // La preferencia de "recordar sesión" cambia el almacenamiento: hay que recrear el cliente.
  if (recordarSesion !== undefined && recordarSesion !== sesionPersistida) {
    sesionPersistida = recordarSesion;
    cliente = null;
  }
  if (!cliente) {
    cliente = createClient(URL as string, ANON as string, {
      auth: {
        storage: recordarSesion === false ? memoryStorage() : localStorage,
        persistSession: recordarSesion !== false,
        autoRefreshToken: true,
      },
    });
  }
  return cliente;
}

// Guardado en memoria (se pierde al cerrar la pestaña) cuando el adulto apaga "recordar".
function memoryStorage() {
  let cache: Record<string, string> = {};
  return {
    getItem: (k: string) => (k in cache ? cache[k] : null),
    setItem: (k: string, v: string) => { cache[k] = String(v); },
    removeItem: (k: string) => { delete cache[k]; },
  };
}

// Email de la sesión activa (o '' si no hay)
export async function emailSesion(): Promise<string> {
  if (!SUPABASE_ACTIVO) return '';
  try {
    const { data } = await supabase()!.auth.getSession();
    return data?.session?.user?.email || '';
  } catch {
    return '';
  }
}

export async function cerrarSesionNube(): Promise<void> {
  try {
    await cliente?.auth.signOut();
  } catch { /* noop */ }
}
