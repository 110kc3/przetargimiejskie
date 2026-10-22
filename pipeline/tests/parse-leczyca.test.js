// Łęczyca parser tests — groundtruthed against REAL fixtures from leczyca.info.pl.
//
// Tests cover:
// - Helper extractors: parsePLN, parseArea, parseDateText, extractRound, extractAddress, isRental, isCancellation
// - Single-lot flat auction (ID 117605: Zachodnia 19/11)
// - Multi-lot mixed batch (ID 109674: Zachodnia 21/21, Szkolna 1/14, 3 commercial units, 4 land plots)
// - Multi-lot flat and commercial batch (ID 102684: Belwederska 38C/64, Ozorkowska 14/4, Konopnickiej 10/29, Zachodnia 19/42)
// - Mixed batch with rental filter and land plots (ID 112643)
// - Single-lot house / built property (ID 123847: Altera 11)
// - Single-lot commercial unit (ID 122165: Kościuszki 10/1)
// - Noise filtering: rental notices (ID 101512) and cancellations (ID 72424)
// - Result document parser (parseResultDoc) for sold and unsold outcomes

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  parsePLN,
  parseArea,
  parseDateText,
  extractRound,
  extractAddress,
  isRental,
  isCancellation,
  splitLots,
  parsePost,
  parseResultDoc,
} from '../src/cities/leczyca/parse.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FIXTURES_PATH = join(__dirname, '../test-fixtures/leczyca/posts.json');
const FIXTURES = JSON.parse(readFileSync(FIXTURES_PATH, 'utf8'));

// ---------------------------------------------------------------------------
// Unit helper tests
// ---------------------------------------------------------------------------

test('parsePLN: various Polish currency strings', () => {
  assert.equal(parsePLN('160.000,00 zł'), 160000);
  assert.equal(parsePLN('240 000 zł'), 240000);
  assert.equal(parsePLN('212.500,00 zł'), 212500);
  assert.equal(parsePLN('429.000,00 zł'), 429000);
  assert.equal(parsePLN('105.411,00 zł'), 105411);
  assert.equal(parsePLN('301.000,00'), 301000);
  assert.equal(parsePLN(''), null);
  assert.equal(parsePLN(null), null);
});

test('parseArea: decimal areas in m2 and ha', () => {
  assert.equal(parseArea('32,87'), 32.87);
  assert.equal(parseArea('49.18'), 49.18);
  assert.equal(parseArea('45,89'), 45.89);
  assert.equal(parseArea('64,26'), 64.26);
  assert.equal(parseArea(''), null);
  assert.equal(parseArea(null), null);
});

test('parseDateText: numeric and spelled-out dates', () => {
  assert.equal(parseDateText('3 czerwca 2025 roku'), '2025-06-03');
  assert.equal(parseDateText('26 października 2023 roku'), '2023-10-26');
  assert.equal(parseDateText('15 lutego 2024 roku'), '2024-02-15');
  assert.equal(parseDateText('18.10.2022'), '2022-10-18');
  assert.equal(parseDateText('18 października', '2022'), '2022-10-18');
  assert.equal(parseDateText(null), null);
  assert.equal(parseDateText(''), null);
});

test('extractRound: Roman numerals and Polish ordinals', () => {
  assert.equal(extractRound('I przetarg ustny nieograniczony'), 1);
  assert.equal(extractRound('II przetarg ustny nieograniczony'), 2);
  assert.equal(extractRound('III przetarg ustny nieograniczony'), 3);
  assert.equal(extractRound('pierwszy przetarg na sprzedaż'), 1);
  assert.equal(extractRound('drugi przetarg na sprzedaż'), 2);
  assert.equal(extractRound('trzeci przetarg na sprzedaż'), 3);
  assert.equal(extractRound('czwarty przetarg na sprzedaż'), 4);
  assert.equal(extractRound('piąty przetarg na sprzedaż'), 5);
  assert.equal(extractRound('ogłoszenie bez numeru przetargu'), null);
});

test('isRental and isCancellation: noise filtering', () => {
  assert.equal(isRental('Przetarg ustny nieograniczony na najem lokalu'), true);
  assert.equal(isRental('Ogłoszenie przetargu ustnego nieograniczonego na oddanie w najem lokali użytkowych'), true);
  assert.equal(isRental('Ogłoszenie o przetargu ustnym nieograniczonym na sprzedaż lokalu mieszkalnego'), false);
  assert.equal(isCancellation('Informacja o odwołaniu przetargu na sprzedaż lokalu przy ul. Dworcowej 5E/38'), true);
  assert.equal(isCancellation('Przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego'), false);
});

test('extractAddress: address and City Hall filtering', () => {
  const lotFlat = 'lokal mieszkalny nr 11 usytuowany na trzecim piętrze w budynku wielolokalowym, położonym w Łęczycy przy ul. Zachodniej 19';
  const addr1 = extractAddress(lotFlat);
  assert.equal(addr1.parsed.street, 'Zachodniej');
  assert.equal(addr1.parsed.building, '19');
  assert.equal(addr1.parsed.apt, '11');

  // Venue is City Hall (Konopnickiej 14), actual property is Dworcowa 5D/30
  const lotWithVenue = 'w Urzędzie Miejskim w Łęczycy przy ul. Marii Konopnickiej 14 w sali konferencyjnej - pierwszy przetarg na sprzedaż lokalu mieszkalnego nr 30 położonym w Łęczycy przy ul. Dworcowej 5D';
  const addr2 = extractAddress(lotWithVenue);
  assert.equal(addr2.parsed.street, 'Dworcowej');
  assert.equal(addr2.parsed.building, '5D');
  assert.equal(addr2.parsed.apt, '30');

  // Commercial unit at Plac Tadeusza Kościuszki 10/1
  const lotComm = 'pierwszy przetarg ustny nieograniczony na sprzedaż lokalu użytkowego nr 1, położonego w Łęczycy przy Placu Tadeusza Kościuszki 10';
  const addr3 = extractAddress(lotComm);
  assert.equal(addr3.parsed.street, 'Tadeusza Kościuszki');
  assert.equal(addr3.parsed.building, '10');
  assert.equal(addr3.parsed.apt, '1');

  // Land plot with no street address
  const lotLand = 'przetarg na sprzedaż nieruchomości gruntowej położonej w Łęczycy, oznaczonej wg ewidencji gruntów jako działka nr 1865/1';
  const addr4 = extractAddress(lotLand);
  assert.equal(addr4.parcel, '1865/1');
  assert.equal(addr4.raw, 'Łęczyca, dz. 1865/1');
});

// ---------------------------------------------------------------------------
// Real Fixture Tests
// ---------------------------------------------------------------------------

test('Post 117605: single-lot flat auction (Zachodnia 19/11)', () => {
  const post = FIXTURES['117605'];
  const { listings, land } = parsePost(post);

  assert.equal(listings.length, 1);
  assert.equal(land.length, 0);

  const flat = listings[0];
  assert.equal(flat.kind, 'mieszkalny');
  assert.equal(flat.address.street, 'Zachodniej');
  assert.equal(flat.address.building, '19');
  assert.equal(flat.address.apt, '11');
  assert.equal(flat.area_m2, 32.87);
  assert.equal(flat.starting_price_pln, 160000);
  assert.equal(flat.auction_date, '2025-06-03');
  assert.equal(flat.round, 1);
  assert.equal(flat.kw_nr, 'LD1Y/00000608/5');
  assert.equal(flat.detail_url, 'https://leczyca.info.pl/ogloszenie-o-przetargu-ustnym-nieograniczonym-na-sprzedaz-lokalu-mieszkalnego/');
});

test('Post 109674: 2023-10-26 multi-lot batch (flats, commercial, land)', () => {
  const post = FIXTURES['109674'];
  const { listings, land } = parsePost(post);

  // 2 flats + 3 commercial lots = 5 listings
  assert.equal(listings.length, 5);
  // 4 land plots
  assert.equal(land.length, 4);

  // Flat 1: Zachodnia 21/21
  const flat1 = listings.find((l) => l.address?.building === '21' && l.address?.apt === '21');
  assert.ok(flat1);
  assert.equal(flat1.kind, 'mieszkalny');
  assert.equal(flat1.area_m2, 49.18);
  assert.equal(flat1.starting_price_pln, 240000);
  assert.equal(flat1.auction_date, '2023-10-26');

  // Flat 2: Szkolna 1/14
  const flat2 = listings.find((l) => l.address?.street === 'Szkolnej' && l.address?.apt === '14');
  assert.ok(flat2);
  assert.equal(flat2.kind, 'mieszkalny');
  assert.equal(flat2.area_m2, 45.89);
  assert.equal(flat2.starting_price_pln, 212500);
  assert.equal(flat2.auction_date, '2023-10-26');

  // Commercial lots
  const commLots = listings.filter((l) => l.kind === 'uzytkowy');
  assert.equal(commLots.length, 3);
  const apts = commLots.map((l) => l.address?.apt).sort();
  assert.deepEqual(apts, ['37', '39', '42']);

  // Land plots
  assert.equal(land.length, 4);
  const parcels = land.map((l) => l.dzialka_nr).sort();
  assert.deepEqual(parcels, ['118/13', '118/37', '1605', '1864']);
  for (const plot of land) {
    assert.equal(plot.auction_date, '2023-10-26');
    assert.ok(plot.starting_price_pln > 0);
  }
});

test('Post 102684: 2022-10-18 multi-lot batch (Belwederska, Ozorkowska, Konopnickiej, Zachodnia, Poznańska)', () => {
  const post = FIXTURES['102684'];
  const { listings, land } = parsePost(post);

  assert.equal(listings.length, 5);
  assert.equal(land.length, 0);

  // Flat Belwederska 38C/64
  const belw = listings.find((l) => l.address?.apt === '64');
  assert.ok(belw);
  assert.equal(belw.kind, 'mieszkalny');
  assert.equal(belw.address.street_norm, 'belwederska');
  assert.equal(belw.address.building, '38C');
  assert.equal(belw.area_m2, 35.56);
  assert.equal(belw.starting_price_pln, 140000);
  assert.equal(belw.auction_date, '2022-10-18');

  // Flat Ozorkowska 14/4
  const ozork = listings.find((l) => l.address?.street_norm === 'ozorkowska');
  assert.ok(ozork);
  assert.equal(ozork.kind, 'mieszkalny');
  assert.equal(ozork.address.building, '14');
  assert.equal(ozork.address.apt, '4');
  assert.equal(ozork.area_m2, 39.13);
  assert.equal(ozork.auction_date, '2022-10-18');

  // Commercial Konopnickiej 10/29 (building 10, not 14)
  const konop = listings.find((l) => l.address?.building === '10');
  assert.ok(konop);
  assert.equal(konop.kind, 'uzytkowy');
  assert.equal(konop.address.apt, '29');

  // Tenement Poznańska 25
  const pozn = listings.find((l) => l.address?.street_norm === 'poznanska');
  assert.ok(pozn);
  assert.equal(pozn.kind, 'zabudowana');
  assert.equal(pozn.address.building, '25');
  assert.equal(pozn.starting_price_pln, 360000);
  assert.equal(pozn.auction_date, '2022-11-22');
});

test('Post 112643: mixed batch with rental filter and land plots', () => {
  const post = FIXTURES['112643'];
  const { listings, land } = parsePost(post);

  // Flats: Dworcowa 5D/30, Szkolna 1/14; Commercial: Zachodnia 19/42
  assert.equal(listings.length, 3);
  const dworcowa = listings.find((l) => l.address?.street === 'Dworcowej');
  assert.ok(dworcowa);
  assert.equal(dworcowa.address.building, '5D');
  assert.equal(dworcowa.address.apt, '30');
  assert.equal(dworcowa.area_m2, 46.73);
  assert.equal(dworcowa.starting_price_pln, 214000);
  assert.equal(dworcowa.round, 1);

  const szkolna = listings.find((l) => l.address?.street === 'Szkolnej');
  assert.ok(szkolna);
  assert.equal(szkolna.round, 3);

  // Land: 5 plots (1865/1, 1865/6, 1865/3, 1865/4, 1865/5)
  assert.equal(land.length, 5);
  for (const plot of land) {
    assert.equal(plot.kind, 'grunt');
    assert.ok(plot.dzialka_nr.startsWith('1865/'));
    assert.ok(plot.starting_price_pln > 500000);
  }
});

test('Post 123847: single-lot house / built property (Altera 11)', () => {
  const post = FIXTURES['123847'];
  const { listings, land } = parsePost(post);

  assert.equal(listings.length, 1);
  assert.equal(land.length, 0);

  const house = listings[0];
  assert.equal(house.kind, 'zabudowana');
  assert.equal(house.address.street, 'gen. Franciszka Altera');
  assert.equal(house.address.building, '11');
  assert.equal(house.area_m2, 469); // 0.0469 ha = 469 m2
  assert.equal(house.starting_price_pln, 429000);
  assert.equal(house.auction_date, '2026-10-12');
  assert.equal(house.round, 1);
});

test('Post 122165: single-lot commercial unit (Kościuszki 10/1)', () => {
  const post = FIXTURES['122165'];
  const { listings, land } = parsePost(post);

  assert.equal(listings.length, 1);
  assert.equal(land.length, 0);

  const comm = listings[0];
  assert.equal(comm.kind, 'uzytkowy');
  assert.equal(comm.address.street, 'Tadeusza Kościuszki');
  assert.equal(comm.address.building, '10');
  assert.equal(comm.address.apt, '1');
  assert.equal(comm.area_m2, 12.86);
  assert.equal(comm.starting_price_pln, 43000);
  assert.equal(comm.auction_date, '2026-06-16');
  assert.equal(comm.round, 1);
});

test('Noise filtering: rental notices and cancellations produce no records', () => {
  const rentalPost = FIXTURES['101512'];
  const resRental = parsePost(rentalPost);
  assert.deepEqual(resRental, { listings: [], land: [] });

  const cancelPost = FIXTURES['72424'];
  const resCancel = parsePost(cancelPost);
  assert.deepEqual(resCancel, { listings: [], land: [] });
});

// ---------------------------------------------------------------------------
// Result Document Parser (parseResultDoc)
// ---------------------------------------------------------------------------

test('parseResultDoc: successful / sold flat auction', () => {
  const text = `
    Informacja o wyniku przetargu ustnego nieograniczonego
    Burmistrz Miasta Łęczyca informuje, że w dniu 3 czerwca 2025 r. odbył się
    I przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 11
    położonego w Łęczycy przy ul. Zachodniej 19 o powierzchni użytkowej 32,87 m2.
    Cena wywoławcza: 160.000,00 zł.
    Cena osiągnięta w przetargu: 165.000,00 zł.
    Nabywca: Jan Kowalski.
  `;
  const records = parseResultDoc(text, null, 'https://leczyca.info.pl/wynik-1/');
  assert.equal(records.length, 1);

  const r = records[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.street, 'Zachodniej');
  assert.equal(r.address.building, '19');
  assert.equal(r.address.apt, '11');
  assert.equal(r.starting_price_pln, 160000);
  assert.equal(r.final_price_pln, 165000);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.unsold_reason, null);
  assert.equal(r.auction_date, '2025-06-03');
  assert.equal(r.round, 1);
  assert.equal(r.source_pdf, 'https://leczyca.info.pl/wynik-1/');
});

test('parseResultDoc: negative / unsold flat auction (brak wadium)', () => {
  const text = `
    Informacja o wyniku przetargu ustnego nieograniczonego
    W dniu 15 lutego 2024 r. w Urzędzie Miejskim w Łęczycy przeprowadzono
    II przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 14
    położonego przy ul. Szkolnej 1.
    Cena wywoławcza wynosiła 212.500,00 zł.
    W wyznaczonym terminie nie odnotowano wpłat wadium.
    Przetarg zakończył się wynikiem negatywnym.
  `;
  const records = parseResultDoc(text, null, 'https://leczyca.info.pl/wynik-2/');
  assert.equal(records.length, 1);

  const r = records[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.street, 'Szkolnej');
  assert.equal(r.address.building, '1');
  assert.equal(r.address.apt, '14');
  assert.equal(r.starting_price_pln, 212500);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'brak wadium');
  assert.equal(r.auction_date, '2024-02-15');
  assert.equal(r.round, 2);
});

test('parseResultDoc: noise text returns empty array', () => {
  assert.deepEqual(parseResultDoc(''), []);
  assert.deepEqual(parseResultDoc(null), []);
  assert.deepEqual(parseResultDoc('Sprawozdanie z posiedzenia komisji'), []);
});
