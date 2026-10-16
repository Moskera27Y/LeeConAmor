import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const SUPABASE_ACTIVO = Boolean(URL && ANON);

let cliente: SupabaseClient | null = null;

export function supabase(): SupabaseClient | null {
  if (!SUPABASE_ACTIVO) return null;
  if (!cliente) cliente = createClient(URL as string, ANON as string);
  return cliente;
}
