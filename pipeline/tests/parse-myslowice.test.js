// Myslowice parser tests (FINN eUrząd / core/finn-bip.js).
// See also: parse-myslowice-land.test.js for land tests (HL-27).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseAnnouncement,
  parseLandAnnouncement,
  isFlatAuction,
  isSaleAuction,
  resolveKind,
  roundFromTitle,
  auctionDateFromText,
  areaFromText,
  priceFromText,
  addressFrom,
  shareFromTitle,
  parseIndexLinks,
} from '../src/cities/myslowice/parse.js';

const FLAT_TITLE =
  'Ogloszenie o I przetargu na sprzedaz lokalu mieszkalnego nr 16 ' +
  'w budynku nr 10B przy ulicy Armii Krajowej w Myslowicach.';
const FLAT_BODY =
  '<h1>Ogloszenie o I przetargu na sprzedaz lokalu mieszkalnego nr 16</h1>' +
  '<p>Prezydent Miasta Myslowice oglasza ustny przetarg nieograniczony na sprzedaz ' +
  'samodzielnego lokalu mieszkalnego nr 16, o pow. uzytkowej <strong>30,37 m2</strong>, ' +
  'w wielorodzinnym budynku nr 10B przy ul. Armii Krajowej w Myslowicach. ' +
  'Dzialki o lacznej pow. 1138 m2. Piwnica o powierzchni 2,68 m2. ' +
  'Cena wywolawcza nieruchomosci lokalowej wynosi <strong>154.000,-zl</strong>. ' +
  'Przetarg odbedzie sie w dniu 9 grudnia 2025 r. o godz. 10.00 w sali nr 204.</p>';

test('isFlatAuction: keeps flats, drops land/rentals/bezprzetargowe', () => {
  assert.equal(isFlatAuction(FLAT_TITLE), true);
  assert.equal(isFlatAuction(
    'Ogloszenie o II przetargu na sprzedaz udzialu 4/6 lokalu mieszkalnego nr 3'), true);
  assert.equal(isFlatAuction(
    'Ogloszenie o I przetargu na sprzedaz nieruchomosci zabudowanych'), false);
  assert.equal(isFlatAuction(
    'Ogloszenie o V przetargu na sprzedaz nieruchomosci niezabudowanej'), false);
  assert.equal(isFlatAuction(
    'Wykaz lokali mieszkalnych do sprzedazy bezprzetargowej'), false);
});

test('roundFromTitle: reads roman/word ordinal', () => {
  assert.equal(roundFromTitle('Ogloszenie o I przetargu na sprzedaz lokalu'), 1);
  assert.equal(roundFromTitle('Ogloszenie o II przetargu na sprzedaz lokalu mieszkalnego'), 2);
  assert.equal(roundFromTitle('Ogloszenie o IV przetargu na sprzedaz lokalu'), 4);
  assert.equal(roundFromTitle('Ogloszenie o czwartym ustnym przetargu'), 4);
  assert.equal(roundFromTitle('Ogloszenie o przetargu ustnym nieograniczonym'), 1);
});

test('addressFrom: building-before-street (Myslowice pattern)', () => {
  const r = addressFrom(
    'Ogloszenie o I przetargu na sprzedaz lokalu mieszkalnego nr 16 ' +
    'w budynku nr 10B przy ulicy Armii Krajowej w Myslowicach.', '');
  assert.ok(r);
  assert.equal(r.address.key, 'armii krajowej|10B|16');
  const r2 = addressFrom(
    'Ogloszenie o I przetargu na sprzedaz lokalu mieszkalnego nr 2 ' +
    'w budynku nr 17 przy ulicy Wojciecha Korfantego w Myslowicach.', '');
  assert.equal(r2.address.key, 'wojciecha korfantego|17|2');
});

test('parseAnnouncement: address/area/price/date/round', () => {
  const r = parseAnnouncement(FLAT_TITLE, FLAT_BODY);
  assert.ok(r);
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'armii krajowej|10B|16');
  assert.equal(r.area_m2, 30.37);
  assert.equal(r.starting_price_pln, 154000);
  assert.equal(r.auction_date, '2025-12-09');
  assert.equal(r.round, 1);
});

test('areaFromText: prefers labelled flat area, rejects plot + cellar', () => {
  assert.equal(areaFromText('o pow. uzytkowej 30,37 m2, dzialki o lacznej pow. 1138 m2'), 30.37);
  assert.equal(areaFromText('powierzchnia uzytkowa lokalu: 47,30 m2'), 47.3);
  assert.equal(areaFromText('dzialki o lacznej pow. 1138 m2'), null);
  assert.equal(areaFromText('piwnice o powierzchni 2,68 m2'), null);
});

test('priceFromText: dot-thousands + ",-" grosze; share-price gap', () => {
  assert.equal(priceFromText('Cena wywolawcza wynosi 154.000,-zl'), 154000);
  assert.equal(priceFromText('Cena wywolawcza wynosi 215 000,00 zl'), 215000);
  assert.equal(priceFromText(
    'Cena wywolawcza udzialu 4/6 czesci lokalu nr 11 wynosi 169 000,00 zl'), 169000);
  assert.equal(priceFromText(
    'Cena wywolawcza udzialu 1/2 czesci wynosi 95 000 zl. Wadium 9 500 zl.'), 95000);
});

test('shareFromTitle: reads fraction or null', () => {
  assert.equal(shareFromTitle(
    'Ogloszenie o II przetargu na sprzedaz udzialu 4/6 czesci prawa lokalu nr 11'), '4/6');
  assert.equal(shareFromTitle(
    'Ogloszenie o I przetargu na sprzedaz udzialu 1/2 czesci lokalu mieszkalnego'), '1/2');
  assert.equal(shareFromTitle(FLAT_TITLE), null);
});

test('parseAnnouncement: share flag + price together', () => {
  const t =
    'Ogloszenie o II przetargu na sprzedaz udzialu 4/6 czesci lokalu mieszkalnego nr 11 ' +
    'w budynku nr 1 przy ulicy Powstancow w Myslowicach.';
  const b =
    '<p>Przetarg na sprzedaz udzialu 4/6 czesci lokalu nr 11, ' +
    'o pow. uzytkowej 59,00 m2, budynek nr 1 ul. Powstancow. ' +
    'Cena wywolawcza udzialu 4/6 wynosi 169 000,00 zl. ' +
    'Przetarg w dniu 07.07.2026 r.</p>';
  const r = parseAnnouncement(t, b);
  assert.ok(r);
  assert.equal(r.share, '4/6');
  assert.equal(r.starting_price_pln, 169000);
  assert.equal(r.area_m2, 59);
});

test('auctionDateFromText: spelled month and numeric', () => {
  assert.equal(auctionDateFromText('Przetarg odbedzie sie w dniu 9 grudnia 2025 r.'), '2025-12-09');
  assert.equal(auctionDateFromText('Przetarg odbedzie sie w dniu 06.04.2026 r.'), '2026-04-06');
});

test('parseIndexLinks: harvest + dedup; broadened linkFilter passes land (HL-27)', () => {
  const origin = 'https://bip.myslowice.pl';
  const html =
    '<a href="/artykul/rada-miasta">nav</a>' +
    '<a href="/artykul/ogloszenie-lokal-nr-6">flat</a>' +
    '<a href="/artykul/ogloszenie-nieruchomosc-niezabudowana">land</a>' +
    '<a href="/strona/cookies">skip</a>' +
    '<a href="/artykul/ogloszenie-lokal-nr-6">dup</a>';
  const links = parseIndexLinks(html, origin);
  assert.equal(links.length, 2);
  assert.equal(links[0], origin + '/artykul/ogloszenie-lokal-nr-6');
  assert.equal(links[1], origin + '/artykul/ogloszenie-nieruchomosc-niezabudowana');
  const FILTER = /lokal|niezabudow|zabudow|uzytkow|dzialk|grunt/i;
  assert.deepEqual(links.filter((u) => FILTER.test(u)), links);
});

// ---- Land via parseLandAnnouncement (HL-27) ----
// CMS-injected spaces: "106 .000,-zl" -> 106000; "2 3 czerwca 202 6" -> 2026-06-23

const LAND_TITLE =
  'Ogloszenie o I przetargu na sprzedaz nieruchomosci niezabudowanej - ul. Dlugiej.';
const LAND_BODY =
  '<p>Oglasza przetarg na sprzedaz dzialki nr 2003/52 o powierzchni 847 m2 ' +
  'obrebu 0003 Dzieckowice przy ul. Dlugiej w Myslowicach. ' +
  'Cena wywolawcza nieruchomosci wynosi 106 .000,-zl. ' +
  'Przetarg odbedzie sie w dniu 2 3 czerwca 202 6 r.</p>';
const LAND_URL = 'https://bip.myslowice.pl/artykul/ogloszenie-niezabudowana';

test('parseLandAnnouncement: parcel/obreb/area + CMS-spaced price+date', () => {
  const r = parseLandAnnouncement(LAND_TITLE, LAND_BODY, LAND_URL);
  assert.ok(r, 'should return a land record');
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '2003/52');
  assert.ok(r.obreb && /dzieckowice|0003/i.test(r.obreb),
    'obreb must contain "0003" or "Dzieckowice", got: ' + r.obreb);
  assert.equal(r.area_m2, 847);
  assert.equal(r.starting_price_pln, 106000, '"106 .000,-zl" must parse to 106000');
  assert.equal(r.auction_date, '2026-06-23', '"2 3 czerwca 202 6" must parse to 2026-06-23');
  assert.equal(r.round, 1);
  assert.equal(r.detail_url, LAND_URL);
});

test('parseLandAnnouncement: street fallback when no parcel', () => {
  const r = parseLandAnnouncement(
    'Ogloszenie o II przetargu na sprzedaz gruntu przy ul. Stokrotek.',
    '<p>Grunt przy ul. Stokrotek o powierzchni 500 m2. Cena wywolawcza wynosi 75 000 zl. ' +
    'Przetarg w dniu 15.08.2026 r.</p>',
    'https://bip.myslowice.pl/artykul/x',
  );
  assert.ok(r);
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, null);
  assert.equal(r.street, 'Stokrotek'); // the real street, not the "ul" prefix
  assert.equal(r.area_m2, 500);
  assert.equal(r.starting_price_pln, 75000);
});

test('parseLandAnnouncement: null when unkeyable', () => {
  assert.equal(parseLandAnnouncement(
    'Przetarg na sprzedaz gruntu.',
    '<p>Tresc bez adresu i bez numeru dzialki.</p>',
    'https://bip.myslowice.pl/artykul/x',
  ), null);
});

test('parseAnnouncement (flat): no regression from land wiring (HL-27)', () => {
  const r = parseAnnouncement(FLAT_TITLE, FLAT_BODY);
  assert.ok(r);
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'armii krajowej|10B|16');
  assert.equal(r.area_m2, 30.37);
  assert.equal(r.starting_price_pln, 154000);
});

// ---- House (zabudowana) + commercial (uzytkowy) routing (coverage fix) ----
// The factory loop in core/finn-bip.js used to drop every non-flat, non-grunt
// title (`if (!isFlat(title)) continue;`), losing ~20 houses + 8 commercial that
// share the Mysłowice przetarg board. Now it resolves the kind on title+body and
// routes house/commercial through parseAnnouncement, stamped with the resolved
// kind. resolveKind classifies on the title first, falling back to the body when
// the title is terse (the kind word lives in the body).

const HOUSE_TITLE =
  'Ogloszenie o I przetargu na sprzedaz nieruchomosci - ul. Stawowa 12.';
const HOUSE_BODY =
  '<h1>Ogloszenie o I przetargu na sprzedaz nieruchomosci - ul. Stawowa 12.</h1>' +
  '<p>Prezydent Miasta Myslowice oglasza ustny przetarg nieograniczony na sprzedaz ' +
  'nieruchomosci zabudowanej budynkiem mieszkalnym jednorodzinnym, polozonej ' +
  'przy ul. Stawowa 12 w Myslowicach, o powierzchni uzytkowej 96,40 m2. ' +
  'Cena wywolawcza nieruchomosci wynosi 420 000,00 zl. ' +
  'Przetarg odbedzie sie w dniu 14 lipca 2026 r. o godz. 11.00.</p>';

const COMMERCIAL_TITLE =
  'Ogloszenie o II przetargu na sprzedaz lokalu uzytkowego nr 3 przy ul. Grunwaldzka 8.';
const COMMERCIAL_BODY =
  '<h1>Ogloszenie o II przetargu na sprzedaz lokalu uzytkowego nr 3 przy ul. Grunwaldzka 8.</h1>' +
  '<p>Oglasza przetarg na sprzedaz lokalu uzytkowego nr 3 o powierzchni uzytkowej ' +
  '45,20 m2 przy ul. Grunwaldzka 8 w Myslowicach. ' +
  'Cena wywolawcza wynosi 180 000,00 zl. Przetarg w dniu 06.04.2026 r.</p>';

test('resolveKind: terse title resolves house/commercial from the body', () => {
  // Title alone is unknown (no zabudowanej/uzytkowego word); body decides.
  assert.equal(resolveKind(HOUSE_TITLE, ''), 'unknown');
  assert.equal(resolveKind(HOUSE_TITLE, 'nieruchomosci zabudowanej budynkiem mieszkalnym'), 'zabudowana');
  // Commercial title already carries "lokalu uzytkowego" → resolves from title.
  assert.equal(resolveKind(COMMERCIAL_TITLE, ''), 'uzytkowy');
  // Flat title must still win even if the body mentions a plot share.
  assert.equal(resolveKind(FLAT_TITLE, 'wraz z udzialem w dzialce gruntu'), 'mieszkalny');
  // Explicit land title stays grunt (no regression).
  assert.equal(resolveKind('Ogloszenie o V przetargu na sprzedaz nieruchomosci niezabudowanej', ''), 'grunt');
});

test('isSaleAuction: admits houses/commercial, drops notices/rentals/bezprzetarg', () => {
  assert.equal(isSaleAuction(HOUSE_TITLE), true);
  assert.equal(isSaleAuction(COMMERCIAL_TITLE), true);
  assert.equal(isSaleAuction('Informacja o wyniku przetargu na sprzedaz nieruchomosci'), false);
  assert.equal(isSaleAuction('Wykaz lokali do sprzedazy bezprzetargowej'), false);
  assert.equal(isSaleAuction('Ogloszenie o przetargu na najem lokalu uzytkowego'), false);
  assert.equal(isSaleAuction('Zamiar sprzedazy nieruchomosci ul. Stawowa'), false);
});

test('house: parseAnnouncement keys + extracts; routed kind is zabudowana', () => {
  const kind = resolveKind(HOUSE_TITLE, '<p>nieruchomosci zabudowanej</p>');
  assert.equal(kind, 'zabudowana');
  const r = parseAnnouncement(HOUSE_TITLE, HOUSE_BODY);
  assert.ok(r, 'house must be keyable');
  assert.equal(r.address.key, 'stawowa|12|'); // building-level key, no apt
  assert.equal(r.area_m2, 96.4);
  assert.equal(r.starting_price_pln, 420000);
  assert.equal(r.auction_date, '2026-07-14');
  assert.equal(r.round, 1);
});

test('commercial: parseAnnouncement keys + extracts; routed kind is uzytkowy', () => {
  const kind = resolveKind(COMMERCIAL_TITLE, COMMERCIAL_BODY);
  assert.equal(kind, 'uzytkowy');
  const r = parseAnnouncement(COMMERCIAL_TITLE, COMMERCIAL_BODY);
  assert.ok(r, 'commercial must be keyable');
  // Commercial keys at building level: addressFrom only lifts an apt nr for a
  // residential "lokal mieszkalny", so a "lokal użytkowy nr 3" → "<street>|8|".
  assert.equal(r.address.key, 'grunwaldzka|8|');
  assert.equal(r.area_m2, 45.2);
  assert.equal(r.starting_price_pln, 180000);
  assert.equal(r.auction_date, '2026-04-06');
  assert.equal(r.round, 2);
});
