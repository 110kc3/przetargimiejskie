// finn-bip auctionDateFromText tests (June 2026 fix): the fallbacks used to
// match the LEFTMOST date anywhere in the flattened FINN page — typically the
// publication header or the town dateline — whenever the operative
// "odbędzie się" sentence deviated. Fallbacks now require "w dniu".

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { auctionDateFromText } from '../src/core/finn-bip.js';

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

// areaFromText (June 2026 fix): the labelled "pow. użytkow…" branch used to
// return the CELLAR — announcements label it identically ("wraz z piwnicą o
// powierzchni użytkowej 8,36 m2") while the real flat label can sit >20 chars
// from its number ("…użytkowa lokalu mieszkalnego wynosi: 71,10 m2"). That
// produced 8 m² "flats" at 21 000+ zł/m² in the Świętochłowice archive.
import { areaFromText } from '../src/core/finn-bip.js';

test('labelled flat area wins over the identically-labelled cellar (Katowicka 33a/7)', () => {
  const t = 'Łączna powierzchnia użytkowa lokalu mieszkalnego wynosi: 71,10 m2 ' +
    'wraz z piwnicą o powierzchni użytkowej 8,36 m2 (również oznaczoną numerem 7). ' +
    'działka nr 2629/143 o powierzchni 1281 m2, obręb Świętochłowice';
  assert.equal(areaFromText(t), 71.1);
});

test('cellar-labelled area alone does not masquerade as the flat', () => {
  // Only a cellar carries the użytkowa label → fall through to the bare-m²
  // scan, which also guards piwnica; flat area genuinely absent → null…
  const t = 'wraz z piwnicą o powierzchni użytkowej 8,36 m2, działka o powierzchni 1281 m2';
  assert.equal(areaFromText(t), null);
});
