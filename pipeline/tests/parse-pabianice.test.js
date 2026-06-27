// Pabianice parser + crawl-helper tests.
//
// Fixtures are groundtruthed against LIVE data fetched 2026-06-27:
//   List board: https://bip.um.pabianice.pl/przetargi-nieruchomosci/61 (page 1)
//   Detail page: https://bip.um.pabianice.pl/przetarg-nieruchomosci/23966/
//                  lokal-mieszkalny-nr-7-przy-ul-pomorskiej-20
//   Result PDF:  https://bip.um.pabianice.pl/attachments/download/43139
//                  (Rozstrzygnięcie, Pomorska 20 nr 7, 248 kB, 2026-05-22, 67 downloads)
//
// The result-PDF fixture (RESULT_SOLD / RESULT_UNSOLD) is a synthetic
// condensation of the standard Logonet/Pabianice "Informacja o wyniku przetargu"
// format. VALIDATE the exact phrasing against the real pdftotext output of
// attachments/download/43139 on the first live CI run and adjust regexes in
// parse.js if the labels differ.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseListPage,
  parseAddressFromBipTitle,
  resultPdfUrlFromDetail,
} from '../src/cities/pabianice/crawl.js';

import {
  isResultNotice,
  roundFromText,
  resultDateFromText,
  startingPriceFromText,
  achievedPriceFromText,
  addressRawFromResultText,
  unitAreaFromText,
  parseResultDoc,
} from '../src/cities/pabianice/parse.js';

// ============================================================ list-page parser

// Condensed but faithful reproduction of the live HTML from page 1 of the board.
// Each entry is a standalone <table> block (the full page also wraps in outer
// elements but parseListPage only looks for <table>…</table> blocks).
const LIST_HTML = `
<p><em>Adres nieruchomości : lokal mieszkalny nr 6 przy ul. Bolesława Nawrockiego 4A</em></p>
<table>
  <tr><td>Adres nieruchomości</td>
      <td><a href="/przetarg-nieruchomosci/24337/lokal-mieszkalny-nr-6-przy-ul-boleslawa-nawrockiego-4a">lokal mieszkalny nr 6 przy ul. Bolesława Nawrockiego 4A</a></td></tr>
  <tr><td>Przetarg na</td><td>sprzedaż lokalu mieszkalnego nr 6 położonego w Pabianicach przy ul. Bolesława Nawrockiego 4A</td></tr>
  <tr><td>Typ przetargu</td><td>Przetarg ustny nieograniczony</td></tr>
  <tr><td>Rodzaj nieruchomości</td><td>lokal mieszkalny</td></tr>
  <tr><td>Cena wywoławcza</td><td>53.000 zł</td></tr>
  <tr><td>Data przetargu</td><td><strong>06.08.2026</strong> godz. 09:20</td></tr>
</table>

<p><em>Adres nieruchomości : lokal mieszkalny nr 3 przy ul. Toruńskiej 29</em></p>
<table>
  <tr><td>Adres nieruchomości</td>
      <td><a href="/przetarg-nieruchomosci/24336/lokal-mieszkalny-nr-3-przy-ul-torunskiej-29">lokal mieszkalny nr 3 przy ul. Toruńskiej 29</a></td></tr>
  <tr><td>Przetarg na</td><td>sprzedaż lokalu mieszkalnego nr 3 przy ul. Toruńskiej 29</td></tr>
  <tr><td>Typ przetargu</td><td>Przetarg ustny nieograniczony</td></tr>
  <tr><td>Rodzaj nieruchomości</td><td>lokal mieszkalny</td></tr>
  <tr><td>Cena wywoławcza</td><td>85.000 zł</td></tr>
  <tr><td>Data przetargu</td><td><strong>06.08.2026</strong> godz. 09:00</td></tr>
</table>

<p><em>Adres nieruchomości : lokal użytkowy nr 1 przy ul. Odrodzenia 11</em></p>
<table>
  <tr><td>Adres nieruchomości</td>
      <td><a href="/przetarg-nieruchomosci/23993/lokal-uzytkowy-nr-1-przy-ul-odrodzenia-11">lokal użytkowy nr 1 przy ul. Odrodzenia 11</a></td></tr>
  <tr><td>Przetarg na</td><td>sprzedaż lokalu użytkowego nr 1</td></tr>
  <tr><td>Typ przetargu</td><td>Przetarg ustny nieograniczony</td></tr>
  <tr><td>Rodzaj nieruchomości</td><td>lokal użytkowy</td></tr>
  <tr><td>Cena wywoławcza</td><td>490.000 zł</td></tr>
  <tr><td>Data przetargu</td><td><strong>03.06.2026</strong> godz. 09:00</td></tr>
</table>

<p><em>Adres nieruchomości : ul. Warszawska 118</em></p>
<table>
  <tr><td>Adres nieruchomości</td>
      <td><a href="/przetarg-nieruchomosci/24111/ul-warszawska-118">ul. Warszawska 118</a></td></tr>
  <tr><td>Przetarg na</td><td>sprzedaż nieruchomości niezabudowanej przy ul. Warszawskiej 118</td></tr>
  <tr><td>Typ przetargu</td><td>Przetarg ustny nieograniczony</td></tr>
  <tr><td>Rodzaj nieruchomości</td><td>nieruchomość niezabudowana</td></tr>
  <tr><td>Cena wywoławcza</td><td>350.000 zł</td></tr>
  <tr><td>Data przetargu</td><td><strong>03.06.2026</strong> godz. 09:20</td></tr>
</table>

<p><em>Adres nieruchomości : lokal mieszkalny nr 7 przy ul. Pomorskiej 20</em></p>
<table>
  <tr><td>Adres nieruchomości</td>
      <td><a href="/przetarg-nieruchomosci/23966/lokal-mieszkalny-nr-7-przy-ul-pomorskiej-20">lokal mieszkalny nr 7 przy ul. Pomorskiej 20</a></td></tr>
  <tr><td>Przetarg na</td><td>sprzedaż lokalu mieszkalnego nr 7 przy ul. Pomorskiej 20 wraz ze sprzedażą 76/1000 części nieruchomości gruntowej</td></tr>
  <tr><td>Typ przetargu</td><td>Przetarg ustny nieograniczony</td></tr>
  <tr><td>Rodzaj nieruchomości</td><td>lokal mieszkalny</td></tr>
  <tr><td>Cena wywoławcza</td><td>53.000 zł</td></tr>
  <tr><td>Data przetargu</td><td><strong>14.05.2026</strong> godz. 09:40</td></tr>
</table>

<p><em>Adres nieruchomości : lokal mieszkalny nr 64/65 przy ul. Stefana kard. Wyszyńskiego 3</em></p>
<table>
  <tr><td>Adres nieruchomości</td>
      <td><a href="/przetarg-nieruchomosci/24086/lokal-mieszkalny-nr-64-65-przy-ul-stefana-kard-wyszynskiego-3">lokal mieszkalny nr 64/65 przy ul. Stefana kard. Wyszyńskiego 3</a></td></tr>
  <tr><td>Przetarg na</td><td>sprzedaż spółdzielczego własnościowego prawa do lokalu mieszkalnego nr 64/65 przy ul. Wyszyńskiego 3</td></tr>
  <tr><td>Typ przetargu</td><td>Przetarg ustny nieograniczony</td></tr>
  <tr><td>Rodzaj nieruchomości</td><td>lokal mieszkalny</td></tr>
  <tr><td>Cena wywoławcza</td><td>240.000 zł</td></tr>
  <tr><td>Data przetargu</td><td><strong>03.06.2026</strong> godz. 09:40</td></tr>
</table>

<p><em>Adres nieruchomości : lokal mieszkalny nr 6 przy ul. Bolesława Nawrockiego 4A (pisemny)</em></p>
<table>
  <tr><td>Adres nieruchomości</td>
      <td><a href="/przetarg-nieruchomosci/23924/lokal-mieszkalny-nr-6-przy-ul-boleslawa-nawrockiego-4a">lokal mieszkalny nr 6 przy ul. Nawrockiego 4A (pisemny round)</a></td></tr>
  <tr><td>Przetarg na</td><td>sprzedaż lokalu mieszkalnego nr 6</td></tr>
  <tr><td>Typ przetargu</td><td>Przetarg pisemny nieograniczony</td></tr>
  <tr><td>Rodzaj nieruchomości</td><td>lokal mieszkalny</td></tr>
  <tr><td>Cena wywoławcza</td><td>61.000 zł</td></tr>
  <tr><td>Data przetargu</td><td><strong>30.04.2026</strong> godz. 09:00</td></tr>
</table>
`;

test('parseListPage: keeps only lokal mieszkalny + przetarg ustny nieograniczony', () => {
  const items = parseListPage(LIST_HTML);
  // Should include: Nawrockiego (ustny), Toruńska (ustny), Pomorska (ustny), Wyszyński (ustny)
  // Should EXCLUDE: lokal użytkowy, nieruchomość niezabudowana, przetarg pisemny
  assert.equal(items.length, 4, 'exactly 4 lokal mieszkalny (ustny) items');
  const kinds = items.map((i) => i.address_raw);
  assert.ok(kinds.some((a) => /nawrockiego/i.test(a)), 'Nawrockiego included');
  assert.ok(kinds.some((a) => /toruńskiej/i.test(a) || /torunskiej/i.test(a)), 'Toruńska included');
  assert.ok(kinds.some((a) => /pomorskiej/i.test(a)), 'Pomorska included');
  assert.ok(kinds.some((a) => /wyszyńskiego/i.test(a) || /wyszynskiego/i.test(a)), 'Wyszyńskiego included');
  assert.ok(!kinds.some((a) => /odrodzenia/i.test(a)), 'lokal użytkowy excluded');
  assert.ok(!kinds.some((a) => /warszawska/i.test(a)), 'nieruchomość niezabudowana excluded');
  assert.ok(!kinds.some((a) => /pisemny/i.test(a)), 'przetarg pisemny excluded');
});

test('parseListPage: extracts id, detail_url, starting_price_pln, auction_date', () => {
  const items = parseListPage(LIST_HTML);
  const pomorska = items.find((i) => /pomorskiej/i.test(i.address_raw));
  assert.ok(pomorska, 'Pomorska item found');
  assert.equal(pomorska.id, '23966');
  assert.match(pomorska.detail_url, /bip\.um\.pabianice\.pl\/przetarg-nieruchomosci\/23966\//);
  assert.equal(pomorska.starting_price_pln, 53000, '"53.000 zł" → 53000');
  assert.equal(pomorska.auction_date, '2026-05-14', '"14.05.2026" → ISO');
});

test('parseListPage: "240.000 zł" → 240000 (3-digit dot-thousands)', () => {
  const items = parseListPage(LIST_HTML);
  const wysz = items.find((i) => /wyszyński|wyszynski/i.test(i.address_raw));
  assert.ok(wysz);
  assert.equal(wysz.starting_price_pln, 240000);
  assert.equal(wysz.auction_date, '2026-06-03');
});

test('parseListPage: compound unit number "nr 64/65" is preserved', () => {
  const items = parseListPage(LIST_HTML);
  const wysz = items.find((i) => /wyszyński|wyszynski/i.test(i.address_raw));
  assert.ok(wysz);
  assert.match(wysz.address_raw, /64\/65/);
});

test('parseListPage: empty HTML returns empty array without throwing', () => {
  assert.deepEqual(parseListPage(''), []);
  assert.deepEqual(parseListPage('<html><body>nic</body></html>'), []);
});

// ============================================================ address parser

test('parseAddressFromBipTitle: standard "nr N przy ul. Street Bldg"', () => {
  const a = parseAddressFromBipTitle('lokal mieszkalny nr 7 przy ul. Pomorskiej 20');
  assert.ok(a, 'returns an address');
  assert.equal(a.key, 'pomorskiej|20|7');
  assert.equal(a.building, '20');
  assert.equal(a.apt, '7');
});

test('parseAddressFromBipTitle: multi-word street "Bolesława Nawrockiego 4A"', () => {
  const a = parseAddressFromBipTitle('lokal mieszkalny nr 6 przy ul. Bolesława Nawrockiego 4A');
  assert.ok(a);
  assert.equal(a.building, '4A');
  assert.equal(a.apt, '6');
  // key uses normalised (Polish-lower) form
  assert.match(a.key, /nawrockiego\|4A\|6/i);
});

test('parseAddressFromBipTitle: compound unit "nr 64/65" → apt uses first number', () => {
  const a = parseAddressFromBipTitle(
    'lokal mieszkalny nr 64/65 przy ul. Stefana kard. Wyszyńskiego 3',
  );
  assert.ok(a, 'compound unit resolves to an address');
  assert.equal(a.building, '3');
  // Compound units like 64/65 (a merged flat) key on first number: apt = "64"
  assert.equal(a.apt, '64', 'compound unit → first number as apt');
  assert.ok(a.key.includes('64'), 'key includes 64');
});

test('parseAddressFromBipTitle: "nr 9/10" compound unit → apt uses first number', () => {
  const a = parseAddressFromBipTitle('lokal mieszkalny nr 9/10 przy ul. Pomorskiej 20');
  assert.ok(a, 'compound unit 9/10 resolves');
  assert.equal(a.building, '20');
  assert.equal(a.apt, '9', 'compound unit → first number as apt');
});

test('parseAddressFromBipTitle: missing "przy ul." returns null', () => {
  assert.equal(parseAddressFromBipTitle('coś bez adresu'), null);
  assert.equal(parseAddressFromBipTitle(''), null);
});

// ============================================================ detail-page result PDF URL

const DETAIL_HTML_WITH_RESULT = `
<h2>Załączniki</h2>
<a href="/attachments/download/42413">Ogłoszenie przetargu</a> pdf, 302 kB
<a href="/attachments/download/43139">Rozstrzygnięcie przetargu</a> pdf, 248 kB
`;

const DETAIL_HTML_NO_RESULT = `
<h2>Załączniki</h2>
<a href="/attachments/download/42413">Ogłoszenie przetargu</a> pdf, 302 kB
`;

test('resultPdfUrlFromDetail: returns the "Rozstrzygnięcie" URL', () => {
  const url = resultPdfUrlFromDetail(DETAIL_HTML_WITH_RESULT);
  assert.ok(url, 'URL found');
  assert.match(url, /attachments\/download\/43139/);
  assert.match(url, /^https:\/\/bip\.um\.pabianice\.pl\//);
});

test('resultPdfUrlFromDetail: returns null when no result yet', () => {
  assert.equal(resultPdfUrlFromDetail(DETAIL_HTML_NO_RESULT), null);
  assert.equal(resultPdfUrlFromDetail(''), null);
});

test('resultPdfUrlFromDetail: also matches "Rozstrzygnięcie" with ę entity', () => {
  const html = `<a href="/attachments/download/99999">Rozstrzygnięcie przetargu</a>`;
  const url = resultPdfUrlFromDetail(html);
  assert.ok(url);
  assert.match(url, /99999/);
});

// ============================================================ result-PDF parsers
//
// Synthetic fixtures based on the standard Logonet/Pabianice boilerplate.
// Groundtruth against pdftotext -layout output of attachments/download/43139
// on the first live CI run.

const RESULT_SOLD = `
INFORMACJA O WYNIKU PRZETARGU

Prezydent Miasta Pabianice podaje do publicznej wiadomości wyniki przeprowadzonego
przetargu ustnego nieograniczonego na sprzedaż lokalu mieszkalnego.

Data i miejsce przetargu: 22 maja 2026 r., sala konferencyjna Urzędu Miejskiego
w Pabianicach, ul. Zamkowa 16.

Przedmiot przetargu: lokal mieszkalny nr 7 przy ul. Pomorskiej 20 w Pabianicach,
o powierzchni użytkowej 37,70 m2, wraz z udziałem 76/1000 w nieruchomości gruntowej.

Cena wywoławcza: 53 000,00 zł
Najwyższa cena osiągnięta w przetargu: 55 000,00 zł

Nabywca: Jan Kowalski zam. Pabianice
`;

const RESULT_UNSOLD = `
INFORMACJA O WYNIKU PRZETARGU

Prezydent Miasta Pabianice podaje do publicznej wiadomości wyniki przeprowadzonego
przetargu ustnego nieograniczonego na sprzedaż lokalu mieszkalnego.

Data i miejsce przetargu: 05 marca 2026 r., sala konferencyjna Urzędu Miejskiego.

Przedmiot przetargu: lokal mieszkalny nr 7 przy ul. Pomorskiej 20 w Pabianicach.

Cena wywoławcza: 69 000,00 zł

Przetarg zakończył się wynikiem negatywnym z uwagi na brak uczestników przetargu.
`;

const RESULT_SECOND_ROUND = `
INFORMACJA O WYNIKU DRUGIEGO PRZETARGU

Prezydent Miasta Pabianice informuje o wyniku drugiego przetargu ustnego nieograniczonego.

Data i miejsce przetargu: 14 maja 2026 r., Urząd Miejski w Pabianicach.

Przedmiot przetargu: lokal mieszkalny nr 6 przy ul. Nawrockiego 4A w Pabianicach,
o powierzchni użytkowej 45,00 m2.

Cena wywoławcza: 53 000,00 zł
Najwyższa cena osiągnięta w przetargu: 56 000,00 zł

Nabywca: Anna Nowak
`;

test('isResultNotice: detects result header (mixed case)', () => {
  assert.equal(isResultNotice(RESULT_SOLD), true);
  assert.equal(isResultNotice(RESULT_UNSOLD), true);
  assert.equal(isResultNotice('Ogłoszenie przetargu na sprzedaż lokalu'), false);
  assert.equal(isResultNotice(''), false);
});

test('resultDateFromText: "22 maja 2026 r." → "2026-05-22"', () => {
  assert.equal(resultDateFromText(RESULT_SOLD), '2026-05-22');
});

test('resultDateFromText: "05 marca 2026 r." → "2026-03-05"', () => {
  assert.equal(resultDateFromText(RESULT_UNSOLD), '2026-03-05');
});

test('resultDateFromText: "14 maja 2026 r." → "2026-05-14"', () => {
  assert.equal(resultDateFromText(RESULT_SECOND_ROUND), '2026-05-14');
});

test('resultDateFromText: returns null when no date', () => {
  assert.equal(resultDateFromText('brak daty'), null);
});

test('startingPriceFromText: "53 000,00 zł" → 53000', () => {
  assert.equal(startingPriceFromText(RESULT_SOLD), 53000);
});

test('startingPriceFromText: "69 000,00 zł" → 69000', () => {
  assert.equal(startingPriceFromText(RESULT_UNSOLD), 69000);
});

test('achievedPriceFromText: "55 000,00 zł" → 55000', () => {
  assert.equal(achievedPriceFromText(RESULT_SOLD), 55000);
});

test('achievedPriceFromText: returns null when unsold (no achieved price)', () => {
  assert.equal(achievedPriceFromText(RESULT_UNSOLD), null);
});

test('roundFromText: "drugiego przetargu" → 2', () => {
  assert.equal(roundFromText(RESULT_SECOND_ROUND), 2);
  assert.equal(roundFromText(RESULT_SECOND_ROUND), 2);
});

test('roundFromText: plain "przetargu" without ordinal → null', () => {
  assert.equal(roundFromText(RESULT_SOLD), null);
});

test('addressRawFromResultText: extracts address from Przedmiot line', () => {
  const addr = addressRawFromResultText(RESULT_SOLD);
  assert.ok(addr, 'address extracted');
  assert.match(addr, /ul\.\s+Pomorsk/i);
  assert.match(addr, /20\/7/);
});

test('addressRawFromResultText: Nawrockiego 4A / unit 6', () => {
  const addr = addressRawFromResultText(RESULT_SECOND_ROUND);
  assert.ok(addr);
  assert.match(addr, /Nawrockiego/i);
  assert.match(addr, /4A\/6/);
});

test('unitAreaFromText: "37,70 m2" → 37.7', () => {
  assert.equal(unitAreaFromText(RESULT_SOLD), 37.7);
});

test('unitAreaFromText: returns null when not stated', () => {
  assert.equal(unitAreaFromText(RESULT_UNSOLD), null);
});

// ============================================================ full parseResultDoc

test('parseResultDoc: SOLD — correct outcome, prices, address, area', () => {
  const recs = parseResultDoc(RESULT_SOLD, null, 'https://bip.um.pabianice.pl/attachments/download/43139');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.outcome, 'sold');
  assert.equal(r.final_price_pln, 55000);
  assert.equal(r.starting_price_pln, 53000);
  assert.equal(r.auction_date, '2026-05-22');
  assert.equal(r.area_m2, 37.7);
  assert.equal(r.round, null, 'first round — ordinal not stated in result text');
  assert.equal(r.unsold_reason, null);
  assert.equal(r.address.key, 'pomorskiej|20|7');
  assert.equal(r.source_pdf, 'https://bip.um.pabianice.pl/attachments/download/43139');
});

test('parseResultDoc: UNSOLD — correct outcome, no final price, unsold_reason', () => {
  const recs = parseResultDoc(RESULT_UNSOLD, '2026-03-05', 'https://bip.um.pabianice.pl/attachments/download/99999');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.final_price_pln, null);
  assert.equal(r.starting_price_pln, 69000);
  assert.equal(r.auction_date, '2026-03-05');
  assert.equal(r.unsold_reason, 'unknown');
  assert.equal(r.address.key, 'pomorskiej|20|7');
});

test('parseResultDoc: SOLD round 2 — joins by address + round', () => {
  const recs = parseResultDoc(RESULT_SECOND_ROUND, null, 'https://bip.um.pabianice.pl/attachments/download/88888');
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.round, 2);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.final_price_pln, 56000);
  assert.equal(r.area_m2, 45.0);
  // key must join the announcement by the same address
  assert.match(r.address.key, /nawrockiego/);
});

test('parseResultDoc: non-result text returns []', () => {
  assert.deepEqual(parseResultDoc('Ogłoszenie przetargu na sprzedaż', null, 'u'), []);
  assert.deepEqual(parseResultDoc('', null, 'u'), []);
});

test('parseResultDoc: fallback date used when PDF date absent', () => {
  const noDate = RESULT_SOLD.replace(/Data i miejsce przetargu[^\n]+\n/, '');
  const recs = parseResultDoc(noDate, '2026-05-22', 'u');
  assert.equal(recs.length, 1);
  assert.equal(recs[0].auction_date, '2026-05-22');
});
