/*
 * Bahnansagen-Generator – Textbausteine und Sprachaufbereitung.
 *
 * Reine Funktionen ohne DOM-Zugriff. Die Datei läuft im Browser (globales
 * Objekt `Ansagen`) und in Node (module.exports), damit sie testbar bleibt.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Ansagen = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Stammdaten                                                          */
  /* ------------------------------------------------------------------ */

  const TYPEN = [
    { id: 'einfahrt', label: 'Einfahrt', gruppe: 'bahnsteig' },
    { id: 'abfahrt', label: 'Abfahrt', gruppe: 'bahnsteig' },
    { id: 'verspaetung', label: 'Verspätung', gruppe: 'bahnsteig' },
    { id: 'gleiswechsel', label: 'Gleiswechsel', gruppe: 'bahnsteig' },
    { id: 'ausfall', label: 'Zugausfall', gruppe: 'bahnsteig' },
    { id: 'wagenreihung', label: 'Wagenreihung', gruppe: 'bahnsteig' },
    { id: 'zugteilung', label: 'Zugteilung', gruppe: 'bahnsteig' },
    { id: 'durchfahrt', label: 'Durchfahrt', gruppe: 'bahnsteig' },
    { id: 'sev', label: 'Ersatzverkehr', gruppe: 'bahnsteig' },
    { id: 'begruessung', label: 'Begrüßung', gruppe: 'zug' },
    { id: 'naechsterhalt', label: 'Nächster Halt', gruppe: 'zug' },
    { id: 'freitext', label: 'Freitext', gruppe: 'eigene' },
  ];

  /* Zuggattungen im Personenverkehr in Deutschland. `sprich` ist die Aussprache. */
  const GATTUNGSARTEN = [
    { id: 'fern', label: 'Fernverkehr' },
    { id: 'nacht', label: 'Nachtzüge' },
    { id: 'regio', label: 'Regionalverkehr' },
    { id: 's', label: 'S-Bahn' },
  ];

  const ZUGGATTUNGEN = [
    { id: 'ICE', name: 'Intercity-Express', art: 'fern', sprich: 'I C E', info: 'Hochgeschwindigkeitszüge der DB Fernverkehr, auch ins benachbarte Ausland' },
    { id: 'ECE', name: 'Eurocity-Express', art: 'fern', sprich: 'E C E', info: 'Schnelle internationale Züge, z. B. Frankfurt–Mailand und München–Zürich' },
    { id: 'IC', name: 'Intercity', art: 'fern', sprich: 'I C', info: 'Fernverkehrszüge der DB, teils als doppelstöckiger Intercity 2' },
    { id: 'EC', name: 'Eurocity', art: 'fern', sprich: 'E C', info: 'Internationale Fernverkehrszüge mit Partnerbahnen aus den Nachbarländern' },
    { id: 'RJX', name: 'Railjet Xpress', art: 'fern', sprich: 'Railjet Express', info: 'Schnelle Railjets der ÖBB mit wenigen Halten, z. B. München–Wien' },
    { id: 'RJ', name: 'Railjet', art: 'fern', sprich: 'Railjet', info: 'Fernverkehrszüge der ÖBB zwischen Deutschland und Österreich' },
    { id: 'TGV', name: 'TGV', art: 'fern', sprich: 'T G V', info: 'Hochgeschwindigkeitszüge der SNCF, z. B. Paris–Frankfurt und Paris–Stuttgart–München' },
    { id: 'EST', name: 'Eurostar', art: 'fern', sprich: 'Eurostar', info: 'Hochgeschwindigkeitszüge aus Paris und Brüssel nach Köln und ins Ruhrgebiet (früher Thalys)' },
    { id: 'FLX', name: 'Flixtrain', art: 'fern', sprich: 'Flixtrain', info: 'Fernzüge des privaten Anbieters Flix' },
    { id: 'NJ', name: 'Nightjet', art: 'nacht', sprich: 'Nightjet', info: 'Nachtzüge der ÖBB mit Sitz-, Liege- und Schlafwagen' },
    { id: 'EN', name: 'EuroNight', art: 'nacht', sprich: 'Euro-Night', info: 'Internationale Nachtzüge verschiedener europäischer Bahnen' },
    { id: 'ES', name: 'European Sleeper', art: 'nacht', sprich: 'European Sleeper', info: 'Nachtzug eines niederländisch-belgischen Anbieters, u. a. Brüssel–Berlin–Prag' },
    { id: 'IRE', name: 'Interregio-Express', art: 'regio', sprich: 'I R E', info: 'Schnelle Regionalzüge über längere Strecken mit wenigen Halten' },
    { id: 'RE', name: 'Regional-Express', art: 'regio', sprich: 'R E', info: 'Regionalzüge mit weniger Halten als die Regionalbahn' },
    { id: 'MEX', name: 'Metropolexpress', art: 'regio', sprich: 'M E X', info: 'Regionalzüge in der Region Stuttgart (Baden-Württemberg)' },
    { id: 'RB', name: 'Regionalbahn', art: 'regio', sprich: 'R B', info: 'Regionalzüge mit Halt an allen Stationen' },
    { id: 'TER', name: 'TER', art: 'regio', sprich: 'T E R', info: 'Französische Regionalzüge im grenzüberschreitenden Verkehr, z. B. Straßburg–Offenburg' },
    { id: 'REX', name: 'Regionalexpress (Österreich)', art: 'regio', sprich: 'R E X', info: 'Österreichische Regionalzüge im grenznahen Verkehr' },
    { id: 'R', name: 'Regionalzug', art: 'regio', sprich: 'R', info: 'Regionalzüge aus Österreich und der Schweiz im grenznahen Verkehr' },
    { id: 'S', name: 'S-Bahn', art: 's', sprich: 'S', info: 'Schnellbahnen in Ballungsräumen' },
    { id: 'RS', name: 'Regio-S-Bahn', art: 's', sprich: 'R S', info: 'Regionale S-Bahn-Linien, z. B. rund um Bremen' },
  ];

  const ZUGARTEN = ZUGGATTUNGEN.map((g) => g.id);
  /* Fern- und Nachtzüge bekommen im Automatikmodus eine englische Ansage. */
  const FERNVERKEHR = ZUGGATTUNGEN.filter((g) => g.art === 'fern' || g.art === 'nacht').map((g) => g.id);
  /* Regionalbahn und S-Bahn sind feminin: „in der S 1“, sonst „im ICE“. */
  const FEMININ = ['RB', 'S', 'RS'];

  const ABSCHNITTE = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

  /* Welche Formularfelder bei welcher Ansageart gebraucht werden. */
  const FELDER = {
    zug: ['einfahrt', 'abfahrt', 'verspaetung', 'gleiswechsel', 'ausfall', 'wagenreihung', 'zugteilung', 'sev', 'begruessung'],
    gleis: ['einfahrt', 'abfahrt', 'verspaetung', 'gleiswechsel', 'ausfall', 'wagenreihung', 'zugteilung', 'durchfahrt'],
    zeit: ['einfahrt', 'abfahrt', 'verspaetung', 'gleiswechsel', 'ausfall', 'wagenreihung', 'zugteilung', 'sev'],
    ziel: ['einfahrt', 'abfahrt', 'verspaetung', 'gleiswechsel', 'ausfall', 'wagenreihung', 'zugteilung', 'sev', 'begruessung'],
    ueber: ['einfahrt', 'abfahrt', 'begruessung'],
    verspaetung: ['verspaetung'],
    grund: ['verspaetung', 'ausfall', 'sev'],
    neuesGleis: ['gleiswechsel'],
    abschnitte: ['wagenreihung'],
    zielHinten: ['zugteilung'],
    teilungBhf: ['zugteilung'],
    sev: ['sev'],
    halt: ['naechsterhalt'],
    freitext: ['freitext'],
  };

  /* Gründe: `de` steht im Satz „Grund dafür ist/sind …“, `en` in „This is due to …“. */
  const GRUENDE = [
    { id: '', label: 'Ohne Grund', de: '', en: '' },
    { id: 'betriebsablauf', label: 'Verzögerungen im Betriebsablauf', de: 'Verzögerungen im Betriebsablauf', en: 'operational delays', plural: true },
    { id: 'reparatur', label: 'Reparatur am Zug', de: 'eine Reparatur am Zug', en: 'repairs to the train' },
    { id: 'strecke', label: 'Störung an der Strecke', de: 'eine Störung an der Strecke', en: 'a fault on the line' },
    { id: 'signal', label: 'Signalstörung', de: 'eine Signalstörung', en: 'a signal failure' },
    { id: 'weiche', label: 'Weichenstörung', de: 'eine Weichenstörung', en: 'a points failure' },
    { id: 'stellwerk', label: 'Stellwerksstörung', de: 'eine Stellwerksstörung', en: 'a signal box failure' },
    { id: 'oberleitung', label: 'Störung an der Oberleitung', de: 'eine Störung an der Oberleitung', en: 'a fault with the overhead line' },
    { id: 'vorausfahrend', label: 'Verspätung eines vorausfahrenden Zuges', de: 'die Verspätung eines vorausfahrenden Zuges', en: 'the late running of a preceding train' },
    { id: 'bereitstellung', label: 'Verspätete Bereitstellung', de: 'die verspätete Bereitstellung des Zuges', en: 'the late provision of the train' },
    { id: 'anschluss', label: 'Warten auf Anschlussreisende', de: 'das Warten auf Anschlussreisende', en: 'waiting for connecting passengers' },
    { id: 'bauarbeiten', label: 'Bauarbeiten', de: 'Bauarbeiten', en: 'engineering works', plural: true },
    { id: 'personen', label: 'Personen im Gleis', de: 'Personen im Gleis', en: 'people on the track', plural: true },
    { id: 'tiere', label: 'Tiere auf der Strecke', de: 'Tiere auf der Strecke', en: 'animals on the track', plural: true },
    { id: 'baum', label: 'Baum auf der Strecke', de: 'ein umgestürzter Baum auf der Strecke', en: 'a fallen tree on the line' },
    { id: 'unwetter', label: 'Unwetter', de: 'ein Unwetter', en: 'severe weather' },
    { id: 'polizei', label: 'Polizeieinsatz', de: 'ein Polizeieinsatz', en: 'a police operation' },
    { id: 'notarzt', label: 'Notarzteinsatz', de: 'ein Notarzteinsatz', en: 'a medical emergency' },
    { id: 'personal', label: 'Erkrankung des Personals', de: 'eine kurzfristige Erkrankung des Personals', en: 'short-notice staff illness' },
  ];
  const GRUND_NACH_ID = Object.fromEntries(GRUENDE.map((g) => [g.id, g]));

  const FERN_BAHNHOEFE = [
    'Aachen Hbf', 'Basel SBB', 'Berlin Hbf', 'Berlin Südkreuz', 'Bremen Hbf', 'Dortmund Hbf',
    'Dresden Hbf', 'Düsseldorf Hbf', 'Erfurt Hbf', 'Essen Hbf', 'Frankfurt (Main) Hbf',
    'Freiburg (Breisgau) Hbf', 'Hamburg Hbf', 'Hamburg-Altona', 'Hannover Hbf',
    'Karlsruhe Hbf', 'Kassel-Wilhelmshöhe', 'Kiel Hbf', 'Köln Hbf', 'Leipzig Hbf',
    'Mannheim Hbf', 'München Hbf', 'Münster (Westf) Hbf', 'Nürnberg Hbf', 'Ostseebad Binz',
    'Passau Hbf', 'Rostock Hbf', 'Saarbrücken Hbf', 'Stuttgart Hbf', 'Westerland (Sylt)',
    'Würzburg Hbf',
  ];
  const REGIONAL_BAHNHOEFE = [
    'Bad Harzburg', 'Bremerhaven Hbf', 'Flughafen BER', 'Gießen', 'Göttingen', 'Koblenz Hbf',
    'Lüneburg', 'Mönchengladbach Hbf', 'Neustadt (Weinstr) Hbf', 'Paderborn Hbf', 'Plattling',
    'Rosenheim', 'Treuchtlingen', 'Uelzen', 'Warnemünde', 'Wolfsburg Hbf', 'Flughafen',
  ];
  const BAHNHOEFE = Array.from(new Set([...FERN_BAHNHOEFE, ...REGIONAL_BAHNHOEFE])).sort((a, b) =>
    a.localeCompare(b, 'de')
  );

  const STANDARD = {
    typ: 'einfahrt',
    zugart: 'ICE',
    nummer: '578',
    gleis: '7',
    zeit: '14:32',
    ziel: 'Hamburg-Altona',
    ueber: 'Hannover Hbf, Hamburg Hbf',
    verspaetung: '20',
    grund: 'betriebsablauf',
    neuesGleis: '12',
    abschnittVon: 'D',
    abschnittBis: 'E',
    zielHinten: 'Kiel Hbf',
    teilungBhf: 'Hamburg Hbf',
    sevVon: 'Lüneburg',
    sevBis: 'Uelzen',
    sevHalt: 'Bahnhofsvorplatz, Bussteig 2',
    halt: 'Hannover Hbf',
    ausstieg: 'rechts',
    anschluesse: 'S 5 nach Flughafen, RE 2 nach Göttingen',
    freitext:
      'Bitte lassen Sie Ihr Gepäck nicht unbeaufsichtigt. Unbeaufsichtigte Gepäckstücke werden entfernt.',
  };

  /* ------------------------------------------------------------------ */
  /* Hilfsfunktionen                                                     */
  /* ------------------------------------------------------------------ */

  function wert(v) {
    return v == null ? '' : String(v).trim();
  }

  function splitListe(text) {
    return wert(text)
      .split(/[,;\n]/)
      .map((t) => t.trim())
      .filter(Boolean);
  }

  /* ['A', 'B', 'C'] → „A, B und C“ */
  function liste(teile, und) {
    const a = teile.filter(Boolean);
    if (a.length <= 1) return a.join('');
    return a.slice(0, -1).join(', ') + ' ' + und + ' ' + a[a.length - 1];
  }

  function zugName(d) {
    const name = [wert(d.zugart), wert(d.nummer)].filter(Boolean).join(' ');
    return name || 'Zug';
  }

  function artikelIm(d) {
    return FEMININ.includes(wert(d.zugart)) ? 'in der' : 'im';
  }

  function abschnittsBereich(d) {
    let von = ABSCHNITTE.indexOf(wert(d.abschnittVon));
    let bis = ABSCHNITTE.indexOf(wert(d.abschnittBis));
    if (von < 0) von = 0;
    if (bis < 0) bis = von;
    if (bis < von) [von, bis] = [bis, von];
    return { von: ABSCHNITTE[von], bis: ABSCHNITTE[bis], vonIndex: von, bisIndex: bis };
  }

  function minuten(n, sprache) {
    if (sprache === 'en') return n === 1 ? '1 minute' : n + ' minutes';
    return n === 1 ? '1 Minute' : n + ' Minuten';
  }

  function grundSatz(d, sprache) {
    const g = GRUND_NACH_ID[wert(d.grund)];
    if (!g || !g.id) return '';
    if (sprache === 'en') return ' This is due to ' + g.en + '.';
    return ' Grund dafür ' + (g.plural ? 'sind ' : 'ist ') + g.de + '.';
  }

  function oder(v, ersatz) {
    return wert(v) || ersatz;
  }

  /* ------------------------------------------------------------------ */
  /* Ansagen bauen                                                       */
  /* ------------------------------------------------------------------ */

  /**
   * Baut Ansagetext (de/en) und die Daten für die Anzeigetafel.
   * @param {string} typ  eine der TYPEN-IDs
   * @param {object} d    Formulardaten (alle Werte als Strings)
   * @returns {{de: string, en: string, tafel: object}}
   */
  function bauen(typ, d) {
    d = d || {};
    const zug = zugName(d);
    const ziel = wert(d.ziel);
    const via = splitListe(d.ueber);
    const zeit = wert(d.zeit);
    const gleis = oder(d.gleis, '?');

    const nachDe = ziel ? ' nach ' + ziel : '';
    const nachEn = ziel ? ' to ' + ziel : '';
    const ueberDe = via.length ? ' über ' + liste(via, 'und') : '';
    const ueberEn = via.length ? ' via ' + liste(via, 'and') : '';

    const tafel = {
      modus: 'bahnsteig',
      label: '',
      zeit: zeit,
      gleis: wert(d.gleis),
      zug: zug,
      via: via.join(' – '),
      ziel: ziel,
      hinweis: '',
      verspaetung: 0,
      ausfall: false,
      ersteKlasse: null,
    };

    let de = '';
    let en = '';

    switch (typ) {
      case 'einfahrt':
        de = 'Auf Gleis ' + gleis + ' fährt ein: ' + zug + nachDe + ueberDe + '.' +
          (zeit ? ' Die Abfahrt ist um ' + zeit + ' Uhr.' : '') +
          ' Bitte Vorsicht bei der Einfahrt.';
        en = 'Now arriving at platform ' + gleis + ': ' + zug + nachEn + ueberEn + '.' +
          (zeit ? ' Departure ' + zeit + '.' : '') +
          ' Please stand back from the platform edge.';
        tafel.hinweis = 'Vorsicht bei der Einfahrt';
        break;

      case 'abfahrt':
        de = 'Gleis ' + gleis + ': ' + zug + nachDe + ueberDe +
          (zeit ? ', Abfahrt ' + zeit + ' Uhr' : '') +
          '. Bitte einsteigen! Die Türen schließen selbsttätig. Vorsicht bei der Abfahrt.';
        en = 'Platform ' + gleis + ': ' + zug + nachEn + ueberEn +
          (zeit ? ', departing ' + zeit : '') +
          '. Please board now. The doors close automatically. Please stand back.';
        tafel.hinweis = 'Bitte einsteigen – Türen schließen selbsttätig';
        break;

      case 'verspaetung': {
        const n = Math.max(1, parseInt(d.verspaetung, 10) || 0);
        de = 'Information zu ' + zug + nachDe +
          (zeit ? ', planmäßige Abfahrt ' + zeit + ' Uhr' : '') +
          ': Dieser Zug hat heute circa ' + minuten(n, 'de') + ' Verspätung.' +
          grundSatz(d, 'de') + ' Wir bitten um Entschuldigung.';
        en = 'Information about ' + zug + nachEn +
          (zeit ? ', scheduled departure ' + zeit : '') +
          ': This train is running approximately ' + minuten(n, 'en') + ' late today.' +
          grundSatz(d, 'en') + ' We apologise for the inconvenience.';
        tafel.verspaetung = n;
        tafel.hinweis = 'Heute ca. ' + n + ' Min. später';
        break;
      }

      case 'gleiswechsel': {
        const neu = oder(d.neuesGleis, '?');
        de = 'Achtung an Gleis ' + gleis + ': ' + zug + nachDe +
          (zeit ? ', planmäßige Abfahrt ' + zeit + ' Uhr,' : '') +
          ' fährt heute von Gleis ' + neu + ' ab. Bitte beachten Sie den Gleiswechsel.';
        en = 'Attention please, platform ' + gleis + ': ' + zug + nachEn +
          (zeit ? ', scheduled departure ' + zeit + ',' : '') +
          ' will depart from platform ' + neu + ' today. Please note the change of platform.';
        tafel.hinweis = 'Gleiswechsel – heute von Gleis ' + neu;
        break;
      }

      case 'ausfall':
        de = 'Information zu ' + zug + nachDe +
          (zeit ? ', planmäßige Abfahrt ' + zeit + ' Uhr' : '') +
          ': Dieser Zug fällt heute aus.' + grundSatz(d, 'de') +
          ' Bitte informieren Sie sich über alternative Verbindungen. Wir bitten um Entschuldigung.';
        en = 'Information about ' + zug + nachEn +
          (zeit ? ', scheduled departure ' + zeit : '') +
          ': This train has been cancelled today.' + grundSatz(d, 'en') +
          ' Please check for alternative connections. We apologise for the inconvenience.';
        tafel.ausfall = true;
        tafel.hinweis = 'Fällt heute aus';
        break;

      case 'wagenreihung': {
        const b = abschnittsBereich(d);
        const einAbschnitt = b.von === b.bis;
        de = 'Gleis ' + gleis + ': ' + zug + nachDe +
          (zeit ? ', Abfahrt ' + zeit + ' Uhr,' : '') +
          ' fährt heute in umgekehrter Wagenreihung. Die Wagen der ersten Klasse halten ' +
          (einAbschnitt ? 'im Abschnitt ' + b.von : 'in den Abschnitten ' + b.von + ' bis ' + b.bis) + '.';
        en = 'Platform ' + gleis + ': ' + zug + nachEn +
          (zeit ? ', departing ' + zeit + ',' : '') +
          ' is running in reverse carriage order today. First class carriages will stop in ' +
          (einAbschnitt ? 'section ' + b.von : 'sections ' + b.von + ' to ' + b.bis) + '.';
        tafel.hinweis = 'Umgekehrte Wagenreihung';
        tafel.ersteKlasse = { von: b.vonIndex, bis: b.bisIndex };
        break;
      }

      case 'zugteilung': {
        const vorne = oder(d.ziel, '…');
        const hinten = oder(d.zielHinten, '…');
        const teil = oder(d.teilungBhf, '…');
        de = 'Gleis ' + gleis + ': ' + zug + ' nach ' + vorne + ' und ' + hinten +
          (zeit ? ', Abfahrt ' + zeit + ' Uhr' : '') +
          '. Bitte beachten Sie: Dieser Zug wird in ' + teil + ' geteilt. ' +
          'Die vorderen Wagen fahren nach ' + vorne + ', die hinteren Wagen nach ' + hinten + '. ' +
          'Bitte achten Sie auf die Zuglaufschilder an den Wagen.';
        en = 'Platform ' + gleis + ': ' + zug + ' to ' + vorne + ' and ' + hinten +
          (zeit ? ', departing ' + zeit : '') +
          '. Please note: this train will divide at ' + teil + '. ' +
          'The front carriages continue to ' + vorne + ', the rear carriages to ' + hinten + '. ' +
          'Please check the destination signs on the carriages.';
        tafel.ziel = vorne + ' / ' + hinten;
        tafel.hinweis = 'Zugteilung in ' + teil;
        break;
      }

      case 'durchfahrt':
        de = 'Achtung an Gleis ' + gleis + ': Vorsicht bei der Durchfahrt! ' +
          'Bitte treten Sie von der Bahnsteigkante zurück.';
        en = 'Attention on platform ' + gleis + ': a train is passing through. ' +
          'Please stand back from the platform edge.';
        Object.assign(tafel, {
          modus: 'durchfahrt', zeit: '', zug: '', via: '',
          ziel: 'Zugdurchfahrt', hinweis: 'Bitte zurückbleiben',
        });
        break;

      case 'sev': {
        const von = oder(d.sevVon, '…');
        const bis = oder(d.sevBis, '…');
        const halt = wert(d.sevHalt);
        de = 'Information zu ' + zug + nachDe + ': Zwischen ' + von + ' und ' + bis +
          ' fahren heute keine Züge.' + grundSatz(d, 'de') +
          ' Bitte nutzen Sie den Ersatzverkehr mit Bussen.' +
          (halt ? ' Die Ersatzbusse fahren ab ' + halt + '.' : '') +
          ' Bitte planen Sie mehr Reisezeit ein.';
        en = 'Information about ' + zug + nachEn + ': There are no trains between ' + von +
          ' and ' + bis + ' today.' + grundSatz(d, 'en') +
          ' Please use the replacement bus service.' +
          (halt ? ' Replacement buses depart from ' + halt + '.' : '') +
          ' Please allow extra time for your journey.';
        tafel.gleis = '';
        tafel.via = '';
        tafel.hinweis = 'Ersatzverkehr mit Bussen ' + von + ' – ' + bis;
        break;
      }

      case 'begruessung':
        de = 'Herzlich willkommen ' + artikelIm(d) + ' ' + zug + nachDe + '.' +
          (via.length === 1 ? ' Unser nächster Halt ist ' + via[0] + '.' : '') +
          (via.length > 1 ? ' Unsere nächsten Halte sind ' + liste(via, 'und') + '.' : '') +
          ' Wir wünschen Ihnen eine angenehme Reise.';
        en = 'Welcome aboard ' + zug + nachEn + '.' +
          (via.length === 1 ? ' Our next stop is ' + via[0] + '.' : '') +
          (via.length > 1 ? ' Our next stops are ' + liste(via, 'and') + '.' : '') +
          ' We wish you a pleasant journey.';
        Object.assign(tafel, {
          modus: 'bord', label: 'Willkommen an Bord', zeit: '', gleis: '',
          via: via.length ? 'Nächste Halte: ' + via.join(', ') : '',
        });
        break;

      case 'naechsterhalt': {
        const halt = oder(d.halt, '…');
        const seite = wert(d.ausstieg);
        const anschl = splitListe(d.anschluesse);
        de = 'Nächster Halt: ' + halt + '.' +
          (seite ? ' Ausstieg in Fahrtrichtung ' + seite + '.' : '') +
          (anschl.length ? ' Sie haben Anschluss an ' + liste(anschl, 'und') + '.' : '') +
          ' Bitte denken Sie beim Aussteigen an Ihr Gepäck.';
        en = 'Next stop: ' + halt + '.' +
          (seite ? ' Exit on the ' + (seite === 'links' ? 'left' : 'right') + '-hand side.' : '') +
          (anschl.length
            ? ' Connecting services: ' + liste(anschl.map((a) => a.replace(/\bnach\b/g, 'to')), 'and') + '.'
            : '') +
          ' Please remember to take all your belongings with you.';
        Object.assign(tafel, {
          modus: 'bord', label: 'Nächster Halt', zeit: '', gleis: '', zug: '',
          ziel: halt,
          via: seite ? 'Ausstieg in Fahrtrichtung ' + seite : '',
          hinweis: anschl.length ? 'Anschluss: ' + anschl.join(', ') : '',
        });
        break;
      }

      case 'freitext':
      default: {
        de = wert(d.freitext);
        en = '';
        Object.assign(tafel, {
          modus: 'info', label: 'Information', zeit: '', gleis: '', zug: '', via: '', ziel: '',
          hinweis: de.length > 160 ? de.slice(0, 157).trimEnd() + '…' : de,
        });
        break;
      }
    }

    return { de: de, en: en, tafel: tafel };
  }

  /* Englisch: „auto“ spricht Englisch nur im Fernverkehr, wie an großen Bahnhöfen üblich. */
  function englischAktiv(d) {
    d = d || {};
    if (d.typ === 'freitext') return false;
    if (d.englisch === 'immer') return true;
    if (d.englisch === 'nie') return false;
    return FERNVERKEHR.includes(wert(d.zugart));
  }

  /* ------------------------------------------------------------------ */
  /* Sprachaufbereitung: Abkürzungen ausschreiben, Uhrzeiten aussprechen  */
  /* ------------------------------------------------------------------ */

  /* Klammerzusätze in Bahnhofsnamen: „Halle (Saale)“ → „Halle an der Saale“. */
  const FLUESSE = {
    M: 'am Main', Main: 'am Main', Rhein: 'am Rhein', Neckar: 'am Neckar', Inn: 'am Inn', Lech: 'am Lech',
    Oder: 'an der Oder', Saale: 'an der Saale', Lahn: 'an der Lahn', Sieg: 'an der Sieg', Donau: 'an der Donau',
    Mosel: 'an der Mosel', Elbe: 'an der Elbe', Ruhr: 'an der Ruhr', Nahe: 'an der Nahe', Enz: 'an der Enz',
    Elster: 'an der Elster', Pegnitz: 'an der Pegnitz', Leine: 'an der Leine', Fils: 'an der Fils',
    Murr: 'an der Murr', Ilm: 'an der Ilm', Ems: 'an der Ems', Isar: 'an der Isar', Havel: 'an der Havel',
    Spree: 'an der Spree', Werra: 'an der Werra', Unstrut: 'an der Unstrut', Tauber: 'an der Tauber',
    Aisch: 'an der Aisch', Iller: 'an der Iller', Breisgau: 'im Breisgau', Weinstr: 'an der Weinstraße',
  };
  const ABKUERZUNGEN = {
    b: 'bei', 'b.': 'bei', Kr: 'Kreis', Bz: 'Bezirk', Sachs: 'Sachsen', Westf: 'Westfalen', Württ: 'Württemberg',
    Thür: 'Thüringen', Oberbay: 'Oberbayern', Obb: 'Oberbayern', Niederbay: 'Niederbayern', Bay: 'Bayern',
    Vogtl: 'Vogtland', Meckl: 'Mecklenburg', Erzgeb: 'Erzgebirge', Erzg: 'Erzgebirge', Hess: 'Hessen',
    Oberhess: 'Oberhessen', Rheinhess: 'Rheinhessen', Holst: 'Holstein', Schwab: 'Schwaben', Oldb: 'Oldenburg',
    Han: 'Hannover', Oberpf: 'Oberpfalz', Unterfr: 'Unterfranken', Oberfr: 'Oberfranken', Mittelfr: 'Mittelfranken',
    Anh: 'Anhalt', Odenw: 'Odenwald', Schwarzw: 'Schwarzwald', Rheinl: 'Rheinland', Rhld: 'Rheinland',
    Dillkr: 'Dillkreis', Bergstr: 'Bergstraße', Hohenz: 'Hohenzollern', Westerw: 'Westerwald', Ww: 'Westerwald',
    Ostfriesl: 'Ostfriesland', Saalkr: 'Saalkreis', Altm: 'Altmark', Nl: 'Niederlausitz',
  };

  function klammerzusatz(_, inhalt) {
    const rein = inhalt.trim().replace(/\.$/, '');
    if (FLUESSE[rein]) return FLUESSE[rein];
    return inhalt
      .split(/(\s*,\s*|\s+)/)
      .map((teil) => ABKUERZUNGEN[teil] || ABKUERZUNGEN[teil.replace(/\.$/, '')] || teil)
      .join('');
  }

  const ZUSAETZE = [
    [/\(([^)]+)\)/g, klammerzusatz],
    [/\bSt\.?\s+(?=[A-ZÄÖÜ])/g, 'Sankt '],
    [/([a-zäöüß])str\.?(?=[\s/,)]|$)/g, '$1straße'],
    [/\bStr\.?(?=\s|$)/g, 'Straße'],
    [/\bFernbf\b/g, 'Fernbahnhof'],
    [/\bPbf\b/g, 'Personenbahnhof'],
    [/\bHp\b/g, 'Haltepunkt'],
    [/\bunt\.?\s+(?=Bf\b|Bahnhof)/g, 'unterer '],
  ];

  /* Buchstabierte Gattungen immer ersetzen, Namen wie „NJ“ → „Nightjet“ nur vor einer Zugnummer. */
  const ZUGGATTUNG_REGELN = ZUGGATTUNGEN.filter((g) => g.sprich !== g.id)
    .sort((a, b) => b.id.length - a.id.length)
    .map((g) =>
      /^([A-Z] )+[A-Z]$/.test(g.sprich)
        ? [new RegExp('\\b' + g.id + '\\b', 'g'), g.sprich]
        : [new RegExp('\\b' + g.id + '(?=\\s?\\d)', 'g'), g.sprich]
    )
    .concat([
      [/\bSBB\b/g, 'S B B'],
      [/\bBER\b/g, 'B E R'],
      [/\bBASF\b/g, 'B A S F'],
    ]);

  function uhrzeitDe(_, h, m) {
    const stunde = parseInt(h, 10);
    const minute = parseInt(m, 10);
    return minute === 0 ? stunde + ' Uhr' : stunde + ' Uhr ' + minute;
  }

  function ersetzen(text, regeln) {
    return regeln.reduce((t, [muster, ersatz]) => t.replace(muster, ersatz), text);
  }

  function sprechtextDe(text) {
    let t = wert(text);
    t = ersetzen(t, ZUSAETZE);
    t = ersetzen(t, ZUGGATTUNG_REGELN);
    t = ersetzen(t, [
      [/\bHbf\b/g, 'Hauptbahnhof'],
      [/\bBf\b/g, 'Bahnhof'],
      [/\bSEV\b/g, 'Schienenersatzverkehr'],
      [/\bca\.\s*/g, 'circa '],
      [/\bGl\.\s*/g, 'Gleis '],
      [/\bMin\.(?=\s)/g, 'Minuten'],
      [/\bNr\.\s*/g, 'Nummer '],
      [/\bStr\.(?=\s)/g, 'Straße'],
      [/\bz\.\s?B\./g, 'zum Beispiel'],
      [/\bbzw\./g, 'beziehungsweise'],
      [/\bggf\./g, 'gegebenenfalls'],
      [/(\d{1,2}):(\d{2})\s*Uhr/g, uhrzeitDe],
      [/(\d{1,2}):(\d{2})/g, uhrzeitDe],
      [/\s*[–—]\s*/g, ' – '],
      [/\//g, ' '],
    ]);
    return t.replace(/\s{2,}/g, ' ').trim();
  }

  function sprechtextEn(text) {
    let t = wert(text);
    t = ersetzen(t, ZUSAETZE);
    t = ersetzen(t, ZUGGATTUNG_REGELN);
    t = ersetzen(t, [
      [/\bHbf\b/g, 'Hauptbahnhof'],
      [/\bBf\b/g, 'Bahnhof'],
      [/\bca\.\s*/g, 'approximately '],
      [/\//g, ' '],
    ]);
    return t.replace(/\s{2,}/g, ' ').trim();
  }

  /* ------------------------------------------------------------------ */
  /* Zufallsdaten                                                        */
  /* ------------------------------------------------------------------ */

  /**
   * Zufällige, plausible Zugdaten.
   * @param {function} [rng]   Zufallsquelle, Standard Math.random
   * @param {{fern?: string[], regional?: string[]}} [bahnhoefe]  eigene Bahnhofslisten
   */
  function zufallsDaten(rng, bahnhoefe) {
    rng = rng || Math.random;
    const fernPool = (bahnhoefe && bahnhoefe.fern && bahnhoefe.fern.length > 10) ? bahnhoefe.fern : FERN_BAHNHOEFE;
    const regioPool = (bahnhoefe && bahnhoefe.regional && bahnhoefe.regional.length > 10) ? bahnhoefe.regional : REGIONAL_BAHNHOEFE;
    const pick = (a) => a[Math.floor(rng() * a.length)];
    const zahl = (a, b) => a + Math.floor(rng() * (b - a + 1));
    const zwei = (n) => String(n).padStart(2, '0');

    const zugart = pick([
      'ICE', 'ICE', 'ICE', 'ICE', 'IC', 'IC', 'EC', 'ECE', 'RJ', 'NJ', 'FLX',
      'IRE', 'RE', 'RE', 'RE', 'RB', 'RB', 'RB', 'S', 'S', 'S',
    ]);
    const nummer = {
      ICE: zahl(500, 1999), ECE: zahl(30, 59), IC: zahl(2000, 2399), EC: zahl(100, 399),
      RJ: zahl(60, 69), NJ: zahl(40400, 40499), FLX: zahl(1200, 1899),
      IRE: zahl(1, 9), RE: zahl(1, 99), RB: zahl(10, 99), S: zahl(1, 9),
    }[zugart];

    const pool = FERNVERKEHR.includes(zugart) ? fernPool : regioPool;
    const benutzt = new Set();
    const station = (liste) => {
      const frei = liste.filter((s) => !benutzt.has(s));
      const s = pick(frei.length ? frei : liste);
      benutzt.add(s);
      return s;
    };

    const ziel = station(pool);
    const viaAnzahl = zahl(0, 2);
    const via = Array.from({ length: viaAnzahl }, () => station(pool));
    const gleis = zahl(1, 22);
    let neuesGleis = zahl(1, 22);
    if (neuesGleis === gleis) neuesGleis = gleis === 22 ? 1 : gleis + 1;
    const von = zahl(0, 5);
    const bis = Math.min(von + zahl(0, 2), 6);
    const grund = pick(GRUENDE.filter((g) => g.id)).id;
    const anschluss = () => pick(['S', 'RE', 'RB']) + ' ' + zahl(1, 49) + ' nach ' + station(regioPool);

    return {
      zugart: zugart,
      nummer: String(nummer),
      gleis: String(gleis),
      zeit: zwei(zahl(5, 23)) + ':' + zwei(zahl(0, 59)),
      ziel: ziel,
      ueber: via.join(', '),
      verspaetung: String(pick([5, 10, 15, 20, 25, 30, 40, 45, 60, 90])),
      grund: grund,
      neuesGleis: String(neuesGleis),
      abschnittVon: ABSCHNITTE[von],
      abschnittBis: ABSCHNITTE[bis],
      zielHinten: station(pool),
      teilungBhf: station(pool),
      sevVon: station(regioPool),
      sevBis: station(regioPool),
      sevHalt: pick(['Bahnhofsvorplatz, Bussteig ' + zahl(1, 6), 'Busbahnhof, Steig ' + zahl(1, 12), 'Haltestelle vor dem Haupteingang']),
      halt: station(pool),
      ausstieg: pick(['links', 'rechts']),
      anschluesse: [anschluss(), anschluss()].join(', '),
    };
  }

  return {
    TYPEN: TYPEN,
    GATTUNGSARTEN: GATTUNGSARTEN,
    ZUGGATTUNGEN: ZUGGATTUNGEN,
    ZUGARTEN: ZUGARTEN,
    FERNVERKEHR: FERNVERKEHR,
    ABSCHNITTE: ABSCHNITTE,
    FELDER: FELDER,
    GRUENDE: GRUENDE,
    BAHNHOEFE: BAHNHOEFE,
    STANDARD: STANDARD,
    bauen: bauen,
    englischAktiv: englischAktiv,
    sprechtextDe: sprechtextDe,
    sprechtextEn: sprechtextEn,
    zufallsDaten: zufallsDaten,
    liste: liste,
  };
});
