# -*- coding: utf-8 -*-
"""Synthetischer Hardtechno-Soundtrack (150 BPM) plus Endmischung mit dem Voice-Over.

Alles wird hier erzeugt, es gibt keine fremden Samples. Liest build/timeline.json,
schreibt build/mix.wav und ergänzt die Kick-Zeiten in timeline.json/.js,
damit die Glow-Effekte im Video auf den Beat pulsieren.
"""
import json, os, wave
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = os.path.join(ROOT, "build")
SR = 44100
rng = np.random.default_rng(7)

TL = json.load(open(os.path.join(BUILD, "timeline.json")))
BPM = TL["bpm"]; BEAT = 60 / BPM; S16 = BEAT / 4; BAR = BEAT * 4
DUR = TL["duration"] + 3.0
N = int(DUR * SR)
scenes = {s["id"]: s for s in TL["scenes"]}


def lp(x, f, o=2): return sosfilt(butter(o, f, "low", fs=SR, output="sos"), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, "high", fs=SR, output="sos"), x)
def bp(x, a, b, o=2): return sosfilt(butter(o, [a, b], "band", fs=SR, output="sos"), x)
def tt(d): return np.arange(int(d * SR)) / SR


def add(buf, x, t, g=1.0):
    i = int(round(t * SR))
    if i >= len(buf): return
    x = x[: len(buf) - i]
    buf[i:i + len(x)] += g * x


# ---------- Klänge ----------
def kick():
    t = tt(0.42)
    f = 46 + 190 * np.exp(-t * 32)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * 6.5)
    click = hp(rng.standard_normal(len(t)), 2500) * np.exp(-t * 400) * 0.6
    return np.tanh(3.2 * (body + click)) * 0.95


def rumble():
    t = tt(S16 * 0.98)
    ph = 2 * np.pi * (44 + 30 * np.exp(-t * 40)) * t
    x = np.tanh(4 * np.sin(ph)) * np.exp(-t * 9) * np.minimum(1, t * 400)
    return lp(x, 170, 4)


def hat(decay, f=7000):
    t = tt(decay * 5)
    return hp(rng.standard_normal(len(t)), f, 4) * np.exp(-t / decay)


def clap():
    t = tt(0.35)
    env = np.zeros_like(t)
    for o in (0, 0.011, 0.022):
        env += (t >= o) * np.exp(-np.maximum(t - o, 0) * (90 if o < 0.02 else 14))
    return bp(rng.standard_normal(len(t)), 900, 3200) * env * 0.8


def saw(f, t):
    return 2 * ((f * t) % 1.0) - 1


def stab(notes, d=0.22, cut=2400):
    t = tt(d)
    x = sum(saw(f * k, t) for f in notes for k in (0.995, 1.0, 1.006))
    x = bp(x, 300, cut, 2) * np.exp(-t * 11) * np.minimum(1, t * 300)
    return np.tanh(1.8 * x / len(notes)) * 0.5


def impact():
    t = tt(2.2)
    sub = np.sin(2 * np.pi * np.cumsum(28 + 50 * np.exp(-t * 6)) / SR) * np.exp(-t * 2.2)
    crash = hp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 2.6) * 0.35
    return np.tanh(1.5 * sub) * 0.9 + crash


def riser(d):
    t = tt(d)
    p = t / d
    noise = rng.standard_normal(len(t))
    # Rauschen, dessen Band nach oben wandert (blockweise gefiltert)
    out = np.zeros_like(t)
    blk = 2048
    for i in range(0, len(t), blk):
        c = 400 + 9000 * (i / len(t)) ** 2
        out[i:i + blk] = bp(noise[i:i + blk], c * 0.6, min(c * 1.6, 20000), 1)
    tone = np.sin(2 * np.pi * np.cumsum(200 + 900 * p ** 2) / SR) * 0.15
    return (out * 0.5 + tone) * p ** 2.2


def reverb(x, secs=2.2, mix=0.25):
    t = tt(secs)
    ir = rng.standard_normal(len(t)) * np.exp(-t * 6.9 / secs)
    ir = lp(ir, 6000) / np.sqrt(np.sum(ir ** 2))
    wet = fftconvolve(x, ir)[: len(x)]
    return x * (1 - mix) + wet * mix * 0.6


# ---------- Arrangement ----------
drums = np.zeros(N); bass = np.zeros(N); tops = np.zeros(N); syn = np.zeros(N); fx = np.zeros(N)
K, R, CH, OH, CL = kick(), rumble(), hat(0.018), hat(0.07, 6000), clap()

drop = BAR                       # 1,6 s: Logo-Einschlag
pre = scenes["preview"]          # Breakdown ohne Kick
breakdown = (pre["t"], pre["t"] + pre["d"])
end_kick = scenes["cta"]["t"] + scenes["cta"]["d"] - 3.2

A, C, E, G, F = 220.0, 261.63, 329.63, 392.0, 174.61
chords = [(A, C, E), (A, C, E), (F, A, C), (G, C * 1, E)]
kicks = []
nbeats = int(end_kick / BEAT)
for b in range(nbeats):
    t0 = b * BEAT
    in_break = breakdown[0] <= t0 < breakdown[1]
    if t0 < drop: continue
    if not in_break:
        add(drums, K, t0)
        kicks.append(round(t0, 3))
        for k, g in ((1, 0.55), (2, 0.42), (3, 0.3)):
            add(bass, R, t0 + k * S16, g)
        if b % 2 == 1: add(drums, CL, t0, 0.5)
    for k in range(4):
        add(tops, CH, t0 + k * S16, 0.11 if k != 2 else 0.18)
    add(tops, OH, t0 + 2 * S16, 0.2 if not in_break else 0.12)

# Synth-Stabs, synkopiert; im Breakdown offener und mit mehr Hall
for bar in range(int(end_kick / BAR)):
    tb = bar * BAR
    if tb < drop + BAR * 2: continue
    ch = chords[bar % 4]
    in_break = breakdown[0] <= tb < breakdown[1]
    for pos in (3, 6, 10, 13):
        add(syn, stab(ch, 0.3 if in_break else 0.2, 3800 if in_break else 2200), tb + pos * S16,
            0.5 if in_break else 0.32)

# Drone für Intro, Breakdown und Outro
def drone(t0, d, g):
    t = tt(d)
    x = sum(saw(f, t) for f in (55 * 0.997, 55, 110.4, 164.8))
    env = np.minimum(1, t / 1.2) * np.minimum(1, (d - t) / 1.5)
    add(syn, lp(x, 700, 2) * env * g, t0)

drone(0, drop + 1.0, 0.16)
drone(breakdown[0], breakdown[1] - breakdown[0], 0.14)
drone(end_kick - 1.0, DUR - end_kick, 0.15)

# Riser vor jedem Szenenwechsel, Einschlag auf jedem Szenenanfang
add(fx, riser(drop), 0, 0.5)
add(fx, impact(), drop, 0.9)
for s in TL["scenes"][1:]:
    d = BAR * (2 if s["id"] == "booking" else 1)
    add(fx, riser(d), s["t"] - d, 0.32 if s["id"] != "booking" else 0.5)
    add(fx, impact(), s["t"], 0.45 if s["id"] != "booking" else 0.85)
add(fx, impact(), end_kick, 0.8)

music = (drums * 0.95 + bass * 0.75 + reverb(tops, 1.2, 0.2) * 1.0
         + reverb(syn, 2.6, 0.45) * 0.9 + reverb(fx, 2.5, 0.35))
music = lp(music, 16000)
music = np.tanh(music * 1.2) / np.tanh(1.2)

# ---------- Mischung mit Voice-Over ----------
def readwav(p):
    with wave.open(p) as w:
        a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
    return a

vo = readwav(os.path.join(BUILD, "vo.wav"))
vo = np.pad(vo, (0, max(0, N - len(vo))))[:N]
# Präsenz für die Stimme, Tiefen sauber
vo = hp(vo, 90) + 0.35 * bp(vo, 2500, 6000)
vo = reverb(vo, 0.6, 0.08)

# Ducking: Musik weicht der Stimme
env = np.abs(vo)
win = int(0.03 * SR)
env = np.convolve(env, np.ones(win) / win, mode="same")
rel = np.exp(-1 / (0.35 * SR))
sm = np.empty_like(env); v = 0.0
for i in range(0, len(env), 64):  # grob, reicht für eine Gain-Kurve
    e = env[i]
    v = e if e > v else v * rel ** 64
    sm[i:i + 64] = v
duck = 1 - 0.62 * np.clip(sm / 0.08, 0, 1)

mix_m = music * duck * 0.42
mix_l = mix_m + vo * 0.95
mix_r = mix_m + vo * 0.95
# leichte Stereobreite für die Tops/Synths
wide = hp(reverb(syn + tops, 0.4, 1.0), 400) * duck * 0.08
mix_l += wide; mix_r -= wide
st = np.stack([mix_l, mix_r], 1)
st = np.tanh(st * 1.1) / np.tanh(1.1)
st /= np.max(np.abs(st)) / 0.97
with wave.open(os.path.join(BUILD, "mix.wav"), "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((st * 32767).astype(np.int16).tobytes())

TL["kicks"] = kicks
TL["drop"] = drop
TL["breakdown"] = breakdown
TL["kickEnd"] = end_kick
json.dump(TL, open(os.path.join(BUILD, "timeline.json"), "w"), ensure_ascii=False, indent=1)
open(os.path.join(BUILD, "timeline.js"), "w").write("window.TL = " + json.dumps(TL, ensure_ascii=False) + ";\n")
print("Kicks:", len(kicks), "Dauer:", round(DUR, 2))
