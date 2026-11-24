/*
 * Bahnansagen-Generator – Klang und Stimme.
 *
 * Der Gong wird live mit der Web Audio API synthetisiert (keine Aufnahmen).
 * Die Lautsprecherkette gibt Gong und Onlinestimmen den Bahnhofsklang.
 * Die Browserstimme (Web Speech API) lässt sich technisch nicht bearbeiten
 * und klingt deshalb immer trocken.
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

  /*
   * Klangvorlagen der Lautsprecherkette:
   * hp/lp  Hoch-/Tiefpass in Hz (Frequenzgang eines Druckkammerlautsprechers)
   * spitze Anhebung um 2,2 kHz in dB (nasaler Durchsageklang)
   * antrieb leichte Übersteuerung des Verstärkers
   * echos  weitere Lautsprecher entlang des Bahnsteigs: [Verzögerung s, Pegel]
   * hall/nass  Nachhallzeit in s und Anteil des Raumhalls
   */
  const KLAENGE = {
    bahnsteig: { label: 'Bahnsteig', hp: 320, lp: 3800, spitze: 5, antrieb: 2.2, echos: [[0.045, 0.32], [0.11, 0.2], [0.19, 0.11]], hall: 2.2, nass: 0.3 },
    halle: { label: 'Bahnhofshalle', hp: 280, lp: 4400, spitze: 4, antrieb: 1.8, echos: [[0.07, 0.3], [0.16, 0.2], [0.27, 0.12]], hall: 3.8, nass: 0.45 },
    zug: { label: 'Im Zug', hp: 380, lp: 3300, spitze: 6, antrieb: 2.8, echos: [], hall: 0.45, nass: 0.14 },
  };

  let ctx = null;
  const hallPuffer = {};
  const kurven = {};
  let gongTimer = null;
  let gongFertig = null;
  let ketten = []; /* aktive Ausgangsketten (Gong und Aufnahmen) */
  let quellen = []; /* laufende Pufferquellen der Aufnahmen */
  let folgeTimer = null;
  let folgeFertig = null;

  function audio() {
    if (!ctx) {
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /* Künstlicher Raumhall: abklingendes Rauschen als Impulsantwort. */
  function hall(c, dauer) {
    if (hallPuffer[dauer]) return hallPuffer[dauer];
    const laenge = Math.floor(c.sampleRate * dauer);
    const puffer = c.createBuffer(2, laenge, c.sampleRate);
    for (let kanal = 0; kanal < 2; kanal++) {
      const daten = puffer.getChannelData(kanal);
      for (let i = 0; i < laenge; i++) {
        daten[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / laenge, 3.2);
      }
    }
    hallPuffer[dauer] = puffer;
    return puffer;
  }

  /* Weiche Sättigung wie ein leicht übersteuerter Verstärker. */
  function kurve(antrieb) {
    if (kurven[antrieb]) return kurven[antrieb];
    const n = 2048;
    const k = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      k[i] = Math.tanh(antrieb * x) / Math.tanh(antrieb);
    }
    kurven[antrieb] = k;
    return k;
  }

  function filter(c, typ, frequenz, q, verstaerkung) {
    const f = c.createBiquadFilter();
    f.type = typ;
    f.frequency.value = frequenz;
    f.Q.value = q;
    if (verstaerkung != null) f.gain.value = verstaerkung;
    return f;
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
   * Lautsprecherkette nach Klangvorlage („bahnsteig“, „halle“, „zug“ oder
   * „aus“). Gibt den Knoten zurück, an den Klangquellen angeschlossen werden.
   */
  function kette(optionen) {
    const o = optionen || {};
    const c = audio();
    if (!c) return null;
    const def = KLAENGE[o.klang] || null;

    const summe = c.createGain();
    summe.gain.value = 0.9;
    summe.connect(c.destination);
    ketten.push(summe);
    /* Kompressor als Begrenzer, damit nichts übersteuert */
    const kompressor = c.createDynamicsCompressor();
    kompressor.threshold.value = -18;
    kompressor.knee.value = 6;
    kompressor.ratio.value = 6;
    kompressor.attack.value = 0.003;
    kompressor.release.value = 0.25;
    kompressor.connect(summe);

    if (!def) {
      kompressor._summe = summe;
      return kompressor;
    }

    /* Lautsprecher: Bandbegrenzung, nasale Anhebung, leichte Sättigung */
    const hoch = filter(c, 'highpass', def.hp, 0.8);
    const spitze = filter(c, 'peaking', 2200, 1, def.spitze);
    const saettigung = c.createWaveShaper();
    saettigung.curve = kurve(def.antrieb);
    saettigung.oversample = '2x';
    /* Die Sättigungskurve hebt leise Stellen um antrieb/tanh(antrieb) an; das hier ausgleichen,
       ebenso die Summe aus Direktschall, Echos und Hall. */
    const ausgleich = c.createGain();
    const echoSumme = def.echos.reduce((summe, e) => summe + e[1], 0);
    ausgleich.gain.value = (Math.tanh(def.antrieb) / def.antrieb) / (1 + echoSumme * 0.5 + def.nass * 0.5);
    const tief = filter(c, 'lowpass', def.lp, 0.8);
    hoch.connect(spitze);
    spitze.connect(saettigung);
    saettigung.connect(ausgleich);
    ausgleich.connect(tief);
    tief.connect(kompressor);

    /* Weitere Lautsprecher entlang des Bahnsteigs, leiser und dumpfer */
    for (const [verzoegerung, pegel] of def.echos) {
      const v = c.createDelay(1);
      v.delayTime.value = verzoegerung;
      const dumpf = filter(c, 'lowpass', 2600, 0.7);
      const g = c.createGain();
      g.gain.value = pegel;
      tief.connect(v);
      v.connect(dumpf);
      dumpf.connect(g);
      g.connect(kompressor);
    }

    /* Raumhall */
    const faltung = c.createConvolver();
    faltung.buffer = hall(c, def.hall);
    const nass = c.createGain();
    nass.gain.value = def.nass;
    tief.connect(faltung);
    faltung.connect(nass);
    nass.connect(kompressor);

    hoch._summe = summe;
    return hoch;
  }

  /* Trennt eine Kette, sobald sie ausgeklungen ist. */
  function freigeben(eingang, nachMs) {
    if (!eingang || !eingang._summe) return;
    const summe = eingang._summe;
    setTimeout(() => {
      if (!ketten.includes(summe)) return;
      ketten = ketten.filter((k) => k !== summe);
      summe.disconnect();
    }, nachMs || 0);
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
    const eingang = kette(o);

    const noten = o.rueckwaerts ? def.noten.slice().reverse() : def.noten;
    const t0 = c.currentTime + 0.05;
    noten.forEach((f, i) => glocke(c, eingang, f, t0 + i * def.abstand, 0.24));

    const dauer = 0.05 + (noten.length - 1) * def.abstand + 1.0;
    freigeben(eingang, (dauer + 5) * 1000);
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
  }

  /* Blendet alle Ausgangsketten aus und beendet laufende Aufnahmen. */
  function kettenStoppen() {
    quellen.forEach((q) => {
      try {
        q.stop();
      } catch (e) {
        /* Quelle lief noch nicht oder ist schon beendet */
      }
    });
    quellen = [];
    clearTimeout(folgeTimer);
    if (folgeFertig) {
      folgeFertig();
      folgeFertig = null;
    }
    if (!ctx) return;
    ketten.forEach((summe) => {
      try {
        summe.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
      } catch (e) {
        /* Knoten bereits getrennt */
      }
      setTimeout(() => summe.disconnect(), 400);
    });
    ketten = [];
  }

  /* ------------------------------------------------------------------ */
  /* Aufnahmen                                                           */
  /* ------------------------------------------------------------------ */

  function dekodieren(daten) {
    const c = audio();
    if (!c) return Promise.reject(new Error('Kein Web Audio'));
    return new Promise((ok, fehler) => {
      const r = c.decodeAudioData(daten, ok, fehler);
      if (r && typeof r.then === 'function') r.then(ok, fehler);
    });
  }

  /**
   * Spielt Aufnahmen lückenlos hintereinander. Teile sind
   * {puffer, offset, dauer} oder {pause: Sekunden}.
   */
  function pufferFolge(teile, eingang) {
    const c = audio();
    if (!c || !eingang) return Promise.resolve();
    const LUECKE = 0.03;
    let t = c.currentTime + 0.05;
    for (const teil of teile) {
      if (teil.pause != null) {
        t += teil.pause;
        continue;
      }
      const q = c.createBufferSource();
      q.buffer = teil.puffer;
      q.connect(eingang);
      q.start(t, teil.offset || 0, teil.dauer);
      quellen.push(q);
      t += teil.dauer + LUECKE;
    }
    const ms = Math.max(0, (t - c.currentTime) * 1000);
    return new Promise((fertig) => {
      folgeFertig = fertig;
      folgeTimer = setTimeout(() => {
        folgeFertig = null;
        quellen = [];
        fertig();
      }, ms);
    });
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
    kettenStoppen();
    if (synth) synth.cancel();
  }

  root.Sprecher = {
    GONGS: GONGS,
    KLAENGE: KLAENGE,
    sprachausgabe: !!synth,
    gong: gong,
    kette: kette,
    freigeben: freigeben,
    dekodieren: dekodieren,
    pufferFolge: pufferFolge,
    stimmenFuer: stimmenFuer,
    beiStimmen: beiStimmen,
    sprechen: sprechen,
    freischalten: freischalten,
    stoppen: stoppen,
  };
})(typeof self !== 'undefined' ? self : this);
