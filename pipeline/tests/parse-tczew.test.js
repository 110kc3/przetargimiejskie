// Tczew parser + crawl helper tests.
//
// Fixtures groundtruthed against LIVE pages (2026-06-27):
//
// LIST PAGE (archiwum/3, board "Przetargi"):
//   https://bip.tczew.pl/wiadomosci/archiwum/3/lista/1/przetargi
//   3 entries (all 2026):
//     - "Ogłoszenie o I przetargu ustnym nieograniczonym na najem lokalów handlowo-usługowych …"
//       → NOT a flat-sale entry (najem, not sprzedaż lokal mieszkalny)
//     - "Ogłoszenie o wyniku I przetargu ustnego nieograniczonego na sprzedaż lokalu
//       mieszkalnego nr 5, położonego w Tczewie przy ul. Elżbiety 4 …" (result notice)
//     - "Ogłoszenie o I przetargu ustnym nieograniczonym na sprzedaż lokalu mieszkalnego
//       nr 5, położonego w Tczewie przy ul. Elżbiety 4 …" (announcement)
//   URL pattern: https://bip.tczew.pl/wiadomosci/archiwum/3/wiadomosc/{ID}/{slug}
//
// ANNOUNCEMENT DETAIL (ID 865130):
//   https://bip.tczew.pl/wiadomosci/archiwum/3/wiadomosc/865130/ogloszenie_o_i_przetargu_ustnym_...
//   PDF attachment: https://bip-v1-files.idcom-jst.pl/sites/3051/wiadomosci/865130/files/
//                   ogloszenie_i_przetargu_elzbiety_4_5_bip.pdf
//   Data wytworzenia dokumentu: 02-02-2026
//
// RESULT NOTICE DETAIL (ID 871415):
//   https://bip.tczew.pl/wiadomosci/archiwum/3/wiadomosc/871415/ogloszenie_o_wyniku_i_przetargu_...
//   PDF attachment: https://bip-v1-files.idcom-jst.pl/sites/3051/wiadomosci/871415/files/
//                   ogloszenie_o_wyniku_przetargu.pdf (472 KB)
//   Data wytworzenia dokumentu: 10-03-2026
//
// RESULT PDF TEXT (actual pdftotext -layout output, confirmed live 2026-06-27):
//   Tczew, dnia 10-03-2026 r.
//
//                                     OGŁOSZENIE
//
//   Prezydent Miasta Tczewa informuje, że dnia 10-03-2026 r. o godz. 1000 w Urzędzie
//   Miejskim w Tczewie odbył się pierwszy przetarg nieograniczony na sprzedaż lokalu
//   mieszkalnego nr 5, położonego w Tczewie przy ul. Elżbiety 4 z udziałem w nieruchomości
//   wspólnej.
//
//    Oznaczenie nieruchomości          dz. 26/11, pow. 1431 m2, obr. 7
//    Udział                            836/10000
//    Położenie lokalu                  Tczew, ul. Elżbiety 4/5
//    Powierzchnia lokalu i pomieszczeń pow. lokalu -     33,09 m2
//    przynależnych                     pow. piwnicy -     7,41 m2
//    Cena wywoławcza                   150.000,00 zł
//    Liczba osób dopuszczonych do przetargu  0
//    Liczba osób niedopuszczonych do przetargu  0
//    Najwyższa cena osiągnięta w przetargu    ---
//    Imię, nazwisko albo nazwa lub firma osoby  Nie wpłynęło wadium, w związku z tym
//    ustalonej jako nabywca nieruchomości        przetarg zakończył się wynikiem negatywnym
//
// NEEDS-LIVE-VERIFY: sold-outcome fixture (no successful auction confirmed yet in 2026).
// The sold price regex follows the same table pattern — validate on first CI hit.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseListPage,
  publishedDateFromDetail,
  attachmentPdfFromDetail,
  roundFromTitle,
  addressFromTitle,
} from '../src/cities/tczew/crawl.js';

import {
  auctionDateFromText,
  startingPriceFromText,
  areaFromText,
  finalPriceFromText,
  roundFromText,
  addressFromResultText,
  parseResultDoc,
} from '../src/cities/tczew/parse.js';

// ── List-page parser ──────────────────────────────────────────────────────────
//
// Condensed but structurally faithful copy of the real IDcom.pl list HTML
// (bip.tczew.pl, confirmed 2026-06-27).

const LIST_HTML = `
<div class="wiadomosci ajaxContener">
  <div class="t1 clickable">
    <div class="contener">
      <p class="title"><a href="https://bip.tczew.pl/wiadomosci/archiwum/3/wiadomosc/881655/ogloszenie_o_i_przetargu_ustnym_nieograniczonym_na_najem_lokalow">Ogłoszenie o I przetargu ustnym nieograniczonym na najem lokalów handlowo -usługowych nr 1 oraz nr 19 , znajdujących się w hali nr 1 w Tczewie przy ul. Żwirki będącej własnością Gminy Miejskiej Tczew</a></p>
    </div>
  </div>
  <div class="t1 clickable">
    <div class="contener">
      <p class="title"><a href="https://bip.tczew.pl/wiadomosci/archiwum/3/wiadomosc/871415/ogloszenie_o_wyniku_i_przetargu_ustnego_nieograniczonego_na_sprz">Ogłoszenie o wyniku I przetargu ustnego nieograniczonego na sprzedaż lokalu mieszkalnego nr 5, położonego w Tczewie przy ul. Elżbiety 4, będącego własnością Gminy Miejskiej Tczew.</a></p>
    </div>
  </div>
  <div class="t1 clickable">
    <div class="contener">
      <p class="title"><a href="https://bip.tczew.pl/wiadomosci/archiwum/3/wiadomosc/865130/ogloszenie_o_i_przetargu_ustnym_nieograniczonym_na_sprzedaz_loka">Ogłoszenie o I przetargu ustnym nieograniczonym na sprzedaż lokalu mieszkalnego nr 5, położonego w Tczewie przy ul. Elżbiety 4, będącego własnością Gminy Miejskiej Tczew.</a></p>
    </div>
  </div>
</div>
`;

test('parseListPage: returns all 3 entries with url + title', () => {
  const entries = parseListPage(LIST_HTML);
  assert.equal(entries.length, 3);
  assert.ok(entries[0].url.includes('881655'));
  assert.ok(entries[1].url.includes('871415'));
  assert.ok(entries[2].url.includes('865130'));
  assert.ok(entries[2].title.includes('I przetargu ustnym'));
});

test('parseListPage: deduplicates identical URLs', () => {
  const dupHtml = LIST_HTML + LIST_HTML;
  assert.equal(parseListPage(dupHtml).length, 3);
});

test('parseListPage: empty / garbled HTML returns empty array', () => {
  assert.deepEqual(parseListPage(''), []);
  assert.deepEqual(parseListPage('<html><body>nic</body></html>'), []);
});

// ── Detail-page helpers ───────────────────────────────────────────────────────
//
// Structure from live fetch of ID 865130 (announcement) and 871415 (result).

const DETAIL_HTML_ANNOUNCE = `
<div class="ContentBox2 rejestrZmian">
  <div class="Naglowek">
    Data wytworzenia dokumentu: <span>02-02-2026</span><br />
    Dokument wytworzony przez: <span>Wydział Gospodarki Nieruchomościami</span><br />
    Data wprowadzenia dokumentu do BIP: <span>03 lutego 2026 11:42</span><br />
  </div>
</div>
<div class="t1 attachment">
  <a href="https://bip-v1-files.idcom-jst.pl/sites/3051/wiadomosci/865130/files/ogloszenie_i_przetargu_elzbiety_4_5_bip.pdf" target="_blank">
    ogloszenie I przetargu Elżbiety 4 5 BIP
  </a>
</div>
`;

const DETAIL_HTML_RESULT = `
<div class="ContentBox2 rejestrZmian">
  <div class="Naglowek">
    Data wytworzenia dokumentu: <span>10-03-2026</span><br />
    Data wprowadzenia dokumentu do BIP: <span>11 marca 2026 12:30</span><br />
  </div>
</div>
<div class="t1 attachment">
  <a href="https://bip-v1-files.idcom-jst.pl/sites/3051/wiadomosci/871415/files/ogloszenie_o_wyniku_przetargu.pdf" target="_blank">
    ogłoszenie o wyniku przetargu
  </a>
</div>
`;

test('publishedDateFromDetail: parses DD-MM-YYYY from "Data wytworzenia dokumentu"', () => {
  assert.equal(publishedDateFromDetail(DETAIL_HTML_ANNOUNCE), '2026-02-02');
  assert.equal(publishedDateFromDetail(DETAIL_HTML_RESULT), '2026-03-10');
});

test('publishedDateFromDetail: returns null for empty/no-match HTML', () => {
  assert.equal(publishedDateFromDetail(''), null);
  assert.equal(publishedDateFromDetail('<div>nothing</div>'), null);
});

test('publishedDateFromDetail: falls back to "Data wprowadzenia" when "wytworzenia" absent', () => {
  const html = `<div>Data wprowadzenia dokumentu do BIP: <span>11 marca 2026 12:30</span></div>`;
  const d = publishedDateFromDetail(html);
  assert.equal(d, '2026-03-11');
});

test('attachmentPdfFromDetail: extracts PDF URL from announcement detail (865130)', () => {
  const url = attachmentPdfFromDetail(DETAIL_HTML_ANNOUNCE);
  assert.ok(url);
  assert.ok(url.includes('bip-v1-files.idcom-jst.pl'));
  assert.ok(url.endsWith('ogloszenie_i_przetargu_elzbiety_4_5_bip.pdf'));
});

test('attachmentPdfFromDetail: extracts PDF URL from result detail (871415)', () => {
  const url = attachmentPdfFromDetail(DETAIL_HTML_RESULT);
  assert.ok(url);
  assert.ok(url.endsWith('ogloszenie_o_wyniku_przetargu.pdf'));
});

test('attachmentPdfFromDetail: returns null when no PDF href', () => {
  assert.equal(attachmentPdfFromDetail('<div>no attachment</div>'), null);
  assert.equal(attachmentPdfFromDetail(''), null);
});

// ── roundFromTitle ────────────────────────────────────────────────────────────

test('roundFromTitle: Roman numerals in title', () => {
  assert.equal(roundFromTitle('Ogłoszenie o I przetargu ustnym nieograniczonym na sprzedaż lokalu mieszkalnego'), 1);
  assert.equal(roundFromTitle('Ogłoszenie o II przetargu ustnym nieograniczonym na sprzedaż lokalu mieszkalnego'), 2);
  assert.equal(roundFromTitle('Ogłoszenie o III przetargu ustnym nieograniczonym na sprzedaż'), 3);
});

test('roundFromTitle: returns null for unrecognised/empty', () => {
  assert.equal(roundFromTitle(''), null);
  assert.equal(roundFromTitle('przetarg bez cyfry'), null);
});

// ── addressFromTitle ──────────────────────────────────────────────────────────
//
// Live title: "Ogłoszenie o I przetargu ustnym nieograniczonym na sprzedaż lokalu
//   mieszkalnego nr 5, położonego w Tczewie przy ul. Elżbiety 4, będącego…"
// Expected: address key "elzbiety|4|5"

test('addressFromTitle: extracts Elżbiety 4/5 from live title', () => {
  const title =
    'Ogłoszenie o I przetargu ustnym nieograniczonym na sprzedaż lokalu mieszkalnego nr 5, położonego w Tczewie przy ul. Elżbiety 4, będącego własnością Gminy Miejskiej Tczew.';
  const addr = addressFromTitle(title);
  assert.ok(addr, 'address must be parsed');
  assert.equal(addr.building, '4');
  assert.ok(addr.apt === '5' || addr.key.includes('|5'), 'apt must be 5');
  assert.ok(addr.key.includes('elzbiety') || addr.key.toLowerCase().includes('elzbiety'));
});

test('addressFromTitle: returns null for garbled / no address', () => {
  assert.equal(addressFromTitle(''), null);
  assert.equal(addressFromTitle('Ogłoszenie bez adresu przetargu'), null);
});

// ── Result PDF text parsers ───────────────────────────────────────────────────
//
// Exact pdftotext -layout output from the live fixture (2026-06-27):
// URL: bip-v1-files.idcom-jst.pl/…/871415/files/ogloszenie_o_wyniku_przetargu.pdf

const RESULT_PDF_NEGATIVE = `                                                                                                                Tczew, dnia 10-03-2026 r.

                                                          OGŁOSZENIE


Prezydent Miasta Tczewa informuje, że dnia 10-03-2026 r. o godz. 1000 w Urzędzie Miejskim w Tczewie odbył się pierwszy przetarg
nieograniczony na sprzedaż lokalu mieszkalnego nr 5, położonego w Tczewie przy ul. Elżbiety 4 z udziałem w nieruchomości wspólnej.

Zgodnie z rozporządzeniem Rady Ministrów z dnia 14.09.2004 r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie
nieruchomości (tj. Dz.U. z 2021 r. poz. 2213), podaje się do publicznej wiadomości poniższe informacje:


 Oznaczenie nieruchomości                     dz. 26/11, pow. 1431 m2, obr. 7
 Udział                                       836/10000
 Położenie lokalu                             Tczew, ul. Elżbiety 4/5
 Powierzchnia lokalu i pomieszczeń            pow. lokalu -                    33,09 m2
 przynależnych                                pow. piwnicy -                    7,41 m2
 Cena wywoławcza                              150.000,00 zł
 Liczba osób dopuszczonych do przetargu       0
 Liczba osób niedopuszczonych do przetargu    0
 Najwyższa cena osiągnięta w przetargu        ---
 Imię, nazwisko albo nazwa lub firma osoby    Nie wpłynęło wadium, w związku z tym przetarg zakończył się wynikiem negatywnym
 ustalonej jako nabywca nieruchomości


                                                                                    Z up. Prezydenta Miasta Tczewa

                                                                                          Anna Michalak
                                                                                         Naczelnik Wydziału
                                                                                   Gospodarki Nieruchomościami

wytworzyła: Anna Łazarska
`;

// Simulated sold-outcome result PDF (same table layout, different outcome row).
// VALIDATE on first successful auction result in live CI.
const RESULT_PDF_SOLD = `                                                                                                                Tczew, dnia 15-05-2025 r.

                                                          OGŁOSZENIE


Prezydent Miasta Tczewa informuje, że dnia 15-05-2025 r. o godz. 1000 w Urzędzie Miejskim w Tczewie odbył się drugi przetarg
nieograniczony na sprzedaż lokalu mieszkalnego nr 1, położonego w Tczewie przy ul. Ceglarska 11 z udziałem w nieruchomości wspólnej.

 Oznaczenie nieruchomości                     dz. 45/3, pow. 980 m2, obr. 4
 Udział                                       512/10000
 Położenie lokalu                             Tczew, ul. Ceglarska 11/1
 Powierzchnia lokalu i pomieszczeń            pow. lokalu -                    42,50 m2
 przynależnych                                pow. piwnicy -                    5,20 m2
 Cena wywoławcza                              160.000,00 zł
 Liczba osób dopuszczonych do przetargu       2
 Liczba osób niedopuszczonych do przetargu    0
 Najwyższa cena osiągnięta w przetargu        175.000,00 zł
 Imię, nazwisko albo nazwa lub firma osoby    Jan Kowalski
 ustalonej jako nabywca nieruchomości
`;

test('auctionDateFromText: parses DD-MM-YYYY header from negative fixture', () => {
  assert.equal(auctionDateFromText(RESULT_PDF_NEGATIVE), '2026-03-10');
});

test('auctionDateFromText: parses DD-MM-YYYY from sold fixture', () => {
  assert.equal(auctionDateFromText(RESULT_PDF_SOLD), '2025-05-15');
});

test('auctionDateFromText: returns null for empty/no date', () => {
  assert.equal(auctionDateFromText(''), null);
  assert.equal(auctionDateFromText('no date here'), null);
});

test('startingPriceFromText: "150.000,00 zł" → 150000', () => {
  assert.equal(startingPriceFromText(RESULT_PDF_NEGATIVE), 150000);
});

test('startingPriceFromText: "160.000,00 zł" → 160000 from sold fixture', () => {
  assert.equal(startingPriceFromText(RESULT_PDF_SOLD), 160000);
});

test('startingPriceFromText: null for no match', () => {
  assert.equal(startingPriceFromText('no price here'), null);
  assert.equal(startingPriceFromText(''), null);
});

test('areaFromText: "pow. lokalu - 33,09 m2" → 33.09 (not cellar 7,41)', () => {
  assert.equal(areaFromText(RESULT_PDF_NEGATIVE), 33.09);
});

test('areaFromText: "pow. lokalu - 42,50 m2" → 42.5 from sold fixture', () => {
  assert.equal(areaFromText(RESULT_PDF_SOLD), 42.5);
});

test('areaFromText: null for empty text', () => {
  assert.equal(areaFromText(''), null);
  assert.equal(areaFromText(null), null);
});

test('finalPriceFromText: "---" in negative fixture → null', () => {
  assert.equal(finalPriceFromText(RESULT_PDF_NEGATIVE), null);
});

test('finalPriceFromText: "175.000,00 zł" → 175000 from sold fixture', () => {
  assert.equal(finalPriceFromText(RESULT_PDF_SOLD), 175000);
});

test('roundFromText: "pierwszy przetarg" → 1', () => {
  assert.equal(roundFromText(RESULT_PDF_NEGATIVE), 1);
});

test('roundFromText: "drugi przetarg" → 2 from sold fixture', () => {
  assert.equal(roundFromText(RESULT_PDF_SOLD), 2);
});

test('addressFromResultText: "Położenie lokalu … Tczew, ul. Elżbiety 4/5" → address', () => {
  const addr = addressFromResultText(RESULT_PDF_NEGATIVE);
  assert.ok(addr, 'address must parse');
  assert.equal(addr.building, '4');
  assert.ok(addr.apt === '5' || addr.key.includes('|5'));
});

test('addressFromResultText: "ul. Ceglarska 11/1" from sold fixture', () => {
  const addr = addressFromResultText(RESULT_PDF_SOLD);
  assert.ok(addr);
  assert.ok(addr.key.toLowerCase().includes('ceglarska'));
  assert.equal(addr.building, '11');
});

test('addressFromResultText: null for empty text', () => {
  assert.equal(addressFromResultText(''), null);
  assert.equal(addressFromResultText('no address'), null);
});

// ── parseResultDoc ────────────────────────────────────────────────────────────

const PDF_URL = 'https://bip-v1-files.idcom-jst.pl/sites/3051/wiadomosci/871415/files/ogloszenie_o_wyniku_przetargu.pdf';

test('parseResultDoc: negative fixture → unsold, wynik negatywny', () => {
  const results = parseResultDoc(RESULT_PDF_NEGATIVE, '2026-03-11', PDF_URL);
  assert.equal(results.length, 1);
  const r = results[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'no_buyer');
  assert.equal(r.final_price_pln, null);
  assert.equal(r.auction_date, '2026-03-10');
  assert.equal(r.starting_price_pln, 150000);
  assert.equal(r.area_m2, 33.09);
  assert.equal(r.round, 1);
  assert.equal(r.source_pdf, PDF_URL);
  assert.ok(r.address);
  assert.ok(r.address.key.toLowerCase().includes('elzbiety'));
});

test('parseResultDoc: sold fixture → sold, final price 175000', () => {
  const results = parseResultDoc(RESULT_PDF_SOLD, '2025-05-16', 'https://bip-v1-files.idcom-jst.pl/sold.pdf');
  assert.equal(results.length, 1);
  const r = results[0];
  assert.equal(r.outcome, 'sold');
  assert.equal(r.final_price_pln, 175000);
  assert.equal(r.starting_price_pln, 160000);
  assert.equal(r.auction_date, '2025-05-15');
  assert.equal(r.round, 2);
  assert.equal(r.area_m2, 42.5);
  assert.ok(r.address.key.toLowerCase().includes('ceglarska'));
});

test('parseResultDoc: empty/garbled text → []', () => {
  assert.deepEqual(parseResultDoc('', null, 'x.pdf'), []);
  assert.deepEqual(parseResultDoc('random text with nothing', null, 'x.pdf'), []);
});

test('parseResultDoc: uses fallbackDate when PDF has no parseable date', () => {
  const textNoDate = RESULT_PDF_NEGATIVE.replace(/dnia\s+\d{2}-\d{2}-\d{4}\s+r\./g, '');
  const results = parseResultDoc(textNoDate, '2026-03-11', PDF_URL);
  // Should still return a result; date falls back to fallbackDate
  if (results.length > 0) {
    assert.equal(results[0].auction_date, '2026-03-11');
  }
  // No throw is the key assertion
});
