---
title: Voz Clone Leo
emoji: 🦉
colorFrom: purple
colorTo: pink
sdk: docker
app_port: 7860
pinned: false
---

# Voz clonada de Léo 🦉

Servicio de voz para **LeeConAmor**: clona la voz Callirrhoe (XTTS-v2, español) para leer cuentos y mensajes a los niños.

- `GET /salud` → estado del servicio
- `POST /clonar` con `{"texto": "..."}` → `{"audio": "<wav base64>", "mime": "audio/wav"}`
