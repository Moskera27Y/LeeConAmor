#!/usr/bin/env python3
"""Genera audios faltantes usando el clon de voz en localhost:7860."""
import requests
import hashlib
import os
import base64
import json
import time

OUT_DIR = r"C:\Users\user\Desktop\LeeConAmor\public\audio"
CLON_URL = "http://localhost:7860/clonar"

os.makedirs(OUT_DIR, exist_ok=True)

# Todas las frases que necesitamos audio
FRASES_FIJAS = [
    'Hola, soy Léo. Vamos a leer juntitos con amor.',
    'Hola peque. Escucha a Léo y toca la vocal que escuches. Empezamos con A, E y O.',
    'Vamos a escuchar sonidos: mmm como mamá y sss como serpiente. Toca la letra del sonido.',
    'Juntamos sonidos: mmm con aaa forman MA. Busca M y A para formar MA.',
    'Junta las letras para formar MA, PA y LA. Escucha: mmm-aaa dice MA.',
    'Forma palabras que puedes leer: MAMA, PAPA y PERA. Escucha despacio: pe-eee-ra.',
    'Lee la oración completita y luego dime qué entendiste. Escucha primero a Léo.',
    '¡Escuchaste muy bien las vocales!',
    '¡Qué oído tan lindo!',
    '¡Formaste tu primera sílaba!',
    '¡Armaste sílabas muy bien!',
    '¡Leíste palabras de verdad!',
    '¡Lees oraciones enteras!',
    '¡Muy bien! 🎉',
    '¡Genial! ⭐',
    '¡Súper! 🌈',
    '¡Hermoso! 💛',
    'aaa como manzana',
    'eee como elefante',
    'ooo como oso',
    'mmm con aaa, MA',
    'ma-ma, despacio ma-ma',
    'pa-pa, despacio pa-pa',
    'pe-ra, despacio pe-ra',
    'sol, sss-ooo-lll',
    '¡Casi! Prueba otra vez con amor ❤️',
    'Te escucho. Lee en voz alta.',
    '¡Qué lindo leíste! 🌟',
    'No te oí bien. Probemos otra vez con amor.',
    '¡Buen esfuerzo! Vamos juntitos despacio.',
    '¡Buen intento! Una vez más.',
    '¡Felicidades! Terminaste todo. Ahora lees por tu cuenta. 🎉',
    '¡Nivel completado!',
    '¡Increíble! Subiste de etapa. Vamos por más. 🎉',
    '¡Felicidades! Ya sabes las vocales y el abecedario. Eres un gran lector. 🎓',
    'A. aaa como manzana. Repite conmigo.',
    'E. eee como elefante. Repite conmigo.',
    'O. ooo como oso. Repite conmigo.',
]

def sha1_short(texto: str) -> str:
    return hashlib.sha1(texto.encode('utf-8')).hexdigest()[:12]

def main():
    # Verificar archivos existentes
    existentes = set()
    if os.path.exists(OUT_DIR):
        for f in os.listdir(OUT_DIR):
            if f.endswith('.wav'):
                existentes.add(f)
    
    print(f"Archivos existentes en public/audio/: {len(existentes)}")
    
    mapa = {}
    hechos = 0
    
    for texto in FRASES_FIJAS:
        nombre = f"f{sha1_short(texto)}.wav"
        ruta = os.path.join(OUT_DIR, nombre)
        
        if nombre in existentes:
            mapa[texto] = f"/audio/{nombre}"
            continue
        
        for intento in range(3):
            try:
                r = requests.post(CLON_URL, json={'texto': texto, 'voz': 'Callirrhoe'}, timeout=120)
                if r.ok:
                    data = r.json()
                    if data.get('audio'):
                        audio_bytes = base64.b64decode(data['audio'])
                        with open(ruta, 'wb') as f:
                            f.write(audio_bytes)
                        mapa[texto] = f"/audio/{nombre}"
                        hechos += 1
                        print(f"OK ({hechos}): {texto[:50]}...")
                        break
                    else:
                        print(f"  Sin audio en respuesta: {texto[:40]}")
                else:
                    print(f"  HTTP {r.status_code}: {texto[:40]}")
            except Exception as e:
                print(f"  Error: {texto[:40]} - {e}")
            
            time.sleep(2)  # Pausa entre intentos
    
    # Escribir audioFijo.ts
    contenido = "// Generado automáticamente. No editar a mano.\nexport const AUDIO_FIJO: Record<string, string> = " + json.dumps(mapa, indent=2, ensure_ascii=False) + ";\n"
    with open(r"C:\Users\user\Desktop\LeeConAmor\src\data\audioFijo.ts", "w", encoding="utf-8") as f:
        f.write(contenido)
    
    print(f"\n=== RESUMEN ===")
    print(f"Total frases: {len(FRASES_FIJAS)}")
    print(f"Audios generados en esta sesión: {hechos}")
    print(f"Total en mapa: {len(mapa)}")

if __name__ == '__main__':
    main()
