# LeeConAmor - Web App de Enseñanza de Lectura ✅

## 🔊 Voz clonada de Léo en la nube (para que funcione siempre en Vercel)

El clon local (`server/voz-clon/`) no cabe en Vercel. Para que la voz clonada
funcione en la página publicada:

1. Crea un **Space** gratis en https://huggingface.co/spaces → New Space →
   SDK **Docker** → sube TODO el contenido de la carpeta `voz-clon-space/`
   (`Dockerfile`, `app.py`, `requirements.txt`, `README.md`, `referencia-leo.wav`).
2. Espera a que el Space diga **Running** (la primera vez descarga el modelo ~2GB).
3. Copia la URL del Space, ej: `https://tu-usuario-voz-leo.hf.space`.
4. En **Vercel → tu proyecto → Settings → Environment Variables** agrega:
   `CLON_URL=https://tu-usuario-voz-leo.hf.space` → Redeploy.
5. (Local) también puedes poner `CLON_URL` en tu `.env.local`.

Cadena de voz resultante: audios fijos → clon en la nube → Gemini → voz nativa.
Además los saludos (`¡Hola, {nombre}!`) de 40 nombres comunes ya vienen
precacheados: `npm run voz:nombres` (requiere backend + clon prendidos).

## 📚 Proyecto Creado

**Ubicación**: `C:/Users/user/Desktop/LeeConAmor/`

---

## 🎯 Funcionalidad por Nivel

### **Nivel 1: Principiante**
- **Objetivo**: Reconocimiento básico de letras
- **Letras clave**: A, E
- **Instrucción**: "¡Haz clic en las letras correctas! Busca A y E para formar palabras simples"
- **Recompensa**: "¡Has reconocido las vocales principales!"

### **Nivel 2: Intermedio**
- **Objetivo**: Formar palabras sencillas
- **Letras clave**: A, E, L, O
- **Instrucción**: "¡Encuentra las letras para formar palabras! Busca A, E, L y O"
- **Recompensa**: "¡Formaste palabras cortas!"

### **Nivel 3: Avanzado**
- **Objetivo**: Palabras comunes para leer
- **Letras clave**: P, E, R, A
- **Instrucción**: "¡Forma palabras que podrías leer! Busca P, E, R y A"
- **Recompensa**: "¡Excelente! Has formado una palabra común!"

---

## ✅ Verificado

### **Estructura del Proyecto**
```
LeeConAmor/
├── index.html           # HTML principal
├── package.json         # Dependencias
├── vite.config.ts       # Configuración Vite
├── src/
│   ├── App.tsx          # Componente principal con juego
│   ├── App.css          # Estilos completos responsive
│   ├── main.tsx         # Entrada de la app
│   └── assets/
│       └── favicon.svg  # Logo del juego
```

### **Características Implementadas**
- ✅ Animaciones con CSS (bounceIn, fadein, slideIn)
- ✅ Confeti al acertar letras
- ✅ Feedback visual por letra seleccionada
- ✅ Sistema de puntuación
- ✅ Niveles con objetivos específicos
- ✅ Barra de progreso animada
- ✅ Responsive design (1 columna móvil)
- ✅ Botones táctiles grandes
- ✅ Accesibilidad (focus-visible)

### **Build de Producción**
```
✓ 32 modules transformed.
✓ built in 796ms
```

### **Tamaño del Bundle**
- JS: 147.40 KB (47.87 KB gzip)
- CSS: 6.13 KB (1.79 KB gzip)

---

## 🚀 Servidor de Desarrollo

**Puerto**: 5173
**URL**: http://localhost:5173

Para iniciar:
```bash
cd C:/Users/user/Desktop/LeeConAmor
npm run dev
```

Para deploy a Vercel:
```bash
npm install -g vercel
vercel
```

---

## 🎨 Diseño

- **Paleta**: Gradient azul púrpura (#667eea → #764ba2)
- **Tipografía**: Sistema (system fonts)
- **Animaciones**: CSS nativas, confeti canvas
- **Mobile-first**: Responsive con media queries

---

## ✅ TODO

- [x] Estructura base del proyecto
- [x] Componente principal con juego
- [x] Niveles con instrucciones claras
- [x] Estilos CSS completos
- [x] Build de producción exitoso
- [x] Servidor de desarrollo funcionando
- [ ] Deploy en Vercel (pendiente)