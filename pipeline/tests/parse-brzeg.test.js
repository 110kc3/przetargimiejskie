// Brzeg parser tests — groundtruthed against REAL fixtures (2026-06-27).
//
// Fixture sources (live-verified):
//
//   LISTING PAGE (brzeg.pl/gminne-nieruchomosci-do-sprzedazy/):
//     Three active flat entries confirmed on 2026-06-27 (stale from 2024 but
//     still published):
//       nr 1 at 3 Maja 1 — 97 000 zł, I przetarg, 18.09.2024
//       nr 2 at 3 Maja 1 — 99 000 zł, I przetarg, 18.09.2024
//       nr 4 at 3 Maja 1 — 220 000 zł, I przetarg, 18.09.2024
//     BIP links: bip.brzeg.pl/przetargi,9_1-2024-7_72 / _73 / _74
//
//   BIP ITEM PAGE (bip.brzeg.pl/przetargi,9_1-2024-7_72):
//     Title: "I ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego
//             nr1 przy ulicy 3 Maja 1"
//     Attachments (verified via read_page 2026-06-27):
//       /uploaded_files/serwis_files/attachments/przetargi/72/82c0ff4b0b18f6fc.pdf
//         → "Ogłoszenie I-ego przetargu -3 Maja 1-1" (305 KB)
//       /uploaded_files/serwis_files/attachments/przetargi/72/e05fe2a15b3fca80.pdf
//         → "Informacja o wyniku I-go przetargu - 3 Maja 1-1" (200 KB)
//     Metadata: Data wytworzenia: 01.07.2024
//
//   BIP MONTH INDEX (bip.brzeg.pl/przetargi,9_1-2026-4 — April 2026):
//     8 flat items listed; all linked to /archiwum,7_5_NNN (already archived)
//     Jan 2026 similarly archived. May 2026 has only działki.
//     Active (non-archived) items appear as /przetargi,9_1-YYYY-M_NNN.
//
//   RESULT PDF TEXT: Not fetched live (PDF behind MegaBIP attachment URL).
//   parseResultDoc is tested against a synthetic fixture matching the standard
//   Polish "Informacja o wynikach przetargu" template.  VALIDATE on first CI run.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parsePLN,
  parseDateText,
  roundFromTitle,
  parseListingPage,
  parseBipIndexMonth,
  parseBipItemPage,
  parseResultDoc,
} from '../src/cities/brzeg/parse.js';

// ---------------------------------------------------------------------------
// parsePLN
// ---------------------------------------------------------------------------

test('parsePLN: "97 000,00 zł" → 97000', () => {
  assert.equal(parsePLN('97 000,00'), 97000);
});

test('parsePLN: "220 000,00" → 220000', () => {
  assert.equal(parsePLN('220 000,00'), 220000);
});

test('parsePLN: bare integer "99000" → 99000', () => {
  assert.equal(parsePLN('99000'), 99000);
});

test('parsePLN: null/empty → null', () => {
  assert.equal(parsePLN(null), null);
  assert.equal(parsePLN(''), null);
});

// ---------------------------------------------------------------------------
// parseDateText
// ---------------------------------------------------------------------------

test('parseDateText: "18.09. 2024" (space after dot) → 2024-09-18', () => {
  assert.equal(parseDateText('18.09. 2024 r., godz. 9.00'), '2024-09-18');
});

test('parseDateText: "18.09.2024" → 2024-09-18', () => {
  assert.equal(parseDateText('18.09.2024'), '2024-09-18');
});

test('parseDateText: "18 września 2024" → 2024-09-18', () => {
  assert.equal(parseDateText('18 września 2024'), '2024-09-18');
});

test('parseDateText: null → null', () => {
  assert.equal(parseDateText(null), null);
  assert.equal(parseDateText(''), null);
});

// ---------------------------------------------------------------------------
// roundFromTitle
// ---------------------------------------------------------------------------

test('roundFromTitle: "I ustny…" → 1', () => {
  assert.equal(roundFromTitle('I ustny przetarg nieograniczony na sprzedaż lokalu…'), 1);
});

test('roundFromTitle: "II ustny…" → 2', () => {
  assert.equal(roundFromTitle('II ustny przetarg nieograniczony na sprzedaż…'), 2);
});

test('roundFromTitle: "III ustny…" → 3', () => {
  assert.equal(roundFromTitle('III ustny przetarg nieograniczony'), 3);
});

test('roundFromTitle: empty → 1 (default)', () => {
  assert.equal(roundFromTitle(''), 1);
  assert.equal(roundFromTitle(null), 1);
});

// ---------------------------------------------------------------------------
// parseListingPage — fixture from live brzeg.pl page 2026-06-27
// ---------------------------------------------------------------------------

// Minimal HTML reproducing the structure of the live WordPress page.
// Three entries confirmed live on 2026-06-27.
const LISTING_HTML = `
<div class="entry-content">
<h2>Lokal mieszkalny nr 1 przy ulicy 3 Maja 1</h2>
<p>Lokal mieszkalny o pow. 43,14 m2, parter, 2 pokoje, kuchnia, przedpokój, łazienka z wc.</p>
<p>Cena: 97 000,00 zł</p>
<p>Tryb sprzedaży: I przetarg</p>
<p>Wadium: 9 700,00 zł</p>
<p>Termin wpłaty wadium: 12.09.2024 rok</p>
<p>Termin przetargu: 18.09. 2024 r., godz. 9.00</p>
<p>Kontakt w sprawie przetargu 77 416 04 26; geodezja@brzeg.pl</p>
<p>Pokaż pełne ogłoszenie: https://bip.brzeg.pl/przetargi,9_1-2024-7_72</p>

<h2>Lokal mieszkalny nr 2 przy ulicy 3 Maja 1</h2>
<p>Lokal mieszkalny o pow. 47,32 m2, I piętro.</p>
<p>Cena: 99 000,00 zł</p>
<p>Tryb sprzedaży: I przetarg</p>
<p>Termin przetargu: 18.09. 2024 r., godz. 9.40</p>
<p>Pokaż pełne ogłoszenie https://bip.brzeg.pl/przetargi,9_1-2024-7_73</p>

<h2>Lokal mieszkalny nr 4 przy ulicy 3 Maja 1</h2>
<p>Lokal mieszkalny o pow. 54,03 m2, III piętro.</p>
<p>Cena: 220 000,00 zł</p>
<p>Tryb sprzedaży: I przetarg</p>
<p>Termin przetargu: 18.09. 2024 r., godz. 10.30</p>
<p>Pokaż pełne ogłoszenie: https://bip.brzeg.pl/przetargi,9_1-2024-7_74</p>
</div>
`;

test('parseListingPage: finds 3 listings from fixture', () => {
  const listings = parseListingPage(LISTING_HTML);
  assert.equal(listings.length, 3, `expected 3 but got ${listings.length}`);
});

test('parseListingPage: all kind=mieszkalny', () => {
  const listings = parseListingPage(LISTING_HTML);
  for (const l of listings) assert.equal(l.kind, 'mieszkalny');
});

test('parseListingPage: first listing — address key includes "3 maja|1|1"', () => {
  const listings = parseListingPage(LISTING_HTML);
  const l = listings[0];
  assert.ok(l.address, 'address must be parsed');
  assert.ok(/maja/i.test(l.address.street_norm), `street_norm: ${l.address.street_norm}`);
  assert.equal(l.address.building, '1');
  assert.equal(l.address.apt, '1');
});

test('parseListingPage: first listing — starting_price_pln 97000', () => {
  const listings = parseListingPage(LISTING_HTML);
  assert.equal(listings[0].starting_price_pln, 97000);
});

test('parseListingPage: third listing — starting_price_pln 220000', () => {
  const listings = parseListingPage(LISTING_HTML);
  assert.equal(listings[2].starting_price_pln, 220000);
});

test('parseListingPage: auction_date 2024-09-18', () => {
  const listings = parseListingPage(LISTING_HTML);
  assert.equal(listings[0].auction_date, '2024-09-18');
});

test('parseListingPage: round 1 for "I przetarg"', () => {
  const listings = parseListingPage(LISTING_HTML);
  assert.equal(listings[0].round, 1);
});

test('parseListingPage: BIP URL extracted for first listing', () => {
  const listings = parseListingPage(LISTING_HTML);
  assert.ok(
    listings[0].bip_url?.includes('bip.brzeg.pl/przetargi,9_1-2024-7_72'),
    `bip_url: ${listings[0].bip_url}`,
  );
});

test('parseListingPage: second listing — apt=2, building=1', () => {
  const listings = parseListingPage(LISTING_HTML);
  const l = listings[1];
  assert.equal(l.address.building, '1');
  assert.equal(l.address.apt, '2');
});

test('parseListingPage: empty HTML returns empty array', () => {
  assert.deepEqual(parseListingPage(''), []);
  assert.deepEqual(parseListingPage('<html><body>nothing</body></html>'), []);
});

// ---------------------------------------------------------------------------
// parseBipIndexMonth — BIP month-index page (2026-01 structure live-verified)
// ---------------------------------------------------------------------------

// Minimal HTML reproducing the active-item link structure.
// Active items: href="/przetargi,9_1-YYYY-M_NNN"
// Archived items: href="/archiwum,7_5_NNN"  (must be excluded)
const BIP_MONTH_HTML = `
<div class="content">
  <!-- Active item (should be collected) -->
  <a href="/przetargi,9_1-2024-7_72">I ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego nr1 przy ulicy 3 Maja 1</a>
  <!-- Another active item -->
  <a href="/przetargi,9_1-2024-7_73">I ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego nr2 przy ulicy 3 Maja 1</a>
  <!-- Archived item — must NOT be collected -->
  <a href="/archiwum,7_5_92">I ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego nr 1 przy Rynku 4</a>
  <!-- Land sale active — will be filtered in crawl, not parse -->
  <a href="/przetargi,9_1-2026-5_103">I ustny przetarg na sprzedaż niezabudowanej działki nr 242/43</a>
</div>
`;

test('parseBipIndexMonth: collects active /przetargi,9_1-… links only', () => {
  const items = parseBipIndexMonth(BIP_MONTH_HTML);
  assert.equal(items.length, 3, 'should have 3 active items (2 flats + 1 land); archives excluded');
  for (const it of items) {
    assert.ok(it.url.includes('/przetargi,9_1-'), `unexpected URL: ${it.url}`);
  }
});

test('parseBipIndexMonth: URLs are absolute bip.brzeg.pl URLs', () => {
  const items = parseBipIndexMonth(BIP_MONTH_HTML);
  for (const it of items) {
    assert.ok(it.url.startsWith('https://bip.brzeg.pl/'), `not absolute: ${it.url}`);
  }
});

test('parseBipIndexMonth: title extracted from link text', () => {
  const items = parseBipIndexMonth(BIP_MONTH_HTML);
  assert.ok(/3 Maja 1/i.test(items[0].title), `title: ${items[0].title}`);
});

test('parseBipIndexMonth: deduplicates repeated links', () => {
  const dupeHtml = BIP_MONTH_HTML + `
    <a href="/przetargi,9_1-2024-7_72">duplicate link</a>
  `;
  const items = parseBipIndexMonth(dupeHtml);
  assert.equal(items.filter((i) => i.url.includes('_72')).length, 1);
});

test('parseBipIndexMonth: empty HTML → empty array', () => {
  assert.deepEqual(parseBipIndexMonth(''), []);
});

// ---------------------------------------------------------------------------
// parseBipItemPage — BIP item page (live-verified structure 2026-06-27)
// ---------------------------------------------------------------------------

// Minimal HTML reproducing the real structure of bip.brzeg.pl/przetargi,9_1-2024-7_72
// (verified via read_page + get_page_text on 2026-06-27).
const BIP_ITEM_HTML = `<!DOCTYPE html><html><body>
<nav>
  <a href="/przetargi,9">Przetargi</a>
  <a href="/przetargi,9_1">Przetarg ustny nieograniczony</a>
  <a href="/przetargi,9_1-2024">2024</a>
  <a href="/przetargi,9_1-2024-7">Lipiec</a>
</nav>
<h1>I ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego nr1 przy ulicy 3 Maja 1</h1>
<table>
  <tr>
    <td>1</td>
    <td><a href="/uploaded_files/serwis_files/attachments/przetargi/72/82c0ff4b0b18f6fc.pdf">Ogłoszenie I-ego przetargu -3 Maja 1-1</a></td>
    <td>305 KB</td>
  </tr>
  <tr>
    <td>2</td>
    <td><a href="/uploaded_files/serwis_files/attachments/przetargi/72/2a1776029c293d1e.jpg">IMG-20240509-WA0001</a></td>
    <td>255 KB</td>
  </tr>
  <tr>
    <td>3</td>
    <td><a href="/uploaded_files/serwis_files/attachments/przetargi/72/e05fe2a15b3fca80.pdf">Informacja o wyniku I-go przetargu - 3 Maja 1-1</a></td>
    <td>200 KB</td>
  </tr>
</table>
<div class="metadata">
  <p>Podmiot udostępniający: Gmina Brzeg</p>
  <p>Nazwa: I ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego nr1 przy ulicy 3 Maja 1</p>
  <p>Data wytworzenia informacji: 01.07.2024 08:16:43</p>
</div>
</body></html>`;

const BIP_ITEM_URL = 'https://bip.brzeg.pl/przetargi,9_1-2024-7_72';

test('parseBipItemPage: returns non-null for valid item HTML', () => {
  const r = parseBipItemPage(BIP_ITEM_HTML, BIP_ITEM_URL);
  assert.ok(r, 'should return a result object');
});

test('parseBipItemPage: announcement PDF URL extracted', () => {
  const r = parseBipItemPage(BIP_ITEM_HTML, BIP_ITEM_URL);
  assert.ok(
    r.announcementPdf?.includes('82c0ff4b0b18f6fc.pdf'),
    `announcementPdf: ${r.announcementPdf}`,
  );
});

test('parseBipItemPage: result PDF URL extracted (Informacja o wyniku)', () => {
  const r = parseBipItemPage(BIP_ITEM_HTML, BIP_ITEM_URL);
  assert.ok(
    r.resultPdf?.includes('e05fe2a15b3fca80.pdf'),
    `resultPdf: ${r.resultPdf}`,
  );
});

test('parseBipItemPage: result PDF URL is absolute', () => {
  const r = parseBipItemPage(BIP_ITEM_HTML, BIP_ITEM_URL);
  assert.ok(r.resultPdf?.startsWith('https://bip.brzeg.pl/'), `not absolute: ${r.resultPdf}`);
});

test('parseBipItemPage: published date from "Data wytworzenia" → 2024-07-01', () => {
  const r = parseBipItemPage(BIP_ITEM_HTML, BIP_ITEM_URL);
  assert.equal(r.publishedDate, '2024-07-01');
});

test('parseBipItemPage: null HTML → null', () => {
  assert.equal(parseBipItemPage(null, BIP_ITEM_URL), null);
});

test('parseBipItemPage: item without Informacja o wyniku PDF → resultPdf is null', () => {
  const noResultHtml = `<html><body>
  <h1>I ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego nr5</h1>
  <a href="/uploaded_files/serwis_files/attachments/przetargi/80/abc123.pdf">Ogłoszenie przetargu</a>
  <p>Data wytworzenia informacji: 15.04.2026 10:00:00</p>
  </body></html>`;
  const r = parseBipItemPage(noResultHtml, 'https://bip.brzeg.pl/przetargi,9_1-2026-4_80');
  assert.ok(r, 'should still return a result');
  assert.equal(r.resultPdf, null);
  assert.ok(r.announcementPdf?.includes('abc123.pdf'));
});

// ---------------------------------------------------------------------------
// parseResultDoc — synthetic fixture matching Polish result-notice template.
// NOTE: not verified against a live PDF — validate on first CI refresh.
// ---------------------------------------------------------------------------

// Standard Polish "Informacja o wynikach przetargu" text template.
// Modelled after: bip.brzeg.pl przetargi ID 72 result PDF (200 KB, attached).
const RESULT_TEXT_SOLD = `
Burmistrz Miasta Brzegu informuje, że w dniu 18 września 2024 roku
o godz. 9.00 w siedzibie Urzędu Miasta w Brzegu odbył się
I ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego nr 1
położonego w Brzegu przy ulicy 3 Maja 1.

Cena wywoławcza: 97 000,00 zł
Cena osiągnięta: 103 500,00 zł

Nabywcą lokalu został Jan Kowalski, zam. Brzeg.
`;

const RESULT_URL_SOLD = 'https://bip.brzeg.pl/uploaded_files/serwis_files/attachments/przetargi/72/e05fe2a15b3fca80.pdf';

test('parseResultDoc (sold): returns exactly 1 record', () => {
  const recs = parseResultDoc(RESULT_TEXT_SOLD, '2024-09-18', RESULT_URL_SOLD);
  assert.equal(recs.length, 1);
});

test('parseResultDoc (sold): kind is mieszkalny', () => {
  const recs = parseResultDoc(RESULT_TEXT_SOLD, '2024-09-18', RESULT_URL_SOLD);
  assert.equal(recs[0].kind, 'mieszkalny');
});

test('parseResultDoc (sold): address — 3 Maja 1/1', () => {
  const recs = parseResultDoc(RESULT_TEXT_SOLD, '2024-09-18', RESULT_URL_SOLD);
  const r = recs[0];
  assert.ok(r.address, 'address must be parsed');
  assert.ok(/maja/i.test(r.address.street_norm), `street_norm: ${r.address.street_norm}`);
  assert.equal(r.address.building, '1');
  assert.equal(r.address.apt, '1');
});

test('parseResultDoc (sold): starting_price_pln 97000', () => {
  const recs = parseResultDoc(RESULT_TEXT_SOLD, '2024-09-18', RESULT_URL_SOLD);
  assert.equal(recs[0].starting_price_pln, 97000);
});

test('parseResultDoc (sold): final_price_pln 103500 (Cena osiągnięta)', () => {
  const recs = parseResultDoc(RESULT_TEXT_SOLD, '2024-09-18', RESULT_URL_SOLD);
  assert.equal(recs[0].final_price_pln, 103500);
});

test('parseResultDoc (sold): outcome is sold', () => {
  const recs = parseResultDoc(RESULT_TEXT_SOLD, '2024-09-18', RESULT_URL_SOLD);
  assert.equal(recs[0].outcome, 'sold');
  assert.equal(recs[0].unsold_reason, null);
});

test('parseResultDoc (sold): auction_date from text 2024-09-18', () => {
  const recs = parseResultDoc(RESULT_TEXT_SOLD, null, RESULT_URL_SOLD);
  assert.equal(recs[0].auction_date, '2024-09-18');
});

test('parseResultDoc (sold): source_pdf is the PDF URL', () => {
  const recs = parseResultDoc(RESULT_TEXT_SOLD, '2024-09-18', RESULT_URL_SOLD);
  assert.equal(recs[0].source_pdf, RESULT_URL_SOLD);
});

// Unsold / wynik negatywny
const RESULT_TEXT_UNSOLD = `
Burmistrz Miasta Brzegu informuje, że w dniu 10.04.2026 roku
o godz. 10.00 odbył się II ustny przetarg nieograniczony na sprzedaż
lokalu mieszkalnego nr 9 położonego w Brzegu przy ulicy Rybackiej 23.

Cena wywoławcza: 85 000,00 zł

Przetarg zakończył się wynikiem negatywnym — nikt nie przystąpił do przetargu.
`;

const RESULT_URL_UNSOLD = 'https://bip.brzeg.pl/uploaded_files/serwis_files/attachments/przetargi/80/abc_wynik.pdf';

test('parseResultDoc (unsold): 1 record, outcome=unsold', () => {
  const recs = parseResultDoc(RESULT_TEXT_UNSOLD, '2026-04-10', RESULT_URL_UNSOLD);
  assert.equal(recs.length, 1);
  assert.equal(recs[0].outcome, 'unsold');
  assert.equal(recs[0].final_price_pln, null);
});

test('parseResultDoc (unsold): starting_price_pln 85000', () => {
  const recs = parseResultDoc(RESULT_TEXT_UNSOLD, '2026-04-10', RESULT_URL_UNSOLD);
  assert.equal(recs[0].starting_price_pln, 85000);
});

test('parseResultDoc (unsold): address — Rybacka 23/9', () => {
  const recs = parseResultDoc(RESULT_TEXT_UNSOLD, '2026-04-10', RESULT_URL_UNSOLD);
  const r = recs[0];
  assert.ok(r.address, 'address must be parsed');
  assert.ok(/ryback/i.test(r.address.street_norm), `street_norm: ${r.address.street_norm}`);
  assert.equal(r.address.building, '23');
  assert.equal(r.address.apt, '9');
});

test('parseResultDoc (unsold): fallback date used when text has no date', () => {
  const noDateText = `
  Burmistrz informuje, że odbył się przetarg na sprzedaż lokalu mieszkalnego
  nr 5 przy ulicy Testowej 7. Cena wywoławcza: 50 000,00 zł.
  Wynik negatywny.
  `;
  const recs = parseResultDoc(noDateText, '2026-01-15', 'https://example.com');
  assert.equal(recs.length, 1);
  assert.equal(recs[0].auction_date, '2026-01-15');
});

test('parseResultDoc: non-result text (no "informacja o wyniku") → empty array', () => {
  assert.deepEqual(
    parseResultDoc('To jest ogłoszenie przetargu na sprzedaż lokalu.', null, 'https://example.com'),
    [],
  );
});

test('parseResultDoc: empty/null → empty array', () => {
  assert.deepEqual(parseResultDoc('', null, 'https://example.com'), []);
  assert.deepEqual(parseResultDoc(null, null, 'https://example.com'), []);
});

// Land result notices must be filtered out (Brzeg also sells działki on the same BIP board)
test('parseResultDoc: grunt/działka result → empty array', () => {
  const gruntyText = `
  Burmistrz informuje, że w dniu 20 maja 2026 roku odbył się przetarg
  ustny nieograniczony na sprzedaż niezabudowanej działki nr 242/43
  przy ul. Czereśniowej w Brzegu.
  Cena wywoławcza: 45 000,00 zł.
  Cena osiągnięta: 51 000,00 zł.
  informacja o wyniku przetargu.
  `;
  const recs = parseResultDoc(gruntyText, '2026-05-20', 'https://example.com');
  // Grunt results are excluded — only flat results are within adapter scope
  assert.equal(recs.length, 0, 'grunt result should be filtered out');
});
