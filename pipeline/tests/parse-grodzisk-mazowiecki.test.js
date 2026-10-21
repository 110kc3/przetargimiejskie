// Grodzisk Mazowiecki parser tests — groundtruthed against REAL fixtures.
//
// Fixture sources:
// 1. ANNOUNCEMENTS:
//    - Wólczyńska 10A/11: III przetarg, 34 m2, 335 000 zł, auction 2026-11-10
//    - Dworska 1/24: I przetarg, 35.48 m2, 351 000 zł, KW WA1G/00083838/6, auction 2026-10-13
//    - T. Bairda 4/28: I przetarg, 34.80 m2, 310 000 zł, KW WA1G/00042594/4, auction 2026-03-10
//    - Kilińskiego 6: I przetarg, zabudowana nieruchomość
//    - Suwalska: I przetarg, grunt, dz. 139/2, 0.0393 ha (393 m2), 265 000 zł, auction 2026-10-08
//    - Sadowa 11/2: wykaz (pre-auction designation)
//
// 2. RESULTS:
//    - Dworska 1/24: I przetarg, sold 418 000 zł, auction 2026-10-13
//    - Bałtycka 10/26: II przetarg, unsold (brak oferentów), starting 545 000 zł, auction 2026-10-06
//    - T. Bairda 4/28: III przetarg, sold 375 000 zł, auction 2026-09-22
//    - Pileckiego 4/8: IV przetarg, sold 323 300 zł, starting 300 000 zł, auction 2026-04-28
//    - Suwalska: I przetarg, grunt dz. 139/2, sold 320 000 zł, starting 265 000 zł, auction 2026-10-08

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseDate,
  parsePLN,
  unitAreaFromText,
  plotAreaFromText,
  startingPriceFromText,
  achievedPriceFromText,
  kwFromText,
  parcelFromText,
  obrebFromText,
  addressFromText,
  roundFromText,
  isAnnouncement,
  isResult,
  isWykaz,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/grodzisk-mazowiecki/parse.js';

// ---------------------------------------------------------------------------
// Helpers & Field Parsers
// ---------------------------------------------------------------------------

test('parseDate: parses dotted, hyphenated and spelled-out dates', () => {
  assert.equal(parseDate('13.10.2026'), '2026-10-13');
  assert.equal(parseDate('2026-10-13'), '2026-10-13');
  assert.equal(parseDate('10 listopada 2026'), '2026-11-10');
  assert.equal(parseDate('30 lipca 2026 r.'), '2026-07-30');
  assert.equal(parseDate(null), null);
  assert.equal(parseDate(''), null);
});

test('parsePLN: parses amounts with spaces, dots, commas', () => {
  assert.equal(parsePLN('335.000,00 zł'), 335000);
  assert.equal(parsePLN('105 000,00 zł'), 105000);
  assert.equal(parsePLN('418.000,00 zł'), 418000);
  assert.equal(parsePLN('320 000 zł'), 320000);
  assert.equal(parsePLN(null), null);
  assert.equal(parsePLN(''), null);
});

test('unitAreaFromText: extracts usable unit area', () => {
  assert.equal(unitAreaFromText('Pow. lokalu mieszkalnego: 34,00 m 2'), 34);
  assert.equal(unitAreaFromText('o powierzchni użytkowej 35,48 m2 w budynku'), 35.48);
  assert.equal(unitAreaFromText('lokalu mieszkalnego o pow. 53,30 m2 wraz z'), 53.3);
  assert.equal(unitAreaFromText('o pow. użytkowej 34,80 m2'), 34.8);
  assert.equal(unitAreaFromText('no area here'), null);
});

test('plotAreaFromText: converts ha to m2 or reads m2 directly', () => {
  assert.equal(plotAreaFromText('działka nr 139/2 o pow. 0,0393 ha, obręb 0069'), 393);
  assert.equal(plotAreaFromText('działka nr 10/2 o pow. 0,1890 ha'), 1890);
  assert.equal(plotAreaFromText('działka o pow. 1200 m2'), 1200);
  assert.equal(plotAreaFromText('no area'), null);
});

test('kwFromText: extracts and normalizes WA1G KW number', () => {
  assert.equal(kwFromText('Księga wieczysta lokalu nr WAI G/00083838/6.'), 'WA1G/00083838/6');
  assert.equal(kwFromText('księga wieczystam WAlG/00083838/6 - dział III'), 'WA1G/00083838/6');
  assert.equal(kwFromText('księga wieczysta nr WA1G/00064245/3'), 'WA1G/00064245/3');
  assert.equal(kwFromText('brak księgi wieczystej'), null);
});

test('parcelFromText & obrebFromText: extracts cadastre details', () => {
  assert.equal(parcelFromText('działka nr 139/2 o pow. 0,0393 ha, obręb 0069'), '139/2');
  assert.equal(obrebFromText('działka nr 139/2 o pow. 0,0393 ha, obręb 0069'), '0069');
  assert.equal(parcelFromText('działki ew. nr 17/12 i nr 18/12 w obrębie 0034'), '17/12, 18/12');
  assert.equal(obrebFromText('działki ew. nr 17/12 i nr 18/12 w obrębie 0034'), '0034');
});

test('roundFromText: parses Roman and Arabic round markers', () => {
  assert.equal(roundFromText('I przetarg ustny nieograniczony'), 1);
  assert.equal(roundFromText('II przetarg ustny nieograniczony'), 2);
  assert.equal(roundFromText('III przetarg ustny nieograniczony'), 3);
  assert.equal(roundFromText('IV przetarg ustny nieograniczony'), 4);
});

test('startingPriceFromText & achievedPriceFromText: extracts auction prices', () => {
  assert.equal(startingPriceFromText('Cena wywoławcza: 335.000,00 zł'), 335000);
  assert.equal(startingPriceFromText('Cena wywoławcza wynosiła 560.000,00 zł.'), 560000);
  assert.equal(startingPriceFromText('Cena wywoławcza wynosi: 310.000,00 zł'), 310000);

  assert.equal(achievedPriceFromText('Najwyższa cena zaoferowana w przetargu wynosiła 418.000,00 zł.'), 418000);
  assert.equal(achievedPriceFromText('Najwyższa cena zaoferowana w przetargu: 375 000,00 zł'), 375000);
  assert.equal(achievedPriceFromText('zaoferowana w przetargu: 323 300,00 zł'), 323300);
  assert.equal(achievedPriceFromText('Cena wywoławcza wynosiła 545.000,00 zł'), null);
});

test('addressFromText: ignores office street (Kościuszki) and extracts property address', () => {
  const text = `
    w budynku „Willi Niespodzianka" w Grodzisku Mazowieckim przy ul. Kościuszki 12 w sali na parterze.
    1. Przeznaczony do sprzedaży lokal o pow. użytkowej 35,48 m2 znajduje się w budynku położonym przy
    ul. Dworskiej 1 w Grodzisku Mazowieckim.
  `;
  const addr = addressFromText('Sprzedaż lokalu mieszkalnego nr 24', text);
  assert.ok(addr);
  assert.equal(addr.raw, 'ul. Dworskiej 1/24');
  assert.equal(addr.parsed.building, '1');
  assert.equal(addr.parsed.apt, '24');
  assert.ok(/dworsk/i.test(addr.parsed.street_norm));
});

test('isAnnouncement, isResult, isWykaz gates', () => {
  assert.equal(isAnnouncement('III przetarg ustny nieograniczony na sprzedaż lokalu'), true);
  assert.equal(isAnnouncement('Wykaz nieruchomości przeznaczonych do sprzedaży'), true);
  assert.equal(isAnnouncement('Ogłoszenie o wynajmie lokalu użytkowego'), false);

  assert.equal(isResult('INFORMACJA O WYNIKU I PRZETARGU USTNEGO NIEOGRANICZONEGO'), true);
  assert.equal(isResult('III przetarg ustny nieograniczony na sprzedaż lokalu'), false);

  assert.equal(isWykaz('Wykaz nieruchomości przeznaczonych do sprzedaży dot. lokalu mieszkalnego'), true);
  assert.equal(isWykaz('III przetarg ustny nieograniczony na sprzedaż lokalu'), false);
});

// ---------------------------------------------------------------------------
// Announcement Fixtures
// ---------------------------------------------------------------------------

const WOLCZYNSKA_ANN_TEXT = `
BURMISTRZ GRODZISKA MAZOWIECKIEGO OGŁASZA:
III przetarg ustny nieograniczony na sprzedaż niewyodrębnionego prawnie
lokalu mieszkalnego nr 11 mieszczącego się w budynku zlokalizowanym
przy ul. Wólczyńskiej 10A w Grodzisku Mazowieckim

Lokalizacja: Grodzisk Mazowiecki ul. Wólczyńska 10A m. 11
Pow. lokalu mieszkalnego: 34,00 m 2
Cena wywoławcza: 335.000,00 zł
Wadium: 33.500,00 zł

Przetarg odbędzie się w dniu 10 listopada 2026 r. o godz. 11:00
w budynku „Willi Niespodzianka" w Grodzisku Mazowieckim przy ul. Kościuszki 12 w sali na parterze.
`;

test('parseAnnouncement: Wólczyńska 10A/11 (active round III flat auction)', () => {
  const rec = parseAnnouncement(
    'Sprzedaż lokalu mieszkalnego – ul. Wólczyńska 10A/11',
    WOLCZYNSKA_ANN_TEXT,
    'https://nieruchomosci.grodzisk.pl/2026/09/24/sprzedaz-lokalu-mieszkalnego-ul-wolczynska-10a-11/',
  );
  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address.building, '10A');
  assert.equal(rec.address.apt, '11');
  assert.ok(/wolczynsk/i.test(rec.address.street_norm));
  assert.equal(rec.area_m2, 34);
  assert.equal(rec.starting_price_pln, 335000);
  assert.equal(rec.round, 3);
  assert.equal(rec.auction_date, '2026-11-10');
  assert.equal(rec.is_wykaz, false);
});

const DWORKSA_ANN_TEXT = `
BURMISTRZ GRODZISKA MAZOWIECKIEGO OGŁASZA:
I przetarg ustny nieograniczony na sprzedaż
spółdzielczego własnościowego prawa do lokalu mieszkalnego nr 24
mieszczącego się w budynku przy ul. Dworskiej 1 w Grodzisku Mazowieckim.

Przetarg odbędzie się w dniu 13.10.2026 r. o godz. 11:00
w budynku „ Willi Niespodzianka" w Grodzisku Mazowieckim
przy ul. Kościuszki 12 w sali na parterze.
1. Przeznaczony do sprzedaży lokal o pow. użytkowej 35,48 m2 znajduje się w budynku położonym przy
ul. Dworskiej 1 w Grodzisku Mazowieckim.
Dla lokalu prowadzona jest księga wieczysta nr WA1G/00083838/6.
3. Cena wywoławcza wynosi 351.000,00 zł.
`;

test('parseAnnouncement: Dworska 1/24 (round I flat auction)', () => {
  const rec = parseAnnouncement(
    'Sprzedaż lokalu mieszkalnego – ul. Dworska 1/24 w Grodzisku Mazowieckim',
    DWORKSA_ANN_TEXT,
    'https://nieruchomosci.grodzisk.pl/2026/09/08/sprzedaz-lokalu-mieszkalnego-ul-dworska-1-24-w-grodzisku-mazowieckim/',
  );
  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address.building, '1');
  assert.equal(rec.address.apt, '24');
  assert.ok(/dworsk/i.test(rec.address.street_norm));
  assert.equal(rec.area_m2, 35.48);
  assert.equal(rec.starting_price_pln, 351000);
  assert.equal(rec.round, 1);
  assert.equal(rec.auction_date, '2026-10-13');
  assert.equal(rec.kw_nr, 'WA1G/00083838/6');
});

const BAIRDA_ANN_TEXT = `
BURMISTRZ GRODZISKA MAZOWIECKIEGO OGŁASZA:
I przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 28
mieszczącego się w budynku przy ul. T. Bairda 4 w Grodzisku Mazowieckim.

Przetarg odbędzie się w dniu 10.03.2026 r. o godz. 11.00
w budynku „Willi Niespodzianka" w Grodzisku Mazowieckim przy ul. Kościuszki 12.
1. Przeznaczony do sprzedaży lokal mieszkalny 28 o pow. użytkowej 34,80 m2 znajduje się w budynku
położonym przy ul. T. Bairda 4 w Grodzisku Mazowieckim. Dla lokalu ustanowiono odrębną księgę
wieczystą nr WA1G/00042594/4.
Cena wywoławcza wynosi: 310.000,00 zł.
`;

test('parseAnnouncement: T. Bairda 4/28 (round I flat auction)', () => {
  const rec = parseAnnouncement(
    'Sprzedaż lokalu – ul. T. Bairda 4/28',
    BAIRDA_ANN_TEXT,
    'https://nieruchomosci.grodzisk.pl/2026/01/28/sprzedaz-lokalu-ul-t-bairda-4-28/',
  );
  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address.building, '4');
  assert.equal(rec.address.apt, '28');
  assert.ok(/bairda/i.test(rec.address.street_norm));
  assert.equal(rec.area_m2, 34.8);
  assert.equal(rec.starting_price_pln, 310000);
  assert.equal(rec.round, 1);
  assert.equal(rec.auction_date, '2026-03-10');
  assert.equal(rec.kw_nr, 'WA1G/00042594/4');
});

const SUWALSKA_ANN_TEXT = `
BURMISTRZ GRODZISKA MAZOWIECKIEGO OGŁASZA:
I przetarg ustny nieograniczony na sprzedaż części nieruchomości gruntowej położonej
w Grodzisku Mazowieckim przy ul. Suwalskiej, oznaczonej w ewidencji gruntów jako
działka nr 139/2 o pow. 0,0393 ha, obręb 0069.
Cena wywoławcza wynosiła 265.000,00 zł.
Przetarg odbędzie się w dniu 08.10.2026 r.
`;

test('parseAnnouncement: Suwalska (round I land auction)', () => {
  const rec = parseAnnouncement(
    'Sprzedaż części nieruchomości gruntowej – ul. Suwalska',
    SUWALSKA_ANN_TEXT,
    'https://nieruchomosci.grodzisk.pl/2026/09/04/sprzedaz-czesci-nieruchomosci-gruntowej-ul-suwalska/',
  );
  assert.ok(rec);
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.dzialka_nr, '139/2');
  assert.equal(rec.obreb, '0069');
  assert.equal(rec.area_m2, 393);
  assert.equal(rec.starting_price_pln, 265000);
  assert.equal(rec.auction_date, '2026-10-08');
  assert.equal(rec.round, 1);
});

test('parseAnnouncement: Sadowa 11/2 (wykaz designation)', () => {
  const rec = parseAnnouncement(
    'Sprzedaż lokalu mieszkalny – Grodzisk Mazowiecki ul. Sadowa 11',
    'WGN.6840.26.2026 – Wykaz nieruchomości przeznaczonych do sprzedaży dot. lokalu mieszkalnego nr 2 w budynku przy ul. Sadowej 11 w Grodzisku Mazowieckim',
    'https://nieruchomosci.grodzisk.pl/2026/09/10/sprzedaz-lokalu-mieszkalny-grodzisk-mazowiecki-ul-sadowa-11/',
    { isWykaz: true },
  );
  assert.ok(rec);
  assert.equal(rec.is_wykaz, true);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address.building, '11');
  assert.equal(rec.address.apt, '2');
  assert.ok(/sadow/i.test(rec.address.street_norm));
  assert.equal(rec.auction_date, null);
  assert.equal(rec.starting_price_pln, null);
});

// ---------------------------------------------------------------------------
// Result Fixtures
// ---------------------------------------------------------------------------

const DWORSKA_RES_TEXT = `
Grodzisk Mazowiecki, dnia 20.10.2026 r.
URZĄD MIEJSKI WYDZIAŁ GOSPODARKI NIERUCHOMOŚCIAMI
ul. T. Kościuszki 12A 05-825 Grodzisk Mazowiecki
WGN.6840.17.2026

INFORMACJA O WYNIKU I PRZETARGU USTNEGO NIEOGRANICZONEGO
na sprzedaż spółdzielczego własnościowego prawa do lokalu mieszkalnego
nr 24 o powierzchni użytkowej 35,48 m2 mieszczącego się w budynku
przy ul. Dworskiej 1 w Grodzisku Mazowieckim

W dniu 13.10.2026 r. o godz. 11 :00 w budynku Willi Niespodzianka w Grodzisku
Mazowieckim przy ul. T. Kościuszki 12 został przeprowadzony I przetarg ustny
nieograniczony na sprzedaż spółdzielczego własnościowego prawa do lokalu mieszkalnego
nr 24 o powierzchni użytkowej 35,48 m2 mieszczącego się w budynku przy ul. Dworskiej 1
w Grodzisku Mazowieckim. Lokal znajduje się na I piętrze w budynku mieszkalnym
wielorodzinnym. Księga wieczysta lokalu nr WA1G/00083838/6.
Do przetargu zakwalifikowało się 4 oferentów, którzy wpłacili wadium w wysokości
35.100,00 zł, przed upływem terminu określonego w ogłoszeniu o przetargu.

Najwyższa cena zaoferowana w przetargu wynosiła 418.000,00 zł.
Sprzedaż nieruchomości zwolniona jest od podatku VAT na mocy art. 43 ust. 1 pkt 10 ustawy.

Nabywcą spółdzielczego własnościowego prawa do lokalu mieszkalnego nr 24
mieszczącego się w budynku przy ul. Dworskiej 1 zostali Państwo Alina i Emil małż. Niccy.
`;

test('parseResultDoc: Dworska 1/24 (SOLD round I, 418 000 zł)', () => {
  const records = parseResultDoc(DWORSKA_RES_TEXT, null, 'https://bip.grodzisk.pl/e,pobierz,get.html?id=60367');
  assert.equal(records.length, 1);
  const r = records[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.outcome, 'sold');
  assert.equal(r.final_price_pln, 418000);
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2026-10-13');
  assert.equal(r.address.building, '1');
  assert.equal(r.address.apt, '24');
  assert.ok(/dworsk/i.test(r.address.street_norm));
  assert.equal(r.area_m2, 35.48);
  assert.equal(r.kw_nr, 'WA1G/00083838/6');
  assert.equal(r.unsold_reason, null);
});

const BALTYCKA_RES_TEXT = `
Grodzisk Mazowiecki, dnia 06.10.2026 r.
URZĄD MIEJSKI WYDZIAŁ GOSPODARKI NIERUCHOMOŚCIAMI
ul. T. Kościuszki 12A 05-825 Grodzisk Mazowiecki
WGN.6840.3.2026

INFORMACJA O WYNIKU II PRZETARGU USTNEGO NIEOGRANICZONEGO
na sprzedaż lokalu mieszkalnego nr 26 mieszczącego się w budynku
przy ul. Bałtyckiej 10 w Grodzisku Mazowieckim

W dniu 06.10.2026 r. o godz. 11:00 w budynku Willi Niespodzianka w Grodzisku
Mazowieckim przy ul. T. Kościuszki 12 został przeprowadzony II przetarg ustny
nieograniczony na sprzedaż lokalu mieszkalnego nr 26 o pow. 53,30 m2 wraz z
pomieszczeniem przynależnym o pow. 3,70 m2, mieszczącego się w budynku przy
ul. Bałtyckiej 10 w Grodzisku Mazowieckim.
Cena wywoławcza wynosiła 545.000,00 zł.

Przetarg zakończył się wynikiem negatywnym z uwagi na brak oferentów.
`;

test('parseResultDoc: Bałtycka 10/26 (UNSOLD round II, brak oferentów)', () => {
  const records = parseResultDoc(BALTYCKA_RES_TEXT, null, 'https://bip.grodzisk.pl/e,pobierz,get.html?id=60279');
  assert.equal(records.length, 1);
  const r = records[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'no_bids');
  assert.equal(r.final_price_pln, null);
  assert.equal(r.starting_price_pln, 545000);
  assert.equal(r.round, 2);
  assert.equal(r.auction_date, '2026-10-06');
  assert.equal(r.address.building, '10');
  assert.equal(r.address.apt, '26');
  assert.ok(/baltyck/i.test(r.address.street_norm));
  assert.equal(r.area_m2, 53.3);
});

const BAIRDA_RES_TEXT = `
Grodzisk Mazowiecki, dnia 22.09.2026 r.
URZĄD MIEJSKI WYDZIAŁ GOSPODARKI NIERUCHOMOŚCIAMI
ul. T. Kościuszki 12A 05-825 Grodzisk Mazowiecki
WGN.6840.18.2023

INFORMACJA O WYNIKU III PRZETARGU USTNEGO NIEOGRANICZONEGO
na sprzedaż lokalu mieszkalnego nr 28 w budynku przy ul. T. Bairda 4 w Grodzisku Mazowieckim

W dniu 22.09.2026 r. został przeprowadzony III przetarg...
Najwyższa cena zaoferowana w przetargu: 375 000,00 zł.
Nabywcą lokalu został pan Jan Kowalski.
`;

test('parseResultDoc: T. Bairda 4/28 (SOLD round III, 375 000 zł)', () => {
  const records = parseResultDoc(BAIRDA_RES_TEXT, null, 'https://bip.grodzisk.pl/e,pobierz,get.html?id=60207');
  assert.equal(records.length, 1);
  const r = records[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.outcome, 'sold');
  assert.equal(r.final_price_pln, 375000);
  assert.equal(r.round, 3);
  assert.equal(r.auction_date, '2026-09-22');
  assert.equal(r.address.building, '4');
  assert.equal(r.address.apt, '28');
  assert.ok(/bairda/i.test(r.address.street_norm));
});

const PILECKIEGO_RES_TEXT = `
Grodzisk Mazowiecki, dnia 28.04.2026 r.
URZĄD MIEJSKI WYDZIAŁ GOSPODARKI NIERUCHOMOŚCIAMI
ul. T. Kościuszki 12A 05-825 Grodzisk Mazowiecki
WGN.6840.11.2025

INFORMACJA O WYNIKU IV PRZETARGU USTNEGO NIEOGRANICZONEGO
na sprzedaż niewyodrębnionego prawnie lokalu mieszkalnego nr 8
mieszczącego się w budynku przy ul. Rtm. Witolda Pileckiego 4 w Grodzisku Mazowieckim

W dniu 28.04.2026 r. został przeprowadzony IV przetarg...
Cena wywoławcza wynosiła 300 000,00 zł.
Najwyższa cena zaoferowana w przetargu: 323 300,00 zł.
Nabywcą lokalu został...
`;

test('parseResultDoc: Pileckiego 4/8 (SOLD round IV, 323 300 zł)', () => {
  const records = parseResultDoc(PILECKIEGO_RES_TEXT, null, 'https://bip.grodzisk.pl/e,pobierz,get.html?id=59102');
  assert.equal(records.length, 1);
  const r = records[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.outcome, 'sold');
  assert.equal(r.starting_price_pln, 300000);
  assert.equal(r.final_price_pln, 323300);
  assert.equal(r.round, 4);
  assert.equal(r.auction_date, '2026-04-28');
  assert.equal(r.address.building, '4');
  assert.equal(r.address.apt, '8');
  assert.ok(/pileck/i.test(r.address.street_norm));
});

const SUWALSKA_RES_TEXT = `
Grodzisk Mazowiecki, dnia 15.10.2026 r.
URZĄD MIEJSKI WYDZIAŁ GOSPODARKI NIERUCHOMOŚCIAMI
WGN.6840.19.2025

INFORMACJA O WYNIKU I PRZETARGU USTNEGO NIEOGRANICZONEGO
na sprzedaż części nieruchomości gruntowej położonej
w Grodzisku Mazowieckim przy ul. Suwalskiej,
oznaczonej w ewidencji gruntów jako działka nr 139/2 o pow. 0,0393 ha, obręb 0069

W dniu 08.10.2026 r. o godz. 11 :00 został przeprowadzony I przetarg ustny...
Cena wywoławcza wynosiła 265.000,00 zł.
Najwyższa cena zaoferowana w przetargu: 320 000,00 zł.
Nabywcą lokalu została Spółka DERCLINIC BY MARTHA Sp. z o.o.
`;

test('parseResultDoc: Suwalska (SOLD round I, land plot)', () => {
  const records = parseResultDoc(SUWALSKA_RES_TEXT, null, 'https://bip.grodzisk.pl/e,pobierz,get.html?id=60348');
  assert.equal(records.length, 1);
  const r = records[0];
  assert.equal(r.kind, 'grunt');
  assert.equal(r.outcome, 'sold');
  assert.equal(r.dzialka_nr, '139/2');
  assert.equal(r.obreb, '0069');
  assert.equal(r.area_m2, 393);
  assert.equal(r.starting_price_pln, 265000);
  assert.equal(r.final_price_pln, 320000);
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2026-10-08');
});

test('parseResultDoc: non-result document returns empty array', () => {
  const records = parseResultDoc('Zwykłe ogłoszenie o przetargu na sprzedaż', null, 'https://example.com');
  assert.deepEqual(records, []);
});
