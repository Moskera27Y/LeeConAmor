// Prueba de conexión Supabase (no imprime secretos, solo estados).
require('dotenv').config({ path: '.env.local' });
const URL = process.env.VITE_SUPABASE_URL;
const ANON = process.env.VITE_SUPABASE_ANON_KEY;

async function main() {
  if (!URL || !ANON) {
    console.log('FALTA: VITE_SUPABASE_URL o ANON_KEY');
    process.exit(1);
  }
  const H = { apikey: ANON, Authorization: `Bearer ${ANON}` };
  // 1. Tablas (PostgREST): 200 = existen (RLS puede dar []), 404 = falta schema
  const cols = { padres: 'id', hijos: 'id', progreso: 'hijo_id', sesiones: 'id' };
  for (const t of ['padres', 'hijos', 'progreso', 'sesiones']) {
    try {
      const r = await fetch(`${URL}/rest/v1/${t}?select=${cols[t]}&limit=1`, { headers: H });
      console.log(`tabla ${t}: HTTP ${r.status} ${r.status === 200 ? 'OK' : r.status === 404 ? '(falta schema)' : ''}`);
    } catch (e) {
      console.log(`tabla ${t}: SIN RED (${e.message})`);
    }
  }
  // 2. Auth Email: login falso debe dar 400 (proveedor ON) y no otro error
  try {
    const r = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { ...H, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nadie@ejemplo.com', password: 'clavefalsa123' }),
    });
    const j = await r.json().catch(() => ({}));
    console.log(`auth email: HTTP ${r.status} (${j.error_description || j.msg || j.error || 'ok?'})`);
  } catch (e) {
    console.log(`auth email: SIN RED (${e.message})`);
  }
}
main();
