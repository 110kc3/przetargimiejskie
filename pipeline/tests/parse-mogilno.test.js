// Mogilno unit tests: parser + crawl helper tests.
//
// Groundtruthed against real fixtures from bip.mogilno.pl (2026-10-21):
//   1. ACTIVE RESIDENTIAL ANNOUNCEMENT (Wyrobki 7):
//      URL: /kategorie/98-zbycie-nieruchomosci/artykuly/314-...
//      Attachment 538: Wyrobki nr 7, dz. 19/13, lokal: 39,41 m², cena: 44.000,00 zł, przetarg: 26.06.2023.
//   2. SPIKE REFERENCE ANNOUNCEMENT (Wasielewko 18/3):
//      Wasielewko nr 18 lok. 3, lokal: 48,20 m², cena: 65 000 zł, II przetarg: 15.09.2023.
//   3. SOLD RESULT NOTICE (attachment 7294):
//      Przetarg 17.09.2026 r., dz. 416/3, obręb Mogilno, cena wywoławcza 16 000,00 zł, nabywcy: Edyta i Paweł Woźniak.
//   4. UNSOLD RESULT NOTICE (attachment 6910):
//      Przetarg 25.06.2026 r., dz. 179/1 pow. 0,1383 ha, obręb Chabsko, cena 120 000,00 zł, nikt się nie stawił.
//   5. RESIDENTIAL RESULT NOTICE (synthetic following Mogilno result format):
//      Przetarg 26.06.2023 r., Wyrobki nr 7, pow. 39,41 m², cena wywoławcza 44 000 zł, cena osiągnięta 51 000 zł, nabywca Jan Kowalski.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { config } from '../src/cities/mogilno/config.js';
import {
  parsePLN,
  parseArea,
  cleanAddressString,
  addressFromText,
  auctionDateFromText,
  roundFromText,
  startingPriceFromText,
  finalPriceFromText,
  areaFromText,
  parcelFromText,
  obrebFromText,
  outcomeFromText,
  parseResultDoc,
  parseListPage,
  parseDetailPage,
} from '../src/cities/mogilno/parse.js';

// ── Config tests ─────────────────────────────────────────────────────────────

test('mogilno config contract', () => {
  assert.equal(config.id, 'mogilno');
  assert.equal(config.label, 'Mogilno');
  assert.equal(config.voivodeship, 'kujawsko-pomorskie');
  assert.equal(config.teryt, '0409034');
  assert.equal(config.authority, 'Burmistrz Mogilna (Gmina Mogilno)');
  assert.equal(config.host, 'bip.mogilno.pl');
  assert.equal(config.source, 'html');
});

// ── Numeric & String helpers ──────────────────────────────────────────────────

test('parsePLN handles formatted currency strings', () => {
  assert.equal(parsePLN('16 000,00'), 16000);
  assert.equal(parsePLN('120 000,00 zł'), 120000);
  assert.equal(parsePLN('44.000,00'), 44000);
  assert.equal(parsePLN('65 000 zł'), 65000);
  assert.equal(parsePLN('0'), null);
  assert.equal(parsePLN('brak'), null);
  assert.equal(parsePLN(null), null);
});

test('parseArea handles meters and decimals', () => {
  assert.equal(parseArea('39,41'), 39.41);
  assert.equal(parseArea('48.20 m2'), 48.2);
  assert.equal(parseArea('100'), 100);
  assert.equal(parseArea('0'), null);
  assert.equal(parseArea(null), null);
});

test('cleanAddressString normalizes village and street prefixes', () => {
  assert.equal(cleanAddressString('w miejscowości Wyrobki nr 7'), 'Wyrobki 7');
  assert.equal(cleanAddressString('Wasielewko nr 18 lok. 3'), 'Wasielewko 18/3');
  assert.equal(cleanAddressString('Mogilno, ul. Benedyktyńska 21'), 'ul. Benedyktyńska 21');
  assert.equal(cleanAddressString('w Mogilnie przy ul. Kościuszki 5/2'), 'ul. Kościuszki 5/2');
  assert.equal(cleanAddressString(null), null);
});

test('addressFromText parses village and urban addresses', () => {
  const addr1 = addressFromText(
    'położonej w miejscowości Wyrobki nr 7, powiat mogileński',
    'Ogłoszenie o przetargu na sprzedaż w Wyrobkach',
  );
  assert.ok(addr1);
  assert.equal(addr1.street, 'Wyrobki');
  assert.equal(addr1.building, '7');
  assert.equal(addr1.apt, null);

  const addr2 = addressFromText(
    'położony w miejscowości Wasielewko nr 18 lok. 3',
    'Sprzedaż lokalu Wasielewko',
  );
  assert.ok(addr2);
  assert.equal(addr2.street, 'Wasielewko');
  assert.equal(addr2.building, '18');
  assert.equal(addr2.apt, '3');

  const addr3 = addressFromText(
    'Położenie nieruchomości: Mogilno, ul. Benedyktyńska 21',
  );
  assert.ok(addr3);
  assert.equal(addr3.building, '21');

  assert.equal(addressFromText('brak adresu'), null);
});

// ── Dates, Round, Area, Prices ───────────────────────────────────────────────

test('auctionDateFromText parses spelled-out Polish months and dotted dates', () => {
  assert.equal(
    auctionDateFromText('Przetarg odbył się w dniu 17 września 2026 r. w siedzibie Urzędu'),
    '2026-09-17',
  );
  assert.equal(
    auctionDateFromText('Przetarg odbył się w dniu 25 czerwca 2026 r. o godz. 10.00'),
    '2026-06-25',
  );
  assert.equal(
    auctionDateFromText('Przetarg odbędzie się w pokoju nr 104, w dniu 26.06.2023 r. o godz. 11:00'),
    '2023-06-26',
  );
  assert.equal(
    auctionDateFromText('Przetarg odbędzie się dnia 15.09.2023 r. o godz. 10.00'),
    '2023-09-15',
  );
  assert.equal(auctionDateFromText('Dokument z dnia 14 września 2004 r.'), null);
  assert.equal(auctionDateFromText(''), null);
});

test('roundFromText detects Roman numerals and Polish words', () => {
  assert.equal(roundFromText('ogłasza II przetarg ustny nieograniczony'), 2);
  assert.equal(roundFromText('Ogłoszenie o III przetargu - Chabsko'), 3);
  assert.equal(roundFromText('Pierwszy przetarg ustny nieograniczony'), 1);
  assert.equal(roundFromText('Drugi przetarg ustny'), 2);
  assert.equal(roundFromText('przetarg ustny nieograniczony'), 1);
});

test('startingPriceFromText extracts base auction prices', () => {
  assert.equal(
    startingPriceFromText('Cena wywoławcza nieruchomości: 16 000,00 + należny podatek VAT'),
    16000,
  );
  assert.equal(
    startingPriceFromText('Cena wywoławcza nieruchomości: 120 000,00 zł'),
    120000,
  );
  assert.equal(
    startingPriceFromText('1. Wyrobki Wyrobki nr 7 440,00 44.000,00 HAR - Dla lokalu'),
    44000,
  );
  assert.equal(startingPriceFromText('tekst bez ceny'), null);
});

test('finalPriceFromText extracts achieved prices and returns null for unsold', () => {
  assert.equal(
    finalPriceFromText('Cena osiągnięta w przetargu: 51 000,00 zł'),
    51000,
  );
  assert.equal(
    finalPriceFromText('Najwyższa cena osiągnięta w przetargu to 450,00 zł'),
    450,
  );
  assert.equal(
    finalPriceFromText('przetarg został uznany za nierozstrzygnięty. Cena osiągnięta: ---'),
    null,
  );
  assert.equal(
    finalPriceFromText('przetarg zakończył się wynikiem negatywnym'),
    null,
  );
});

test('areaFromText extracts flat area and converts ha to m2 for land', () => {
  assert.equal(areaFromText('lokal: 39,41 m2'), 39.41);
  assert.equal(areaFromText('Powierzchnia użytkowa lokalu wynosi 39,41 m'), 39.41);
  assert.equal(areaFromText('powierzchnia użytkowa lokalu: 48,20 m2'), 48.2);
  assert.equal(areaFromText('działka nr 179/1 o pow. 0,1383 ha, obręb Chabsko'), 1383);
  assert.equal(areaFromText('tekst bez powierzchni'), null);
});

test('parcelFromText and obrebFromText extract cadastral details', () => {
  assert.equal(parcelFromText('działka nr 416/3, obręb Mogilno'), '416/3');
  assert.equal(parcelFromText('oznaczona jako dz. nr 179/1 o pow.'), '179/1');
  assert.equal(obrebFromText('działka nr 416/3, obręb Mogilno'), 'Mogilno');
  assert.equal(obrebFromText('działka nr 179/1 o pow. 0,1383 ha, obręb Chabsko'), 'Chabsko');
});

test('outcomeFromText identifies sold vs unsold correctly', () => {
  assert.deepEqual(
    outcomeFromText('Na przetargu nikt się nie stawił. Przetarg został uznany za nierozstrzygnięty.'),
    { outcome: 'unsold', unsold_reason: 'no_buyer' },
  );
  assert.deepEqual(
    outcomeFromText('W wyznaczonym terminie nie wpłynęło wadium, wynik negatywny.'),
    { outcome: 'unsold', unsold_reason: 'no_buyer' },
  );
  assert.deepEqual(
    outcomeFromText('Nieruchomość nabyli: Edyta i Paweł Woźniak.'),
    { outcome: 'sold', unsold_reason: null },
  );
  assert.deepEqual(
    outcomeFromText('Nabywca nieruchomości: Jan Kowalski.'),
    { outcome: 'sold', unsold_reason: null },
  );
});

// ── HTML page parsing ────────────────────────────────────────────────────────

const SAMPLE_LIST_HTML = `
<div id="category">
  <ul class="flex flex-col">
    <li class="items-start pl-[20px] mt-[20px] flex bg-transparent">
      <div class="inline-flex">
        <a target="_self" class="text-primary underline" title="Ogłoszenie o II przetargu - Przemysłowa." href="/kategorie/98-zbycie-nieruchomosci/artykuly/4553-ogloszenie-o-ii-przetargu-przemyslowa?lang=PL">Ogłoszenie o II przetargu - Przemysłowa.</a>
      </div>
      <div class="font-medium leading-[16px] normal-case">(Opublikowano: 2026-10-19)</div>
    </li>
    <li class="items-start pl-[20px] mt-[20px] flex bg-transparent">
      <div class="inline-flex">
        <a target="_self" class="text-primary underline" title="Ogłoszenie Burmistrza Mogilna o przetargu ustnym nieograniczonym na sprzedaż nieruchomości gruntowej zabudowanej lokalem mieszkalnym, stanowiącej własność Gminy Mogilno położonej w miejscowości Wyrobki nr 7, powiat mogileński, woj. kujawsko-pomorskie." href="/kategorie/98-zbycie-nieruchomosci/artykuly/314-ogloszenie-wyrobki?lang=PL">Ogłoszenie Wyrobki nr 7</a>
      </div>
      <div class="font-medium leading-[16px] normal-case">(Opublikowano: 2023-05-18)</div>
    </li>
    <li class="nav-item">
      <a href="/kategorie/16-platforma-zakupowa/artykuly/172-platforma?lang=PL" title="Platforma Zakupowa">Platforma</a>
    </li>
  </ul>
</div>
`;

test('parseListPage extracts articles and applies category filter', () => {
  const allEntries = parseListPage(SAMPLE_LIST_HTML);
  assert.equal(allEntries.length, 3);

  const filtered = parseListPage(SAMPLE_LIST_HTML, '98');
  assert.equal(filtered.length, 2);
  assert.equal(filtered[0].id, '4553');
  assert.equal(filtered[0].published_date, '2026-10-19');
  assert.equal(filtered[1].id, '314');
  assert.equal(filtered[1].published_date, '2023-05-18');
});

test('parseListPage handles empty or invalid HTML safely', () => {
  assert.deepEqual(parseListPage(''), []);
  assert.deepEqual(parseListPage('<div>brak wpisów</div>'), []);
});

const SAMPLE_DETAIL_HTML = `
<div id="article-content-print">
  <div class="border-b border-b-backgroundInv">
    <h3 class="text-primary text-lg mb-[10px] leading-[18px] tracking-[1px] font-medium">Ogłoszenie Burmistrza Mogilna o przetargu ustnym nieograniczonym na sprzedaż nieruchomości gruntowej zabudowanej lokalem mieszkalnym, stanowiącej własność Gminy Mogilno położonej w miejscowości Wyrobki nr 7, powiat mogileński, woj. kujawsko-pomorskie.</h3>
    <div class="text-accent50 text-xs mr-[20px] mb-[20px] leading-[12px] tracking-[0.25px] inline-block">2023-05-18 08:03</div>
  </div>
  <div class="mt-[30px]">
    <ul>
      <li>
        <a href="https://bip-api.mogilno.pl/api/attachments/538" title="Ogłoszenie Burmistrza Mogilna o przetargu ustnym nieograniczonym na sprzedaż nieruchomości.pdf">Ogłoszenie.pdf</a>
      </li>
    </ul>
  </div>
</div>
`;

test('parseDetailPage extracts title, publishedDate, and attachment URLs', () => {
  const detail = parseDetailPage(SAMPLE_DETAIL_HTML, 'https://bip.mogilno.pl/kategorie/98/artykuly/314');
  assert.ok(detail.title.includes('Wyrobki nr 7'));
  assert.equal(detail.publishedDate, '2023-05-18');
  assert.equal(detail.attachments.length, 1);
  assert.equal(detail.attachments[0].url, 'https://bip-api.mogilno.pl/api/attachments/538');
  assert.equal(detail.attachments[0].name, 'Ogłoszenie Burmistrza Mogilna o przetargu ustnym nieograniczonym na sprzedaż nieruchomości.pdf');
});

// ── parseResultDoc end-to-end tests with real fixtures ────────────────────────

const FIXTURE_7294_SOLD_LAND = `
INFORMACJA O WYNIKU PRZETARGU

Na podstawie art. 38 ust. 2 ustawy z dnia 21 sierpnia 1997 r. o gospodarce nieruchomościami
(t.j. Dz.U. z 2026 r. poz. 399) oraz § 12 rozporządzenia Rady Ministrów z dnia 14 września
2004 r. w sprawie sposobu i trybu przeprowadzania przetargów na zbycie nieruchomości
(Dz.U. z 2021 r. poz. 2213) podaje się do publicznej wiadomości informację o wyniku
przetargu:

1. Data i miejsce przetargu:
Przetarg odbył się w dniu 17 września 2026 r. w siedzibie Urzędu Miejskiego w Mogilnie,
ul. Narutowicza 1, 88-300 Mogilno.

2. Rodzaj przetargu:
Pierwszy przetarg ustny nieograniczony na sprzedaż nieruchomości zgodnie z ustawą z dnia 21
sierpnia 1997r. o gospodarce nieruchomościami (Dz. U. z 2026, poz. 399 t.j.)

3. Oznaczenie nieruchomości:
* położenie: Mogilno,
* oznaczenie w ewidencji gruntów: działka nr 416/3, obręb Mogilno,
* księga wieczysta: KW BY1M/00028652/5, prowadzona przez Sąd Rejonowy w Mogilnie, IV Wydział Ksiąg Wieczystych,
* Działka znajduje się na terenie, na którym nie ma opracowanego miejscowego planu
zagospodarowania przestrzennego. Teren handlowo-usługowy.

4. Cena wywoławcza nieruchomości: 16 000,00 + należny podatek VAT
5. Wadium: 1 600,00 zł
6. Liczba osób dopuszczonych do przetargu: 1 małżeństwo

7. Wynik przetargu:
Zgodnie z § 12 ust. 1 rozporządzenia Rady Ministrów z 14.09.2004 r. przetarg został uznany
za rozstrzygnięty.
Wadium w wyznaczonym terminie wpłynęło.
Nieruchomość nabyli: Edyta i Paweł Woźniak.

8. Informację sporządzono w dniu 24.09.2026 r. i zostaje wywieszona na 7 dni.
`;

test('parseResultDoc: parses sold land fixture (7294)', () => {
  const records = parseResultDoc(
    FIXTURE_7294_SOLD_LAND,
    '2026-09-24',
    'https://bip-api.mogilno.pl/api/attachments/7294',
  );
  assert.equal(records.length, 1);
  const r = records[0];
  assert.equal(r.kind, 'grunt');
  assert.equal(r.outcome, 'sold');
  assert.equal(r.unsold_reason, null);
  assert.equal(r.auction_date, '2026-09-17');
  assert.equal(r.starting_price_pln, 16000);
  assert.equal(r.final_price_pln, 16000);
  assert.equal(r.dzialka_nr, '416/3');
  assert.equal(r.obreb, 'Mogilno');
  assert.equal(r.round, 1);
  assert.equal(r.source_pdf, 'https://bip-api.mogilno.pl/api/attachments/7294');
});

const FIXTURE_6910_UNSOLD_LAND = `
INFORMACJA O WYNIKU PRZETARGU

Na podstawie art. 38 ust. 2 ustawy z dnia 21 sierpnia 1997 r. o gospodarce nieruchomościami
(t.j. Dz.U. z 2026 r. poz. 399) oraz § 12 rozporządzenia Rady Ministrów z dnia 14 września
2004 r. w sprawie sposobu i trybu przeprowadzania przetargów na zbycie nieruchomości
(Dz.U. z 2021 r. poz. 2213) podaje się do publicznej wiadomości informację o wyniku
przetargu:

1. Data i miejsce przetargu:
Przetarg odbył się w dniu 25 czerwca 2026 r. w siedzibie Urzędu Miejskiego w Mogilnie,
ul. Narutowicza 1, 88-300 Mogilno.

2. Rodzaj przetargu:
Pierwszy przetarg ustny nieograniczony na sprzedaż nieruchomości.

3. Oznaczenie nieruchomości:
* położenie: Chabsko,
* oznaczenie w ewidencji gruntów: działka nr 179/1 o pow. 0,1383 ha, obręb Chabsko,
* księga wieczysta: KW BY1M/00028764/3, prowadzona przez Sąd Rejonowy w Mogilnie, IV Wydział Ksiąg Wieczystych,
* nieruchomość objęta miejscowym planem zagospodarowania przestrzennego.

4. Cena wywoławcza nieruchomości: 120 000,00 + należny podatek VAT
5. Wadium: 12 000,00 zł
6. Liczba osób dopuszczonych do przetargu: 0

7. Wynik przetargu:
Na przetargu nikt się nie stawił.
Zgodnie z § 12 ust. 1 rozporządzenia Rady Ministrów z 14.09.2004 r. przetarg został uznany
za nierozstrzygnięty.

8. Informację sporządzono w dniu 2.07.2026 r. i zostaje wywieszona na 7 dni.
`;

test('parseResultDoc: parses unsold land fixture (6910)', () => {
  const records = parseResultDoc(
    FIXTURE_6910_UNSOLD_LAND,
    '2026-07-02',
    'https://bip-api.mogilno.pl/api/attachments/6910',
  );
  assert.equal(records.length, 1);
  const r = records[0];
  assert.equal(r.kind, 'grunt');
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'no_buyer');
  assert.equal(r.auction_date, '2026-06-25');
  assert.equal(r.starting_price_pln, 120000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.area_m2, 1383);
  assert.equal(r.dzialka_nr, '179/1');
  assert.equal(r.obreb, 'Chabsko');
  assert.equal(r.round, 1);
});

const FIXTURE_RESIDENTIAL_SOLD = `
INFORMACJA O WYNIKU PRZETARGU

1. Data i miejsce przetargu:
Przetarg odbył się w dniu 26 czerwca 2023 r. w siedzibie Urzędu Miejskiego w Mogilnie.

2. Rodzaj przetargu:
Pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego.

3. Oznaczenie nieruchomości:
* położenie: w miejscowości Wyrobki nr 7,
* powierzchnia użytkowa lokalu: 39,41 m2,
* dla lokalu nie została założona księga wieczysta.

4. Cena wywoławcza nieruchomości: 44 000,00 zł
5. Wadium: 440,00 zł
6. Liczba osób dopuszczonych do przetargu: 2

7. Wynik przetargu:
Przetarg został uznany za rozstrzygnięty.
Cena osiągnięta w przetargu: 51 000,00 zł.
Nabywca nieruchomości: Jan Kowalski.

8. Informację sporządzono w dniu 28.06.2023 r.
`;

test('parseResultDoc: parses sold residential flat fixture', () => {
  const records = parseResultDoc(
    FIXTURE_RESIDENTIAL_SOLD,
    '2023-06-28',
    'https://bip-api.mogilno.pl/api/attachments/sample.pdf',
  );
  assert.equal(records.length, 1);
  const r = records[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.outcome, 'sold');
  assert.equal(r.unsold_reason, null);
  assert.equal(r.auction_date, '2023-06-26');
  assert.equal(r.starting_price_pln, 44000);
  assert.equal(r.final_price_pln, 51000);
  assert.equal(r.area_m2, 39.41);
  assert.ok(r.address);
  assert.equal(r.address.street, 'Wyrobki');
  assert.equal(r.address.building, '7');
});

const FIXTURE_RESIDENTIAL_UNSOLD = `
INFORMACJA O WYNIKU PRZETARGU

1. Data i miejsce przetargu:
Przetarg odbył się w dniu 15 września 2023 r. w Urzędzie Miejskim w Mogilnie.

2. Rodzaj przetargu:
Drugi przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego.

3. Oznaczenie nieruchomości:
* położenie: Wasielewko nr 18 lok. 3,
* powierzchnia użytkowa lokalu wynosi 48,20 m2.

4. Cena wywoławcza: 65 000,00 zł.
5. Wynik przetargu:
W wyznaczonym terminie nie wpłynęło wadium, w związku z czym przetarg zakończył się wynikiem negatywnym.
`;

test('parseResultDoc: parses unsold residential flat fixture (Wasielewko 18/3 round 2)', () => {
  const records = parseResultDoc(
    FIXTURE_RESIDENTIAL_UNSOLD,
    '2023-09-18',
    'https://bip-api.mogilno.pl/api/attachments/wasielewko.pdf',
  );
  assert.equal(records.length, 1);
  const r = records[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'no_buyer');
  assert.equal(r.auction_date, '2023-09-15');
  assert.equal(r.round, 2);
  assert.equal(r.starting_price_pln, 65000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.area_m2, 48.2);
  assert.ok(r.address);
  assert.equal(r.address.street, 'Wasielewko');
  assert.equal(r.address.building, '18');
  assert.equal(r.address.apt, '3');
});

test('parseResultDoc: ignores leases and procurement', () => {
  const leaseNotice = `
    INFORMACJA O WYNIKU PRZETARGU
    dotyczącą przetargu ustnego nieograniczonego na dzierżawę części nieruchomości gruntowej,
    na cele upraw warzywniczych, dz. nr 182/2.
    Cena wywoławcza za dzierżawę wynosiła 105,00 zł.
  `;
  assert.deepEqual(parseResultDoc(leaseNotice, null, 'lease.pdf'), []);

  const procurementNotice = `
    Ogłoszenie o wyniku postępowania o udzielenie zamówienia publicznego:
    budowa kanalizacji sanitarnej w m. Dąbrówka.
  `;
  assert.deepEqual(parseResultDoc(procurementNotice, null, 'procurement.pdf'), []);
});
