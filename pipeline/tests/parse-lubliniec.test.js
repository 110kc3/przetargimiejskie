// Lubliniec parser tests. Fixtures are condensed-but-faithful copies of REAL
// TITLE (board link text) + BODY (content-main plain text) pairs fetched live
// from lubliniec.bip.info.pl (verified 2026-07-10). Each fixture feeds
// parse.buildRecordText() exactly as crawl.js does, so the parsers are
// groundtruthed against production data.
//
//   ANNOUNCEMENTS (idmp=93):
//   iddok 26798  Mickiewicza 9/6   — ACTIVE, round IV (lokal niemieszkalny →
//                                    kind uzytkowy), modern table price layout,
//                                    date + round history decoys
//   iddok 22526  Częstochowska 6/34 — ACTIVE, round I, spółdzielcze
//                                    własnościowe prawo (area-clause gap case)
//   iddok 13865  Oświęcimska 19/1  — ACTIVE, round I, pre-2023 direct
//                                    price-label layout, "nr N położonej…"
//                                    title form (no slash-apt)
//   iddok 24601  Paderewskiego 12/16 — ACTIVE, round III; board TITLE has a
//                                    REAL typo ("prztarg" for "przetarg") —
//                                    round/kind recovery falls through to the
//                                    (correctly spelled) BODY
//   iddok 26836  M.C. Skłodowskiej  — ACTIVE land, round I, abbreviated
//                                    "o godz." (not "o godzinie") time marker
//   RESULTS (idmp=94):
//   iddok 24862  Paderewskiego 12/16 — SOLD, round III, no-grosze price
//                                    ("141.400 zł")
//   iddok 24861  Oświęcimska 19/12 — SOLD, round III; apt (12) ONLY recoverable
//                                    from the TITLE's "19/12" slash — this
//                                    terse result body never restates "Lokal
//                                    … nr 12"
//   iddok 25996  Mickiewicza 9/6   — UNSOLD, round I, "nikt nie przystąpił"
//   iddok 27200  M.C. Skłodowskiej — SOLD land, round I — THE spike-confirmed
//                                    hammer-price doc: 552.000,00 zł vs
//                                    400.000,00 zł wywoławcza, 3 oferentów,
//                                    nabywca KOMTERM Sp. z o.o.
//   GATES (both boards):
//   iddok 24378  "na dzierżawę …"  — LEASE → skipped
//   iddok 22477  "UWAGA Odwołanie …" — CANCELLATION → skipped (title-scoped
//                                    guard; body legitimately says "Burmistrz
//                                    ma prawo odwołania przetargu" is NOT what
//                                    trips this — it's the notice's OWN title)
//   iddok 26884  "…rozstrzygnięcia skargi…" — COMPLAINT RESOLUTION → skipped

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRecordText,
  parseAnnouncement,
  parseResultDoc,
  isSaleAuction,
  isLease,
  isResultDoc,
  isNegativeOutcome,
  roundFromText,
  auctionDateFromText,
  startingPriceFromText,
  achievedPriceFromText,
  unitAreaFromText,
  addressRawFromText,
  kindFromText,
  parsePLN,
} from '../src/cities/lubliniec/parse.js';
import { parseBoardPage } from '../src/cities/lubliniec/crawl.js';

// --------------------------------------------------------------- real fixtures

const MICKIEWICZA_IV_ACTIVE = {
  title:
    'IV przetarg ustny nieograniczony (licytacja) na sprzedaż nieruchomości lokalowej przy ul. Mickiewicza 9/6 w Lublińcu, stanowiącej własność Gminy Lubliniec',
  body:
    'Burmistrz Miasta Lublińca ogłasza IV przetarg ustny (licytacja) nieograniczony na sprzedaż nieruchomości lokalowej przy ul. Mickiewicza 9/6 w Lublińcu, stanowiącej własność Gminy Lubliniec ' +
    'I. PRZEDMIOT SPRZEDAŻY: Prawo własności do lokalu niemieszkalnego nr 6 o powierzchni użytkowej 25,91 m 2 wraz z udziałem w wysokości 5/100 w prawie własności do działki gruntu opisanej w ewidencji gruntów jako działka nr: 101. ' +
    'Lokal niemieszkalny nr 6 położony jest w na poddaszu użytkowym w budynku mieszkalnym wielorodzinnym przy ul. Mickiewicza 9 w Lublińcu. ' +
    'W przypadku zmiany stawki podatku VAT do ceny prawa własności zostanie doliczony podatek VAT w stawce obowiązującej w dniu zawarcia umowy notarialnej. ' +
    'IV. CENA WYWOŁAWCZA NIERUCHOMOŚCI/ MINIMALNE POSTĄPIENIE/ WYSOKOŚĆ WADIUM/ GODZINA PRZETARGU Lp Oznaczenie nieruchomości Cena wywoławcza Minimalne postąpienie Wysokość Wadium/ termin wpłaty do 23.04.2026r. Godzina przetargu ' +
    '1. Lokal nr 6 o pow. 25,91 m 2 przy ulicy Mickiewicza 9 wraz z udziałem 5/100 w działce gruntu 32.000 zł 320 zł 3.200 zł 9:00 ' +
    'V. TERMIN I MIEJSCE PRZETARGU: IV przetarg ustny nieograniczony odbędzie się w siedzibie Urzędu Miejskiego w Lublińcu, ul. Paderewskiego 5, Sala posiedzeń nr 11 - I piętro w dniu 29 kwietnia 2026r. o godzinie 9:00 ' +
    'I, II, III przetargi ustne nieograniczone zakończyły się wynikiem negatywnym. ' +
    'Burmistrz ma prawo odwołania przetargu z ważnych powodów.',
};

const CZESTOCHOWSKA_634_ACTIVE = {
  title:
    'I przetarg ustny (licytacja) nieograniczony na sprzedaż spółdzielczego własnościowego prawa do lokalu mieszkalnego przy ul. Częstochowskiej 6/34 w Lublińcu stanowiącego własność Gminy Lubliniec',
  body:
    'Burmistrz Miasta Lublińca ogłasza I przetarg ustny (licytacja) nieograniczony na sprzedaż spółdzielczego własnościowego prawa do lokalu mieszkalnego przy ul. Częstochowskiej 6/34 w Lublińcu, stanowiącego własność Gminy Lubliniec ' +
    'I. PRZEDMIOT SPRZEDAŻY: Spółdzielcze własnościowe prawo do lokalu mieszkalnego nr 34, położone w budynku wielomieszkaniowym przy ul. Częstochowskiej 6 w Lublińcu, o powierzchni użytkowej 46,20 m 2 opisane w księdze wieczystej Sądu Rejonowego w Lublińcu Nr CZ1L/00061662/4 jako własność Gminy Lubliniec. ' +
    'IV. CENA WYWOŁAWCZA NIERUCHOMOŚCI/ MINIMALNE POSTĄPIENIE/ WYSOKOŚĆ WADIUM/ GODZINA PRZETARGU Lp. Oznaczenie nieruchomości Cena wywoławcza Minimalne postąpienie Wysokość Wadium/ termin wpłaty do 01.09.2023r. Godzina przetargu ' +
    '1. Spółdzielcze własnościowe prawo do lokalu mieszkalnego przy ul. Częstochowskiej 6/34 250.000 zł 2.500 zł 25.000 zł 9:00 ' +
    'V. TERMIN I MIEJSCE PRZETARGU: I przetarg ustny nieograniczony odbędzie się w siedzibie Urzędu Miejskiego w Lublińcu, ul. Paderewskiego 5, Sala posiedzeń nr 11 - I piętro w dniu 06 września 2023r. o godzinie 9:00 ' +
    'Organizator zastrzega sobie możliwość zmiany miejsca przeprowadzenia przetargu.',
};

const OSWIECIMSKA_19_2017_ACTIVE = {
  title:
    'I przetarg ustny nieograniczony na sprzedaż nieruchomości lokalowej nr 1 położonej w Lublińcu przy ul. Oświęcimskiej 19',
  body:
    'Burmistrz Miasta Lublińca ogłasza I przetarg ustny nieograniczony na sprzedaż nieruchomości lokalowej nr 1 położonej w Lublińcu przy ul. Oświęcimskiej 19, stanowiącej własność Gminy Lubliniec ' +
    'I. Przedmiot sprzedaży: Lokal mieszkalny nr 1 o powierzchni użytkowej 26,50 m 2 wraz z udziałem w wysokości 3140/73270 w prawie użytkowania wieczystego działki gruntu. ' +
    'IV. Cena wywoławcza nieruchomości: 60.147,54 zł w tym: cena lokalu 58.428,00 zł. ' +
    'V. Termin i miejsce przetargu: I przetarg ustny nieograniczony odbędzie się w siedzibie Urzędu Miejskiego w Lublińcu, ul. Paderewskiego 5, Sala posiedzeń nr 11 - I piętro w dniu 27 września 2017r o godzinie 9:20 ' +
    'PRZETARG przeprowadzony zostanie zgodnie z Rozporządzeniem Rady Ministrów.',
};

// Board TITLE has a REAL live typo: "prztarg" (missing the "e" of "przetarg"),
// confirmed both in the board-93 anchor text and the document's own metryka
// "Tytuł dokumentu" field. The BODY's opening line is correctly spelled, so
// round/kind extraction (which reads TITLE-then-BODY) still recovers cleanly.
const PADEREWSKIEGO_1216_III_ACTIVE = {
  title:
    'III prztarg ustny nieograniczony(licytacja) na sprzedaż nieruchomości lokalowej przy ul. Paderewskiego 12/16 w Lublińcu',
  body:
    'Burmistrz Miasta Lublińca ogłasza III przetarg ustny (licytacja) nieograniczony na sprzedaż nieruchomości lokalowej przy ul. Paderewskiego 12/16 w Lublińcu, stanowiącej własność Gminy Lubliniec ' +
    'I. PRZEDMIOT SPRZEDAŻY: Prawo własności do lokalu mieszkalnego nr 16 o powierzchni użytkowej 29,40 m 2 , z którym związany jest udział w wysokości 184/10000 części w prawie własności do działki gruntu. ' +
    'IV. CENA WYWOŁAWCZA NIERUCHOMOŚCI/ MINIMALNE POSTĄPIENIE/ WYSOKOŚĆ WADIUM/ GODZINA PRZETARGU Lp. Oznaczenie nieruchomości Cena wywoławcza Minimalne postąpienie Wysokość Wadium/termin wpłaty do 21.11.2024r. Godzina przetargu ' +
    '1. Lok. mieszkalny nr 16 o pow. 29,40 m 2 przy ulicy Paderewskiego 12 wraz z udziałem 184/10000 w działce gruntu 140.000 zł 1.400 zł 14.000 zł 9:40 ' +
    'V. TERMIN I MIEJSCE PRZETARGU: III przetarg ustny nieograniczony odbędzie się w siedzibie Urzędu Miejskiego w Lublińcu, ul. Paderewskiego 5, Sala posiedzeń nr 11 - I piętro w dniu 27 listopada 2024r. o godzinie 9:40 ' +
    'I przetarg wyznaczony na dzień 17.07.2024r. oraz II przetarg wyznaczony na dzień 9.10.2024r. zakończyły się wynikiem negatywnym.',
};

// Abbreviated "o godz." (not "o godzinie") — confirms the date anchor accepts
// both spellings.
const LAND_SKLODOWSKIEJ_ACTIVE = {
  title:
    'I przetarg ustny (licytacja) nieograniczony na sprzedaż nieruchomości gruntowej, stanowiącej własność Gminy Lubliniec, położonej w Lublińcu przy ul. Marii Curie Skłodowskiej (dz.1808/51)',
  body:
    'Burmistrz Miasta Lublińca ogłasza I przetarg ustny (licytacja) nieograniczony na sprzedaż nieruchomości gruntowej, stanowiącej własność Gminy Lubliniec, położonej w Lublińcu przy ul. Marii Curie Skłodowskiej ' +
    'I. PRZEDMIOT SPRZEDAŻY nieruchomość gruntowa położona w Lublińcu przy ul. Marii Curie Skłodowskiej działka nr 1808/51 (Identyfikator działki 240701_1.0002.AR_1.1808/51) o pow. 0,2000 ha z karty mapy 1 obręb Lubliniec, zapisana w księdze wieczystej CZ1L/00032900/3 jako własność Gminy Lubliniec. ' +
    'IV. CENA WYWOŁAWCZA NIERUCHOMOŚCI/ MINIMALNE POSTĄPIENIE/ WYSOKOŚĆ WADIUM/ GODZINA PRZETARGU Oznaczenie nieruchomości Cena wywoławcza Minimalne postąpienie Wysokość Wadium/ termin wpłaty do 10.06.2026r. Godzina przetargu ' +
    'działka nr 1808/51 o pow. 0,2000 ha (2.000 m 2 ) 400.000,00 zł 4.000,00 zł 40.000,00 zł 9:00 Do ceny osiągniętej w przetargu doliczony zostanie podatek VAT w wysokości 23%. ' +
    'W przypadku zmiany stawki podatku VAT obowiązującej w dniu zawarcia umowy notarialnej. ' +
    'V. TERMIN I MIEJSCE PRZETARGU I przetarg ustny nieograniczony odbędzie się w siedzibie Urzędu Miejskiego w Lublińcu, ul. Paderewskiego 5, Sala posiedzeń nr 11- I piętro w dniu 17 czerwca 2026r. o godz. 9:00. ' +
    'Organizator zastrzega sobie możliwość zmiany miejsca przeprowadzenia przetargu.',
};

const PADEREWSKIEGO_1216_SOLD = {
  title:
    'Informacja pozytywna odnośnie rozstrzygnięcia III przetargu ustnego nieograniczonego na sprzedaż nieruchomości lokalowej przy ul. Paderewskiego 12/16 w Lublińcu, stanowiącej własność Gminy Lubliniec',
  body:
    'INFORMACJA Zgodnie z wymogami 12 Rozporządzenia Rady Ministrów z dnia 14 września 2004r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości ' +
    'BURMISTRZ MIASTA LUBLIŃCA informuje, że w dniu 27 listopada 2024r. w siedzibie Urzędu Miejskiego w Lublińcu przy ul. Paderewskiego 5 przeprowadzony został III przetarg ustny nieograniczony na sprzedaż nieruchomości lokalowej przy ul. Paderewskiego 12/16 w Lublińcu, stanowiącej własność Gminy Lubliniec ' +
    'wynik jest pozytywny Liczba osób dopuszczonych do uczestnictwa w przetargu 1 ' +
    'Cena wywoławcza nieruchomości lokalowej 140.000 zł (brutto) Najwyższa cena osiągnięta w przetargu 141.400 zł (brutto) ' +
    'Nabywcami wyżej opisanej nieruchomości lokalowej zostali: Małgorzata i Jarosław PROWDA',
};

// Terse result body NEVER restates "Lokal … nr 12" — the apartment number is
// only recoverable from the TITLE's "Oświęcimskiej 19/12" slash.
const OSWIECIMSKA_1912_SOLD = {
  title:
    'Informacja pozytywna odnośnie rozstrzygnięcia III przetargu ustnego nieograniczonego na sprzedaż nieruchomości lokalowej przy ul. Oświęcimskiej 19/12 w Lublińcu, stanowiącej własność Gminy Lubliniec',
  body:
    'INFORMACJA Zgodnie z wymogami 12 Rozporządzenia Rady Ministrów z dnia 14 września 2004r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości ' +
    'BURMISTRZ MIASTA LUBLIŃCA informuje, że w dniu 27 listopada 2024r. w siedzibie Urzędu Miejskiego w Lublińcu przy ul. Paderewskiego 5 przeprowadzony został III przetarg ustny nieograniczony na sprzedaż nieruchomości lokalowej przy ul. Oświęcimskiej 19/12 w Lublińcu, stanowiącej własność Gminy Lubliniec ' +
    'wynik jest pozytywny Liczba osób dopuszczonych do uczestnictwa w przetargu 1 ' +
    'Cena wywoławcza nieruchomości lokalowej 75.000 zł (brutto) Najwyższa cena osiągnięta w przetargu 75.750 zł (brutto) ' +
    'Nabywcą wyżej opisanej nieruchomości lokalowej została: CLEANING KAJA SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ',
};

const MICKIEWICZA_I_UNSOLD = {
  title:
    'Informacja negatywna dot. I przetargu ustnego nieograniczonego na przedaż nieruchomości lokalowej przy ul. Mickiewicza 9/6 w Lublińcu',
  body:
    'INFORMACJA Zgodnie z wymogami 12 Rozporządzenia Rady Ministrów z dnia 14 września 2004r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości ' +
    'BURMISTRZ MIASTA LUBLIŃCA informuje, że w dniu 8 października 2025r. w siedzibie Urzędu Miejskiego w Lublińcu przy ul. Paderewskiego 5 przeprowadzony został I przetarg ustny nieograniczony na sprzedaż nieruchomości lokalowej przy ul. Mickiewicza 9/6 w Lublińcu, stanowiącej własność Gminy Lubliniec ' +
    'wynik jest negatywny tj. nikt nie przystąpił do przetargu',
};

// THE spike-confirmed hammer-price doc (iddok 27200).
const LAND_RESULT_SOLD = {
  title:
    'Informacja pozytywna odnośnie I przetargu ustnego nieograniczonego na sprzedaż nieruchomości gruntowej, położonej w Lublińcu przy ul. M.C. Skłodowskiej (1808/51)',
  body:
    'INFORMACJA dotycząca wyniku I przetargu ustnego nieograniczonego na sprzedaż nieruchomości gruntowej, stanowiącej własność Gminy Lubliniec, położonej w Lublińcu przy ul. M.C. Skłodowskiej, rozpatrzonego w dniu 17.06 2026r. (godz. 9:00) w siedzibie Urzędu Miejskiego w Lublińcu przy ul. Paderewskiego 5. ' +
    'Przedmiot przetargu nieruchomość gruntowa, działka nr 1808/51 o pow. 0,2000 ha, opisana na arkuszu mapy 1 obręb Lubliniec ' +
    'Liczba podmiotów dopuszczonych do uczestnictwa w przetargu 3 ' +
    'Cena wywoławcza nieruchomości 400.000,00 zł + 23% podatku VAT Najwyższa cena osiągnięta w przetargu 552.000,00 zł + 23% podatku VAT ' +
    'W wyniku przeprowadzonego przetargu nabywcą nieruchomości została KOMTERM Spółka z ograniczoną odpowiedzialnością z/s w Częstochowie',
};

// NOTE the "Symbole: 1UC teren zabudowy usługowej … o powierzchni sprzedaży
// powyżej 2000 m2" clause below is REAL (verbatim from the live document,
// zoning-plan boilerplate — "sales floor area" of nearby retail land uses,
// nothing to do with selling THIS property) and deliberately kept: it means
// this lease notice's full text DOES contain "sprzedaż", so isSaleAuction
// ALONE (which only requires "przetarg" + "sprzedaż" somewhere in the text)
// is fooled into returning true here — exactly why crawl.js runs isLease as
// a SEPARATE, second gate rather than folding lease-exclusion into
// isSaleAuction. See the dedicated gate test below.
const LEASE_LISOWICKA = {
  title:
    'I przetarg ustny (licytacja) nieograniczony na dzierżawę nieruchomości gruntowej, stanowiącej własność Gminy Lubliniec, położonej w Lublińcu przy ul. Lisowickiej z przeznaczeniem pod uprawy rolne',
  body:
    'BURMISTRZ MIASTA LUBLIŃCA ogłasza I przetarg ustny (licytacja) nieograniczony na dzierżawę nieruchomości gruntowej, stanowiącej własność Gminy Lubliniec, położonej w Lublińcu przy ul. Lisowickiej z przeznaczeniem pod uprawy rolne ' +
    'Przedmiot przetargu: Przedmiotem dzierżawy są części działek nr 1407/51 o pow. 1,1653 ha, stanowiące własność Gminy Lubliniec, położone w Lublińcu przy ul. Lisowickiej. ' +
    'Przeznaczenie w Planie Zagospodarowania Przestrzennego: Symbole: 1UC teren zabudowy usługowej w tym tereny rozmieszczenia obiektów handlowych o powierzchni sprzedaży powyżej 2000 m 2 ; 102U, 106U tereny usług. ' +
    'Cena wywoławcza stawki czynszu rocznego/ minimalne postąpienie/ wysokość wadium/ godzina przetargu: Lp. Oznaczenie nieruchomości Cena wywoławcza stawki czynszu rocznego Minimalne postąpienie Wysokość Wadium/ termin wpłaty do 11.10.2024r. Godzina przetargu 1. Nieruchomość gruntowa o łącznej pow. 28,4800 ha 77.500,00 zł 775,00 zł 15.000,00 zł 9:45',
};

const CANCEL_KISIELEWSKIEGO = {
  title:
    'UWAGA Odwołanie I przetargu wyznaczonego na dzień 26 lipca br. na sprzedaż nieruchomości gruntowych, położonych przy ul. S KISIELEWSKIEGO w Lublińcu.',
  body:
    'BURMISTRZ MIASTA LUBLIŃCA Działając na podstawie art. 38 ust. 4 ustawy z dnia 21 sierpnia 1997r. o gospodarce nieruchomościami ODWOŁUJE I przetarg ustny (licytacja) nieograniczony na sprzedaż nieruchomości gruntowych, stanowiących własność Gminy Lubliniec, położonych w Lublińcu przy ul. STEFANA KISIELEWSKIEGO wyznaczony na dzień 26 lipca 2023r. ' +
    'Powodem odwołania przetargu jest konieczność sprostowania danych wyszczególnionych w pkt. I ogłoszenia jako Przedmiot przetargu.',
};

const SKARGA_TARGOWA = {
  title:
    'Informacja o sposobie rozstrzygnięcia skargi na czynności związane z przeprowadzeniem w dniu 08.04.2026 roku pierwszego przetargu ustnego nieograniczonego na sprzedaż nieruchomości, stanowiącej własność Gminy Lubliniec, położonej w Lublińcu przy ul. Targowej.',
  body:
    'Informacja o sposobie rozstrzygnięcia skargi na czynności związane z przeprowadzeniem w dniu 08.04.2026 roku pierwszego przetargu ustnego nieograniczonego na sprzedaż nieruchomości, stanowiącej własność Gminy Lubliniec, położonej w Lublińcu przy ul. Targowej.',
};

// ------------------------------------------------------------------- unit funcs

test('parsePLN: dot-thousands, no-grosze, comma-decimal (real Lubliniec amounts)', () => {
  assert.equal(parsePLN('552.000,00'), 552000);
  assert.equal(parsePLN('141.400'), 141400);
  assert.equal(parsePLN('60.147,54'), 60147);
  assert.equal(parsePLN('brak'), null);
});

test('roundFromText: TITLE round wins over history decoys ("wyznaczony", "przetargi ustne")', () => {
  assert.equal(roundFromText(buildRecordText(MICKIEWICZA_IV_ACTIVE)), 4);
  assert.equal(roundFromText(buildRecordText(CZESTOCHOWSKA_634_ACTIVE)), 1);
  assert.equal(roundFromText(buildRecordText(PADEREWSKIEGO_1216_III_ACTIVE)), 3);
  assert.equal(roundFromText(buildRecordText(LAND_SKLODOWSKIEJ_ACTIVE)), 1);
  assert.equal(roundFromText(buildRecordText(PADEREWSKIEGO_1216_SOLD)), 3);
  assert.equal(roundFromText(buildRecordText(MICKIEWICZA_I_UNSOLD)), 1);
});

test('roundFromText: recovers from BODY when the board TITLE has a typo ("prztarg")', () => {
  assert.ok(/prztarg/.test(PADEREWSKIEGO_1216_III_ACTIVE.title), 'fixture must keep the real typo');
  assert.equal(roundFromText(buildRecordText(PADEREWSKIEGO_1216_III_ACTIVE)), 3);
});

test('auctionDateFromText: announcement "o godzinie" and abbreviated "o godz." both parse', () => {
  assert.equal(auctionDateFromText(buildRecordText(MICKIEWICZA_IV_ACTIVE)), '2026-04-29');
  assert.equal(auctionDateFromText(buildRecordText(CZESTOCHOWSKA_634_ACTIVE)), '2023-09-06');
  assert.equal(auctionDateFromText(buildRecordText(OSWIECIMSKA_19_2017_ACTIVE)), '2017-09-27');
  assert.equal(auctionDateFromText(buildRecordText(PADEREWSKIEGO_1216_III_ACTIVE)), '2024-11-27');
  assert.equal(auctionDateFromText(buildRecordText(LAND_SKLODOWSKIEJ_ACTIVE)), '2026-06-17');
});

test('auctionDateFromText: result docs (no restated time) via the "w siedzibie"/"(godz"/"roku" fallback', () => {
  assert.equal(auctionDateFromText(buildRecordText(PADEREWSKIEGO_1216_SOLD)), '2024-11-27');
  assert.equal(auctionDateFromText(buildRecordText(MICKIEWICZA_I_UNSOLD)), '2025-10-08');
  assert.equal(auctionDateFromText(buildRecordText(LAND_RESULT_SOLD)), '2026-06-17');
});

test('startingPriceFromText: TIER1 direct label (result docs + pre-2023 layout)', () => {
  assert.equal(startingPriceFromText(buildRecordText(OSWIECIMSKA_19_2017_ACTIVE)), 60147);
  assert.equal(startingPriceFromText(buildRecordText(PADEREWSKIEGO_1216_SOLD)), 140000);
  assert.equal(startingPriceFromText(buildRecordText(LAND_RESULT_SOLD)), 400000);
});

test('startingPriceFromText: TIER2 table triple (2023+ announcement layout, label far from value)', () => {
  assert.equal(startingPriceFromText(buildRecordText(MICKIEWICZA_IV_ACTIVE)), 32000);
  assert.equal(startingPriceFromText(buildRecordText(CZESTOCHOWSKA_634_ACTIVE)), 250000);
  assert.equal(startingPriceFromText(buildRecordText(PADEREWSKIEGO_1216_III_ACTIVE)), 140000);
  assert.equal(startingPriceFromText(buildRecordText(LAND_SKLODOWSKIEJ_ACTIVE)), 400000);
});

test('achievedPriceFromText: no-grosze ("141.400 zł") and grosze ("552.000,00 zł") amounts; null when unsold', () => {
  assert.equal(achievedPriceFromText(buildRecordText(PADEREWSKIEGO_1216_SOLD)), 141400);
  assert.equal(achievedPriceFromText(buildRecordText(OSWIECIMSKA_1912_SOLD)), 75750);
  assert.equal(achievedPriceFromText(buildRecordText(LAND_RESULT_SOLD)), 552000);
  assert.equal(achievedPriceFromText(buildRecordText(MICKIEWICZA_I_UNSOLD)), null);
});

test('unitAreaFromText: immediate gap and the spółdzielcze-prawo long gap ("położone w budynku…przy ul….o powierzchni")', () => {
  assert.equal(unitAreaFromText(buildRecordText(MICKIEWICZA_IV_ACTIVE)), 25.91);
  assert.equal(unitAreaFromText(buildRecordText(CZESTOCHOWSKA_634_ACTIVE)), 46.20);
  assert.equal(unitAreaFromText(buildRecordText(OSWIECIMSKA_19_2017_ACTIVE)), 26.50);
  assert.equal(unitAreaFromText(buildRecordText(PADEREWSKIEGO_1216_III_ACTIVE)), 29.40);
});

test('addressRawFromText: slash-apt in TITLE, "nr N" in TITLE, and body-derived apt', () => {
  assert.equal(addressRawFromText(buildRecordText(MICKIEWICZA_IV_ACTIVE)), 'Mickiewicza 9/6');
  assert.equal(addressRawFromText(buildRecordText(CZESTOCHOWSKA_634_ACTIVE)), 'Częstochowskiej 6/34');
  assert.equal(addressRawFromText(buildRecordText(OSWIECIMSKA_19_2017_ACTIVE)), 'Oświęcimskiej 19/1');
  assert.equal(addressRawFromText(buildRecordText(PADEREWSKIEGO_1216_III_ACTIVE)), 'Paderewskiego 12/16');
});

test('addressRawFromText: terse RESULT doc recovers apt ONLY from the TITLE slash (no body restatement)', () => {
  // Oświęcimska 19/12's result body never says "Lokal … nr 12" (see fixture
  // comment) — addressRawFromText must fall back to the "/12" already
  // captured from the "przy ul. Oświęcimskiej 19/12" TITLE match itself.
  assert.equal(addressRawFromText(buildRecordText(OSWIECIMSKA_1912_SOLD)), 'Oświęcimskiej 19/12');
  assert.equal(addressRawFromText(buildRecordText(PADEREWSKIEGO_1216_SOLD)), 'Paderewskiego 12/16');
  assert.equal(addressRawFromText(buildRecordText(MICKIEWICZA_I_UNSOLD)), 'Mickiewicza 9/6');
});

test('addressRawFromText: land text (no building number anywhere) resolves to null, not a garbage capture', () => {
  // addressRawFromText is documented flat/commercial-only (land routes
  // through landStreetFromText/landPlotFromText instead) and is never called
  // on land text in the real parseAnnouncement/parseResultDoc flow — but
  // calling it directly here regression-guards the failure mode found while
  // building this adapter: LAND_SKLODOWSKIEJ_ACTIVE's "przy ul. Marii Curie
  // Skłodowskiej" has NO building number nearby (land is parcel-addressed),
  // so an early version of PROP_ADDR_RE's lazy street capture ran straight
  // through the sentence boundary into "działka nr 1808/51" and returned
  // that PARCEL number as if it were a building number. isJunkStreetCapture
  // (+ the street-length cap) now makes this fail closed (null) instead.
  assert.equal(addressRawFromText(buildRecordText(LAND_SKLODOWSKIEJ_ACTIVE)), null);
});

test('addressRawFromText: skips the UM office address and the "działka nr" junk capture to find the real address', () => {
  // Synthetic (not live-fetched) probes, built from REAL phrase fragments
  // confirmed live, that force addressRawFromText's `while` loop to actually
  // walk PAST a bad first candidate — none of the fixtures above need to
  // (their TITLE already has a clean match on the first attempt), so without
  // these the office/junk skip logic would be exercised by nothing.
  const officeFirst = buildRecordText({
    title: 'Ogłoszenie', // deliberately no address, forcing a body-only search
    body:
      // Real boilerplate clause (verbatim, seen on every announcement):
      'Ogłoszenie niniejsze wywieszone jest na tablicy informacyjnej w siedzibie Urzędu Miejskiego w Lublińcu przy ul. Paderewskiego 5. ' +
      // The real property address, appearing only AFTER the office one:
      'Lokal mieszkalny nr 3 położony jest przy ul. Kościuszki 8 w Lublińcu.',
  });
  assert.equal(addressRawFromText(officeFirst), 'Kościuszki 8/3');

  const junkThenReal = buildRecordText({
    title: 'Ogłoszenie',
    body:
      // A minimal reproduction of the land "przy ul. …" (no nearby number)
      // running into a parcel aside, immediately followed by a genuine
      // flat address — proves isJunkStreetCapture skips the first without
      // consuming the second.
      'Nieruchomość gruntowa położona w Lublińcu przy ul. Sportowej działka nr 12/3. ' +
      'Lokal mieszkalny nr 5 przy ul. Klonowej 7 w Lublińcu.',
  });
  assert.equal(addressRawFromText(junkThenReal), 'Klonowej 7/5');
});

test('kindFromText: TITLE-unqualified "nieruchomości lokalowej" falls back to BODY\'s (nie)mieszkalny qualifier', () => {
  assert.equal(kindFromText(buildRecordText(MICKIEWICZA_IV_ACTIVE)), 'uzytkowy'); // lokal NIEmieszkalny
  assert.equal(kindFromText(buildRecordText(CZESTOCHOWSKA_634_ACTIVE)), 'mieszkalny');
  assert.equal(kindFromText(buildRecordText(PADEREWSKIEGO_1216_III_ACTIVE)), 'mieszkalny');
  assert.equal(kindFromText(buildRecordText(LAND_SKLODOWSKIEJ_ACTIVE)), 'grunt');
});

test('gates: isSaleAuction / isLease — isSaleAuction alone is fooled by real zoning-plan "sprzedaży" text, isLease is the actual filter', () => {
  assert.equal(isSaleAuction(buildRecordText(MICKIEWICZA_IV_ACTIVE)), true);
  // Real "powierzchni sprzedaży" zoning boilerplate (see fixture comment)
  // makes the bare przetarg+sprzedaż test pass even for this lease notice —
  // isSaleAuction is NOT the gate that excludes leases.
  assert.equal(isSaleAuction(buildRecordText(LEASE_LISOWICKA)), true);
  assert.equal(isLease(buildRecordText(LEASE_LISOWICKA)), true);
  assert.equal(isLease(buildRecordText(MICKIEWICZA_IV_ACTIVE)), false);
});

test('gates: cancellation and complaint-resolution notices are excluded (TITLE-scoped, not fooled by the normal "prawo odwołania przetargu" boilerplate)', () => {
  assert.equal(isSaleAuction(buildRecordText(CANCEL_KISIELEWSKIEGO)), false);
  assert.equal(isSaleAuction(buildRecordText(SKARGA_TARGOWA)), false);
  assert.equal(isResultDoc(buildRecordText(CANCEL_KISIELEWSKIEGO)), false);
  assert.equal(isResultDoc(buildRecordText(SKARGA_TARGOWA)), false);
  // The ordinary boilerplate clause "Burmistrz ma prawo odwołania przetargu z
  // ważnych powodów" sits in EVERY normal announcement's body (incl. this
  // fixture) — a whole-text (non-TITLE-scoped) guard would wrongly reject it.
  assert.equal(isSaleAuction(buildRecordText(MICKIEWICZA_IV_ACTIVE)), true);
});

test('gates: isResultDoc / isNegativeOutcome', () => {
  assert.equal(isResultDoc(buildRecordText(PADEREWSKIEGO_1216_SOLD)), true);
  assert.equal(isResultDoc(buildRecordText(MICKIEWICZA_I_UNSOLD)), true);
  assert.equal(isResultDoc(buildRecordText(LAND_RESULT_SOLD)), true);
  assert.equal(isResultDoc(buildRecordText(MICKIEWICZA_IV_ACTIVE)), false); // announcement, not a result
  assert.equal(isNegativeOutcome(buildRecordText(MICKIEWICZA_I_UNSOLD)), true);
  assert.equal(isNegativeOutcome(buildRecordText(PADEREWSKIEGO_1216_SOLD)), false);
});

// ------------------------------------------------------------- result records

test('parseResultDoc: Paderewskiego 12/16 SOLD (round III, no-grosze achieved price)', () => {
  const [r] = parseResultDoc(buildRecordText(PADEREWSKIEGO_1216_SOLD), null, 'https://lubliniec.bip.info.pl/dokument.php?iddok=24862&idmp=94&r=r');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'paderewskiego|12|16');
  assert.equal(r.address.street, 'Paderewskiego');
  assert.equal(r.address.building, '12');
  assert.equal(r.address.apt, '16');
  assert.equal(r.starting_price_pln, 140000);
  assert.equal(r.final_price_pln, 141400);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.round, 3);
  assert.equal(r.auction_date, '2024-11-27');
});

test('parseResultDoc: Oświęcimska 19/12 SOLD (round III, apt from TITLE slash only)', () => {
  const [r] = parseResultDoc(buildRecordText(OSWIECIMSKA_1912_SOLD), null, 'https://lubliniec.bip.info.pl/dokument.php?iddok=24861&idmp=94&r=r');
  assert.equal(r.address.key, 'oswiecimskiej|19|12');
  assert.equal(r.address.apt, '12');
  assert.equal(r.starting_price_pln, 75000);
  assert.equal(r.final_price_pln, 75750);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.round, 3);
});

test('parseResultDoc: Mickiewicza 9/6 UNSOLD (round I, "nikt nie przystąpił")', () => {
  const [r] = parseResultDoc(buildRecordText(MICKIEWICZA_I_UNSOLD), null, 'https://lubliniec.bip.info.pl/dokument.php?iddok=25996&idmp=94&r=r');
  assert.equal(r.address.key, 'mickiewicza|9|6');
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2025-10-08');
});

test('parseResultDoc: THE confirmed hammer-price doc — M.C. Skłodowskiej land, iddok 27200 (552.000,00 zł vs 400.000,00 zł, round I)', () => {
  const [r] = parseResultDoc(buildRecordText(LAND_RESULT_SOLD), null, 'https://lubliniec.bip.info.pl/dokument.php?iddok=27200&idmp=94&r=r');
  assert.equal(r.kind, 'grunt');
  assert.ok(r.dzialka_nr.includes('1808/51'), `dzialka_nr=${r.dzialka_nr}`);
  assert.equal(r.starting_price_pln, 400000);
  assert.equal(r.final_price_pln, 552000);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2026-06-17');
});

test('parseResultDoc: returns [] for non-result / non-auction notices', () => {
  assert.deepEqual(parseResultDoc(buildRecordText(CANCEL_KISIELEWSKIEGO), null, 'x'), []);
  assert.deepEqual(parseResultDoc(buildRecordText(SKARGA_TARGOWA), null, 'x'), []);
  assert.deepEqual(parseResultDoc(buildRecordText(MICKIEWICZA_IV_ACTIVE), null, 'x'), []); // pending announcement, not a result
});

// ----------------------------------------------------------- active + land

test('parseAnnouncement: Mickiewicza 9/6 IV (lokal niemieszkalny → uzytkowy, table price, date+round decoys)', () => {
  const rec = parseAnnouncement(buildRecordText(MICKIEWICZA_IV_ACTIVE));
  assert.equal(rec.kind, 'uzytkowy');
  assert.equal(rec.address.key, 'mickiewicza|9|6');
  assert.equal(rec.area_m2, 25.91);
  assert.equal(rec.starting_price_pln, 32000);
  assert.equal(rec.auction_date, '2026-04-29');
  assert.equal(rec.round, 4);
});

test('parseAnnouncement: Częstochowska 6/34 I (spółdzielcze prawo, area-gap case) — matches spike (250.000 zł, 46,20 m²)', () => {
  const rec = parseAnnouncement(buildRecordText(CZESTOCHOWSKA_634_ACTIVE));
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address.key, 'czestochowskiej|6|34');
  assert.equal(rec.area_m2, 46.20);
  assert.equal(rec.starting_price_pln, 250000);
  assert.equal(rec.round, 1);
});

test('parseAnnouncement: Oświęcimska 19/1 I (pre-2023 layout) — matches spike (26,50 m², iddok 13865)', () => {
  const rec = parseAnnouncement(buildRecordText(OSWIECIMSKA_19_2017_ACTIVE));
  assert.equal(rec.address.key, 'oswiecimskiej|19|1');
  assert.equal(rec.area_m2, 26.50);
  assert.equal(rec.starting_price_pln, 60147);
  assert.equal(rec.auction_date, '2017-09-27');
});

test('parseAnnouncement: Paderewskiego 12/16 III — matches spike (iddok 24601)', () => {
  const rec = parseAnnouncement(buildRecordText(PADEREWSKIEGO_1216_III_ACTIVE));
  assert.equal(rec.address.key, 'paderewskiego|12|16');
  assert.equal(rec.area_m2, 29.40);
  assert.equal(rec.starting_price_pln, 140000);
  assert.equal(rec.round, 3);
  assert.equal(rec.auction_date, '2024-11-27');
});

test('parseAnnouncement: land (Skłodowskiej dz. 1808/51) → kind grunt with parcel + area', () => {
  const rec = parseAnnouncement(buildRecordText(LAND_SKLODOWSKIEJ_ACTIVE));
  assert.equal(rec.kind, 'grunt');
  assert.ok(rec.dzialka_nr.includes('1808/51'), `dzialka_nr=${rec.dzialka_nr}`);
  assert.equal(rec.area_m2, 2000);
  assert.equal(rec.starting_price_pln, 400000);
  assert.equal(rec.round, 1);
  assert.equal(rec.auction_date, '2026-06-17');
});

// crawl.js admits a record into parseAnnouncement only when BOTH gates agree:
// `if (!isSaleAuction(text)) continue; if (isLease(text)) continue;`
function admittedAsSaleAnnouncement(fixture) {
  const text = buildRecordText(fixture);
  return isSaleAuction(text) && !isLease(text);
}

test('parseAnnouncement gating: lease / cancellation / complaint-resolution notices never reach parseAnnouncement', () => {
  assert.equal(admittedAsSaleAnnouncement(LEASE_LISOWICKA), false); // isSaleAuction=true, but isLease=true catches it
  assert.equal(admittedAsSaleAnnouncement(CANCEL_KISIELEWSKIEGO), false); // isSaleAuction=false (TITLE-scoped "Odwołanie" guard)
  assert.equal(admittedAsSaleAnnouncement(SKARGA_TARGOWA), false); // isSaleAuction=false (TITLE-scoped "skargi" guard)
  assert.equal(admittedAsSaleAnnouncement(MICKIEWICZA_IV_ACTIVE), true); // a genuine sale announcement is admitted
});

// ----------------------------------------------------------- board HTML

test('parseBoardPage: extracts iddok/url/title from real board HTML (single-quoted hrefs, dedupes)', () => {
  // Condensed-but-real markup shape captured live from
  // https://lubliniec.bip.info.pl/index.php?idmp=93&r=r (2026-07-10): a
  // `<div id="content-main">` table of `<tr><td>DATE</td><td class="code">
  // </td><td><a class="hilited" href='dokument.php?iddok=N&amp;idmp=93&amp;
  // r=r' >TITLE</a></td></tr>` rows, followed by `<div id="colRight">`
  // sidebar chrome that must be excluded from the parsed region.
  const html = `
    <div id="content-main" class="textformatter col-sm-7" role="main">
    <table><tbody>
    <tr class="odd">
        <td>09.07.2026 12:07</td>
        <td class="code"></td>
        <td><a class="hilited" href='dokument.php?iddok=27241&amp;idmp=93&amp;r=r' >I przetarg ustny (licytacja) nieograniczony na sprzedaż nieruchomości gruntowej, stanowiącej własność Gminy Lubliniec, położonej w Lublińcu przy ul. Marii Curie Skłodowskiej (1809/51) </a></td>
    </tr><tr class="odd">
        <td>12.06.2026 11:41</td>
        <td class="code"></td>
        <td><a class="hilited" href='dokument.php?iddok=27155&amp;idmp=93&amp;r=r' >I przetarg ustny (licytacja) nieograniczony na sprzedaż nieruchomości gruntowej, stanowiącej własność Gminy Lubliniec, położonej w Lublińcu przy ul. JAWOROWEJ </a></td>
    </tr><tr class="odd">
        <td>09.07.2026 12:07</td>
        <td class="code"></td>
        <td><a class="hilited" href='dokument.php?iddok=27241&amp;idmp=93&amp;r=r' >duplicate row — must be deduped</a></td>
    </tr>
    </tbody></table>
    </div>
    <div id="colRight">Wyszukiwarka — sidebar chrome, must be excluded from the parsed region</div>`;
  const refs = parseBoardPage(html, 93);
  assert.equal(refs.length, 2);
  assert.equal(refs[0].iddok, '27241');
  assert.equal(refs[0].url, 'https://lubliniec.bip.info.pl/dokument.php?iddok=27241&idmp=93&r=r');
  assert.ok(refs[0].title.includes('Marii Curie Skłodowskiej'), `title=${refs[0].title}`);
  assert.equal(refs[1].iddok, '27155');
});

test('parseBoardPage: idmp filters to the requested board (93 vs 94 rows in the same region are not cross-matched)', () => {
  const html = `<div id="content-main">
    <a class="hilited" href='dokument.php?iddok=100&amp;idmp=93&amp;r=r' >announcement</a>
    <a class="hilited" href='dokument.php?iddok=200&amp;idmp=94&amp;r=r' >result</a>
    </div><div id="footer"></div>`;
  const announce = parseBoardPage(html, 93);
  const results = parseBoardPage(html, 94);
  assert.deepEqual(announce.map((r) => r.iddok), ['100']);
  assert.deepEqual(results.map((r) => r.iddok), ['200']);
});
