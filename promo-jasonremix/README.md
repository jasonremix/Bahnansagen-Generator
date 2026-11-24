# jasonremix.de – Motion Graphic

Promo-Video (1920 × 1080, 30 fps, ca. 1:46) für **Jason Remix**, Hardtechno DJ, Musikproduzent
und Künstler, mit deutschem Voice-Over und eigenem Hardtechno-Soundtrack (150 BPM).

- Video: `output/jasonremix-promo.mp4`
- Untertitel: `output/jasonremix-promo.srt`

## Inhalt

| # | Szene | Inhalt (von jasonremix.de) |
|---|-------|----------------------------|
| 01 | Intro | Logo-Einschlag, „Hardtechno DJ • Musikproduzent • Künstler“ |
| 02 | Sound | Energiegeladene Beats · Moderne Hardtechno-Sounds · Live-Performances |
| 03 | Über | Jason Bürger, Brandenburg an der Havel, produziert seit 12, professionell seit 2023 |
| 04 | Warum | Live-Auftritte, eigene Produktionen, Hardtechno-Sound, buchbar für jedes Event |
| 05 | Musik | Spotify, Apple Music, YouTube, SoundCloud, TikTok, Amazon Music · Wolke 7, Distanz, Monster, Papa Pinguin, Sound of Silence (Remix) |
| 06 | Preview | Märchenland, Liebe, Herzschlag von mir, Backseat, 3 Tage Wach |
| 07 | Booking | Festivals, Clubs, Diskotheken, Firmenevents, Open-Air, Private Feiern, Musikveranstaltungen, Exklusive Events · Deutschland & Europa |
| 08 | Kooperationen | Marken, Labels, Veranstalter, Agenturen, Creator … · Offizieller Partner NordVPN |
| 09 | Community | 100 % Leidenschaft · 24/7 Support · ∞ Kreativität · 1 Community |
| 10 | Kontakt | jasonremix.de, „Jetzt buchen“, E-Mail, YouTube, Antwort in 24–48 Std. |

## Technik

- **Animation**: `scene.html` + `motion.js`. Jeder Frame wird rein aus der Zeit berechnet und
  mit Playwright/Chromium einzeln aufgenommen. Textanimationen: Decode/Glitch-Reveal,
  Slam-in mit Bewegungsunschärfe, Masken-Reveal pro Wort, 3D-Flip mit Federphysik,
  Neonröhren-Zündung, Zählwerk und Typewriter. Glow-Stärke, Kamera und Gitter pulsieren auf
  den Kick.
- **Stimme**: Piper TTS mit der freien Stimme „Thorsten“ (de_DE, high, CC0).
  Englische Begriffe stehen in `tools/script.py` in Lautschrift.
- **Musik**: komplett in `tools/music.py` synthetisiert (Kick, Rumble, Hats, Clap, Stabs,
  Riser, Impacts), Ducking unter der Stimme, Lautheit auf −14 LUFS.

## Neu bauen

```bash
pip install piper-tts numpy scipy
export PIPER_MODEL=/pfad/zu/de_DE-thorsten-high.onnx
tools/build.sh            # Stimme, Musik, Frames, MP4
node tools/render.js --preview 3,20,99   # Einzelbilder nach build/preview/
```

Texte ändern: `tools/script.py` (Sprechertext) und `scene.html`/`motion.js` (Bildtexte).
