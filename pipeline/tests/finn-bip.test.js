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
