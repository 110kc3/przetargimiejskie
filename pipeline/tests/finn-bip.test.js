
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { auctionDateFromText, htmlToText } from '../src/core/finn-bip.js';

test('HTML text decodes entities once without interpreting generated markup', () => {
  assert.equal(htmlToText('<p>po&#322;o&#x17c;ony 17,85 m&sup2; &amp; gara&sup3;</p>'), 'położony 17,85 m² & gara³');
  assert.equal(htmlToText('&amp;lt;script&amp;gt;'), '&lt;script&gt;');
  assert.equal(htmlToText('&#38;lt;script&#x26;gt;'), '&lt;script&gt;');
  assert.equal(htmlToText('&amp;#322; &amp;amp; &unknown;'), '&#322; &amp; &unknown;');
  assert.equal(htmlToText('&lt;b&gt;tekst&lt;/b&gt;'), '<b>tekst</b>');
});

test('invalid numeric HTML references cannot crash the shared parser', () => {
  assert.equal(htmlToText('&#0; &#xD800; &#1114112; &#999999999999999999999999;'), '� � � �');
  assert.equal(htmlToText('&#x1F3E0;'), '🏠');
});

test('anchored operative sentence wins (spelled + numeric)', () => {
  assert.equal(
    auctionDateFromText('Data publikacji: 02.06.2026. Przetarg odbędzie się w dniu 9 grudnia 2026 r.'),
    '2026-12-09',
  );
  assert.equal(
    auctionDateFromText('Data publikacji: 02.06.2026. Przetarg odbędzie się 16.12.2026 o godz. 10:00'),
    '2026-12-16',
  );
});

test('page chrome / dateline dates no longer leak in', () => {
  assert.equal(auctionDateFromText('Data publikacji: 02.06.2026'), null);
  assert.equal(auctionDateFromText('Świętochłowice, dnia 02.06.2026 r.'), null);
  assert.equal(auctionDateFromText('Opublikowano 2 czerwca 2026 przez UM'), null);
});

test('"w dniu" fallback still recovers a date when the anchor is missing', () => {
  assert.equal(
    auctionDateFromText('Przetarg przeprowadzony zostanie w dniu 16.06.2026 r. o godz. 10:00'),
    '2026-06-16',
  );
  assert.equal(
    auctionDateFromText('Licytacja w dniu 7 września 2026 r.'),
    '2026-09-07',
  );
});

import { areaFromText } from '../src/core/finn-bip.js';

test('labelled flat area wins over the identically-labelled cellar (Katowicka 33a/7)', () => {
  const t = 'Łączna powierzchnia użytkowa lokalu mieszkalnego wynosi: 71,10 m2 ' +
    'wraz z piwnicą o powierzchni użytkowej 8,36 m2 (również oznaczoną numerem 7). ' +
    'działka nr 2629/143 o powierzchni 1281 m2, obręb Świętochłowice';
  assert.equal(areaFromText(t), 71.1);
});

test('cellar-labelled area alone does not masquerade as the flat', () => {
  const t = 'wraz z piwnicą o powierzchni użytkowej 8,36 m2, działka o powierzchni 1281 m2';
  assert.equal(areaFromText(t), null);
});
