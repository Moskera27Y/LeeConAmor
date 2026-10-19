"""Servicio local: clona la voz de Léo (XTTS-v2, español) desde la referencia.
Uso: ..\voz-clon\venv\Scripts\python clonar.py   (o iniciar-voz-clon.bat)
La referencia se recorta a 12s (referencia-leo-corta.wav): XTTS clona igual de
bien y corre bastante mas rápido que con los 50s completos.
"""
import io
import os
import re
import wave

from fastapi import FastAPI
from fastapi.responses import JSONResponse
import soundfile as sf

REF = os.path.join(os.path.dirname(__file__), "referencia-leo-corta.wav")
REF_LARGA = os.path.join(os.path.dirname(__file__), "referencia-leo.wav")

# El clon solo habla: fuera emojis y símbolos que tumban al modelo.
_LIMPIO = re.compile(r"[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ0-9¿?¡!.,;:'\"()\- ]+")


def limpiar(texto: str) -> str:
    texto = _LIMPIO.sub("", texto)
    return re.sub(r"\s+", " ", texto).strip()

app = FastAPI()
_tts = None


def get_tts():
    global _tts
    if _tts is None:
        from TTS.api import TTS

        device = "cpu"
        try:
            import torch

            if torch.cuda.is_available():
                device = "cuda"
        except Exception:
            pass
        _tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2")
        _tts.to(device)
    return _tts


@app.get("/salud")
def salud():
    return {"ok": True, "referencia": os.path.exists(REF), "ref": os.path.basename(REF)}


@app.post("/clonar")
def clonar(datos: dict):
    import base64
    import tempfile

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
            import numpy as np

            w.writeframes((np.clip(data, -1, 1) * 32767).astype("<i2").tobytes())
        return {"audio": base64.b64encode(buf.getvalue()).decode(), "mime": "audio/wav", "voz": "Callirrhoe", "clon": True}
    finally:
        try:
            os.unlink(ruta)
        except OSError:
            pass


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=7860)
