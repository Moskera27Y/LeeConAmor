#!/usr/bin/env python3
"""Genera todos los audios necesarios para LeeConAmor usando la voz clonada de Léo."""
from TTS.api import TTS
import soundfile as sf
import os

# Configuración
OUT_DIR = r"C:\Users\user\Desktop\LeeConAmor\src\assets\audio"
REF = r"C:\Users\user\Desktop\LeeConAmor\server\voz-clon\referencia-leo.wav"

os.makedirs(OUT_DIR, exist_ok=True)

# Cargar el modelo una sola vez
print("Cargando modelo XTTS-v2...")
tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2")
tts.to("cpu")
print("Modelo cargado.")

def generar(texto: str, nombre_archivo: str):
    """Genera un archivo de audio para el texto dado."""
    ruta = os.path.join(OUT_DIR, nombre_archivo)
    if os.path.exists(ruta):
        print(f"  Saltando (ya existe): {nombre_archivo}")
        return
    tts.tts_to_file(text=texto, speaker_wav=REF, language="es", file_path=ruta)
    print(f"  OK: {nombre_archivo} -> '{texto}'")

# ============================================================
# 1. VOCES INDIVIDUALES (letras)
# ============================================================
print("\n=== VOCES INDIVIDUALES ===")

vocales = ["A", "E", "I", "O", "U"]
consonantes = ["M", "P", "S", "L", "T", "N", "R", "D", "C", "B", "F", "G", "H", "J", "K", "Ñ", "Q", "V", "W", "X", "Y", "Z"]

for v in vocales:
    generar(f"La vocal {v}", f"vocal_{v}.wav")
    # Fonética de la vocal
    fonetica_vocales = {"A": "aaa", "E": "eee", "I": "iii", "O": "ooo", "U": "uuu"}
    generar(f"Suena {fonetica_vocales[v]}", f"fonetica_{v}.wav")

for c in consonantes:
    generar(f"La letra {c}", f"letra_{c}.wav")
    # Fonética de algunas consonantes comunes
    fonetica_consonantes = {
        "M": "mmm", "P": "ppp", "S": "sss", "L": "lll", "T": "ttt",
        "N": "nnn", "R": "rrr", "D": "ddd", "C": "ce", "B": "bbb",
        "F": "eff", "G": "ge", "H": "hache", "J": "jota", "K": "ka",
        "Ñ": "eñe", "Q": "cu", "V": "uve", "W": "uve doble", "X": "equis",
        "Y": "i griega", "Z": "zeta"
    }
    if c in fonetica_consonantes:
        generar(f"Suena {fonetica_consonantes[c]}", f"fonetica_{c}.wav")

# ============================================================
# 2. SÍLABAS DIRECTAS
# ============================================================
print("\n=== SÍLABAS DIRECTAS ===")

silabas_directas = []
for c in ["M", "P", "S", "L", "T", "N", "R", "D", "C", "B", "F", "G", "H", "J", "K", "Ñ", "Q", "V", "W", "X", "Y", "Z"]:
    for v in ["A", "E", "I", "O", "U"]:
        silabas_directas.append(f"{c}{v}")

for s in silabas_directas:
    generar(f"Sílaba {s}", f"silaba_{s}.wav")

# ============================================================
# 3. PALABRAS
# ============================================================
print("\n=== PALABRAS ===")

palabras = [
    "MAMA", "PAPA", "PERA", "SOL", "LUNA", "MAR", "MARIPOSA", "ELEFANTE",
    "CANA", "CASA", "CAZA", "COCO", "COPA", "CASA", "CANO",
    "SECO", "SELVA", "SAL", "SAPO", "SAPO", "SUBE",
    "LAMA", "LECHE", "LIZA", "LUPA", "LUZ",
    "TAMA", "TATA", "TETE", "TITO", "TOTO", "TUTU",
    "NADA", "NENA", "NINO", "NONO", "NUNO",
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
    "ZAÑA", "ZEZE", "ZIZI", "ZOZO", "ZUZU",
]

for p in palabras:
    generar(f"Palabra {p}", f"palabra_{p}.wav")

# ============================================================
# 4. FRASES
# ============================================================
print("\n=== FRASES ===")

frases = [
    # Saludos
    ("¡Hola, {nombre}! Vamos a leer juntitos.", "saludo_generico"),
    ("¡Hola, {nombre}! ¿Estás listo para leer?", "saludo_listo"),
    # Felicitaciones
    ("¡Muy bien, {nombre}! Dijiste {objetivo} clarito.", "felicitacion"),
    ("¡Genial, {nombre}! Lo hiciste muy bien.", "genial"),
    ("¡Súper, {nombre}! Te quedó excelente.", "super"),
    ("¡Excelente, {nombre}! Lo lograste.", "excelente"),
    ("¡Hermoso, {nombre}! Estás aprendiendo mucho.", "hermoso"),
    # Correcciones
    ("Casi, {nombre}, vamos juntitos, despacio: {pista}.", "casi"),
    ("No te oí bien, {nombre}. Acércate al micrófono.", "no_escuche"),
    ("¡Buen intento, {nombre}! Una vez más.", "buen_intento"),
    ("¡Buen esfuerzo, {nombre}! Vamos juntitos despacio.", "buen_esfuerzo"),
    # Animar
    ("Tú puedes, {nombre}. Escucha otra vez e inténtalo.", "animar"),
    ("¡Vamos, {nombre}! Tú puedes hacerlo.", "vamos_puedes"),
    # Instrucciones
    ("Escucha con atención.", "escucha_atencion"),
    ("Ahora tú. Léelo en voz alta.", "ahora_tu"),
    ("Repite conmigo.", "repite_conmigo"),
    ("Toca la letra {letra}.", "toca_letra"),
    ("Busca la letra {letra}.", "busca_letra"),
]

for texto, nombre_archivo in frases:
    # Generar con placeholder "{nombre}" y "{objetivo}" y "{pista}" y "{letra}"
    # Como el clon no sabe los nombres, generamos con ejemplo
    texto_ejemplo = texto.replace("{nombre}", "Ana").replace("{objetivo}", "MAMA").replace("{pista}", "ma-ma").replace("{letra}", "M")
    generar(texto_ejemplo, f"frase_{nombre_archivo}.wav")

print("\n¡Todos los audios generados!")
print(f"Total archivos: {len(os.listdir(OUT_DIR))}")
