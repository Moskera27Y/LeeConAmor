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
    if (!v) {
      // Al desactivar "recordar", no dejamos tokens de Supabase viejos en
      // localStorage: la sesión nueva vivirá solo en memoria.
      const borrar: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith('sb-')) borrar.push(k);
      }
      borrar.forEach((k) => localStorage.removeItem(k));
    }
  } catch { /* noop */ }
}

let cliente: SupabaseClient | null = null;
// Se respeta la preferencia guardada desde el primer arranque; antes, al
// recargar, se volvía a leer la sesión persistida aunque el adulto hubiera
// desmarcado "recordar sesión".
let sesionPersistida = leerRecordar();

export function supabase(recordarSesion?: boolean): SupabaseClient | null {
  if (!SUPABASE_ACTIVO) return null;
  const recordar = recordarSesion ?? sesionPersistida;
  // La preferencia de "recordar sesión" cambia el almacenamiento: hay que recrear el cliente.
  if (recordar !== sesionPersistida) {
    // Al cambiar de almacenamiento se cierra el cliente anterior para que no
    // siga refrescando/escribiendo la sesión en el lugar equivocado.
    try { void cliente?.auth.signOut(); } catch { /* noop */ }
    sesionPersistida = recordar;
    cliente = null;
  }
  if (!cliente) {
    try {
      cliente = createClient(URL as string, ANON as string, {
        auth: {
          // El verificador PKCE debe sobrevivir al redirect de Google aunque
          // la sesión no se persista; si no, el callback no puede canjearlo.
          storage: recordar ? localStorage : memoryStorageConPKCE(),
          persistSession: recordar,
          autoRefreshToken: true,
        },
      });
    } catch {
      // URL/clave mal configuradas: la app sigue funcionando en modo local.
      return null;
    }
  }
  return cliente;
}

// Guardado en memoria (se pierde al cerrar la pestaña) cuando el adulto apaga
// "recordar". Excepción: el verificador PKCE de OAuth se guarda en
// localStorage porque debe sobrevivir al redirect de Google; no es un token.
function memoryStorageConPKCE() {
  const cache: Record<string, string> = {};
  const esVerificador = (k: string) => k.endsWith('-code-verifier');
  return {
    getItem: (k: string) => {
      if (esVerificador(k)) {
        try { return localStorage.getItem(k); } catch { return null; }
      }
      return k in cache ? cache[k] : null;
    },
    setItem: (k: string, v: string) => {
      if (esVerificador(k)) {
        try { localStorage.setItem(k, String(v)); return; } catch { /* noop */ }
      }
      cache[k] = String(v);
    },
    removeItem: (k: string) => {
      if (esVerificador(k)) {
        try { localStorage.removeItem(k); return; } catch { /* noop */ }
      }
      delete cache[k];
    },
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
