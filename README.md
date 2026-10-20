# LeeConAmor 📚

Web app para que peques de 3 a 8 años aprendan a leer con juegos guiados, voz
suave y un recorrido adaptado a su nivel. Hecha con Vite + React + TypeScript.

## Qué incluye

- **Recorrido guiado** por lecciones (vocales → sílabas → palabras → oraciones)
  con actividades cortas y bloqueo hasta acertar.
- **Evaluación inicial** con preguntas cerradas; si hay IA disponible se usa
  OpenRouter y, si falla, se calcula el nivel en local.
- **Juegos libres**: escucha y elige, sílabas trabadas, palabras desordenadas,
  trazo de letras, memoria auditiva y abecedario.
- **Lectura en voz alta** con micrófono y transcripción (o fallback del
  navegador) y **cuentos** palabra a palabra.
- **Progreso por peque**: puntaje, motor adaptativo, insignias, racha y mapa de
  dominio. Cada niño tiene sus propias claves locales.
- **Cuentas opcionales**: con Supabase se sincroniza entre dispositivos; sin
  cuenta se juega en modo local y se puede crear la cuenta más tarde.
- **PWA instalable** (manifest, iconos y metadatos sociales).

## Voz de Léo

Cadena de resolución en el cliente:

1. `public/audio` — audios pregenerados con el clon (instantáneos y gratis).
2. `/api/voz` — llama al clon configurado en `CLON_URL`.
3. Voz nativa del navegador — solo como último recurso.

Los textos hablados están en `src/data/frasesVoz.ts`; su espejo para el
generador es `server/frases-juego.cjs`. **No agregues variables libres** a las
frases: todas deben poder pregenerarse.

## Desarrollo

```bash
npm install
npm run dev        # web en http://localhost:5173
npm run api:dev    # API local de transcripción (otra terminal)
npm run todo       # las dos cosas a la vez
```

## Verificación

```bash
npm run typecheck  # TypeScript
npm test           # trazo + voz + tests unitarios
npm run build      # build de producción
npm run verify     # typecheck + build
```

- `npm run test:trazo`: validador de trazos.
- `npm run test:voz`: paridad de frases, listas y cobertura de audio.
- `npm run test:unit`: Vitest (`src/**/*.test.ts`).

## Variables de entorno

Copia `.env.example` a `.env.local` para desarrollo. En Vercel se configuran en
**Settings → Environment Variables**.

| Variable | Uso |
| --- | --- |
| `CLON_URL` | URL del Space/servidor del clon de voz. |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Cuentas y sincronización opcional. |
| `OPENROUTER_API_KEY` | Evaluación inicial con IA (opcional). |
| `WHISPER_API_KEY` / `OPENAI_API_KEY` | Transcripción de lectura (opcional). |
| `WHISPER_PROVIDER` | `auto`, `openai` o el proveedor preferido. |
| `DEPLOY_URL` | Solo para abrir la app publicada desde el `.bat`. |

### Supabase

1. Crea un proyecto gratis y activa Email/Google en Authentication.
2. Ejecuta `supabase/schema.sql` en el SQL Editor. Si ya lo habías ejecutado
   antes, vuelve a pegarlo: añade de forma idempotente las columnas de
   gamificación y adaptabilidad que ahora viajan en la sincronización.
3. Configura las dos variables `VITE_SUPABASE_*` y redeploy.

Sin Supabase la app funciona igual: la pantalla de acceso permite **jugar sin
cuenta** y todo queda en el dispositivo.

## Estructura

```
api/                 funciones serverless (voz, transcripción, recomendación)
public/              audios fijos, manifest, iconos, robots
server/              generador/precache de voz y tests de Node
src/components/      pantallas y juegos
src/data/            currículo, lecciones, frases, motor y progreso
src/hooks/           voz, lectura y evaluación
src/lib/             Supabase, sync, gamificación, adaptabilidad, trazo
supabase/schema.sql  tablas y políticas
```

## Notas de seguridad

- Ninguna API key se expone al frontend: las funciones de `api/` son proxys.
- Las funciones tienen límite de peticiones por IP y topes de tamaño.
- El audio de lectura no se guarda; se transcribe y se borra el archivo temporal.
- Si una clave se compartió en un chat, rótala en el panel del proveedor.
