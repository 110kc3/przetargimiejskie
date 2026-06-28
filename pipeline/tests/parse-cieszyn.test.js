// Cieszyn parser tests. Fixtures from live bip.um.cieszyn.pl (2026-06-28):
//
//   ANN_WYSZA_BRAMA_I  -- id 40241, ul. Wyzsza Brama 11/6, I przetarg 26.11.2025
//     cena wywolawcza 152 000,00 zl, area 27,54 m2
//     https://bip.um.cieszyn.pl/przetarg-nieruchomosci/40241/...
//
//   ANN_WYSZA_BRAMA_II -- id 40896, ul. Wyzsza Brama 11/6, II przetarg 04.03.2026
//     cena wywolawcza 76 000,00 zl, area 27,54 m2
//     wynik link: /artykul/21/41397/... (expired 20.03.2026)
//     https://bip.um.cieszyn.pl/przetarg-nieruchomosci/40896/...
//
//   ANN_GORNA -- id 39582, ul. Gorna 14/4 (BIP writes "przy ul. Gornej"),
//     III przetarg 06.08.2025, cena 160 000,00 zl, area 40,95 m2
//     https://bip.um.cieszyn.pl/przetarg-nieruchomosci/39582/...
//
//   RESULT_WYSZA_BRAMA -- synthetic in standard Logonet wynik format.
//     Wyzsza Brama 11/6, II przetarg 04.03.2026, sold 77 000 zl.
//
// Join keys the first real refresh must confirm:
//   ANN_WYSZA_BRAMA_I  -> address.key = 'wyzsza brama|11|6'  round null (bare I przetarg)
//   ANN_WYSZA_BRAMA_II -> address.key = 'wyzsza brama|11|6'  round 2
//   ANN_GORNA          -> address.key = 'gornej|14|4'         round 3

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  roundFromText,
  auctionDateFromText,
  resultDateFromText,
  startingPriceFromText,
  achievedPriceFromText,
  unitAreaFromText,
  addressFromBody,
  isResultNotice,
  parseIndexPage,
  parseDetailPage,
  parseResultDoc,
} from '../src/cities/cieszyn/parse.js';

// ── FIXTURES (condensed from live pages, 2026-06-28) ─────────────────────────

const ANN_WYSZA_BRAMA_I_BODY = 'Burmistrz Miasta Cieszyna oglasza ustny przetarg nieograniczony na sprzedaz lokalu mieszkalnego nr 6 polozonego na parterze w budynku nr 11 przy ul. Wyzsza Brama w Cieszynie o pow. uzytkowej 27,54 m2, z dwoma przynaleznymi pomieszczeniami gospodarczymi o lacznej pow. 3,71 m2. Cena wywolawcza nieruchomosci wynosi 152 000,00 zl. Przetarg odbedzie sie w dniu 26 listopada 2025 r. w sali nr 205 Urzedu Miejskiego w Cieszynie o godz. 11:00.';

const ANN_WYSZA_BRAMA_II_BODY = 'Burmistrz Miasta Cieszyna oglasza II ustny przetarg nieograniczony na sprzedaz lokalu mieszkalnego nr 6 polozonego na parterze w budynku nr 11 przy ul. Wyzsza Brama w Cieszynie o pow. uzytkowej 27,54 m2. Na sprzedaz ww. nieruchomosci przeprowadzono jeden ustny przetarg nieograniczony w terminie 26 listopada 2025 r. (I przetarg), ktory zakonczyl sie wynikiem negatywnym. Cena wywolawcza nieruchomosci wynosi 76 000,00 zl. Przetarg odbedzie sie w dniu 4 marca 2026 r. w sali nr 205 Urzedu Miejskiego w Cieszynie o godz. 12:00.';

const ANN_GORNA_BODY = 'Burmistrz Miasta Cieszyna oglasza III ustny przetarg nieograniczony na sprzedaz lokalu mieszkalnego nr 4 polozonego na I pietrze w budynku nr 14 przy ul. Gornej w Cieszynie o pow. uzytkowej 40,95 m2, z pomieszczeniem gospodarczym - piwnica o pow. 6,51 m2. Na sprzedaz ww. nieruchomosci przeprowadzono dwa ustne przetargi nieograniczone. Cena wywolawcza nieruchomosci wynosi 160 000,00 zl. Przetarg odbedzie sie w dniu 6 sierpnia 2025 r. w sali nr 205 Urzedu Miejskiego w Cieszynie o godz. 13:00.';

// Synthetic wynik text -- Logonet result format, Wyzsza Brama 11/6 II przetarg
const RESULT_WYSZA_BRAMA = 'INFORMACJA o wyniku II ustnego przetargu nieograniczonego na sprzedaz lokalu mieszkalnego nr 6 polozonego na parterze w budynku nr 11 przy ul. Wyzsza Brama w Cieszynie. W dniu 4 marca 2026 r. zostal przeprowadzony w siedzibie Urzedu Miejskiego w Cieszynie II ustny przetarg nieograniczony na sprzedaz lokalu mieszkalnego nr 6 w budynku nr 11 przy ul. Wyzsza Brama w Cieszynie o pow. uzytkowej 27,54 m2. Cena wywolawcza nieruchomosci wynosi 76 000,00 zl. Najwyzsza cena osiagnieta w przetargu wyniosla 77 000,00 zl. Nabywca: Jan Kowalski.';

const RESULT_WYSZA_BRAMA_UNSOLD = 'INFORMACJA o wyniku I ustnego przetargu nieograniczonego na sprzedaz lokalu mieszkalnego nr 6 w budynku nr 11 przy ul. Wyzsza Brama w Cieszynie. W dniu 26 listopada 2025 r. zostal przeprowadzony w siedzibie Urzedu Miejskiego w Cieszynie I ustny przetarg nieograniczony na sprzedaz lokalu mieszkalnego nr 6 w budynku nr 11 przy ul. Wyzsza Brama w Cieszynie o pow. uzytkowej 27,54 m2. Cena wywolawcza nieruchomosci wynosi 152 000,00 zl. Przetarg zakonczyl sie wynikiem negatywnym z uwagi na brak uczestnikow przetargu.';

// Condensed index HTML from /przetargi-nieruchomosci/1/15
const INDEX_HTML = `
<div class="list general addon-bip">
  <div><table class="table table-borderless">
    <caption class="visuallyhidden">Adres nieruchomosci : Cieszyn, ul. Wyzsza Brama 11/6</caption>
    <tbody>
    <tr><th scope="row">Adres nieruchomości</th><td class="normal"><a href="https://bip.um.cieszyn.pl/przetarg-nieruchomosci/40896/ii-ustny">Cieszyn, ul. Wyzsza Brama 11/6</a></td></tr>
    <tr><th scope="row">Przetarg na</th><td class="normal">II ustny przetarg nieograniczony na sprzedaz lokalu mieszkalnego</td></tr>
    <tr><th scope="row">Typ przetargu</th><td>ustny przetarg nieograniczony</td></tr>
    <tr><th scope="row">Rodzaj nieruchomości</th><td>lokal mieszkalny</td></tr>
    <tr><th scope="row">Cena wywoławcza</th><td>76 000,00 zł</td></tr>
    <tr><th scope="row">Data przetargu</th><td><time datetime="2026-03-04T12:00:00"><strong>04.03.2026</strong> godz. 12:00</time></td></tr>
    </tbody>
  </table></div>
  <div><table class="table table-borderless">
    <caption class="visuallyhidden">Adres nieruchomosci : Cieszyn, ul. Gorna 14/4</caption>
    <tbody>
    <tr><th scope="row">Adres nieruchomości</th><td class="normal"><a href="https://bip.um.cieszyn.pl/przetarg-nieruchomosci/39582/iii-ustny">Cieszyn, ul. Gorna 14/4</a></td></tr>
    <tr><th scope="row">Przetarg na</th><td class="normal">III ustny przetarg nieograniczony na sprzedaz lokalu mieszkalnego nr 4</td></tr>
    <tr><th scope="row">Typ przetargu</th><td>ustny przetarg nieograniczony</td></tr>
    <tr><th scope="row">Rodzaj nieruchomości</th><td>lokal mieszkalny</td></tr>
    <tr><th scope="row">Cena wywoławcza</th><td>160 000,00 zł</td></tr>
    <tr><th scope="row">Data przetargu</th><td><time datetime="2025-08-06T13:00:00"><strong>06.08.2025</strong> godz. 13:00</time></td></tr>
    </tbody>
  </table></div>
  <div><table class="table table-borderless">
    <caption class="visuallyhidden">Adres nieruchomosci : Cieszyn, ul. Frysztacka</caption>
    <tbody>
    <tr><th scope="row">Adres nieruchomości</th><td class="normal"><a href="https://bip.um.cieszyn.pl/przetarg-nieruchomosci/40465/ustny">Cieszyn, ul. Frysztacka</a></td></tr>
    <tr><th scope="row">Przetarg na</th><td class="normal">sprzedaz nieruchomosci gruntowej zabudowanej</td></tr>
    <tr><th scope="row">Typ przetargu</th><td>ustny przetarg nieograniczony</td></tr>
    <tr><th scope="row">Rodzaj nieruchomości</th><td>nieruchomość zabudowana</td></tr>
    <tr><th scope="row">Cena wywoławcza</th><td>2 000 000,00 zł</td></tr>
    <tr><th scope="row">Data przetargu</th><td><time datetime="2026-01-21T13:00:00"><strong>21.01.2026</strong></time></td></tr>
    </tbody>
  </table></div>
</div>`;

// Minimal detail page HTML for parseDetailPage integration test
const DETAIL_WYSZA_BRAMA_II_HTML = `<!DOCTYPE html><html><body>
<table class="table table-borderless">
  <caption class="visuallyhidden">Szczegoly</caption>
  <tbody>
  <tr><th scope="row">Adres nieruchomości</th><td class="normal">Cieszyn, ul. Wyzsza Brama 11/6</td></tr>
  <tr><th scope="row">Przetarg na</th><td class="normal">II ustny przetarg nieograniczony na sprzedaz lokalu mieszkalnego</td></tr>
  <tr><th scope="row">Typ przetargu</th><td>ustny przetarg nieograniczony</td></tr>
  <tr><th scope="row">Rodzaj nieruchomości</th><td>lokal mieszkalny</td></tr>
  <tr><th scope="row">Cena wywoławcza</th><td>76 000,00 zł</td></tr>
  <tr><th scope="row">Data przetargu</th><td><time datetime="2026-03-04T12:00:00">04.03.2026 godz. 12:00</time></td></tr>
  </tbody>
</table>
<div class="addon-bip addon-bip-result">
  <div>Rozstrzygniecie</div>
  <div><p>Szczegoły dotyczące wyniku przetargu:
  <a href="https://bip.um.cieszyn.pl/artykul/21/41397/informacja-o-wyniku-ii-ustnego-przetargu">informacja o wyniku</a></p></div>
</div>
<div class="wysiwyg">
<p>${ANN_WYSZA_BRAMA_II_BODY}</p>
</div>
</body></html>`;

// ── roundFromText ─────────────────────────────────────────────────────────────

test('roundFromText: Roman II before "przetarg" -> 2', () => {
  assert.equal(roundFromText('II ustny przetarg nieograniczony na sprzedaz lokalu mieszkalnego'), 2);
});

test('roundFromText: Roman III -> 3', () => {
  assert.equal(roundFromText('III ustny przetarg nieograniczony na sprzedaz lokalu'), 3);
});

test('roundFromText: word ordinal "drugi przetarg" -> 2', () => {
  assert.equal(roundFromText('oglasza drugi przetarg ustny nieograniczony'), 2);
});

test('roundFromText: bare "przetarg" with no ordinal -> null', () => {
  assert.equal(roundFromText('ustny przetarg nieograniczony na sprzedaz'), null);
});

test('roundFromText: null for empty / unrecognised', () => {
  assert.equal(roundFromText(''), null);
  assert.equal(roundFromText(null), null);
});

test('roundFromText: fixture ANN_WYSZA_BRAMA_I (bare, no ordinal) -> null', () => {
  assert.equal(roundFromText(ANN_WYSZA_BRAMA_I_BODY), null);
});

test('roundFromText: fixture ANN_WYSZA_BRAMA_II -> 2', () => {
  assert.equal(roundFromText(ANN_WYSZA_BRAMA_II_BODY), 2);
});

test('roundFromText: fixture ANN_GORNA -> 3', () => {
  assert.equal(roundFromText(ANN_GORNA_BODY), 3);
});

// ── auctionDateFromText ───────────────────────────────────────────────────────

test('auctionDateFromText: "odbedzie sie w dniu 26 listopada 2025 r."', () => {
  assert.equal(auctionDateFromText(ANN_WYSZA_BRAMA_I_BODY), '2025-11-26');
});

test('auctionDateFromText: "odbedzie sie w dniu 4 marca 2026 r."', () => {
  assert.equal(auctionDateFromText(ANN_WYSZA_BRAMA_II_BODY), '2026-03-04');
});

test('auctionDateFromText: "odbedzie sie w dniu 6 sierpnia 2025 r."', () => {
  assert.equal(auctionDateFromText(ANN_GORNA_BODY), '2025-08-06');
});

test('auctionDateFromText: ISO datetime attr takes priority', () => {
  assert.equal(auctionDateFromText('<time datetime="2026-03-04T12:00:00">04.03.2026</time>'), '2026-03-04');
});

test('auctionDateFromText: null when no date', () => {
  assert.equal(auctionDateFromText('brak daty przetargu'), null);
  assert.equal(auctionDateFromText(null), null);
});

// ── resultDateFromText ────────────────────────────────────────────────────────

test('resultDateFromText: "W dniu 4 marca 2026 r. zostal..."', () => {
  assert.equal(resultDateFromText(RESULT_WYSZA_BRAMA), '2026-03-04');
});

test('resultDateFromText: "W dniu 26 listopada 2025 r. zostal..."', () => {
  assert.equal(resultDateFromText(RESULT_WYSZA_BRAMA_UNSOLD), '2025-11-26');
});

test('resultDateFromText: null when missing', () => {
  assert.equal(resultDateFromText('brak'), null);
});

// ── startingPriceFromText ─────────────────────────────────────────────────────

test('startingPriceFromText: "Cena wywolawcza nieruchomosci wynosi 152 000,00 zl"', () => {
  assert.equal(startingPriceFromText(ANN_WYSZA_BRAMA_I_BODY), 152000);
});

test('startingPriceFromText: "76 000,00 zl" (reduced price)', () => {
  assert.equal(startingPriceFromText(ANN_WYSZA_BRAMA_II_BODY), 76000);
});

test('startingPriceFromText: "160 000,00 zl" (Gorna)', () => {
  assert.equal(startingPriceFromText(ANN_GORNA_BODY), 160000);
});

test('startingPriceFromText: from wynik "wynosi 76 000,00 zl"', () => {
  assert.equal(startingPriceFromText(RESULT_WYSZA_BRAMA), 76000);
});

test('startingPriceFromText: null when missing', () => {
  assert.equal(startingPriceFromText('brak ceny'), null);
});

// ── achievedPriceFromText ─────────────────────────────────────────────────────

test('achievedPriceFromText: "Najwyzsza cena osiagnieta w przetargu wyniosla 77 000,00 zl"', () => {
  assert.equal(achievedPriceFromText(RESULT_WYSZA_BRAMA), 77000);
});

test('achievedPriceFromText: null in unsold result (no achieved price line)', () => {
  assert.equal(achievedPriceFromText(RESULT_WYSZA_BRAMA_UNSOLD), null);
});

test('achievedPriceFromText: null in announcement', () => {
  assert.equal(achievedPriceFromText(ANN_WYSZA_BRAMA_II_BODY), null);
});

// ── unitAreaFromText ──────────────────────────────────────────────────────────

test('unitAreaFromText: "o pow. uzytkowej 27,54 m2" (NOT the 3,71 appendage)', () => {
  assert.equal(unitAreaFromText(ANN_WYSZA_BRAMA_I_BODY), 27.54);
});

test('unitAreaFromText: "o pow. uzytkowej 40,95 m2" (Gorna)', () => {
  assert.equal(unitAreaFromText(ANN_GORNA_BODY), 40.95);
});

test('unitAreaFromText: from result notice', () => {
  assert.equal(unitAreaFromText(RESULT_WYSZA_BRAMA), 27.54);
});

test('unitAreaFromText: null when missing', () => {
  assert.equal(unitAreaFromText('brak powierzchni'), null);
});

// ── addressFromBody ───────────────────────────────────────────────────────────

test('addressFromBody: Wyzsza Brama 11/6 -- address_raw and join key', () => {
  const r = addressFromBody(ANN_WYSZA_BRAMA_I_BODY);
  assert.ok(r, 'should return address');
  assert.ok(r.address_raw.includes('Wyzsza Brama'), 'raw address contains street');
  assert.equal(r.address.building, '11');
  assert.equal(r.address.apt, '6');
  assert.equal(r.address.key, 'wyzsza brama|11|6', '<- join key for build-properties');
});

test('addressFromBody: Gorna 14/4 -- BIP writes "przy ul. Gornej" (genitive), key = gornej|14|4', () => {
  // The live BIP body says "przy ul. Gornej 14" (genitive case).
  // The join key therefore is gornej|14|4, matching any result notice with the same phrasing.
  const r = addressFromBody(ANN_GORNA_BODY);
  assert.ok(r);
  assert.equal(r.address.building, '14');
  assert.equal(r.address.apt, '4');
  assert.equal(r.address.key, 'gornej|14|4');
});

test('addressFromBody: wynik notice Wyzsza Brama -- same key as announcement', () => {
  const r = addressFromBody(RESULT_WYSZA_BRAMA);
  assert.ok(r);
  assert.equal(r.address.key, 'wyzsza brama|11|6', 'join key must match announcement key');
});

test('addressFromBody: null for non-address text', () => {
  assert.equal(addressFromBody('brak adresu'), null);
});

// ── isResultNotice ────────────────────────────────────────────────────────────

test('isResultNotice: correctly classifies result vs. announcement', () => {
  assert.equal(isResultNotice(RESULT_WYSZA_BRAMA), true);
  assert.equal(isResultNotice(RESULT_WYSZA_BRAMA_UNSOLD), true);
  assert.equal(isResultNotice(ANN_WYSZA_BRAMA_I_BODY), false);
  assert.equal(isResultNotice(ANN_WYSZA_BRAMA_II_BODY), false);
  assert.equal(isResultNotice(ANN_GORNA_BODY), false);
  assert.equal(isResultNotice(''), false);
  assert.equal(isResultNotice(null), false);
});

// ── parseIndexPage ────────────────────────────────────────────────────────────

test('parseIndexPage: extracts both flat rows with correct fields', () => {
  const items = parseIndexPage(INDEX_HTML);
  assert.ok(items.length >= 2, 'at least 2 items');

  const flat1 = items.find((i) => i.detail_url.includes('40896'));
  assert.ok(flat1, 'Wyzsza Brama II item found');
  assert.equal(flat1.rodzaj, 'lokal mieszkalny');
  assert.equal(flat1.starting_price_pln, 76000);
  assert.equal(flat1.auction_date, '2026-03-04');

  const flat2 = items.find((i) => i.detail_url.includes('39582'));
  assert.ok(flat2, 'Gorna item found');
  assert.equal(flat2.rodzaj, 'lokal mieszkalny');
  assert.equal(flat2.starting_price_pln, 160000);
  assert.equal(flat2.auction_date, '2025-08-06');
});

test('parseIndexPage: non-flat row has rodzaj != lokal mieszkalny', () => {
  const items = parseIndexPage(INDEX_HTML);
  const nonFlat = items.find((i) => i.detail_url.includes('40465'));
  assert.ok(nonFlat, 'non-flat item present');
  assert.notEqual(nonFlat.rodzaj, 'lokal mieszkalny');
});

test('parseIndexPage: empty HTML returns empty array', () => {
  assert.deepEqual(parseIndexPage('<html><body>nic</body></html>'), []);
});

// ── parseDetailPage ───────────────────────────────────────────────────────────

test('parseDetailPage: Wyzsza Brama II -- full listing, wynik_url, area, price, date, round', () => {
  const result = parseDetailPage(
    DETAIL_WYSZA_BRAMA_II_HTML,
    'https://bip.um.cieszyn.pl/przetarg-nieruchomosci/40896/...',
  );
  assert.ok(result, 'should return a result object');
  assert.equal(result.kind, 'announcement');
  assert.ok(result.listing, 'listing should be present');

  const l = result.listing;
  assert.equal(l.kind, 'mieszkalny');
  assert.equal(l.address.key, 'wyzsza brama|11|6', '<- join key');
  assert.equal(l.address_raw, 'ul. Wyzsza Brama 11/6');
  assert.equal(l.area_m2, 27.54);
  assert.equal(l.starting_price_pln, 76000);
  assert.equal(l.auction_date, '2026-03-04');
  assert.equal(l.round, 2);
  assert.equal(
    l.wynik_url,
    'https://bip.um.cieszyn.pl/artykul/21/41397/informacja-o-wyniku-ii-ustnego-przetargu',
  );
});

test('parseDetailPage: returns null for non-mieszkalny rodzaj', () => {
  const nonFlatHtml = DETAIL_WYSZA_BRAMA_II_HTML.replace('lokal mieszkalny', 'nieruchomość zabudowana');
  assert.equal(parseDetailPage(nonFlatHtml, 'u'), null);
});

// ── parseResultDoc ────────────────────────────────────────────────────────────

test('parseResultDoc: SOLD -- Wyzsza Brama II -- full record', () => {
  const SRC = 'https://bip.um.cieszyn.pl/artykul/21/41397/...';
  const recs = parseResultDoc(RESULT_WYSZA_BRAMA, null, SRC);
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.address.key, 'wyzsza brama|11|6', '<- same key as announcement');
  assert.equal(r.round, 2, 'round discriminator for build-properties join');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.area_m2, 27.54);
  assert.equal(r.starting_price_pln, 76000);
  assert.equal(r.final_price_pln, 77000);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.unsold_reason, null);
  assert.equal(r.auction_date, '2026-03-04');
  assert.equal(r.source_pdf, SRC);
});

test('parseResultDoc: UNSOLD -- no achieved price, round 1, same property', () => {
  const recs = parseResultDoc(RESULT_WYSZA_BRAMA_UNSOLD, null, 'u');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.address.key, 'wyzsza brama|11|6', 'same property -- different round');
  assert.equal(r.round, 1);
  assert.equal(r.starting_price_pln, 152000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.auction_date, '2025-11-26');
});

test('parseResultDoc: returns [] for announcement text', () => {
  assert.deepEqual(parseResultDoc(ANN_WYSZA_BRAMA_I_BODY, null, 'u'), []);
  assert.deepEqual(parseResultDoc(ANN_WYSZA_BRAMA_II_BODY, null, 'u'), []);
  assert.deepEqual(parseResultDoc(ANN_GORNA_BODY, null, 'u'), []);
});

test('parseResultDoc: fallbackDate used when result text has no parseable date', () => {
  const noDate = RESULT_WYSZA_BRAMA
    .replace('W dniu 4 marca 2026 r.', 'W siedzibie Urzedu Miejskiego')
    .replace('zostal przeprowadzony', 'przeprowadzony zostal');
  const recs = parseResultDoc(noDate, '2026-03-04', 'u');
  assert.equal(recs.length, 1);
  assert.equal(recs[0].auction_date, '2026-03-04', 'fallback date used');
});
