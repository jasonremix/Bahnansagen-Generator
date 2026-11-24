# Bahnansagen-Generator

Bahnhofs- und Zugansagen im Browser zusammenstellen, anpassen und mit Gong abspielen.
Reine statische Web-App ohne Build-Schritt, ohne Server und ohne Abhängigkeiten.

> **Inoffizielles Fanprojekt.** Keine Verbindung zur Deutschen Bahn AG. Originalstimmen
> und Original-Gongs werden nicht verwendet. Bitte nicht für Durchsagen in echten
> Bahnhöfen oder Zügen einsetzen.

## Funktionen

- **12 Ansagearten**
  - Am Bahnsteig: Einfahrt, Abfahrt, Verspätung, Gleiswechsel, Zugausfall,
    umgekehrte Wagenreihung, Zugteilung, Durchfahrt, Ersatzverkehr mit Bussen
  - Im Zug: Begrüßung, Nächster Halt (mit Ausstiegsseite und Anschlüssen)
  - Freitext für eigene Durchsagen
- **Zugzielanzeiger als Live-Vorschau** mit Gleis, Uhrzeit, Verspätung, Hinweiszeile und
  Bahnsteigabschnitten A–G (1. Klasse wird bei der Wagenreihung markiert)
- **Englische Fassung**: automatisch nur im Fernverkehr (ICE, IC, EC), immer oder nie
- **Synthetischer Gong** (Dreiklang, Zweiklang, Vierklang) mit künstlichem Bahnhofshall
  und optionalem Schlussgong, live erzeugt mit der Web Audio API
- **Sprachausgabe** über die Web Speech API mit Auswahl der deutschen und englischen Stimme,
  Tempo und Tonhöhe
- **Aussprachehilfe**: Abkürzungen und Uhrzeiten werden beim Sprechen ausgeschrieben
  (`ICE` → „I C E“, `Hbf` → „Hauptbahnhof“, `Frankfurt (Main)` → „Frankfurt am Main“,
  `14:05 Uhr` → „14 Uhr 5“)
- Ansagetext frei bearbeitbar, „Ich wiederhole“-Option, Zufallszug, Text kopieren
- Tastatur: <kbd>Strg</kbd>/<kbd>⌘</kbd> + <kbd>Enter</kbd> spielt ab, <kbd>Esc</kbd> stoppt
- Hell- und Dunkelmodus, mobil nutzbar, Einstellungen bleiben im Browser gespeichert

## Zur Stimme

Die Stimmen kommen vom Betriebssystem bzw. Browser, nicht aus Aufnahmen. Die
Originalansagen stammen von echten Sprecherinnen und Sprechern und sind urheberrechtlich
geschützt, deshalb werden sie hier weder verwendet noch nachgebildet.

Am natürlichsten klingt es mit:

| Browser | Empfohlene Stimme |
| --- | --- |
| Microsoft Edge | „Microsoft Katja/Amala/Conrad Online (Natural)“ |
| Google Chrome | „Google Deutsch“ |
| Safari (macOS/iOS) | „Anna“ oder eine geladene „Premium“-Stimme (Systemeinstellungen → Bedienungshilfen → Gesprochene Inhalte) |

Findet die App keine deutsche Stimme, zeigt sie einen Hinweis an. Der Gong funktioniert
auch ohne Sprachausgabe.

## Starten

Einfach `index.html` im Browser öffnen. Oder mit lokalem Server:

```bash
npm start          # entspricht: python3 -m http.server 8080
# dann http://localhost:8080 öffnen
```

Für GitHub Pages reicht es, Pages für den Branch im Repository-Root zu aktivieren.

## Tests

```bash
npm test
```

Die Tests prüfen die Textbausteine, Grammatik (Einzahl/Mehrzahl, Artikel), Aussprachehilfe
und 200 Zufallsdurchläufe über alle Ansagearten.

## Aufbau

| Datei | Inhalt |
| --- | --- |
| `index.html` | Oberfläche |
| `css/style.css` | Gestaltung inkl. Dunkelmodus |
| `js/ansagen.js` | Textbausteine, Gründe, Bahnhöfe, Aussprachehilfe, Zufallsdaten (DOM-frei, auch in Node nutzbar) |
| `js/sprecher.js` | Gong-Synthese und Sprachausgabe |
| `js/app.js` | Formular, Anzeigetafel, Wiedergabe |
| `tests/` | Unit-Tests mit `node:test` |

Neue Ansageart hinzufügen: Eintrag in `TYPEN`, benötigte Felder in `FELDER` und einen
`case` in `bauen()` in `js/ansagen.js` ergänzen.
