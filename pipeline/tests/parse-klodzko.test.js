// Kłodzko parser tests. Fixtures are faithful condensed copies of REAL BIP HTML
// body text from live um.bip.klodzko.pl pages (verified 2026-06-27):
//
//   ANN_MICKIEWICZA: id=17391  — ul. Adama Mickiewicza 3/2, 44,90 m²,
//     cena wywoławcza 140 000,00 zł, przetarg 16.07.2026, I przetarg.
//   ANN_WOJSKA:      id=17390  — ul. Wojska Polskiego 8/1, 76,95 m²,
//     cena wywoławcza 330 000,00 zł, przetarg 16.07.2026, I przetarg.
//   RESULT_TRAUGUTTA: id=16332 — ul. Romualda Traugutta 5/1, 111,59 m²,
//     cena wywoławcza 280 000,00 zł, cena nabycia 282 800,00 zł,
//     data przetargu 10 kwietnia 2025 r., I przetarg.
//
//   Fixture URLs (all verified live 2026-06-27):
//     https://um.bip.klodzko.pl/index.php?n=i&id=17391&akcja=info&menu=346
//     https://um.bip.klodzko.pl/index.php?n=i&id=17390&akcja=info&menu=346
//     https://um.bip.klodzko.pl/index.php?n=i&id=16332&akcja=info&menu=346
//
//   Join key the first real refresh must confirm:
//     ANN_MICKIEWICZA → address.key = 'adama mickiewicza|3|2'
//     RESULT_TRAUGUTTA → address.key = 'romualda traugutta|5|1'

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isResultNotice,
  roundFromText,
  auctionDateFromText,
  startingPriceFromText,
  unitAreaFromText,
  addressFromText,
  resultDateFromText,
  resultRoundFromText,
  resultAddressFromText,
  achievedPriceFromText,
  parseResultDoc,
  parseDetailPage,
} from '../src/cities/klodzko/parse.js';

import { parseListingPage } from '../src/cities/klodzko/parse.js';
import { classifyBoardTitle } from '../src/cities/klodzko/crawl.js';

// ── REAL FIXTURES (condensed from live pages, 2026-06-27) ────────────────────

// Announcement body text from id=17391 (Mickiewicza 3/2).
// Condensed but preserves all parseable phrases faithfully.
const ANN_MICKIEWICZA = `Burmistrza Miasta Kłodzka ogłasza I przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 2 zlokalizowanego w Kłodzku przy ul. Adama Mickiewicza 3 o powierzchni 44,90 m² wraz z udziałem w wysokości 45/100 cz. w nieruchomości wspólnej, w tym w prawie własności nieruchomości oznaczonej geodezyjnie jako dz. nr 69/2 (AM-5) obręb Zacisze o powierzchni 0,0366 ha. Lokal mieszkalny nr 2 zlokalizowany jest na I kondygnacji – parter; składa się z jednego pokoju, kuchni, przedpokoju i pomieszczenia WC, powierzchnia 44,90 m²; piwnica przynależna do lokalu zlokalizowana jest w częściach wspólnych nieruchomości i nie podlega sprzedaży. Lokal w złym stanie technicznym, wymaga kapitalnego remontu. WARUNKI PRZETARGU : 1. CENA WYWOŁAWCZA – 140 000,00 zł (słownie: sto czterdzieści tysięcy złotych) 2. Minimalne postąpienie przetargowe – 1 400,00 zł. 3. Warunkiem przystąpienia do przetargu jest wniesienie wadium w wysokości 14 000,00 zł w terminie do dnia 09.07.2026 r. 4. Przetarg odbędzie się dnia 16.07.2026 r. o godz. 12.00 w Sali Rajców nr 201 II piętro Urzędu Miasta w Kłodzku, Pl. Bolesława Chrobrego 1.`;

// Announcement body text from id=17390 (Wojska Polskiego 8/1).
const ANN_WOJSKA = `Burmistrza Miasta Kłodzka ogłasza I przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 1 zlokalizowanego w Kłodzku przy ul. Wojska Polskiego 8 o powierzchni 76,95 m² wraz z udziałem w wysokości 57/1 000 cz. w nieruchomości wspólnej. Lokal mieszkalny nr 1 zlokalizowany jest na II kondygnacji – 1 piętro; składa się z 3 pokoi, kuchni, WC i przedpokoju, powierzchnia 76,95 m²; brak pomieszczeń przynależnych. Lokal w złym stanie technicznym, wymaga kapitalnego remontu. WARUNKI PRZETARGU : 1. CENA WYWOŁAWCZA – 330 000,00 zł (słownie: trzysta trzydzieści tysięcy złotych) 2. Minimalne postąpienie przetargowe – 3 300,00 zł. 3. Wadium w wysokości 33 000,00 zł w terminie do dnia 09.07.2026 r. 4. Przetarg odbędzie się dnia 16.07.2026 r. o godz. 10.00 w Sali Rajców nr 201 II piętro Urzędu Miasta w Kłodzku.`;

// Result notice body text from id=16332 (Traugutta 5/1, April 2025).
const RESULT_TRAUGUTTA = `Kłodzko, dnia 18 kwietnia 2025 r. WM.6840.1.8.2024.IB INFORMACJA BURMISTRZA MIASTA KŁODZKA O WYNIKU PRZETARGU 1. Data przetargu: 10 kwietnia 2025 r. 2. Miejsce przetargu: Urząd Miasta w Kłodzku, pl. B. Chrobrego 1, Kłodzko, Sala Rajców nr 201. 3. Rodzaj przetargu: I przetarg ustny nieograniczony. 4. Dane nieruchomości: lokal mieszkalny nr 1 zlokalizowanego w Kłodzku przy ul. Romualda Traugutta 5 o powierzchni 111,59 m², składający się z trzech pokoi, dwóch pomieszczeń gospodarczych, przedpokoju, kuchni i WC wraz z udziałem w wysokości 21/100 cz. w nieruchomości wspólnej, w tym w prawie własności nieruchomości oznaczonej geodezyjnie jako dz. nr 30 (AM-1) obręb Centrum o powierzchni 0,0352 ha. 5. Liczba osób dopuszczonych do uczestniczenia w przetargu: 1 6. Liczba osób niedopuszczonych do przetargu: 0 7. Cena wywoławcza: 280 000,00 zł (słownie: dwieście osiemdziesiąt tysięcy złotych). 8. Nabywcy nieruchomości – Agnieszka i Remigiusz Leśnik 9. Cena nabycia – 282 800,00 zł (słownie: dwieście osiemdziesiąt dwa tysiące osiemset złotych)`;

// ── isResultNotice ────────────────────────────────────────────────────────────

test('isResultNotice: correctly classifies result vs. announcement', () => {
  assert.equal(isResultNotice(RESULT_TRAUGUTTA), true);
  assert.equal(isResultNotice(ANN_MICKIEWICZA), false);
  assert.equal(isResultNotice(ANN_WOJSKA), false);
  assert.equal(isResultNotice(''), false);
  assert.equal(isResultNotice(null), false);
});

// ── roundFromText ─────────────────────────────────────────────────────────────

test('roundFromText: Roman numerals before "przetarg ustny"', () => {
  assert.equal(roundFromText('I przetarg ustny nieograniczony'), 1);
  assert.equal(roundFromText('II przetarg ustny nieograniczony'), 2);
  assert.equal(roundFromText('III przetarg ustny nieograniczony'), 3);
});

test('roundFromText: ordinal words', () => {
  assert.equal(roundFromText('pierwszy przetarg ustny'), 1);
  assert.equal(roundFromText('drugi przetarg ustny'), 2);
});

test('roundFromText: announcement fixtures return 1 (Roman I)', () => {
  assert.equal(roundFromText(ANN_MICKIEWICZA), 1);
  assert.equal(roundFromText(ANN_WOJSKA), 1);
});

test('roundFromText: null for unrecognised pattern', () => {
  assert.equal(roundFromText('brak'), null);
  assert.equal(roundFromText(''), null);
  assert.equal(roundFromText(null), null);
});

// ── auctionDateFromText ───────────────────────────────────────────────────────

test('auctionDateFromText: "Przetarg odbędzie się dnia DD.MM.YYYY"', () => {
  assert.equal(auctionDateFromText(ANN_MICKIEWICZA), '2026-07-16');
  assert.equal(auctionDateFromText(ANN_WOJSKA), '2026-07-16');
});

test('auctionDateFromText: spelled month form', () => {
  assert.equal(
    auctionDateFromText('Przetarg odbędzie się dnia 5 maja 2026 r.'),
    '2026-05-05',
  );
  assert.equal(
    auctionDateFromText('w dniu 3 marca 2025 r.'),
    '2025-03-03',
  );
});

test('auctionDateFromText: null when missing', () => {
  assert.equal(auctionDateFromText('brak daty'), null);
  assert.equal(auctionDateFromText(null), null);
});

// ── startingPriceFromText ─────────────────────────────────────────────────────

test('startingPriceFromText: "CENA WYWOŁAWCZA – NNN 000,00 zł"', () => {
  assert.equal(startingPriceFromText(ANN_MICKIEWICZA), 140000);
  assert.equal(startingPriceFromText(ANN_WOJSKA), 330000);
});

test('startingPriceFromText: from result notice "Cena wywoławcza: NNN zł"', () => {
  assert.equal(startingPriceFromText(RESULT_TRAUGUTTA), 280000);
});

test('startingPriceFromText: dot-thousands format "140.000,00 zł"', () => {
  assert.equal(startingPriceFromText('CENA WYWOŁAWCZA – 140.000,00 zł'), 140000);
});

test('startingPriceFromText: null when missing', () => {
  assert.equal(startingPriceFromText('brak ceny'), null);
});

// ── unitAreaFromText ──────────────────────────────────────────────────────────

test('unitAreaFromText: picks flat area NOT cellar / działka', () => {
  assert.equal(unitAreaFromText(ANN_MICKIEWICZA), 44.9);
  assert.equal(unitAreaFromText(ANN_WOJSKA), 76.95);
  assert.equal(unitAreaFromText(RESULT_TRAUGUTTA), 111.59);
});

test('unitAreaFromText: null for missing area', () => {
  assert.equal(unitAreaFromText('brak powierzchni'), null);
});

// ── addressFromText ───────────────────────────────────────────────────────────

test('addressFromText: Mickiewicza 3/2 — address key and raw', () => {
  const titleHint = 'ul. A. Mickiewicza 3/2, pow. 44,90 m2';
  const r = addressFromText(ANN_MICKIEWICZA, titleHint);
  assert.ok(r, 'address result should not be null');
  assert.ok(r.address_raw.includes('Mickiewicza'), 'raw address contains street name');
  assert.equal(r.address.building, '3');
  assert.equal(r.address.apt, '2');
  assert.equal(r.address.key, 'adama mickiewicza|3|2', '← join key for build-properties');
});

test('addressFromText: Wojska Polskiego 8/1 — apt from "lokal nr 1"', () => {
  const titleHint = 'ul. Wojska Polskiego 8/1, pow. 76,95 m2';
  const r = addressFromText(ANN_WOJSKA, titleHint);
  assert.ok(r);
  assert.equal(r.address.building, '8');
  assert.equal(r.address.apt, '1');
  assert.equal(r.address.key, 'wojska polskiego|8|1');
});

test('addressFromText: null for text with no address pattern', () => {
  assert.equal(addressFromText('brak adresu', null), null);
});

// ── resultDateFromText ────────────────────────────────────────────────────────

test('resultDateFromText: "Data przetargu: DD miesiąc YYYY"', () => {
  assert.equal(resultDateFromText(RESULT_TRAUGUTTA), '2025-04-10');
});

test('resultDateFromText: numeric form', () => {
  assert.equal(
    resultDateFromText('Data przetargu: 16.07.2026 r.'),
    '2026-07-16',
  );
});

test('resultDateFromText: null when missing', () => {
  assert.equal(resultDateFromText('brak'), null);
});

// ── resultRoundFromText ───────────────────────────────────────────────────────

test('resultRoundFromText: "Rodzaj przetargu: I przetarg ustny…" → 1', () => {
  assert.equal(resultRoundFromText(RESULT_TRAUGUTTA), 1);
});

test('resultRoundFromText: II przetarg in rodzaj section', () => {
  const text = 'Rodzaj przetargu: II przetarg ustny nieograniczony.';
  assert.equal(resultRoundFromText(text), 2);
});

// ── resultAddressFromText ─────────────────────────────────────────────────────

test('resultAddressFromText: Traugutta 5/1 — address key', () => {
  const r = resultAddressFromText(RESULT_TRAUGUTTA);
  assert.ok(r, 'result address should not be null');
  assert.equal(r.address.building, '5');
  assert.equal(r.address.apt, '1');
  assert.equal(r.address.key, 'romualda traugutta|5|1', '← join key must match announcement');
});

test('resultAddressFromText: null for non-address text', () => {
  assert.equal(resultAddressFromText('brak adresu'), null);
});

// ── achievedPriceFromText ─────────────────────────────────────────────────────

test('achievedPriceFromText: "Cena nabycia – NNN zł"', () => {
  assert.equal(achievedPriceFromText(RESULT_TRAUGUTTA), 282800);
});

test('achievedPriceFromText: null in announcement (no achieved price)', () => {
  assert.equal(achievedPriceFromText(ANN_MICKIEWICZA), null);
  assert.equal(achievedPriceFromText(ANN_WOJSKA), null);
});

// ── parseResultDoc ────────────────────────────────────────────────────────────

test('parseResultDoc: SOLD — Traugutta 5/1 full record', () => {
  const SOURCE = 'https://um.bip.klodzko.pl/index.php?n=i&id=16332&akcja=info&menu=346';
  const recs = parseResultDoc(RESULT_TRAUGUTTA, null, SOURCE);
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.address.key, 'romualda traugutta|5|1', '← join key must match announcement');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.area_m2, 111.59);
  assert.equal(r.starting_price_pln, 280000);
  assert.equal(r.final_price_pln, 282800);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.unsold_reason, null);
  assert.equal(r.auction_date, '2025-04-10');
  assert.equal(r.round, 1);
  assert.equal(r.source_pdf, SOURCE);
});

test('parseResultDoc: returns [] for announcement text', () => {
  assert.deepEqual(parseResultDoc(ANN_MICKIEWICZA, null, 'u'), []);
  assert.deepEqual(parseResultDoc(ANN_WOJSKA, null, 'u'), []);
});

test('parseResultDoc: negative outcome when no achieved price and no nabywca', () => {
  const negText = `${RESULT_TRAUGUTTA.replace('Nabywcy nieruchomości – Agnieszka i Remigiusz Leśnik', '').replace('Cena nabycia – 282 800,00 zł (słownie: dwieście osiemdziesiąt dwa tysiące osiemset złotych)', '')} Przetarg zakończył się wynikiem negatywnym.`;
  const recs = parseResultDoc(negText, null, 'u');
  assert.equal(recs.length, 1);
  assert.equal(recs[0].outcome, 'unsold');
  assert.equal(recs[0].final_price_pln, null);
});

// ── parseDetailPage (integration) ────────────────────────────────────────────

function wrapHtml(bodyText) {
  return `<html><body>
    <div id="tresc_main">
    <p>Treść informacji</p>
    <div class="content">${bodyText}</div>
    <p>Pliki powiązane z informacją</p>
    </div>
    </body></html>`;
}

test('parseDetailPage: announcement returns kind=announcement, listing with correct fields', () => {
  const html = wrapHtml(ANN_MICKIEWICZA);
  const result = parseDetailPage(html, '17391', 'ul. A. Mickiewicza 3/2, pow. 44,90 m2');
  assert.ok(result, 'should return a result object');
  assert.equal(result.kind, 'announcement');
  assert.ok(result.listing, 'listing should be present');
  assert.equal(result.listing.kind, 'mieszkalny');
  assert.equal(result.listing.area_m2, 44.9);
  assert.equal(result.listing.starting_price_pln, 140000);
  assert.equal(result.listing.auction_date, '2026-07-16');
  assert.equal(result.listing.round, 1);
  assert.equal(result.listing.address.key, 'adama mickiewicza|3|2');
});

test('parseDetailPage: result notice returns kind=result, no listing', () => {
  const html = wrapHtml(RESULT_TRAUGUTTA);
  const result = parseDetailPage(html, '16332');
  assert.ok(result);
  assert.equal(result.kind, 'result');
  assert.equal(result.listing, undefined);
  assert.equal(result.auction_date, '2025-04-10');
  assert.ok(typeof result.text === 'string' && result.text.length > 0);
});

// ── parseListingPage ──────────────────────────────────────────────────────────

test('parseListingPage: extracts item ids and titles from board HTML', () => {
  const listingHtml = `<table>
    <tr><td><div class='table_content'>
      <a href='index.php?n=i&amp;id=17391&amp;akcja=info&amp;menu=346#tresc_main'
         data-bs-toggle='tooltip' data-bs-placement='bottom'
         title=' Kliknij aby wyświetlić informację Burmistrz Miasta Kłodzka ogłasza I przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego zlokalizowanego w Kłodzku przy ul. A. Mickiewicza 3/2, pow. 44,90 m2 '>
      Burmistrz Miasta Kłodzka ogłasza I przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego zlokalizowanego w Kłodzku przy ul. A. Mickiewicza 3/2, pow. 44,90 m2</a>
      <div class='collapse' id='statystyki_tabela_17391'>
        <table><tr><td>Data wprowadzenia do BIP:</td><td>&nbsp;&nbsp;27.05.2026</td></tr></table>
      </div>
    </div></td></tr>
    <tr><td><div class='table_content'>
      <a href='index.php?n=i&amp;id=16332&amp;akcja=info&amp;menu=346#tresc_main'
         data-bs-toggle='tooltip' data-bs-placement='bottom'
         title=' Kliknij aby wyświetlić informację INFORMACJA BURMISTRZA MIASTA KŁODZKA O WYNIKU PRZETARGU dot. dz. nr 30, ul. R.Traugutta 5/1, pow. 111,59 m2 '>
      INFORMACJA BURMISTRZA MIASTA KŁODZKA O WYNIKU PRZETARGU dot. dz. nr 30, ul. R.Traugutta 5/1, pow. 111,59 m2</a>
      <div class='collapse' id='statystyki_tabela_16332'>
        <table><tr><td>Data wprowadzenia do BIP:</td><td>&nbsp;&nbsp;18.04.2025</td></tr></table>
      </div>
    </div></td></tr>
  </table>`;

  const items = parseListingPage(listingHtml);
  assert.equal(items.length, 2);

  const mickiewicza = items.find((i) => i.id === '17391');
  assert.ok(mickiewicza, 'item 17391 should be found');
  assert.match(mickiewicza.title, /Mickiewicza/);
  assert.equal(mickiewicza.published_date, '2026-05-27');

  const traugutta = items.find((i) => i.id === '16332');
  assert.ok(traugutta, 'item 16332 should be found');
  assert.match(traugutta.title, /WYNIKU PRZETARGU/);
  assert.equal(traugutta.published_date, '2025-04-18');
});

test('parseListingPage: deduplicates repeated item ids', () => {
  const html = `
    <a href='index.php?n=i&amp;id=17391&amp;akcja=info&amp;menu=346' data-bs-toggle='tooltip' title=' t1 '>t1</a>
    <a href='index.php?n=i&amp;id=17391&amp;akcja=info&amp;menu=346' data-bs-toggle='tooltip' title=' t1 dup '>t1 dup</a>
  `;
  const items = parseListingPage(html);
  assert.equal(items.length, 1, 'duplicate id should be deduplicated');
});

test('parseListingPage: empty html returns empty array', () => {
  assert.deepEqual(parseListingPage('<html><body>nic</body></html>'), []);
});

// ── classifyBoardTitle ────────────────────────────────────────────────────────
// Regression: board headlines carry the GENITIVE "lokalu mieszkalnego", which a
// bare /lokal\s+mieszkaln/ skips. These are the exact live titles for id=17391
// and id=17390 (2 flat auctions that were being dropped before the fix).

test('classifyBoardTitle: genitive "lokalu mieszkalnego" is a flat (not skipped)', () => {
  const t1 =
    'Burmistrz Miasta Kłodzka ogłasza I przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego zlokalizowanego w Kłodzku przy ul. A. Mickiewicza 3/2, pow. 44,90 m2';
  const t2 =
    'Burmistrz Miasta Kłodzka ogłasza I przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego zlokalizowanego w Kłodzku przy ul. Wojska Polskiego 8/1, pow. 76,95 m2';
  assert.deepEqual(classifyBoardTitle(t1), { isFlat: true, isResult: false });
  assert.deepEqual(classifyBoardTitle(t2), { isFlat: true, isResult: false });
});

test('classifyBoardTitle: nominative "lokal mieszkalny" is still a flat', () => {
  const t = 'I przetarg ustny nieograniczony na sprzedaż lokal mieszkalny nr 2';
  assert.equal(classifyBoardTitle(t).isFlat, true);
});

test('classifyBoardTitle: result notice is a result, not a flat', () => {
  const t =
    'INFORMACJA BURMISTRZA MIASTA KŁODZKA O WYNIKU PRZETARGU dot. dz. nr 30, ul. R.Traugutta 5/1, pow. 111,59 m2';
  assert.deepEqual(classifyBoardTitle(t), { isFlat: false, isResult: true });
});

test('classifyBoardTitle: unrelated / empty titles classify as neither', () => {
  assert.deepEqual(classifyBoardTitle('Ogłoszenie o sprzedaży działki gruntowej'), {
    isFlat: false,
    isResult: false,
  });
  assert.deepEqual(classifyBoardTitle(''), { isFlat: false, isResult: false });
  assert.deepEqual(classifyBoardTitle(null), { isFlat: false, isResult: false });
});
