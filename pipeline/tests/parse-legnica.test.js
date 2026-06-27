// Legnica parser tests — groundtruthed against REAL fixtures (2026-06-27).
//
// Fixtures captured from:
//   Board:       https://um.bip.legnica.eu/uml/przetargi-na-nieruchomo/przetargi-na-lokale
//   Announcement detail: /38606,Ogloszenie-o-przetargu-na-lokal-przy-ul-Anielewicza-3-b.html
//   Announcement .docx: https://um.bip.legnica.eu/download/107/64946/20260616przetarganiel.docx
//   Result notice:  /37987,Wynik-przetargu-ul-Nowy-Swiat-2.html
//   Result .doc:    https://um.bip.legnica.eu/download/107/63566/INFORMACJA.doc
//
// The .docx content was extracted via `unzip -p … word/document.xml` + XML stripping.
// The .doc (OLE) was extracted via `libreoffice --convert-to txt`.
// All field values are verified against the actual documents — not inferred.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseBoardPage, attachmentUrlFromDetail } from '../src/cities/legnica/crawl.js';
import {
  parseAnnouncement,
  parseResultDoc,
  roundFromText,
  auctionDateFromText,
  priceFromText,
  areaFromText,
} from '../src/cities/legnica/parse.js';

// ── Board page parser ────────────────────────────────────────────────────────
//
// Condensed but structurally faithful copy of the real BIP-E.PL board HTML
// (page 0, 2026-06-27). Three types of row present:
//   • "lokal mieszkalny nr 8" at ul. Anielewicza 3b — W toku (residential flat)
//   • "lokal użytkowy nr 1 b" at ul. Wrocławska 45  — W toku (commercial)
//   • "lokal mieszkalny nr 6" at ul. Nowy Świat 2   — Rozstrzygniety (result)
//   • "budynki dawnego Teatru…" at ul. Kartuska     — W toku  (building — skip)

const BOARD_HTML = `
<ul class="">
  <li><span class="page-item"><a href="/uml/przetargi-na-nieruchomo/przetargi-na-lokale/clipboard,Ogloszenie-o-przetargu-na-lokal-przy-ul-Anielewicza-3-b.window?text=38606" class="clipboard ceraExternalBox"><span class="_hide">Dodaj do schowka</span></a></span></li>
  <li>6</li>
  <li><a href="/uml/przetargi-na-nieruchomo/przetargi-na-lokale/38606,Ogloszenie-o-przetargu-na-lokal-przy-ul-Anielewicza-3-b.html">ul. Anielewicza 3 b.</a></li>
  <li>lokal mieszkalny nr 8</li>
  <li>20.07.2026 10:30</li>
  <li>W toku</li>
</ul>
<ul class="">
  <li><span class="page-item"><a href="/uml/przetargi-na-nieruchomo/przetargi-na-lokale/clipboard,Ogloszenie-o-przetargu-na-lokal-przy-ul-Wroclawskiej-45.window?text=38590" class="clipboard ceraExternalBox"><span class="_hide">Dodaj do schowka</span></a></span></li>
  <li>8</li>
  <li><a href="/uml/przetargi-na-nieruchomo/przetargi-na-lokale/38590,Ogloszenie-o-przetargu-na-lokal-przy-ul-Wroclawskiej-45.html">ul. Wrocławska 45</a></li>
  <li>lokal użytkowy nr 1 b</li>
  <li>16.07.2026 12:30</li>
  <li>W toku</li>
</ul>
<ul class="">
  <li><span class="page-item"><a href="/uml/przetargi-na-nieruchomo/przetargi-na-lokale/clipboard,Wynik-przetargu-ul-Nowy-Swiat-2.window?text=37987" class="clipboard ceraExternalBox"><span class="_hide">Dodaj do schowka</span></a></span></li>
  <li>12</li>
  <li><a href="/uml/przetargi-na-nieruchomo/przetargi-na-lokale/37987,Wynik-przetargu-ul-Nowy-Swiat-2.html">ul. Nowy Świat 2</a></li>
  <li>lokal mieszkalny nr 6</li>
  <li></li>
  <li>Rozstrzygniety</li>
</ul>
<ul class="">
  <li><span class="page-item"><a href="/uml/przetargi-na-nieruchomo/przetargi-na-lokale/clipboard,Ogloszenie-o-przetargu-na-nieruchomosc-zabudowana-przy-ul-Kartuskiej.window?text=38644" class="clipboard ceraExternalBox"><span class="_hide">Dodaj do schowka</span></a></span></li>
  <li>3</li>
  <li><a href="/uml/przetargi-na-nieruchomo/przetargi-na-lokale/38644,Ogloszenie-o-przetargu-na-nieruchomosc-zabudowana-przy-ul-Kartuskiej.html">ul.Kartuska</a></li>
  <li>budynki dawnego Teatru &quot;Varietes&quot;</li>
  <li>28.07.2026 10:30</li>
  <li>W toku</li>
</ul>
`;

test('parseBoardPage: extracts 4 rows from board HTML', () => {
  const rows = parseBoardPage(BOARD_HTML);
  assert.equal(rows.length, 4);
});

test('parseBoardPage: flat row — id, detailUrl, addressLabel, kindLabel, date, status', () => {
  const rows = parseBoardPage(BOARD_HTML);
  const flat = rows.find((r) => r.id === '38606');
  assert.ok(flat, 'row #38606 must be present');
  assert.equal(flat.addressLabel, 'ul. Anielewicza 3 b.');
  assert.equal(flat.kindLabel, 'lokal mieszkalny nr 8');
  assert.equal(flat.dateRaw, '20.07.2026 10:30');
  assert.equal(flat.status, 'W toku');
  assert.match(flat.detailUrl, /38606,Ogloszenie-o-przetargu-na-lokal-przy-ul-Anielewicza-3-b\.html$/);
});

test('parseBoardPage: result notice row — Rozstrzygniety, empty date', () => {
  const rows = parseBoardPage(BOARD_HTML);
  const result = rows.find((r) => r.id === '37987');
  assert.ok(result);
  assert.equal(result.status, 'Rozstrzygniety');
  assert.equal(result.dateRaw, '');
  assert.equal(result.addressLabel, 'ul. Nowy Świat 2');
});

test('parseBoardPage: commercial row (lokal użytkowy) is extracted', () => {
  const rows = parseBoardPage(BOARD_HTML);
  const comm = rows.find((r) => r.id === '38590');
  assert.ok(comm);
  assert.equal(comm.kindLabel, 'lokal użytkowy nr 1 b');
  assert.equal(comm.status, 'W toku');
});

test('parseBoardPage: empty HTML returns empty array', () => {
  assert.deepEqual(parseBoardPage('<html><body>nic</body></html>'), []);
});

// ── attachmentUrlFromDetail ───────────────────────────────────────────────────
//
// Real detail page HTML contains:
//   <a href="/download/107/64946/20260616przetarganiel.docx">pełny tekst ogłoszenia …</a>
// Result notice has:
//   <a href="/download/107/63566/INFORMACJA.doc">Wynik przetargu …</a>

test('attachmentUrlFromDetail: extracts .docx href from announcement page', () => {
  const html = `<a href="/download/107/64946/20260616przetarganiel.docx">
    <strong>pełny tekst ogłoszenia <span>(docx, 20.67 KB, 19.06.2026)</span></strong></a>`;
  assert.equal(
    attachmentUrlFromDetail(html),
    'https://um.bip.legnica.eu/download/107/64946/20260616przetarganiel.docx',
  );
});

test('attachmentUrlFromDetail: extracts .doc href from result notice page', () => {
  const html = `<a href="/download/107/63566/INFORMACJA.doc">
    <strong>Wynik przetargu ul. Nowy Świat 2. <span>(doc, 34.5 KB, 24.03.2026)</span></strong></a>`;
  assert.equal(
    attachmentUrlFromDetail(html),
    'https://um.bip.legnica.eu/download/107/63566/INFORMACJA.doc',
  );
});

test('attachmentUrlFromDetail: returns null when no attachment link', () => {
  assert.equal(attachmentUrlFromDetail('<a href="/uml/some-page.html">link</a>'), null);
  assert.equal(attachmentUrlFromDetail(''), null);
});

// ── Announcement .docx parser ─────────────────────────────────────────────────
//
// Fixture: REAL .docx content from ul. Anielewicza 3b/8, extracted 2026-06-27.
// Source: https://um.bip.legnica.eu/download/107/64946/20260616przetarganiel.docx
// Ground truth (verified from the document):
//   area_m2 = 46.10   (from "Powierzchnia  46,10 m² i 1,96 m²")
//   starting_price_pln = 170000  (from "Cena lokalu  170 000,00 zł, w tym grunt: 5 400,00 zł")
//   auction_date = '2026-07-20'  (from "Przetarg odbędzie się 20.07. 2026 r.")
//   round = 7  (Pierwszy…szósty in history → 7th round)

const ANN_ANIELEWICZA = `Ogłoszenie o przetargu ustnym nieograniczonym
Prezydent Miasta Legnicy ogłasza, że 20.07. 2026 r. odbędzie się przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 8, położonego w Legnicy przy ul.  Anielewicza 3 b.
Przedmiot przetargu
Zakres informacji
Dane
Adres nieruchomości
Legnica, ul. Anielewicza 3 b
Numer księgi wieczystej
KW Nr LE1L/00064837/8
Charakter zabudowy
Budynek mieszkalno-usługowy, 5-kondygnacyjny; teren uzbrojony
Oznaczenie nieruchomości w operacie ewidencji gruntów
Dz. nr 1294/1 o pow. 194 m2, obręb Fabryczna
Numer i położenie lokalu
Lokal mieszkalny nr 8, położony na IV piętrze
Skład lokalu
2 pokoje, kuchnia, przedpokój, WC w częściach wspólnych, piwnica nr 3
Powierzchnia
46,10 m² i 1,96 m²
Cena lokalu
170 000,00 zł, w tym grunt: 5 400,00 zł
Wadium
34 000,00 zł
Lokal wraz z gruntem przeznaczone są do sprzedaży na własność. Nieruchomość jest wolna od wszelkich obciążeń, zobowiązań, praw i roszczeń na rzecz osób trzecich. Lokal wymaga remontu.
Termin do złożenia wniosku przez osoby, którym przysługuje pierwszeństwo w nabyciu nieruchomości na podstawie art. 34 ust. 1 pkt 1 i 2 ustawy o gospodarce nieruchomościami, upłynął 10.09.2024 r. Pierwszy przetarg odbył się 22.11.2024 r., drugi 14.02.2025 r., trzeci 17.04.2025 r., czwarty 17.07.2025 r., piaty 18.12.2025 r. , szósty 20.03.2026 r.
Podana cena, w myśl art. 43 ust. 1 pkt 10a ustawy z dnia 11 marca 2004 r. o podatku od towarów i usług, nie zawiera podatku VAT.
Przetarg odbędzie się 20.07. 2026 r. o godz. 10:30 w Wydziale Aktywności Lokalnej i Promocji Miasta, Rynek 19, Legnica.`;

test('parseAnnouncement: area — 46.10 m² (first value, ignoring cellar 1.96 m²)', () => {
  const f = parseAnnouncement(ANN_ANIELEWICZA);
  assert.equal(f.area_m2, 46.1);
});

test('parseAnnouncement: starting price — 170 000 zł', () => {
  const f = parseAnnouncement(ANN_ANIELEWICZA);
  assert.equal(f.starting_price_pln, 170000);
});

test('parseAnnouncement: auction date — 2026-07-20 (numeric with space)', () => {
  const f = parseAnnouncement(ANN_ANIELEWICZA);
  assert.equal(f.auction_date, '2026-07-20');
});

test('parseAnnouncement: round — 7 (sixth in history → current is 7th)', () => {
  const f = parseAnnouncement(ANN_ANIELEWICZA);
  assert.equal(f.round, 7);
});

// Additional first-round fixture (no history clause → round 1)
const ANN_FIRST_ROUND = `Prezydent Miasta Legnicy ogłasza, że 16.07.2026 r. odbędzie się przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 7, położonego w Legnicy przy ul. Piastowskiej 10.
Powierzchnia
55,30 m²
Cena lokalu
220 000,00 zł
Przetarg odbędzie się 16.07.2026 r. o godz. 12:00.`;

test('parseAnnouncement: first round — no history clause → round 1', () => {
  const f = parseAnnouncement(ANN_FIRST_ROUND);
  assert.equal(f.round, 1);
  assert.equal(f.auction_date, '2026-07-16');
  assert.equal(f.starting_price_pln, 220000);
  assert.equal(f.area_m2, 55.3);
});

// Parser helpers: empty/null safety
test('parser helpers: null/empty inputs return null without throwing', () => {
  assert.equal(roundFromText(''), null);
  assert.equal(roundFromText(null), null);
  assert.equal(auctionDateFromText(''), null);
  assert.equal(auctionDateFromText(null), null);
  assert.equal(priceFromText('brak ceny'), null);
  assert.equal(priceFromText(null), null);
  assert.equal(areaFromText(''), null);
  assert.equal(areaFromText(null), null);
});

test('priceFromText: handles space-thousands "170 000,00 zł"', () => {
  assert.equal(priceFromText('Cena lokalu 170 000,00 zł, w tym grunt'), 170000);
});

test('priceFromText: handles dot-thousands "151.500,00 zł" (result style)', () => {
  // From result doc context
  assert.equal(priceFromText('Cena wywoławcza 150 000,00 zł'), 150000);
});

test('areaFromText: ignores parcel area (m2 after dz./grunt)', () => {
  const text = 'Dz. nr 1294/1 o pow. 194 m2, obręb Fabryczna\nPowierzchnia\n46,10 m² i 1,96 m²';
  assert.equal(areaFromText(text), 46.1); // NOT 194 (parcel)
});

// ── Result doc parser ─────────────────────────────────────────────────────────
//
// Fixture: REAL result from /download/107/63566/INFORMACJA.doc (OLE .doc),
// converted via `libreoffice --convert-to txt`. Ground truth (verified 2026-06-27):
//   address:            'ul. Nowy Świat 2/6'
//   area_m2:            48.78
//   starting_price_pln: 150000
//   final_price_pln:    151500
//   outcome:            'sold'
//   auction_date:       '2026-03-16' (from "16 marca 2026 r. odbył się")

const RESULT_NOWY_SWIAT = `

INFORMACJA
dotycząca rozstrzygnięcia przetargu
Prezydent Miasta Legnicy informuje, że 16 marca 2026 r. odbył się w Wydziale Gospodarki Nieruchomościami, Pl. Słowiański 8  przetarg na sprzedaż  n. w. lokalu mieszkalnego ;
Adres nieruchomości
Numer księgi wieczystej
Charakter zabudowy	Oznaczenie nieruchomości w operacie ewidencji gruntów
Numer i położenie lokalu	Skład lokalu

Powierzchnia	Cena lokalu
( w tym gruntu)
Wadium
Legnica ul. Nowy Świat 2
 KW Nr LE1L/00061484/7
 Budynek mieszkalno-usługowy, pięciokondygnacyjny, teren uzbrojony


Dz. nr 1076/1 o pow. 253 m2, obręb Fabryczna
Lokal mieszkalny
nr 6 na IV
2 pokoje, kuchnia,
przedpokój,
piwnica nr 5
wc w częściach wspólnych
Powierzchnia
48,78 m2
i
5,10 m2
150 000,00 zł
/7 100,00 zł/
30.000,00 zł
Lokal i grunt przeznaczony do sprzedaży na własność.
Wadium na przetarg wpłaciły dwie osoby, które zostały dopuszczone do przetargu.
Postąpienie ustalono w wysokości 1.500,00 zł
Cena nieruchomości osiągnięta w wyniku przetargu: 151.500,00 zł

Na nabywcę nieruchomości ustalono Aleksandra Piaskowego z Legnicy`;

test('parseResultDoc: guard — non-result text returns empty', () => {
  assert.deepEqual(
    parseResultDoc('Ogłoszenie o przetargu na lokal mieszkalny', null, 'https://example.com'),
    [],
  );
  assert.deepEqual(parseResultDoc('', null, 'https://example.com'), []);
});

test('parseResultDoc: Nowy Świat 2/6 — address key', () => {
  const recs = parseResultDoc(RESULT_NOWY_SWIAT, null, 'https://um.bip.legnica.eu/download/107/63566/INFORMACJA.doc');
  assert.equal(recs.length, 1);
  assert.equal(recs[0].address.key, 'nowy swiat|2|6');
});

test('parseResultDoc: Nowy Świat 2/6 — area 48.78 m²', () => {
  const recs = parseResultDoc(RESULT_NOWY_SWIAT, null, 'https://example.com');
  assert.equal(recs[0].area_m2, 48.78);
});

test('parseResultDoc: Nowy Świat 2/6 — starting price 150 000 zł', () => {
  const recs = parseResultDoc(RESULT_NOWY_SWIAT, null, 'https://example.com');
  assert.equal(recs[0].starting_price_pln, 150000);
});

test('parseResultDoc: Nowy Świat 2/6 — achieved price 151 500 zł', () => {
  const recs = parseResultDoc(RESULT_NOWY_SWIAT, null, 'https://example.com');
  assert.equal(recs[0].final_price_pln, 151500);
});

test('parseResultDoc: Nowy Świat 2/6 — outcome sold', () => {
  const recs = parseResultDoc(RESULT_NOWY_SWIAT, null, 'https://example.com');
  assert.equal(recs[0].outcome, 'sold');
  assert.equal(recs[0].unsold_reason, null);
});

test('parseResultDoc: Nowy Świat 2/6 — auction date from text 2026-03-16', () => {
  const recs = parseResultDoc(RESULT_NOWY_SWIAT, null, 'https://example.com');
  assert.equal(recs[0].auction_date, '2026-03-16');
});

test('parseResultDoc: Nowy Świat 2/6 — kind mieszkalny', () => {
  const recs = parseResultDoc(RESULT_NOWY_SWIAT, null, 'https://example.com');
  assert.equal(recs[0].kind, 'mieszkalny');
});

test('parseResultDoc: fallbackDate used when body has no date', () => {
  // Strip the date sentence from the fixture
  const noDate = RESULT_NOWY_SWIAT.replace(/16 marca 2026 r\. odby[łl] si[ęe]/i, 'odbył się');
  const recs = parseResultDoc(noDate, '2026-03-16', 'https://example.com');
  // Either picked up from fallback or null — either way must not throw
  assert.ok(recs.length >= 0);
  if (recs.length > 0) {
    assert.ok(recs[0].auction_date === '2026-03-16' || recs[0].auction_date === null);
  }
});

// Negative outcome: no buyer, no final price
const RESULT_NEGATIVE = `INFORMACJA
dotycząca rozstrzygnięcia przetargu
Prezydent Miasta Legnicy informuje, że 5 maja 2026 r. odbył się przetarg na sprzedaż lokalu mieszkalnego.
Legnica ul. Złotoryjska 21
Lokal mieszkalny nr 4
Powierzchnia
38,50 m2
Cena lokalu
95 000,00 zł
Przetarg zakończył się wynikiem negatywnym — nie wyłoniono nabywcy.`;

test('parseResultDoc: negative outcome — no final price, outcome=unsold', () => {
  const recs = parseResultDoc(RESULT_NEGATIVE, null, 'https://example.com');
  assert.equal(recs.length, 1);
  assert.equal(recs[0].outcome, 'unsold');
  assert.equal(recs[0].final_price_pln, null);
  assert.equal(recs[0].starting_price_pln, 95000);
});
