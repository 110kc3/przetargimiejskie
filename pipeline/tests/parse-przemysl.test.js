// Przemyśl parser tests.
//
// Fixtures grounded in LIVE data fetched from bip.przemysl.pl on 2026-06-28.
// The BIP and invest.przemysl.eu cannot be reached from CI sandboxes, so
// the pure parsers are exercised against captured/reconstructed markup.
//
// Live fixture sources:
//   Result listing — bip.przemysl.pl/59228/3722/informacje-o-wynikach-przetargow.html
//     Structure: <li><h2><a href="URL">TITLE</a></h2></li>  (skyCMS v4)
//     10 items/page, 2 pages total (12 items as of 2026-06-28).
//
//   Result notice (positive) — bip.przemysl.pl/76706 (Mierosławskiego 4, 2025-02-26,
//     achieved 136 350 zł, starting 135 000 zł, property: zabudowana/house — NOT a flat,
//     but demonstrates the body prose template used for all result notices).
//
//   Result notice (negative) — bip.przemysl.pl/82381 (Chrzanowska, 2026-06-17,
//     negative result — nikt nie wpłacił wadium).
//
// NOTE: The bip.przemysl.pl/59228 listing currently (June 2026) contains ONLY
//   land/house results, no flat-specific "lokal mieszkalny" notices. The flat
//   parseResultDoc test uses a SYNTHETIC fixture built from the observed body
//   template, with "lokal mieszkalny" substituted. This is the intended
//   groundtruth approach when the live result set has rolled off.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseListPage,
  isFlatTitle,
  isResultTitle,
  roundFromText,
  parseResultDoc,
  parseAnnouncement,
  extractArticleText,
} from '../src/cities/przemysl/parse.js';

// ---------------------------------------------------------------------------
// parseListPage — skyCMS article-list markup
// ---------------------------------------------------------------------------

// Minimal skyCMS v4 listing reconstructed from bip.przemysl.pl/59228 (June 2026).
// The live page uses <li><h2><a href="...">TITLE</a></h2></li> inside <ul>.
const LISTING_HTML = `
<html><body>
<div id="main">
  <h1>Informacje o wynikach przetargow</h1>
  <ul>
    <li>
      <h2><a href="https://bip.przemysl.pl/82382/8344/informacja-o-wyniku-kolejnego-przetargu-na-zbycie-dzialki-nr-8376.html">Informacja o wyniku kolejnego przetargu na zbycie dzialki nr 837/6</a></h2>
    </li>
    <li>
      <h2><a href="https://bip.przemysl.pl/82381/8344/informacja-o-wyniku-przetargow-na-sprzedaz-nieruchomosci-przy-ul-chrzanowskiej.html">Informacja o wyniku przetargow na sprzedaz nieruchomosci przy ul. Chrzanowskiej</a></h2>
    </li>
    <li>
      <h2><a href="https://bip.przemysl.pl/76706/3722/informacja-o-wyniku-kolejnego-przetargu-na-zbycie-nieruchomosci-zabudowanej-ul-mieroslawskiego-4.html">Informacja o wyniku kolejnego przetargu na zbycie nieruchomosci zabudowanej ul. Mieroslawskiego 4</a></h2>
    </li>
    <li>
      <h2><a href="https://bip.przemysl.pl/71234/3722/informacja-o-wyniku-przetargu-na-sprzedaz-lokalu-mieszkalnego-ul-sobieskiego-15-4.html">Informacja o wyniku przetargu na sprzedaz lokalu mieszkalnego ul. Sobieskiego 15/4</a></h2>
    </li>
  </ul>
  <p>Liczba wynikow: 12</p>
  <a href="?Page=2">Nastepna</a>
</div>
</body></html>
`;

test('parseListPage: returns all h2>a items with title and url', () => {
  const items = parseListPage(LISTING_HTML, 'https://bip.przemysl.pl');
  assert.equal(items.length, 4);
  assert.equal(items[0].title, 'Informacja o wyniku kolejnego przetargu na zbycie dzialki nr 837/6');
  assert.equal(items[0].url, 'https://bip.przemysl.pl/82382/8344/informacja-o-wyniku-kolejnego-przetargu-na-zbycie-dzialki-nr-8376.html');
});

test('parseListPage: deduplicates repeated URLs', () => {
  const dupeHtml = `<ul>
    <li><h2><a href="/82382/x.html">Same article</a></h2></li>
    <li><h2><a href="/82382/x.html">Same article</a></h2></li>
  </ul>`;
  const items = parseListPage(dupeHtml, 'https://bip.przemysl.pl');
  assert.equal(items.length, 1);
});

test('parseListPage: resolves relative hrefs using baseHost', () => {
  const relHtml = `<ul><li><h2><a href="/99999/slug.html">Title here</a></h2></li></ul>`;
  const items = parseListPage(relHtml, 'https://bip.przemysl.pl');
  assert.equal(items.length, 1);
  assert.equal(items[0].url, 'https://bip.przemysl.pl/99999/slug.html');
});

test('parseListPage: empty / no-heading HTML returns empty array', () => {
  assert.deepEqual(parseListPage('', 'https://bip.przemysl.pl'), []);
  assert.deepEqual(parseListPage('<html><body><p>nic</p></body></html>', 'https://bip.przemysl.pl'), []);
});

// ---------------------------------------------------------------------------
// isFlatTitle / isResultTitle
// ---------------------------------------------------------------------------

test('isFlatTitle: accepts flat-specific titles', () => {
  assert.equal(isFlatTitle('Ogloszenie o przetargu na sprzedaz lokalu mieszkalnego ul. Sobieskiego 15/4'), true);
  assert.equal(isFlatTitle('Przetarg na sprzedaz lokalu mieszkalnego nr 7 przy ul. Matejki'), true);
  assert.equal(isFlatTitle('Informacja o wyniku przetargu na sprzedaz lokalu mieszkalnego ul. Sobieskiego 15/4'), true);
});

test('isFlatTitle: rejects non-flat titles', () => {
  assert.equal(isFlatTitle('Informacja o wyniku kolejnego przetargu na zbycie dzialki nr 837/6'), false);
  assert.equal(isFlatTitle('Informacja o wyniku kolejnego przetargu na zbycie nieruchomosci zabudowanej ul. Mieroslawskiego 4'), false);
  assert.equal(isFlatTitle('Ogloszenie o przetargu na najem lokalu ul. Mickiewicza 3'), false);
  assert.equal(isFlatTitle('Informacja o wyniku przetargow na sprzedaz nieruchomosci przy ul. Chrzanowskiej'), false);
});

test('isResultTitle: accepts result notice headings', () => {
  assert.equal(isResultTitle('Informacja o wyniku przetargu na sprzedaz lokalu mieszkalnego ul. Sobieskiego 15/4'), true);
  assert.equal(isResultTitle('Informacja o wyniku kolejnego przetargu na zbycie dzialki nr 837/6'), true);
});

// ---------------------------------------------------------------------------
// roundFromText
// ---------------------------------------------------------------------------

test('roundFromText: bare przetarg = 1', () => {
  assert.equal(roundFromText('przetarg ustny nieograniczony na sprzedaz lokalu mieszkalnego'), 1);
});

test('roundFromText: ordinal words', () => {
  assert.equal(roundFromText('drugi przetarg ustny nieograniczony'), 2);
  assert.equal(roundFromText('trzeci przetarg na sprzedaz'), 3);
  assert.equal(roundFromText('czwarty przetarg ustny'), 4);
  assert.equal(roundFromText('piaty przetarg ustny'), 5);
});

test('roundFromText: kolejny przetarg must not produce round=1', () => {
  const r = roundFromText('kolejny przetarg ustny nieograniczony w sprawie zbycia nieruchomosci');
  assert.ok(r === null || r > 1, '"kolejny" must not produce round=1');
});

test('roundFromText: Roman numeral II / III przetarg', () => {
  assert.equal(roundFromText('II przetarg ustny nieograniczony'), 2);
  assert.equal(roundFromText('III przetarg'), 3);
});

test('roundFromText: empty / null / undefined never throws', () => {
  assert.equal(roundFromText(''), null);
  assert.equal(roundFromText(null), null);
  assert.equal(roundFromText(undefined), null);
});

// ---------------------------------------------------------------------------
// extractArticleText
// ---------------------------------------------------------------------------

const PAGE_WITH_PRINT_AREA = `
<html><body>
  <nav>Navigation links go here</nav>
  <div id="printArea">
    <h2>Informacja o wyniku przetargu</h2>
    <p>W dniu 26 lutego 2025 r. zostal przeprowadzony przetarg.</p>
    <p>Cena wywolawcza: 135 000,00 zl</p>
    <p>Najwyzsza cena osiagnieta w przetargu wyniosla 136 350,00 zl</p>
  </div>
  <footer>Footer here</footer>
</body></html>
`;

test('extractArticleText: strips nav/footer, returns printArea content as text', () => {
  const text = extractArticleText(PAGE_WITH_PRINT_AREA);
  assert.ok(text.includes('26 lutego 2025'));
  assert.ok(text.includes('135 000'));
  assert.ok(text.includes('136 350'));
  assert.ok(!text.includes('<p>'));
  assert.ok(!text.includes('<nav>'));
  assert.ok(!text.includes('<footer>'));
});

test('extractArticleText: empty input returns empty string', () => {
  assert.equal(extractArticleText(''), '');
  assert.equal(extractArticleText(null), '');
});

// ---------------------------------------------------------------------------
// parseResultDoc — result notice body parser
// ---------------------------------------------------------------------------

// POSITIVE result notice — synthetic fixture grounded on the template observed
// at bip.przemysl.pl/76706 (Mieroslawskiego 4, zabudowana, 2025-02-26), adapted
// to use "lokalu mieszkalnego" so classifyKind returns 'mieszkalny'.
const RESULT_POSITIVE_HTML = `
<html><body>
<div id="printArea">
<p>W dniu 26 lutego 2025 r. zostal przeprowadzony w siedzibie Urzedu Miejskiego
w Przemyslu Rynek 1 kolejny przetarg ustny nieograniczony w sprawie zbycia
lokalu mieszkalnego stanowiacego wlasnosc Gminy Miejskiej Przemysl,
polozonego przy ul. Sobieskiego 15/4 w Przemyslu.</p>

<p>Cena wywolawcza ww. nieruchomosci zostala okreslona na kwote
<strong>86 000,00 zl</strong> (slownie: osiemdziesiat szesc tysiecy zlotych).</p>

<p>Najwyzsza cena osiagnieta w przetargu wyniosla
<strong>88 200,00 zl</strong> (slownie: osiemdziesiat osiem tysiecy dwiescie zlotych).</p>

<p>Powierzchnia uzytkowa lokalu wynosi 38,50 m2.</p>

<p>Na nabywce przedmiotowej nieruchomosci ustalona zostala Pani Agnieszka Kowalska.</p>
</div>
</body></html>
`;

test('parseResultDoc: positive flat result — address, prices, outcome', () => {
  const results = parseResultDoc(RESULT_POSITIVE_HTML, null, 'https://bip.przemysl.pl/71234/slug.html');
  assert.equal(results.length, 1);
  const r = results[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.outcome, 'sold');
  assert.equal(r.auction_date, '2025-02-26');
  assert.equal(r.starting_price_pln, 86000);
  assert.equal(r.final_price_pln, 88200);
  assert.equal(r.unsold_reason, null);
  assert.ok(r.address, 'address must be parsed');
  assert.equal(r.address.street, 'Sobieskiego');
  assert.equal(r.address.building, '15');
  assert.equal(r.address.apt, '4');
  assert.equal(r.address.key, 'sobieskiego|15|4');
  assert.equal(r.address_raw, 'ul. Sobieskiego 15/4');
  assert.equal(r.source_pdf, 'https://bip.przemysl.pl/71234/slug.html');
});

test('parseResultDoc: positive result — area from powierzchni uzytkowej', () => {
  const results = parseResultDoc(RESULT_POSITIVE_HTML, null, 'https://bip.przemysl.pl/71234/slug.html');
  assert.equal(results.length, 1);
  assert.equal(results[0].area_m2, 38.5);
});

// NEGATIVE result notice — grounded on bip.przemysl.pl/82381 body template
// (Chrzanowska dzialki, 2026-06-17), adapted with "lokalu mieszkalnego" + flat address.
const RESULT_NEGATIVE_HTML = `
<html><body>
<div id="printArea">
<p>W dniu 17 czerwca 2026 r. zostaly przeprowadzone w siedzibie Urzedu Miejskiego
w Przemyslu Rynek 1 przetargi ustne nieograniczone na sprzedaz
lokalu mieszkalnego stanowiacego wlasnosc Gminy Miejskiej Przemysl,
polozonego przy ul. Matejki 7/2 w Przemyslu.</p>

<p>Cena wywolawcza ww. nieruchomosci zostala okreslona na kwote
<strong>71 000,00 zl</strong>.</p>

<p>Z uwagi na fakt, iz nikt nie przystapil do ogloszonch przez Prezydenta Miasta Przemysla
przetargow ustnych nieograniczonych - w ustalonym terminie do dnia 9 czerwca 2026 r.
nikt nie wplacil wadium, ww. przetargi zakonczyly sie wynikiem negatywnym.</p>
</div>
</body></html>
`;

test('parseResultDoc: negative flat result — unsold, no final price', () => {
  const results = parseResultDoc(RESULT_NEGATIVE_HTML, null, 'https://bip.przemysl.pl/80000/slug.html');
  assert.equal(results.length, 1);
  const r = results[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.final_price_pln, null);
  assert.equal(r.starting_price_pln, 71000);
  assert.equal(r.unsold_reason, 'brak_uczestnikow');
  assert.equal(r.auction_date, '2026-06-17');
  assert.equal(r.address.key, 'matejki|7|2');
});

test('parseResultDoc: non-flat result (zabudowana) returns empty array', () => {
  const zabudHTML = `
  <div id="printArea">
  <p>W dniu 26 lutego 2025 r. zostal przeprowadzony kolejny przetarg ustny nieograniczony
  w sprawie zbycia nieruchomosci zabudowanej stanowiacej wlasnosc Gminy Miejskiej Przemysl,
  polozonej przy ul. Mieroslawskiego 4.</p>
  <p>Cena wywolawcza: 135 000,00 zl</p>
  <p>Najwyzsza cena osiagnieta w przetargu wyniosla 136 350,00 zl</p>
  </div>`;
  const results = parseResultDoc(zabudHTML, null, 'https://bip.przemysl.pl/76706/slug.html');
  assert.deepEqual(results, []);
});

test('parseResultDoc: empty/null text returns empty array without throwing', () => {
  assert.deepEqual(parseResultDoc('', null, 'https://bip.przemysl.pl/x.html'), []);
  assert.deepEqual(parseResultDoc(null, null, 'https://bip.przemysl.pl/x.html'), []);
});

test('parseResultDoc: announcement-only text (no result sentinel) returns empty array', () => {
  const html = `<div id="printArea"><p>Prezydent Miasta Przemysla oglasza przetarg ustny nieograniczony
  na sprzedaz lokalu mieszkalnego przy ul. Sobieskiego 15/4.
  Cena wywolawcza: 86 000,00 zl. Przetarg odbedzie sie w dniu 26.02.2025 r.</p></div>`;
  const results = parseResultDoc(html, null, 'https://bip.przemysl.pl/71000/slug.html');
  assert.deepEqual(results, []);
});

// ---------------------------------------------------------------------------
// parseAnnouncement
// ---------------------------------------------------------------------------

// Synthetic announcement detail HTML grounded on the skyCMS article template.
// invest.przemysl.eu listing timed out during collection; template inferred from
// the bip.przemysl.pl article body structure (same CMS).
const ANNOUNCEMENT_HTML = `
<html><body>
<div id="printArea">
<h2>Ogloszenie o przetargu ustnym nieograniczonym na sprzedaz lokalu mieszkalnego</h2>

<p>Prezydent Miasta Przemysla oglasza drugi przetarg ustny nieograniczony
na sprzedaz lokalu mieszkalnego nr 4 stanowiacego wlasnosc Gminy Miejskiej Przemysl,
polozonego przy ul. Rodziewiczowny 8/4 w Przemyslu.</p>

<p>Cena wywolawcza nieruchomosci wynosi <strong>54 000,00 zl</strong>.</p>

<p>Powierzchnia uzytkowa lokalu mieszkalnego wynosi <strong>42,30 m2</strong>.</p>

<p>Przetarg odbedzie sie w dniu 15.07.2025 r. o godzinie 10:00 w siedzibie Urzedu
Miejskiego w Przemyslu Rynek 1.</p>
</div>
</body></html>
`;

test('parseAnnouncement: extracts address, price, area, date, round', () => {
  const f = parseAnnouncement(ANNOUNCEMENT_HTML, 'https://invest.przemysl.eu/71234/slug.html');
  assert.equal(f.kind, 'mieszkalny');
  assert.equal(f.round, 2);
  assert.equal(f.starting_price_pln, 54000);
  assert.equal(f.area_m2, 42.3);
  assert.equal(f.auction_date, '2025-07-15');
  assert.ok(f.address, 'address must be parsed');
  assert.equal(f.address.street, 'Rodziewiczowny');
  assert.equal(f.address.building, '8');
  assert.equal(f.address.apt, '4');
  assert.equal(f.address.key, 'rodziewiczowny|8|4');
});

// ---------------------------------------------------------------------------
// config.js contract
// ---------------------------------------------------------------------------

import { config } from '../src/cities/przemysl/config.js';

test('config: required fields present and correct', () => {
  assert.equal(config.id, 'przemysl');
  assert.equal(config.label, 'Przemyśl');        // Przemyśl
  assert.equal(config.voivodeship, 'podkarpackie');
  assert.equal(config.authority, 'Urząd Miasta Przemyśla'); // Urząd Miasta Przemyśla
  assert.equal(config.host, 'bip.przemysl.pl');
  assert.equal(config.source, 'html');
  assert.ok(config.teryt, 'teryt must be set');
  // Format used across all cities: 6 digits + underscore + 1 digit (e.g. '186101_1')
  assert.match(config.teryt, /^\d{6}_\d$/, 'teryt must match XXXXXX_Y format');
});

// ---------------------------------------------------------------------------
// index.js adapter contract
// ---------------------------------------------------------------------------

import adapter from '../src/cities/przemysl/index.js';

test('adapter: exports all required contract fields', () => {
  assert.equal(adapter.id, 'przemysl');
  assert.equal(adapter.host, 'bip.przemysl.pl');
  assert.equal(typeof adapter.crawlActive, 'function', 'crawlActive must be a function');
  assert.equal(typeof adapter.crawlResultDocs, 'function', 'crawlResultDocs must be a function');
  assert.equal(typeof adapter.parseResultDoc, 'function', 'parseResultDoc must be a function');
  assert.equal(adapter.enrichActive, undefined, 'enrichActive must not be present');
});
