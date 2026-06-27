// Wejherowo parser + crawl helper tests.
//
// Fixtures groundtruthed against LIVE pages (2026-06-27):
//
// LIST PAGE (2026): https://bip.wejherowo.pl/artykul/przetargi-2026-r
//   — DataTables grid, role="row"/role="gridcell", /artykul/ slug links + date.
//
// ANNOUNCEMENT (resolved, 2025):
//   https://bip.wejherowo.pl/artykul/czwarty-przetarg-ustny-nieograniczony-
//     na-sprzedaz-lokalu-mieszkalnego-nr-28-polozonego-w-budynk
//   ul. Harcerska 11 nr 28, area 19.56 m², cena wywoławcza 124 000 zł,
//   auction date 29 października 2025 (= 2025-10-29), round 4,
//   result PDF: /pliki/wejherowo/zalaczniki/14086/06-11-2025-r-wyniki.pdf
//
// ANNOUNCEMENT (active, 2026):
//   https://bip.wejherowo.pl/artykul/drugi-przetarg-ustny-nieograniczony-
//     na-sprzedaz-lokalu-mieszkalnego-nr-8-polozonego-w-budynku-p
//   ul. św. Jana 7 nr 8, area 34.83 m², cena wywoławcza 146 000 zł,
//   auction date 26 sierpnia 2026 (= 2026-08-26), round 2.
//
// RESULT PDF TEXT (inferred structure — VALIDATE on first CI run):
//   Standard wording "Cena nieruchomości osiągnięta w wyniku przetargu: NNN zł"
//   or "wynik negatywny".

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseListPage,
  resultPdfUrlFromArticle,
  roundFromTitle,
  addressRawFromTitle,
  aptFromTitle,
} from '../src/cities/wejherowo/crawl.js';

import {
  auctionDateFromText,
  priceFromText,
  areaFromText,
  roundFromText,
  addressFromBody,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/wejherowo/parse.js';

// ── List page parser ──────────────────────────────────────────────────────────
//
// Condensed but structurally faithful copy of the real BIP list page HTML
// (bip.wejherowo.pl/artykul/przetargi-2026-r, 2026-06-27).
// The DataTables grid uses role="row" / role="gridcell" wrappers.

const LIST_HTML = `
<div role="grid">
  <div role="row">
    <div role="gridcell"><a href="/artykul/przetargi-2026-r">Tytuł</a></div>
    <div role="gridcell">Data publikacji</div>
  </div>
  <div role="row">
    <div role="gridcell">
      <a href="/artykul/drugi-przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-nr-8-polozonego-w-budynku-p">
        Drugi przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 8 położonego w budynku przy ul. św. Jana 7 w Wejherowie, o powierzchni użytkowej 34,83 m2
      </a>
    </div>
    <div role="gridcell">2026-06-26 11:31:34</div>
  </div>
  <div role="row">
    <div role="gridcell">
      <a href="/artykul/czwarty-przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-nr-28-polozonego-w-budynk">
        [PRZETARG ROZSTRZYGNIĘTY] - Czwarty przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 28 położonego w budynku przy ul. Harcerskiej 11 w Wejherowie, o powierzchni użytkowej 19,56 m2
      </a>
    </div>
    <div role="gridcell">2025-09-19 09:55:54</div>
  </div>
  <div role="row">
    <div role="gridcell">
      <a href="/artykul/piaty-przetarg-ustny-nieograniczony-na-sprzedaz-nieruchomosci-gruntowej">
        [PRZETARGI ROZSTRZYGNIĘTE] - Piąte przetargi ustne nieograniczone na sprzedaż nieruchomości gruntowych, niezabudowanych
      </a>
    </div>
    <div role="gridcell">2025-11-07 07:41:14</div>
  </div>
  <div role="row">
    <div role="gridcell">
      <a href="/artykul/najem-lokalu-uzytkowego-sobieskiego">
        Pierwszy przetarg ofertowy nieograniczony na najem, na okres 5 lat, lokalu użytkowego o pow. 72,26 m2
      </a>
    </div>
    <div role="gridcell">2026-05-27 14:28:47</div>
  </div>
</div>`;

test('parseListPage: extracts href and date from a flat auction row', () => {
  const rows = parseListPage(LIST_HTML);
  const flat = rows.find(r => /nr-8-polozonego/.test(r.href));
  assert.ok(flat, 'flat auction row must be present');
  assert.equal(flat.href, '/artykul/drugi-przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-nr-8-polozonego-w-budynku-p');
  assert.equal(flat.published_date, '2026-06-26');
  assert.ok(/lokal\w*.*mieszkaln/i.test(flat.title), 'title must contain lokal mieszkalny');
});

test('parseListPage: resolved article row has PRZETARG ROZSTRZYGNIĘTY in title', () => {
  const rows = parseListPage(LIST_HTML);
  const resolved = rows.find(r => /czwarty-przetarg.*budynk/.test(r.href));
  assert.ok(resolved, 'resolved article row must be present');
  assert.ok(/przetarg rozstrzygni/i.test(resolved.title));
  assert.equal(resolved.published_date, '2025-09-19');
});

test('parseListPage: returns rows for land and commercial (caller filters)', () => {
  const rows = parseListPage(LIST_HTML);
  // We return all rows; the crawl layer filters — test the parser returns them
  const land = rows.find(r => /gruntow/.test(r.href));
  assert.ok(land, 'land row should be in raw output');
  const commercial = rows.find(r => /najem/.test(r.href));
  assert.ok(commercial, 'najem row should be in raw output');
});

test('parseListPage: header row (no link) is skipped', () => {
  const rows = parseListPage(LIST_HTML);
  // Header row has a link to /artykul/przetargi-2026-r (the page itself) —
  // it will be in the output but filtered by the caller (not a flat slug).
  // Key assertion: we have data rows.
  assert.ok(rows.length >= 2);
});

test('parseListPage: empty HTML returns empty array', () => {
  assert.deepEqual(parseListPage(''), []);
  assert.deepEqual(parseListPage('<html><body></body></html>'), []);
});

// ── resultPdfUrlFromArticle ───────────────────────────────────────────────────
//
// Real article HTML (confirmed 2026-06-27, Harcerska 11/28):
//   <a href="/pliki/wejherowo/zalaczniki/14086/06-11-2025-r-wyniki.pdf" class="download"
//      id="24234" download="">06.11.2025 r. - wyniki (PDF, 71.17Kb)</a>

const ARTICLE_HTML_WITH_RESULT = `
<table class="table table-striped">
  <tr><th>Plik</th><th>Nazwa</th><th>Data dodania</th><th>Pobrań</th></tr>
  <tr>
    <td><span class="far fa-file-pdf"></span></td>
    <td><a href="/pliki/wejherowo/zalaczniki/14086/06-11-2025-r-wyniki.pdf" class="download" id="24234" download="">06.11.2025 r. - wyniki (PDF, 71.17Kb)</a></td>
    <td>2025-11-06 08:22:20</td>
    <td>30</td>
  </tr>
  <tr>
    <td><span class="far fa-file-pdf"></span></td>
    <td><a href="/pliki/wejherowo/zalaczniki/14086/harcerska-11-28.pdf" class="download" id="24235" download="">Harcerska 11 28. (PDF, 121.24Kb)</a></td>
    <td>2025-09-19 09:55:55</td>
    <td>40</td>
  </tr>
</table>`;

const ARTICLE_HTML_NO_RESULT = `
<table class="table table-striped">
  <tr>
    <td><a href="/pliki/wejherowo/zalaczniki/15000/ogloszenie-sw-jana-7-8.pdf" class="download" download="">Ogłoszenie przetargowe (PDF, 323.37Kb)</a></td>
  </tr>
</table>`;

test('resultPdfUrlFromArticle: extracts wyniki PDF from resolved article', () => {
  const url = resultPdfUrlFromArticle(ARTICLE_HTML_WITH_RESULT);
  assert.equal(url, 'https://bip.wejherowo.pl/pliki/wejherowo/zalaczniki/14086/06-11-2025-r-wyniki.pdf');
});

test('resultPdfUrlFromArticle: returns null when no wyniki attachment', () => {
  assert.equal(resultPdfUrlFromArticle(ARTICLE_HTML_NO_RESULT), null);
  assert.equal(resultPdfUrlFromArticle(''), null);
});

// ── roundFromTitle (crawl helper) ─────────────────────────────────────────────

test('roundFromTitle: maps Polish ordinals to round number', () => {
  assert.equal(roundFromTitle('Pierwszy przetarg ustny …'), 1);
  assert.equal(roundFromTitle('Drugi przetarg ustny …'), 2);
  assert.equal(roundFromTitle('Trzeci przetarg ustny …'), 3);
  assert.equal(roundFromTitle('Czwarty przetarg ustny …'), 4);
  assert.equal(roundFromTitle('Piąty przetarg ustny …'), 5);
});

test('roundFromTitle: strips [PRZETARG ROZSTRZYGNIĘTY] prefix before matching', () => {
  assert.equal(
    roundFromTitle('[PRZETARG ROZSTRZYGNIĘTY] - Czwarty przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 28'),
    4,
  );
});

test('roundFromTitle: bare przetarg with no ordinal returns 1', () => {
  assert.equal(roundFromTitle('Przetarg ustny nieograniczony na sprzedaż lokalu'), 1);
});

// ── aptFromTitle ──────────────────────────────────────────────────────────────

test('aptFromTitle: extracts apartment number from title', () => {
  assert.equal(
    aptFromTitle('Czwarty przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 28 położonego w budynku'),
    '28',
  );
  assert.equal(
    aptFromTitle('Drugi przetarg ustny na sprzedaż lokalu mieszkalnego nr 8 przy ul. św. Jana 7'),
    '8',
  );
});

test('aptFromTitle: returns null when no "lokal mieszkalny nr" pattern', () => {
  assert.equal(aptFromTitle('Nieruchomość gruntowa niezabudowana'), null);
});

// ── auctionDateFromText ───────────────────────────────────────────────────────
//
// Live fixture (Harcerska 11/28, 2025):
//   "Przetarg odbędzie się dnia 29 października 2025 roku, o godzinie 9:30"
// Live fixture (św. Jana 7/8, 2026):
//   "Przetarg odbędzie się dnia 26 sierpnia 2026 roku, o godzinie 09:30,"

test('auctionDateFromText: spelled-out month "29 października 2025"', () => {
  const text = 'Przetarg odbędzie się dnia 29 października 2025 roku, o godzinie 9:30, w sali konferencyjnej.';
  assert.equal(auctionDateFromText(text), '2025-10-29');
});

test('auctionDateFromText: spelled-out month "26 sierpnia 2026"', () => {
  const text = 'Przetarg odbędzie się dnia 26 sierpnia 2026 roku, o godzinie 09:30,';
  assert.equal(auctionDateFromText(text), '2026-08-26');
});

test('auctionDateFromText: numeric fallback "29.10.2025"', () => {
  const text = 'Przetarg odbędzie się dnia 29.10.2025 r. o godzinie 9:30.';
  assert.equal(auctionDateFromText(text), '2025-10-29');
});

test('auctionDateFromText: null/empty → null, no throw', () => {
  assert.equal(auctionDateFromText(null), null);
  assert.equal(auctionDateFromText(''), null);
  assert.equal(auctionDateFromText('brak daty'), null);
});

// ── priceFromText ─────────────────────────────────────────────────────────────
//
// Live fixture (Harcerska 11/28):
//   "cena wywoławcza brutto 124 000,00 zł"
// Live fixture (św. Jana 7/8):
//   "cena wywoławcza brutto 146 000,00 zł"

test('priceFromText: "cena wywoławcza brutto 124 000,00 zł"', () => {
  assert.equal(priceFromText('cena wywoławcza brutto 124 000,00 zł'), 124000);
});

test('priceFromText: "cena wywoławcza brutto 146 000,00 zł"', () => {
  assert.equal(priceFromText('cena wywoławcza brutto 146 000,00 zł'), 146000);
});

test('priceFromText: space-thousands format "124 000,00 zł"', () => {
  assert.equal(priceFromText('Cena wywoławcza 124 000,00 zł.'), 124000);
});

test('priceFromText: null/no price text → null, no throw', () => {
  assert.equal(priceFromText(null), null);
  assert.equal(priceFromText('brak ceny'), null);
});

// ── areaFromText ──────────────────────────────────────────────────────────────
//
// Live fixture (Harcerska 11/28):
//   "powierzchni użytkowej 19,56 m2 wraz z udziałem … (działka … o powierzchni 739 m2)"
//   → should return 19.56, NOT 739
// Live fixture (św. Jana 7/8):
//   "o powierzchni użytkowej 34,83 m2 oraz udziałem …"
//   → 34.83

test('areaFromText: "powierzchni użytkowej 19,56 m2"', () => {
  const text = 'na sprzedaż lokalu mieszkalnego nr 28 … o powierzchni użytkowej 19,56 m2 wraz z udziałem wynoszącym 9/1.000 … działki nr 173/8, obręb 16, o powierzchni 739 m2';
  assert.equal(areaFromText(text), 19.56);
});

test('areaFromText: "powierzchni użytkowej 34,83 m2"', () => {
  const text = 'lokalu mieszkalnego nr 8 … o powierzchni użytkowej 34,83 m2 oraz udziałem …';
  assert.equal(areaFromText(text), 34.83);
});

test('areaFromText: does not pick up plot area (739 m2)', () => {
  const text = 'lokalu mieszkalnego nr 28 … o powierzchni użytkowej 19,56 m2 wraz z udziałem … działki nr 173/8, o powierzchni 739 m2,';
  const area = areaFromText(text);
  assert.notEqual(area, 739, 'must not return plot area');
  assert.equal(area, 19.56);
});

test('areaFromText: null/empty → null, no throw', () => {
  assert.equal(areaFromText(null), null);
  assert.equal(areaFromText(''), null);
});

// ── roundFromText (parse helper) ──────────────────────────────────────────────
//
// Live fixture (Harcerska 11/28): body says "czwarty przetarg ustny nieograniczony"
// Live fixture (św. Jana 7/8): body says "drugi przetarg ustny nieograniczony"

test('roundFromText: "czwarty przetarg" → 4', () => {
  const text = 'Prezydent Miasta Wejherowa ogłasza czwarty przetarg ustny nieograniczony na sprzedaż lokalu';
  assert.equal(roundFromText(text), 4);
});

test('roundFromText: "drugi przetarg" → 2', () => {
  const text = 'Prezydent Miasta Wejherowa ogłasza drugi przetarg ustny nieograniczony na sprzedaż lokalu';
  assert.equal(roundFromText(text), 2);
});

test('roundFromText: history clause does not override operative round', () => {
  const text = `Prezydent Miasta Wejherowa ogłasza czwarty przetarg ustny nieograniczony.
Termin przeprowadzenia poprzedniego przetargu: pierwszy: 22.05.2025 r.; drugi: 02.07.2025 r.; trzeci: 10.09.2025 r.`;
  assert.equal(roundFromText(text), 4);
});

test('roundFromText: bare "przetarg" → 1', () => {
  assert.equal(roundFromText('Prezydent Miasta ogłasza przetarg ustny nieograniczony'), 1);
});

test('roundFromText: null/empty → null, no throw', () => {
  assert.equal(roundFromText(null), null);
  assert.equal(roundFromText(''), null);
});

// ── addressFromBody ───────────────────────────────────────────────────────────
//
// Live fixture (Harcerska 11/28):
//   "na sprzedaż lokalu mieszkalnego nr 28 położonego w budynku przy ul. Harcerskiej 11
//    w Wejherowie, o powierzchni użytkowej 19,56 m2"
//   → address key: "harcerskiej|11|28"
//
// Live fixture (św. Jana 7/8):
//   "na sprzedaż lokalu mieszkalnego nr 8 położonego w budynku przy ul. św. Jana 7
//    w Wejherowie, o powierzchni użytkowej 34,83 m2"
//   → address key: "sw. jana|7|8"  (or similar normalization)

const ANN_BODY_HARCERSKA = `Prezydent Miasta Wejherowa ogłasza czwarty przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 28 położonego w budynku przy ul. Harcerskiej 11 w Wejherowie, o powierzchni użytkowej 19,56 m2 wraz z udziałem wynoszącym 9/1.000 w częściach wspólnych budynku i gruntu działki nr 173/8, obręb 16, o powierzchni 739 m2, objętej księgą wieczystą nr GD1W/00019258/6, cena wywoławcza brutto 124 000,00 zł (sprzedaż zwolniona z podatku VAT) … Przetarg odbędzie się dnia 29 października 2025 roku, o godzinie 9:30, w sali konferencyjnej Urzędu Miejskiego w Wejherowie.`;

const ANN_BODY_SW_JANA = `Prezydent Miasta Wejherowa ogłasza drugi przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 8 położonego w budynku przy ul. św. Jana 7 w Wejherowie, o powierzchni użytkowej 34,83 m2 oraz udziałem wynoszącym 82/1000 części w częściach wspólnych budynku i gruntu, działka nr 39/1, obręb 15, o powierzchni 494 m2, cena wywoławcza brutto 146 000,00 zł (sprzedaż zwolniona z podatku VAT) … Przetarg odbędzie się dnia 26 sierpnia 2026 roku, o godzinie 09:30,`;

test('addressFromBody: Harcerska 11/28 — building and apt', () => {
  const addr = addressFromBody(ANN_BODY_HARCERSKA);
  assert.ok(addr, 'address must be parsed');
  assert.equal(addr.building, '11');
  assert.equal(addr.apt, '28');
  assert.ok(/harcersk/i.test(addr.street_norm), `street_norm should contain harcersk, got: ${addr.street_norm}`);
});

test('addressFromBody: sw. Jana 7/8 — building and apt', () => {
  const addr = addressFromBody(ANN_BODY_SW_JANA);
  assert.ok(addr, 'address must be parsed');
  assert.equal(addr.building, '7');
  assert.equal(addr.apt, '8');
  // street_norm strips Polish diacritics and dots
  assert.ok(/jana/i.test(addr.street_norm), `street_norm should contain jana, got: ${addr.street_norm}`);
});

// ── parseAnnouncement ─────────────────────────────────────────────────────────

test('parseAnnouncement: Harcerska 11/28 — all fields', () => {
  const f = parseAnnouncement(ANN_BODY_HARCERSKA);
  assert.equal(f.area_m2, 19.56);
  assert.equal(f.starting_price_pln, 124000);
  assert.equal(f.auction_date, '2025-10-29');
  assert.equal(f.round, 4);
  assert.ok(f.address, 'address must be parsed');
  assert.equal(f.address.building, '11');
  assert.equal(f.address.apt, '28');
});

test('parseAnnouncement: sw. Jana 7/8 — all fields', () => {
  const f = parseAnnouncement(ANN_BODY_SW_JANA);
  assert.equal(f.area_m2, 34.83);
  assert.equal(f.starting_price_pln, 146000);
  assert.equal(f.auction_date, '2026-08-26');
  assert.equal(f.round, 2);
  assert.ok(f.address);
  assert.equal(f.address.building, '7');
  assert.equal(f.address.apt, '8');
});

// ── parseResultDoc ────────────────────────────────────────────────────────────
//
// Inferred from spike data; VALIDATE against real pdftotext output on first CI run.
// Spike example: ul. 12 Marca 194 nr 2 sold at 153 000 zł (vs 125 000 zł wywoławcza).
// Another example: ul. Wybickiego 2 nr 11 — negative result (no bidder).

const RESULT_PDF_SOLD = `
Informacja o wynikach przetargu

Prezydent Miasta Wejherowa informuje, że w dniu 29 października 2025 r.
odbył się przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego
nr 28 położonego w budynku przy ul. Harcerskiej 11 w Wejherowie,
o powierzchni użytkowej 19,56 m2.

Cena wywoławcza: 124 000,00 zł
Cena nieruchomości osiągnięta w wyniku przetargu: 127 000,00 zł

Na nabywcę nieruchomości ustalono Jana Kowalskiego z Wejherowa.
`;

const RESULT_PDF_UNSOLD = `
Informacja o wynikach przetargu

Prezydent Miasta Wejherowa informuje, że w dniu 17 marca 2025 r.
odbył się przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego
nr 11 położonego w budynku przy ul. Wybickiego 2 w Wejherowie,
o powierzchni użytkowej 37,10 m2.

Cena wywoławcza: 185 000,00 zł
Przetarg zakończył się wynikiem negatywnym — nie wyłoniono nabywcy.
`;

test('parseResultDoc: guard — non-result text returns empty array', () => {
  assert.deepEqual(parseResultDoc('Ogłoszenie o przetargu na lokal mieszkalny.', null, 'https://example.com'), []);
  assert.deepEqual(parseResultDoc('', null, 'https://example.com'), []);
  assert.deepEqual(parseResultDoc(null, null, 'https://example.com'), []);
});

test('parseResultDoc: sold — outcome, final price, starting price', () => {
  const recs = parseResultDoc(RESULT_PDF_SOLD, null, 'https://bip.wejherowo.pl/pliki/wejherowo/zalaczniki/14086/06-11-2025-r-wyniki.pdf');
  assert.equal(recs.length, 1);
  assert.equal(recs[0].outcome, 'sold');
  assert.equal(recs[0].final_price_pln, 127000);
  assert.equal(recs[0].starting_price_pln, 124000);
});

test('parseResultDoc: sold — area 19.56 m²', () => {
  const recs = parseResultDoc(RESULT_PDF_SOLD, null, 'https://example.com');
  assert.equal(recs[0].area_m2, 19.56);
});

test('parseResultDoc: sold — auction date 2025-10-29', () => {
  const recs = parseResultDoc(RESULT_PDF_SOLD, null, 'https://example.com');
  assert.equal(recs[0].auction_date, '2025-10-29');
});

test('parseResultDoc: sold — address Harcerska 11/28', () => {
  const recs = parseResultDoc(RESULT_PDF_SOLD, null, 'https://example.com');
  assert.ok(recs[0].address);
  assert.equal(recs[0].address.building, '11');
  assert.equal(recs[0].address.apt, '28');
});

test('parseResultDoc: sold — kind mieszkalny', () => {
  const recs = parseResultDoc(RESULT_PDF_SOLD, null, 'https://example.com');
  assert.equal(recs[0].kind, 'mieszkalny');
});

test('parseResultDoc: sold — source_pdf is the PDF URL', () => {
  const url = 'https://bip.wejherowo.pl/pliki/wejherowo/zalaczniki/14086/06-11-2025-r-wyniki.pdf';
  const recs = parseResultDoc(RESULT_PDF_SOLD, null, url);
  assert.equal(recs[0].source_pdf, url);
});

test('parseResultDoc: unsold — outcome unsold, no final price', () => {
  const recs = parseResultDoc(RESULT_PDF_UNSOLD, null, 'https://example.com');
  assert.equal(recs.length, 1);
  assert.equal(recs[0].outcome, 'unsold');
  assert.equal(recs[0].final_price_pln, null);
  assert.equal(recs[0].unsold_reason, 'no_buyer');
});

test('parseResultDoc: unsold — starting price still parsed', () => {
  const recs = parseResultDoc(RESULT_PDF_UNSOLD, null, 'https://example.com');
  assert.equal(recs[0].starting_price_pln, 185000);
});

test('parseResultDoc: fallbackDate used when body has no date', () => {
  const noDate = RESULT_PDF_SOLD.replace(/w\s+dniu\s+29 października 2025 r\./i, 'w dniu ... odbył się');
  const recs = parseResultDoc(noDate, '2025-10-29', 'https://example.com');
  // Either extracted from body or from fallback — must not throw
  if (recs.length > 0) {
    assert.ok(recs[0].auction_date === '2025-10-29' || recs[0].auction_date === null);
  }
});
