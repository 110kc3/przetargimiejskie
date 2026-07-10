// Mrągowo parser tests. Fixtures are condensed-but-faithful copies of REAL
// article bodies fetched live from bipmragowo.warmia.mazury.pl (verified
// 2026-07-10), trimmed of boilerplate legal citations but keeping every
// load-bearing sentence (round/address/area/price/date clauses) verbatim.
//
//   article 8288  ul. Mrongowiusza 31/5   — ANNOUNCEMENT round I, 210 000 zł
//   article 8340  ul. Mrongowiusza 31/5   — RESULT round I, UNSOLD (result of 8288)
//   article 8499  ul. Mrongowiusza 31/5   — RESULT round III, UNSOLD, 160 000 zł
//   article 6841  ul. Królewiecka 16/5    — ANNOUNCEMENT round I, 75 000 zł (2022)
//   article 8080  ul. Wolności 20D/12     — ANNOUNCEMENT round IV + prior-round
//                                            history recap (the round/date trap)
//   article 7859  ul. Wolności 20D/12     — RESULT round I, UNSOLD, "braku oferentów"
//   article 8113  ul. Wolności 20D/12     — RESULT round IV, UNSOLD, "braku uczestników przetargu"
//   article 5099  ul. Mrongowiusza 75/1   — ANNOUNCEMENT round II (Roman), 2016-era
//                                            format, split użytkowanie-wieczyste price
//   article 8512  ul. Niedźwiedzia (grunt) — ANNOUNCEMENT, land, dz. 40/10
//   article 8545  ul. Niedźwiedzia (grunt) — RESULT, land, SOLD 185 000 -> 187 000
//   article 8544  ul. Niedźwiedzia (grunt) — RESULT, land, UNSOLD ("braku postąpienia")
//
// No flat SOLD result was found live in this research pass (every flat result
// discovered — 3 rounds across 2 addresses — was unsold); the FLAT_SOLD
// fixture below is explicitly a constructed composite: the real
// announcement/result header clause from article 8340 combined with the
// real, verbatim achieved-price clause verified on land results 8545/8536/8112
// ("Najwyższa cena osiągnięta w przetargu: N złotych" — the same
// rozporządzenie-mandated phrase, kind-independent). This is flagged, not
// presented as a single live capture.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  stripTags,
  parsePLN,
  parseAnnouncement,
  parseResultDoc,
  roundFromText,
  auctionDateFromText,
  resultDateFromText,
  startingPriceFromText,
  achievedPriceFromText,
  unitAreaFromText,
  flatHeaderFromText,
  flatAddressRawFromText,
  landStreetFromText,
  obrebFromText,
  landPlotFromText,
  isNegativeOutcome,
  isResultNotice,
  isLeaseNotice,
  isSkippableTitle,
  isResultTitle,
  isAnnouncementTitle,
} from '../src/cities/mragowo/parse.js';
import { parseIndexPage } from '../src/cities/mragowo/crawl.js';

// --------------------------------------------------------------- real fixtures

const MRONGOWIUSZA_31_5_ANN = `OGŁOSZENIE
Na podstawie art. 37 ust. 1 ustawy z dnia 21 sierpnia 1997 r. o gospodarce nieruchomościami oraz zarządzenia Burmistrza Miasta Mrągowa Nr 566/2025 z dnia 19 listopada 2025 r.,
BURMISTRZ MIASTA MRĄGOWA
ogłasza pierwszy przetarg ustny nieograniczony na sprzedaż gminnego lokalu mieszkalnego nr 5 położonego w budynku przy ul. Mrongowiusza 31 w Mrągowie wraz ze sprzedażą części udziału w działce gruntu, stanowiącego własność Gminy Miasto Mrągowo.
Przedmiotem sprzedaży jest:
prawo własności gminnego lokalu mieszkalnego nr 5 położonego na I piętrze w budynku przy ul. Mrongowiusza 31 w Mrągowie, składającego się z przedpokoju, łazienki, kuchni i pokoju o łącznej powierzchni użytkowej 35,45 m2 wraz z udziałem wynoszącym 44/1000 w częściach wspólnych budynku. Lokal zbywany z pomieszczeniem przynależnym - piwnicą nr 5 o powierzchni użytkowej 4,50 m2.
Cena wywoławcza nieruchomości lokalowej wynosi 210.000 zł (słownie: dwieście dziesięć tysięcy złotych).
Wadium wynosi 20 % ceny wywoławczej, tj. kwotę 42.000 zł (słownie: czterdzieści dwa tysiące złotych).
PRZETARG ODBĘDZIE SIĘ W DNIU 8 stycznia 2026 r. w Urzędzie Miejskim w Mrągowie przy ul. Królewieckiej 60A, w sali nr 1 o godzinie 11.00.`;

const MRONGOWIUSZA_31_5_RESULT_R1 = `Informacja o wyniku przetargu
W dniu 8 stycznia 2026 r. w Urzędzie Miejskim w Mrągowie został przeprowadzony pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 5 położonego w budynku przy ul. Mrongowiusza 31 w Mrągowie wraz z udziałem wynoszącym 44/1000 części prawa własności w działce gruntu oznaczonej w ewidencji gruntów obrębu nr 4 jako działka nr 92/14, stanowiącego własność Gminy Miasto Mrągowo.
Cena wywoławcza nieruchomości wynosiła 210.000 zł (słownie: dwieście dziesięć tysięcy złotych).
Z powodu braku uczestników przetarg zakończył się wynikiem negatywnym.
Podano do publicznej wiadomości na okres: od dnia 16.01.2026 r. do dnia 23.01.2026 r.`;

const MRONGOWIUSZA_31_5_RESULT_R3 = `Informacja o wyniku przetargu
W dniu 26 maja 2026 r. w Urzędzie Miejskim w Mrągowie został przeprowadzony trzeci przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 5 położonego w budynku przy ul. Mrongowiusza 31 w Mrągowie wraz z udziałem wynoszącym 44/1000 części prawa własności w działce gruntu.
Cena wywoławcza nieruchomości wynosiła 160.000 zł (słownie: sto sześćdziesiąt tysięcy złotych).
Z powodu braku uczestników przetarg zakończył się wynikiem negatywnym.`;

const KROLEWIECKA_16_5_ANN = `OGŁOSZENIE
BURMISTRZ MIASTA MRĄGOWA
ogłasza pierwszy przetarg ustny nieograniczony na sprzedaż gminnego lokalu mieszkalnego nr 5 położonego w budynku przy ul. Królewieckiej 16 w Mrągowie wraz ze sprzedażą części udziału w działce gruntu, stanowiącego własność Gminy Miasto Mrągowo .
Przedmiotem sprzedaży jest:
prawo własności gminnego lokalu mieszkalnego nr 5 położonego na I piętrze w budynku przy ul. Królewieckiej 16 w Mrągowie, składającego się z kuchni i pokoju o łącznej powierzchni użytkowej 29,2 m 2 wraz z udziałem wynoszącym 345/6512 w częściach wspólnych budynku. Do lokalu przynależą: pomieszczenie wc o powierzchni użytkowej 1,0 m 2 i piwnica o powierzchni użytkowej 4,3 m 2 .
Cena wywoławcza nieruchomości wynosi 75.000 zł (słownie: siedemdziesiąt pięć tysięcy złotych) .
Wadium wynosi 20 % ceny wywoławczej, tj. kwotę 15.000 zł (słownie: piętnaście tysięcy złotych) .
PRZETARG ODBĘDZIE SIĘ W DNIU 15 marca 2022 r. w Urzędzie Miejskim w Mrągowie przy ul. Królewieckiej 60A, w sali nr 1 o godzinie 10.00.`;

// Round IV announcement carrying a prior-round HISTORY RECAP — the same trap
// chełmno/braniewo guard against: round/date must come from the "ogłasza
// czwarty" / "ODBĘDZIE SIĘ" anchors, never from the recap's "przeprowadzono"
// sentences (different verb: "przeprowadzono" vs "został przeprowadzony").
const WOLNOSCI_20D_12_ANN_R4 = `OGŁOSZENIE
BURMISTRZ MIASTA MRĄGOWA
ogłasza czwarty przetarg ustny nieograniczony na sprzedaż gminnego lokalu mieszkalnego nr 12 położonego w budynku przy ul. Wolności 20D w Mrągowie wraz ze sprzedażą części udziału w działce gruntu, stanowiącego własność Gminy Miasto Mrągowo .
Przedmiotem sprzedaży jest:
prawo własności gminnego lokalu mieszkalnego nr 12 położonego na I piętrze w budynku przy ul. Wolności 20D w Mrągowie, składającego się z przedpokoju, pokoju, kuchni i łazienki o łącznej powierzchni użytkowej 28,75 m 2 wraz z udziałem wynoszącym 30/1000 w częściach wspólnych budynku. Lokal zbywany bez pomieszczeń przynależnych.
Cena wywoławcza nieruchomości wynosi 150.000 zł (słownie: sto pięćdziesiąt tysięcy złotych) .
PRZETARG ODBĘDZIE SIĘ W DNIU 24 czerwca 2025 r. w Urzędzie Miejskim w Mrągowie przy ul. Królewieckiej 60A, w sali nr 1 o godzinie 9.00.
Pierwszy przetarg przeprowadzono w dniu 21 października 2024 r.
Drugi przetarg przeprowadzono w dniu 17 stycznia 2025 r.
Trzeci przetarg przeprowadzono w dniu 8 kwietnia 2025 r.`;

const WOLNOSCI_20D_12_RESULT_R1 = `Informacja o wyniku przetargu
W dniu 21 października 2024 r. w Urzędzie Miejskim w Mrągowie został przeprowadzony pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 12 położonego w budynku przy ul. Wolności 20D w Mrągowie wraz z udziałem wynoszącym 30/1000 części prawa własności w działce gruntu.
Cena wywoławcza nieruchomości wynosiła 190 .000 zł (słownie: sto dziewięćdziesiąt tysięcy złotych).
Z powodu braku oferentów przetarg zakończył się wynikiem negatywnym.
Podano do publicznej wiadomości na okres: od dnia 29.10.2024 r. do dnia 05.11.2024 r.`;

const WOLNOSCI_20D_12_RESULT_R4 = `Informacja o wyniku przetargu
W dniu 24 czerwca 2025 r. w Urzędzie Miejskim w Mrągowie został przeprowadzony czwarty przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 12 położonego w budynku przy ul. Wolności 20D w Mrągowie wraz z udziałem wynoszącym 30/1000 części prawa własności w działce gruntu.
Cena wywoławcza nieruchomości wynosiła 150.000 zł (słownie: sto pięćdziesiąt tysięcy złotych).
Z powodu braku uczestników przetargu, przetarg zakończył się wynikiem negatywnym.`;

// 2016-era format: Roman round ("II"), comma after the apt number, no-space
// area token ("63,25m2"), and a SPLIT użytkowanie-wieczyste price breakdown
// where the aggregate ("90.000 zł") — not either sub-amount — is the
// starting price.
const MRONGOWIUSZA_75_1_ANN_2016 = `O G Ł O S Z E N I E
Na podstawie art. 37 ust. 1 ustawy z dnia 21 sierpnia 1997r. o gospodarce nieruchomościami, zarządzenia Burmistrza Miasta Mrągowo Nr 629/2016 z dnia 8.08.2016r.
BURMISTRZ MIASTA MRĄGOWO
ogłasza II przetarg ustny nieograniczony na sprzedaż wolnego lokalu mieszkalnego nr 1, położonego w budynku przy ul. Mrongowiusza 75 w Mrągowie wraz z oddaniem w użytkowanie wieczyste części udziału w działce gruntu, stanowiącego własność Gminy Miasto Mrągowo.
Przedmiotem sprzedaży jest:
- prawo własności wolnego lokalu mieszkalnego nr 1, położonego na parterze budynku przy ul. Mrongowiusza 75 w Mrągowie, składającego się z trzech pokoi, kuchni, łazienki i przedpokoju, o powierzchni użytkowej 63,25m2 wraz z udziałem wynoszącym 7137/43873 w częściach wspólnych budynku.
Cena wywoławcza nieruchomości wynosi 90.000 zł (dziewięćdziesiąt tysięcy złotych) w tym:
wartość lokalu mieszkalnego stanowi 57,64% ceny wywoławczej tj. kwotę 51.876zł ( pięćdziesiąt jeden tysięcy osiemset siedemdziesiąt sześć złotych),
wartość udziału wynoszącego 7137/43873 w prawie użytkowania wieczystego działki gruntu stanowi 42,36% ceny wywoławczej tj. kwotę 38.124zł (trzydzieści osiem tysięcy sto dwadzieścia cztery złote).
Wadium wynosi 15% ceny wywoławczej tj. kwotę 13.500zł (trzynaście tysięcy pięćset złotych).
PRZETARG ODBĘDZIE SIĘ W DNIU 27 września 2016r. w Urzędzie Miejskim w Mrągowie przy ul. Królewieckiej 60A, w sali nr 1 o godzinie 10 00.
Pierwszy przetarg ogłoszony był na dzień 5 lipca 2016r.`;

const NIEDZWIEDZIA_40_10_ANN = `O G Ł O S Z E N I E
Na podstawie art. 37 ust. 1 ustawy z dnia 21 sierpnia 1997 roku o gospodarce nieruchomościami oraz Zarządzenia Burmistrza Miasta Mrągowa Nr 821/2026 z dnia 25 maja 2026 roku.
BURMISTRZ MIASTA MRĄGOWA
Ogłasza I przetarg ustny nieograniczony na sprzedaż prawa własności nieruchomości gruntowej niezabudowanej, stanowiącej własność Gminy Miasta Mrągowo, położonej w Mrągowie przy ulicy Niedźwiedziej, oznaczonej w ewidencji gruntów obrębu nr 10 jako działka nr 40/10 o powierzchni 0,1001 ha, dla której Sąd Rejonowy w Mrągowie IV Wydział Ksiąg Wieczystych prowadzi Księgę Wieczystą Nr OL1M/00045194/4.
Cena wywoławcza nieruchomości wynosi 185.000 złotych (słownie: sto osiemdziesiąt pięć tysięcy złotych) + 23% podatku VAT.
Wadium wynosi 15% ceny wywoławczej, tj. 27.750 złotych.
PRZETARG ODBĘDZIE SIĘ W DNIU 17 lipca 2026 roku w Urzędzie Miejskim w Mrągowie przy ul. Królewieckiej nr 60A w sali nr 1 o godzinie 11-tej.`;

const NIEDZWIEDZIA_40_26_RESULT_SOLD = `INFORMACJA O WYNIKU PRZETARGU
W dniu 25 czerwca 2026 roku w Urzędzie Miejskim w Mrągowie został przeprowadzony I przetarg ustny nieograniczony na sprzedaż prawa własności, nieruchomości gruntowej niezabudowanej, położonej w Mrągowie przy ulicy Niedźwiedziej, oznaczonej w ewidencji gruntów obrębu nr 10 jako działka nr 40/26 o powierzchni 0,1008 ha, dla której Sąd Rejonowy w Mrągowie IV Wydział Ksiąg Wieczystych prowadzi Księgę Wieczystą Nr OL1M/00045198/2.
Do uczestnictwa w przetargu dopuszczono 3 osoby.
Cena wywoławcza nieruchomości wynosiła 185.000 złotych (słownie: sto osiemdziesiąt pięć tysięcy złotych) + 23% podatku VAT.
Najwyższa cena osiągnięta w przetargu: 187.000 złotych (słownie: sto osiemdziesiąt siedem tysięcy złotych) + 23% podatku VAT.
Nabywcą nieruchomości zostali: Jacek i Aneta Wysoccy.`;

const NIEDZWIEDZIA_40_25_RESULT_UNSOLD = `INFORMACJA O NEGATYWNYM WYNIKU PRZETARGU
W dniu 25 czerwca 2026 roku w Urzędzie Miejskim w Mrągowie został przeprowadzony I przetarg ustny nieograniczony na sprzedaż prawa własności, nieruchomości gruntowej niezabudowanej, położonej w Mrągowie przy ulicy Niedźwiedziej, oznaczonej w ewidencji gruntów obrębu nr 10 jako działka nr 40/25 o powierzchni 0,1007 ha.
Do uczestnictwa w przetargu dopuszczono 1 osobę.
Cena wywoławcza nieruchomości wynosiła 185.000 złotych (słownie: sto osiemdziesiąt pięć tysięcy złotych) + 23% podatku VAT.
Z powodu braku postąpienia przez uczestnika przetargu, przetarg zakończył się wynikiem negatywnym.`;

// Constructed composite (see file header) — validates the flat SOLD path.
const FLAT_SOLD_CONSTRUCTED = `Informacja o wyniku przetargu
W dniu 8 stycznia 2026 r. w Urzędzie Miejskim w Mrągowie został przeprowadzony pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 5 położonego w budynku przy ul. Mrongowiusza 31 w Mrągowie wraz z udziałem wynoszącym 44/1000 części prawa własności w działce gruntu.
Cena wywoławcza nieruchomości wynosiła 210.000 zł (słownie: dwieście dziesięć tysięcy złotych).
Najwyższa cena osiągnięta w przetargu: 215.000 złotych (słownie: dwieście piętnaście tysięcy złotych).
Nabywcą nieruchomości został: Jan Kowalski.`;

// ------------------------------------------------------------------- unit funcs

test('stripTags: drops tags, decodes nbsp/oacute/sect/minus/plus entities', () => {
  assert.equal(
    stripTags('<p>Kr&oacute;lewiecka, &sect; 13, cena&nbsp;210.000</p>'),
    'Królewiecka, § 13, cena 210.000',
  );
  assert.equal(stripTags('<span>7 &plus; 2 &minus; 1</span>'), '7 + 2 - 1');
  assert.equal(stripTags(''), '');
  assert.equal(stripTags(null), '');
});

test('parsePLN: dot-thousands, no-grosze, and the live "190 .000" space quirk', () => {
  assert.equal(parsePLN('210.000'), 210000);
  assert.equal(parsePLN('51.876'), 51876);
  assert.equal(parsePLN('185.000'), 185000);
  assert.equal(parsePLN('190 .000'), 190000);
  assert.equal(parsePLN('brak'), null);
});

test('roundFromText: word ordinal ("ogłasza pierwszy") and Roman ("ogłasza II")', () => {
  assert.equal(roundFromText(MRONGOWIUSZA_31_5_ANN), 1);
  assert.equal(roundFromText(MRONGOWIUSZA_75_1_ANN_2016), 2);
});

test('roundFromText: result anchor "został przeprowadzony <ordinal>"', () => {
  assert.equal(roundFromText(MRONGOWIUSZA_31_5_RESULT_R1), 1);
  assert.equal(roundFromText(MRONGOWIUSZA_31_5_RESULT_R3), 3);
});

test('roundFromText: round IV beats the prior-round HISTORY RECAP trap (article 8080)', () => {
  assert.equal(roundFromText(WOLNOSCI_20D_12_ANN_R4), 4);
});

test('auctionDateFromText: "PRZETARG ODBĘDZIE SIĘ W DNIU ..." (r. / r without space / roku)', () => {
  assert.equal(auctionDateFromText(MRONGOWIUSZA_31_5_ANN), '2026-01-08');
  assert.equal(auctionDateFromText(KROLEWIECKA_16_5_ANN), '2022-03-15');
  assert.equal(auctionDateFromText(MRONGOWIUSZA_75_1_ANN_2016), '2016-09-27');
  assert.equal(auctionDateFromText(NIEDZWIEDZIA_40_10_ANN), '2026-07-17');
});

test('auctionDateFromText: round IV date beats the history recap (article 8080)', () => {
  assert.equal(auctionDateFromText(WOLNOSCI_20D_12_ANN_R4), '2025-06-24');
});

test('resultDateFromText: "W dniu ... został przeprowadzony" (r. and roku forms)', () => {
  assert.equal(resultDateFromText(MRONGOWIUSZA_31_5_RESULT_R1), '2026-01-08');
  assert.equal(resultDateFromText(MRONGOWIUSZA_31_5_RESULT_R3), '2026-05-26');
  assert.equal(resultDateFromText(NIEDZWIEDZIA_40_26_RESULT_SOLD), '2026-06-25');
});

test('resultDateFromText: not fooled by the "od dnia/do dnia" publication window', () => {
  // MRONGOWIUSZA_31_5_RESULT_R1 also contains "od dnia 16.01.2026 r. do dnia
  // 23.01.2026 r." (a different preposition, "od/do dnia" not "w dniu") —
  // the session date (2026-01-08) must win, not the publication window.
  assert.equal(resultDateFromText(MRONGOWIUSZA_31_5_RESULT_R1), '2026-01-08');
});

test('startingPriceFromText: present tense (announcement) and past tense "wynosiła" (result)', () => {
  assert.equal(startingPriceFromText(MRONGOWIUSZA_31_5_ANN), 210000);
  assert.equal(startingPriceFromText(MRONGOWIUSZA_31_5_RESULT_R1), 210000);
  assert.equal(startingPriceFromText(MRONGOWIUSZA_31_5_RESULT_R3), 160000);
});

test('startingPriceFromText: aggregate wins over a split użytkowanie-wieczyste breakdown', () => {
  // 90.000 total, NOT 51.876 (lokal share) or 38.124 (grunt share).
  assert.equal(startingPriceFromText(MRONGOWIUSZA_75_1_ANN_2016), 90000);
});

test('startingPriceFromText: land, "złotych" currency word (not "zł")', () => {
  assert.equal(startingPriceFromText(NIEDZWIEDZIA_40_10_ANN), 185000);
  assert.equal(startingPriceFromText(NIEDZWIEDZIA_40_26_RESULT_SOLD), 185000);
});

test('achievedPriceFromText: SOLD land — nominative "Najwyższa CENA osiągnięta" (not accusative)', () => {
  assert.equal(achievedPriceFromText(NIEDZWIEDZIA_40_26_RESULT_SOLD), 187000);
});

test('achievedPriceFromText: UNSOLD — no achieved-price clause present at all', () => {
  assert.equal(achievedPriceFromText(MRONGOWIUSZA_31_5_RESULT_R1), null);
  assert.equal(achievedPriceFromText(NIEDZWIEDZIA_40_25_RESULT_UNSOLD), null);
});

test('isNegativeOutcome: three different real reason-clause wordings, one shared suffix', () => {
  assert.equal(isNegativeOutcome(MRONGOWIUSZA_31_5_RESULT_R1), true); // "braku uczestników"
  assert.equal(isNegativeOutcome(WOLNOSCI_20D_12_RESULT_R1), true); // "braku oferentów"
  assert.equal(isNegativeOutcome(WOLNOSCI_20D_12_RESULT_R4), true); // "braku uczestników przetargu,"
  assert.equal(isNegativeOutcome(NIEDZWIEDZIA_40_25_RESULT_UNSOLD), true); // "braku postąpienia przez uczestnika"
  assert.equal(isNegativeOutcome(NIEDZWIEDZIA_40_26_RESULT_SOLD), false);
});

test('isResultNotice: plain and negatywny headers, both title-cased and lowercase', () => {
  assert.equal(isResultNotice(MRONGOWIUSZA_31_5_RESULT_R1), true);
  assert.equal(isResultNotice(NIEDZWIEDZIA_40_25_RESULT_UNSOLD), true);
  assert.equal(isResultNotice(MRONGOWIUSZA_31_5_ANN), false);
});

test('unitAreaFromText: usable area, spaced/unspaced/single-decimal m² forms', () => {
  assert.equal(unitAreaFromText(MRONGOWIUSZA_31_5_ANN), 35.45); // "35,45 m 2"
  assert.equal(unitAreaFromText(KROLEWIECKA_16_5_ANN), 29.2); // "29,2 m 2"
  assert.equal(unitAreaFromText(MRONGOWIUSZA_75_1_ANN_2016), 63.25); // "63,25m2" no space
  assert.equal(unitAreaFromText(WOLNOSCI_20D_12_ANN_R4), 28.75);
});

test('unitAreaFromText: result notices never restate area (null, not a crash)', () => {
  assert.equal(unitAreaFromText(MRONGOWIUSZA_31_5_RESULT_R1), null);
});

test('flatHeaderFromText / flatAddressRawFromText: apt+street+building in one shot', () => {
  assert.deepEqual(flatHeaderFromText(MRONGOWIUSZA_31_5_ANN), { apt: '5', street: 'Mrongowiusza', building: '31' });
  assert.equal(flatAddressRawFromText(MRONGOWIUSZA_31_5_ANN), 'ul. Mrongowiusza 31/5');
  assert.deepEqual(flatHeaderFromText(WOLNOSCI_20D_12_ANN_R4), { apt: '12', street: 'Wolności', building: '20D' });
  assert.equal(flatAddressRawFromText(MRONGOWIUSZA_75_1_ANN_2016), 'ul. Mrongowiusza 75/1');
  assert.equal(flatHeaderFromText(NIEDZWIEDZIA_40_10_ANN), null); // land text never matches the flat header
});

test('landStreetFromText / obrebFromText / landPlotFromText', () => {
  assert.equal(landStreetFromText(NIEDZWIEDZIA_40_10_ANN), 'Niedźwiedziej');
  assert.equal(obrebFromText(NIEDZWIEDZIA_40_10_ANN), 'nr 10');
  assert.deepEqual(landPlotFromText(NIEDZWIEDZIA_40_10_ANN), { dzialka_nr: '40/10', area_m2: 1001 });
  assert.deepEqual(landPlotFromText(NIEDZWIEDZIA_40_26_RESULT_SOLD), { dzialka_nr: '40/26', area_m2: 1008 });
});

// ----------------------------------------------------------------- title routing

test('isSkippableTitle: bezprzetargowo (direct-to-tenant sale) is not an auction', () => {
  assert.equal(
    isSkippableTitle(
      'ul. Wojska Polskiego 6H/7 - wykaz nieruchomości lokalowej mieszkalnej przeznaczonej do sprzedaży w drodze bezprzetargowej na rzecz najemców',
    ),
    true,
  );
});

test('isSkippableTitle: pre-auction wykaz, zarządzenia, oferta inwestycyjna', () => {
  assert.equal(
    isSkippableTitle('Wykaz nieruchomości przeznaczonej do wydzierżawienia w trybie bezprzetargowym (9 - 10/25 os. Nikutowo)'),
    true,
  );
  assert.equal(isSkippableTitle('Zarządzenie w sprawie niewykonania prawa pierwokupu'), true);
  assert.equal(isSkippableTitle('Oferta inwestycyjna'), true);
});

test('isSkippableTitle: a rental (najem/wynajęcie) result never sneaks through as a sale', () => {
  assert.equal(
    isSkippableTitle(
      'Informacja o wyniku przetargu ustnego ograniczonego na wynajęcie lokalu użytkowego położonego w Mrągowie przy ul. Jaszczurcza Góra 6 w Mrągowie',
    ),
    true,
  );
});

test('isSkippableTitle: a genuine sale announcement/result is NOT skipped', () => {
  assert.equal(isSkippableTitle('Przetarg na sprzedaż gminnego lokalu mieszkalnego - ul. Mrongowiusza 31/5, Mrągowo'), false);
  assert.equal(isSkippableTitle('informacja o wyniku przetargu'), false);
});

test('isResultTitle: generic "Informacja o (negatywnym) wyniku przetargu" (both cases)', () => {
  assert.equal(isResultTitle('Informacja o wyniku przetargu'), true);
  assert.equal(isResultTitle('informacja o wyniku przetargu'), true);
  assert.equal(isResultTitle('INFORMACJA O NEGATYWNYM WYNIKU PRZETARGU'), true);
  assert.equal(isResultTitle('Przetarg na sprzedaż gminnego lokalu mieszkalnego - ul. Mrongowiusza 31/5, Mrągowo'), false);
});

test('isAnnouncementTitle: flat and land sale titles, incl. "ograniczony"', () => {
  assert.equal(isAnnouncementTitle('Przetarg na sprzedaż gminnego lokalu mieszkalnego - ul. Mrongowiusza 31/5, Mrągowo'), true);
  assert.equal(
    isAnnouncementTitle('I przetarg ustny nieograniczony na zbycie nieruchomości położonej w Mrągowie przy ulicy Niedźwiedziej (dz. nr 10-40/10)'),
    true,
  );
  assert.equal(
    isAnnouncementTitle('I przetarg ustny ograniczony na sprzedaż nieruchomości położonej w Mrągowie przy ulicy Widok (dz. nr 1-208, 1-146/127)'),
    true,
  );
});

test('isLeaseNotice: rental body (no "sprzedaż") vs a genuine sale body', () => {
  assert.equal(isLeaseNotice('Burmistrz ogłasza przetarg na wynajęcie lokalu użytkowego. Czynsz najmu wynosi 800 zł.'), true);
  assert.equal(isLeaseNotice(MRONGOWIUSZA_31_5_ANN), false);
});

// ------------------------------------------------------------- announcement parse

test('parseAnnouncement: Mrongowiusza 31/5 — round I, 35.45 m², 210 000 zł, 2026-01-08', () => {
  const rec = parseAnnouncement(MRONGOWIUSZA_31_5_ANN);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address.key, 'mrongowiusza|31|5');
  assert.equal(rec.address_raw, 'ul. Mrongowiusza 31/5');
  assert.equal(rec.area_m2, 35.45);
  assert.equal(rec.starting_price_pln, 210000);
  assert.equal(rec.auction_date, '2026-01-08');
  assert.equal(rec.round, 1);
});

test('parseAnnouncement: Królewiecka 16/5 — round I, 29.2 m², 75 000 zł, 2022-03-15', () => {
  const rec = parseAnnouncement(KROLEWIECKA_16_5_ANN);
  assert.equal(rec.address.key, 'krolewieckiej|16|5');
  assert.equal(rec.address.street, 'Królewieckiej');
  assert.equal(rec.area_m2, 29.2);
  assert.equal(rec.starting_price_pln, 75000);
  assert.equal(rec.auction_date, '2022-03-15');
  assert.equal(rec.round, 1);
});

test('parseAnnouncement: Wolności 20D/12 — round IV, immune to the history-recap trap', () => {
  const rec = parseAnnouncement(WOLNOSCI_20D_12_ANN_R4);
  assert.equal(rec.address.key, 'wolnosci|20D|12');
  assert.equal(rec.area_m2, 28.75);
  assert.equal(rec.starting_price_pln, 150000);
  assert.equal(rec.auction_date, '2025-06-24');
  assert.equal(rec.round, 4);
});

test('parseAnnouncement: Mrongowiusza 75/1 — round II (Roman), 2016-era, aggregate price', () => {
  const rec = parseAnnouncement(MRONGOWIUSZA_75_1_ANN_2016);
  assert.equal(rec.address.key, 'mrongowiusza|75|1');
  assert.equal(rec.area_m2, 63.25);
  assert.equal(rec.starting_price_pln, 90000);
  assert.equal(rec.auction_date, '2016-09-27');
  assert.equal(rec.round, 2);
});

test('parseAnnouncement: land (Niedźwiedzia dz. 40/10) → kind grunt with parcel + ha area', () => {
  const rec = parseAnnouncement(NIEDZWIEDZIA_40_10_ANN);
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.dzialka_nr, '40/10');
  assert.equal(rec.obreb, 'nr 10');
  assert.equal(rec.area_m2, 1001);
  assert.equal(rec.address_raw, 'ul. Niedźwiedziej');
  assert.equal(rec.starting_price_pln, 185000);
  assert.equal(rec.auction_date, '2026-07-17');
  assert.equal(rec.round, 1);
});

test('parseAnnouncement: empty/null input returns null without throwing', () => {
  assert.equal(parseAnnouncement(''), null);
  assert.equal(parseAnnouncement(null), null);
});

// ------------------------------------------------------------------ result parse

test('parseResultDoc: Mrongowiusza 31/5 round I — UNSOLD, matches its own announcement', () => {
  const [r] = parseResultDoc(MRONGOWIUSZA_31_5_RESULT_R1, '2026-01-16', 'https://bipmragowo.warmia.mazury.pl/8340/x.html');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'mrongowiusza|31|5');
  assert.equal(r.starting_price_pln, 210000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'unknown');
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2026-01-08');
  assert.equal(r.source_pdf, 'https://bipmragowo.warmia.mazury.pl/8340/x.html');
});

test('parseResultDoc: Mrongowiusza 31/5 round III — UNSOLD, price stepped down to 160 000', () => {
  const [r] = parseResultDoc(MRONGOWIUSZA_31_5_RESULT_R3, '2026-06-03', 'https://x/8499');
  assert.equal(r.address.key, 'mrongowiusza|31|5');
  assert.equal(r.starting_price_pln, 160000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.round, 3);
  assert.equal(r.auction_date, '2026-05-26');
});

test('parseResultDoc: Wolności 20D/12 round I — UNSOLD, "190 .000" price-space quirk parses clean', () => {
  const [r] = parseResultDoc(WOLNOSCI_20D_12_RESULT_R1, '2024-10-29', 'https://x/7859');
  assert.equal(r.address.key, 'wolnosci|20D|12');
  assert.equal(r.starting_price_pln, 190000);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2024-10-21');
});

test('parseResultDoc: Wolności 20D/12 round IV — UNSOLD, different reason-clause wording', () => {
  const [r] = parseResultDoc(WOLNOSCI_20D_12_RESULT_R4, '2025-07-02', 'https://x/8113');
  assert.equal(r.address.key, 'wolnosci|20D|12');
  assert.equal(r.starting_price_pln, 150000);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.round, 4);
  assert.equal(r.auction_date, '2025-06-24');
});

test('parseResultDoc: flat SOLD (constructed composite — see file header) — achieved price + buyer', () => {
  const [r] = parseResultDoc(FLAT_SOLD_CONSTRUCTED, '2026-01-16', 'https://x/flatsold');
  assert.equal(r.address.key, 'mrongowiusza|31|5');
  assert.equal(r.starting_price_pln, 210000);
  assert.equal(r.final_price_pln, 215000);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.unsold_reason, null);
});

test('parseResultDoc: land (Niedźwiedzia dz. 40/26) — SOLD, 185 000 -> 187 000', () => {
  const [r] = parseResultDoc(NIEDZWIEDZIA_40_26_RESULT_SOLD, '2026-07-01', 'https://x/8545');
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '40/26');
  assert.equal(r.starting_price_pln, 185000);
  assert.equal(r.final_price_pln, 187000);
  assert.equal(r.outcome, 'sold');
});

test('parseResultDoc: land (Niedźwiedzia dz. 40/25) — UNSOLD, "braku postąpienia" reason', () => {
  const [r] = parseResultDoc(NIEDZWIEDZIA_40_25_RESULT_UNSOLD, '2026-07-01', 'https://x/8544');
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '40/25');
  assert.equal(r.starting_price_pln, 185000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'unknown');
});

test('parseResultDoc: non-result text (an announcement) returns []', () => {
  assert.deepEqual(parseResultDoc(MRONGOWIUSZA_31_5_ANN, null, 'x'), []);
});

test('parseResultDoc: empty/null input returns [] without throwing', () => {
  assert.deepEqual(parseResultDoc('', null, 'https://example.com'), []);
  assert.deepEqual(parseResultDoc(null, null, 'https://example.com'), []);
});

// ----------------------------------------------------------------- board index

test('parseIndexPage: extracts id/title/detailUrl/published_date from real row markup', () => {
  const html = `<tr data-key="8545"><td scope="row" data-col-count>5</td><td data-col-date>03-07-2026</td><td class="text-justify" data-col-main><a href="/8545/informacja-o-wyniku-przetargu.html" data-pjax="0">informacja o wyniku przetargu</a></td><td data-col-select>Gospodarka nieruchomościami</td><td data-col-select>Aktualny</td></tr>
<tr data-key="8288"><td scope="row" data-col-count>7</td><td data-col-date>02-12-2025</td><td class="text-justify" data-col-main><a href="/8288/przetarg-na-sprzedaz-gminnego-lokalu-mieszkalnego-ul.-mrongowiusza-31-5-mragowo.html" data-pjax="0">Przetarg na sprzedaż gminnego lokalu mieszkalnego - ul. Mrongowiusza 31/5, Mrągowo</a></td><td data-col-select>Gospodarka nieruchomościami</td><td data-col-select>Archiwalny</td></tr>`;
  const rows = parseIndexPage(html);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].id, '8545');
  assert.equal(rows[0].title, 'informacja o wyniku przetargu');
  assert.equal(rows[0].detailUrl, 'https://bipmragowo.warmia.mazury.pl/8545/informacja-o-wyniku-przetargu.html');
  assert.equal(rows[0].published_date, '2026-07-03');
  assert.equal(rows[1].id, '8288');
  assert.ok(rows[1].title.includes('Mrongowiusza 31/5'));
  assert.equal(rows[1].published_date, '2025-12-02');
});

test('parseIndexPage: returns empty array for empty / no-rows HTML', () => {
  assert.deepEqual(parseIndexPage('<table><tr><th>head</th></tr></table>'), []);
  assert.deepEqual(parseIndexPage(''), []);
});
