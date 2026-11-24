"""Synthesised soundtrack (120 BPM, 2:00) for the motion graphic. Output: soundtrack.wav"""
import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 44100
DUR = 120.0
N = int(SR * DUR)
rng = np.random.default_rng(1)
L = np.zeros(N); R = np.zeros(N)
bus = {k: [np.zeros(N), np.zeros(N)] for k in ['drums', 'bass', 'pad', 'arp', 'lead', 'fx', 'ui']}

def mf(m): return 440.0 * 2 ** ((m - 69) / 12)
def tt(d): return np.arange(int(SR * d)) / SR

def place(name, t0, sig, pan=0.0, gain=1.0):
    """add mono (or stereo tuple) signal to a bus at time t0"""
    i0 = int(round(t0 * SR))
    if isinstance(sig, tuple):
        sl, sr_ = sig
    else:
        gl = np.cos((pan + 1) * np.pi / 4); gr = np.sin((pan + 1) * np.pi / 4)
        sl, sr_ = sig * gl * 1.414, sig * gr * 1.414
    if i0 >= N: return
    n = min(len(sl), N - i0)
    if i0 < 0: return
    bus[name][0][i0:i0 + n] += sl[:n] * gain
    bus[name][1][i0:i0 + n] += sr_[:n] * gain

def lp(x, fc, order=2):
    sos = signal.butter(order, min(fc, SR / 2 * 0.95), 'low', fs=SR, output='sos'); return signal.sosfilt(sos, x)
def hp(x, fc, order=2):
    sos = signal.butter(order, fc, 'high', fs=SR, output='sos'); return signal.sosfilt(sos, x)
def bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, min(hi, SR / 2 * 0.95)], 'band', fs=SR, output='sos'); return signal.sosfilt(sos, x)
def sweep_lp(x, f_start, f_end, curve=2.0, block=256):
    out = np.zeros_like(x); zi = None; nb = int(np.ceil(len(x) / block))
    for b in range(nb):
        k = (b / max(1, nb - 1)) ** curve
        fc = f_start * (f_end / f_start) ** k
        sos = signal.butter(2, min(fc, SR * 0.45), 'low', fs=SR, output='sos')
        if zi is None: zi = signal.sosfilt_zi(sos) * 0
        seg = x[b * block:(b + 1) * block]
        y, zi = signal.sosfilt(sos, seg, zi=zi); out[b * block:(b + 1) * block] = y
    return out
def saw(f, t, ph=0.0): return 2 * ((f * t + ph) % 1.0) - 1
def adsr(n, a, d, s, r, sus_len):
    a_n, d_n, r_n = int(a * SR), int(d * SR), int(r * SR)
    s_n = max(0, int(sus_len * SR) - a_n - d_n)
    env = np.concatenate([np.linspace(0, 1, a_n, endpoint=False), np.linspace(1, s, d_n, endpoint=False), np.full(s_n, s), np.linspace(s, 0, r_n)])
    return env[:n] if len(env) >= n else np.pad(env, (0, n - len(env)))

# ------------------------------------------------------------- harmony
PROG = {'Am': (33, [57, 60, 64, 67]), 'F': (29, [57, 60, 64, 65]), 'C': (36, [55, 60, 64, 67]), 'G': (31, [55, 59, 62, 67])}
ORDER = ['Am', 'F', 'C', 'G']
SECT = [(0, 0), (4, 4), (5, 5), (40, 40), (45, 45), (50, 50)]  # (start bar, offset)
def chord_at_bar(b):
    if b == 55: return 'G'
    if b >= 56: return 'C'
    off = 0
    for sb, o in SECT:
        if b >= sb: off = o
    return ORDER[(b - off) % 4]
BAR = 2.0; BEAT = 0.5; S16 = 0.125

def in_ranges(t, rs): return any(a <= t < b for a, b in rs)

# ------------------------------------------------------------- drums
def kick(v=1.0):
    t = tt(0.45); f = 44 + 120 * np.exp(-t * 32); ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * 7.5); click = hp(rng.standard_normal(len(t)), 2000) * np.exp(-t * 300) * 0.25
    return np.tanh((body + click) * 1.6) * v
def clap(v=1.0):
    t = tt(0.35); n = rng.standard_normal(len(t)); env = np.zeros(len(t))
    for d in (0, 0.011, 0.022): env += (t >= d) * np.exp(-np.clip(t - d, 0, None) * 90)
    env += (t >= 0.03) * np.exp(-np.clip(t - 0.03, 0, None) * 16) * 0.8
    return bp(n, 900, 3200) * env * 0.9 * v
def hat(v=1.0, open_=False):
    t = tt(0.3 if open_ else 0.08); n = hp(rng.standard_normal(len(t)), 7500, 4)
    return n * np.exp(-t * (14 if open_ else 70)) * v
def crash(v=1.0):
    t = tt(2.5); n = hp(rng.standard_normal(len(t)), 4000, 2)
    return n * np.exp(-t * 1.6) * 0.5 * v
def snare(v=1.0):
    t = tt(0.2); body = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * 0.6
    n = bp(rng.standard_normal(len(t)), 1500, 8000) * np.exp(-t * 28)
    return (body + n) * v

KICK_R = [(10, 80), (90, 99.5), (100, 110)]
CLAP_R = [(10, 80), (92, 98), (100, 110)]
HAT_R = [(10, 80), (84, 110)]
kick_times = []
for i in range(int(DUR / BEAT)):
    tb = i * BEAT
    if in_ranges(tb, KICK_R):
        place('drums', tb, kick(0.95)); kick_times.append(tb)
    if in_ranges(tb, CLAP_R) and i % 2 == 1:
        place('drums', tb, clap(0.55), pan=0.05)
    if in_ranges(tb + 0.25, HAT_R):
        place('drums', tb + 0.25, hat(0.32, open_=(tb >= 100 and tb < 110) or (40 <= tb < 66)), pan=0.25)
    for s in range(4):  # 16th shaker
        ts = tb + s * S16
        if in_ranges(ts, [(20, 80), (100, 110)]) and s in (1, 3):
            place('drums', ts, hat(0.12), pan=-0.35)
for tc in (10.0, 66.0, 100.0):
    place('drums', tc, crash(0.8), pan=0.0)
# snare rolls into 66 and 100
for a, b, v0 in ((64.0, 66.0, 0.15), (98.0, 100.0, 0.12)):
    t = a; i = 0
    while t < b - 0.01:
        k = (t - a) / (b - a); step = S16 if k < 0.5 else S16 / 2
        place('drums', t, snare(v0 + 0.45 * k), pan=0.1); t += step
# intro word hits (2,3,4,5,6)
for tw in (2.0, 3.0, 4.0, 5.0, 6.0):
    t = tt(0.6); tom = np.sin(2 * np.pi * (70 + 60 * np.exp(-t * 20)) * t) * np.exp(-t * 6)
    place('drums', tw, tom * 0.6 + hp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 80) * 0.15)

# sidechain envelope
sc = np.ones(N)
for tk in kick_times:
    i0 = int(tk * SR); n = min(int(0.45 * SR), N - i0)
    tloc = np.arange(n) / SR
    sc[i0:i0 + n] = np.minimum(sc[i0:i0 + n], 1 - 0.65 * np.exp(-tloc * 9))

# ------------------------------------------------------------- bass
def bass_note(m, dur, v=1.0):
    t = tt(dur + 0.05); f = mf(m)
    x = np.sin(2 * np.pi * f * t) * 0.9 + lp(saw(f, t) * 0.5, 520) * (0.6 + 0.4 * np.exp(-t * 12))
    env = adsr(len(t), 0.004, 0.08, 0.75, 0.04, dur)
    return np.tanh(x * env * 1.3) * v
for b in range(60):
    ch = chord_at_bar(b); root = PROG[ch][0]; tb = b * BAR
    if 8 <= tb < 10:
        place('bass', tb, bass_note(root, 1.95, 0.7))
    elif in_ranges(tb, [(10, 80), (90, 110)]):
        for e in range(8):
            te = tb + e * 0.25
            m = root + (12 if e in (3, 7) else 0)
            place('bass', te, bass_note(m, 0.22, 0.65 if e % 2 else 0.45))
    elif 80 <= tb < 90:
        place('bass', tb, bass_note(root, 1.9, 0.35))
place('bass', 112.0, bass_note(36, 6.0, 0.6))

# ------------------------------------------------------------- pad
def pad_chord(notes, dur, bright=2200):
    t = tt(dur + 1.2); l = np.zeros(len(t)); r = np.zeros(len(t))
    for m in notes:
        f = mf(m)
        for k, det in enumerate((-0.11, 0.0, 0.13)):
            ff = f * 2 ** (det / 12); ph = rng.random()
            x = saw(ff, t, ph)
            if k == 0: l += x
            elif k == 2: r += x
            else: l += x * 0.7; r += x * 0.7
    env = adsr(len(t), 0.35, 0.4, 0.8, 1.1, dur)
    return lp(l * env, bright) * 0.07, lp(r * env, bright) * 0.07
for b in range(56):
    tb = b * BAR; ch = chord_at_bar(b); notes = PROG[ch][1]
    bright = 900 + 1400 * min(1, tb / 8) if tb < 8 else (1600 if 80 <= tb < 90 else 2400)
    vol = 0.5 + 0.5 * min(1, tb / 6) if tb < 8 else (1.15 if 80 <= tb < 90 else 0.8)
    pl, pr = pad_chord(notes, BAR, bright)
    place('pad', tb, (pl * vol, pr * vol))
# final chord
pl, pr = pad_chord([48, 55, 60, 64, 67, 71, 74], 7.0, 2600)
place('pad', 112.0, (pl * 1.1, pr * 1.1))

# ------------------------------------------------------------- arp
def pluck(m, v=1.0, dec=9.0, bright=3500):
    t = tt(0.45); f = mf(m)
    x = 0.6 * saw(f, t) + 0.4 * np.sign(np.sin(2 * np.pi * f * 2 * t))
    return lp(x * np.exp(-t * dec), bright) * v
ARP_PAT = [0, 1, 2, 3, 2, 1, 0, 2, 3, 2, 1, 3, 0, 1, 2, 1]
arp_sig_times = []
for b in range(56):
    tb = b * BAR; notes = PROG[chord_at_bar(b)][1]
    if 2 <= tb < 8:
        for e in range(8):
            place('arp', tb + e * 0.25, pluck(notes[ARP_PAT[e * 2 % 16]] + 12, 0.22, 7, 2500), pan=(-0.4 if e % 2 else 0.4))
    elif in_ranges(tb, [(10, 80), (80, 90), (90, 110)]):
        bright = 1800 if 80 <= tb < 90 else 3800
        for s in range(16):
            v = 0.2 if s % 4 == 0 else 0.13
            place('arp', tb + s * S16, pluck(notes[ARP_PAT[s]] + 12, v, 11, bright), pan=(-0.3 if s % 2 else 0.3))
for i, m in enumerate([72, 76, 79, 83, 86, 83, 79, 76]):
    place('arp', 112.5 + i * 0.5, pluck(m, 0.16, 4, 3000), pan=(-0.5 if i % 2 else 0.5))

# ------------------------------------------------------------- lead (drop 100–110)
MEL = [  # (8th index from 100s, midi, length in 8ths)
    (0, 76, 2), (2, 74, 1), (3, 72, 1), (4, 74, 2), (6, 76, 2),
    (8, 77, 2), (10, 76, 1), (11, 74, 1), (12, 72, 4),
    (16, 79, 2), (18, 76, 2), (20, 74, 1), (21, 72, 1), (22, 74, 2),
    (24, 74, 2), (26, 71, 2), (28, 72, 1), (29, 74, 1), (30, 79, 2),
    (32, 76, 6), (38, 74, 2)]
for (i8, m, ln) in MEL:
    d = ln * 0.25; t = tt(d + 0.3); f = mf(m)
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.5 * t) * np.clip((t - 0.15) * 4, 0, 1)
    ph = np.cumsum(f * vib) / SR
    x = (2 * (ph % 1) - 1) * 0.5 + (2 * ((ph * 1.006) % 1) - 1) * 0.5
    x = lp(x * adsr(len(t), 0.01, 0.1, 0.7, 0.25, d), 3200)
    place('lead', 100 + i8 * 0.25, x * 0.16, pan=0.0)

# ------------------------------------------------------------- FX
def riser(d, v=1.0):
    t = tt(d); n = rng.standard_normal(len(t))
    x = sweep_lp(n, 300, 9000, 1.6) * (t / d) ** 2
    tone = np.sin(2 * np.pi * np.cumsum(200 + 600 * (t / d) ** 2) / SR) * (t / d) ** 3 * 0.25
    return (x * 0.5 + tone) * v
def impact(v=1.0, d=3.0):
    t = tt(d); boom = np.sin(2 * np.pi * np.cumsum(30 + 40 * np.exp(-t * 6)) / SR) * np.exp(-t * 1.6)
    n = lp(rng.standard_normal(len(t)), 1200) * np.exp(-t * 5) * 0.5
    return np.tanh((boom + n) * 1.4) * v
def whoosh(d=0.9, v=1.0):
    t = tt(d); n = rng.standard_normal(len(t)); k = t / d
    env = np.sin(np.pi * k) ** 2
    x = sweep_lp(n, 400, 6000, 1.0) * env
    return x * v
for a, b in ((6.0, 8.0), (64.4, 66.0), (88.0, 90.0), (97.5, 100.0), (110.0, 112.0)):
    place('fx', a, riser(b - a, 0.55 if b in (8.0, 100.0, 112.0) else 0.4))
place('fx', 8.0, impact(0.5)); place('fx', 112.0, impact(0.6, 4.0)); place('fx', 100.0, impact(0.32)); place('fx', 66.0, impact(0.22))
for tw in (19.6, 31.4, 43.4, 53.4, 79.4, 89.6, 109.6, 104.6):
    w = whoosh(0.9, 0.35); place('fx', tw - 0.2, (w * 0.9, np.roll(w, 400) * 0.6))
for tw in (65.55, 99.55):
    w = whoosh(1.0, 0.6); place('fx', tw, (w, np.roll(w, 600)))

# ------------------------------------------------------------- UI sounds
def bell(f, d=1.2, v=1.0):
    t = tt(d); x = np.zeros(len(t))
    for ratio, a, dec in ((1, 1, 3.0), (2.76, 0.4, 6), (5.4, 0.2, 10), (8.93, 0.08, 16)):
        x += np.sin(2 * np.pi * f * ratio * t) * a * np.exp(-t * dec)
    return x * v * 0.25
def ding(v=1.0):
    a = bell(mf(84), 1.4, v); b = bell(mf(91), 1.4, v * 0.9)
    return a + np.pad(b, (int(0.09 * SR), 0))[:len(a)]
def click(v=1.0):
    t = tt(0.04); return (np.sin(2 * np.pi * 1800 * t) * np.exp(-t * 160) + hp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 400) * 0.4) * v
def coin(v=1.0):
    t = tt(0.5); x = np.zeros(len(t))
    for f, a in ((2637, 1), (3951, 0.6), (5274, 0.35)):
        x += np.sin(2 * np.pi * f * t) * a * np.exp(-t * 9)
    return x * 0.12 * v
def pop_(v=1.0):
    t = tt(0.12); f = 500 + 900 * np.exp(-t * 40); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 35) * 0.35 * v
place('ui', 15.3, ding(0.7), pan=0.3)                       # notification
place('ui', 16.7, pop_(0.6), pan=0.4); place('ui', 17.2, pop_(0.5), pan=0.5)
place('ui', 26.9, click(0.5), pan=0.2); place('ui', 28.4, click(0.45), pan=0.2)
t_ = tt(0.18); place('ui', 29.05, np.sin(2 * np.pi * 2093 * t_) * np.exp(-t_ * 12) * 0.12, pan=0.2)  # contactless beep
place('ui', 29.3, ding(0.5), pan=0.35)
for i in range(8): place('ui', 34.2 + i * 0.11, pop_(0.35), pan=(-0.5 + i / 7))
for ts in (37.6, 39.0, 40.4): place('ui', ts, click(0.35), pan=0.4)
place('ui', 46.2, pop_(0.4), pan=-0.5)
place('ui', 47.4, coin(1.0), pan=0.5); place('ui', 47.45, ding(0.45), pan=0.5)
for j in range(4): place('ui', 51.3 + j * 0.15, pop_(0.35), pan=(-0.6 + j * 0.4))
for i in range(3): place('ui', 59.25 + i * 0.95, coin(0.9), pan=0.2)
for i, m in enumerate([84, 88, 91, 96, 100, 103]): place('ui', 92.55 + i * 0.06, bell(mf(m), 0.9, 0.5), pan=(-0.6 + i * 0.24))
place('ui', 97.1, click(0.55), pan=0.3); place('ui', 98.0, ding(0.6), pan=0.3)
for i in range(8): place('ui', 110.0 + i * 0.06, pop_(0.25), pan=(-0.7 + i * 0.2))

# ------------------------------------------------------------- mix
def stereo(name): return bus[name][0], bus[name][1]
def reverb_ir(d=2.4, damp=3500):
    t = tt(d); l = lp(rng.standard_normal(len(t)), damp) * np.exp(-t * 2.6); r = lp(rng.standard_normal(len(t)), damp) * np.exp(-t * 2.6)
    return l / np.sqrt(np.sum(l ** 2)), r / np.sqrt(np.sum(r ** 2))
irl, irr = reverb_ir()
def delay(x, d, fb=0.35, n=4):
    y = x.copy(); k = int(d * SR)
    for i in range(1, n + 1):
        y[k * i:] += x[:-k * i] * (fb ** i)
    return y

dl, dr = stereo('drums'); bl, br = stereo('bass'); pl, pr = stereo('pad'); al, ar = stereo('arp'); ll, lr = stereo('lead'); fl, fr = stereo('fx'); ul, ur = stereo('ui')
pl *= sc; pr *= sc; bl *= sc; br *= sc; al *= (0.5 + 0.5 * sc); ar *= (0.5 + 0.5 * sc)
al, ar = al + delay(ar, 0.375, 0.3, 3) * 0.35, ar + delay(al, 0.1875, 0.3, 3) * 0.35
ll, lr = ll + delay(lr, 0.375, 0.3, 3) * 0.3, lr + delay(ll, 0.375, 0.3, 3) * 0.3
# reverb send
sendL = pl * 0.5 + al * 0.6 + ll * 0.6 + ul * 0.5 + fl * 0.4 + dl * 0.05
sendR = pr * 0.5 + ar * 0.6 + lr * 0.6 + ur * 0.5 + fr * 0.4 + dr * 0.05
revL = signal.fftconvolve(sendL, irl)[:N] * 0.9; revR = signal.fftconvolve(sendR, irr)[:N] * 0.9

G = dict(drums=0.9, bass=0.75, pad=1.0, arp=0.85, lead=0.9, fx=0.8, ui=0.9)
mixL = dl * G['drums'] + bl * G['bass'] + pl * G['pad'] + al * G['arp'] + ll * G['lead'] + fl * G['fx'] + ul * G['ui'] + revL
mixR = dr * G['drums'] + br * G['bass'] + pr * G['pad'] + ar * G['arp'] + lr * G['lead'] + fr * G['fx'] + ur * G['ui'] + revR
mixL = hp(mixL, 28); mixR = hp(mixR, 28)
# fade in/out
t_all = np.arange(N) / SR
fade = np.clip(t_all / 0.05, 0, 1) * np.clip((119.9 - t_all) / 2.2, 0, 1) ** 1.5
mixL *= fade; mixR *= fade
peak = max(np.max(np.abs(mixL)), np.max(np.abs(mixR)))
mixL /= peak; mixR /= peak
mixL = np.tanh(mixL * 1.8) / np.tanh(1.8); mixR = np.tanh(mixR * 1.8) / np.tanh(1.8)
out = np.stack([mixL, mixR], 1) * 0.89
wavfile.write('soundtrack.wav', SR, (out * 32767).astype(np.int16))
print('wrote soundtrack.wav', out.shape, 'kicks', len(kick_times))
