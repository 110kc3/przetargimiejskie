// Mysłowice parser tests. Mysłowice runs on the FINN eUrząd platform, so the
// parsing is the shared core/finn-bip.js logic (re-exported via the city's
// parse.js). Fixtures reproduce the REAL article HTML observed live on
// bip.myslowice.pl (June 2026, rendered-DOM spike), including the local quirks
// the parsers must handle:
//   - address: "lokalu mieszkalnego nr 16 … w budynku nr 10B przy ul. Armii
//     Krajowej" (building number BEFORE the street; street has no trailing nr);
//   - price:   "154.000,-zł" (dot thousands, ",-" grosze placeholder);
//   - area:    "o pow. użytkowej 30,37 m2" (abbreviated label), with a plot
//     "o łącznej pow. 1138 m2" and a cellar "piwnicę o powierzchni 2,68 m2" that
//     must NOT be picked.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseAnnouncement,
  isFlatAuction,
  roundFromTitle,
  auctionDateFromText,
  areaFromText,
  priceFromText,
  addressFrom,
  shareFromTitle,
  parseIndexLinks,
} from '../src/cities/myslowice/parse.js';

const FLAT_TITLE =
  'Ogłoszenie o I przetargu na sprzedaż lokalu mieszkalnego nr 16 znajdujący się w budynku nr 10B przy ulicy Armii Krajowej w Mysłowicach.';
const FLAT_BODY =
  '<h1>Ogłoszenie o I przetargu na sprzedaż lokalu mieszkalnego nr 16</h1>' +
  '<p>Prezydent Miasta Mysłowice ogłasza ustny przetarg nieograniczony na sprzedaż ' +
  'samodzielnego lokalu mieszkalnego nr 16, o pow. użytkowej <strong>30,37 m2</strong>, ' +
  'stanowiącego własność Gminy Mysłowice, znajdującego się w wielorodzinnym budynku nr 10B ' +
  'przy ul. Armii Krajowej w Mysłowicach wraz z udziałem w nieruchomości wspólnej oraz ' +
  'sprzedażą ułamkowej części gruntu, obejmujących działki o łącznej pow. 1138 m2. ' +
  'Przyszły nabywca będzie miał udostępnioną do korzystania piwnicę o powierzchni 2,68 m2. ' +
  'Cena wywoławcza nieruchomości lokalowej wynosi <strong>154.000,-zł</strong> ' +
  '(słownie: sto pięćdziesiąt cztery tysiące złotych). ' +
  'Przetarg odbędzie się w dniu 9 grudnia 2025 r. o godz. 10.00 w sali nr 204.</p>';

test('isFlatAuction keeps flat + share sales, drops land / rentals / bezprzetargowe', () => {
  assert.equal(isFlatAuction(FLAT_TITLE), true);
  assert.equal(
    isFlatAuction('Ogłoszenie o II przetargu na sprzedaż udziału 4/6 części prawa własności samodzielnego lokalu mieszkalnego nr 3'),
    true,
  );
  assert.equal(
    isFlatAuction('Ogłoszenie o I przetargu nieograniczonym na sprzedaż nieruchomości zabudowanych'),
    false,
  );
  assert.equal(
    isFlatAuction('Ogłoszenie o V przetargu na sprzedaż nieruchomości niezabudowanej - ul. Długiej'),
    false,
  );
  assert.equal(
    isFlatAuction('Wykaz lokali mieszkalnych do sprzedaży bezprzetargowej na rzecz najemców'),
    false,
  );
});

test('roundFromTitle reads the roman/word ordinal from the title', () => {
  assert.equal(roundFromTitle(FLAT_TITLE), 1); // "o I przetargu"
  assert.equal(roundFromTitle('Ogłoszenie o II przetargu na sprzedaż lokalu mieszkalnego'), 2);
  assert.equal(roundFromTitle('Ogłoszenie o IV przetargu na sprzedaż lokalu'), 4);
  assert.equal(roundFromTitle('Ogłoszenie o czwartym ustnym przetargu ograniczonym'), 4);
  assert.equal(roundFromTitle('Ogłoszenie o przetargu ustnym nieograniczonym'), 1); // bare = 1
});

test('addressFrom: building-before-street phrasing (Mysłowice)', () => {
  const r = addressFrom(FLAT_TITLE, '');
  assert.ok(r);
  assert.equal(r.address.key, 'armii krajowej|10B|16');
  // multi-word street + lettered building
  const r2 = addressFrom(
    'Ogłoszenie o I przetargu na sprzedaż lokalu mieszkalnego nr 2 znajdujący się w budynku nr 17 przy ulicy Wojciecha Korfantego w Mysłowicach.',
    '',
  );
  assert.equal(r2.address.key, 'wojciecha korfantego|17|2');
});

test('parseAnnouncement extracts address/area/price/date/round', () => {
  const r = parseAnnouncement(FLAT_TITLE, FLAT_BODY);
  assert.ok(r);
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'armii krajowej|10B|16');
  assert.equal(r.area_m2, 30.37); // flat usable area, NOT the 1138 m² plot or 2.68 m² cellar
  assert.equal(r.starting_price_pln, 154000); // "154.000,-zł"
  assert.equal(r.auction_date, '2025-12-09');
  assert.equal(r.round, 1);
});

test('areaFromText prefers abbreviated "pow. użytkowej", rejects plot + cellar', () => {
  assert.equal(areaFromText('o pow. użytkowej 30,37 m2, działki o łącznej pow. 1138 m2'), 30.37);
  assert.equal(areaFromText('powierzchnia użytkowa lokalu: 47,30 m²'), 47.3);
  assert.equal(areaFromText('obejmujących działki o łącznej pow. 1138 m2'), null); // plot only
  assert.equal(areaFromText('piwnicę o powierzchni 2,68 m2'), null); // cellar (implausible)
});

test('priceFromText handles the "154.000,-zł" and "215 000,00 zł" formats', () => {
  assert.equal(priceFromText('Cena wywoławcza nieruchomości lokalowej wynosi 154.000,-zł'), 154000);
  assert.equal(priceFromText('Cena wywoławcza wynosi 215 000,00 zł'), 215000);
  assert.equal(priceFromText('cena wywoławcza: 89 500 zł'), 89500);
});

test('priceFromText reaches the price past an intervening number (fractional share)', () => {
  // The share fraction "4/6", the "części" count and the apartment "nr 11" all
  // sit between the label and the amount — the old non-digit window stopped at
  // the "4" and returned null, leaving Mysłowice share listings priceless.
  assert.equal(
    priceFromText(
      'Cena wywoławcza udziału 4/6 części prawa własności samodzielnego lokalu ' +
      'mieszkalnego nr 11 wynosi 169 000,00 zł',
    ),
    169000,
  );
  // Still locks onto the FIRST "<amount> zł" after the label, not a later one.
  assert.equal(
    priceFromText('Cena wywoławcza udziału 1/2 części wynosi 95 000 zł. Wadium 9 500 zł.'),
    95000,
  );
});

test('shareFromTitle reads the co-ownership fraction, null for whole-flat sales', () => {
  assert.equal(
    shareFromTitle('Ogłoszenie o II przetargu na sprzedaż udziału 4/6 części prawa własności samodzielnego lokalu mieszkalnego nr 11'),
    '4/6',
  );
  assert.equal(
    shareFromTitle('Ogłoszenie o I przetargu na sprzedaż udziału wynoszącego 1/2 części lokalu mieszkalnego'),
    '1/2',
  );
  assert.equal(shareFromTitle(FLAT_TITLE), null); // ordinary whole-flat sale
});

test('parseAnnouncement carries the share flag and the share price together', () => {
  const title =
    'Ogłoszenie o II przetargu na sprzedaż udziału 4/6 części prawa własności samodzielnego lokalu mieszkalnego nr 11 znajdujący się w budynku nr 1 przy ulicy Powstańców w Mysłowicach.';
  const body =
    '<p>Prezydent Miasta Mysłowice ogłasza przetarg na sprzedaż udziału 4/6 części ' +
    'samodzielnego lokalu mieszkalnego nr 11, o pow. użytkowej 59,00 m2, w budynku nr 1 ' +
    'przy ul. Powstańców. Cena wywoławcza udziału 4/6 części wynosi 169 000,00 zł. ' +
    'Przetarg odbędzie się w dniu 07.07.2026 r.</p>';
  const r = parseAnnouncement(title, body);
  assert.ok(r);
  assert.equal(r.share, '4/6');
  assert.equal(r.starting_price_pln, 169000);
  assert.equal(r.area_m2, 59);
});

test('auctionDateFromText: spelled month and numeric', () => {
  assert.equal(auctionDateFromText('Przetarg odbędzie się w dniu 9 grudnia 2025 r.'), '2025-12-09');
  assert.equal(auctionDateFromText('Przetarg odbędzie się w dniu 06.04.2026 r.'), '2026-04-06');
});

test('parseIndexLinks harvests only /artykul/ogloszenie announcement links', () => {
  const origin = 'https://bip.myslowice.pl';
  const html = `
    <a href="/artykul/rada-miasta">nav</a>
    <a href="/artykul/nieruchomosci">nav</a>
    <a href="/artykul/ogloszenie-o-ii-przetargu-na-sprzedaz-lokalu-mieszkalnego-nr-6-budynku-55a">flat</a>
    <a href="https://bip.myslowice.pl/artykul/ogloszenie-o-i-przetargu-na-sprzedaz-nieruchomosci-niezabudowanej">land</a>
    <a href="/strona/polityka-cookies">skip</a>
    <a href="/artykul/ogloszenie-o-ii-przetargu-na-sprzedaz-lokalu-mieszkalnego-nr-6-budynku-55a">dup</a>`;
  const links = parseIndexLinks(html, origin);
  assert.deepEqual(links, [
    'https://bip.myslowice.pl/artykul/ogloszenie-o-ii-przetargu-na-sprzedaz-lokalu-mieszkalnego-nr-6-budynku-55a',
    'https://bip.myslowice.pl/artykul/ogloszenie-o-i-przetargu-na-sprzedaz-nieruchomosci-niezabudowanej',
  ]);
  // The crawler's linkFilter (/lokal/) then keeps only the flat one.
  assert.deepEqual(links.filter((u) => /lokal/i.test(u)), [
    'https://bip.myslowice.pl/artykul/ogloszenie-o-ii-przetargu-na-sprzedaz-lokalu-mieszkalnego-nr-6-budynku-55a',
  ]);
});
