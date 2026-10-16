"""Voz clonada de Léo (XTTS-v2, español) para Hugging Face Spaces (Docker).

El modelo se precarga al arrancar para que /clonar responda sin espera fría.
Referencia: referencia-leo.wav (voz Callirrhoe generada para LeeConAmor).
"""
import io
import os
import re
import wave
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import JSONResponse
import soundfile as sf

REF = os.path.join(os.path.dirname(__file__), "referencia-leo.wav")

_LIMPIO = re.compile(r"[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ0-9¿?¡!.,;:'\"()\- ]+")


def limpiar(texto: str) -> str:
    texto = _LIMPIO.sub("", texto)
    return re.sub(r"\s+", " ", texto).strip()


_tts = None


def get_tts():
    global _tts
    if _tts is None:
        from TTS.api import TTS

        _tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2")
        _tts.to("cpu")
    return _tts


@asynccontextmanager
async def vida(app: FastAPI):
    # Precarga: descarga el modelo (~2GB) en el primer despliegue
    get_tts()
    yield


app = FastAPI(lifespan=vida)


@app.get("/salud")
def salud():
    return {"ok": True, "referencia": os.path.exists(REF), "modelo": _tts is not None}


@app.post("/clonar")
def clonar(datos: dict):
    import base64
    import tempfile

    import numpy as np

    texto = limpiar(str(datos.get("texto", ""))[:160])
    if not texto:
        return JSONResponse({"error": "Texto vacío tras limpiar"}, status_code=400)
    if not os.path.exists(REF):
        return JSONResponse({"error": "Falta referencia-leo.wav"}, status_code=501)
    tts = get_tts()
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        ruta = tmp.name
    try:
        tts.tts_to_file(text=texto, speaker_wav=REF, language="es", file_path=ruta)
        data, sr = sf.read(ruta)
        buf = io.BytesIO()
        with wave.open(buf, "wb") as w:
            w.setnchannels(1 if len(data.shape) == 1 else data.shape[1])
            w.setsampwidth(2)
            w.setframerate(sr)
            w.writeframes((np.clip(data, -1, 1) * 32767).astype("<i2").tobytes())
        return {"audio": base64.b64encode(buf.getvalue()).decode(), "mime": "audio/wav", "voz": "Callirrhoe", "clon": True}
    finally:
        try:
            os.unlink(ruta)
        except OSError:
            pass
