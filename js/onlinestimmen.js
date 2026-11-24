/*
 * Bahnansagen-Generator – Onlinestimmen.
 *
 * Holt gesprochene Ansagen als Audiodatei von einem Sprachdienst, damit die
 * Lautsprecherkette den Bahnhofsklang darauflegen kann. Der API-Schlüssel
 * gehört der Person, die die App benutzt, und bleibt in ihrem Browser.
 *
 * Die Anfragen werden von reinen Funktionen gebaut (in Node testbar);
 * nur `stimmenLaden` und `puffer` greifen auf das Netz zu.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Onlinestimmen = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const ANBIETER = {
    azure: {
      label: 'Microsoft Azure',
      region: true,
      hilfe: 'Im Azure-Portal einen „Speech“-Dienst anlegen, dort unter „Schlüssel und Endpunkt“ Schlüssel und Region kopieren. Es gibt einen kostenlosen Einstiegstarif.',
      stimmen: {
        de: [
          ['de-DE-KatjaNeural', 'Katja (weiblich)'],
          ['de-DE-AmalaNeural', 'Amala (weiblich)'],
          ['de-DE-SeraphinaMultilingualNeural', 'Seraphina (weiblich)'],
          ['de-DE-ConradNeural', 'Conrad (männlich)'],
          ['de-DE-KillianNeural', 'Killian (männlich)'],
        ],
        en: [
          ['en-GB-SoniaNeural', 'Sonia (weiblich)'],
          ['en-GB-LibbyNeural', 'Libby (weiblich)'],
          ['en-GB-RyanNeural', 'Ryan (männlich)'],
        ],
      },
    },
    google: {
      label: 'Google Cloud',
      region: false,
      hilfe: 'Im Google-Cloud-Projekt die „Text-to-Speech API“ aktivieren und unter „APIs & Dienste → Anmeldedaten“ einen API-Schlüssel anlegen. Es gibt ein kostenloses Monatskontingent.',
      stimmen: {
        de: [
          ['de-DE-Neural2-A', 'de-DE-Neural2-A (weiblich)'],
          ['de-DE-Neural2-B', 'de-DE-Neural2-B (männlich)'],
          ['de-DE-Wavenet-A', 'de-DE-Wavenet-A (weiblich)'],
          ['de-DE-Wavenet-B', 'de-DE-Wavenet-B (männlich)'],
        ],
        en: [
          ['en-GB-Neural2-A', 'en-GB-Neural2-A (weiblich)'],
          ['en-GB-Neural2-B', 'en-GB-Neural2-B (männlich)'],
        ],
      },
    },
    elevenlabs: {
      label: 'ElevenLabs',
      region: false,
      hilfe: 'Nach der Anmeldung unter „Developers → API Keys“ einen Schlüssel anlegen, dann „Stimmen laden“ drücken. Es gibt einen kostenlosen Einstiegstarif.',
      stimmen: { de: [], en: [] },
    },
  };

  /* ------------------------------------------------------------------ */
  /* Anfragen bauen                                                      */
  /* ------------------------------------------------------------------ */

  function xml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function prozent(wert) {
    const p = Math.round(wert);
    return (p >= 0 ? '+' : '') + p + '%';
  }

  function begrenzen(wert, min, max) {
    return Math.min(max, Math.max(min, wert));
  }

  function regionPruefen(region) {
    const r = String(region || '').trim().toLowerCase();
    if (!/^[a-z0-9]+$/.test(r)) throw new Error('Bitte eine gültige Azure-Region angeben, zum Beispiel „westeurope“.');
    return r;
  }

  /**
   * Baut die Anfrage für eine Sprachausgabe.
   * @param {string} anbieter  azure | google | elevenlabs
   * @param {{schluessel: string, region?: string}} zugang
   * @param {string} text
   * @param {{stimme: string, lang: string, tempo?: number, hoehe?: number}} o
   * @returns {{url: string, init: object, antwort: 'audio'|'base64'}}
   */
  function sprachanfrage(anbieter, zugang, text, o) {
    const tempo = Number(o.tempo) || 1;
    const hoehe = Number(o.hoehe) || 1;
    if (!zugang || !zugang.schluessel) throw new Error('Bitte zuerst einen API-Schlüssel eintragen.');
    if (!o.stimme) throw new Error('Bitte eine Stimme auswählen.');

    if (anbieter === 'azure') {
      const ssml =
        '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="' + xml(o.lang) + '">' +
        '<voice name="' + xml(o.stimme) + '">' +
        '<prosody rate="' + prozent((tempo - 1) * 100) + '" pitch="' + prozent((hoehe - 1) * 50) + '">' +
        xml(text) +
        '</prosody></voice></speak>';
      return {
        url: 'https://' + regionPruefen(zugang.region) + '.tts.speech.microsoft.com/cognitiveservices/v1',
        init: {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': zugang.schluessel,
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3',
          },
          body: ssml,
        },
        antwort: 'audio',
      };
    }

    if (anbieter === 'google') {
      const audioConfig = { audioEncoding: 'MP3', speakingRate: begrenzen(tempo, 0.25, 4) };
      /* Nicht jede Google-Stimme kennt „pitch“, deshalb nur bei Abweichung senden. */
      if (Math.abs(hoehe - 1) > 0.001) audioConfig.pitch = Math.round(begrenzen((hoehe - 1) * 10, -20, 20) * 10) / 10;
      return {
        url: 'https://texttospeech.googleapis.com/v1/text:synthesize?key=' + encodeURIComponent(zugang.schluessel),
        init: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: { text: text }, voice: { languageCode: o.lang, name: o.stimme }, audioConfig: audioConfig }),
        },
        antwort: 'base64',
      };
    }

    if (anbieter === 'elevenlabs') {
      return {
        url: 'https://api.elevenlabs.io/v1/text-to-speech/' + encodeURIComponent(o.stimme) + '?output_format=mp3_44100_128',
        init: {
          method: 'POST',
          headers: { 'xi-api-key': zugang.schluessel, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
          body: JSON.stringify({
            text: text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: { stability: 0.6, similarity_boost: 0.75, speed: begrenzen(tempo, 0.7, 1.2) },
          }),
        },
        antwort: 'audio',
      };
    }

    throw new Error('Unbekannter Sprachdienst: ' + anbieter);
  }

  /* Anfrage für die Stimmenliste eines Dienstes. */
  function stimmenanfrage(anbieter, zugang) {
    if (!zugang || !zugang.schluessel) throw new Error('Bitte zuerst einen API-Schlüssel eintragen.');
    if (anbieter === 'azure') {
      return {
        url: 'https://' + regionPruefen(zugang.region) + '.tts.speech.microsoft.com/cognitiveservices/voices/list',
        init: { headers: { 'Ocp-Apim-Subscription-Key': zugang.schluessel } },
      };
    }
    if (anbieter === 'google') {
      return { url: 'https://texttospeech.googleapis.com/v1/voices?key=' + encodeURIComponent(zugang.schluessel), init: {} };
    }
    if (anbieter === 'elevenlabs') {
      return { url: 'https://api.elevenlabs.io/v1/voices', init: { headers: { 'xi-api-key': zugang.schluessel } } };
    }
    throw new Error('Unbekannter Sprachdienst: ' + anbieter);
  }

  function geschlecht(wert) {
    const w = String(wert || '').toLowerCase();
    if (w.startsWith('f')) return ' (weiblich)';
    if (w.startsWith('m')) return ' (männlich)';
    return '';
  }

  /* Wandelt die Antwort eines Dienstes in [[id, Anzeigename], …] für eine Sprache. */
  function stimmenLesen(anbieter, daten, sprache) {
    if (anbieter === 'azure') {
      return (Array.isArray(daten) ? daten : [])
        .filter((v) => String(v.Locale || '').toLowerCase().startsWith(sprache))
        .map((v) => [v.ShortName, (v.LocalName || v.DisplayName || v.ShortName) + ' · ' + v.Locale + geschlecht(v.Gender)])
        .sort((a, b) => a[1].localeCompare(b[1], 'de'));
    }
    if (anbieter === 'google') {
      const rang = (name) => (/Chirp|Studio/.test(name) ? 0 : /Neural2/.test(name) ? 1 : /Wavenet/.test(name) ? 2 : 3);
      return ((daten && daten.voices) || [])
        .filter((v) => (v.languageCodes || []).some((l) => l.toLowerCase().startsWith(sprache)))
        .map((v) => [v.name, v.name + geschlecht(v.ssmlGender)])
        .sort((a, b) => rang(a[0]) - rang(b[0]) || a[0].localeCompare(b[0]));
    }
    if (anbieter === 'elevenlabs') {
      /* Die mehrsprachigen Stimmen sprechen Deutsch und Englisch. */
      return ((daten && daten.voices) || [])
        .map((v) => [v.voice_id, v.name + (v.category ? ' · ' + v.category : '')])
        .sort((a, b) => a[1].localeCompare(b[1], 'de'));
    }
    return [];
  }

  function fehlermeldung(status, anbieter) {
    if (status === 401 || status === 403) {
      return anbieter === 'azure'
        ? 'Der Dienst hat den Schlüssel abgelehnt. Prüfe Schlüssel und Region.'
        : 'Der Dienst hat den Schlüssel abgelehnt. Prüfe den Schlüssel und ob die Sprachausgabe dafür freigeschaltet ist.';
    }
    if (status === 400) return 'Der Dienst hat die Anfrage abgelehnt. Wähle eine andere Stimme oder setze die Tonhöhe auf 1,00×.';
    if (status === 404) return 'Stimme oder Region nicht gefunden. Lade die Stimmen neu.';
    if (status === 429) return 'Zu viele Anfragen oder Kontingent aufgebraucht. Versuche es später noch einmal.';
    return 'Der Sprachdienst antwortet mit Fehler ' + status + '.';
  }

  const VERBINDUNGSFEHLER =
    'Keine Verbindung zum Sprachdienst. In der Vorschau auf claude.ai sind externe Dienste gesperrt; ' +
    'öffne die App lokal oder über GitHub Pages. Sonst Internetverbindung prüfen.';

  /* ------------------------------------------------------------------ */
  /* Netzzugriff (nur im Browser)                                        */
  /* ------------------------------------------------------------------ */

  async function abrufen(url, init, anbieter) {
    let antwort;
    try {
      antwort = await fetch(url, init);
    } catch (e) {
      throw new Error(VERBINDUNGSFEHLER);
    }
    if (!antwort.ok) throw new Error(fehlermeldung(antwort.status, anbieter));
    return antwort;
  }

  async function stimmenLaden(anbieter, zugang, sprache) {
    const a = stimmenanfrage(anbieter, zugang);
    const antwort = await abrufen(a.url, a.init, anbieter);
    return stimmenLesen(anbieter, await antwort.json(), sprache);
  }

  function base64ZuPuffer(text) {
    const binaer = atob(text);
    const bytes = new Uint8Array(binaer.length);
    for (let i = 0; i < binaer.length; i++) bytes[i] = binaer.charCodeAt(i);
    return bytes.buffer;
  }

  /* Bereits gesprochene Texte merken: erneutes Abspielen kostet kein Kontingent. */
  const zwischenspeicher = new Map();
  const MAX_EINTRAEGE = 40;

  /**
   * Liefert die gesprochene Ansage als dekodierten AudioBuffer.
   * @param {function(ArrayBuffer): Promise<AudioBuffer>} dekodieren
   */
  function puffer(anbieter, zugang, text, o, dekodieren) {
    const schluessel = JSON.stringify([anbieter, zugang.region || '', o.stimme, o.lang, o.tempo, o.hoehe, text]);
    if (zwischenspeicher.has(schluessel)) return zwischenspeicher.get(schluessel);
    const auftrag = (async () => {
      const a = sprachanfrage(anbieter, zugang, text, o);
      const antwort = await abrufen(a.url, a.init, anbieter);
      const daten = a.antwort === 'base64' ? base64ZuPuffer((await antwort.json()).audioContent || '') : await antwort.arrayBuffer();
      return dekodieren(daten);
    })();
    auftrag.catch(() => zwischenspeicher.delete(schluessel));
    zwischenspeicher.set(schluessel, auftrag);
    if (zwischenspeicher.size > MAX_EINTRAEGE) zwischenspeicher.delete(zwischenspeicher.keys().next().value);
    return auftrag;
  }

  return {
    ANBIETER: ANBIETER,
    sprachanfrage: sprachanfrage,
    stimmenanfrage: stimmenanfrage,
    stimmenLesen: stimmenLesen,
    fehlermeldung: fehlermeldung,
    stimmenLaden: stimmenLaden,
    puffer: puffer,
  };
});
