'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../js/ansagen.js');

const daten = (extra) => Object.assign({}, A.STANDARD, extra);

test('jede Ansageart liefert deutschen Text und Tafeldaten', () => {
  for (const { id } of A.TYPEN) {
    const r = A.bauen(id, daten({ typ: id }));
    assert.ok(r.de.length > 10, id + ': deutscher Text fehlt');
    assert.ok(r.tafel && r.tafel.modus, id + ': Tafeldaten fehlen');
    if (id !== 'freitext') assert.ok(r.en.length > 10, id + ': englischer Text fehlt');
    assert.doesNotMatch(r.de, /undefined|null|NaN/, id);
    assert.doesNotMatch(r.en, /undefined|null|NaN/, id);
  }
});

test('Einfahrt mit Zwischenhalten', () => {
  const r = A.bauen('einfahrt', daten());
  assert.equal(
    r.de,
    'Auf Gleis 7 fährt ein: ICE 578 nach Hamburg-Altona über Hannover Hbf und Hamburg Hbf. ' +
      'Die Abfahrt ist um 14:32 Uhr. Bitte Vorsicht bei der Einfahrt.'
  );
  assert.match(r.en, /^Now arriving at platform 7: ICE 578 to Hamburg-Altona via Hannover Hbf and Hamburg Hbf\./);
});

test('Verspätung nennt Minuten und Grund mit richtigem Verb', () => {
  const r = A.bauen('verspaetung', daten({ verspaetung: '1', grund: 'signal' }));
  assert.match(r.de, /circa 1 Minute Verspätung\. Grund dafür ist eine Signalstörung\./);
  assert.match(r.en, /approximately 1 minute late today\. This is due to a signal failure\./);
  const mehrzahl = A.bauen('verspaetung', daten({ verspaetung: '25', grund: 'bauarbeiten' }));
  assert.match(mehrzahl.de, /circa 25 Minuten Verspätung\. Grund dafür sind Bauarbeiten\./);
  assert.equal(mehrzahl.tafel.verspaetung, 25);
});

test('ohne Grund entfällt der Begründungssatz', () => {
  const r = A.bauen('ausfall', daten({ grund: '' }));
  assert.doesNotMatch(r.de, /Grund dafür/);
  assert.doesNotMatch(r.en, /due to/);
  assert.equal(r.tafel.ausfall, true);
});

test('fehlende Uhrzeit erzeugt keinen halben Satz', () => {
  const r = A.bauen('gleiswechsel', daten({ zeit: '' }));
  assert.equal(
    r.de,
    'Achtung an Gleis 7: ICE 578 nach Hamburg-Altona fährt heute von Gleis 12 ab. Bitte beachten Sie den Gleiswechsel.'
  );
});

test('Wagenreihung sortiert Abschnitte und nutzt Einzahl', () => {
  const r = A.bauen('wagenreihung', daten({ abschnittVon: 'F', abschnittBis: 'C' }));
  assert.match(r.de, /in den Abschnitten C bis F\./);
  assert.deepEqual(r.tafel.ersteKlasse, { von: 2, bis: 5 });
  const eins = A.bauen('wagenreihung', daten({ abschnittVon: 'B', abschnittBis: 'B' }));
  assert.match(eins.de, /im Abschnitt B\./);
  assert.match(eins.en, /in section B\./);
});

test('Begrüßung wählt den passenden Artikel', () => {
  assert.match(A.bauen('begruessung', daten({ zugart: 'ICE' })).de, /^Herzlich willkommen im ICE 578/);
  assert.match(A.bauen('begruessung', daten({ zugart: 'S', nummer: '1' })).de, /^Herzlich willkommen in der S 1/);
  assert.match(A.bauen('begruessung', daten({ ueber: 'Fulda' })).de, /Unser nächster Halt ist Fulda\./);
});

test('Nächster Halt übersetzt Anschlüsse ins Englische', () => {
  const r = A.bauen('naechsterhalt', daten());
  assert.match(r.de, /Ausstieg in Fahrtrichtung rechts\. Sie haben Anschluss an S 5 nach Flughafen und RE 2 nach Göttingen\./);
  assert.match(r.en, /Exit on the right-hand side\. Connecting services: S 5 to Flughafen and RE 2 to Göttingen\./);
});

test('Sprechtext schreibt Abkürzungen und Uhrzeiten aus', () => {
  assert.equal(
    A.sprechtextDe('ICE 578 nach Frankfurt (Main) Hbf, Abfahrt 09:05 Uhr.'),
    'I C E 578 nach Frankfurt am Main Hauptbahnhof, Abfahrt 9 Uhr 5.'
  );
  assert.equal(A.sprechtextDe('RE 2 und IC 2023 um 14:00 Uhr, ca. 5 Min. später.'), 'R E 2 und I C 2023 um 14 Uhr, circa 5 Minuten später.');
  assert.equal(A.sprechtextDe('Münster (Westf) Hbf'), 'Münster Westfalen Hauptbahnhof');
  assert.equal(A.sprechtextEn('ICE 578 to Basel SBB, departure 14:32.'), 'I C E 578 to Basel S B B, departure 14:32.');
});

test('Englisch automatisch nur im Fernverkehr', () => {
  assert.equal(A.englischAktiv({ typ: 'einfahrt', zugart: 'ICE', englisch: 'auto' }), true);
  assert.equal(A.englischAktiv({ typ: 'einfahrt', zugart: 'RB', englisch: 'auto' }), false);
  assert.equal(A.englischAktiv({ typ: 'einfahrt', zugart: 'RB', englisch: 'immer' }), true);
  assert.equal(A.englischAktiv({ typ: 'einfahrt', zugart: 'ICE', englisch: 'nie' }), false);
  assert.equal(A.englischAktiv({ typ: 'freitext', zugart: 'ICE', englisch: 'immer' }), false);
});

test('Zufallsdaten ergeben für jede Ansageart gültige Texte', () => {
  let seed = 7;
  const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 200; i++) {
    const z = A.zufallsDaten(rng);
    assert.notEqual(z.gleis, z.neuesGleis);
    assert.match(z.zeit, /^\d{2}:\d{2}$/);
    for (const { id } of A.TYPEN) {
      const r = A.bauen(id, daten(Object.assign({ typ: id }, z)));
      assert.doesNotMatch(r.de + r.en, /undefined|NaN/);
    }
  }
});
