/*
 * Bahnansagen-Generator – Oberfläche.
 */
(function () {
  'use strict';

  const A = window.Ansagen;
  const S = window.Sprecher;
  const form = document.getElementById('ansage-form');
  const $ = (id) => document.getElementById(id);

  const SPEICHER_KEY = 'bahnansagen-generator:v1';
  const EINSTELLUNGEN = {
    gong: 'dreiklang',
    hall: true,
    schlussgong: false,
    englisch: 'auto',
    wiederholen: false,
    tempo: '0.95',
    hoehe: '1',
    stimmeDe: '',
    stimmeEn: '',
  };
  const GRUPPEN = { bahnsteig: 'Am Bahnsteig', zug: 'Im Zug', eigene: 'Eigene' };

  /* Alle Bahnhöfe aus data/bahnhoefe.js; ohne Datendatei die kleine Liste aus ansagen.js. */
  const DATEN = window.BAHNHOFSDATEN && window.BAHNHOFSDATEN.liste;
  const BAHNHOFSNAMEN = DATEN ? DATEN.map((s) => s[0]) : A.BAHNHOEFE;
  /* Zufallszüge: Fernzüge zwischen Fernverkehrshalten, Nahverkehr innerhalb eines Bundeslands. */
  const FERNHALTE = DATEN ? DATEN.filter((s) => s[4] & 3).map((s) => s[0]) : [];
  const NAHVERKEHR_NACH_LAND = DATEN
    ? Object.values(
      DATEN.reduce((laender, s) => {
        if (s[3] && s[4] & 28) (laender[s[3]] = laender[s[3]] || []).push(s[0]);
        return laender;
      }, {})
    ).filter((liste) => liste.length >= 40)
    : [];

  function zufallsBahnhoefe() {
    if (!DATEN) return null;
    return {
      fern: FERNHALTE,
      regional: NAHVERKEHR_NACH_LAND[Math.floor(Math.random() * NAHVERKEHR_NACH_LAND.length)],
    };
  }

  const bearbeitet = { de: false, en: false };
  const gewuenscht = { de: '', en: '' };
  const stimmen = { de: [], en: [] };
  let letzterTyp = null;
  let laufId = 0;
  let spielt = false;

  /* ------------------------------------------------------------------ */
  /* Aufbau                                                              */
  /* ------------------------------------------------------------------ */

  function optionen(select, eintraege) {
    select.replaceChildren(...eintraege.map(([wert, text]) => new Option(text, wert)));
  }

  function aufbauen() {
    const gruppen = $('typgruppen');
    for (const [id, titel] of Object.entries(GRUPPEN)) {
      const gruppe = document.createElement('div');
      gruppe.className = 'typgruppe';
      const label = document.createElement('span');
      label.className = 'gruppe-label';
      label.id = 'gruppe-' + id;
      label.textContent = titel;
      const liste = document.createElement('div');
      liste.className = 'typen';
      liste.setAttribute('role', 'radiogroup');
      liste.setAttribute('aria-labelledby', label.id);
      for (const typ of A.TYPEN.filter((t) => t.gruppe === id)) {
        const l = document.createElement('label');
        l.className = 'typ';
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'typ';
        input.value = typ.id;
        input.id = 'typ-' + typ.id;
        const span = document.createElement('span');
        span.textContent = typ.label;
        l.append(input, span);
        liste.append(l);
      }
      gruppe.append(label, liste);
      gruppen.append(gruppe);
    }

    $('zugart').replaceChildren(
      ...A.GATTUNGSARTEN.map((art) => {
        const gruppe = document.createElement('optgroup');
        gruppe.label = art.label;
        gruppe.append(
          ...A.ZUGGATTUNGEN.filter((g) => g.art === art.id).map((g) => new Option(g.id + ' · ' + g.name, g.id))
        );
        return gruppe;
      })
    );
    optionen($('grund'), A.GRUENDE.map((g) => [g.id, g.label]));
    optionen($('abschnittVon'), A.ABSCHNITTE.map((a) => [a, a]));
    optionen($('abschnittBis'), A.ABSCHNITTE.map((a) => [a, a]));
    optionen($('gong'), [...Object.entries(S.GONGS).map(([id, g]) => [id, g.label]), ['kein', 'Kein Gong']]);
    $('bahnhoefe').replaceChildren(...BAHNHOFSNAMEN.map((b) => new Option(b)));
    $('t-abschnitte').replaceChildren(
      ...A.ABSCHNITTE.map((a) => {
        const li = document.createElement('li');
        li.textContent = a;
        return li;
      })
    );
  }

  /* ------------------------------------------------------------------ */
  /* Formular lesen und schreiben                                        */
  /* ------------------------------------------------------------------ */

  function lesen() {
    const d = {};
    for (const el of form.elements) {
      if (!el.name) continue;
      if (el.type === 'radio') {
        if (el.checked) d[el.name] = el.value;
      } else if (el.type === 'checkbox') {
        d[el.name] = el.checked;
      } else {
        d[el.name] = el.value;
      }
    }
    return d;
  }

  function schreiben(daten) {
    for (const [name, wert] of Object.entries(daten)) {
      const el = form.elements.namedItem(name);
      if (!el) continue;
      if (typeof RadioNodeList !== 'undefined' && el instanceof RadioNodeList) el.value = wert;
      else if (el.type === 'checkbox') el.checked = !!wert;
      else el.value = wert;
    }
  }

  function laden() {
    let gespeichert = {};
    try {
      gespeichert = JSON.parse(localStorage.getItem(SPEICHER_KEY) || '{}') || {};
    } catch (e) {
      gespeichert = {};
    }
    return Object.assign({}, A.STANDARD, EINSTELLUNGEN, gespeichert);
  }

  function speichern(d) {
    try {
      localStorage.setItem(SPEICHER_KEY, JSON.stringify(d));
    } catch (e) {
      /* Speicher nicht verfügbar – die Seite funktioniert trotzdem. */
    }
  }

  /* ------------------------------------------------------------------ */
  /* Anzeige aktualisieren                                               */
  /* ------------------------------------------------------------------ */

  function setze(id, text) {
    const el = $(id);
    el.textContent = text || '';
    el.hidden = !text;
  }

  function tafel(t) {
    const el = $('tafel');
    el.dataset.modus = t.modus;
    setze('t-zeit', t.zeit);
    setze('t-label', t.label);
    setze('t-zug', t.zug);
    setze('t-via', t.via);
    setze('t-ziel', t.ziel);
    setze('t-hinweis', t.hinweis);
    setze('t-plus', t.verspaetung ? '+' + t.verspaetung : '');
    $('t-gleis').textContent = t.gleis;
    $('t-gleis-box').hidden = !t.gleis;
    $('t-ziel').classList.toggle('ausgefallen', !!t.ausfall);

    const abschnitte = $('t-abschnitte');
    abschnitte.hidden = t.modus !== 'bahnsteig';
    Array.from(abschnitte.children).forEach((li, i) => {
      const erste = !!t.ersteKlasse && i >= t.ersteKlasse.von && i <= t.ersteKlasse.bis;
      li.classList.toggle('erste', erste);
    });

    const teile = [t.label, t.zeit, t.zug, t.ziel, t.gleis ? 'Gleis ' + t.gleis : '', t.hinweis];
    el.setAttribute('aria-label', 'Anzeige: ' + teile.filter(Boolean).join(', '));
  }

  function zahl(wert) {
    return Number(wert).toFixed(2).replace('.', ',') + '×';
  }

  function aktualisieren() {
    const d = lesen();
    if (d.typ !== letzterTyp) {
      bearbeitet.de = false;
      bearbeitet.en = false;
      letzterTyp = d.typ;
    }

    for (const el of document.querySelectorAll('[data-feld]')) {
      el.hidden = !(A.FELDER[el.dataset.feld] || []).includes(d.typ);
    }
    $('ueber-label').textContent = d.typ === 'begruessung' ? 'Nächste Halte' : 'Über';

    const r = A.bauen(d.typ, d);
    if (!bearbeitet.de) $('text-de').value = r.de;
    if (!bearbeitet.en) $('text-en').value = r.en;
    $('bearbeitet-de').hidden = !bearbeitet.de;
    $('bearbeitet-en').hidden = !bearbeitet.en;
    $('block-en').hidden = !(r.en && A.englischAktiv(d));

    tafel(r.tafel);
    $('tempo-wert').textContent = zahl(d.tempo);
    $('hoehe-wert').textContent = zahl(d.hoehe);
    speichern(d);
  }

  /* ------------------------------------------------------------------ */
  /* Stimmen                                                             */
  /* ------------------------------------------------------------------ */

  function stimmenFuellen() {
    stimmen.de = S.stimmenFuer('de', 'de-de');
    stimmen.en = S.stimmenFuer('en', 'en-gb');

    for (const [sprache, feld] of [['de', 'stimmeDe'], ['en', 'stimmeEn']]) {
      const select = $(feld);
      const vorher = select.value || gewuenscht[sprache];
      const liste = stimmen[sprache];
      optionen(select, [
        ['', liste.length ? 'Automatisch (' + liste[0].name + ')' : 'Standardstimme des Geräts'],
        ...liste.map((v) => [v.voiceURI, v.name + ' · ' + v.lang]),
      ]);
      if (liste.some((v) => v.voiceURI === vorher)) select.value = vorher;
    }
    if (stimmen.de.length || stimmen.en.length) speichern(lesen());

    const hinweis = $('stimmen-hinweis');
    if (!S.sprachausgabe) {
      hinweis.innerHTML =
        '<strong>Dieser Browser hat keine Sprachausgabe.</strong> Der Gong funktioniert trotzdem. ' +
        'Probiere einen aktuellen Chrome, Edge, Safari oder Firefox.';
    } else if (!stimmen.de.length) {
      hinweis.innerHTML =
        '<strong>Keine deutsche Stimme gefunden.</strong> Installiere in den Spracheinstellungen deines ' +
        'Systems eine deutsche Sprachausgabe oder nutze Edge bzw. Chrome, die eigene Stimmen mitbringen.';
    } else {
      hinweis.textContent =
        'Gesprochen wird mit den Stimmen deines Geräts (' + stimmen.de.length + ' deutsche gefunden). ' +
        'Am natürlichsten klingen die „Natural“-Stimmen in Microsoft Edge und „Google Deutsch“ in Chrome.';
    }
  }

  function stimmeFuer(sprache) {
    const uri = $(sprache === 'de' ? 'stimmeDe' : 'stimmeEn').value;
    const liste = stimmen[sprache];
    return liste.find((v) => v.voiceURI === uri) || liste[0] || null;
  }

  /* ------------------------------------------------------------------ */
  /* Wiedergabe                                                          */
  /* ------------------------------------------------------------------ */

  function warten(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function status(text) {
    document.querySelectorAll('[data-status]').forEach((el) => {
      el.textContent = text;
    });
  }

  function anzeigeSpielt(an) {
    spielt = an;
    document.body.classList.toggle('spielt', an);
    $('tafel').classList.toggle('live', an);
    document.querySelectorAll('[data-play] .play-text').forEach((el) => {
      el.textContent = an ? 'Stopp' : 'Ansage abspielen';
    });
  }

  async function abspielen() {
    if (spielt) {
      stoppen();
      return;
    }
    const id = ++laufId;
    const abgebrochen = () => id !== laufId;
    S.stoppen();
    S.freischalten();
    anzeigeSpielt(true);

    const d = lesen();
    const de = $('text-de').value.trim();
    const en = $('block-en').hidden ? '' : $('text-en').value.trim();
    const opt = (sprache) => ({
      stimme: stimmeFuer(sprache),
      lang: sprache === 'de' ? 'de-DE' : 'en-GB',
      tempo: Number(d.tempo) || 1,
      hoehe: Number(d.hoehe) || 1,
    });

    try {
      if (d.gong !== 'kein') {
        status('Gong');
        await S.gong(d.gong, { hall: d.hall });
      }
      if (abgebrochen()) return;
      await warten(150);

      if (de && !abgebrochen()) {
        status('Spricht Deutsch');
        await S.sprechen(A.sprechtextDe(de), opt('de'), abgebrochen);
      }
      if (de && d.wiederholen && !abgebrochen()) {
        await warten(450);
        status('Wiederholung');
        await S.sprechen(A.sprechtextDe('Ich wiederhole: ' + de), opt('de'), abgebrochen);
      }
      if (en && !abgebrochen()) {
        await warten(500);
        status('Spricht Englisch');
        await S.sprechen(A.sprechtextEn(en), opt('en'), abgebrochen);
      }
      if (d.schlussgong && d.gong !== 'kein' && !abgebrochen()) {
        await warten(300);
        status('Gong');
        await S.gong(d.gong, { hall: d.hall, rueckwaerts: true });
      }
      if (!abgebrochen()) status(S.sprachausgabe ? 'Fertig' : 'Gong gespielt, keine Sprachausgabe');
    } finally {
      if (id === laufId) anzeigeSpielt(false);
    }
  }

  function stoppen() {
    laufId++;
    S.stoppen();
    anzeigeSpielt(false);
    status('Gestoppt');
  }

  /* ------------------------------------------------------------------ */
  /* Aktionen                                                            */
  /* ------------------------------------------------------------------ */

  async function kopieren(knopf) {
    const text = [$('text-de').value.trim(), $('block-en').hidden ? '' : $('text-en').value.trim()]
      .filter(Boolean)
      .join('\n\n');
    const alt = knopf.textContent;
    try {
      await navigator.clipboard.writeText(text);
      knopf.textContent = 'Kopiert';
    } catch (e) {
      const feld = $('text-de');
      feld.focus();
      feld.select();
      knopf.textContent = 'Markiert – Strg+C';
    }
    setTimeout(() => {
      knopf.textContent = alt;
    }, 1600);
  }

  function neuErzeugen() {
    bearbeitet.de = false;
    bearbeitet.en = false;
    aktualisieren();
  }

  function verbinden() {
    const beiEingabe = (e) => {
      const ziel = e.target;
      if (ziel.id === 'text-de' || ziel.id === 'text-en') {
        const sprache = ziel.id === 'text-de' ? 'de' : 'en';
        bearbeitet[sprache] = true;
        $('bearbeitet-' + sprache).hidden = false;
        return;
      }
      if (ziel.name) aktualisieren();
    };
    form.addEventListener('input', beiEingabe);
    form.addEventListener('change', beiEingabe);
    form.addEventListener('submit', (e) => e.preventDefault());

    document.querySelectorAll('[data-play]').forEach((k) => k.addEventListener('click', abspielen));
    document.querySelectorAll('[data-neu]').forEach((k) =>
      k.addEventListener('click', () => {
        bearbeitet[k.dataset.neu] = false;
        aktualisieren();
      })
    );

    $('zufall').addEventListener('click', () => {
      schreiben(A.zufallsDaten(Math.random, zufallsBahnhoefe()));
      neuErzeugen();
    });
    $('beispiel').addEventListener('click', () => {
      const typ = lesen().typ;
      schreiben(Object.assign({}, A.STANDARD, { typ: typ }));
      neuErzeugen();
    });
    $('kopieren').addEventListener('click', (e) => kopieren(e.currentTarget));
    $('gong-test').addEventListener('click', () => {
      const d = lesen();
      S.gong(d.gong === 'kein' ? 'dreiklang' : d.gong, { hall: d.hall });
    });

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        abspielen();
      } else if (e.key === 'Escape' && spielt) {
        stoppen();
      }
    });

    /* Mobile Abspielleiste ausblenden, solange der Hauptknopf sichtbar ist. */
    if ('IntersectionObserver' in window) {
      const leiste = $('mobil-leiste');
      new IntersectionObserver((eintraege) => {
        leiste.classList.toggle('versteckt', eintraege[0].isIntersecting);
      }).observe($('play'));
    }
  }

  /* ------------------------------------------------------------------ */
  /* Start                                                               */
  /* ------------------------------------------------------------------ */

  aufbauen();
  const start = laden();
  gewuenscht.de = start.stimmeDe || '';
  gewuenscht.en = start.stimmeEn || '';
  schreiben(start);
  if (!lesen().typ) schreiben({ typ: A.STANDARD.typ });
  aktualisieren();
  verbinden();
  S.beiStimmen(stimmenFuellen);
})();
