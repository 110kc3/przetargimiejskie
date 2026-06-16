// Rybnik city-BIP land parser tests.
//
// The live city BIP (bip.um.rybnik.eu) cannot be reached from CI sandboxes, so
// we exercise the parsers against fixtures derived from real RTF output observed
// in June 2026. Real column order in the list table:
//   [publish_date, title, auction_date, "Sprzedaz", Pokaz-link]

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseListPage,
  parseDetailPage,
  landPriceFromText,
  landAreaFromText,
  parcelFromText,
  obrebFromText,
  streetFromText,
  landAuctionDateFromText,
  landRoundFromText,
  parseLandRtf,
  addressFromTitle,
  parseFlatRtf,
} from '../src/cities/rybnik/crawl-land.js';

// --- Fixtures ---

// Real column order (observed June 2026): publish_date | title | auction_date | category | link
const LIST_HTML = `
<table><tbody>
  <tr>
    <td class="text-nowrap text-center">2026-06-10</td>
    <td>ogłoszenie V przetargu na sprzedaż nieruchomości gruntowej przy ul. Gotartowickiej</td>
    <td class="text-nowrap text-center">2026-09-17</td>
    <td>Sprzedaż</td>
    <td><a class="btn btn-primary hidden-print" href="Default.aspx?Page=339&amp;Id=104073">Pokaż</a></td>
  </tr>
  <tr>
    <td class="text-nowrap text-center">2026-06-03</td>
    <td>ogłoszenie II przetargu na sprzedaż nieruchomości gruntowej przy ul. Rajskiej</td>
    <td class="text-nowrap text-center">2026-09-17</td>
    <td>Sprzedaż</td>
    <td><a class="btn btn-primary hidden-print" href="Default.aspx?Page=339&amp;Id=103998">Pokaż</a></td>
  </tr>
  <tr>
    <td class="text-nowrap text-center">2026-05-08</td>
    <td>Przetarg 9 czerwca br. ul. św. Józefa 18/47</td>
    <td class="text-nowrap text-center">2026-06-09</td>
    <td>Sprzedaż</td>
    <td><a class="btn btn-primary hidden-print" href="Default.aspx?Page=339&amp;Id=103647">Pokaż</a></td>
  </tr>
  <tr>
    <td class="text-nowrap text-center">2026-03-09</td>
    <td>ogłoszenie I przetargów na sprzedaż nieruchomości gruntowych przy ul. Sportowej</td>
    <td class="text-nowrap text-center">2026-03-05</td>
    <td>Sprzedaż</td>
    <td><a class="btn btn-primary hidden-print" href="Default.aspx?Page=339&amp;Id=102807">Pokaż</a></td>
  </tr>
</tbody></table>
<!-- history-log section repeats Ids - must be deduped -->
<tr>
  <td>2026-06-10</td>
  <td>Opublikowano dokument: ogłoszenie V przetargu gruntowej przy ul. Gotartowickiej</td>
  <td>Krakowczyk</td>
  <td><a class="btn btn-primary" href="Default.aspx?Page=339&amp;Id=104073">Pokaż</a></td>
</tr>`;

const DETAIL_HTML = `<html><body>
  <span><a href="Download.ashx?id=3501867" title="Pobierz">ogłoszenie ul. Gotartowicka</a> [rtf - 92 KB]</span>
</body></html>`;

// Decoded RTF text for Gotartowicka V przetarg (from real rtfToText() output)
const GOTARTOWICKA_TEXT = `ESOD: 2026-119890
Prezydent Miasta Rybnika
ogłasza pi ąty przetarg ustny nieograniczony
na sprzedaż nieruchomości gruntowej położonej w Rybniku
przy ul. Gotartowickiej
Cena wywoł awcza : 208600 złotych (netto)
Wysokość wadium : 41000 złotych
1.
Nieruchomość gruntowa składająca się z działki nr 2190 (poprzednio nr 2483/7) o powierzchni 0, 2201 ha, obręb Boguszowice.
Warunki przetargu:
1.
Przetarg rozpocznie się w dniu 17 września 2026 r. o godzinie 9:30.`;

// Decoded RTF text for Rajska II przetarg
const RAJSKA_TEXT = `ESOD: 2026-113126
Prezydent Miasta Rybnika
ogłasza drugi przetarg ustny nieograniczony
na sprzedaż nieruchomości gruntowej położonej w Rybniku
przy ul. Rajskiej
Cena wywoł awcza : 631000 złotych (netto)
Wysokość wadium : 126000 złotych
1.
Nieruchomość gruntowa składająca się z działek nr 3698 i 3694 (poprzednio nr 2722/45 i 2718/55) o łącznej powierzchni 0,3780 ha, obręb Boguszowice.
Warunki przetargu:
1.
Przetarg rozpocznie się w dniu 17 września 2026 r. o godzinie 9:00.`;

// --- List page parser ---

test('parseListPage: extracts 4 unique rows from 5 table rows (dedupes history-log)', () => {
  const rows = parseListPage(LIST_HTML);
  assert.equal(rows.length, 4);
  assert.equal(rows[0].detailId, '104073');
  assert.equal(rows[0].listDate, '2026-09-17');  // auction date (last date cell), not publish date
  assert.ok(rows[0].title.includes('Gotartowickiej'));
  assert.equal(rows[1].detailId, '103998');
  assert.ok(rows[1].title.includes('Rajskiej'));
});

test('parseListPage: title is the text cell, not the date', () => {
  const rows = parseListPage(LIST_HTML);
  // Title must NOT be a bare date string
  for (const r of rows) {
    assert.ok(!/^\d{4}-\d{2}-\d{2}$/.test(r.title), `title should not be a date: "${r.title}"`);
  }
});

test('parseListPage: deduplicates repeated Ids from the history-log section', () => {
  const rows = parseListPage(LIST_HTML);
  const ids = rows.map((r) => r.detailId);
  assert.equal(ids.filter((id) => id === '104073').length, 1, 'Id 104073 appears exactly once');
});

test('parseListPage: listDate is the auction date (last date cell), not the publish date', () => {
  const rows = parseListPage(LIST_HTML);
  assert.equal(rows[0].listDate, '2026-09-17');  // auction date, not 2026-06-10 (publish)
  assert.equal(rows[2].listDate, '2026-06-09');  // Jozefa auction date
});

// --- Detail page parser ---

test('parseDetailPage: extracts absolute RTF URL', () => {
  const url = parseDetailPage(DETAIL_HTML);
  assert.ok(url, 'URL must be non-null');
  assert.ok(url.includes('Download.ashx?id=3501867'));
  assert.ok(url.startsWith('https://bip.um.rybnik.eu'));
});

test('parseDetailPage: returns null when no RTF link present', () => {
  assert.equal(parseDetailPage('<html><body>Brak pliku</body></html>'), null);
});

// --- RTF field parsers ---

test('landPriceFromText: parses unseparated price with RTF space artefact (208600)', () => {
  assert.equal(landPriceFromText(GOTARTOWICKA_TEXT), 208600);
});

test('landPriceFromText: parses 631000', () => {
  assert.equal(landPriceFromText(RAJSKA_TEXT), 631000);
});

test('landPriceFromText: returns null when absent', () => {
  assert.equal(landPriceFromText('Brak ceny.'), null);
});

test('landAreaFromText: 0,2201 ha -> 2201 m2', () => {
  assert.equal(landAreaFromText(GOTARTOWICKA_TEXT), 2201);
});

test('landAreaFromText: laczna powierzchnia 0,3780 ha -> 3780 m2', () => {
  assert.equal(landAreaFromText(RAJSKA_TEXT), 3780);
});

test('landAreaFromText: returns null when absent', () => {
  assert.equal(landAreaFromText('Nieruchomosc gruntowa.'), null);
});

test('parcelFromText: single parcel "dzialki nr 2190"', () => {
  assert.equal(parcelFromText(GOTARTOWICKA_TEXT), '2190');
});

test('parcelFromText: multiple parcels "dzialek nr 3698 i 3694" -> "3698/3694"', () => {
  assert.equal(parcelFromText(RAJSKA_TEXT), '3698/3694');
});

test('parcelFromText: returns null when absent', () => {
  assert.equal(parcelFromText('Nieruchomosc.'), null);
});

test('obrebFromText: extracts "obreb Boguszowice"', () => {
  assert.equal(obrebFromText(GOTARTOWICKA_TEXT), 'Boguszowice');
  assert.equal(obrebFromText(RAJSKA_TEXT), 'Boguszowice');
});

test('obrebFromText: returns null when absent', () => {
  assert.equal(obrebFromText('Nieruchomosc.'), null);
});

test('streetFromText: extracts Gotartowickiej', () => {
  const s = streetFromText(GOTARTOWICKA_TEXT);
  assert.ok(s && s.includes('Gotartowick'), `got: "${s}"`);
});

test('streetFromText: extracts Rajskiej', () => {
  const s = streetFromText(RAJSKA_TEXT);
  assert.ok(s && s.includes('Rajskiej'), `got: "${s}"`);
});

test('landAuctionDateFromText: spelled-month "17 wrzesnia 2026" -> ISO', () => {
  assert.equal(landAuctionDateFromText(GOTARTOWICKA_TEXT), '2026-09-17');
  assert.equal(landAuctionDateFromText(RAJSKA_TEXT), '2026-09-17');
});

test('landAuctionDateFromText: numeric dd.mm.yyyy', () => {
  assert.equal(
    landAuctionDateFromText('Przetarg rozpocznie sie w dniu 09.06.2026 r.'),
    '2026-06-09',
  );
});

test('landRoundFromText: "piaty przetarg" -> 5', () => {
  assert.equal(landRoundFromText(GOTARTOWICKA_TEXT), 5);
});

test('landRoundFromText: "drugi przetarg" -> 2', () => {
  assert.equal(landRoundFromText(RAJSKA_TEXT), 2);
});

test('landRoundFromText: bare "przetarg" -> 1 (fallback)', () => {
  assert.equal(landRoundFromText('oglasza przetarg ustny na sprzedaz dzialki'), 1);
});

// --- Full record assembly ---

test('parseLandRtf: full record for Gotartowicka V przetarg', () => {
  const rec = parseLandRtf(
    'ogloszenie V przetargu na sprzedaz nieruchomosci gruntowej przy ul. Gotartowickiej',
    GOTARTOWICKA_TEXT,
    'https://bip.um.rybnik.eu/Default.aspx?Page=339&Id=104073',
    'https://bip.um.rybnik.eu/Download.ashx?id=3501867',
  );
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.dzialka_nr, '2190');
  assert.equal(rec.obreb, 'Boguszowice');
  assert.equal(rec.area_m2, 2201);
  assert.equal(rec.starting_price_pln, 208600);
  assert.equal(rec.auction_date, '2026-09-17');
  assert.equal(rec.round, 5);
  assert.ok(rec.address_raw && rec.address_raw.includes('Gotartowick'), `address_raw: "${rec.address_raw}"`);
  assert.equal(rec.detail_url, 'https://bip.um.rybnik.eu/Default.aspx?Page=339&Id=104073');
  assert.equal(rec.source_url, 'https://bip.um.rybnik.eu/Download.ashx?id=3501867');
});

test('parseLandRtf: full record for Rajska II przetarg (multiple parcels)', () => {
  const rec = parseLandRtf(
    'ogloszenie II przetargu na sprzedaz nieruchomosci gruntowej przy ul. Rajskiej',
    RAJSKA_TEXT,
    'https://bip.um.rybnik.eu/Default.aspx?Page=339&Id=103998',
    'https://bip.um.rybnik.eu/Download.ashx?id=3499886',
  );
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.dzialka_nr, '3698/3694');
  assert.equal(rec.obreb, 'Boguszowice');
  assert.equal(rec.area_m2, 3780);
  assert.equal(rec.starting_price_pln, 631000);
  assert.equal(rec.auction_date, '2026-09-17');
  assert.equal(rec.round, 2);
});

test('parseLandRtf: listDate fallback when RTF body has no date', () => {
  const minimal = 'Prezydent Miasta Rybnika\n' +
    'oglasza pierwszy przetarg na sprzedaz nieruchomosci gruntowej przy ul. Testowej\n' +
    'Cena wywolawcza : 100000 zlotych\n' +
    'dzialki nr 999 o powierzchni 0,1000 ha, obreb Chwatecice.';
  const rec = parseLandRtf(
    'ogloszenie I przetargu nieruchomosci gruntowej przy ul. Testowej',
    minimal,
    'https://bip.um.rybnik.eu/Default.aspx?Page=339&Id=99999',
    'https://bip.um.rybnik.eu/Download.ashx?id=9999',
  );
  // No spelled/numeric date in this RTF -> auction_date is null
  assert.equal(rec.auction_date, null);
  // Caller applies listDate as fallback
  if (!rec.auction_date) rec.auction_date = '2026-03-05';
  assert.equal(rec.auction_date, '2026-03-05');
});

// --- Round-2 history-clause date guard (the real Rajska Id=103998 RTF) ---
//
// A re-listed plot's RTF states BOTH the failed earlier round and the operative
// future date, in that order:
//   "Przetarg przeprowadzony w dniu 26 marca 2026 r. zakończony został wynikiem
//    negatywnym. Przetarg rozpocznie się w dniu 17 września 2026 r. …"
// A first-match scan grabbed 2026-03-26 (past) → the plot was wrongly stamped
// 'archived' even though its round-2 auction (2026-09-17) is in the future.
const RAJSKA_HISTORY_TEXT = `ESOD: 2026-113126
Prezydent Miasta Rybnika
ogłasza drugi przetarg ustny nieograniczony
na sprzedaż nieruchomości gruntowej położonej w Rybniku
przy ul. Rajskiej
Cena wywoł awcza : 631000 złotych (netto)
Nieruchomość gruntowa składająca się z działek nr 3698 i 3694 (poprzednio nr 2722/45 i 2718/55) o łącznej powierzchni 0,3780 ha, obręb Boguszowice.
Przetarg przeprowadzony w dniu 26 marca 2026 r. zakończony został wynikiem negatywnym.
Przetarg rozpocznie się w dniu 17 września 2026 r. o godzinie 9:00.`;

test('landAuctionDateFromText: skips the history-clause date, returns the operative round-2 date', () => {
  // BUG was: returned 2026-03-26 (the failed round-1 date in the history clause)
  assert.equal(landAuctionDateFromText(RAJSKA_HISTORY_TEXT), '2026-09-17');
});

test('landAuctionDateFromText: numeric history-then-operative also picks operative', () => {
  assert.equal(
    landAuctionDateFromText(
      'Przetarg przeprowadzony w dniu 11.03.2026 r. zakonczony zostal wynikiem negatywnym. ' +
        'Przetarg rozpocznie sie w dniu 17.09.2026 r.',
    ),
    '2026-09-17',
  );
});

test('landAuctionDateFromText: history-only RTF still yields a date (fallback)', () => {
  // When every "w dniu" hit is a history clause, fall back to the first one
  // rather than null — buildLand will then stamp it archived (correct: round
  // concluded, no future date stated).
  assert.equal(
    landAuctionDateFromText('Przetarg przeprowadzony w dniu 11.03.2026 r. zakonczony wynikiem negatywnym.'),
    '2026-03-11',
  );
});

test('parseLandRtf: Rajska II with history clause -> future operative date (not archived)', () => {
  const rec = parseLandRtf(
    'ogloszenie II przetargu na sprzedaz nieruchomosci gruntowej przy ul. Rajskiej',
    RAJSKA_HISTORY_TEXT,
    'https://bip.um.rybnik.eu/Default.aspx?Page=339&Id=103998',
    'https://bip.um.rybnik.eu/Download.ashx?id=3499886',
  );
  assert.equal(rec.round, 2);
  assert.equal(rec.auction_date, '2026-09-17'); // future -> buildLand keeps it active
  assert.equal(rec.dzialka_nr, '3698/3694');
  assert.equal(rec.starting_price_pln, 631000);
});

// --- Flat (lokal mieszkalny) announcements on Page=339 ---
//
// ZGM's flat auctions live on this SAME register; their list titles carry the
// address inline ("Przetarg 9 czerwca br. ul. św. Józefa 18/47") and the RTF
// body is "lokal mieszkalny" + price/area/date. Fixture mirrors the real Id
// 103647 (św. Józefa) RTF body output observed June 2026.
const JOZEFA_FLAT_TEXT = `PREZYDENT MIASTA RYBNIKA
ogłasza
pierwszy publiczny ustny nieograniczony przetarg na sprzedaż spółdzielczego własnościowego prawa do lokalu mieszkalnego położonego w Rybniku przy ul. św. Józefa 18/47 .
Lokal mieszkalny numer 47 usytuowany na dziewiątym piętrze budynku wielomieszkaniowego, składający się z dwóch pokoi, kuchni, łazienki z wc i przedpokoju o powierzchni użytkowej 45,90 m 2. Do lokalu przynależy piwnica o powierzchni użytkowej 1,95 m 2.
Cena wywoławcza lokalu mieszkalnego: 230 000,00 zł, sprzedaż lokalu mieszkalnego zwolniona jest z podatku.
Przetarg odbędzie się w dniu 09.06.2026 r. o godzinie 11:30 w Zakładzie Gospodarki Mieszkaniowej w Rybniku przy ul. Tadeusza Kościuszki 17.`;

const FLAT_LIST_HTML = `
<table><tbody>
  <tr>
    <td class="text-nowrap text-center">2026-05-08</td>
    <td>Przetarg 9 czerwca br. ul. św. Józefa 18/47</td>
    <td class="text-nowrap text-center">2026-06-09</td>
    <td>Sprzedaż</td>
    <td><a href="Default.aspx?Page=339&amp;Id=103647">Pokaż</a></td>
  </tr>
  <tr>
    <td class="text-nowrap text-center">2026-05-08</td>
    <td>Przetarg 9.06.2026 ul. Zgrzebnioka 7b/6</td>
    <td class="text-nowrap text-center">2026-06-09</td>
    <td>Sprzedaż</td>
    <td><a href="Default.aspx?Page=339&amp;Id=103642">Pokaż</a></td>
  </tr>
</tbody></table>`;

test('parseListPage: extracts flat-announcement rows (address-bearing titles)', () => {
  const rows = parseListPage(FLAT_LIST_HTML);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].detailId, '103647');
  assert.ok(rows[0].title.includes('św. Józefa 18/47'));
  assert.equal(rows[0].listDate, '2026-06-09'); // auction date (last date cell)
  assert.equal(rows[1].detailId, '103642');
});

test('addressFromTitle: strips "Przetarg <date>" prefix, keeps "ul." address', () => {
  assert.equal(addressFromTitle('Przetarg 9 czerwca br. ul. św. Józefa 18/47').address.key, 'sw jozefa|18|47');
  assert.equal(addressFromTitle('Przetarg 9.06.2026 ul. Zgrzebnioka 7b/6').address.key, 'zgrzebnioka|7B|6');
  // hand-typed " <bldg> <letter>" spacing is normalised: "6 a/3" -> "6A/3"
  assert.equal(addressFromTitle('Przetarg 9 .06.2026 ul. Cierpioła 6 a/3').address.key, 'cierpiola|6A|3');
  assert.equal(addressFromTitle('Przetarg 9.06.2026 ul. gen. Janke Waltera 5 b/2').address.key, 'gen janke waltera|5B|2');
  // trailing " r." after the date, plus spaced building letter
  assert.equal(addressFromTitle('Przetarg 9.06.2026 r. ul. Kilińskiego 28 a/17').address.key, 'kilinskiego|28A|17');
});

test('addressFromTitle: a land title (no "ul. <num>") yields null', () => {
  assert.equal(addressFromTitle('ogloszenie II przetargu na sprzedaz nieruchomosci gruntowej przy ul. Rajskiej'), null);
});

test('parseFlatRtf: full flat record from a Page=339 announcement', () => {
  const rec = parseFlatRtf(
    'Przetarg 9 czerwca br. ul. św. Józefa 18/47',
    JOZEFA_FLAT_TEXT,
    'https://bip.um.rybnik.eu/Default.aspx?Page=339&Id=103647',
    'https://bip.um.rybnik.eu/Download.ashx?id=3489449',
  );
  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address.key, 'sw jozefa|18|47');
  assert.equal(rec.starting_price_pln, 230000);
  assert.equal(rec.area_m2, 45.9); // flat area, not the 1,95 m² cellar
  assert.equal(rec.auction_date, '2026-06-09');
  assert.equal(rec.round, 1);
  assert.equal(rec.detail_url, 'https://bip.um.rybnik.eu/Default.aspx?Page=339&Id=103647');
});

test('parseFlatRtf: falls back to the body "przy ul. …" when the title lacks an address', () => {
  const rec = parseFlatRtf('Ogłoszenie o przetargu', JOZEFA_FLAT_TEXT, 'D', 'R');
  assert.ok(rec);
  assert.equal(rec.address.key, 'sw jozefa|18|47');
});
