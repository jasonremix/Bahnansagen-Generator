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
- **Alle Bahnhöfe in Deutschland**: 6.262 Bahnhöfe und Haltepunkte mit Zugverkehr aus den
  offenen Stationsdaten der DB InfraGO, durchsuchbar nach Name, DS100-Kürzel und EVA-Nummer,
  filterbar nach Bundesland und Verkehr (ICE, Fernverkehr, S-Bahn, Nahverkehr). Alle Namen
  stehen auch als Vorschläge in den Eingabefeldern bereit.
- **Alle Zuggattungen**: 21 Gattungen im deutschen Personenverkehr, von ICE, ECE, IC, EC,
  Railjet, TGV, Eurostar und Flixtrain über Nightjet, EuroNight und European Sleeper bis zu
  IRE, RE, MEX, RB, TER, S-Bahn und Regio-S-Bahn
- **Zugzielanzeiger als Live-Vorschau** mit Gleis, Uhrzeit, Verspätung, Hinweiszeile und
  Bahnsteigabschnitten A–G (1. Klasse wird bei der Wagenreihung markiert)
- **Englische Fassung**: automatisch nur im Fernverkehr (ICE, IC, EC), immer oder nie
- **Synthetischer Gong** (Dreiklang, Zweiklang, Vierklang) mit künstlichem Bahnhofshall
  und optionalem Schlussgong, live erzeugt mit der Web Audio API
- **Sprachausgabe** über die Web Speech API mit Auswahl der deutschen und englischen Stimme,
  Tempo und Tonhöhe
- **Aussprachehilfe**: Abkürzungen und Uhrzeiten werden beim Sprechen ausgeschrieben
  (`ICE` → „I C E“, `NJ 420` → „Nightjet 420“, `Hbf` → „Hauptbahnhof“,
  `Halle (Saale)` → „Halle an der Saale“, `Langen (Hess)` → „Langen Hessen“,
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

## Daten

Das Bahnhofsverzeichnis (`data/bahnhoefe.js`) wird aus den offenen Stationsdaten der
**DB InfraGO AG** erzeugt (RIS::Stations und StaDa, Lizenz
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.de)), gebündelt im npm-Paket
[db-hafas-stations](https://github.com/derhuerst/db-hafas-stations) und dort mit
[OpenStreetMap](https://www.openstreetmap.org/copyright) abgeglichen. Stand: März 2025.

Aufgenommen sind alle Stationen mit deutscher Bahnhofsnummer (EVA 80…), an denen Fern-,
Regional- oder S-Bahn-Züge halten, ohne Ersatzhaltestellen. Das Bundesland stammt aus der
IFOPT-Kennung; fehlt sie, wird es aus den fünf nächsten Bahnhöfen abgeleitet, wenn diese
übereinstimmen. Bei 237 Bahnhöfen bleibt es offen.

Daten aktualisieren:

```bash
npm pack db-hafas-stations && tar -xzf db-hafas-stations-*.tgz
node scripts/bahnhoefe-erzeugen.mjs package/full.ndjson "März 2025"
```

Echte Zugnummern mit Fahrplan (z. B. „ICE 578 München–Hamburg“) sind nicht enthalten. Dafür
bräuchte es die GTFS-Fahrplandaten von gtfs.de bzw. DELFI.

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

Die Tests prüfen die Textbausteine, Grammatik (Einzahl/Mehrzahl, Artikel), Aussprachehilfe,
die Zuggattungen, das Bahnhofsverzeichnis und 200 Zufallsdurchläufe über alle Ansagearten.

## Aufbau

| Datei | Inhalt |
| --- | --- |
| `index.html` | Oberfläche |
| `css/style.css` | Gestaltung inkl. Dunkelmodus |
| `js/ansagen.js` | Textbausteine, Gründe, Bahnhöfe, Aussprachehilfe, Zufallsdaten (DOM-frei, auch in Node nutzbar) |
| `js/sprecher.js` | Gong-Synthese und Sprachausgabe |
| `js/app.js` | Formular, Anzeigetafel, Wiedergabe |
| `js/verzeichnis.js` | Verzeichnis aller Bahnhöfe und Zuggattungen |
| `data/bahnhoefe.js` | Bahnhofsdaten (erzeugt) |
| `scripts/bahnhoefe-erzeugen.mjs` | Erzeugt `data/bahnhoefe.js` aus den Stationsdaten |
| `tests/` | Unit-Tests mit `node:test` |

Neue Ansageart hinzufügen: Eintrag in `TYPEN`, benötigte Felder in `FELDER` und einen
`case` in `bauen()` in `js/ansagen.js` ergänzen.
