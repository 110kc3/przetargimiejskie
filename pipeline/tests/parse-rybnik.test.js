// Rybnik parser tests. The live ZGM BIP can't be reached from CI sandboxes, so
// we exercise the RTF decoder + parser against a fixture reproducing a real ZGM
// announcement (cp1250-escaped, with the price split across raw RTF line breaks
// — "180\r\n 000,00" — exactly as observed).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { rtfToText } from '../src/core/rtf-text.js';
import {
  parseAnnouncement,
  addressFromLabel,
  priceFromText,
  areaFromText,
  auctionDateFromText,
  roundFromText,
} from '../src/cities/rybnik/parse.js';

// Real-shaped RTF: \ansicpg1250, Polish via \'xx, value broken by CRLF.
const RTF =
  "{\\rtf1\\ansi\\ansicpg1250\\deff0{\\fonttbl{\\f0 Times;}}\\f0\\fs24\r\n" +
  "PREZYDENT MIASTA RYBNIKA\\par\r\n" +
  "Pierwszy publiczny ustny nieograniczony przetarg na sprzeda\\'bf gminnego lokalu " +
  "mieszkalnego po\\'b3o\\'bfonego w Rybniku przy ul. Alfonsa Zgrzebnioka 7b/6, " +
  "o powierzchni u\\'bfytkowej 35,00 m\\'b2.\\par\r\n" +
  "Cena wywo\\'b3awcza lokalu mieszkalnego:\r\n 180\r\n 000,00 z\\'b3,\r\n na podstawie.\\par\r\n" +
  "Przetarg odb\\'eadzie si\\'ea w dniu 09.06.2026 r. o godzinie 09:00.\\par}";

test('rtfToText decodes cp1250 + strips raw CR/LF inside numbers', () => {
  const t = rtfToText(RTF);
  assert.match(t, /powierzchni użytkowej 35,00 m²/);
  assert.match(t, /180 000,00 zł/); // CRLF-split value rejoined
  assert.match(t, /odbędzie się w dniu 09\.06\.2026/);
});

test('addressFromLabel: underscore → slash, keeps "A." / "św." prefixes', () => {
  assert.equal(addressFromLabel('OGŁOSZENIE A. Zgrzebnioka 7b_6').address.key, 'a zgrzebnioka|7B|6');
  assert.equal(addressFromLabel('OGŁOSZENIE św. Józefa 18_47').address.key, 'sw jozefa|18|47');
  assert.equal(addressFromLabel('OGŁOSZENIE Gen. Janke Waltera 5b_2').address.key, 'gen janke waltera|5B|2');
});

test('parseAnnouncement extracts the full record', () => {
  const r = parseAnnouncement('OGŁOSZENIE A. Zgrzebnioka 7b_6', rtfToText(RTF));
  assert.ok(r);
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'a zgrzebnioka|7B|6');
  assert.equal(r.starting_price_pln, 180000); // CRLF-split price recovered
  assert.equal(r.area_m2, 35);
  assert.equal(r.auction_date, '2026-06-09');
  assert.equal(r.round, 1); // "Pierwszy … przetarg"
});

test('field parsers: round words, spelled price, plot/area guard', () => {
  assert.equal(roundFromText('Drugi publiczny ustny przetarg'), 2);
  assert.equal(roundFromText('ogłasza przetarg na sprzedaż'), 1);
  // Regression (June 2026 review): the mandatory history clause in re-listed
  // announcements ("Pierwszy przetarg odbył się … wynikiem negatywnym") used
  // to win the whole-text scan and mark every re-listed auction as round 1.
  assert.equal(
    roundFromText(
      'Drugi publiczny ustny nieograniczony przetarg na sprzedaż lokalu. ' +
        'Pierwszy przetarg odbył się w dniu 11.03.2026 r. i zakończył się wynikiem negatywnym.',
    ),
    2,
  );
  assert.equal(
    roundFromText(
      'Pierwszy przetarg odbył się w dniu 11.03.2026 r. i zakończył się wynikiem negatywnym. ' +
        'Drugi publiczny ustny nieograniczony przetarg odbędzie się w dniu 09.06.2026 r.',
    ),
    2,
  );
  // "pierwszeństwo" (right of first refusal) is not an ordinal
  assert.equal(roundFromText('z zachowaniem pierwszeństwa najemcy ogłasza przetarg'), 1);
  assert.equal(priceFromText('Cena wywoławcza lokalu mieszkalnego: 325 000,00 zł'), 325000);
  assert.equal(auctionDateFromText('Przetarg odbędzie się w dniu 23.07.2025 r.'), '2025-07-23');
  // plot in ha must not be taken as the flat area
  assert.equal(areaFromText('na działce o powierzchni 0,0388 ha; powierzchni użytkowej 35,00 m²'), 35);
});
