'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const O = require('../js/onlinestimmen.js');

const opt = { stimme: 'de-DE-KatjaNeural', lang: 'de-DE', tempo: 0.95, hoehe: 1 };

test('Azure: SSML mit Tempo, Tonhöhe und maskiertem Text', () => {
  const a = O.sprachanfrage('azure', { schluessel: 'k', region: 'westeurope' }, 'Gleis 7 <&> "Test"', opt);
  assert.equal(a.url, 'https://westeurope.tts.speech.microsoft.com/cognitiveservices/v1');
  assert.equal(a.init.method, 'POST');
  assert.equal(a.init.headers['Ocp-Apim-Subscription-Key'], 'k');
  assert.equal(a.init.headers['Content-Type'], 'application/ssml+xml');
  assert.match(a.init.body, /<voice name="de-DE-KatjaNeural">/);
  assert.match(a.init.body, /rate="-5%" pitch="\+0%"/);
  assert.match(a.init.body, /Gleis 7 &lt;&amp;&gt; &quot;Test&quot;/);
  assert.equal(a.antwort, 'audio');
});

test('Azure: ungültige Region wird abgelehnt', () => {
  assert.throws(() => O.sprachanfrage('azure', { schluessel: 'k', region: 'evil.com/x' }, 'a', opt), /Azure-Region/);
  assert.throws(() => O.sprachanfrage('azure', { schluessel: 'k', region: '' }, 'a', opt), /Azure-Region/);
});

test('Google: JSON-Anfrage, Tonhöhe nur bei Abweichung', () => {
  const a = O.sprachanfrage('google', { schluessel: 'a b' }, 'Hallo', Object.assign({}, opt, { stimme: 'de-DE-Neural2-A' }));
  assert.equal(a.url, 'https://texttospeech.googleapis.com/v1/text:synthesize?key=a%20b');
  const body = JSON.parse(a.init.body);
  assert.deepEqual(body.voice, { languageCode: 'de-DE', name: 'de-DE-Neural2-A' });
  assert.equal(body.audioConfig.speakingRate, 0.95);
  assert.equal('pitch' in body.audioConfig, false);
  assert.equal(a.antwort, 'base64');
  const hoch = JSON.parse(O.sprachanfrage('google', { schluessel: 'k' }, 'x', Object.assign({}, opt, { hoehe: 1.2 })).init.body);
  assert.equal(hoch.audioConfig.pitch, 2);
});

test('ElevenLabs: mehrsprachiges Modell und begrenztes Tempo', () => {
  const a = O.sprachanfrage('elevenlabs', { schluessel: 'k' }, 'Hallo', Object.assign({}, opt, { stimme: 'abc/1', tempo: 1.4 }));
  assert.equal(a.url, 'https://api.elevenlabs.io/v1/text-to-speech/abc%2F1?output_format=mp3_44100_128');
  assert.equal(a.init.headers['xi-api-key'], 'k');
  const body = JSON.parse(a.init.body);
  assert.equal(body.model_id, 'eleven_multilingual_v2');
  assert.equal(body.voice_settings.speed, 1.2);
});

test('ohne Schlüssel oder Stimme gibt es eine klare Meldung', () => {
  assert.throws(() => O.sprachanfrage('google', { schluessel: '' }, 'x', opt), /API-Schlüssel/);
  assert.throws(() => O.sprachanfrage('google', { schluessel: 'k' }, 'x', Object.assign({}, opt, { stimme: '' })), /Stimme/);
  assert.throws(() => O.stimmenanfrage('azure', {}), /API-Schlüssel/);
});

test('Stimmenlisten werden nach Sprache gefiltert und lesbar benannt', () => {
  const azure = O.stimmenLesen('azure', [
    { ShortName: 'de-DE-KatjaNeural', LocalName: 'Katja', Locale: 'de-DE', Gender: 'Female' },
    { ShortName: 'en-GB-RyanNeural', LocalName: 'Ryan', Locale: 'en-GB', Gender: 'Male' },
  ], 'de');
  assert.deepEqual(azure, [['de-DE-KatjaNeural', 'Katja · de-DE (weiblich)']]);

  const google = O.stimmenLesen('google', { voices: [
    { name: 'de-DE-Standard-A', languageCodes: ['de-DE'], ssmlGender: 'FEMALE' },
    { name: 'de-DE-Neural2-B', languageCodes: ['de-DE'], ssmlGender: 'MALE' },
    { name: 'en-GB-Neural2-A', languageCodes: ['en-GB'], ssmlGender: 'FEMALE' },
  ] }, 'de');
  assert.deepEqual(google.map((s) => s[0]), ['de-DE-Neural2-B', 'de-DE-Standard-A']);

  const eleven = O.stimmenLesen('elevenlabs', { voices: [{ voice_id: 'x1', name: 'Mila', category: 'premade' }] }, 'de');
  assert.deepEqual(eleven, [['x1', 'Mila · premade']]);
});

test('Fehlermeldungen nennen die Ursache', () => {
  assert.match(O.fehlermeldung(401, 'azure'), /Schlüssel und Region/);
  assert.match(O.fehlermeldung(429, 'google'), /Kontingent/);
  assert.match(O.fehlermeldung(500, 'google'), /500/);
});
