/*
 * Bahnansagen-Generator – Verzeichnis aller Bahnhöfe und Zuggattungen.
 *
 * Liest window.BAHNHOFSDATEN (data/bahnhoefe.js) und Ansagen.ZUGGATTUNGEN.
 * „Einsetzen“ schreibt in das Formular und löst ein input-Ereignis aus,
 * damit Ansagetext und Anzeigetafel sich wie bei einer Eingabe aktualisieren.
 */
(function () {
  'use strict';

  const A = window.Ansagen;
  const daten = window.BAHNHOFSDATEN || { liste: [], stand: '', quelle: '' };
  const form = document.getElementById('ansage-form');
  const $ = (id) => document.getElementById(id);
  const zahl = new Intl.NumberFormat('de-DE');

  const LAENDER = [
    '', 'Schleswig-Holstein', 'Hamburg', 'Niedersachsen', 'Bremen', 'Nordrhein-Westfalen', 'Hessen',
    'Rheinland-Pfalz', 'Baden-Württemberg', 'Bayern', 'Saarland', 'Berlin', 'Brandenburg',
    'Mecklenburg-Vorpommern', 'Sachsen', 'Sachsen-Anhalt', 'Thüringen',
  ];
  const ZIELFELDER = [
    ['ziel', 'Ziel'],
    ['ueber', 'Über (anhängen)'],
    ['zielHinten', 'Ziel der hinteren Wagen'],
    ['teilungBhf', 'Zugteilung in'],
    ['sevVon', 'Keine Züge zwischen'],
    ['sevBis', 'und'],
    ['halt', 'Nächster Halt'],
  ];
  const SEITE = 60;

  /* „München“, „Muenchen“ und „Munchen“ finden denselben Bahnhof. */
  function suchform(text, umlaute) {
    let t = String(text).toLowerCase();
    t = umlaute
      ? t.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
      : t.replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u');
    return t
      .replace(/ß/g, 'ss')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  const bahnhoefe = daten.liste.map(([name, eva, ds100, land, bits, preisklasse, gewicht]) => ({
    name, eva, ds100, land, bits, preisklasse, gewicht,
    such1: suchform(name, true),
    such2: suchform(name, false),
  }));

  let ergebnis = bahnhoefe;
  let gezeigt = 0;

  function element(tag, klasse, text) {
    const el = document.createElement(tag);
    if (klasse) el.className = klasse;
    if (text != null) el.textContent = text;
    return el;
  }

  function meldung(id, text) {
    const el = $(id);
    el.textContent = text;
    clearTimeout(el._timer);
    el._timer = setTimeout(() => {
      el.textContent = '';
    }, 4000);
  }

  /* ------------------------------------------------------------------ */
  /* Bahnhöfe                                                            */
  /* ------------------------------------------------------------------ */

  function plaketten(bits) {
    const liste = [];
    if (bits & 1) liste.push(['ICE', 'b b-ice', 'ICE-Halt']);
    if (bits & 2) liste.push(['IC/EC', 'b b-fern', 'Intercity- oder Eurocity-Halt']);
    if (bits & 12) liste.push(['RE/RB', 'b', 'Regionalverkehr']);
    if (bits & 16) liste.push(['S', 'b b-s', 'S-Bahn']);
    return liste.map(([text, klasse, titel]) => {
      const el = element('span', klasse, text);
      el.title = titel;
      return el;
    });
  }

  function zeile(b) {
    const li = element('li', 'v-zeile');
    const name = element('div', 'v-name');
    name.append(
      element('strong', '', b.name),
      element(
        'span',
        'v-meta',
        [
          LAENDER[b.land],
          'EVA\u00a0' + b.eva,
          b.ds100 && 'DS100\u00a0' + b.ds100,
          b.preisklasse && 'Preisklasse\u00a0' + b.preisklasse,
        ]
          .filter(Boolean)
          .join(' · ')
      )
    );
    const marken = element('div', 'v-plaketten');
    marken.append(...plaketten(b.bits));
    const knopf = element('button', 'knopf-leise v-einsetzen', 'Einsetzen');
    knopf.type = 'button';
    knopf.dataset.name = b.name;
    knopf.setAttribute('aria-label', b.name + ' einsetzen');
    li.append(name, marken, knopf);
    return li;
  }

  function filtern() {
    const roh = $('v-suche').value.trim();
    const q1 = suchform(roh, true);
    const q2 = suchform(roh, false);
    const land = Number($('v-land').value);
    const verkehr = $('v-verkehr').value;

    ergebnis = bahnhoefe.filter((b) => {
      if (land >= 0 && $('v-land').value !== '' && b.land !== land) return false;
      if (verkehr === 'ice' && !(b.bits & 1)) return false;
      if (verkehr === 'fern' && !(b.bits & 3)) return false;
      if (verkehr === 's' && !(b.bits & 16)) return false;
      if (verkehr === 'regio' && b.bits & 3) return false;
      if (!roh) return true;
      return (
        b.such1.includes(q1) ||
        b.such2.includes(q2) ||
        b.eva === roh ||
        (b.ds100 && b.ds100.toLowerCase() === roh.toLowerCase())
      );
    });

    if (roh) {
      const rang = (b) =>
        b.eva === roh || b.ds100.toLowerCase() === roh.toLowerCase() || b.such1 === q1 ? 0
          : b.such1.startsWith(q1) || b.such2.startsWith(q2) ? 1
            : 2;
      ergebnis = ergebnis
        .map((b) => [rang(b), b])
        .sort((x, y) => x[0] - y[0] || y[1].gewicht - x[1].gewicht)
        .map((x) => x[1]);
    }

    gezeigt = 0;
    $('v-zeilen').replaceChildren();
    $('v-treffer').textContent = ergebnis.length
      ? zahl.format(ergebnis.length) + (ergebnis.length === 1 ? ' Bahnhof' : ' Bahnhöfe')
      : 'Kein Bahnhof gefunden. Prüfe die Schreibweise oder setze die Filter zurück.';
    weitere();
  }

  function weitere() {
    const teil = ergebnis.slice(gezeigt, gezeigt + SEITE);
    const stueck = document.createDocumentFragment();
    teil.forEach((b) => stueck.append(zeile(b)));
    $('v-zeilen').append(stueck);
    gezeigt += teil.length;
    const rest = ergebnis.length - gezeigt;
    const knopf = $('v-mehr');
    knopf.hidden = rest <= 0;
    knopf.textContent = 'Weitere ' + zahl.format(Math.min(SEITE, rest)) + ' von ' + zahl.format(rest) + ' anzeigen';
  }

  function sichtbareZielfelder() {
    return ZIELFELDER.filter(([id]) => {
      const feld = $(id);
      const huelle = feld && feld.closest('[data-feld]');
      return huelle && !huelle.hidden;
    });
  }

  function zieleAktualisieren() {
    const select = $('v-ziel');
    const vorher = select.value;
    const sichtbar = sichtbareZielfelder();
    select.replaceChildren(
      ...(sichtbar.length
        ? sichtbar.map(([id, text]) => new Option(text, id))
        : [new Option('Diese Ansageart braucht keinen Bahnhof', '')])
    );
    select.disabled = !sichtbar.length;
    if (sichtbar.some(([id]) => id === vorher)) select.value = vorher;
  }

  function einsetzen(name) {
    const feldId = $('v-ziel').value;
    const feld = feldId && form.elements.namedItem(feldId);
    if (!feld) {
      meldung('v-meldung', 'Diese Ansageart braucht keinen Bahnhof. Wähle oben zum Beispiel „Einfahrt“.');
      return;
    }
    feld.value = feldId === 'ueber' && feld.value.trim() ? feld.value.replace(/[,\s]+$/, '') + ', ' + name : name;
    feld.dispatchEvent(new Event('input', { bubbles: true }));
    const text = ZIELFELDER.find(([id]) => id === feldId)[1].replace(' (anhängen)', '');
    meldung('v-meldung', '„' + name + '“ eingesetzt bei „' + text + '“.');
  }

  /* ------------------------------------------------------------------ */
  /* Zuggattungen                                                        */
  /* ------------------------------------------------------------------ */

  function gattungenAufbauen() {
    const ziel = $('g-gruppen');
    for (const art of A.GATTUNGSARTEN) {
      const gruppe = element('section', 'g-gruppe');
      const titel = element('h3', '', art.label);
      titel.id = 'g-' + art.id;
      const liste = element('ul', 'v-liste');
      liste.setAttribute('aria-labelledby', titel.id);
      for (const g of A.ZUGGATTUNGEN.filter((z) => z.art === art.id)) {
        const li = element('li', 'v-zeile g-zeile');
        const name = element('div', 'v-name');
        name.append(element('strong', '', g.name), element('span', 'v-meta', g.info));
        const knopf = element('button', 'knopf-leise v-einsetzen', 'Einsetzen');
        knopf.type = 'button';
        knopf.dataset.gattung = g.id;
        knopf.setAttribute('aria-label', g.name + ' einsetzen');
        li.append(element('span', 'g-kuerzel', g.id), name, knopf);
        liste.append(li);
      }
      gruppe.append(titel, liste);
      ziel.append(gruppe);
    }
  }

  function gattungEinsetzen(id) {
    const select = $('zugart');
    select.value = id;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    const g = A.ZUGGATTUNGEN.find((z) => z.id === id);
    const hinweis = select.closest('[data-feld]').hidden ? ' Sie erscheint bei Ansagearten mit Zugangabe.' : '';
    meldung('g-meldung', '„' + g.id + '“ (' + g.name + ') ist jetzt die Zuggattung.' + hinweis);
  }

  /* ------------------------------------------------------------------ */
  /* Reiter                                                              */
  /* ------------------------------------------------------------------ */

  function reiterWaehlen(knopf) {
    document.querySelectorAll('#verzeichnis [role="tab"]').forEach((k) => {
      const aktiv = k === knopf;
      k.setAttribute('aria-selected', String(aktiv));
      k.tabIndex = aktiv ? 0 : -1;
      $(k.getAttribute('aria-controls')).hidden = !aktiv;
    });
  }

  /* ------------------------------------------------------------------ */
  /* Start                                                               */
  /* ------------------------------------------------------------------ */

  function start() {
    $('anzahl-bahnhoefe').textContent = zahl.format(bahnhoefe.length);
    $('anzahl-gattungen').textContent = zahl.format(A.ZUGGATTUNGEN.length);
    $('v-land').replaceChildren(
      new Option('Alle Bundesländer', ''),
      ...LAENDER.map((name, i) => [name, i])
        .filter(([name]) => name)
        .sort((a, b) => a[0].localeCompare(b[0], 'de'))
        .map(([name, i]) => new Option(name, String(i)))
    );
    if (daten.stand) {
      $('v-quelle').textContent = 'Stationsdaten: ' + daten.quelle + '. Stand: ' + daten.stand + '.';
    }

    gattungenAufbauen();
    zieleAktualisieren();
    filtern();

    let verzoegerung = null;
    $('v-suche').addEventListener('input', () => {
      clearTimeout(verzoegerung);
      verzoegerung = setTimeout(filtern, 90);
    });
    $('v-land').addEventListener('change', filtern);
    $('v-verkehr').addEventListener('change', filtern);
    $('v-mehr').addEventListener('click', weitere);
    $('v-zeilen').addEventListener('click', (e) => {
      const knopf = e.target.closest('[data-name]');
      if (knopf) einsetzen(knopf.dataset.name);
    });
    $('g-gruppen').addEventListener('click', (e) => {
      const knopf = e.target.closest('[data-gattung]');
      if (knopf) gattungEinsetzen(knopf.dataset.gattung);
    });

    /* Das zuletzt benutzte Bahnhofsfeld wird zum Ziel für „Einsetzen“. */
    form.addEventListener('input', zieleAktualisieren);
    form.addEventListener('change', zieleAktualisieren);
    form.addEventListener('focusin', (e) => {
      if (ZIELFELDER.some(([id]) => id === e.target.id)) $('v-ziel').value = e.target.id;
    });

    const reiter = Array.from(document.querySelectorAll('#verzeichnis [role="tab"]'));
    reiter.forEach((k, i) => {
      k.addEventListener('click', () => reiterWaehlen(k));
      k.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const naechster = reiter[(i + (e.key === 'ArrowRight' ? 1 : reiter.length - 1)) % reiter.length];
        reiterWaehlen(naechster);
        naechster.focus();
      });
    });
  }

  start();
})();
