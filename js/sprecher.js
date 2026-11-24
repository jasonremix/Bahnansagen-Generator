/*
 * Bahnansagen-Generator – Klang und Stimme.
 *
 * Der Gong wird live mit der Web Audio API synthetisiert (keine Aufnahmen).
 * Gesprochen wird mit der Web Speech API, also mit den Stimmen, die das
 * Gerät bzw. der Browser mitbringt.
 */
(function (root) {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Gong                                                                */
  /* ------------------------------------------------------------------ */

  const GONGS = {
    dreiklang: { label: 'Dreiklang', noten: [523.25, 659.25, 783.99], abstand: 0.42 },
    zweiklang: { label: 'Zweiklang', noten: [659.25, 523.25], abstand: 0.6 },
    vierklang: { label: 'Vierklang', noten: [392.0, 523.25, 659.25, 783.99], abstand: 0.3 },
  };

  /* Teiltöne einer Glocke: [Frequenzverhältnis, Lautstärke, Ausklingzeit in s] */
  const TEILTOENE = [
    [1, 1, 2.6],
    [2, 0.3, 1.5],
    [3.01, 0.11, 0.9],
    [4.16, 0.05, 0.55],
  ];

  let ctx = null;
  let hallPuffer = null;
  let ausgang = null;
  let gongTimer = null;
  let gongFertig = null;

  function audio() {
    if (!ctx) {
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /* Künstlicher Bahnhofshall: abklingendes Rauschen als Impulsantwort. */
  function hall(c) {
    if (hallPuffer) return hallPuffer;
    const dauer = 2.4;
    const laenge = Math.floor(c.sampleRate * dauer);
    const puffer = c.createBuffer(2, laenge, c.sampleRate);
    for (let kanal = 0; kanal < 2; kanal++) {
      const daten = puffer.getChannelData(kanal);
      for (let i = 0; i < laenge; i++) {
        daten[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / laenge, 3.2);
      }
    }
    hallPuffer = puffer;
    return puffer;
  }

  function glocke(c, ziel, frequenz, start, lautstaerke) {
    for (const [verhaeltnis, anteil, ausklang] of TEILTOENE) {
      const osz = c.createOscillator();
      const huelle = c.createGain();
      osz.type = 'sine';
      osz.frequency.value = frequenz * verhaeltnis;
      huelle.gain.setValueAtTime(0.0001, start);
      huelle.gain.exponentialRampToValueAtTime(lautstaerke * anteil, start + 0.008);
      huelle.gain.exponentialRampToValueAtTime(0.0001, start + ausklang);
      osz.connect(huelle);
      huelle.connect(ziel);
      osz.start(start);
      osz.stop(start + ausklang + 0.05);
    }
  }

  /**
   * Spielt einen Gong. Das Promise erfüllt sich, sobald der letzte Ton
   * angeschlagen ist und kurz geklungen hat; der Nachhall läuft weiter.
   */
  function gong(name, optionen) {
    const o = optionen || {};
    const def = GONGS[name];
    const c = audio();
    if (!def || !c) return Promise.resolve();
    gongStoppen();

    const kompressor = c.createDynamicsCompressor();
    const summe = c.createGain();
    summe.gain.value = 0.9;
    kompressor.connect(summe);
    summe.connect(c.destination);
    ausgang = summe;

    let eingang = kompressor;
    if (o.hall !== false) {
      const bus = c.createGain();
      const trocken = c.createGain();
      const nass = c.createGain();
      const faltung = c.createConvolver();
      trocken.gain.value = 0.8;
      nass.gain.value = 0.32;
      faltung.buffer = hall(c);
      bus.connect(trocken);
      trocken.connect(kompressor);
      bus.connect(faltung);
      faltung.connect(nass);
      nass.connect(kompressor);
      eingang = bus;
    }

    const noten = o.rueckwaerts ? def.noten.slice().reverse() : def.noten;
    const t0 = c.currentTime + 0.05;
    noten.forEach((f, i) => glocke(c, eingang, f, t0 + i * def.abstand, 0.24));

    const dauer = 0.05 + (noten.length - 1) * def.abstand + 1.0;
    return new Promise((fertig) => {
      gongFertig = fertig;
      gongTimer = setTimeout(() => {
        gongFertig = null;
        fertig();
      }, dauer * 1000);
    });
  }

  function gongStoppen() {
    clearTimeout(gongTimer);
    if (gongFertig) {
      gongFertig();
      gongFertig = null;
    }
    if (ausgang && ctx) {
      const alt = ausgang;
      try {
        alt.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
      } catch (e) {
        /* Knoten bereits getrennt */
      }
      setTimeout(() => alt.disconnect(), 400);
    }
    ausgang = null;
  }

  /* ------------------------------------------------------------------ */
  /* Sprachausgabe                                                       */
  /* ------------------------------------------------------------------ */

  const synth = 'speechSynthesis' in root ? root.speechSynthesis : null;
  const laufend = []; /* Referenzen halten, sonst verwirft Chrome Äußerungen vor „end“ */

  function sprache(stimme) {
    return String(stimme.lang || '').replace('_', '-').toLowerCase();
  }

  /* Natürlich klingende Stimmen zuerst anbieten. */
  function bewertung(stimme, bevorzugt) {
    const name = String(stimme.name || '').toLowerCase();
    let punkte = 0;
    if (/natural|neural|online/.test(name)) punkte += 4;
    if (/premium|enhanced|erweitert/.test(name)) punkte += 3;
    if (/google/.test(name)) punkte += 2;
    if (bevorzugt && sprache(stimme) === bevorzugt) punkte += 1;
    return punkte;
  }

  function stimmenFuer(praefix, bevorzugt) {
    if (!synth) return [];
    return synth
      .getVoices()
      .filter((v) => sprache(v).startsWith(praefix))
      .sort((a, b) => bewertung(b, bevorzugt) - bewertung(a, bevorzugt) || a.name.localeCompare(b.name));
  }

  /* Ruft `rueckruf` auf, sobald (oder wann immer) sich die Stimmenliste ändert. */
  function beiStimmen(rueckruf) {
    rueckruf();
    if (!synth) return;
    if (typeof synth.addEventListener === 'function') synth.addEventListener('voiceschanged', rueckruf);
    else synth.onvoiceschanged = rueckruf;
    /* Safari meldet „voiceschanged“ nicht immer zuverlässig. */
    [300, 1200, 3000].forEach((ms) => setTimeout(rueckruf, ms));
  }

  function saetze(text) {
    return String(text)
      .replace(/([.!?])\s+/g, '$1\u0001')
      .split('\u0001')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function satzSprechen(satz, o) {
    return new Promise((fertig) => {
      const u = new SpeechSynthesisUtterance(satz);
      u.lang = o.lang;
      if (o.stimme) u.voice = o.stimme;
      u.rate = o.tempo || 1;
      u.pitch = o.hoehe || 1;
      let erledigt = false;
      /* Sicherheitsnetz, falls ein Browser „end“ nie auslöst. */
      const notfall = setTimeout(abschliessen, 5000 + (satz.length * 150) / (o.tempo || 1));
      function abschliessen() {
        if (erledigt) return;
        erledigt = true;
        clearTimeout(notfall);
        const i = laufend.indexOf(u);
        if (i >= 0) laufend.splice(i, 1);
        fertig();
      }
      u.onend = abschliessen;
      u.onerror = abschliessen;
      laufend.push(u);
      synth.speak(u);
    });
  }

  /**
   * Spricht einen Text Satz für Satz. Lange Äußerungen am Stück brechen in
   * manchen Browsern nach etwa 15 Sekunden ab, Sätze einzeln nicht.
   */
  async function sprechen(text, optionen, abgebrochen) {
    if (!synth) return;
    for (const satz of saetze(text)) {
      if (abgebrochen && abgebrochen()) return;
      await satzSprechen(satz, optionen);
    }
  }

  /* iOS gibt die Sprachausgabe erst nach einer Äußerung innerhalb einer Nutzeraktion frei. */
  function freischalten() {
    audio();
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    synth.speak(u);
  }

  function stoppen() {
    gongStoppen();
    if (synth) synth.cancel();
  }

  root.Sprecher = {
    GONGS: GONGS,
    sprachausgabe: !!synth,
    gong: gong,
    stimmenFuer: stimmenFuer,
    beiStimmen: beiStimmen,
    sprechen: sprechen,
    freischalten: freischalten,
    stoppen: stoppen,
  };
})(typeof self !== 'undefined' ? self : this);
