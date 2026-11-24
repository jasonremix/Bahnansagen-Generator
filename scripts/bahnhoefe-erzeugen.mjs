#!/usr/bin/env node
/*
 * Erzeugt data/bahnhoefe.js aus den offenen Stationsdaten der DB InfraGO.
 *
 * Quelle: npm-Paket „db-hafas-stations“ (Datei full.ndjson), das die APIs
 * RIS::Stations und StaDa der DB InfraGO AG bündelt (CC BY 4.0) und mit
 * OpenStreetMap abgleicht (ODbL).
 *
 *   npm pack db-hafas-stations && tar -xzf db-hafas-stations-*.tgz
 *   node scripts/bahnhoefe-erzeugen.mjs package/full.ndjson [Stand]
 *
 * Aufgenommen werden alle Stationen mit deutscher Bahnhofsnummer (EVA 80…),
 * an denen Fern-, Regional- oder S-Bahn-Züge halten. Ersatzhaltestellen
 * (SEV, Bus) werden ausgelassen.
 */
import { createReadStream, writeFileSync, mkdirSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [, , quelle, stand = 'März 2025'] = process.argv;
if (!quelle) {
  console.error('Aufruf: node scripts/bahnhoefe-erzeugen.mjs <full.ndjson> [Stand]');
  process.exit(1);
}

/* Produktbits: 1 ICE · 2 IC/EC · 4 IRE/RE · 8 Regionalverkehr · 16 S-Bahn */
const PRODUKTE = [
  ['nationalExpress', 1],
  ['national', 2],
  ['regionalExpress', 4],
  ['regional', 8],
  ['suburban', 16],
];

const ERSATZ = /\bSEV\b|Ersatzverkehr|Schienenersatz|\(Bus\)/i;
/* Deutsche Bahnhöfe auf ausländischem Gebiet bekommen kein Bundesland. */
const IM_AUSLAND = /^Basel\b/;

/* „Frankfurt(Main)Hbf“ → „Frankfurt (Main) Hbf“ */
function schoenerName(name) {
  return name
    .replace(/\s+/g, ' ')
    .replace(/(\S)\(/g, '$1 (')
    .replace(/\)(?=[^\s,.)/-])/g, ') ')
    .trim();
}

const stationen = new Map();
const zeilen = createInterface({ input: createReadStream(quelle, 'utf8'), crlfDelay: Infinity });

for await (const zeile of zeilen) {
  if (!zeile.trim()) continue;
  const eintrag = JSON.parse(zeile);
  const kandidaten = [eintrag, eintrag.station].filter((s) => s && s.type === 'station');
  for (const s of kandidaten) {
    if (stationen.has(s.id) || !/^80\d{5}$/.test(String(s.id))) continue;
    const p = s.products || {};
    const bits = PRODUKTE.reduce((summe, [schluessel, bit]) => summe + (p[schluessel] ? bit : 0), 0);
    if (!bits || ERSATZ.test(s.name)) continue;
    const ags = /^de:(\d{2})/.exec(s.ifoptId || '');
    stationen.set(s.id, {
      name: schoenerName(s.name),
      eva: String(s.id),
      ds100: (s.ril100Ids && s.ril100Ids[0]) || '',
      land: ags ? Number(ags[1]) : 0,
      bits,
      preisklasse: s.priceCategory || 0,
      gewicht: Math.round(s.weight || 0),
      lat: s.location && s.location.latitude,
      lon: s.location && s.location.longitude,
    });
  }
}

/*
 * Bundesland ohne IFOPT-Kennung: nur übernehmen, wenn die fünf nächsten
 * Stationen mit bekanntem Land innerhalb von 25 km alle im selben Land liegen.
 */
const bekannt = [...stationen.values()].filter((s) => s.land && s.lat != null);
function entfernungKm(a, b) {
  const rad = Math.PI / 180;
  const x = (b.lon - a.lon) * rad * Math.cos(((a.lat + b.lat) / 2) * rad);
  const y = (b.lat - a.lat) * rad;
  return Math.sqrt(x * x + y * y) * 6371;
}
let abgeleitet = 0;
for (const s of stationen.values()) {
  if (s.land || s.lat == null || IM_AUSLAND.test(s.name)) continue;
  const naechste = bekannt
    .map((b) => [entfernungKm(s, b), b.land])
    .sort((a, b) => a[0] - b[0])
    .slice(0, 5);
  if (naechste.length === 5 && naechste.every(([km, land]) => km <= 25 && land === naechste[0][1])) {
    s.land = naechste[0][1];
    abgeleitet++;
  }
}

const liste = [...stationen.values()].sort(
  (a, b) => a.name.localeCompare(b.name, 'de') || a.eva.localeCompare(b.eva)
);

const daten = {
  stand,
  quelle:
    'DB InfraGO AG (RIS::Stations, StaDa), CC BY 4.0, über db-hafas-stations; OpenStreetMap-Mitwirkende, ODbL',
  felder: ['name', 'eva', 'ds100', 'land', 'produkte', 'preisklasse', 'gewicht'],
  liste: liste.map((s) => [s.name, s.eva, s.ds100, s.land, s.bits, s.preisklasse, s.gewicht]),
};

const ziel = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'bahnhoefe.js');
mkdirSync(dirname(ziel), { recursive: true });
writeFileSync(
  ziel,
  '/* Bahnhofsverzeichnis – automatisch erzeugt von scripts/bahnhoefe-erzeugen.mjs, nicht von Hand bearbeiten.\n' +
    ' * Stationsdaten: ' + daten.quelle + '. Stand: ' + stand + '. */\n' +
    'window.BAHNHOFSDATEN = ' + JSON.stringify(daten) + ';\n'
);

const ohneLand = liste.filter((s) => !s.land).length;
console.log(
  `${liste.length} Bahnhöfe geschrieben nach ${ziel}\n` +
    `Bundesland aus IFOPT: ${liste.length - ohneLand - abgeleitet}, abgeleitet: ${abgeleitet}, unbekannt: ${ohneLand}`
);
