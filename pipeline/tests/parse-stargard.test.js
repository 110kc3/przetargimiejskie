// Stargard parser tests.
//
// Fixtures are condensed but faithful copies of REAL pages (live-verified
// 2026-06-27):
//
//   TBS FIXTURE (announcement):
//     URL: https://tbs.stargard.pl/ogloszenia/lokal-mieszkalny-aleja-gryfa-15-1-iii-przetarg-na-sprzedaz/
//     Fields: Aleja Gryfa 15/1, III przetarg, 52.83 m², 221 000 zł, 13.08.2026
//
//   BIP FIXTURE (result list entry, Wynik095/2026):
//     URL: https://bip.stargard.eu/22358 (page 1) + detail /22358/dokument/72459
//     Fields: Kościuszki 35/5, II rokowania, lokal mieszkalny nr 5, 14.38 m²,
//             24.04.2026. Achieved price is in PDF only (not in HTML body).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parsePLN,
  parseArea,
  roundFromText,
  htmlToText,
  isSaleAnnouncement,
  isFlatAnnouncement,
  auctionDateFromText,
  areaFromText,
  priceFromText,
  addressFromTitle,
  parseTbsDetail,
  parseBipResultList,
  addressFromBipText,
  parseResultDoc,
} from '../src/cities/stargard/parse.js';

// -----------------------------------------------------------------------
// Shared helpers
// -----------------------------------------------------------------------

test('parsePLN: standard Polish number formats', () => {
  assert.equal(parsePLN('221 000,00'), 221000);
  assert.equal(parsePLN('246 500,00'), 246500);
  assert.equal(parsePLN('14 380'), 14380);
  assert.equal(parsePLN('150000'), 150000);
  assert.equal(parsePLN(null), null);
  assert.equal(parsePLN(''), null);
});

test('parseArea: comma and dot decimal separators', () => {
  assert.equal(parseArea('52,83'), 52.83);
  assert.equal(parseArea('14.38'), 14.38);
  assert.equal(parseArea('53,99'), 53.99);
  assert.equal(parseArea(null), null);
});

test('roundFromText: Roman ordinal before przetarg', () => {
  assert.equal(roundFromText('III przetarg ustny nieograniczony'), 3);
  assert.equal(roundFromText('II rokowania na sprzedaż'), 2);
  assert.equal(roundFromText('I przetarg na sprzedaż'), 1);
  assert.equal(roundFromText('przetarg ustny nieograniczony'), 1); // bare = first
  assert.equal(roundFromText('rokowania na sprzedaż'), 1); // bare = first
  assert.equal(roundFromText(''), null);
});

test('roundFromText: Polish word ordinals', () => {
  assert.equal(roundFromText('drugi przetarg ustny'), 2);
  assert.equal(roundFromText('trzeci przetarg'), 3);
  assert.equal(roundFromText('czwarty przetarg'), 4);
});

// -----------------------------------------------------------------------
// TBS announcement detail parser
// -----------------------------------------------------------------------

// Condensed fixture from live page: Aleja Gryfa 15/1, III przetarg, 2026-08-13
const TBS_HTML = `<!DOCTYPE html>
<html>
<head>
<title>Lokal mieszkalny Aleja Gryfa 15/1 &#8211; III przetarg na sprzeda&#380; &#8211; Stargardzkie TBS</title>
<meta property="og:title" content="Lokal mieszkalny Aleja Gryfa 15/1 &#8211; III przetarg na sprzeda&#380; &#8211; Stargardzkie TBS"/>
<meta property="og:description" content="POWIERZCHNIA&#10;52,83  m&sup2;  &#10;WARTO&#346;&#262; NIERUCHOMO&#346;CI &#10;        221 000,00 z&#322;  &#10;DATA PRZETARGU &#10;13 sierpnia 2026  r. "/>
</head>
<body>
<div class="entry-content">
<p>POWIERZCHNIA 52,83 m&#178; WARTO&#346;&#262; NIERUCHOMO&#346;CI 221 000,00 z&#322; DATA PRZETARGU 13 sierpnia 2026 r. godz. 10:30</p>
<p>Prezydent Miasta Stargard dzia&#322;aj&#261;c na podstawie przepis&#243;w ustawy z dnia 21 sierpnia 1997 roku o gospodarce nieruchomo&#347;ciami
og&#322;asza III przetarg ustny nieograniczony na sprzeda&#380; lokalu mieszkalnego nr 1 o pow. u&#380;ytkowej 52,83 m&#178;
po&#322;o&#380;onego w budynku wielomieszkaniowym przy Alei Gryfa Pomorskiego nr 15 w Stargardzie
(obr&#281;b 8) .</p>
<p>Cena wywo&#322;awcza wynosi: 221 000,00 z&#322; (s&#322;ownie: dwi&#347;cie dwadzie&#347;cia jeden tysi&#281;cy z&#322;otych).</p>
<p>Przetarg odb&#281;dzie si&#281; w dniu 13 sierpnia 2026 r. o godz. 10:30 w siedzibie Stargardzkiego Towarzystwa Budownictwa Spo&#322;ecznego.</p>
</div>
</body>
</html>`;

const TBS_URL = 'https://tbs.stargard.pl/ogloszenia/lokal-mieszkalny-aleja-gryfa-15-1-iii-przetarg-na-sprzedaz/';

test('htmlToText: strips tags and decodes entities', () => {
  const t = htmlToText('<p>POWIERZCHNIA 52,83 m&#178; WARTO&#346;&#262; NIERUCHOMO&#346;CI 221 000,00 z&#322;</p>');
  assert.ok(t.includes('POWIERZCHNIA'));
  assert.ok(t.includes('52,83'));
  assert.ok(t.includes('221 000,00'));
  assert.ok(!t.includes('<p>'));
});

test('isSaleAnnouncement: pass sale, block rental/informacja', () => {
  assert.equal(isSaleAnnouncement('Lokal mieszkalny Aleja Gryfa 15/1 – III przetarg na sprzedaż'), true);
  assert.equal(isSaleAnnouncement('I rokowania na sprzedaż'), true);
  assert.equal(isSaleAnnouncement('najem lokalu użytkowego'), false);
  assert.equal(isSaleAnnouncement('informacja o wyniku przetargu'), false);
  assert.equal(isSaleAnnouncement('wykaz nieruchomości'), false);
});

test('isFlatAnnouncement: detects lokal mieszkalny in body text', () => {
  assert.equal(isFlatAnnouncement('sprzedaż lokalu mieszkalnego nr 1'), true);
  assert.equal(isFlatAnnouncement('sprzedaż nieruchomości gruntowej'), false);
});

test('auctionDateFromText: labelled DATA PRZETARGU block (live fixture)', () => {
  const text = htmlToText(TBS_HTML);
  assert.equal(auctionDateFromText(text), '2026-08-13');
});

test('areaFromText: POWIERZCHNIA label (live fixture)', () => {
  const text = htmlToText(TBS_HTML);
  assert.equal(areaFromText(text), 52.83);
});

test('priceFromText: WARTOŚĆ NIERUCHOMOŚCI label (live fixture)', () => {
  const text = htmlToText(TBS_HTML);
  assert.equal(priceFromText(text), 221000);
});

test('addressFromTitle: parses "Lokal mieszkalny Aleja Gryfa 15/1 – III przetarg…"', () => {
  const title = 'Lokal mieszkalny Aleja Gryfa 15/1 – III przetarg na sprzedaż – Stargardzkie TBS';
  const result = addressFromTitle(title, TBS_URL);
  assert.ok(result, 'should return an address result');
  assert.ok(result.address, 'should have parsed address');
  assert.equal(result.address.building, '15');
  assert.equal(result.address.apt, '1');
});

test('addressFromTitle: parses "Lokal mieszkalny ul. Lechicka 1/4 – III przetarg…"', () => {
  const title = 'Lokal mieszkalny ul. Lechicka 1/4 – III przetarg na sprzedaż – Stargardzkie TBS';
  const result = addressFromTitle(title, 'https://tbs.stargard.pl/ogloszenia/lokal-mieszkalny-ul-lechicka-1-4-iii-przetarg-na-sprzedaz/');
  assert.ok(result);
  assert.equal(result.address.building, '1');
  assert.equal(result.address.apt, '4');
});

test('parseTbsDetail: full integration on live fixture', () => {
  const rec = parseTbsDetail(TBS_HTML, TBS_URL);
  assert.ok(rec, 'should parse successfully');
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.area_m2, 52.83);
  assert.equal(rec.starting_price_pln, 221000);
  assert.equal(rec.auction_date, '2026-08-13');
  assert.equal(rec.round, 3);
  assert.ok(rec.address, 'should have address');
  assert.equal(rec.address.building, '15');
  assert.equal(rec.address.apt, '1');
  assert.equal(rec.detail_url, TBS_URL);
});

test('parseTbsDetail: returns null for land (grunt) page', () => {
  const html = `<html><head><title>Nieruchomość gruntowa niezabudowana – I przetarg – TBS</title></head>
  <body><p>ogłasza I przetarg ustny nieograniczony na sprzedaż nieruchomości gruntowej niezabudowanej dz. nr 345 obr. 19</p></body></html>`;
  const rec = parseTbsDetail(html, 'https://tbs.stargard.pl/ogloszenia/grunt-przetarg/');
  assert.equal(rec, null);
});

// -----------------------------------------------------------------------
// BIP result-notice list parser
// -----------------------------------------------------------------------

// Condensed fixture from live page (bip.stargard.eu/22358, 2026-06-27).
// Two flat entries + one land entry (should be filtered out).
const BIP_LIST_HTML = `
<div class="list list_date-sym w-100 mx-auto mt-1 mb-1">
  <div class="row date_sym mx-auto pb-1">
    <div class="col-4 pl-1" tabindex="0">Symbol: <span class="text-uppercase">Wynik095/2026</span></div>
    <div class="col-8 text-right pr-1" tabindex="0">2026-05-14</div>
  </div>
  <div class="row pl-1 pt-2">
    <div class="col-12 font-weight-bold">
      <a class="router_link" tabindex="0" href="22358/dokument/72459">Prezydent Miasta Stargard informuje, że dnia 24 kwietnia 2026 r. w siedzibie Stargardzkiego Towarzystwa Budownictwa Społecznego Sp. z o.o. przy ul. Andrzeja Struga 29 w Stargardzie odbyły się II rokowania na sprzedaż lokalu mieszkalnego nr 5 o pow. użytkowej 14,38 m2 położony w budynku mieszkalnym przy ul. Tadeusza Kościuszki 35 w Stargardzie.</a>
    </div>
  </div>
</div>
<div class="list list_date-sym w-100 mx-auto mt-1 mb-1">
  <div class="row date_sym mx-auto pb-1">
    <div class="col-4 pl-1" tabindex="0">Symbol: <span class="text-uppercase">Wynik094/2026</span></div>
    <div class="col-8 text-right pr-1" tabindex="0">2026-05-12</div>
  </div>
  <div class="row pl-1 pt-2">
    <div class="col-12 font-weight-bold">
      <a class="router_link" tabindex="0" href="22358/dokument/72412">Prezydent Miasta Stargard informuje, że w dniu 5 maja 2026 r. odbył się przetarg pisemny nieograniczony na sprzedaż nieruchomości, składającej się z działek nr 96/124, 96/125 o łącznej powierzchni 5,4269 ha przy ul. Metalowej w Stargardzie.</a>
    </div>
  </div>
</div>
<div class="list list_date-sym w-100 mx-auto mt-1 mb-1">
  <div class="row date_sym mx-auto pb-1">
    <div class="col-4 pl-1" tabindex="0">Symbol: <span class="text-uppercase">Wynik085/2026</span></div>
    <div class="col-8 text-right pr-1" tabindex="0">2026-03-06</div>
  </div>
  <div class="row pl-1 pt-2">
    <div class="col-12 font-weight-bold">
      <a class="router_link" tabindex="0" href="22358/dokument/71227">Prezydent Miasta Stargard informuje, że w dniu 25 lutego 2026 r. odbył się I przetarg ustny nieograniczony na sprzedaż nieruchomości gruntowej niezabudowanej, składającej się z działek nr 61/22 i 62/14 o łącznej powierzchni 0,1289 ha przy ul. Majora Hubala w Stargardzie.</a>
    </div>
  </div>
</div>
`;

test('parseBipResultList: filters to flat entries only (drops land)', () => {
  const items = parseBipResultList(BIP_LIST_HTML, 'https://bip.stargard.eu');
  assert.equal(items.length, 1, 'should keep only the flat (Wynik095), drop land (Wynik094=land, Wynik085=land)');
  assert.equal(items[0].symbol, 'Wynik095/2026');
  assert.equal(items[0].kind, 'mieszkalny');
});

test('parseBipResultList: extracts date and href correctly', () => {
  const items = parseBipResultList(BIP_LIST_HTML, 'https://bip.stargard.eu');
  assert.equal(items[0].date, '2026-05-14');
  assert.equal(items[0].href, 'https://bip.stargard.eu/22358/dokument/72459');
});

test('parseBipResultList: includes summary text', () => {
  const items = parseBipResultList(BIP_LIST_HTML, 'https://bip.stargard.eu');
  assert.ok(items[0].text.includes('Kościuszki'));
  assert.ok(items[0].text.includes('14,38'));
});

test('parseBipResultList: empty HTML yields no items', () => {
  assert.deepEqual(parseBipResultList('<html><body>nic</body></html>'), []);
});

// -----------------------------------------------------------------------
// BIP result address extractor
// -----------------------------------------------------------------------

// Live fixture text from Wynik095/2026 (bip.stargard.eu/22358/dokument/72459)
const BIP_RESULT_TEXT = 'Prezydent Miasta Stargard informuje, że dnia 24 kwietnia 2026 r. w siedzibie Stargardzkiego Towarzystwa Budownictwa Społecznego Sp. z o.o. przy ul. Andrzeja Struga 29 w Stargardzie odbyły się II rokowania na sprzedaż lokalu mieszkalnego nr 5 o pow. użytkowej 14,38 m2 wraz z przynależnym pomieszczeniem wc o pow. 0,36 m2 usytuowanym poza lokalem (dostęp z klatki schodowej) i przynależnym pomieszczeniem piwnicy o pow. 1,85 m2, położony w budynku mieszkalnym przy ul. Tadeusza Kościuszki 35 w Stargardzie (obręb 10).';

test('addressFromBipText: extracts street+bldg+apt from Wynik095 body', () => {
  const result = addressFromBipText(BIP_RESULT_TEXT);
  assert.ok(result, 'should find address');
  assert.ok(result.address, 'should have parsed address');
  assert.equal(result.address.building, '35');
  assert.equal(result.address.apt, '5');
});

test('parseResultDoc: full integration on Wynik095 fixture', () => {
  const docs = parseResultDoc(
    BIP_RESULT_TEXT,
    '2026-05-14',
    'https://bip.stargard.eu/22358/dokument/72459',
  );
  assert.equal(docs.length, 1);
  const doc = docs[0];
  assert.equal(doc.kind, 'mieszkalny');
  assert.equal(doc.area_m2, 14.38);
  assert.equal(doc.auction_date, '2026-04-24');
  assert.equal(doc.round, 2);
  // Contract fields (refresh.js/build-properties.js consume these; the old
  // shape — result_date/achieved_price_pln, no notes — crashed refresh.js).
  assert.equal(doc.outcome, 'archived'); // §12 notice carries no outcome/price
  assert.equal(doc.final_price_pln, null);
  assert.deepEqual(doc.notes, []);
  assert.equal(doc.source_pdf, 'https://bip.stargard.eu/22358/dokument/72459');
  assert.ok(doc.address);
  assert.equal(doc.address.building, '35');
  assert.equal(doc.address.apt, '5');
});

test('parseResultDoc: returns [] for land result text', () => {
  const landText = 'informuje, że w dniu 25 lutego 2026 r. odbył się I przetarg ustny nieograniczony na sprzedaż nieruchomości gruntowej niezabudowanej, składającej się z działek nr 61/22 i 62/14.';
  const docs = parseResultDoc(landText, '2026-03-06', 'https://bip.stargard.eu/22358/dokument/71227');
  assert.deepEqual(docs, []);
});
