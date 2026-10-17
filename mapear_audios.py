#!/usr/bin/env python3
"""Mapea frases a archivos de audio existentes y genera los que faltan."""
import hashlib
import os
import json

OUT_DIR = r"C:\Users\user\Desktop\LeeConAmor\public\audio"
MAPA_PATH = r"C:\Users\user\Desktop\LeeConAmor\src\data\audioFijo.ts"

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
    # Verificar archivos existentes en public/audio/
    archivos_existentes = set()
    if os.path.exists(OUT_DIR):
        for f in os.listdir(OUT_DIR):
            if f.endswith('.wav'):
                archivos_existentes.add(f)
    
    print(f"Archivos existentes en public/audio/: {len(archivos_existentes)}")
    
    mapa = {}
    frases_sin_audio = []
    
    for texto in FRASES_FIJAS:
        nombre = 'f' + hashlib.sha1(texto.encode('utf-8')).hexdigest()[:12] + '.wav'
        if nombre in archivos_existentes:
            mapa[texto] = f"/audio/{nombre}"
        else:
            frases_sin_audio.append(texto)
    
    print(f"\nFrases con audio: {len(mapa)}")
    print(f"Frases sin audio: {len(frases_sin_audio)}")
    
    # Escribir audioFijo.ts
    contenido = "// Generado automáticamente por generar_audios_v3.py. No editar a mano.\nexport const AUDIO_FIJO: Record<string, string> = " + json.dumps(mapa, indent=2, ensure_ascii=False) + ";\n"
    
    with open(MAPA_PATH, 'w', encoding='utf-8') as f:
        f.write(contenido)
    
    print(f"\nArchivo audioFijo.ts actualizado con {len(mapa)} entradas.")
    
    if frases_sin_audio:
        print(f"\nFrases que aún necesitan audio ({len(frases_sin_audio)}):")
        for f in frases_sin_audio:
            print(f"  - {f}")
    else:
        print("\n¡Todas las frases tienen audio!")

if __name__ == '__main__':
    main()
