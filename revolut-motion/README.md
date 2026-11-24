# Revolut – Motion Graphic (2:00)

Unabhängiges Konzept-/Spec-Video (1920×1080, 30 fps, 120 s) über die Produkte von revolut.com.
Kein offizielles Revolut-Material: keine Original-Logos, Fotos oder Assets. Alle Oberflächen sind nachgebaut,
alle Beträge, Kurse und Händlernamen sind Beispielwerte.

## Storyboard (Schnitte auf 120 BPM, 1 Takt = 2 s)

| Zeit | Szene | Produkt / Botschaft |
|---|---|---|
| 0:00–0:10 | Intro | „Bezahlen. Senden. Sparen. Investieren.“ → „Alles in einer App.“ → Wortmarke |
| 0:10–0:20 | App | Home-Screen, Kontostand, Echtzeit-Benachrichtigung „Gehalt eingegangen“ |
| 0:20–0:32 | Karten | Standard / Metal / virtuelle Einwegkarte, Karte einfrieren, kontaktlos zahlen |
| 0:32–0:44 | Wechseln & Reisen | Globus mit Flugrouten, 30+ Währungen, Live-Umrechnung EUR → USD/GBP/JPY/CHF |
| 0:44–0:54 | Senden & Teilen | Geld in Sekunden senden, Rechnung teilen |
| 0:54–1:06 | Sparen | Spartopf mit Ziel, Aufrunden, täglich ausgezahlte Zinsen |
| 1:06–1:20 | Investieren | Aktien, ETFs, Krypto ab 1 €, Risikohinweis |
| 1:20–1:30 | Analysen | Ausgaben-Donut, Budget, Abo-Erinnerung |
| 1:30–1:40 | RevPoints & Revolut Pay | Punkte sammeln, 1-Klick-Checkout |
| 1:40–1:50 | Für alle | Revolut <18, Revolut Business, Pläne Standard → Ultra |
| 1:50–2:00 | Outro | Feature-Orbit → Wortmarke, „Jetzt App laden · revolut.com“ |

## Dateien

- `index.html` – alle Szenen; `window.render(t)` zeichnet den Zustand zur Zeit `t` (deterministisch, keine CSS-Animationen)
- `render.js` – rendert einen Frame-Bereich per Playwright/Chromium und kodiert ihn mit ffmpeg
- `preview.js` – einzelne Standbilder: `node preview.js <ordner> 12.5 30 61`
- `music.py` – synthetisiert den Soundtrack (120 BPM, Drums, Bass, Pads, Arp, Lead, Riser, UI-Sounds) → `soundtrack.wav`

## Neu rendern

```bash
pip install numpy scipy
python3 music.py                                   # soundtrack.wav
for i in 0 1 2 3; do node render.js $((i*900)) $((i*900+900)) seg$i.mp4 & done; wait
printf "file 'seg%d.mp4'\n" 0 1 2 3 > list.txt
ffmpeg -f concat -safe 0 -i list.txt -i soundtrack.wav -map 0:v -map 1:a -c:v copy \
  -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 256k -shortest -movflags +faststart revolut-motion.mp4
```

Texte, Farben und Timing stehen direkt in `index.html` (eine `scene(start, ende, id, fn)` pro Szene).
