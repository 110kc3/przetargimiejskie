// Białystok parser tests — groundtruthed against REAL fixtures (2026-06-27).
//
// Fixture sources (live-verified):
//   Active flat (Otwarty):
//     https://www.bip.bialystok.pl/postepowania/przetargi_na_nieruchomosci/ul-juliana-tuwima-11-m-41-44.html
//     Title: ul. Juliana Tuwima 1/1 m 41
//     Przeznaczenie: lokal mieszkalny
//     Cena wywoławcza: 285.100,00 zł
//     Termin przetargu: 2026-08-26
//     Status: Otwarty
//     (No Cena nabycia)
//
//   Resolved flat (Rozstrzygnięty, with Cena nabycia):
//     https://www.bip.bialystok.pl/postepowania/przetargi_na_nieruchomosci/al-jozefa-pilsudskiego-38-m-23.html
//     Title: Al. Józefa Piłsudskiego 38 m 23
//     Przeznaczenie: lokal mieszkalny
//     Cena wywoławcza: 269.500,00 zł
//     Termin przetargu: 2024-01-25
//     Status: Rozstrzygnięty
//     Cena nabycia: 341.600,00 zł
//
// All field values verified against the actual live pages 2026-06-27.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  stripTags,
  parseDetailFields,
  parseDetailPage,
  parseResultDoc,
} from '../src/cities/bialystok/parse.js';

import { parseIndexPage, parseTotalCount } from '../src/cities/bialystok/crawl.js';

// ---------------------------------------------------------------------------
// stripTags helper
// ---------------------------------------------------------------------------

test('stripTags: removes tags and decodes entities', () => {
  assert.equal(
    stripTags('<strong>Cena nabycia</strong>'),
    'Cena nabycia',
  );
  assert.equal(
    stripTags('<div>285&nbsp;100,00 z&#x142;</div>'),
    '285 100,00 zł',
  );
  assert.equal(stripTags(''), '');
  assert.equal(stripTags(null), '');
});

// ---------------------------------------------------------------------------
// parseDetailFields — field extraction from BIP HTML
// ---------------------------------------------------------------------------

// Minimal HTML reproducing the SmartSite grid-inner structure (verified from
// the live page source 2026-06-27).
const FIELD_HTML = `
<div class="grid-inner">
  <div class="grid-inner-item"><strong>Tytuł</strong></div>
  <div class="grid-inner-item" id="" data-value="">ul. Juliana Tuwima 1/1 m 41</div>
</div>
<div class="grid-inner">
  <div class="grid-inner-item"><strong>Lokalizacja (położenie)</strong></div>
  <div class="grid-inner-item" id="" data-value="">ul. Juliana Tuwima 1/1 m 41</div>
</div>
<div class="grid-inner">
  <div class="grid-inner-item"><strong>Przeznaczenie</strong></div>
  <div class="grid-inner-item" id="" data-value="">lokal mieszkalny</div>
</div>
<div class="grid-inner">
  <div class="grid-inner-item"><strong>Cena wywoławcza</strong></div>
  <div class="grid-inner-item" id="" data-value="">285.100,00 zł</div>
</div>
<div class="grid-inner">
  <div class="grid-inner-item"><strong>Termin przetargu</strong></div>
  <div class="grid-inner-item" id="" data-value="">2026-08-26</div>
</div>
<div class="grid-inner">
  <div class="grid-inner-item"><strong>Status</strong></div>
  <div class="grid-inner-item" id="" data-value="">Otwarty</div>
</div>
`;

test('parseDetailFields: extracts 6 fields from active-flat HTML', () => {
  const fields = parseDetailFields(FIELD_HTML);
  assert.equal(fields.get('Tytuł'), 'ul. Juliana Tuwima 1/1 m 41');
  assert.equal(fields.get('Przeznaczenie'), 'lokal mieszkalny');
  assert.equal(fields.get('Cena wywoławcza'), '285.100,00 zł');
  assert.equal(fields.get('Termin przetargu'), '2026-08-26');
  assert.equal(fields.get('Status'), 'Otwarty');
});

test('parseDetailFields: extracts Cena nabycia when present (Rozstrzygnięty page)', () => {
  const resolvedHtml = `
<div class="grid-inner resolution">
  <div class="grid-inner-item"><strong>Cena nabycia</strong></div>
  <div class="grid-inner-item" id="" data-value="">341.600,00 zł</div>
</div>
`;
  const fields = parseDetailFields(resolvedHtml);
  assert.equal(fields.get('Cena nabycia'), '341.600,00 zł');
});

test('parseDetailFields: returns empty Map for empty HTML', () => {
  const fields = parseDetailFields('');
  assert.equal(fields.size, 0);
});

// ---------------------------------------------------------------------------
// parseDetailPage — full detail page → structured record
// ---------------------------------------------------------------------------

// Synthesise a minimal but realistic full-page HTML for Tuwima (Otwarty)
const DETAIL_HTML_ACTIVE = `<!DOCTYPE html><html><body>
<div class="grid-inner">
  <div class="grid-inner-item"><strong>Tytuł</strong></div>
  <div class="grid-inner-item" data-value="">ul. Juliana Tuwima 1/1 m 41</div>
</div>
<div class="grid-inner">
  <div class="grid-inner-item"><strong>Lokalizacja (położenie)</strong></div>
  <div class="grid-inner-item" data-value="">ul. Juliana Tuwima 1/1 m 41</div>
</div>
<div class="grid-inner">
  <div class="grid-inner-item"><strong>Przeznaczenie</strong></div>
  <div class="grid-inner-item" data-value="">lokal mieszkalny</div>
</div>
<div class="grid-inner">
  <div class="grid-inner-item"><strong>Cena wywoławcza</strong></div>
  <div class="grid-inner-item" data-value="">285.100,00 zł</div>
</div>
<div class="grid-inner">
  <div class="grid-inner-item"><strong>Termin przetargu</strong></div>
  <div class="grid-inner-item" data-value="">2026-08-26</div>
</div>
<div class="grid-inner">
  <div class="grid-inner-item"><strong>Status</strong></div>
  <div class="grid-inner-item" data-value="">Otwarty</div>
</div>
</body></html>`;

const DETAIL_URL_ACTIVE =
  'https://www.bip.bialystok.pl/postepowania/przetargi_na_nieruchomosci/ul-juliana-tuwima-11-m-41-44.html';

test('parseDetailPage (Otwarty): kind is mieszkalny', () => {
  const r = parseDetailPage(DETAIL_HTML_ACTIVE, DETAIL_URL_ACTIVE);
  assert.ok(r, 'must return a record');
  assert.equal(r.kind, 'mieszkalny');
});

test('parseDetailPage (Otwarty): address key = tuwima|1|41', () => {
  const r = parseDetailPage(DETAIL_HTML_ACTIVE, DETAIL_URL_ACTIVE);
  assert.ok(r?.address, 'address must be parsed');
  // "1/1 m 41": staircase /1 stripped, building=1, apt=41
  assert.ok(/tuwima/i.test(r.address.street_norm));
  assert.equal(r.address.building, '1');
  assert.equal(r.address.apt, '41');
});

test('parseDetailPage (Otwarty): starting price 285100 zł', () => {
  const r = parseDetailPage(DETAIL_HTML_ACTIVE, DETAIL_URL_ACTIVE);
  assert.equal(r.starting_price_pln, 285100);
});

test('parseDetailPage (Otwarty): auction date 2026-08-26', () => {
  const r = parseDetailPage(DETAIL_HTML_ACTIVE, DETAIL_URL_ACTIVE);
  assert.equal(r.auction_date, '2026-08-26');
});

test('parseDetailPage (Otwarty): outcome is open, no final price', () => {
  const r = parseDetailPage(DETAIL_HTML_ACTIVE, DETAIL_URL_ACTIVE);
  assert.equal(r.outcome, 'open');
  assert.equal(r.final_price_pln, null);
});

// Synthesise Piłsudskiego resolved page (Rozstrzygnięty + Cena nabycia)
const DETAIL_HTML_RESOLVED = `<!DOCTYPE html><html><body>
<div class="grid-inner">
  <div class="grid-inner-item"><strong>Tytuł</strong></div>
  <div class="grid-inner-item" data-value="">Al. Józefa Piłsudskiego 38 m 23</div>
</div>
<div class="grid-inner">
  <div class="grid-inner-item"><strong>Lokalizacja (położenie)</strong></div>
  <div class="grid-inner-item" data-value="">Al. Józefa Piłsudskiego 38 m 23</div>
</div>
<div class="grid-inner">
  <div class="grid-inner-item"><strong>Przeznaczenie</strong></div>
  <div class="grid-inner-item" data-value="">lokal mieszkalny</div>
</div>
<div class="grid-inner">
  <div class="grid-inner-item"><strong>Cena wywoławcza</strong></div>
  <div class="grid-inner-item" data-value="">269.500,00 zł</div>
</div>
<div class="grid-inner">
  <div class="grid-inner-item"><strong>Termin przetargu</strong></div>
  <div class="grid-inner-item" data-value="">2024-01-25</div>
</div>
<div class="grid-inner">
  <div class="grid-inner-item"><strong>Status</strong></div>
  <div class="grid-inner-item" data-value="">Rozstrzygnięty</div>
</div>
<div class="grid-inner resolution">
  <div class="grid-inner-item"><strong>Cena nabycia</strong></div>
  <div class="grid-inner-item" data-value="">341.600,00 zł</div>
</div>
</body></html>`;

const DETAIL_URL_RESOLVED =
  'https://www.bip.bialystok.pl/postepowania/przetargi_na_nieruchomosci/al-jozefa-pilsudskiego-38-m-23.html';

test('parseDetailPage (Rozstrzygnięty): address includes Piłsudskiego / apt 23', () => {
  const r = parseDetailPage(DETAIL_HTML_RESOLVED, DETAIL_URL_RESOLVED);
  assert.ok(r?.address, 'address must be parsed');
  assert.ok(/pilsudsk/i.test(r.address.street_norm));
  assert.equal(r.address.apt, '23');
  assert.equal(r.address.building, '38');
});

test('parseDetailPage (Rozstrzygnięty): starting price 269500 zł', () => {
  const r = parseDetailPage(DETAIL_HTML_RESOLVED, DETAIL_URL_RESOLVED);
  assert.equal(r.starting_price_pln, 269500);
});

test('parseDetailPage (Rozstrzygnięty): Cena nabycia 341600 zł', () => {
  const r = parseDetailPage(DETAIL_HTML_RESOLVED, DETAIL_URL_RESOLVED);
  assert.equal(r.final_price_pln, 341600);
});

test('parseDetailPage (Rozstrzygnięty): outcome is sold', () => {
  const r = parseDetailPage(DETAIL_HTML_RESOLVED, DETAIL_URL_RESOLVED);
  assert.equal(r.outcome, 'sold');
});

test('parseDetailPage (Rozstrzygnięty): auction date 2024-01-25', () => {
  const r = parseDetailPage(DETAIL_HTML_RESOLVED, DETAIL_URL_RESOLVED);
  assert.equal(r.auction_date, '2024-01-25');
});

test('parseDetailPage: returns null for non-flat przeznaczenie (działka)', () => {
  const plotHtml = `<body>
  <div class="grid-inner">
    <div class="grid-inner-item"><strong>Przeznaczenie</strong></div>
    <div class="grid-inner-item" data-value="">działka</div>
  </div>
  <div class="grid-inner">
    <div class="grid-inner-item"><strong>Cena wywoławcza</strong></div>
    <div class="grid-inner-item" data-value="">50.000,00 zł</div>
  </div>
  </body>`;
  assert.equal(parseDetailPage(plotHtml, 'https://example.com'), null);
});

test('parseDetailPage: returns null for null/empty input', () => {
  assert.equal(parseDetailPage(null, 'https://example.com'), null);
  assert.equal(parseDetailPage('', 'https://example.com'), null);
});

// ---------------------------------------------------------------------------
// parseResultDoc — the registry-contract function
// ---------------------------------------------------------------------------

// Pre-serialised field text for the Piłsudskiego resolved flat
// (as crawlResultDocs() would produce it)
const RESULT_TEXT_PILSUDSKIEGO = `Tytuł: Al. Józefa Piłsudskiego 38 m 23
Lokalizacja (położenie): Al. Józefa Piłsudskiego 38 m 23
Przeznaczenie: lokal mieszkalny
Cena wywoławcza: 269.500,00 zł
Termin przetargu: 2024-01-25
Status: Rozstrzygnięty
Osoba do kontaktu: Krzysztof Sadowski tel. (85) 869-60-88
Cena nabycia: 341.600,00 zł
Kategoria newslettera: Nieruchomości
source_url: https://www.bip.bialystok.pl/postepowania/przetargi_na_nieruchomosci/al-jozefa-pilsudskiego-38-m-23.html`;

const SRC_PILSUDSKIEGO =
  'https://www.bip.bialystok.pl/postepowania/przetargi_na_nieruchomosci/al-jozefa-pilsudskiego-38-m-23.html';

test('parseResultDoc: Piłsudskiego — returns exactly 1 record', () => {
  const recs = parseResultDoc(RESULT_TEXT_PILSUDSKIEGO, '2024-01-25', SRC_PILSUDSKIEGO);
  assert.equal(recs.length, 1);
});

test('parseResultDoc: Piłsudskiego — kind is mieszkalny', () => {
  const recs = parseResultDoc(RESULT_TEXT_PILSUDSKIEGO, '2024-01-25', SRC_PILSUDSKIEGO);
  assert.equal(recs[0].kind, 'mieszkalny');
});

test('parseResultDoc: Piłsudskiego — address: Piłsudskiego 38/23', () => {
  const recs = parseResultDoc(RESULT_TEXT_PILSUDSKIEGO, '2024-01-25', SRC_PILSUDSKIEGO);
  const r = recs[0];
  assert.ok(r.address, 'address must be set');
  assert.ok(/pilsudsk/i.test(r.address.street_norm));
  assert.equal(r.address.building, '38');
  assert.equal(r.address.apt, '23');
});

test('parseResultDoc: Piłsudskiego — starting price 269500 zł', () => {
  const recs = parseResultDoc(RESULT_TEXT_PILSUDSKIEGO, '2024-01-25', SRC_PILSUDSKIEGO);
  assert.equal(recs[0].starting_price_pln, 269500);
});

test('parseResultDoc: Piłsudskiego — Cena nabycia (final price) 341600 zł', () => {
  const recs = parseResultDoc(RESULT_TEXT_PILSUDSKIEGO, '2024-01-25', SRC_PILSUDSKIEGO);
  assert.equal(recs[0].final_price_pln, 341600);
});

test('parseResultDoc: Piłsudskiego — outcome is sold', () => {
  const recs = parseResultDoc(RESULT_TEXT_PILSUDSKIEGO, '2024-01-25', SRC_PILSUDSKIEGO);
  assert.equal(recs[0].outcome, 'sold');
  assert.equal(recs[0].unsold_reason, null);
});

test('parseResultDoc: Piłsudskiego — auction date 2024-01-25', () => {
  const recs = parseResultDoc(RESULT_TEXT_PILSUDSKIEGO, null, SRC_PILSUDSKIEGO);
  assert.equal(recs[0].auction_date, '2024-01-25');
});

test('parseResultDoc: Piłsudskiego — source_pdf is the detail URL', () => {
  const recs = parseResultDoc(RESULT_TEXT_PILSUDSKIEGO, '2024-01-25', SRC_PILSUDSKIEGO);
  assert.equal(recs[0].source_pdf, SRC_PILSUDSKIEGO);
});

// Nierozstrzygnięty (unsold) flat — Wierzbowa 29A m 28 (from spike notes)
const RESULT_TEXT_WIERZBOWA_UNSOLD = `Tytuł: ul. Wierzbowa 29A m 28
Lokalizacja (położenie): ul. Wierzbowa 29A m 28
Przeznaczenie: lokal mieszkalny
Cena wywoławcza: 333.800,00 zł
Termin przetargu: 2025-02-27
Status: Nierozstrzygnięty
Osoba do kontaktu: Krzysztof Sadowski tel. (85) 869-60-88
Kategoria newslettera: Nieruchomości
source_url: https://www.bip.bialystok.pl/postepowania/przetargi_na_nieruchomosci/ul-wierzbowa-29a-m-28.html`;

const SRC_WIERZBOWA =
  'https://www.bip.bialystok.pl/postepowania/przetargi_na_nieruchomosci/ul-wierzbowa-29a-m-28.html';

test('parseResultDoc: Wierzbowa (Nierozstrzygnięty) — 1 record, outcome unsold', () => {
  const recs = parseResultDoc(RESULT_TEXT_WIERZBOWA_UNSOLD, '2025-02-27', SRC_WIERZBOWA);
  assert.equal(recs.length, 1);
  assert.equal(recs[0].outcome, 'unsold');
  assert.equal(recs[0].final_price_pln, null);
});

test('parseResultDoc: Wierzbowa (Nierozstrzygnięty) — starting price 333800 zł', () => {
  const recs = parseResultDoc(RESULT_TEXT_WIERZBOWA_UNSOLD, '2025-02-27', SRC_WIERZBOWA);
  assert.equal(recs[0].starting_price_pln, 333800);
});

test('parseResultDoc: Wierzbowa (Nierozstrzygnięty) — address parsed', () => {
  const recs = parseResultDoc(RESULT_TEXT_WIERZBOWA_UNSOLD, '2025-02-27', SRC_WIERZBOWA);
  const r = recs[0];
  assert.ok(r.address, 'address must be parsed');
  assert.ok(/wierzbowa/i.test(r.address.street_norm));
  assert.equal(r.address.building, '29A');
  assert.equal(r.address.apt, '28');
});

test('parseResultDoc: fallbackDate used when Termin przetargu absent', () => {
  const noTermin = `Tytuł: ul. Testowa 1 m 5
Lokalizacja (położenie): ul. Testowa 1 m 5
Przeznaczenie: lokal mieszkalny
Cena wywoławcza: 100.000,00 zł
Status: Nierozstrzygnięty
source_url: https://example.com`;
  const recs = parseResultDoc(noTermin, '2025-06-01', 'https://example.com');
  assert.equal(recs.length, 1);
  assert.equal(recs[0].auction_date, '2025-06-01');
});

test('parseResultDoc: non-flat przeznaczenie returns empty array', () => {
  const plotText = `Tytuł: Działka nr 123
Lokalizacja (położenie): Działka nr 123
Przeznaczenie: działka
Cena wywoławcza: 50.000,00 zł
Status: Rozstrzygnięty
source_url: https://example.com`;
  assert.deepEqual(parseResultDoc(plotText, null, 'https://example.com'), []);
});

test('parseResultDoc: empty/null input returns empty array', () => {
  assert.deepEqual(parseResultDoc('', null, 'https://example.com'), []);
  assert.deepEqual(parseResultDoc(null, null, 'https://example.com'), []);
});

// ---------------------------------------------------------------------------
// parseIndexPage (crawl helper)
// ---------------------------------------------------------------------------

const INDEX_HTML = `
<div class="list-item">
  <a href="/postepowania/przetargi_na_nieruchomosci/ul-juliana-tuwima-11-m-41-44.html">ul. Juliana Tuwima 1/1 m 41</a>
  <span>Status: Otwarty</span>
  <span>Termin przetargu: 2026-08-26</span>
</div>
<div class="list-item">
  <a href="/postepowania/przetargi_na_nieruchomosci/ul-wierzbowa-29a-m-55-57.html">ul. Wierzbowa 29A m 55</a>
  <span>Status: Otwarty</span>
  <span>Termin przetargu: 2026-08-26</span>
</div>
<div class="list-item">
  <a href="/postepowania/przetargi_na_nieruchomosci/bialystok-dzialka-nr-1304-w-obr-8-bema.html">Białystok, działka nr 130/4 w obr. 8 - Bema</a>
  <span>Status: Otwarty</span>
</div>
Dostępne: 402 wyników ze wszystkich kategorii.
`;

test('parseIndexPage: extracts 3 refs with correct detail URLs', () => {
  const refs = parseIndexPage(INDEX_HTML);
  assert.equal(refs.length, 3);
  assert.ok(refs[0].detailUrl.includes('ul-juliana-tuwima'));
  assert.ok(refs[1].detailUrl.includes('ul-wierzbowa'));
  assert.ok(refs[2].detailUrl.includes('bialystok-dzialka'));
});

test('parseIndexPage: all detail URLs are absolute', () => {
  const refs = parseIndexPage(INDEX_HTML);
  for (const r of refs) {
    assert.ok(r.detailUrl.startsWith('https://'), `expected absolute URL, got: ${r.detailUrl}`);
  }
});

test('parseIndexPage: deduplicates repeated links', () => {
  const dupe = INDEX_HTML + `
  <a href="/postepowania/przetargi_na_nieruchomosci/ul-juliana-tuwima-11-m-41-44.html">ul. Juliana Tuwima 1/1 m 41</a>
  `;
  const refs = parseIndexPage(dupe);
  assert.equal(refs.length, 3); // still 3, not 4
});

test('parseIndexPage: returns empty array for empty HTML', () => {
  assert.deepEqual(parseIndexPage(''), []);
  assert.deepEqual(parseIndexPage('<html><body>No links here</body></html>'), []);
});

test('parseTotalCount: extracts number from "Dostępne: N wyników" line', () => {
  assert.equal(parseTotalCount(INDEX_HTML), 402);
  assert.equal(parseTotalCount('Dostępne: 2011 wyników ze wszystkich kategorii.'), 2011);
  assert.equal(parseTotalCount('no count here'), 0);
});
