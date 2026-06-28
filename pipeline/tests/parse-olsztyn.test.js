// Olsztyn parser tests — groundtruthed against REAL fixtures (2026-06-27).
//
// Fixtures captured from bip.olsztyn.eu:
//   Result page (17 Apr 2026 session):
//     https://bip.olsztyn.eu/2905/informacja-o-wynikach-przetargow-na-sprzedaz-lokali-mieszkalnych-stanowiacych-wlasnosc-gminy-olsztyn-ktore-odbyly-sie-w-dniu-17-kwietnia-2026-r.-w-siedzibie-urzedu-miasta-olsztyna.html
//   Result page (20 Mar 2026 session, mixed flat + commercial):
//     https://bip.olsztyn.eu/2720/informacja-o-wynikach-przetargow-z-20.03.2026-r..html
//   Announcement (Curie-Skłodowskiej 2a, 17 Apr 2026):
//     https://bip.olsztyn.eu/2626/ogloszenie-o-przetargu-ustnym-nieograniczonym-na-sprzedaz-lokalu-mieszkalnego-nr-2a-w-budynku-nr-10-przy-ulicy-curie-sklodowskiej-w-olsztynie.html
//
// All field values are verified against the actual live pages — not inferred.
//
// Ground truth (17 Apr 2026 session):
//   Curie-Skłodowskiej 10/2a: wywoławcza 380 000 → osiągnięta 384 000 (sold)
//   Curie-Skłodowskiej 10/2:  wywoławcza 460 000 → osiągnięta 464 600 (sold)
//   Kasprowicza 5b/13:        wywoławcza 540 000 → brak wpłat (unsold)
//   Partyzantów 69/8:         wywoławcza 640 000 → osiągnięta 646 400 (sold)
//
// Ground truth (20 Mar 2026 session, mixed page):
//   Bałtyckiej 25B/4:  wywoławcza 250 000 → osiągnięta 252 500 (sold)  [lokal mieszkalny]
//   Dąbrowszczaków 14/??: lokal nieMIESZKALNY — must be SKIPPED
//   Partyzantów 73/6:  wywoławcza 200 000 → osiągnięta 362 000 (sold)  [lokal mieszkalny]
//   Partyzantów 67/4a: wywoławcza 400 000 → osiągnięta 404 000 (sold)  [lokal mieszkalny]
//
// Announcement (Curie-Skłodowskiej 2a):
//   area = 54.7 m², wywoławcza = 380 000 zł, auction_date = 2026-04-17, round = 1

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseResultDoc, parseActiveDoc, stripTags } from '../src/cities/olsztyn/parse.js';
import { parseIndexPage } from '../src/cities/olsztyn/crawl.js';

// ── stripTags helper ─────────────────────────────────────────────────────────

test('stripTags: removes HTML tags and decodes common entities', () => {
  assert.equal(stripTags('<p>cena wywoławcza: <strong>380&nbsp;000,00 zł</strong></p>'), 'cena wywoławcza: 380 000,00 zł');
  assert.equal(stripTags('<li>najwyższa cena osiągnięta w przetargu &ndash; 384 000,00 zł</li>'), 'najwyższa cena osiągnięta w przetargu – 384 000,00 zł');
  assert.equal(stripTags(''), '');
  assert.equal(stripTags(null), '');
});

// ── parseIndexPage helper ────────────────────────────────────────────────────

const INDEX_HTML = `
<tr class="c-grid-table--head"><th>...</th></tr>
<tr data-key="2905">
  <td data-col-count>1</td>
  <td data-col-date>06-05-2026</td>
  <td data-col-main><a href="/2905/informacja-o-wynikach-przetargow-na-sprzedaz-lokali-mieszkalnych-stanowiacych-wlasnosc-gminy-olsztyn-ktore-odbyly-sie-w-dniu-17-kwietnia-2026-r.-w-siedzibie-urzedu-miasta-olsztyna.html" data-pjax="0">Informacja o wynikach przetargów na sprzedaż lokali mieszkalnych stanowiących własność Gminy Olsztyn, które odbyły się w dniu 17 kwietnia 2026 r. w siedzibie Urzędu Miasta Olsztyna</a></td>
  <td data-col-select>Informacja o wynikach przetargów nieruchomości</td>
  <td data-col-select>Archiwalny</td>
</tr>
<tr data-key="3033">
  <td data-col-count>2</td>
  <td data-col-date>01-06-2026</td>
  <td data-col-main><a href="/3033/informacja-o-wynikach-przetargow-na-sprzedaz-nieruchomosci-gruntowych-gminy-olsztyn-ktore-odbyly-sie-w-dniu-22-maja-2026-r..html" data-pjax="0">Informacja o wynikach przetargów na sprzedaż nieruchomości gruntowych Gminy Olsztyn, które odbyły się w dniu 22 maja 2026 r.</a></td>
  <td data-col-select>Informacja o wynikach przetargów nieruchomości</td>
  <td data-col-select>Aktualny</td>
</tr>
`;

test('parseIndexPage: extracts 2 rows with id, title, detailUrl, published_date', () => {
  const rows = parseIndexPage(INDEX_HTML);
  assert.equal(rows.length, 2);
  const r = rows[0];
  assert.equal(r.id, '2905');
  assert.equal(r.published_date, '2026-05-06');
  assert.ok(r.detailUrl.includes('/2905/'));
  assert.ok(r.title.includes('lokali mieszkalnych'));
});

test('parseIndexPage: date converted from DD-MM-YYYY to YYYY-MM-DD', () => {
  const rows = parseIndexPage(INDEX_HTML);
  assert.equal(rows[0].published_date, '2026-05-06');
  assert.equal(rows[1].published_date, '2026-06-01');
});

test('parseIndexPage: returns empty array for empty / no-rows HTML', () => {
  assert.deepEqual(parseIndexPage('<table><tr><th>head</th></tr></table>'), []);
  assert.deepEqual(parseIndexPage(''), []);
});

// ── parseResultDoc — 17 April 2026 session (4 flats, new format) ─────────────
//
// Fixture text reproduced faithfully from the live page (get_page_text output,
// 2026-06-27). Minimal HTML retained to exercise stripTags; prose is verbatim.

const RESULT_17APR_TEXT = `
Informacja o wynikach przetargów na sprzedaż lokali mieszkalnych stanowiących własność Gminy Olsztyn, które odbyły się w dniu 17 kwietnia 2026 r. w siedzibie Urzędu Miasta Olsztyna

Na podstawie § 12 Rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości (t.j. Dz. U. z 2021 r. poz. 2213 ze zm.), podaję do publicznej wiadomości informację o wynikach przetargów ustnych przeprowadzonych w dniu 17 kwietnia 2026 r. w siedzibie Urzędu Miasta Olsztyna, plac Jana Pawła II 1 w sali nr 219:

przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 2a położonego na I piętrze 4-kondygnacyjnego budynku nr 10 zlokalizowanego przy ul. Curie-Skłodowskiej, obr. 63 m. Olsztyn, z jednoczesną sprzedażą 93/1000 części wspólnych budynku oraz gruntu pod budynkiem objętym księgą wieczystą nr OL1O/00046168/2 (dz. nr 48/4 o powierzchni 235 m²) oraz oddaniem w użytkowanie wieczyste udziału wynoszącego 35/1000 cz. w gruncie, przeznaczonym do racjonalnej obsługi budynku, składającym się z działek o nr ewidencyjnym 48/3 i 49/3 o łącznej powierzchni 336 m². Nieruchomość ta objęta jest księgą wieczystą nr OL1O/00053295/3.
liczba osób dopuszczonych do przetargu: 2 osoby,
brak osób niedopuszczonych do przetargu,
cena wywoławcza: 380 000,00 zł,
najwyższa cena osiągnięta w przetargu: 384 000,00 zł,
nabywca nieruchomości: REM Consulting Sp. z o.o. z siedzibą w Olsztynie

przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 2 położonego na I piętrze 4-kondygnacyjnego budynku nr 10 zlokalizowanego przy ul. Curie-Skłodowskiej, obr. 63 m. Olsztyn, z jednoczesną sprzedażą 158/1000 części wspólnych budynku oraz gruntu pod budynkiem objętym księgą wieczystą nr OL1O/00046168/2 (dz. nr 48/4 o powierzchni 235 m²) oraz oddaniem w użytkowanie wieczyste udziału wynoszącego 60/1000 cz. w gruncie, przeznaczonym do racjonalnej obsługi budynku, składającym się z działek o nr ewidencyjnym 48/3 i 49/3 o łącznej powierzchni 336 m². Nieruchomość ta objęta jest księgą wieczystą nr OL1O/00053295/3.
liczba osób dopuszczonych do przetargu: 1 osoba,
liczba osób niedopuszczonych do przetargu: 1 osoba, brak stawiennictwa na przetargu,
cena wywoławcza: 460 000,00 zł,
najwyższa cena osiągnięta w przetargu: 464 600,00 zł,
nabywca nieruchomości: REM Consulting Sp. z o.o. z siedzibą w Olsztynie.

przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 13 położonego na III piętrze 5-kondygnacyjnego budynku nr 5b zlokalizowanego przy ul. Kasprowicza 5a,5b w Olsztynie, z jednoczesną sprzedażą 45/1000 części wspólnych budynku oraz gruntu pod budynkiem (dz. nr 4, obr. 29, o powierzchni 670 m²). Nieruchomość objęta jest księgą wieczystą nr OL1O/00020517/6.
liczba osób dopuszczonych do przetargu: 0, brak wpłat
cena wywoławcza: 540 000,00 zł.

przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 8 położonego na poddaszu 4-kondygnacyjnego budynku nr 69 zlokalizowanego przy ul. Partyzantów w Olsztynie, z jednoczesną sprzedażą 103/1000 części wspólnych budynku oraz gruntu pod budynkiem objętym księgą wieczystą nr OL1O/00020572/9 (obr.72, dz. nr 245 o powierzchni 303 m²) wraz ze sprzedażą udziału wynoszącego 103/1000 cz. w prawie własności gruntu, przeznaczonego do racjonalnej obsługi budynku, składającego się z działek o nr ewidencyjnym 246/1 i 6/8 obr. 72 o łącznej powierzchni 123 m². Nieruchomość ta objęta jest księgą wieczystą nr OL1O/00064157/4.
liczba osób dopuszczonych do przetargu: 1 osoba,
liczba osób niedopuszczonych do przetargu: 1 osoba, brak stawiennictwa na przetargu,
cena wywoławcza: 640 000,00 zł,
najwyższa cena osiągnięta w przetargu: 646 400,00 zł,
nabywca nieruchomości: Szupryczyńscy Sp. z o.o. z siedzibą w Ostrzeszewie, gm. Purda.
`;

const SRC_2905 = 'https://bip.olsztyn.eu/2905/informacja-o-wynikach-przetargow-na-sprzedaz-lokali-mieszkalnych-stanowiacych-wlasnosc-gminy-olsztyn-ktore-odbyly-sie-w-dniu-17-kwietnia-2026-r.-w-siedzibie-urzedu-miasta-olsztyna.html';

test('parseResultDoc: 17 Apr 2026 session — returns 4 records', () => {
  const recs = parseResultDoc(RESULT_17APR_TEXT, '2026-05-06', SRC_2905);
  assert.equal(recs.length, 4);
});

test('parseResultDoc: 17 Apr 2026 — session date extracted as 2026-04-17', () => {
  const recs = parseResultDoc(RESULT_17APR_TEXT, '2026-05-06', SRC_2905);
  for (const r of recs) {
    assert.equal(r.auction_date, '2026-04-17');
  }
});

test('parseResultDoc: Curie-Skłodowskiej 10/2a — wywoławcza 380 000, osiągnięta 384 000, sold', () => {
  const recs = parseResultDoc(RESULT_17APR_TEXT, '2026-05-06', SRC_2905);
  const r = recs.find((x) => x.address?.apt === '2A');
  assert.ok(r, 'must find apt 2A record');
  assert.equal(r.starting_price_pln, 380000);
  assert.equal(r.final_price_pln, 384000);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.kind, 'mieszkalny');
});

test('parseResultDoc: Curie-Skłodowskiej 10/2 — wywoławcza 460 000, osiągnięta 464 600, sold', () => {
  const recs = parseResultDoc(RESULT_17APR_TEXT, '2026-05-06', SRC_2905);
  const r = recs.find((x) => x.address?.apt === '2' && x.address?.building === '10');
  assert.ok(r, 'must find apt 2 record');
  assert.equal(r.starting_price_pln, 460000);
  assert.equal(r.final_price_pln, 464600);
  assert.equal(r.outcome, 'sold');
});

test('parseResultDoc: Kasprowicza 5b/13 — brak wpłat → unsold, no final price', () => {
  const recs = parseResultDoc(RESULT_17APR_TEXT, '2026-05-06', SRC_2905);
  const r = recs.find((x) => x.address?.apt === '13');
  assert.ok(r, 'must find apt 13 record');
  assert.equal(r.starting_price_pln, 540000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'unknown');
  // Regression: building must be 5B (from "budynku nr 5b"), NOT 5A (first number
  // in the multi-building street fragment "Kasprowicza 5a,5b").
  assert.equal(r.address?.building, '5B', 'building must be 5B not 5A');
  assert.equal(r.address?.street, 'Kasprowicza', 'street must be clean (no digits/commas)');
});

test('parseResultDoc: Partyzantów 69/8 — wywoławcza 640 000, osiągnięta 646 400, sold', () => {
  const recs = parseResultDoc(RESULT_17APR_TEXT, '2026-05-06', SRC_2905);
  const r = recs.find((x) => x.address?.apt === '8');
  assert.ok(r, 'must find apt 8 record');
  assert.equal(r.starting_price_pln, 640000);
  assert.equal(r.final_price_pln, 646400);
  assert.equal(r.outcome, 'sold');
});

test('parseResultDoc: all records have kind=mieszkalny and source_pdf set', () => {
  const recs = parseResultDoc(RESULT_17APR_TEXT, '2026-05-06', SRC_2905);
  for (const r of recs) {
    assert.equal(r.kind, 'mieszkalny');
    assert.equal(r.source_pdf, SRC_2905);
  }
});

// ── parseResultDoc — 20 March 2026 session (mixed: flat + commercial + land) ─
//
// This page mixes:
//   1. lokal mieszkalny nr 4 at ul. Bałtyckiej 25B (KEEP)
//   2. lokal nieMIESZKALNY nr 7 at ul. Dąbrowszczaków 14 (SKIP)
//   3. lokal mieszkalny nr 6 at ul. Partyzantów 73 (KEEP)
//   4. lokal mieszkalny nr 4a at ul. Partyzantów 67 (KEEP)
//
// Older price format: "cena lokalu: X zł" + "cena Y/Z gruntu: W zł" summed
// into wywoławcza rather than a single "cena wywoławcza: N zł" line.
//
// Ground truth verified from live page 2026-06-27:
//   Bałtyckiej 25B/4:    wywoławcza 250 000 (173 000 lokal + 77 000 grunt) → 252 500
//   Partyzantów 73/6:    wywoławcza 200 000 (190 000 + 7 800 + 2 200)      → 362 000
//   Partyzantów 67/4a:   wywoławcza 400 000 (376 000 + 16 000 + 8 000)     → 404 000

const RESULT_20MAR_TEXT = `
Informacja o wynikach przetargów z 20.03.2026 r.

Na podstawie § 12 ... podaję do publicznej wiadomości informację o wynikach przetargów ustnych przeprowadzonych w dniu 20 marca 2026 r.:

przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 4, znajdującego się na I piętrze budynku nr 25B, położonego przy ul. Bałtyckiej w Olsztynie wraz ze sprzedażą udziału 10/100 w częściach wspólnych budynku oraz sprzedażą udziału w gruncie pod budynkiem (obręb 33, działka nr 229, o pow. 1051 m2, KW Nr OL1O/00165573/4).
cena lokalu -173 000,00 zł
cena 10/100 części gruntu (dz. nr 229) - 77 000,00 zł
najwyższa cena osiągnięta w przetargu – 252 500,00 zł

przetarg ustny nieograniczony na sprzedaż lokalu nieMIESZKALNEGO nr 7, znajdującego się na poddaszu budynku nr 14, położonym przy ul. Dąbrowszczaków w Olsztynie wraz ze sprzedażą udziału 30/1000 w częściach wspólnych budynku.
cena lokalu - 130 000,00 zł
cena 30/1000 części gruntu (dz. nr 166) - 8 000,00 zł
cena 30/1000 części gruntu (dz. nr 374) - 2 000,00 zł
najwyższa cena osiągnięta w przetargu – 252 000,00 zł

przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 6, znajdującego się na II piętrze budynku nr 73, położonym przy ul. Partyzantów w Olsztynie wraz ze sprzedażą udziału 3/100 w częściach wspólnych budynku.
cena lokalu -190 000,00 zł
cena 3/100 części gruntu (dz. nr 108) - 7 800,00 zł
cena 3/100 części gruntu (dz. nr 109/1) - 2 200,00 zł
najwyższa cena osiągnięta w przetargu – 362 000,00 zł

przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 4a, położonego na I piętrze 4-kondygnacyjnego budynku nr 67 zlokalizowanego przy ul. Partyzantów w Olsztynie.
cena lokalu - 376 000,00 zł
cena 5/100 części gruntu (dz. nr 249) - 16 000,00 zł
cena 5/100 części gruntu (dz. nr 401/1, 6/4) - 8 000,00 zł
najwyższa cena osiągnięta w przetargu – 404 000,00 zł
`;

const SRC_2720 = 'https://bip.olsztyn.eu/2720/informacja-o-wynikach-przetargow-z-20.03.2026-r..html';

test('parseResultDoc: 20 Mar 2026 mixed page — returns 3 records (skips lokal nieMIESZKALNY)', () => {
  const recs = parseResultDoc(RESULT_20MAR_TEXT, '2026-03-30', SRC_2720);
  assert.equal(recs.length, 3, 'must be 3 residential flats (commercial skipped)');
  // Verify no record has an address that would match Dąbrowszczaków (the skipped one)
  const hasCommercial = recs.some((r) => /dabrowszczak/i.test(r.address_raw || ''));
  assert.equal(hasCommercial, false);
});

test('parseResultDoc: 20 Mar — session date extracted as 2026-03-20 (spelled month)', () => {
  const recs = parseResultDoc(RESULT_20MAR_TEXT, '2026-03-30', SRC_2720);
  for (const r of recs) {
    assert.equal(r.auction_date, '2026-03-20');
  }
});

test('parseResultDoc: Bałtyckiej 25B/4 — split-format wywoławcza 250 000, osiągnięta 252 500', () => {
  const recs = parseResultDoc(RESULT_20MAR_TEXT, '2026-03-30', SRC_2720);
  const r = recs.find((x) => x.address?.apt === '4' && /baltycki/i.test(x.address?.street_norm || ''));
  assert.ok(r, 'must find Bałtyckiej record');
  assert.equal(r.starting_price_pln, 250000, 'sum: 173 000 + 77 000 = 250 000');
  assert.equal(r.final_price_pln, 252500);
  assert.equal(r.outcome, 'sold');
});

test('parseResultDoc: Partyzantów 73/6 — split-format wywoławcza 200 000, osiągnięta 362 000', () => {
  const recs = parseResultDoc(RESULT_20MAR_TEXT, '2026-03-30', SRC_2720);
  const r = recs.find((x) => x.address?.apt === '6' && /partyzantow/i.test(x.address?.street_norm || ''));
  assert.ok(r, 'must find Partyzantów/6 record');
  assert.equal(r.starting_price_pln, 200000, 'sum: 190 000 + 7 800 + 2 200 = 200 000');
  assert.equal(r.final_price_pln, 362000);
  assert.equal(r.outcome, 'sold');
});

test('parseResultDoc: Partyzantów 67/4a — split-format wywoławcza 400 000, osiągnięta 404 000', () => {
  const recs = parseResultDoc(RESULT_20MAR_TEXT, '2026-03-30', SRC_2720);
  const r = recs.find((x) => x.address?.apt === '4A');
  assert.ok(r, 'must find apt 4a record');
  assert.equal(r.starting_price_pln, 400000, 'sum: 376 000 + 16 000 + 8 000 = 400 000');
  assert.equal(r.final_price_pln, 404000);
  assert.equal(r.outcome, 'sold');
});

// ── parseResultDoc — Feb 2026 single-flat result (with "nabywca" field) ──────
//
// Ground truth from /2493/ (6 Feb 2026 session, 1 flat):
//   Kościuszki 23/4: II przetarg, wywoławcza 800 000 zł, osiągnięta 808 000 zł,
//   nabywca: Pan Karol Śliwiński

const RESULT_6FEB_TEXT = `
Informacja o wynikach przetargów na zbycie nieruchomości, które odbyły się w dniu 6 lutego 2026 r.

II przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 4, znajdującego się na I piętrze budynku nr 23, położonego przy ul. Kościuszki w Olsztynie wraz ze sprzedażą udziału 102/1000 w częściach wspólnych budynku.
Cena wywoławcza nieruchomości: 800 000,00 zł, w tym:
cena lokalu: 753 000,00 zł
cena 102/1000 części gruntu (dz. nr 37) 40 000,00 zł
cena 102/1000 części gruntu (dz. nr 40/7) 7 000,00 zł
najwyższa cena osiągnięta w przetargu – 808 000,00 zł
nabywca nieruchomości – Pan Karol Śliwiński, zamieszkały Olsztyn.
`;

const SRC_2493 = 'https://bip.olsztyn.eu/2493/informacja-o-wynikach-przetargow-na-zbycie-niruchomosci-ktore-odbyly-sie-w-dniu-6-lutego-2026-r..html';

test('parseResultDoc: Feb 2026 — 1 record, round 2 (II przetarg)', () => {
  const recs = parseResultDoc(RESULT_6FEB_TEXT, '2026-02-16', SRC_2493);
  assert.equal(recs.length, 1);
  assert.equal(recs[0].round, 2);
});

test('parseResultDoc: Feb 2026 — explicit "Cena wywoławcza nieruchomości" wins over split', () => {
  const recs = parseResultDoc(RESULT_6FEB_TEXT, '2026-02-16', SRC_2493);
  assert.equal(recs[0].starting_price_pln, 800000);
  assert.equal(recs[0].final_price_pln, 808000);
  assert.equal(recs[0].outcome, 'sold');
});

test('parseResultDoc: Feb 2026 — auction date extracted from body (6 February 2026)', () => {
  const recs = parseResultDoc(RESULT_6FEB_TEXT, '2026-02-16', SRC_2493);
  assert.equal(recs[0].auction_date, '2026-02-06');
});

// ── parseResultDoc — edge cases ──────────────────────────────────────────────

test('parseResultDoc: empty/null input returns empty array', () => {
  assert.deepEqual(parseResultDoc('', null, 'https://example.com'), []);
  assert.deepEqual(parseResultDoc(null, null, 'https://example.com'), []);
});

test('parseResultDoc: page with no "lokal mieszkalny" blocks returns empty', () => {
  const landOnly = `
    przetarg ustny nieograniczony na sprzedaż nieruchomości gruntowych działka nr 123
    cena wywoławcza: 10 000,00 zł
    najwyższa cena osiągnięta w przetargu – 10 100,00 zł
  `;
  assert.deepEqual(parseResultDoc(landOnly, null, 'https://example.com'), []);
});

test('parseResultDoc: fallbackDate used when body has no date', () => {
  const noDate = `
    przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 1 w budynku nr 5 przy ul. Testowej w Olsztynie wraz ze sprzedażą gruntu.
    cena wywoławcza: 100 000,00 zł,
    najwyższa cena osiągnięta w przetargu: 101 000,00 zł,
    nabywca nieruchomości: Kowalski Jan.
  `;
  const recs = parseResultDoc(noDate, '2026-01-15', 'https://example.com');
  assert.equal(recs.length, 1);
  assert.equal(recs[0].auction_date, '2026-01-15');
});

// ── parseActiveDoc — announcement page (Curie-Skłodowskiej 2a) ───────────────
//
// Ground truth from /2626/ (published 2026-03-13, auction 2026-04-17):
//   address: Curie-Skłodowskiej 10/2a
//   area: 54.7 m²
//   wywoławcza: 380 000 zł
//   auction_date: 2026-04-17
//   round: 1

const ANN_TITLE_2A = 'Ogłoszenie o przetargu ustnym nieograniczonym na sprzedaż lokalu mieszkalnego nr 2a w budynku nr 10 przy ulicy Curie-Skłodowskiej w Olsztynie';
const ANN_BODY_2A = `Prezydent Olsztyna ogłasza przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego stanowiącego własność Gminy Olsztyn.
Przedmiotem sprzedaży jest lokal nr 2a położony na I piętrze 4-kondygnacyjnego budynku nr 10 zlokalizowanego przy ul. Curie-Skłodowskiej, obr. 63 m. Olsztyn, z jednoczesną sprzedażą 93/1000 części wspólnych budynku.
Powierzchnia użytkowa lokalu wynosi 54,7 m². W skład lokalu wchodzą: 2 pokoje, kuchnia, łazienka.
2. Cenę wywoławczą nieruchomości ustalono na kwotę 380 000 zł, w tym:
cena lokalu: 350 000 zł,
cena gruntu pod budynkiem, działka nr 48/4: 19 000 zł,
cena gruntu do obsługi budynku, działki nr 48/3 i 49/3: 11 000 zł,
3. Przetarg odbędzie się 17 kwietnia 2026 r. o godz. 10:00 w siedzibie Urzędu Miasta Olsztyna, pl. Jana Pawła II 1, w sali 219, II piętro.`;

test('parseActiveDoc: Curie-Skłodowskiej 2a — address key correct', () => {
  const r = parseActiveDoc(ANN_TITLE_2A, ANN_BODY_2A);
  assert.ok(r);
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.building, '10');
  assert.equal(r.address.apt, '2A');
  assert.ok(/curie|sklodowsk/i.test(r.address.street_norm));
});

test('parseActiveDoc: Curie-Skłodowskiej 2a — area 54.7 m²', () => {
  const r = parseActiveDoc(ANN_TITLE_2A, ANN_BODY_2A);
  assert.equal(r.area_m2, 54.7);
});

test('parseActiveDoc: Curie-Skłodowskiej 2a — starting price 380 000 zł', () => {
  const r = parseActiveDoc(ANN_TITLE_2A, ANN_BODY_2A);
  assert.equal(r.starting_price_pln, 380000);
});

test('parseActiveDoc: Curie-Skłodowskiej 2a — auction date 2026-04-17', () => {
  const r = parseActiveDoc(ANN_TITLE_2A, ANN_BODY_2A);
  assert.equal(r.auction_date, '2026-04-17');
});

test('parseActiveDoc: Curie-Skłodowskiej 2a — round 1 (no ordinal in title)', () => {
  const r = parseActiveDoc(ANN_TITLE_2A, ANN_BODY_2A);
  assert.equal(r.round, 1);
});

test('parseActiveDoc: null/empty inputs return null without throwing', () => {
  assert.equal(parseActiveDoc('', ''), null);
  assert.equal(parseActiveDoc(null, null), null);
});

test('parseActiveDoc: round 2 detected from title "II przetarg"', () => {
  const title2 = 'Ogłoszenie o II przetargu ustnym nieograniczonym na sprzedaż lokalu mieszkalnego nr 5 w budynku nr 3 przy ulicy Limanowskiego w Olsztynie';
  const body2 = `Powierzchnia użytkowa lokalu wynosi 38,0 m².
Cenę wywoławczą nieruchomości ustalono na kwotę 150 000 zł.
Przetarg odbędzie się 15 maja 2026 r. o godz. 10:00.`;
  const r = parseActiveDoc(title2, body2);
  assert.ok(r);
  assert.equal(r.round, 2);
  assert.equal(r.auction_date, '2026-05-15');
  assert.equal(r.starting_price_pln, 150000);
  assert.equal(r.area_m2, 38.0);
});

// ── Multi-building announcement: "Kasprowicza 5a, 5b" ───────────────────────
//
// When a single announcement covers two buildings (e.g. "przy ulicy Kasprowicza
// 5a, 5b w Olsztynie"), the street capture used to bleed the building list into
// the street field ("Kasprowicza 5a, 5b"), producing a junk-street key.
// The correct output: street="Kasprowicza", building from "budynku nr 5b".
//
// Bug reproduced live with sanity-check error:
//   ERROR olsztyn: [junk-street] kasprowicza 5a 5b|5B|13 -- street 'Kasprowicza 5a, 5b'

// Active announcement title as it appears on bip.olsztyn.eu for the flat in
// building 5b (apt 13) of the Kasprowicza multi-building group.
const ANN_TITLE_KASP = 'Ogłoszenie o przetargu ustnym nieograniczonym na sprzedaż lokalu mieszkalnego nr 13 w budynku nr 5b przy ulicy Kasprowicza 5a, 5b w Olsztynie';
const ANN_BODY_KASP = `Prezydent Olsztyna ogłasza przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego stanowiącego własność Gminy Olsztyn.
Przedmiotem sprzedaży jest lokal nr 13 położony na III piętrze 5-kondygnacyjnego budynku nr 5b zlokalizowanego przy ul. Kasprowicza 5a,5b w Olsztynie.
Powierzchnia użytkowa lokalu wynosi 68,0 m². W skład lokalu wchodzą: 3 pokoje, kuchnia, łazienka.
Cenę wywoławczą nieruchomości ustalono na kwotę 540 000 zł.
Przetarg odbędzie się 17 kwietnia 2026 r. o godz. 10:00 w siedzibie Urzędu Miasta Olsztyna.`;

test('parseActiveDoc: Kasprowicza multi-building — street clean, building=5B', () => {
  const r = parseActiveDoc(ANN_TITLE_KASP, ANN_BODY_KASP);
  assert.ok(r, 'must parse the announcement');
  // Street must be a bare name with no digits or commas (no junk-street).
  assert.equal(r.address.street, 'Kasprowicza');
  assert.ok(!/\d/.test(r.address.street), 'street must contain no digits');
  // Building comes from "budynku nr 5b", not from the street fragment.
  assert.equal(r.address.building, '5B');
  assert.equal(r.address.apt, '13');
});

test('parseActiveDoc: Kasprowicza multi-building — area 68 m², price 540 000', () => {
  const r = parseActiveDoc(ANN_TITLE_KASP, ANN_BODY_KASP);
  assert.ok(r);
  assert.equal(r.area_m2, 68.0);
  assert.equal(r.starting_price_pln, 540000);
  assert.equal(r.auction_date, '2026-04-17');
});

test('parseActiveDoc: Kasprowicza multi-building — key has no spaces/commas in street part', () => {
  const r = parseActiveDoc(ANN_TITLE_KASP, ANN_BODY_KASP);
  assert.ok(r);
  // key format: "<street_norm>|<building>|<apt>"
  // Before fix the key was: "kasprowicza 5a 5b|5B|13"  (junk-street)
  // After fix the key must be: "kasprowicza|5B|13"
  assert.equal(r.address.key, 'kasprowicza|5B|13');
});

// Result page with the Kasprowicza 5a,5b block (same text as RESULT_17APR_TEXT
// fixture but exercised explicitly for the building-override code path).
const RESULT_KASP_ONLY = `
Informacja testowa

przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 13 położonego na III piętrze 5-kondygnacyjnego budynku nr 5b zlokalizowanego przy ul. Kasprowicza 5a,5b w Olsztynie, z jednoczesną sprzedażą 45/1000 części wspólnych budynku oraz gruntu pod budynkiem (dz. nr 4, obr. 29, o powierzchni 670 m²). Nieruchomość objęta jest księgą wieczystą nr OL1O/00020517/6.
liczba osób dopuszczonych do przetargu: 0, brak wpłat
cena wywoławcza: 540 000,00 zł.
`;

test('parseResultDoc: Kasprowicza 5a,5b multi-building — building=5B, street clean', () => {
  const recs = parseResultDoc(RESULT_KASP_ONLY, '2026-04-17', 'https://example.com');
  assert.equal(recs.length, 1, 'one flat record');
  const r = recs[0];
  assert.equal(r.address.street, 'Kasprowicza');
  assert.ok(!/\d/.test(r.address.street), 'street must not contain digits');
  assert.equal(r.address.building, '5B', 'building from budynku nr 5b');
  assert.equal(r.address.apt, '13');
  assert.equal(r.address.key, 'kasprowicza|5B|13');
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.starting_price_pln, 540000);
});
