// Busko-Zdrój parser tests — groundtruthed against REAL live fixtures
// (fetched 2026-07-05).
//
// Fixture sources (live-verified):
//
//   ANNOUNCEMENT (umig.busko.pl/ogloszenia/24147-…-gnwr-6840-23-2025.html):
//     Title: "Burmistrz Miasta i Gminy Busko-Zdrój ogłasza pierwszy przetarg
//             ustny nieograniczony na sprzedaż nieruchomości komunalnych.
//             Znak: GNWR.6840.23.2025"
//     Batch of 2 properties:
//       - lokal mieszkalny os. Kościuszki 7/6, 26,38 m², II piętro,
//         cena wywoławcza 190 000,00 zł, przetarg 7 sierpnia 2025 (KEEP)
//       - zabudowana nieruchomość Plac Zwycięstwa 26, 2 500 000,00 zł (DROP)
//     Attachments linked on the page:
//       "Dokument źródłowy do pobrania [pdf]"    → …/2025/06/03/Ogloszenie_o_przetargu.pdf
//       "Informacja o wynikach przetargu [pdf]"  → …/2025/08/19/informacja_o_wybikach_przetargu_gnwr_6840_23_3_2025.pdf
//
//   RESULT PDF (born-digital, pdftotext -layout — diacritics dropped on this
//   host, e.g. "Kościuszki" → "Kociuszki", "użytkowej" → "uytkowej"):
//     Multi-clause; the flat clause reports:
//       Cena wywoławcza 190 000,00 zł · cena osiągnięta w przetargu - 0
//       inne informacje - przetarg zakończony wynikiem negatywnym  → UNSOLD
//     The Plac Zwycięstwa (zabudowana) clause is filtered out.
//
//   NOTE (real-data caveat): pdftotext's diacritic loss makes the result-notice
//   street_norm ("kociuszki") differ from the HTML listing's ("kosciuszki");
//   building+apt (7|6) still match. Verified on first live CI refresh.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parsePLN,
  parseArea,
  parseDateText,
  roundFromTitle,
  parseIndexPage,
  parseAnnouncementListings,
  parseResultLink,
  parseResultDoc,
} from '../src/cities/busko-zdroj/parse.js';

// ---------------------------------------------------------------------------
// Scalar helpers
// ---------------------------------------------------------------------------

test('parsePLN: "190 000,00" → 190000', () => {
  assert.equal(parsePLN('190 000,00'), 190000);
});
test('parsePLN: "2 500 000,00" → 2500000', () => {
  assert.equal(parsePLN('2 500 000,00'), 2500000);
});
test('parsePLN: "0" → null (no achieved price)', () => {
  assert.equal(parsePLN('0'), null);
});
test('parsePLN: null/empty → null', () => {
  assert.equal(parsePLN(null), null);
  assert.equal(parsePLN(''), null);
});

test('parseArea: "26,38" → 26.38', () => {
  assert.equal(parseArea('26,38'), 26.38);
});

test('parseDateText: "7 sierpnia 2025" → 2025-08-07', () => {
  assert.equal(parseDateText('7 sierpnia 2025'), '2025-08-07');
});
test('parseDateText: "19.08.2025" → 2025-08-19', () => {
  assert.equal(parseDateText('19.08.2025'), '2025-08-19');
});

test('roundFromTitle: "pierwszy przetarg" → 1', () => {
  assert.equal(roundFromTitle('ogłasza pierwszy przetarg ustny nieograniczony'), 1);
});
test('roundFromTitle: "drugi przetarg" → 2', () => {
  assert.equal(roundFromTitle('drugi przetarg ustny nieograniczony'), 2);
});
test('roundFromTitle: "Pierwszy przetarg ustny" (clause head) → 1', () => {
  assert.equal(roundFromTitle('Pierwszy przetarg ustny nieograniczony na sprzeda lokalu'), 1);
});
test('roundFromTitle: empty → 1 (default)', () => {
  assert.equal(roundFromTitle(''), 1);
  assert.equal(roundFromTitle(null), 1);
});

// ---------------------------------------------------------------------------
// parseIndexPage — auction-announcement links filtered out of the mixed feed
// ---------------------------------------------------------------------------

const INDEX_HTML = `
<div class="feed">
  <a href="/ogloszenia/24147-burmistrz-miasta-i-gminy-busko-zdroj-oglasza-pierwszy-przetarg-ustny-nieograniczony-na-sprzedaz-nieruchomosci-komunalnych-znak-gnwr-6840-23-2025.html">
    Burmistrz Miasta i Gminy Busko-Zdrój ogłasza pierwszy przetarg ustny nieograniczony na sprzedaż nieruchomości komunalnych. Znak: GNWR.6840.23.2025
  </a>
  <a href="/ogloszenia/25865-obwieszczenie-o-zakonczeniu-postepowania-warunki-zabudowy.html">
    Obwieszczenie Burmistrza o zakończeniu postępowania w sprawie ustalenia warunków zabudowy
  </a>
  <a href="/ogloszenia/25862-obwieszczenie-o-zawieszeniu-postepowania.html">
    Obwieszczenie o zawieszeniu postępowania środowiskowego
  </a>
</div>
`;

test('parseIndexPage: keeps only the auction announcement (1 of 3)', () => {
  const links = parseIndexPage(INDEX_HTML);
  assert.equal(links.length, 1, `expected 1 auction link, got ${links.length}`);
  assert.ok(links[0].url.startsWith('https://www.umig.busko.pl/ogloszenia/24147-'), links[0].url);
});

test('parseIndexPage: empty HTML → []', () => {
  assert.deepEqual(parseIndexPage(''), []);
});

// ---------------------------------------------------------------------------
// parseAnnouncementListings — flat record from the real article body
// ---------------------------------------------------------------------------

// Minimal HTML reproducing the live Joomla article structure: a
// com-content-article__body div holding the flat descriptor, the shared auction
// date, the "Ceny wywoławcze" enumeration, and both attachment links; a
// pagenavigation nav bounds the body. Verbatim wording from the live page.
const ANNOUNCEMENT_HTML = `<!DOCTYPE html><html><head>
<title>Burmistrz Miasta i Gminy Busko-Zdrój ogłasza pierwszy przetarg ustny nieograniczony na sprzedaż nieruchomości komunalnych. Znak: GNWR.6840.23.2025</title>
</head><body>
<nav class="topnav"><a href="/ogloszenia.html">Ogłoszenia</a></nav>
<div class="com-content-article__body">
<p style="text-align: right;">Busko-Zdrój, dn. 03.06.2025 r.</p>
<p>Znak: GNWR.6840.23.2025</p>
<p>Nieruchomość obciążona jest umowami najmu. Lokal mieszkalny nr 6 o pow. użytkowej 26,38 m&sup2; położony na II piętrze w budynku wielomieszkaniowym nr 7 na os. Kościuszki w Busku-Zdroju. Opisanemu lokalowi mieszkalnemu przysługuje udział wynoszący 56/1000 w częściach wspólnych budynku.</p>
<p>Sprzedaż nieruchomości nastąpi na podstawie art. 37 ust. 1 ustawy o gospodarce nieruchomościami w trybie przetargów ustnych nieograniczonych. Przetarg odbędzie się w dniu 7 sierpnia 2025 r. w sali nr 22 (I piętro) Urzędu Miasta i Gminy w Busku-Zdroju, ul. Różana 2: o godz. 10:00 – nieruchomość przy Placu Zwycięstwa 26 w Busku-Zdroju, o godz. 10:30 – lokal mieszkalny Busko-Zdrój os. Kościuszki 7/6.</p>
<p>Ceny wywoławcze nieruchomości wynoszą: 2 500 000,00 zł nieruchomość przy Placu Zwycięstwa 26 w Busku-Zdroju, 190 000,00 zł lokal mieszkalny Busko-Zdrój os. Kościuszki 7/6.</p>
<p><strong><strong>Dokument źródłowy do pobrania</strong>&nbsp;[&nbsp;<a href="https://dl.umig.busko.pl/bip/ogloszenia/2025/06/03/Ogloszenie_o_przetargu.pdf" target="_blank" rel="noopener" title="Dokument źródłowy do pobrania">pdf&nbsp;</a>].</strong></p>
<p><strong><strong>Informacja o wynikach przetargu&nbsp;</strong>[&nbsp;<a href="https://dl.umig.busko.pl/bip/ogloszenia/2025/08/19/informacja_o_wybikach_przetargu_gnwr_6840_23_3_2025.pdf" target="_blank" rel="noopener" title="Informacja o wynikach przetargu">pdf&nbsp;</a>].</strong></p>
</div>
<nav class="pagenavigation" aria-label="Nawigacja strony"><a href="/ogloszenia/24146-x.html">Poprzednia</a></nav>
</body></html>`;

const ANNOUNCEMENT_URL =
  'https://www.umig.busko.pl/ogloszenia/24147-burmistrz-miasta-i-gminy-busko-zdroj-oglasza-pierwszy-przetarg-ustny-nieograniczony-na-sprzedaz-nieruchomosci-komunalnych-znak-gnwr-6840-23-2025.html';

test('parseAnnouncementListings: exactly 1 flat (commercial Plac Zwycięstwa dropped)', () => {
  const l = parseAnnouncementListings(ANNOUNCEMENT_HTML, ANNOUNCEMENT_URL);
  assert.equal(l.length, 1, `expected 1 flat, got ${l.length}`);
});

test('parseAnnouncementListings: kind mieszkalny', () => {
  const [r] = parseAnnouncementListings(ANNOUNCEMENT_HTML, ANNOUNCEMENT_URL);
  assert.equal(r.kind, 'mieszkalny');
});

test('parseAnnouncementListings: address Kościuszki 7/6', () => {
  const [r] = parseAnnouncementListings(ANNOUNCEMENT_HTML, ANNOUNCEMENT_URL);
  assert.ok(r.address, 'address parsed');
  assert.equal(r.address.street_norm, 'kosciuszki');
  assert.equal(r.address.building, '7');
  assert.equal(r.address.apt, '6');
});

test('parseAnnouncementListings: area_m2 26.38', () => {
  const [r] = parseAnnouncementListings(ANNOUNCEMENT_HTML, ANNOUNCEMENT_URL);
  assert.equal(r.area_m2, 26.38);
});

test('parseAnnouncementListings: starting_price_pln 190000', () => {
  const [r] = parseAnnouncementListings(ANNOUNCEMENT_HTML, ANNOUNCEMENT_URL);
  assert.equal(r.starting_price_pln, 190000);
});

test('parseAnnouncementListings: auction_date 2025-08-07', () => {
  const [r] = parseAnnouncementListings(ANNOUNCEMENT_HTML, ANNOUNCEMENT_URL);
  assert.equal(r.auction_date, '2025-08-07');
});

test('parseAnnouncementListings: round 1 (pierwszy przetarg)', () => {
  const [r] = parseAnnouncementListings(ANNOUNCEMENT_HTML, ANNOUNCEMENT_URL);
  assert.equal(r.round, 1);
});

test('parseAnnouncementListings: detail_url is the announcement URL', () => {
  const [r] = parseAnnouncementListings(ANNOUNCEMENT_HTML, ANNOUNCEMENT_URL);
  assert.equal(r.detail_url, ANNOUNCEMENT_URL);
});

test('parseAnnouncementListings: non-flat page → []', () => {
  assert.deepEqual(
    parseAnnouncementListings('<div class="com-content-article__body"><p>Obwieszczenie o warunkach zabudowy.</p></div>', ANNOUNCEMENT_URL),
    [],
  );
});

// ---------------------------------------------------------------------------
// parseResultLink — attachment PDFs + article date
// ---------------------------------------------------------------------------

test('parseResultLink: result PDF URL extracted', () => {
  const r = parseResultLink(ANNOUNCEMENT_HTML);
  assert.equal(
    r.resultPdf,
    'https://dl.umig.busko.pl/bip/ogloszenia/2025/08/19/informacja_o_wybikach_przetargu_gnwr_6840_23_3_2025.pdf',
  );
});

test('parseResultLink: announcement PDF URL extracted', () => {
  const r = parseResultLink(ANNOUNCEMENT_HTML);
  assert.equal(
    r.announcementPdf,
    'https://dl.umig.busko.pl/bip/ogloszenia/2025/06/03/Ogloszenie_o_przetargu.pdf',
  );
});

test('parseResultLink: article date from body → 2025-06-03', () => {
  const r = parseResultLink(ANNOUNCEMENT_HTML);
  assert.equal(r.publishedDate, '2025-06-03');
});

test('parseResultLink: page without result PDF → resultPdf null', () => {
  const noResult = `<div class="com-content-article__body">
    <p><strong><strong>Dokument źródłowy do pobrania</strong>&nbsp;[&nbsp;<a href="https://dl.umig.busko.pl/bip/ogloszenia/2026/01/02/Ogloszenie_o_przetargu.pdf">pdf</a>].</strong></p>
  </div>`;
  const r = parseResultLink(noResult);
  assert.equal(r.resultPdf, null);
  assert.ok(r.announcementPdf?.endsWith('Ogloszenie_o_przetargu.pdf'));
});

// ---------------------------------------------------------------------------
// parseResultDoc — real pdftotext output of the Kościuszki 7/6 result PDF.
// Diacritics dropped verbatim as pdftotext emits them on this host.
// ---------------------------------------------------------------------------

const RESULT_TEXT = `BURMISTRZ
MIASTA I GMINY
BUSKO-ZDROJ

Busko-Zdroj, dn. 19.08.2025r

Znak: GNWR.6840.23.3.2025

Burmistrz Miasta i Gminy Busko-Zdroj podaje do publicznej wiadomoci:

INFORMACJ

o wynikach przetargow ustnych nieograniczonych na sprzeda nieruchomoci komunalnych,
ktore odbyly si w dniu 7 sierpnia 2025 roku w sali nr 22 (I pitro) Urzdu Miasta i Gminy
w Busku-Zdroju, ul. Rana 2.

1. Pierwszy przetarg ustny nieograniczony na sprzeda zabudowanej nieruchomoci poloonej
w miejscowoci Busko-Zdroj przy Placu Zwycistwa 26, oznaczonej w ewidencji gruntow nr 386
obrb 06 o powierzchni 0,0518 ha.
Cena wywolawcza nieruchomoci - 2 500 000,00 zl
najwysza cena osignita w przetargu - 0
nabywca nieruchomoci - brak osob uczestniczcych w przetargu
inne informacje - przetarg zakoczony wynikiem negatywnym

2. Pierwszy przetarg ustny nieograniczony na sprzeda lokalu mieszkalnego nr 6 o pow.
uytkowej 26,38 m poloonego na II pitrze w budynku wielomieszkaniowym nr 7 na
os. Kociuszki w Busku-Zdroju. Opisanemu lokalowi mieszkalnemu przysluguje udzial
wynoszcy 56/1000 w czciach wspolnych budynku.
Cena wywolawcza nieruchomoci - 190 000,00 zl
najwysza cena osignita w przetargu - 0
nabywca nieruchomoci - brak osob uczestniczcych w przetargu
inne informacje - przetarg zakoczony wynikiem negatywnym
`;

const RESULT_URL =
  'https://dl.umig.busko.pl/bip/ogloszenia/2025/08/19/informacja_o_wybikach_przetargu_gnwr_6840_23_3_2025.pdf';

test('parseResultDoc: exactly 1 flat record (zabudowana clause filtered out)', () => {
  const recs = parseResultDoc(RESULT_TEXT, '2025-08-19', RESULT_URL);
  assert.equal(recs.length, 1, `expected 1 flat result, got ${recs.length}`);
});

test('parseResultDoc: kind mieszkalny', () => {
  const [r] = parseResultDoc(RESULT_TEXT, '2025-08-19', RESULT_URL);
  assert.equal(r.kind, 'mieszkalny');
});

test('parseResultDoc: address building 7 / apt 6', () => {
  const [r] = parseResultDoc(RESULT_TEXT, '2025-08-19', RESULT_URL);
  assert.ok(r.address, 'address parsed');
  assert.equal(r.address.building, '7');
  assert.equal(r.address.apt, '6');
  assert.ok(/kociuszki/i.test(r.address.street_norm), r.address.street_norm);
});

test('parseResultDoc: area_m2 26.38', () => {
  const [r] = parseResultDoc(RESULT_TEXT, '2025-08-19', RESULT_URL);
  assert.equal(r.area_m2, 26.38);
});

test('parseResultDoc: starting_price_pln 190000', () => {
  const [r] = parseResultDoc(RESULT_TEXT, '2025-08-19', RESULT_URL);
  assert.equal(r.starting_price_pln, 190000);
});

test('parseResultDoc: final_price_pln null (cena osiągnięta 0)', () => {
  const [r] = parseResultDoc(RESULT_TEXT, '2025-08-19', RESULT_URL);
  assert.equal(r.final_price_pln, null);
});

test('parseResultDoc: outcome unsold (wynik negatywny)', () => {
  const [r] = parseResultDoc(RESULT_TEXT, '2025-08-19', RESULT_URL);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'wynik negatywny');
});

test('parseResultDoc: auction_date 2025-08-07 (from notice header)', () => {
  const [r] = parseResultDoc(RESULT_TEXT, null, RESULT_URL);
  assert.equal(r.auction_date, '2025-08-07');
});

test('parseResultDoc: round 1', () => {
  const [r] = parseResultDoc(RESULT_TEXT, '2025-08-19', RESULT_URL);
  assert.equal(r.round, 1);
});

test('parseResultDoc: source_pdf is the PDF URL', () => {
  const [r] = parseResultDoc(RESULT_TEXT, '2025-08-19', RESULT_URL);
  assert.equal(r.source_pdf, RESULT_URL);
});

test('parseResultDoc: non-result text → []', () => {
  assert.deepEqual(parseResultDoc('Ogłoszenie o przetargu na sprzedaż lokalu.', null, RESULT_URL), []);
});

test('parseResultDoc: empty/null → []', () => {
  assert.deepEqual(parseResultDoc('', null, RESULT_URL), []);
  assert.deepEqual(parseResultDoc(null, null, RESULT_URL), []);
});
