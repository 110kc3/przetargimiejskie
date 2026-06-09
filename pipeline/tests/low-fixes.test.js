// Regression tests for the "Open (low)" fixes from the June 2026 review.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { roundFromTitle, roundFromText, addressFrom } from '../src/core/finn-bip.js';
import { rtfToText } from '../src/core/rtf-text.js';
import { todayWarsaw } from '../src/core/build-properties.js';
import { isFlatAnnouncement } from '../src/cities/swietochlowice/parse.js';
import { parseAnnouncement as parseKatowiceAnnouncement } from '../src/cities/katowice/parse.js';

test('finn-bip rounds: conjunction "i" is not Roman I; map reaches VII+', () => {
  // body scope "ogłasza i zaprasza na II przetarg": /i-flagged \bI\b used to
  // return 1 off the conjunction before ever seeing "II"
  assert.equal(roundFromText('Prezydent ogłasza i zaprasza na II przetarg ustny'), 2);
  assert.equal(roundFromTitle('Ogłoszenie o VII przetargu ustnym nieograniczonym'), 7);
  // "piątek" (Friday) is not the ordinal "piąty"
  assert.equal(roundFromTitle('Przetarg ustny w piątek na sprzedaż lokalu'), 1);
  assert.equal(roundFromTitle('Piąty przetarg ustny'), 5);
});

test('finn-bip pattern B: lowercase capture after "przy" is rejected', () => {
  // "…budynku nr 5 przy czym nabywca…" — the /i flag used to defeat the
  // uppercase street guard and capture "czym nabywca…" as a street.
  const r = addressFrom(
    '',
    'sprzedaż lokalu mieszkalnego nr 3 w budynku nr 5 przy czym nabywca zobowiązany jest do wpłaty',
  );
  assert.equal(r, null);
  // genuine pattern B still works
  const ok = addressFrom('', 'lokalu mieszkalnego nr 3 w budynku nr 5 przy ul. Mickiewicza w Mysłowicach');
  assert.equal(ok.address.key, 'mickiewicza|5|3');
});

test('rtf-text: nested fonttbl groups are fully stripped; \\uN\\\'xx is one char', () => {
  const rtf =
    "{\\rtf1\\ansi\\ansicpg1250{\\fonttbl{\\f0\\fnil Calibri;}{\\f1\\froman Times New Roman;}}" +
    "\\f0 Lokal przy ul. \\u346?wierczewskiego, pow. u\\u380\\'bfytkowa 35 m\\'b2.\\par}";
  const t = rtfToText(rtf);
  assert.ok(!/Calibri|Times New Roman/.test(t), 'font names must not leak: ' + t);
  assert.match(t, /Świerczewskiego/);
  assert.match(t, /użytkowa 35 m²/, '\\uN with \\\'xx fallback must decode to ONE char: ' + t);
});

test('todayWarsaw returns a YYYY-MM-DD string', () => {
  assert.match(todayWarsaw(), /^\d{4}-\d{2}-\d{2}$/);
});

test('Świętochłowice: KW citation no longer rejects a real announcement', () => {
  assert.equal(
    isFlatAnnouncement(
      'Ogłoszenie o przetargu ustnym nieograniczonym na sprzedaż lokalu mieszkalnego przy ul. Katowickiej 5 (KW nr KA1C/00012345/6)',
    ),
    true,
  );
  // the bare land-registry annex stays rejected
  assert.equal(isFlatAnnouncement('KW lokalu mieszkalnego przy ul. Katowickiej 5'), false);
  assert.equal(isFlatAnnouncement('Księga wieczysta — załącznik'), false);
});

test('Katowice addressFromTitle: trailing title words no longer break the address', () => {
  const body =
    '<p>Lokal mieszkalny o pow. 45,00 m². Cena wywoławcza 100 000 zł. ' +
    'Przetarg odbędzie się w dniu 01.09.2026 r.</p>';
  const l = parseKatowiceAnnouncement(
    body,
    'Przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego przy ul. Gliwickiej 50/2 w Katowicach',
    'https://example/doc',
  );
  assert.ok(l, 'announcement used to be silently dropped');
  assert.equal(l.address.key, 'gliwickiej|50|2');
});
