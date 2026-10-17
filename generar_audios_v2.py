#!/usr/bin/env python3
"""Genera todos los audios necesarios para LeeConAmor usando la voz clonada de Léo."""
import requests
import hashlib
import os
import json
import time

OUT_DIR = r"C:\Users\user\Desktop\LeeConAmor\public\audio"
CLON_URL = "http://localhost:7860/clonar"

os.makedirs(OUT_DIR, exist_ok=True)

# Todas las frases que necesitamos audio
FRASES = []

# Vocales
for v in ["A", "E", "I", "O", "U"]:
    FRASES.append(f"La vocal {v}")
    FRASES.append(f"{v}. { {'A':'aaa', 'E':'eee', 'I':'iii', 'O':'ooo', 'U':'uuu'}[v] } como ejemplo. Repite conmigo.")

# Consonantes
consonantes = {
    "M": "mmm como mamá", "P": "ppp como papá", "S": "sss como serpiente", "L": "lll como luna",
    "T": "ttt como tambor", "N": "nnn como nube", "R": "rrr suave como rueda", "D": "ddd como dado",
    "C": "ce", "B": "bbb", "F": "eff", "G": "ge", "H": "hache", "J": "jota", "K": "ka",
    "Ñ": "eñe", "Q": "cu", "V": "uve", "W": "uve doble", "X": "equis", "Y": "i griega", "Z": "zeta"
}
for c, fon in consonantes.items():
    FRASES.append(f"La letra {c}")
    FRASES.append(f"Suena {fon}")

# Sílabas directas
silabas_directas = ["MA", "PA", "SA", "LA", "TA", "NA", "RA", "DA", "CA", "BA", "FA", "GA", "HA", "JA", "KA", "ÑA", "QA", "VA", "WA", "XA", "YA", "ZA",
                    "ME", "PE", "SE", "LE", "TE", "NE", "RE", "DE", "CE", "BE", "FE", "GE", "HE", "JE", "KE", "ÑE", "QE", "VE", "WE", "XE", "YE", "ZE",
                    "MI", "PI", "SI", "LI", "TI", "NI", "RI", "DI", "CI", "BI", "FI", "GI", "HI", "JI", "KI", "ÑI", "QI", "VI", "WI", "XI", "YI", "ZI",
                    "MO", "PO", "SO", "LO", "TO", "NO", "RO", "DO", "CO", "BO", "FO", "GO", "HO", "JO", "KO", "ÑO", "QO", "VO", "WO", "XO", "YO", "ZO",
                    "MU", "PU", "SU", "LU", "TU", "NU", "RU", "DU", "CU", "BU", "FU", "GU", "HU", "JU", "KU", "ÑU", "QU", "VU", "WU", "XU", "YU", "ZU"]

for s in silabas_directas:
    FRASES.append(f"Sílaba {s}")
    FRASES.append(f"{s}. {s.lower()}. Repite conmigo.")

# Palabras
palabras = ["MAMA", "PAPA", "PERA", "SOL", "LUNA", "MAR", "MARIPOSA", "ELEFANTE", "CANA", "CASA",
            "SECO", "SELVA", "SAPO", "SUBE", "LAMA", "LECHE", "LIZA", "LUPA", "LUZ",
            "TAMA", "TATA", "TETE", "TITO", "TOTO", "TUTU",
            "NADA", "NENA", "NIÑO", "NONO", "NUNO",
            "RADA", "RENE", "RINO", "RONO", "RUNO",
            "DADA", "DEDE", "DIDO", "DODO", "DUDU",
            "CACA", "CECE", "CICI", "COCO", "CUCU",
            "BABA", "BEBA", "BIBI", "BOBO", "BUBU",
            "FAFA", "FEFO", "FIFI", "FOFO", "FUFU",
            "GAGA", "GELE", "GIGI", "GOGO", "GUGU",
            "HAHA", "HEHE", "HIHI", "HOHO", "HUHU",
            "JAJA", "JEJE", "JIJI", "JOJO", "JUJU",
            "KAKA", "KEKE", "KIKI", "KOKO", "KUKU",
            "ÑAÑA", "ÑEÑE", "ÑIÑI", "ÑOÑO", "ÑUÑU",
            "QAQA", "QEQUE", "QIQI", "QOQO", "QUQU",
            "VAVA", "VEVE", "VI VI", "VOVO", "VUVU",
            "WAWA", "WEWE", "WIWI", "WOCO", "WUWU",
            "XAXA", "XEXE", "XIXI", "XOXO", "XUXU",
            "YAYA", "YEYE", "YIYI", "YOYO", "YUYU",
            "ZAÑA", "ZEZE", "ZIZI", "ZOZO", "ZUZU"]

for p in palabras:
    FRASES.append(f"Palabra {p}")
    FRASES.append(f"{p}. {p.lower()}. Repite conmigo.")

# Frases generales
frases_generales = [
    "Hola, soy Léo. Vamos a leer juntitos.",
    "Hola peque. Escucha a Léo y toca la vocal que escuches. Empezamos con A, E y O.",
    "Vamos a escuchar sonidos: mmm como mamá y sss como serpiente. Toca la letra del sonido.",
    "Juntamos sonidos: mmm con aaa forman MA. Busca M y A para formar MA.",
    "Junta las letras para formar MA, PA y LA. Escucha: mmm-aaa dice MA.",
    "Forma palabras que puedes leer: MAMA, PAPA y PERA. Escucha despacio: pe-eee-ra.",
    "Lee la oración completita y luego dime qué entendiste. Escucha primero a Léo.",
    "¡Escuchaste muy bien las vocales!",
    "¡Qué oído tan lindo!",
    "¡Formaste tu primera sílaba!",
    "¡Armaste sílabas muy bien!",
    "¡Leíste palabras de verdad!",
    "¡Lees oraciones enteras!",
    "¡Muy bien!",
    "¡Genial!",
    "¡Súper! 🌟",
    "¡Hermoso! 💛",
    "¡Casi! Prueba otra vez con amor ❤️",
    "Te escucho. Lee en voz alta.",
    "¡Qué lindo leíste! 🌟",
    "No te oí bien. Probemos otra vez con amor.",
    "¡Buen esfuerzo! Vamos juntitos despacio.",
    "¡Buen intento! Una vez más.",
    "¡Felicidades! Terminaste todo. Ahora lees por tu cuenta. 🎉",
    "¡Nivel completado!",
    "¡Increíble! Subiste de etapa. Vamos por más. 🎉",
    "¡Felicidades! Ya sabes las vocales y el abecedario. Eres un gran lector. 🎓",
    "A. aaa como manzana. Repite conmigo.",
    "E. eee como elefante. Repite conmigo.",
    "O. ooo como oso. Repite conmigo.",
    "MA. mmm con aaa, MA. Repite conmigo.",
    "MAMA. ma-ma, despacio ma-ma. Repite conmigo.",
    "PAPA. pa-pa, despacio pa-pa. Repite conmigo.",
    "PERA. pe-ra, despacio pe-ra. Repite conmigo.",
    "SOL. sol, sss-ooo-lll. Repite conmigo.",
]

for f in frases_generales:
    FRASES.append(f)

# Generar audios
mapa = {}
hechos = 0
total = len(FRASES)

for i, texto in enumerate(FRASES):
    nombre = 'f' + hashlib.sha1(texto.encode()).hexdigest()[:12] + '.wav'
    ruta = os.path.join(OUT_DIR, nombre)
    
    if os.path.exists(ruta):
        mapa[texto] = f"/audio/{nombre}"
        continue
    
    try:
        r = requests.post(CLON_URL, json={"texto": texto, "voz": "Callirrhoe"}, timeout=120)
        if r.ok:
            data = r.json()
            if data.get("audio"):
                with open(ruta, "wb") as f:
                    f.write(bytes.fromhex(data["audio"].replace(" ", "")) if len(data["audio"]) % 2 == 0 else bytes.fromhex(data["audio"].replace(" ", "").replace("\n", "")))
                mapa[texto] = f"/audio/{nombre}"
                hechos += 1
                print(f"OK ({hechos}/{total}): {texto[:50]}...")
            else:
                print(f"ERROR: {texto[:50]} - no hay audio en respuesta")
        else:
            print(f"ERROR HTTP {r.status_code}: {texto[:50]}")
    except Exception as e:
        print(f"EXCEPCIÓN: {texto[:50]} - {e}")
    
    # Pausa para no saturar el servidor
    time.sleep(2)

# Escribir el mapa
contenido = "// Generado automáticamente por generar_audios_v2.py. No editar a mano.\nexport const AUDIO_FIJO: Record<string, string> = " + json.dumps(mapa, indent=2, ensure_ascii=False) + ";\n"

with open("C:\\Users\\user\\Desktop\\LeeConAmor\\src\\data\\audioFijo.ts", "w", encoding="utf-8") as f:
    f.write(contenido)

print(f"\n=== RESUMEN ===")
print(f"Total frases: {total}")
print(f"Audios generados: {len(mapa)}")
print(f"Archivo audioFijo.ts actualizado con {len(mapa)} entradas")
