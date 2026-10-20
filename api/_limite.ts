// Límite sencillo por IP para las funciones serverless. En Vercel cada
// instancia tiene su propia memoria, así que es una primera barrera (no un
// contador global); evita ráfagas y abuso casual sin añadir dependencias.
type Registro = { usos: number; reinicio: number };

const limites = new Map<string, Registro>();

export function ipDe(req: any): string {
  const fwd = String(req.headers?.['x-forwarded-for'] || '');
  return fwd.split(',')[0].trim() || String(req.socket?.remoteAddress || 'anon');
}

export function permitirPeticion(req: any, maximo = 30, ventanaMs = 60_000): boolean {
  const ip = ipDe(req);
  const ahora = Date.now();
  const actual = limites.get(ip);
  if (!actual || actual.reinicio <= ahora) {
    limites.set(ip, { usos: 1, reinicio: ahora + ventanaMs });
    return true;
  }
  if (actual.usos >= maximo) return false;
  actual.usos += 1;
  // Poda barata para que el mapa no crezca sin control.
  if (limites.size > 5000) {
    for (const [k, v] of limites) {
      if (v.reinicio <= ahora) limites.delete(k);
    }
  }
  return true;
}

export function responderLimite(res: any) {
  res.setHeader('Retry-After', '60');
  res.status(429).json({ error: 'Demasiadas peticiones. Espera un momento.' });
}

export function cuerpoDemasiadoGrande(req: any, maxBytes: number): boolean {
  const largo = Number(req.headers?.['content-length'] || 0);
  return Number.isFinite(largo) && largo > maxBytes;
}
