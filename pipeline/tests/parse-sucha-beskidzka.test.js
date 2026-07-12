// Sucha Beskidzka parser tests. Fixtures are condensed-but-faithful copies of
// REAL notice-PDF text fetched live from sucha-beskidzka.pl (the Interaktywna
// Polska property board /pl/879/…, notices under /mfiles/879/28/0/z/*.pdf;
// verified 2026-07-12 from this Pi's Polish residential IP, extracted with the
// same core/pdf-text.js `pdfText` the adapter uses). Long non-load-bearing
// boilerplate (warunki przetargu a–f, RODO clause, wadium-handling procedure,
// cudzoziemcy note) is trimmed; every sentence that feeds a parsed field
// (opening declaration, subject line, area, price, auction date, round ordinal)
// is kept VERBATIM.
//
// The round-I flat fixture deliberately KEEPS the live pdftotext quirk that
// makes this source tricky: its "m²" superscript is dropped, so the flat area
// reads "51,52 m" followed by a U+200B zero-width space and NO "2" (written
// `​` below). It is a regression fixture for cleanText() + the subject-
// anchored flatAreaFromText(), which must still read 51,52 m² where the generic
// "…m²" area helper returns null. The piwnica ("9,95 m") is kept too, to prove
// the flat's own area wins over the cellar's.
//
// Groundtruth (hand-verified against the live PDFs):
//   os. Beskidzkie, blok nr 1, lokal mieszkalny nr 9, 51,52 m², dz. ewid. 9673/6:
//     round I   /mfiles/879/28/0/z/Ogloszenie_przetargu_.pdf   cena wywoławcza
//               155 000 zł, auction 2015-10-26 (opening has NO ordinal word →
//               round 1)
//     round II  /mfiles/879/28/0/z/Ogloszenie_przetargu-1.pdf  155 000 zł,
//               auction 2016-03-01 ("ogłasza drugi przetarg…")
//     round III /mfiles/879/28/0/z/Ogloszenie-przetarg_III.pdf 155 000 zł,
//               auction 2016-05-16 ("ogłasza trzeci przetarg…")
//     → all three share address key "beskidzkie|1|9"; crawlResultDocs forwards
//       rounds I & II as unsold (superseded), keeps III as the latest listing.
//   ul. J. Piłsudskiego, dz. ewid. 9911/1 (grunt, 0,1356 ha = 1356 m²):
//     /mfiles/879/28/0/z/Przetarg_nieograniczony_ul_Pilsudskiego.pdf  cena
//     wywoławcza netto 240 000 zł, auction 2016-12-15 (the venue sits between
//     "odbędzie się" and "w dniu 15 grudnia 2016 r." — resolves via the "w dniu"
//     fallback). Live body describes the plot "zabudowana dwoma budynkami" ~2200
//     chars in; resolveKind's bounded window must ignore that (see the dedicated
//     test) and route it grunt, not zabudowana.
//   ul. Spółdzielców, dz. 6900/7 (grunt, table-format notice):
//     /mfiles/879/28/0/z/Przetarg_S.pdf  auction 2020-08-11; parcel extracted
//     from the "Lp." table row; price/area are not machine-readable from the
//     table layout (best-effort null — a documented low-value gap).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { classifyKind } from '../src/core/classify-kind.js';
import {
  cleanText,
  isSaleTitle,
  resolveKind,
  flatAddressFrom,
  flatAreaFromText,
  parcelFromText,
  landStreetFromText,
  subjectKey,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/sucha-beskidzka/parse.js';

// ------------------------------------------------------------------ fixtures

const T_FLAT1 = 'BURMISTRZ MIASTA SUCHA BESKIDZKA ogłasza przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 9, znajdującego się w bloku nr 1, os. Beskidzkie';
const FLAT1 =
  `Sucha Beskidzka, dnia 14 września 2015 r.
BURMISTRZ MIASTA SUCHA BESKIDZKA
ogłasza przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 9, znajdującego się w bloku nr 1, os. Beskidzkie w Suchej Beskidzkiej wraz z udziałem w częściach wspólnych nieruchomości oraz działce ewidencyjnej nr 9673/6
1. Oznaczenie według księgi wieczystej oraz katastru nieruchomości:
Lokal mieszkalny nr 9 o powierzchni 51,52 m​ znajduje się w bloku nr 1, os. Beskidzkie w Suchej Beskidzkiej. Z mieszkaniem związany jest udział 60/1000 w częściach wspólnych budynku oraz działce ewidencyjnej nr 9673/6 o powierzchni 0,0723 ha.
2. Opis nieruchomości:
Do lokalu przynależna jest piwnica o powierzchni 9,95 m​ . Mieszkanie usytuowane jest na drugim piętrze budynku mieszkalnego wielorodzinnego.
4. Cena wywoławcza lokalu wraz z wyposażeniem oraz udziałem w częściach wspólnych budynku i działce: 155.000,00 zł (słownie: sto pięćdziesiąt pięć tysięcy złotych 00/100).
5. Wadium: 30.000,00 zł (słownie: trzydzieści tysięcy złotych 00/100).
2. Przetarg odbędzie się w dniu 26 października 2015 r. o godz. 14.00, w sali sesyjnej Urzędu Miejskiego w Suchej Beskidzkiej, ul. Mickiewicza 19.`;

const T_FLAT2 = 'BURMISTRZ MIASTA SUCHA BESKIDZKA ogłasza drugi przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 9, znajdującego się w bloku nr 1, os. Beskidzkie';
const FLAT2 =
  `BURMISTRZ MIASTA SUCHA BESKIDZKA
ogłasza drugi przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 9, znajdującego się w bloku nr 1, os. Beskidzkie w Suchej Beskidzkiej wraz z udziałem w częściach wspólnych nieruchomości oraz działce ewidencyjnej nr 9673/6
Lokal mieszkalny nr 9 o powierzchni 51,52 m2 znajduje się w bloku nr 1, os. Beskidzkie w Suchej Beskidzkiej.
4. Cena wywoławcza lokalu wraz z wyposażeniem oraz udziałem w częściach wspólnych budynku i działce: 155.000,00 zł (słownie: sto pięćdziesiąt pięć tysięcy złotych 00/100).
2. Przetarg odbędzie się w dniu 01 marca 2016 r. o godz. 13.00, w sali sesyjnej Urzędu Miejskiego w Suchej Beskidzkiej.`;

const T_FLAT3 = 'BURMISTRZ MIASTA SUCHA BESKIDZKA ogłasza trzeci przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 9, znajdującego się w bloku nr 1, os. Beskidzkie';
const FLAT3 =
  `BURMISTRZ MIASTA SUCHA BESKIDZKA
ogłasza trzeci przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 9, znajdującego się w bloku nr 1, os. Beskidzkie w Suchej Beskidzkiej wraz z udziałem w częściach wspólnych nieruchomości oraz działce ewidencyjnej nr 9673/6
Lokal mieszkalny nr 9 o powierzchni 51,52 m2 znajduje się w bloku nr 1, os. Beskidzkie w Suchej Beskidzkiej.
4. Cena wywoławcza lokalu wraz z wyposażeniem oraz udziałem w częściach wspólnych budynku i działce: 155.000,00 zł (słownie: sto pięćdziesiąt pięć tysięcy złotych 00/100).
2. Przetarg odbędzie się w dniu 16 maja 2016 r. o godz. 14.30, w sali sesyjnej Urzędu Miejskiego w Suchej Beskidzkiej.`;

const T_LAND_PIL = 'BURMISTRZ MIASTA SUCHA BESKIDZKA ogłasza przetarg ustny nieograniczony na sprzedaż nieruchomości zlokalizowanej przy ul. J. Piłsudskiego';
const LAND_PIL =
  `Sucha Beskidzka, dnia 14 listopada 2016 r.
Burmistrz Miasta Sucha Beskidzka
ogłasza przetarg ustny nieograniczony na sprzedaż nieruchomości zlokalizowanej przy ul. J. Piłsudskiego w Suchej Beskidzkiej, stanowiącej własność Gminy Sucha Beskidzka
2. Opis nieruchomości i oznaczenie wg księgi wieczystej oraz katastru nieruchomości: właścicielem nieruchomości obejmującej działkę ewidencyjną nr 9911 / 1 o powierzchni 0,1356 ha jest Gmina Sucha Beskidzka. Działka posiada urządzoną księgę wieczystą Nr KR1B / 00030496 / 3.
4. Cena wywoławcza nieruchomości: - netto: 240.000,00 zł (słownie: dwieście czterdzieści tysięcy złotych 00/100). - brutto: 295.200,00 zł.
Przetarg odbędzie się w Urzędzie Miejskim w Suchej Beskidzkiej, sala sesyjna – pokój nr 21 w dniu 15 grudnia 2016 r. o godz. 14.00.`;

const T_LAND_SPOL = 'BURMISTRZ MIASTA SUCHA BESKIDZKA ogłasza przetarg ustny nieograniczony na sprzedaż nieruchomości gruntowej położonej w Suchej Beskidzkiej przy ul. Spółdzielców';
const LAND_SPOL =
  `Sucha Beskidzka, dnia 22 czerwca 2020 r.
BURMISTRZ MIASTA SUCHA BESKIDZKA
ogłasza przetarg ustny nieograniczony na sprzedaż nieruchomości gruntowej położonej w Suchej Beskidzkiej przy ul. Spółdzielców
Lp. Nr działki Położenie / opis Powierzchnia Nr Księgi Przeznaczenie Cena Wadium
1. 6900 / 7 Położona w Suchej Beskidzkiej 504 KR1B/00030500/5 12MN1 – tereny 55.350,00 zł 5.000,00 przy ul. Spółdzielców. Działka stanowi wąski pas gruntu.
Przetarg odbędzie się w dniu 11 sierpnia 2020 r. o godz. 12.00 w sali nr 21, I piętro Urzędu Miasta.`;

// A real lease notice title from the same board (dominant stream, must be dropped).
const T_LEASE = 'BURMISTRZ MIASTA SUCHA BESKIDZKA ogłasza przetarg pisemny nieograniczony na najem lokalu użytkowego w bloku nr 6, os. Beskidzkie w Suchej Beskidzkiej';
const T_ROKOWANIA = 'BURMISTRZ MIASTA SUCHA BESKIDZKA zaprasza do rokowań na dzierżawę lokalu użytkowego znajdującego się w bloku nr 14, os. Beskidzkie';

// ------------------------------------------------------------------ unit funcs

test('cleanText: strips the U+200B zero-width space that pdftotext leaves where the "m²" superscript was dropped', () => {
  assert.equal(cleanText('51,52 m​'), '51,52 m');
  assert.equal(cleanText('wodno­kanalizacyjną'), 'wodnokanalizacyjną'); // soft hyphen
  assert.equal(cleanText('a b'), 'a b'); // nbsp → space
});

test('isSaleTitle: keeps "ustny … na sprzedaż" sales, drops the najem/dzierżawa/rokowania lease stream', () => {
  assert.equal(isSaleTitle(T_FLAT1), true);
  assert.equal(isSaleTitle(T_FLAT3), true);
  assert.equal(isSaleTitle(T_LAND_SPOL), true);
  assert.equal(isSaleTitle(T_LEASE), false);
  assert.equal(isSaleTitle(T_ROKOWANIA), false);
});

test('flatAddressFrom: "os. <Osiedle>, blok nr <bldg>, lokal mieszkalny nr <apt>" → keyed address (parseAddress strips the "os." lead)', () => {
  const a = flatAddressFrom(cleanText(FLAT1));
  assert.equal(a.address_raw, 'os. Beskidzkie 1/9');
  assert.equal(a.address.street, 'Beskidzkie');
  assert.equal(a.address.building, '1');
  assert.equal(a.address.apt, '9');
  assert.equal(a.address.key, 'beskidzkie|1|9');
});

test('flatAreaFromText: reads the subject-line area even when the "m²" superscript was dropped, and never the piwnica (9,95)', () => {
  assert.equal(flatAreaFromText(cleanText(FLAT1)), 51.52); // "51,52 m" + U+200B, no trailing 2
  assert.equal(flatAreaFromText(cleanText(FLAT2)), 51.52); // "51,52 m2"
});

test('parcelFromText: prose "działkę ewidencyjną nr 9911 / 1" (diacritic-declined, spaced /) AND the table row "1. 6900 / 7"', () => {
  assert.equal(parcelFromText(cleanText(LAND_PIL)), '9911/1');
  assert.equal(parcelFromText(cleanText(LAND_SPOL)), '6900/7');
});

test('landStreetFromText: first "przy ul. <Street>" subject, not the Urząd venue (ul. Mickiewicza)', () => {
  assert.equal(landStreetFromText(cleanText(LAND_SPOL)), 'Spółdzielców');
  assert.equal(landStreetFromText(cleanText(LAND_PIL)), 'J. Piłsudskiego');
});

// Models the live Piłsudskiego notice: a grunt subject up front, then — ~2200
// chars into Część II — the plot is described "…zabudowana dwoma połączonymi
// budynkami". classifyKind over the WHOLE body is fooled into 'zabudowana' by
// that deep mention; resolveKind's bounded opening window must not be.
const PIL_DEEP_ZABUDOWA =
  'ogłasza przetarg ustny nieograniczony na sprzedaż nieruchomości zlokalizowanej przy ul. J. Piłsudskiego. '
  + 'właścicielem nieruchomości obejmującej działkę ewidencyjną nr 9911/1 o powierzchni 0,1356 ha jest Gmina. '
  + 'Uc – tereny usług komercyjnych; KK – tereny kolejowe. '.repeat(12)
  + 'Nieruchomość położona jest na działce o nieregularnym, ale korzystnym kształcie, zabudowana dwoma połączonymi budynkami.';

test('resolveKind: bounded opening window ignores a deep incidental "zabudowan" → grunt, though classifyKind(whole body) is fooled into zabudowana', () => {
  assert.equal(classifyKind(PIL_DEEP_ZABUDOWA), 'zabudowana'); // whole-doc classify: wrong
  assert.equal(resolveKind(PIL_DEEP_ZABUDOWA), 'grunt');       // window: right
});

// ------------------------------------------------------- parseAnnouncement (flats)

test('parseAnnouncement: os. Beskidzkie 1/9 round I — no ordinal word ⇒ round 1; area survives the dropped superscript', () => {
  const r = parseAnnouncement(T_FLAT1, FLAT1, 'https://sucha-beskidzka.pl/mfiles/879/28/0/z/Ogloszenie_przetargu_.pdf');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'beskidzkie|1|9');
  assert.equal(r.area_m2, 51.52);
  assert.equal(r.starting_price_pln, 155000);
  assert.equal(r.auction_date, '2015-10-26');
  assert.equal(r.round, 1);
});

test('parseAnnouncement: os. Beskidzkie 1/9 round II — "ogłasza drugi przetarg" ⇒ round 2, same subject key', () => {
  const r = parseAnnouncement(T_FLAT2, FLAT2, 'https://sucha-beskidzka.pl/mfiles/879/28/0/z/Ogloszenie_przetargu-1.pdf');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'beskidzkie|1|9');
  assert.equal(r.area_m2, 51.52);
  assert.equal(r.starting_price_pln, 155000);
  assert.equal(r.auction_date, '2016-03-01');
  assert.equal(r.round, 2);
});

test('parseAnnouncement: os. Beskidzkie 1/9 round III — "ogłasza trzeci przetarg" ⇒ round 3', () => {
  const r = parseAnnouncement(T_FLAT3, FLAT3, 'https://sucha-beskidzka.pl/mfiles/879/28/0/z/Ogloszenie-przetarg_III.pdf');
  assert.equal(r.round, 3);
  assert.equal(r.address.key, 'beskidzkie|1|9');
  assert.equal(r.auction_date, '2016-05-16');
});

// --------------------------------------------------------- parseAnnouncement (land)

test('parseAnnouncement: ul. J. Piłsudskiego (grunt) — parcel 9911/1, 0,1356 ha → 1356 m², cena wywoławcza netto 240 000 zł, date via "w dniu" fallback', () => {
  const r = parseAnnouncement(T_LAND_PIL, LAND_PIL, 'https://sucha-beskidzka.pl/x.pdf');
  assert.equal(r.kind, 'grunt');
  assert.equal(r.address, null); // land is parcel-keyed
  assert.equal(r.address_raw, 'ul. J. Piłsudskiego');
  assert.equal(r.dzialka_nr, '9911/1');
  assert.equal(r.area_m2, 1356);
  assert.equal(r.starting_price_pln, 240000);
  assert.equal(r.auction_date, '2016-12-15');
  assert.equal(r.round, 1);
});

test('parseAnnouncement: ul. Spółdzielców (grunt, table notice) — parcel from the "Lp." row, street kept; price/area not machine-readable from the table (null, documented gap)', () => {
  const r = parseAnnouncement(T_LAND_SPOL, LAND_SPOL, 'https://sucha-beskidzka.pl/x.pdf');
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '6900/7');
  assert.equal(r.address_raw, 'ul. Spółdzielców');
  assert.equal(r.auction_date, '2020-08-11');
  assert.equal(r.round, 1);
  assert.equal(r.starting_price_pln, null);
  assert.equal(r.area_m2, null);
});

// ------------------------------------------- supersession (the achieved-price proxy)

test('supersession: os. Beskidzkie 1/9 rounds I→II→III share one subject key; rounds I & II are the superseded set (III retained)', () => {
  const recs = [
    parseAnnouncement(T_FLAT1, FLAT1, 'u1'),
    parseAnnouncement(T_FLAT2, FLAT2, 'u2'),
    parseAnnouncement(T_FLAT3, FLAT3, 'u3'),
  ];
  const keys = new Set(recs.map(subjectKey));
  assert.equal(keys.size, 1);
  assert.equal([...keys][0], 'beskidzkie|1|9');
  // Replicates crawlResultDocs' grouping: forward every round but the last.
  const byRound = new Map();
  for (const r of recs) if (!byRound.has(r.round)) byRound.set(r.round, r);
  const rounds = [...byRound.keys()].sort((a, b) => a - b);
  assert.deepEqual(rounds, [1, 2, 3]);
  assert.deepEqual(rounds.slice(0, -1), [1, 2]); // superseded → unsold; round III stays active
});

test('parseResultDoc: superseded round I forwarded — real price/area/date, outcome unsold, NO fabricated hammer price', () => {
  const [r] = parseResultDoc(FLAT1, null, 'https://sucha-beskidzka.pl/mfiles/879/28/0/z/Ogloszenie_przetargu_.pdf');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'beskidzkie|1|9');
  assert.equal(r.area_m2, 51.52);
  assert.equal(r.starting_price_pln, 155000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'superseded_by_next_round');
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2015-10-26');
  assert.equal(r.source_pdf, 'https://sucha-beskidzka.pl/mfiles/879/28/0/z/Ogloszenie_przetargu_.pdf');
});

test('parseResultDoc: superseded round II forwarded — round 2, unsold, final price null', () => {
  const [r] = parseResultDoc(FLAT2, null, 'u2');
  assert.equal(r.round, 2);
  assert.equal(r.address.key, 'beskidzkie|1|9');
  assert.equal(r.starting_price_pln, 155000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
});

test('parseResultDoc: a lease/empty text is never emitted (defensive backstop; crawl.js title-filters first)', () => {
  assert.deepEqual(parseResultDoc('BURMISTRZ … ogłasza przetarg pisemny nieograniczony na najem lokalu użytkowego w bloku nr 6, os. Beskidzkie', null, 'x'), []);
  assert.deepEqual(parseResultDoc('', null, 'x'), []);
  assert.deepEqual(parseResultDoc(null, null, 'x'), []);
});
