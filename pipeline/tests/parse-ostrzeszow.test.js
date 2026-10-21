// Unit tests for Ostrzeszów adapter (ostrzeszow).
//
// Groundtruthed against real documents from:
// - ostrzeszow.nowoczesnagmina.pl (Burmistrz MiG Ostrzeszów)
// - bip.zgm-ostrzeszow.pl (Zakład Gospodarki Mieszkaniowej Sp. z o.o.)

import { test } from 'node:test';
import assert from 'node:assert/strict';

import ostrzeszowAdapter from '../src/cities/ostrzeszow/index.js';
import {
  stripTags,
  parsePLN,
  parseArea,
  parseDateText,
  roundFromText,
  auctionDateFromText,
  startingPriceFromText,
  achievedPriceFromText,
  isUnsoldText,
  isSoldText,
  isSkippableEntryText,
  isGenuineSaleWykazText,
  isResultLabel,
  streetBuildingFromText,
  flatAptFromText,
  flatAreaFromText,
  parcelFromText,
  obrebFromText,
  miejscowoscFromText,
  plotAreaFromText,
  classifyEntryKind,
  parseInlineTable,
  parseAnnouncementDoc,
  wykazRecordFromEntry,
  parseResultDoc,
} from '../src/cities/ostrzeszow/parse.js';

// ---------------------------------------------------------------------------
// Real fixtures from live BIP documents
// ---------------------------------------------------------------------------

// Burmistrz MiG Ostrzeszów — ul. Poprzeczna 1/4, II przetarg announcement (file 24280 / art 13281)
const POPRZECZNA_II_ANN = `
BURMISTRZ MIASTA I GMINY OSTRZESZÓW
WGN.7145.1.2020.2021
Ostrzeszów, dnia 3 lutego 2021 r.

działając na podstawie art. 38 ust. 1 i 2, art. 39 ust. 1, art. 40 ust. 1 pkt. 1 ustawy z dnia 21 sierpnia 1997 r. o gospodarce nieruchomościami
ogłasza II przetarg ustny nieograniczony na sprzedaż wolnego lokalu mieszkalnego nr 4 położonego w budynku wielorodzinnym w Ostrzeszowie, przy ul. Poprzecznej 1 wraz z udziałem w prawie własności gruntu związanego z tym lokalem

Lokal mieszkalny nr 4 położony w budynku wielorodzinnym przy ulicy Poprzecznej 1 w Ostrzeszowie.
Lokal położony na I piętrze składa się z 3 pokoi, kuchni, łazienki, korytarza. Łączna powierzchnia lokalu wynosi 65,97 m2.
Działka nr: 1810 o powierzchni 0,0331 ha.
Cena nieruchomości [zł]: 170.860,00 (w tym 7.150,00 cena ułamkowej części gruntu jako przedmiotu własności).
Sprzedaż na własność w drodze przetargu ustnego nieograniczonego.

Przetarg odbędzie się w dniu 10 marca 2021 r. o godz. 10:00, w lokalu Urzędu Miasta i Gminy w Ostrzeszowie ul. Zamkowej 31, pokój nr 104, I piętro.
Wadium: 17.000,00 zł.
`;

// Burmistrz MiG Ostrzeszów — ul. Poprzeczna 1/4, II przetarg result (file 24486 / art 13281)
const POPRZECZNA_II_RESULT = `
BURMISTRZ MIASTA I GMINY OSTRZESZÓW
WGN.7145.1.2020.2021
Ostrzeszów, dn. 18 marca 2021r.

INFORMACJĘ o wyniku II przetargu ustnego nieograniczonego na sprzedaż wolnego lokalu mieszkalnego nr 4, zlokalizowanego na I piętrze budynku wielorodzinnego położonego w Ostrzeszowie przy ul. Poprzecznej nr 1. Budynek zlokalizowany na działce ew. nr 1810 o pow. 0,0331 ha, posiadającej urządzoną księgę wieczysta nr KZ10/00002617/4.

1. W dniu 10 marca 2021 r. w siedzibie Urzędu Miasta i Gminy w Ostrzeszowie, przy ul. Zamkowej 31, w pokoju nr 104 został przeprowadzony II przetarg ustny nieograniczony na sprzedaż wolnego lokalu mieszkalnego nr 4, zlokalizowanego na I piętrze budynku wielorodzinnego położonego w Ostrzeszowie przy ul. Poprzecznej nr 1.
2. Liczba osób dopuszczonych do przetargu — 0.
3. Liczba osób niedopuszczonych do przetargu — 0.
4. Cena wywoławcza brutto: 170.860,00 zł.
5. Najwyższa cena osiągnięta w przetargu nie została osiągnięta ze względu na brak oferentów. Przetarg zakończył się wynikiem negatywnym.
`;

// ZGM Ostrzeszów — ul. 21 Stycznia 1a/2, I przetarg announcement (file 183 / art 60)
const STYCZNIA_ANN = `
Zakład Gospodarki Mieszkaniowej Sp. z o.o.
63-500 Ostrzeszów, ul. Sportowa 2A
PREZES ZARZĄDU ZAKŁADU GOSPODARKI MIESZKANIOWEJ SPÓŁKA Z O.O. W OSTRZESZOWIE
ogłasza I przetarg ustny nieograniczony na sprzedaż nieruchomości lokalowej w trybie przetargu ustnego nieograniczonego

sprzedaż nieruchomości lokalowej nr 2 położonej w budynku dwurodzinnym przy ulicy 21 Stycznia 1A w Ostrzeszowie, stanowiącej własność Zakładu Gospodarki Mieszkaniowej Sp. z o.o.
Oznaczenie: Ostrzeszów, ul. 21 Stycznia 1A lokal nr 2.
Powierzchnia użytkowa wynosi 88,10 m2.
Działka nr 2382/3.
Cena wywoławcza nieruchomości [zł]: 385 000,00 zł.
Wadium zostało określone na kwotę: 38 500,00 zł.
Warunkiem przystąpienia do przetargu jest uiszczenie wadium w pieniądzu w wyżej określonej wysokości 38.500,00 zł nie później do dnia 16.06.2026 r. do godz. 24:00.
`;

// ZGM Ostrzeszów — Szklarka Przygodzicka 89, I przetarg announcement (file 180 / art 59)
const SZKLARKA_ANN = `
Zakład Gospodarki Mieszkaniowej Sp. z o.o.
PREZES ZARZĄDU ZAKŁADU GOSPODARKI MIESZKANIOWEJ SPÓŁKA Z O.O. W OSTRZESZOWIE
ogłasza I przetarg ustny nieograniczony na sprzedaż nieruchomości mieszkalnej w trybie przetargu ustnego nieograniczonego
w miejscowości Szklarka Przygodzicka 89, stanowiącej własność Zakładu Gospodarki Mieszkaniowej Sp. z o.o.

Nieruchomość gruntowa zabudowana, składająca się z działki ewidencyjnej nr 410/1, obręb Szklarka Przygodzicka, o powierzchni 1100 m2 położona we wsi Szklarka Przygodzicka 89, gmina Ostrzeszów. Na nieruchomości znajdują się dwa wolnostojące budynki o ostatniej funkcji mieszkaniowej.
Księga wieczysta nr KZ10/00040324/1.
Cena wywoławcza nieruchomości [zł]: 124 400,00 zł.
Wadium: 12 400,00 zł.
Warunkiem przystąpienia do przetargu jest uiszczenie wadium nie później do dnia 16.06.2026 r. do godz. 24:00.
`;

// ZGM Ostrzeszów — Turze dz. 15/13, 15/14 land announcement (file 243 / art 77)
const TURZE_ANN = `
Zakład Gospodarki Mieszkaniowej Sp. z o.o.
ogłasza I przetarg ustny nieograniczony na sprzedaż nieruchomości gruntowych niezabudowanych w trybie przetargu ustnego nieograniczonego

Jednostka ewidencyjna: Gmina Ostrzeszów, Obręb ewidencyjny: Turze, działka nr: 15/13 i 15/14, pow. 0,1879 ha.
Nieruchomość gruntowa niezabudowana, położona w miejscowości Turze, gmina Ostrzeszów.
Cena wywoławcza nieruchomości [zł]: 108 200,00 zł.
Wadium: 10 800,00 zł.
I Przetarg ustny nieograniczony odbędzie się w dniu 25.11.2026 r. o godz. 10:00, w siedzibie Spółki przy ul. Sportowej nr 2a w Ostrzeszowie.
`;

// ZGM Ostrzeszów — ul. Kościuszki 23A result document (file 110 / art 41)
const KOSCIUSZKI_RESULT = `
ZAKŁAD GOSPODARKI MIESZKANIOWEJ SPÓŁKA Z O.O. W OSTRZESZOWIE
Ostrzeszów, dnia 03.06.2025r.

INFORMACJĘ o wyniku II przetargu ustnego nieograniczonego na sprzedaż zabudowanej nieruchomości o pow. 0,0928 ha położonej w Ostrzeszowie przy ul. Kościuszki 23A

1. W dniu 03.06.2025r. w siedzibie Zakładu Gospodarki Mieszkaniowej Spółki z o.o. przy ul. Sportowej nr 2a w Ostrzeszowie został przeprowadzony II przetarg ustny nieograniczony na sprzedaż zabudowanej nieruchomości położonej w obrębie ewidencyjnym Ostrzeszów, działka nr: 2144/100 pow. 0,0928 ha.
2. Liczba osób dopuszczonych: brak.
3. Liczba osób niedopuszczonych: brak.
4. Cena wywoławcza - 621 000,00 zł.
5. Najwyższa cena osiągnięta w przetargu — brak.
6. Przetarg zakończył się wynikiem negatywnym z powodu braku oferentów na przetargu.
`;

// Burmistrz MiG Ostrzeszów — Rojów dz. 996/51 land result document (file 33611 / art 18272)
const ROJOW_RESULT = `
BURMISTRZ MIASTA I GMINY OSTRZESZÓW
WGN.6840.3.2025/26
Ostrzeszów, dn. 21 stycznia 2026 r.

INFORMACJĘ o wyniku II przetargu ustnego nieograniczonego na sprzedaż nieruchomości niezabudowanej, położonej w miejscowości Rojów, gmina Ostrzeszów, oznaczonej jako działka ewidencyjna numer 996/51.
1. Dnia 14.01.2026 r. w siedzibie Urzędu Miasta i Gminy w Ostrzeszowie, przy ul. Zamkowej 31, w pokoju nr 104, I piętro, został przeprowadzony II przetarg ustny nieograniczony na sprzedaż nieruchomości niezabudowanej, położonej w miejscowości Rojów, gmina Ostrzeszów, oznaczonej jako działka ewidencyjna numer 996/51 o pow. 0.1669 ha.
2. Liczba podmiotów dopuszczonych do przetargu – 0.
3. Liczba podmiotów niedopuszczonych do przetargu – 0.
4. Cena wywoławcza brutto: 265.249,50 zł.
5. Najwyższa cena w przetargu nie została osiągnięta ze względu na brak oferentów w niniejszym przetargu. Przetarg zakończył się wynikiem negatywnym.
`;

// Synthetic successful auction result for test coverage
const SOLD_RESULT_MOCK = `
ZAKŁAD GOSPODARKI MIESZKANIOWEJ SPÓŁKA Z O.O. W OSTRZESZOWIE
INFORMACJĘ o wyniku I przetargu ustnego nieograniczonego na sprzedaż nieruchomości lokalowej nr 2 położonej w Ostrzeszowie przy ul. 21 Stycznia 1A.
1. W dniu 18.06.2026 r. został przeprowadzony I przetarg ustny nieograniczony.
4. Cena wywoławcza: 385 000,00 zł.
5. Przetarg zakończył się wynikiem pozytywnym. Nabywcą nieruchomości za cenę 392 500,00 zł został Jan Kowalski.
`;

// HTML table snippet from article 1752 (Niedźwiedź land auction)
const NIEDZWIEDZ_HTML = `
<div>
  <h2>I przetarg ustny nieograniczony w sprawie sprzedaży nieruchomości gruntowej we wsi Niedźwiedź</h2>
  <TABLE class=MsoNormalTable border=1>
    <TR>
      <TD>Położenie</TD>
      <TD>Numer działki</TD>
      <TD>Powierzchnia - m 2 -</TD>
      <TD>Numer Kw.</TD>
      <TD>Cena wywoławcza - zł -</TD>
    </TR>
    <TR>
      <TD>Niedźwiedź gm. Ostrzeszów</TD>
      <TD>217/7</TD>
      <TD>1503</TD>
      <TD>41111</TD>
      <TD>14.669,28,-</TD>
    </TR>
  </TABLE>
  <p>I-przetarg ustny odbędzie się w dniu 19 lipca 2005 r. od godziny 10:00</p>
</div>
`;

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

test('stripTags cleans HTML and entities', () => {
  assert.equal(stripTags('<p>Lokal &amp; mieszkanie&nbsp;nr 4</p>'), 'Lokal & mieszkanie nr 4');
  assert.equal(stripTags('Cena: 150&#160;000 z&#322;'), 'Cena: 150 000 zł');
});

test('parsePLN extracts integers from various PLN formats', () => {
  assert.equal(parsePLN('170.860,00 zł'), 170860);
  assert.equal(parsePLN('385 000,00 zł'), 385000);
  assert.equal(parsePLN('265.249,50 zł'), 265249);
  assert.equal(parsePLN('14.669,28,-'), 14669);
  assert.equal(parsePLN('621 000 zł'), 621000);
  assert.equal(parsePLN('brak'), null);
});

test('parseArea parses float areas', () => {
  assert.equal(parseArea('65,97'), 65.97);
  assert.equal(parseArea('88.10'), 88.1);
  assert.equal(parseArea('1100'), 1100);
  assert.equal(parseArea('0'), null);
});

test('parseDateText handles both text and dotted dates', () => {
  assert.equal(parseDateText('10 marca 2021 r.'), '2021-03-10');
  assert.equal(parseDateText('03.06.2025r.'), '2025-06-03');
  assert.equal(parseDateText('14.01.2026 r.'), '2026-01-14');
  assert.equal(parseDateText('25.11.2026'), '2026-11-25');
  assert.equal(parseDateText('16.06.2026 r.'), '2026-06-16');
  assert.equal(parseDateText('nieznana data'), null);
});

test('roundFromText detects rounds', () => {
  assert.equal(roundFromText('ogłasza I przetarg ustny'), 'I');
  assert.equal(roundFromText('II przetarg nieruchomości'), 'II');
  assert.equal(roundFromText('ogłasza III przetarg'), 'III');
  assert.equal(roundFromText('informacja o wyniku IV przetargu'), 'IV');
  assert.equal(roundFromText('pierwszy przetarg ustny'), 'I');
  assert.equal(roundFromText('drugi przetarg ustny'), 'II');
});

test('auctionDateFromText finds auction or wadium date', () => {
  assert.equal(auctionDateFromText(POPRZECZNA_II_ANN), '2021-03-10');
  assert.equal(auctionDateFromText(POPRZECZNA_II_RESULT), '2021-03-10');
  assert.equal(auctionDateFromText(STYCZNIA_ANN), '2026-06-16');
  assert.equal(auctionDateFromText(SZKLARKA_ANN), '2026-06-16');
  assert.equal(auctionDateFromText(TURZE_ANN), '2026-11-25');
  assert.equal(auctionDateFromText(KOSCIUSZKI_RESULT), '2025-06-03');
  assert.equal(auctionDateFromText(ROJOW_RESULT), '2026-01-14');
});

test('startingPriceFromText extracts starting price', () => {
  assert.equal(startingPriceFromText(POPRZECZNA_II_ANN), 170860);
  assert.equal(startingPriceFromText(POPRZECZNA_II_RESULT), 170860);
  assert.equal(startingPriceFromText(STYCZNIA_ANN), 385000);
  assert.equal(startingPriceFromText(SZKLARKA_ANN), 124400);
  assert.equal(startingPriceFromText(TURZE_ANN), 108200);
  assert.equal(startingPriceFromText(KOSCIUSZKI_RESULT), 621000);
  assert.equal(startingPriceFromText(ROJOW_RESULT), 265249);
});

test('achievedPriceFromText extracts hammer price when sold', () => {
  assert.equal(achievedPriceFromText(POPRZECZNA_II_RESULT), null);
  assert.equal(achievedPriceFromText(KOSCIUSZKI_RESULT), null);
  assert.equal(achievedPriceFromText(ROJOW_RESULT), null);
  assert.equal(achievedPriceFromText(SOLD_RESULT_MOCK), 392500);
});

test('isUnsoldText and isSoldText outcomes', () => {
  assert.equal(isUnsoldText(POPRZECZNA_II_RESULT), true);
  assert.equal(isSoldText(POPRZECZNA_II_RESULT), false);

  assert.equal(isUnsoldText(KOSCIUSZKI_RESULT), true);
  assert.equal(isSoldText(KOSCIUSZKI_RESULT), false);

  assert.equal(isUnsoldText(ROJOW_RESULT), true);
  assert.equal(isSoldText(ROJOW_RESULT), false);

  assert.equal(isUnsoldText(SOLD_RESULT_MOCK), false);
  assert.equal(isSoldText(SOLD_RESULT_MOCK), true);
});

test('isSkippableEntryText correctly identifies noise to drop', () => {
  assert.equal(isSkippableEntryText('I przetarg ustny na dzierżawę nieruchomości gruntowej'), true);
  assert.equal(isSkippableEntryText('Wykaz nieruchomości przeznaczonej do najmu'), true);
  assert.equal(isSkippableEntryText('Zaproszenie do złożenia oferty na wymianę pokrycia dachowego budynku'), true);
  assert.equal(isSkippableEntryText('Modernizacja dachu budynku mieszkalnego przy ul. Pogodnej 8'), true);
  assert.equal(isSkippableEntryText('Pełnienie funkcji inspektora nadzoru'), true);
  assert.equal(isSkippableEntryText('Obsługa kotłowni gazowej na sezon grzewczy'), true);
  assert.equal(isSkippableEntryText('Wykaz lokalu w trybie bezprzetargowym na rzecz najemcy'), true);
  assert.equal(isSkippableEntryText('Sprostowanie do zaproszenia do złożenia oferty'), true);

  // Legitimate sales must not be skipped
  assert.equal(isSkippableEntryText('ogłasza II przetarg ustny nieograniczony na sprzedaż wolnego lokalu mieszkalnego'), false);
  assert.equal(isSkippableEntryText('ogłasza I przetarg ustny nieograniczony na sprzedaż nieruchomości lokalowej 21 Stycznia 1a'), false);
  assert.equal(isSkippableEntryText('ogłasza I przetarg ustny nieograniczony na sprzedaż nieruchomości gruntowych niezabudowanych'), false);
});

test('isGenuineSaleWykazText identifies sale wykazy', () => {
  assert.equal(
    isGenuineSaleWykazText('Wykaz nieruchomości lokalowej wraz z udziałem w prawie własności gruntu przeznaczonej do sprzedaży ul. Kolejowa 29/3'),
    true
  );
  assert.equal(
    isGenuineSaleWykazText('Wykaz nieruchomości gruntowej, niezabudowanej przeznaczonej do sprzedaży w trybie przetargu'),
    true
  );
  assert.equal(
    isGenuineSaleWykazText('Wykaz lokalu przeznaczonego do użyczenia'),
    false
  );
  assert.equal(
    isGenuineSaleWykazText('Wykaz lokalu w trybie bezprzetargowym na rzecz najemcy'),
    false
  );
});

test('streetBuildingFromText extracts valid addresses and excludes municipal office', () => {
  const p = streetBuildingFromText('w Ostrzeszowie przy ul. Poprzecznej 1 wraz z udziałem');
  assert.deepEqual(p, { street: 'Poprzecznej', building: '1' });

  const s = streetBuildingFromText('w budynku przy ulicy 21 Stycznia 1A w Ostrzeszowie');
  assert.deepEqual(s, { street: '21 Stycznia', building: '1A' });

  const k = streetBuildingFromText('położonej w Ostrzeszowie przy ul. Kościuszki 23A');
  assert.deepEqual(k, { street: 'Kościuszki', building: '23A' });

  const v = streetBuildingFromText('w miejscowości Szklarka Przygodzicka 89, stanowiącej');
  assert.deepEqual(v, { street: 'Szklarka Przygodzicka', building: '89' });

  // Exclude office addresses
  const office1 = streetBuildingFromText('w siedzibie Urzędu przy ul. Zamkowej 31 w Ostrzeszowie');
  assert.equal(office1, null);

  const office2 = streetBuildingFromText('w siedzibie Spółki przy ul. Sportowej 2a w Ostrzeszowie');
  assert.equal(office2, null);
});

test('flatAptFromText extracts apartment numbers', () => {
  assert.equal(flatAptFromText('wolnego lokalu mieszkalnego nr 4 położonego'), '4');
  assert.equal(flatAptFromText('nieruchomości lokalowej nr 2 położonej'), '2');
  assert.equal(flatAptFromText('ul. Kolejowa 29/3'), '3');
  assert.equal(flatAptFromText('Szklarka Przygodzicka 89'), null);
});

test('flatAreaFromText extracts apartment area in m2', () => {
  assert.equal(flatAreaFromText(POPRZECZNA_II_ANN), 65.97);
  assert.equal(flatAreaFromText(STYCZNIA_ANN), 88.1);
});

test('classifyEntryKind detects correct categories', () => {
  assert.equal(classifyEntryKind('sprzedaż wolnego lokalu mieszkalnego nr 4'), 'mieszkalny');
  assert.equal(classifyEntryKind('sprzedaż nieruchomości lokalowej 21 Stycznia 1a'), 'mieszkalny');
  assert.equal(classifyEntryKind('sprzedaż nieruchomości gruntowych niezabudowanych Turze'), 'grunt');
  assert.equal(classifyEntryKind('sprzedaż zabudowanej nieruchomości o pow. 0,0928 ha'), 'zabudowana');
});

// ---------------------------------------------------------------------------
// Announcement document parsing tests (crawlActive)
// ---------------------------------------------------------------------------

test('parseAnnouncementDoc handles Poprzeczna 1/4 flat auction', () => {
  const rec = parseAnnouncementDoc(POPRZECZNA_II_ANN, 'https://ostrzeszow.nowoczesnagmina.pl/?a=13281', false);
  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address_raw, 'Poprzecznej 1/4');
  assert.equal(rec.address.street, 'Poprzecznej');
  assert.equal(rec.address.street_norm, 'poprzecznej');
  assert.equal(rec.address.building, '1');
  assert.equal(rec.address.apt, '4');
  assert.equal(rec.area_m2, 65.97);
  assert.equal(rec.starting_price_pln, 170860);
  assert.equal(rec.round, 'II');
  assert.equal(rec.auction_date, '2021-03-10');
});

test('parseAnnouncementDoc handles 21 Stycznia 1a/2 flat auction', () => {
  const rec = parseAnnouncementDoc(STYCZNIA_ANN, 'https://bip.zgm-ostrzeszow.pl/art,60', false);
  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address_raw, '21 Stycznia 1A/2');
  assert.equal(rec.address.street, '21 Stycznia');
  assert.equal(rec.address.building, '1A');
  assert.equal(rec.address.apt, '2');
  assert.equal(rec.area_m2, 88.1);
  assert.equal(rec.starting_price_pln, 385000);
  assert.equal(rec.round, 'I');
  assert.equal(rec.auction_date, '2026-06-16');
});

test('parseAnnouncementDoc handles Szklarka Przygodzicka 89 house auction', () => {
  const rec = parseAnnouncementDoc(SZKLARKA_ANN, 'https://bip.zgm-ostrzeszow.pl/art,59', false);
  assert.ok(rec);
  assert.equal(rec.kind, 'zabudowana');
  assert.equal(rec.address_raw, 'Szklarka Przygodzicka 89');
  assert.equal(rec.address.street, 'Szklarka Przygodzicka');
  assert.equal(rec.address.building, '89');
  assert.equal(rec.starting_price_pln, 124400);
  assert.equal(rec.round, 'I');
  assert.equal(rec.auction_date, '2026-06-16');
});

test('parseAnnouncementDoc handles Turze land auction', () => {
  const rec = parseAnnouncementDoc(TURZE_ANN, 'https://bip.zgm-ostrzeszow.pl/art,77', true);
  assert.ok(rec);
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.dzialka_nr, '15/13');
  assert.equal(rec.obreb, 'Turze');
  assert.equal(rec.area_m2, 1879);
  assert.equal(rec.starting_price_pln, 108200);
  assert.equal(rec.round, 'I');
  assert.equal(rec.auction_date, '2026-11-25');
});

test('parseInlineTable parses Niedźwiedź land table from HTML', () => {
  const rows = parseInlineTable(NIEDZWIEDZ_HTML, 'https://ostrzeszow.nowoczesnagmina.pl/?a=1752', 'I przetarg w Niedźwiedziu');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].kind, 'grunt');
  assert.equal(rows[0].dzialka_nr, '217/7');
  assert.equal(rows[0].area_m2, 1503);
  assert.equal(rows[0].starting_price_pln, 14669);
  assert.equal(rows[0].round, 'I');
  assert.equal(rows[0].auction_date, '2005-07-19');
});

test('wykazRecordFromEntry extracts wykaz entries correctly', () => {
  const rec1 = wykazRecordFromEntry(
    'Wykaz nieruchomości lokalowej wraz z udziałem w prawie własności gruntu przeznaczonej do sprzedaży ul. Kolejowa 29/3',
    'https://bip.zgm-ostrzeszow.pl/art,33'
  );
  assert.ok(rec1);
  assert.equal(rec1.kind, 'mieszkalny');
  assert.equal(rec1.address.street, 'Kolejowa');
  assert.equal(rec1.address.building, '29');
  assert.equal(rec1.address.apt, '3');

  const rec2 = wykazRecordFromEntry(
    'Wykaz nieruchomości gruntowej, niezabudowanej przeznaczonej do sprzedaży Turze',
    'https://bip.zgm-ostrzeszow.pl/art,69'
  );
  assert.ok(rec2);
  assert.equal(rec2.kind, 'grunt');
});

// ---------------------------------------------------------------------------
// Result document parsing tests (parseResultDoc)
// ---------------------------------------------------------------------------

test('parseResultDoc handles Poprzeczna 1/4 flat result (unsold)', () => {
  const results = parseResultDoc(POPRZECZNA_II_RESULT, null, 'https://ostrzeszow.nowoczesnagmina.pl/?p=document&id=24486');
  assert.equal(results.length, 1);
  const r = results[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.street, 'Poprzecznej');
  assert.equal(r.address.street_norm, 'poprzecznej');
  assert.equal(r.address.building, '1');
  assert.equal(r.address.apt, '4');
  assert.equal(r.starting_price_pln, 170860);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'wynik negatywny');
  assert.equal(r.round, 'II');
  assert.equal(r.auction_date, '2021-03-10');
});

test('parseResultDoc handles Kościuszki 23A property result (unsold)', () => {
  const results = parseResultDoc(KOSCIUSZKI_RESULT, null, 'https://bip.zgm-ostrzeszow.pl/index.php?c=getfile&id=110');
  assert.equal(results.length, 1);
  const r = results[0];
  assert.equal(r.kind, 'zabudowana');
  assert.equal(r.address.street, 'Kościuszki');
  assert.equal(r.address.building, '23A');
  assert.equal(r.starting_price_pln, 621000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'wynik negatywny');
  assert.equal(r.round, 'II');
  assert.equal(r.auction_date, '2025-06-03');
});

test('parseResultDoc handles Rojów dz. 996/51 land result (unsold)', () => {
  const results = parseResultDoc(ROJOW_RESULT, null, 'https://ostrzeszow.nowoczesnagmina.pl/?p=document&id=33611');
  assert.equal(results.length, 1);
  const r = results[0];
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '996/51');
  assert.equal(r.obreb, 'Rojów');
  assert.equal(r.starting_price_pln, 265249);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'wynik negatywny');
  assert.equal(r.round, 'II');
  assert.equal(r.auction_date, '2026-01-14');
});

test('parseResultDoc handles successful auction (sold)', () => {
  const results = parseResultDoc(SOLD_RESULT_MOCK, null, 'https://bip.zgm-ostrzeszow.pl/result-sold');
  assert.equal(results.length, 1);
  const r = results[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.street, '21 Stycznia');
  assert.equal(r.address.building, '1A');
  assert.equal(r.address.apt, '2');
  assert.equal(r.starting_price_pln, 385000);
  assert.equal(r.final_price_pln, 392500);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.unsold_reason, null);
  assert.equal(r.round, 'I');
  assert.equal(r.auction_date, '2026-06-18');
});

// ---------------------------------------------------------------------------
// Adapter contract export tests
// ---------------------------------------------------------------------------

test('adapter exports all required registry properties', () => {
  assert.equal(ostrzeszowAdapter.id, 'ostrzeszow');
  assert.equal(ostrzeszowAdapter.label, 'Ostrzeszów');
  assert.equal(ostrzeszowAdapter.voivodeship, 'wielkopolskie');
  assert.equal(ostrzeszowAdapter.authority, 'Burmistrz Miasta i Gminy Ostrzeszów');
  assert.equal(ostrzeszowAdapter.teryt, '301807_4');
  assert.equal(ostrzeszowAdapter.host, 'ostrzeszow.nowoczesnagmina.pl');
  assert.equal(ostrzeszowAdapter.source, 'html');
  assert.equal(typeof ostrzeszowAdapter.crawlActive, 'function');
  assert.equal(typeof ostrzeszowAdapter.crawlResultDocs, 'function');
  assert.equal(typeof ostrzeszowAdapter.parseResultDoc, 'function');
});
