// Krosno Odrzańskie parser tests. Fixtures are condensed-but-verbatim copies of
// REAL page/PDF text fetched live 2026-07-12 from bip.krosnoodrzanskie.pl (the
// SYSTEMDOBIP.PL board /przetargi/202/status/{0,1}/ + its born-digital PDF
// attachments, via core/pdf-text.js). Long non-load-bearing boilerplate (the
// wadium-procedure paragraph, the §12-rozporządzenie citation, notarial-cost
// warnings) is trimmed; every sentence that feeds a parsed field — and the two
// deliberate REGRESSION traps below — is kept verbatim:
//
//   * VENUE TRAP: both PDFs name the auction venue "ul. Parkowa/Parkowej 1"
//     (the Urząd seat) BEFORE the property; the parser must key on the
//     "położon…przy ul. …" property clause, never that first "ul.".
//   * MISLABEL TRAP: the Chrobrego 26/3 wynik PDF calls the flat "lokal
//     użytkowy nr 3" though the board Dotyczy + the announcement PDF both say
//     "lokal mieszkalny" (same 78,19 m²). classifyKind on the PDF body alone
//     tags it 'uzytkowy' and drops it; anchoring on the board Dotyczy
//     (buildResultText) recovers the flat.
//
// Groundtruth (hand-verified against the live pages/PDFs):
//   ul. Bolesława Chrobrego 26/3, lokal mieszkalny nr 3, 78,19 m² (auction
//     9/GN/2026): announce cena wywoławcza 220 000 zł, auction 2026-06-09;
//     result Wynik "Negatywny" — "bez rozstrzygnięcia z uwagi na brak
//     oferentów", round I (board "pierwszy"); wynik PDF mislabels kind.
//   ul. Bolesława Chrobrego 8/2, lokal mieszkalny nr 2, 72,74 m²: result
//     Wynik "Negatywny", round III (board "trzeci"), auction 2024-05-14.
//   działka 307, 0,1071 ha (LAND, out of flats-only scope): result Wynik
//     "Pozytywny" — real "Najwyższa cena osiągnięta w przetargu wyniosła
//     47 470,00 zł" phrasing → groundtruths achievedPriceFromText; the record
//     itself is 'grunt' → parseResultDoc returns [].

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { classifyKind } from '../src/core/classify-kind.js';
import {
  parsePLN,
  startingPriceFromText,
  achievedPriceFromText,
  flatAreaFromText,
  roundFromText,
  extractFlatAddress,
  isFlatSaleRow,
  isNegativeOutcome,
  dateOnly,
  buildResultText,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/krosno-odrzanskie/parse.js';

// ----------------------------------------------------------------- fixtures

// Board row for the active 9/GN/2026 flat (as it appeared on the board — the
// abbreviated Dotyczy address is deliberate; the canonical one is in the PDF).
const CHROB26_ROW = {
  detailUrl: 'https://bip.krosnoodrzanskie.pl/przetargi/202/554/9_2FGN_2F2026/',
  dotyczyText:
    'pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego wraz z udziałem w częściach wspólnych i prawie do gruntu - ul. B.Chrobrego 26/3',
  cenaText: '220 000,00 zł',
  wynikText: 'Negatywny',
  announcedDate: '2026-04-28 00:00:00',
  auctionDateRaw: '2026-06-09 10:30:00',
  attachments: [],
};

// Announcement PDF body (I_przetarg_ustny_nieogran._na_sprzedaz_lokalu_mieszkalnego.pdf).
const CHROB26_ANNOUNCE_PDF = `BURMISTRZ KROSNA ODRZAŃSKIEGO OGŁASZA pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego wraz z udziałem w częściach wspólnych i prawie do gruntu.
Przetarg odbędzie się w dniu 9 czerwca 2026 roku o godz. 10:30 w siedzibie Urzędu Miasta w Krośnie Odrzańskim przy ul. Parkowej 1, budynek B, pokój nr 11.
Nieruchomość stanowi własność Gminy Krosno Odrzańskie.
Nieruchomość położona jest w Krośnie Odrzańskim przy ul. Bolesława Chrobrego 26/3 na działce o numerze ewidencyjnym 1142/7 o powierzchni 0,0773 ha znajdująca się w obrębie 0001.
Lokal mieszkalny usytuowany jest na poddaszu budynku mieszkalnego, wejście do lokalu z klatki schodowej. Powierzchnia użytkowa lokalu: 78,19 m2. Lokal składa się z pokoju, kuchni, łazienki, przedpokoju oraz dwóch skrytek.
Do lokalu przynależą dwie piwnice o łącznej powierzchni 24,14 m2.`;

// Negative flat wynik PDF (Informacja_o_wyniku_przetargu_Chrobrego_-_negatywny.pdf) —
// the MISLABEL doc ("lokal użytkowy nr 3") + VENUE letterhead ("Ul. Parkowa 1").
const CHROB26_WYNIK_PDF = `Urząd Miasta w Krośnie Odrzańskim Krosno Odrzańskie, dnia 2026-06-09
Ul. Parkowa 1 66-600 Krosno Odrzańskie
INFORMACJA O WYNIKU PRZETARGU
Burmistrz Krosna Odrzańskiego podaje do publicznej wiadomości wynik przeprowadzonego w dniu 09 czerwca 2026 r. pierwszego ustnego przetargu niegraniczonego.
1. Przedmiotem przetargu był lokal użytkowy nr 3 o pow. użytkowej 78,19 m2, położony w Krośnie Odrzańskim przy ul. Bolesława Chrobrego 26 z równoczesna sprzedażą ułamkowej części gruntu wynoszącą 245/1000 z dz. nr 1142/7, obręb 0001. Dla przedmiotowej nieruchomości lokalowej nie była założona księga wieczysta.
2. Cena wywoławcza przedmiotowej nieruchomości do trzeciego ustnego przetargu niegraniczonego wynosiła 220 000,00 zł.
3. Przetarg bez rozstrzygnięcia z uwagi na brak oferentów.`;

// Second real negative flat (Chrobrego 8/2), correctly labelled "lokal mieszkalny".
const CHROB8_ROW = {
  detailUrl: 'https://bip.krosnoodrzanskie.pl/przetargi/202/431/x/',
  dotyczyText:
    'trzeci przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego wraz z udziałem w nieruchomości wspólnej - ul. B. Chrobrego 8/2',
  cenaText: '144 000,00 zł',
  wynikText: 'Negatywny',
  auctionDateRaw: '2024-05-14 10:00:00',
  attachments: [],
};
const CHROB8_WYNIK_PDF = `INFORMACJA O WYNIKU PRZETARGU
Burmistrz Krosna Odrzańskiego podaje do publicznej wiadomości wynik przeprowadzonego w dniu 14 maja 2024 r. trzeciego ustnego przetargu nieograniczonego.
1. Przedmiotem przetargu był lokal mieszkalny nr 2 o pow. użytkowej 72,74 m2, położony w Krośnie Odrzańskim przy ul. Bolesława Chrobrego 8 z równoczesna sprzedażą ułamkowej części gruntu wynoszącą 30/100 z dz. nr 1074/9, obręb 0001.
3. Przetarg bez rozstrzygnięcia z uwagi na brak oferentów.`;

// LAND wynik PDF (Informacja_o_wyniku_przetargu_307.pdf) — a real SOLD result,
// but 'grunt' (out of the flats-only scope); groundtruths achievedPriceFromText.
const LAND307_WYNIK_PDF = `Krosno Odrzańskie, dnia 2026-05-15 GN.6840.39.2024.KB
INFORMACJA O WYNIKU PRZETARGU
Burmistrz Krosna Odrzańskiego podaje do publicznej wiadomości informację o wyniku pierwszego ustnego przetargu nieograniczonego na sprzedaż nieruchomości niezabudowanej, położonej w obrębie 0002 miejscowości Krosno Odrzańskie.
Przedmiotem przetargu była niezabudowana nieruchomość gruntowa oznaczona jako działka o numerze ewidencyjnym 307 o powierzchni 0,1071 ha położona w obrębie 0002 miejscowości Krosno Odrzańskie.
Cena wywoławcza przedmiotowej działki do pierwszego ustnego przetargu nieograniczonego wynosiła 47 000,00 zł. Najwyższa cena osiągnięta w przetargu wyniosła 47 470,00 zł netto + 23% VAT tj. 58 388,10 zł brutto.
Nabywcą nieruchomości gruntowej została spółka Recykl Organizacja Odzysku Spółka Akcyjna.`;

// -------------------------------------------------------------- unit funcs

test('parsePLN: space-thousands (the live format) and dot-thousands fallback', () => {
  assert.equal(parsePLN('220 000,00'), 220000);
  assert.equal(parsePLN('47 470,00'), 47470);
  assert.equal(parsePLN('70.343,00'), 70343);
  assert.equal(parsePLN('brak'), null);
});

test('roundFromText: Polish WORD ordinals qualifying "przetarg" (subject + genitive declensions)', () => {
  assert.equal(roundFromText('pierwszy przetarg ustny nieograniczony'), 1);
  assert.equal(roundFromText('drugi przetarg ustny nieograniczony'), 2);
  assert.equal(roundFromText('trzeci przetarg ustny nieograniczony'), 3);
  assert.equal(roundFromText('czwarty przetarg ustny nieograniczony na sprzedaż'), 4);
  assert.equal(roundFromText('wynik przeprowadzonego ... pierwszego ustnego przetargu'), 1);
  assert.equal(roundFromText('do trzeciego ustnego przetargu niegraniczonego wynosiła'), 3);
  assert.equal(roundFromText('nic tu nie ma o rundzie'), null);
});

test('flatAreaFromText: takes "powierzchnia użytkowa", never the cellar/plot area', () => {
  assert.equal(flatAreaFromText('Powierzchnia użytkowa lokalu: 78,19 m2'), 78.19);
  assert.equal(flatAreaFromText('lokal mieszkalny nr 2 o pow. użytkowej 72,74 m2'), 72.74);
  // The flat's cellar ("o łącznej powierzchni 24,14 m2") lacks "użytkow" -> ignored.
  assert.equal(
    flatAreaFromText('Powierzchnia użytkowa lokalu: 78,19 m2. Do lokalu przynależą piwnice o łącznej powierzchni 24,14 m2.'),
    78.19,
  );
});

test('achievedPriceFromText: real "Najwyższa cena osiągnięta w przetargu wyniosła X zł" (net figure)', () => {
  assert.equal(achievedPriceFromText(LAND307_WYNIK_PDF), 47470);
  assert.equal(achievedPriceFromText(CHROB26_WYNIK_PDF), null); // negative doc — no achieved price
});

test('extractFlatAddress: property clause wins over the venue ("ul. Parkowej 1")', () => {
  assert.equal(extractFlatAddress(CHROB26_ANNOUNCE_PDF), 'Bolesława Chrobrego 26/3'); // glued property form
  assert.equal(extractFlatAddress(CHROB26_WYNIK_PDF), 'Bolesława Chrobrego 26/3'); // "przy ul. … 26" + "nr 3"
  assert.equal(extractFlatAddress(CHROB8_WYNIK_PDF), 'Bolesława Chrobrego 8/2');
});

test('isFlatSaleRow: flats yes, commercial/land/lease no (classifyKind on the body)', () => {
  assert.equal(isFlatSaleRow(CHROB26_ROW.dotyczyText), true);
  assert.equal(isFlatSaleRow('drugi przetarg ustny nieograniczony na sprzedaż lokalu użytkowego - ul.Podgórna 1B/2'), false);
  assert.equal(isFlatSaleRow('pierwszy ustny przetarg nieograniczony na sprzedaż nieruchomości niezabudowanej działka 63/4'), false);
  assert.equal(isFlatSaleRow('przetarg na najem lokalu mieszkalnego'), false); // lease
});

test('dateOnly: strips the time component from the board "Data i godzina przetargu"', () => {
  assert.equal(dateOnly('2026-06-09 10:30:00'), '2026-06-09');
  assert.equal(dateOnly(null), null);
});

// ----------------------------------------------------- parseAnnouncement (active flat)

test('parseAnnouncement: Chrobrego 26/3 — canonical address + area from the PDF, price/round/date from the board row', () => {
  const r = parseAnnouncement(CHROB26_ROW, CHROB26_ANNOUNCE_PDF, 'https://bip.krosnoodrzanskie.pl/system/pobierz.php?plik=ann.pdf&id=x');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.street, 'Bolesława Chrobrego');
  assert.equal(r.address.building, '26');
  assert.equal(r.address.apt, '3');
  assert.equal(r.address.key, 'boleslawa chrobrego|26|3');
  assert.equal(r.area_m2, 78.19);
  assert.equal(r.starting_price_pln, 220000);
  assert.equal(r.auction_date, '2026-06-09');
  assert.equal(r.round, 1);
});

test('parseAnnouncement: a land/commercial row returns null (flats-only)', () => {
  const landRow = {
    detailUrl: 'x',
    dotyczyText: 'pierwszy ustny przetarg ograniczony na sprzedaż nieruchomości składającej się z działek 254/2 i 256/4',
    cenaText: '51 200,00 zł',
    wynikText: 'Brak wyniku',
    auctionDateRaw: '2026-07-28 12:00:00',
    attachments: [],
  };
  assert.equal(parseAnnouncement(landRow, null, 'x'), null);
});

// -------------------------------------------------- parseResultDoc (informacja o wyniku)

test('parseResultDoc: Chrobrego 26/3 negative — MISLABEL ("lokal użytkowy") defeated by the board Dotyczy anchor', () => {
  const text = buildResultText(CHROB26_ROW.dotyczyText, CHROB26_ROW.cenaText, CHROB26_WYNIK_PDF);
  const [r] = parseResultDoc(text, dateOnly(CHROB26_ROW.auctionDateRaw), 'https://bip.krosnoodrzanskie.pl/system/pobierz.php?plik=wynik.pdf&id=y');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'boleslawa chrobrego|26|3'); // SAME key as the announcement
  assert.equal(r.area_m2, 78.19);
  assert.equal(r.starting_price_pln, 220000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'unknown');
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2026-06-09');
  assert.equal(r.source_pdf, 'https://bip.krosnoodrzanskie.pl/system/pobierz.php?plik=wynik.pdf&id=y');
});

test('parseResultDoc: the MISLABEL trap is real — the raw wynik PDF body ALONE classifies uzytkowy and returns []', () => {
  // Demonstrates why buildResultText prepends the board Dotyczy: without the
  // anchor, classifyKind sees only "lokal użytkowy nr 3" and drops the flat.
  assert.equal(classifyKind(CHROB26_WYNIK_PDF), 'uzytkowy');
  assert.deepEqual(parseResultDoc(CHROB26_WYNIK_PDF, '2026-06-09', 'x'), []);
});

test('parseResultDoc: Chrobrego 8/2 negative (round III) — correctly-labelled flat', () => {
  const text = buildResultText(CHROB8_ROW.dotyczyText, CHROB8_ROW.cenaText, CHROB8_WYNIK_PDF);
  const [r] = parseResultDoc(text, dateOnly(CHROB8_ROW.auctionDateRaw), 'https://bip.krosnoodrzanskie.pl/x.pdf');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'boleslawa chrobrego|8|2');
  assert.equal(r.area_m2, 72.74);
  assert.equal(r.starting_price_pln, 144000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.round, 3);
  assert.equal(r.auction_date, '2024-05-14');
});

test('parseResultDoc: a LAND wynik doc (real, SOLD) is out of the flats-only scope -> []', () => {
  assert.equal(classifyKind(LAND307_WYNIK_PDF), 'grunt');
  assert.deepEqual(parseResultDoc(LAND307_WYNIK_PDF, '2026-05-07', 'x'), []);
});

test('parseResultDoc: empty/null input returns []', () => {
  assert.deepEqual(parseResultDoc('', null, 'x'), []);
  assert.deepEqual(parseResultDoc(null, null, 'x'), []);
});

test('isNegativeOutcome: krosno "bez rozstrzygnięcia / brak oferentów" is negative; a sold land line is not', () => {
  assert.equal(isNegativeOutcome(CHROB26_WYNIK_PDF), true);
  assert.equal(isNegativeOutcome(LAND307_WYNIK_PDF), false);
});

test('startingPriceFromText: bare board cell, and labelled-but-adjacent only', () => {
  assert.equal(startingPriceFromText('220 000,00 zł'), 220000);
  assert.equal(startingPriceFromText('Cena wywoławcza: 144 000,00 zł'), 144000);
});
