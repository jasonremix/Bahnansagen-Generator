# -*- coding: utf-8 -*-
"""Erzeugt das deutsche Voice-Over mit Piper und legt die Zeitachse fest.

Ausgabe in build/:
  vo.wav        Sprecherspur, 44,1 kHz mono
  timeline.json Szenen, Satzanfänge und Beats (für Musik und Animation)
  timeline.js   dieselben Daten für die HTML-Szene
  untertitel.srt
"""
import json, math, os, subprocess, sys
import numpy as np
from piper import PiperVoice, SynthesisConfig

sys.path.insert(0, os.path.dirname(__file__))
from script import SCENES, BPM, FPS

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = os.path.join(ROOT, "build")
os.makedirs(BUILD, exist_ok=True)
MODEL = os.environ.get("PIPER_MODEL")
if not MODEL:
    sys.exit("PIPER_MODEL auf de_DE-thorsten-high.onnx setzen")

voice = PiperVoice.load(MODEL)
SR_IN = voice.config.sample_rate
cfg = SynthesisConfig(length_scale=0.93, noise_scale=0.6, noise_w_scale=0.75)
GAP = 0.32          # Pause zwischen Sätzen
BEAT = 60.0 / BPM
GRID = 2 * BEAT     # Szenenwechsel landen immer auf einem halben Takt


def synth(text):
    pcm = b"".join(c.audio_int16_bytes for c in voice.synthesize(text, syn_config=cfg))
    a = np.frombuffer(pcm, dtype=np.int16).astype(np.float32) / 32768.0
    # Stille an den Rändern abschneiden
    thr = 0.012
    idx = np.where(np.abs(a) > thr)[0]
    if len(idx):
        a = a[max(0, idx[0] - int(0.02 * SR_IN)): idx[-1] + int(0.06 * SR_IN)]
    return a


clips = []
t = 0.0
timeline = {"bpm": BPM, "fps": FPS, "scenes": []}
for sc in SCENES:
    start = t
    cur = start + sc["lead"]
    lines = []
    for say, text in sc["lines"]:
        a = synth(say)
        d = len(a) / SR_IN
        clips.append((cur, a))
        lines.append({"t": round(cur, 3), "d": round(d, 3), "text": text})
        cur += d + GAP
    end = cur - GAP + sc["tail"]
    dur = math.ceil((end - start) / GRID - 1e-6) * GRID
    timeline["scenes"].append({"id": sc["id"], "label": sc["label"], "t": round(start, 3),
                               "d": round(dur, 3), "lines": lines})
    t = start + dur
    print(f"{sc['id']:10s} {start:6.2f}s  +{dur:5.2f}s")

total = t
timeline["duration"] = round(total, 3)

# Sprecherspur zusammensetzen (22,05 kHz), dann sauber auf 44,1 kHz bringen
vo = np.zeros(int((total + 1) * SR_IN), dtype=np.float32)
for st, a in clips:
    i = int(st * SR_IN)
    vo[i:i + len(a)] += a
peak = np.max(np.abs(vo)) or 1
vo = vo / peak * 0.89
raw = os.path.join(BUILD, "vo_22k.wav")
import wave
with wave.open(raw, "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR_IN)
    w.writeframes((vo * 32767).astype(np.int16).tobytes())
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af", "aresample=44100:resampler=soxr",
                os.path.join(BUILD, "vo.wav")], check=True)
os.remove(raw)

with open(os.path.join(BUILD, "timeline.json"), "w") as f:
    json.dump(timeline, f, ensure_ascii=False, indent=1)
with open(os.path.join(BUILD, "timeline.js"), "w") as f:
    f.write("window.TL = " + json.dumps(timeline, ensure_ascii=False) + ";\n")


def ts(x):
    ms = int(round(x * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


n = 1
with open(os.path.join(BUILD, "untertitel.srt"), "w") as f:
    for sc in timeline["scenes"]:
        for ln in sc["lines"]:
            f.write(f"{n}\n{ts(ln['t'])} --> {ts(ln['t'] + ln['d'] + 0.15)}\n{ln['text']}\n\n")
            n += 1
print(f"Gesamtdauer {total:.2f}s")
