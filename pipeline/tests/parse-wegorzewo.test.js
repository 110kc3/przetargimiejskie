// Tests for pipeline/src/cities/wegorzewo/{parse,crawl}.js
//
// Fixtures groundtruthed 2026-07-10/11 against LIVE bip.wegorzewo.pl (IDcom
// CMS, insecureTLS — see config.js). Every string embedded below (titles,
// body text, prices, dates) is copied verbatim from a real fetched page, not
// paraphrased — the same methodology parse-naklo-nad-notecia.test.js and
// parse-gizycko.test.js use. Detail-page body text was extracted via the
// SAME balanced-div algorithm crawl.js ships (extractTrescDiv), run against
// the raw captured HTML, so the test proves the real parser output, not an
// idealized re-typing of it.
//
//   PENDING flat, village form, no round stated:
//     wiadomosc/616337  Sztynort Mały 3/6 — 24,40 m2, 23 600 zł, 2022-03-29
//   PENDING flat, town street, round I ("pierwszy"):
//     wiadomosc/801593  Armii Krajowej 42/3 — 14,30 m2, 39 400 zł, 2025-03-06
//   PENDING flat, village "we wsi" form, no round stated:
//     wiadomosc/822001  Pniewo 5/4 — 33,20 m2, 40 300 zł, 2025-06-26
//   PENDING flat, "w miejscowości" form, round III via "(III przetarg)":
//     wiadomosc/403110  Węgielsztyn 37/4 — 109,03 m2, 60 000 zł, 2018-01-19
//     (price notation "60.000,-zł" — dot-thousands, dash for "no grosze")
//   PENDING flat, title carries NO address at all (body-only fallback,
//   village name captured in the LOCATIVE case "w Kalu" — kept as-is, same
//   policy this codebase applies to genitive street names elsewhere):
//     wiadomosc/501783  "Kalu" 38/2 — 89,20 m2, 91 000 zł, 2020-02-07
//     (also the DETAIL_HTML fixture below: <div class="tresc"> nests
//     further <div>s for each numbered section I-VII — a naive
//     non-greedy-to-first-</div> extraction truncates after section I,
//     losing the price/date/wadium entirely)
//   PENDING land, multi-parcel notice (636/36 + 636/38 + 636/40 in one
//   announcement — only the FIRST parcel is extracted, same simplification
//   gizycko's own multi-flat nr 53/2025 fixture already applies), a stray
//   space BEFORE the comma in the price ("12 000, 00 zł" — a typo in the
//   source itself):
//     wiadomosc/886596  Słowackiego, dz. 636/36 — 0,0023 ha, 12 000 zł, 2026-07-09
//
//   RESULT flat SOLD, inline HTML (no PDF attachment):
//     wiadomosci/14619/wiadomosc/830000  Pniewo 5/4 — 40 300 -> 40 703 zł
//   RESULT flat SOLD, inline HTML (no PDF attachment):
//     wiadomosci/14619/wiadomosc/809365  Armii Krajowej 42/3 — 39 400 -> 70 132 zł
//   RESULT land UNSOLD ("zakończył się wynikiem negatywnym" + "nie wyłoniono
//   nabywcy"), round V ("piąty"):
//     wiadomosci/14619/wiadomosc/783284  Kal, dz. 132/45 — 140 000 zł wywoławcza,
//     "najwyższa cena osiągnięta w przetargu: - 0" (no "zł" at all -> null)
//
//   LEASE (dzierżawa + ograniczony, board-level title only, never reaches a
//   detail fetch — crawl.js's isSaleAuctionTitle gate rejects it):
//     wiadomosc/563781  "...ograniczony do mieszkańców... na dzierżawę działki..."
//   Non-property PROCUREMENT noise sharing the SAME IDcom category (must
//   also be rejected — neither states "sprzedaż"/"zbycie"):
//     wiadomosc/853945  "Przetarg na przygotowywanie i wydawanie gorących posiłków..."
//     wiadomosc/381755  "Ogłoszenie o zamówieniu - budowa kanalizacji sanitarnej..."
//   COMMERCIAL unit (lokal NIEmieszkalny — must classify 'uzytkowy', not
//   'mieszkalny'; also proves classifyKind's LAND_RE gap around plural
//   "działek" does NOT affect this path):
//     wiadomosci/14619/wiadomosc/883253  "...lokalu niemieszkalnego nr 5 o pow.
//     97,43 m2, poł. w Radziejach przy ul. Węgorzewskiej 25..."
//
// *** SOURCE CORRECTION vs the spike/gizycko analog *** — results here are
// NOT scanned PDFs. 10+ result detail pages were sampled live across
// 2021-2026 (land/flat/commercial) and every one is inline HTML with a
// structured "cena wywoławcza / najwyższa cena osiągnięta / nabywca" block;
// none carried a PDF attachment. parseResultDoc is therefore a REAL parser
// (unlike gizycko's always-[] OCR stub) — see parse.js/crawl.js headers.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parsePLN,
  roundFromText,
  auctionDateFromBody,
  areaFromBody,
  startingPriceFromBody,
  achievedPriceFromBody,
  isNegativeOutcome,
  addressFromText,
  landParcelFromText,
  landAreaFromText,
  obrebFromText,
  isSaleAuctionTitle,
  isResultTitle,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/wegorzewo/parse.js';

import {
  parseListPage,
  publishedDateFromDetail,
  attachmentPdfUrlsFromDetail,
  extractTrescDiv,
  bodyTextFromDetail,
  listUrl,
} from '../src/cities/wegorzewo/crawl.js';

// ============================================================== board HTML

test('listUrl builds the per-year, per-category board URL', () => {
  assert.equal(
    listUrl('3', 2026, 1),
    'https://bip.wegorzewo.pl/wiadomosci/3/lista/1/2026',
  );
  assert.equal(
    listUrl('14619', 2025, 2),
    'https://bip.wegorzewo.pl/wiadomosci/14619/lista/2/2025',
  );
});

// Real snippet from bip.wegorzewo.pl/wiadomosci/3/lista/3/2025 (confirmed
// live 2026-07-10): a flat, a land plot, and an unrelated procurement
// (roadworks) notice sharing the SAME board — proves parseListPage extracts
// title+url only (the <p class="tresc"> teaser is present in real markup
// but must not be captured).
const LIST_HTML = `
    <div class="t1 clickable">
	<div class="contener">



            <p class="title"><a href="https://bip.wegorzewo.pl/wiadomosci/3/wiadomosc/822001/ogloszenie_burmistrza_wegorzewa_o_przetargu_ustnym_nieograniczon">Ogłoszenie Burmistrza Węgorzewa o przetargu ustnym nieograniczonym na sprzedaż nieruchomości, stanowiącej lokal mieszkalny nr 4 poł. we wsi Pniewo 5, gm. Węgorzewo.</a></p>
            <p class="tresc">Burmistrz Węgorzewa ogłasza przetarg ustny nieograniczony na sprzedaż nieruchomości, stanowiącej lokal mieszkalny nr 4 poł. we wsi Pniewo 5, gm. Węgorzewo. Oznaczenie nieruchomości wg ewidencji oraz księgi wieczystej: Położenie nieruchomości: obręb geod. Pniewo, wieś Pniewo, gmina Węgorzewo.Lokal mieszkalny nr 4 posiadający księgę wieczystą...</p>

	</div>
    </div>

    <div class="t1 clickable">
	<div class="contener">



            <p class="title"><a href="https://bip.wegorzewo.pl/wiadomosci/3/wiadomosc/815824/burmistrz_wegorzewa_oglasza_pierwszy_przetarg_ustny_nieograniczo">Burmistrz Węgorzewa ogłasza pierwszy przetarg ustny nieograniczony na sprzedaż nieruchomości niezabudowanej oznaczonej w ewidencji gruntów i  budynków numerem 393 o pow.: 0,0358ha, opisanej w KW OL2G/00019556/0, położonej w obrębie 0013 Ogonki, gmina Węgorzewo.</a></p>
            <p class="tresc">Burmistrz Węgorzewa ogłasza pierwszy przetarg ustny nieograniczony na sprzedaż nieruchomości niezabudowanej oznaczonej w ewidencji gruntów i budynków numerem 393 o pow.: 0,0358ha, opisanej w KW OL2G/00019556/0, położonej w obrębie 0013 Ogonki, gmina Węgorzewo.Opis nieruchomości: Przedmiotowa nieruchomość położona jest w obrębie...</p>

	</div>
    </div>

    <div class="t1 clickable">
	<div class="contener">



            <p class="title"><a href="https://bip.wegorzewo.pl/wiadomosci/3/wiadomosc/812003/20250328_budowa_oswietlenia_drogowego_na_terenie_gminy_wegorzewo">2025-03-28 Budowa oświetlenia drogowego na terenie gminy Węgorzewo</a></p>
            <p class="tresc">OGŁOSZENIE O ZAMÓWIENIU NA ROBOTY BUDOWLANEPrzedmiotem zamówienia jest budowa 5 odcinków oświetlenia drogowego na terenie gminy Węgorzewo.</p>

	</div>
    </div>
`;

test('parseListPage: finds 3 entries (title+url only, ignoring the tresc teaser)', () => {
  const items = parseListPage(LIST_HTML);
  assert.equal(items.length, 3);
  assert.equal(
    items[0].url,
    'https://bip.wegorzewo.pl/wiadomosci/3/wiadomosc/822001/ogloszenie_burmistrza_wegorzewa_o_przetargu_ustnym_nieograniczon',
  );
  assert.match(items[0].title, /Pniewo 5/);
  assert.match(items[1].title, /Ogonki/);
  assert.match(items[2].title, /oświetlenia/);
});

test('parseListPage: returns [] for empty/null', () => {
  assert.deepEqual(parseListPage(''), []);
  assert.deepEqual(parseListPage(null), []);
});

// Real raw HTML captured from
// https://bip.wegorzewo.pl/wiadomosci/3/wiadomosc/501783/... (confirmed live
// 2026-07-10) — <div class="tresc"> nests a further <div> for EVERY
// numbered section (II-VII), each opening and often closing on the same
// line. A non-greedy "up to the first </div>" extraction (the pattern both
// gizycko/crawl.js and pisz/crawl.js use) stops right after section I,
// losing "IV. Cena wywoławcza" and "V. Miejsce i termin przetargu" entirely.
const DETAIL_HTML_KAL = `
	    <div class="wiadomosc">

	    <div class="t1 resetstyle">
		<div class="contener">

		    <div class="tresc"><p>Przetarg ustny nieograniczony <strong>na sprzedaż lokalu mieszkalnego Nr 2 o powierzchni użytkowej 89,20 m&sup2; mieszczącego się w budynku mieszkalnym wielorodzinnym Nr 38, zlokalizowanym w Kalu, obręb 0008Kal, gmina Węgorzewo wraz z udziałem 253/1000 w częściach wsp&oacute;lnych budynku wraz z przynależną piwnicą o pow.: 2,30m&sup2; i dwoma pomieszczeniami strychowymi o łącznej pow.: 4,00m&sup2;, oraz udziałem w gruncie 253/1000, działka nr 132/22 o pow.: 0,2215ha</strong>, opisana w księdze wieczystej OL2G/00021922/4.</p>
<p>&nbsp;</p>
<p><strong>I. Opis nieruchomości:</strong></p>
<ul>
<li>Lokal Nr 2 położony jest na parterze w budynku mieszkalnym wielorodzinnym Nr 38 w Kalu, składa się z trzech pokoi, kuchni, łazienki i sieni o łącznej pow. użytkowej 89,20 m&sup2; wejście do lokalu z podw&oacute;rza.</li>
<li>Lokal Nr 2 nie posiada świadectwa charakterystyki energetycznej.</li>
</ul>
<div><strong>II. Przeznaczenie i spos&oacute;b zagospodarowania:</strong></div>
<div>
<ul>
<li>Na podstawie miejscowego planu zagospodarowania przestrzennego P&oacute;łwyspu Kal, gminy Węgorzewo działka nr 132/22 oznaczona jest symbolem 29M.</li>
</ul>
<div><strong>III. Obciążenia i zobowiązania:</strong></div>
<div>
<ul>
<li>Przedmiotowa nieruchomość wolna jest od zobowiązań.</li>
</ul>
<div><strong>IV. Cena wywoławcza nieruchomości: 91 000,00 zł</strong></div>
<div>
<ul>
<li>w tym cena lokalu mieszkalnego wraz z udziałem 253/1000 części w elementach wsp&oacute;lnych budynku: 76 838, 00zł.</li>
</ul>
<div><strong>V. Miejsce i termin przetargu:</strong></div>
<div>
<ul>
<li>Przetarg ustny nieograniczony odbędzie się w siedzibie Urzędu Miejskiego w Węgorzewie, ul. Zamkowa 3 w pokoju nr 19 na parterze <strong>o godz. 10:00 dnia 07.02.2020 r.</strong></li>
</ul>
<div><strong>VI. Warunki przetargu:</strong></div>
<div><ol>
<li>Wadium w pieniądzu w wysokości 9 100, 00 zł należy wpłacić na konto Urzędu.</li>
</ol>
<div><strong>VII. Warunki zawarcia umowy sprzedaży i zwrotu wadium:</strong></div>
<div><ol>
<li>Burmistrz Węgorzewa zastrzega sobie prawo odwołania lub unieważnienia przetargu.</li>
</ol></div>
</div>
</div>
</div>
</div>
</div></div>
		</div>
	    </div>

	</div>

            <h3 class="header">Wiadomość powiązana z</h3>
            <div class="row">

	    <div class="t3 clickable">
		<div class="contener">

		    <h3>Wydziały</h3>
		    <div class="dF"><p><a href="https://bip.wegorzewo.pl/struktura/1/2137/wydzial_geodezji_mienia_planowania_przestrzennego_i_rolnictwa_g">Wydział Geodezji, Mienia, Planowania Przestrzennego i Rolnictwa (G)</a></p></div>
		</div>
	    </div>
		        <div class="clear"></div>
	        </div>

	<h3 class="header noprint">Rejestr zmian</h3>

	<div class="ContentBox2 rejestrZmian">
	<div class="Naglowek">
	    Data wytworzenia dokumentu: <span>2019-12-27</span><br />
	    Data wprowadzenia dokumentu do BIP: <span>27 grudnia 2019 13:27</span><br />
	</div>
	</div>
`;

test('extractTrescDiv: captures the FULL nested body, not just section I (real bug the naive regex hits)', () => {
  const body = extractTrescDiv(DETAIL_HTML_KAL);
  assert.match(body, /Cena wywoławcza/);
  assert.match(body, /91\s*000,00\s*z/);
  assert.match(body, /07\.02\.2020/);
  assert.match(body, /VII\. Warunki zawarcia/);
  // Must NOT bleed into the sibling "Wiadomość powiązana z" block.
  assert.doesNotMatch(body, /Wiadomość powiązana/);
  assert.doesNotMatch(body, /Rejestr zmian/);
});

test('bodyTextFromDetail: strips tags/entities and yields the same full content', () => {
  const text = bodyTextFromDetail(DETAIL_HTML_KAL);
  assert.match(text, /Cena wywoławcza nieruchomości: 91 000,00 zł/);
  assert.match(text, /dnia 07\.02\.2020 r\./);
  assert.match(text, /o powierzchni użytkowej 89,20 m²/); // &sup2; decoded
  assert.ok(!text.includes('<div>'), 'should not contain HTML tags');
});

test('publishedDateFromDetail: parses the ISO date span (confirmed live 2026-07-10)', () => {
  assert.equal(publishedDateFromDetail(DETAIL_HTML_KAL), '2019-12-27');
  assert.equal(publishedDateFromDetail(''), null);
  assert.equal(publishedDateFromDetail(null), null);
});

test('attachmentPdfUrlsFromDetail: [] when no PDF (this notice has none, confirmed live)', () => {
  assert.deepEqual(attachmentPdfUrlsFromDetail(DETAIL_HTML_KAL), []);
});

test('attachmentPdfUrlsFromDetail: finds a PDF link when present', () => {
  const html = '<a href="https://bip.wegorzewo.pl/files/informacja_o_wyniku.pdf">wynik</a>';
  assert.deepEqual(attachmentPdfUrlsFromDetail(html), [
    'https://bip.wegorzewo.pl/files/informacja_o_wyniku.pdf',
  ]);
});

// ============================================================ title gates

test('isSaleAuctionTitle: accepts real flat/land sale titles', () => {
  assert.equal(
    isSaleAuctionTitle(
      'Burmistrz Węgorzewa ogłasza pierwszy przetarg ustny nieograniczony na sprzedaż nieruchomości, stanowiącej lokal mieszkalny nr 3 poł. w Węgorzewie przy ul. Armii Krajowej 42, Gmina Węgorzewo.',
    ),
    true,
  );
  assert.equal(
    isSaleAuctionTitle(
      'Ogłoszenie prztargu nieograniczonego na sprzedaż lokalu mieszkalnego nr 4 poł. w miejscowości Węgielsztyn 37 gm. Węgorzewo (III przetarg)',
    ),
    true, // matches via "(III przetarg)" despite the source's own "prztargu" typo
  );
  assert.equal(
    isSaleAuctionTitle(
      'Burmistrz Węgorzewa ogłasza pierwszy ustny przetarg nieograniczony na sprzedaż działek nr: 636/36, 636/38, 636/40 położonych w Węgorzewie przy ul. Słowackiego, obręb 0002 Węgorzewo2, gmina Węgorzewo-miasto, stanowiących własność Gminy Węgorzewo',
    ),
    true,
  );
});

test('isSaleAuctionTitle: rejects a restricted (ograniczony, not nieograniczony) + lease title (real fixture)', () => {
  assert.equal(
    isSaleAuctionTitle(
      '2021-03-19 Przetarg ustny ograniczony do mieszkańców i właścicieli lokali w budynku poł. w Węgorzewie przy ul. Władysława Stefana Reymonta 4 na dzierżawę działki z przeznaczeniem na cele ogrodowe',
    ),
    false,
  );
});

test('isSaleAuctionTitle: rejects procurement/works notices sharing the same board (real fixtures)', () => {
  assert.equal(
    isSaleAuctionTitle(
      'Przetarg na przygotowywanie i wydawanie gorących posiłków dzieciom uczęszczającym do szkół podstawowych na terenie miasta i gminy Węgorzewo w okresie od 01.01.2026 r. do 31.12.2027 r., w dniach nauki szkolnej.',
    ),
    false,
  );
  assert.equal(
    isSaleAuctionTitle(
      '2017-07-10 Ogłoszenie o zamówieniu - budowa kanalizacji sanitarnej ul. Towarowej, Granicznej i Jaracza, gm. Węgorzewo',
    ),
    false,
  );
  assert.equal(isSaleAuctionTitle('2019-10-07 Przebudowa ulicy Kościelnej w Radziejach'), false);
});

test('isSaleAuctionTitle: rejects a result notice even though it says "przetarg" + "zbycie"', () => {
  assert.equal(
    isSaleAuctionTitle(
      'Informacja o wyniku pierwszego przetargu ustnego nieograniczonego na zbycie lokalu mieszkalnego nr 4 o pow. 33,20m2, poł. w miejscowości Pniewo 5, obręb geod. 0017 Pniewo.',
    ),
    false,
  );
});

test('isSaleAuctionTitle: returns false for empty/null', () => {
  assert.equal(isSaleAuctionTitle(''), false);
  assert.equal(isSaleAuctionTitle(null), false);
});

test('isResultTitle: accepts real flat/land/commercial result titles', () => {
  assert.equal(
    isResultTitle(
      'Informacja o wyniku pierwszego przetargu ustnego nieograniczonego na zbycie lokalu mieszkalnego nr 4 o pow. 33,20m2, poł. w miejscowości Pniewo 5, obręb geod. 0017 Pniewo.',
    ),
    true,
  );
  assert.equal(
    isResultTitle(
      'Informacja o wyniku trzeciego przetargu ustnego nieograniczonego na zbycie lokalu niemieszkalnego nr 5 o pow. 97,43 m2, poł. w Radziejach przy ul. Węgorzewskiej 25, obręb geod. 0020 Radzieje, gmina Węgorzewo.',
    ),
    true,
  );
  assert.equal(
    isResultTitle(
      'Informacji o wyniku pierwszego przetargu ustnego nieograniczonego na zbycie nieruchomości  składającej się z niezabudowanych działek  nr : 138 o pow.: 2,7802ha, i 136/2 o pow.: 0,3295ha o łącznej powierzchni 3,1097ha, położone w obrębie Radzieje, gmina Węgorzewo.',
    ),
    true,
  );
});

test('isResultTitle: rejects a lease result sharing the same wyniki board (real fixtures)', () => {
  assert.equal(
    isResultTitle('informuje o wynikach przetargu ustnego ograniczonego na dzierżawę targowiska miejskiego'),
    false,
  );
  assert.equal(isResultTitle('informacja o wyniku przetargu na dzierżawę targowiska miejskiego'), false);
});

test('isResultTitle: false when "wynik" is absent, or for empty/null', () => {
  assert.equal(isResultTitle('sprzedaż lokalu mieszkalnego nr 3'), false);
  assert.equal(isResultTitle(''), false);
  assert.equal(isResultTitle(null), false);
});

// =============================================================== numbers

test('parsePLN: dot-thousands and space-thousands', () => {
  assert.equal(parsePLN('60.000'), 60000);
  assert.equal(parsePLN('91 000'), 91000);
  assert.equal(parsePLN('12 000'), 12000);
  assert.equal(parsePLN(''), null);
  assert.equal(parsePLN(null), null);
});

// =========================================================== real fixtures

const WEGIELSZTYN_TITLE =
  'Ogłoszenie prztargu nieograniczonego na sprzedaż lokalu mieszkalnego nr 4 poł. w miejscowości Węgielsztyn 37 gm. Węgorzewo (III przetarg)';
const WEGIELSZTYN_BODY =
  'Burmistrz Węgorzewa ogłasza trzeci przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 4 poł. w miejscowości Węgielsztyn 37. Poprzednie przetargi zostały przeprowadzone 17.08.2017 r. i 24.10.2017 r. Przedmiot przetargu: Oznaczenie nieruchomości wg ewidencji: wieś Węgielsztyn 37, lokal nr 4, Nr geod działki: 418, Powierzchnia działki: 5900 m2 Nr księgi wieczystej: OL2G/00016321/3, Opis: Lokal mieszkalny o pow. 109,03 m2 (wejście wraz z klatką schodową na parterze, na piętrze: korytarz, 3 pokoje, kuchnia, łazienka, 2 składziki ), wraz z przynależną piwnicą o pow. 12,02 m2. Cena wywoławcza: 60.000,-zł w tym za lokal i pomieszczenia przynależne – 42.253,-zł i za udział w gruncie 17.747,-zł, Wysokość wadium: 10.000,-zł Warunki przetargu: Przetarg odbędzie się dnia 19 stycznia 2018 r. o godz. 11:00 w Urzędzie Miejskim w Węgorzewie, w pokoju nr 19';
const WEGIELSZTYN_FULL = `${WEGIELSZTYN_TITLE}\n${WEGIELSZTYN_BODY}`;

const SZTYNORT_TITLE =
  'Burmistrz Węgorzewa ogłasza przetarg ustny nieograniczony na sprzedaż nieruchomości, stanowiącej lokal mieszkalny nr 6 poł. we wsi Sztynort Mały 3, gm. Węgorzewo.';
const SZTYNORT_BODY =
  'Burmistrz Węgorzewa ogłasza przetarg ustny nieograniczony na sprzedaż nieruchomości, stanowiącej lokal mieszkalny nr 6 poł. we wsi Sztynort Mały 3, gm. Węgorzewo. Oznaczenie nieruchomości wg ewidencji oraz księgi wieczystej: Położenie nieruchomości: obręb geod. Pniewo, wieś Sztynort Mały, gmina Węgorzewo. lokal mieszkalny nr 6 posiadający księgę wieczystą nr OL2G/00021854/0, poł. w budynku wielolokalowym nr 3. Opis nieruchomości: Nieruchomość przeznaczona do zbycia składa się z: lokalu mieszkalnego nr 6 o pow. 24,40 m2, poł. na poddaszu ( budynek parterowy). Cena wywoławcza za nieruchomość: 23.600,00 zł w tym: lokal – 12.220,00 zł Wysokość wadium: 4.000,- zł Warunki przetargu i warunki sprzedaży: Przetarg odbędzie się w dniu 29 marca 2022 r. godz. 10:00, Urząd Miejski w Węgorzewie, pok. Nr 19.';
const SZTYNORT_FULL = `${SZTYNORT_TITLE}\n${SZTYNORT_BODY}`;

const ARMIIKRAJOWEJ_TITLE =
  'Burmistrz Węgorzewa ogłasza pierwszy przetarg ustny nieograniczony na sprzedaż nieruchomości, stanowiącej lokal mieszkalny nr 3 poł. w Węgorzewie przy ul. Armii Krajowej 42, Gmina Węgorzewo.';
const ARMIIKRAJOWEJ_BODY =
  'Burmistrz Węgorzewa ogłasza pierwszy przetarg ustny nieograniczony na sprzedaż nieruchomości, stanowiącej lokal mieszkalny nr 3 poł. w Węgorzewie przy ul. Armii Krajowej 42, Gmina Węgorzewo. Oznaczenie nieruchomości wg ewidencji oraz księgi wieczystej: Lokal mieszkalny nr 3, poł w budynku wielolokalowym nr 42, usytuowany na działce gruntu nr ewid. 80/2 o pow. 0,0242 ha – KW nr OL2G/00013094/1 w Węgorzewie przy ul. Armii Krajowej 42, obręb 0001 m Węgorzewo. Opis nieruchomości: Lokal mieszkalny nr 3 o pow. 14,30m2, położony na poddaszu składający się z pokoju, kuchni, korytarza i wc. Cena wywoławcza za nieruchomość: 39.400,00 zł w tym lokal – 35.300,00zł ,udział w działce nr 80/2– 4.100,00 zł, (VAT zw.) Wysokość wadium: 3.940,00 zł Warunki przetargu i warunki sprzedaży: Przetarg odbędzie się w dniu 06.03.2025r. o godz. 10:00 w Urzędzie Miejskim w Węgorzewie, sala narad II piętro.';
const ARMIIKRAJOWEJ_FULL = `${ARMIIKRAJOWEJ_TITLE}\n${ARMIIKRAJOWEJ_BODY}`;

const PNIEWO_TITLE =
  'Ogłoszenie Burmistrza Węgorzewa o przetargu ustnym nieograniczonym na sprzedaż nieruchomości, stanowiącej lokal mieszkalny nr 4 poł. we wsi Pniewo 5, gm. Węgorzewo.';
const PNIEWO_BODY =
  'Burmistrz Węgorzewa ogłasza przetarg ustny nieograniczony na sprzedaż nieruchomości, stanowiącej lokal mieszkalny nr 4 poł. we wsi Pniewo 5, gm. Węgorzewo. Oznaczenie nieruchomości wg ewidencji oraz księgi wieczystej: Położenie nieruchomości: obręb geod. Pniewo, wieś Pniewo, gmina Węgorzewo. Lokal mieszkalny nr 4 posiadający księgę wieczystą OL2G/00021369/9, położony w budynku mieszkalnym wielorodzinnym nr 5 w miejscowości Pniewo, gm. Węgorzewo. Opis nieruchomości: Nieruchomość przeznaczona do zbycia składa się z: lokalu mieszkalnego nr 4 o powierzchni użytkowej 33,20 m2, poł. na poddaszu składający się z jednego pokoju, kuchni, łazienki oraz przedpokoju. Cena wywoławcza za nieruchomość: 40.300,00 zł netto w tym: za lokal – 21.400,00 zł Wysokość wadium: 4.030,00 zł Warunki przetargu i warunki sprzedaży: Przetarg odbędzie się w dniu 26 czerwca 2025 r. godz. 1000, Urząd Miejski w Węgorzewie, sala narad - II piętro.';
const PNIEWO_FULL = `${PNIEWO_TITLE}\n${PNIEWO_BODY}`;

const KAL_TITLE = 'Burmistrz Węgorzewa ogłasza przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego';
const KAL_BODY = bodyTextFromDetail(DETAIL_HTML_KAL);
const KAL_FULL = `${KAL_TITLE}\n${KAL_BODY}`;

const SLOWACKIEGO_TITLE =
  'Burmistrz Węgorzewa ogłasza pierwszy ustny przetarg nieograniczony na sprzedaż działek nr: 636/36, 636/38, 636/40 położonych w Węgorzewie przy ul. Słowackiego, obręb 0002 Węgorzewo2, gmina Węgorzewo-miasto, stanowiących własność Gminy Węgorzewo';
// Includes the REAL warunki-zabudowy clause verbatim ("... budowie budynku
// garażowego ...") — an EARLIER, trimmed version of this fixture omitted it
// and thereby masked a real bug: classify-kind.js's GARAGE_RE fires on ANY
// "garaż" mention (checked before LAND_RE), so this land parcel's own
// zoning text misclassified it as kind 'garaz' instead of 'grunt' — see
// parse.js's resolveKind() for the fix. Caught live 2026-07-11 via the
// `node crawl.js` smoke test, not by this test file (which is exactly why
// the clause is now included instead of trimmed away).
const SLOWACKIEGO_BODY =
  'Burmistrz Węgorzewa ogłasza pierwszy ustny przetarg nieograniczony na sprzedaż niżej wymienionych działek położonych w Węgorzewie przy ul. Słowackiego, obręb 0002 Węgorzewo2, gmina Węgorzewo, stanowiących własność Gminy Węgorzewo: Opis nieruchomości: Działka nr: 636/36 Powierzchnia: 0,0023ha Użytek: PsV Numer księgi wieczystej: OL2G/00008976/0 Nieruchomość gruntowa niezabudowana. Dojazd do zbywanej działki zapewniony jest istniejącym zjazdem z drogi publicznej gminnej nr 128599N od strony ul. Słowackiego (działka nr 543/1) następnie przez działkę nr 636/34. Przeznaczenie nieruchomości: Przedmiotowy teren nie jest objęty obowiązującym miejscowym planem zagospodarowania przestrzennego, objęty jest natomiast obowiązującą decyzją o warunkach zabudowy nr 61/2025 z dnia 16.05.2025r. znak: PL.6730.54.2025 dla inwestycji polegającej na budowie budynku garażowego murowanego w zabudowie szeregowej. Obciążenia i zobowiązania: Przedmiotowe działki wolne są od obciążeń i zobowiązań. Cena wywoławcza nieruchomości: 12 000, 00 zł (słownie: dwanaście tysięcy zł) – każda działka. Wysokość wadium: 1 200,00zł (każda działka) Miejsce i termin przetargu: Przetarg ustny nieograniczony odbędzie się w siedzibie Urzędu Miejskiego w Węgorzewie, ul. Zamkowa 3 w sali narad – II piętro w dniu 9 lipca 2026r. godz. 10 00 .';
const SLOWACKIEGO_FULL = `${SLOWACKIEGO_TITLE}\n${SLOWACKIEGO_BODY}`;

const LEASE_TITLE =
  '2021-03-19 Przetarg ustny ograniczony do mieszkańców i właścicieli lokali w budynku poł. w Węgorzewie przy ul. Władysława Stefana Reymonta 4 na dzierżawę działki z przeznaczeniem na cele ogrodowe';

const PNIEWO_RESULT_BODY =
  'Informacja o wyniku pierwszego przetargu ustnego nieograniczonego na zbycie lokalu mieszkalnego nr 4 o pow. 33,20m2, poł. w miejscowości Pniewo 5, obręb geod. 0017 Pniewo. Na podstawie § 12 Rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu i trybu przeprowadzenia przetargów oraz rokowań na zbycie nieruchomości (j. t. Dz. U. z 2021r. poz. 2213), uprzejmie informuję, że pierwszy przetarg ustny nieograniczony na zbycie lokalu mieszkalnego nr 4 o powierzchni użytkowej 33,20 m2, składający się z jednego pokoju, kuchni, łazienki oraz przedpokoju poł. na poddaszu w budynku mieszkalnym wielorodzinnym nr 5 w miejscowości Pniewo, gm. Węgorzewo, związany z lokalem nr 4 udział 1/4 części w elementach wspólnych budynku odbył się w dniu 26.06.2025r. o godz. 10:00 w siedzibie Urzędu Miejskiego w Węgorzewie w sali narad - II piętro i zakończył się wynikiem pozytywnym. liczba osób dopuszczonych do uczestnictwa w przetargu – 2 liczba osób niedopuszczonych do przetargu – 0 cena wywoławcza nieruchomości – 40.300,00 zł najwyższa cena osiągnięta w przetargu: 40.703,00 zł nabywca nieruchomości – Szymon Bagiński';

// This page's <div class="tresc"> body (unlike Pniewo's) does NOT restate
// the building number "42" anywhere — it only appears in the page's <h2>/
// <title> heading, OUTSIDE the tresc div (confirmed live: raw HTML has
// "...ul. Armii Krajowej 42, obręb geod. 0001 Węgorzewo." at the h2/title,
// then the tresc body's own street mention drops the "42" entirely — "...ul.
// Armii Krajowej, obręb 01 Węgorzewo..."). crawl.js's fetchResultText joins
// `${entry.title}\n${body}` (entry.title = the BOARD-LIST title, which DOES
// carry "Armii Krajowej 42" as captured below) before ever calling
// parseResultDoc, so the real pipeline sees the building number even though
// the tresc body alone does not — this fixture reproduces that exact join.
const ARMIIKRAJOWEJ_RESULT_TITLE =
  'Informacja o wyniku pierwszego przetargu ustnego nieograniczonego na zbycie lokalu mieszkalnego nr 3 o pow. 14,30m2, poł. w Węgorzewie przy ul. Armii Krajowej 42, obręb geod. 0001 Węgorzewo.';
const ARMIIKRAJOWEJ_RESULT_BODY =
  'Na podstawie § 12 Rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu i trybu przeprowadzenia przetargów oraz rokowań na zbycie nieruchomości (j. t. Dz. U. z 2021r. poz. 2213), uprzejmie informuję, że pierwszy przetarg ustny nieograniczony na zbycie lokalu mieszkalnego nr 3 o pow. 14,30m2, poł. w Węgorzewie przy ul. Armii Krajowej, obręb 01 Węgorzewo, gmina Węgorzewo, odbył się w dniu 06.03.2025r. o godz. 10:00 w siedzibie Urzędu Miejskiego w Węgorzewie w sali narad - II piętro i zakończył się wynikiem pozytywnym. liczba osób dopuszczonych do uczestnictwa w przetargu – 3 liczba osób niedopuszczonych do przetargu – 0 cena wywoławcza nieruchomości – 39.400,00 zł najwyższa cena osiągnięta w przetargu: 70.132,00 zł nabywca nieruchomości – Zbigniew Suchodolski';
const ARMIIKRAJOWEJ_RESULT_FULL = `${ARMIIKRAJOWEJ_RESULT_TITLE}\n${ARMIIKRAJOWEJ_RESULT_BODY}`;

const KAL_LAND_RESULT_BODY =
  'Na podstawie § 12 Rozporządzenia Rady Ministrów z dnia 14 września 2004r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości (j. t. Dz. U. z 2021r. poz. 2213.) uprzejmie informuję, że piąty przetarg ustny nieograniczony na zbycie nieruchomości niezabudowanej oznaczonej w ewidencji gruntów i budynków numerem 132/45 o powierzchni 0,1850ha, położonej w obrębie Kal, gmina Węgorzewo, opisanej w KW OL2G/00010658/2 odbył się w dniu 23.10.2024r. w siedzibie Urzędu Miejskiego w Węgorzewie w pokoju nr 19- parter i zakończył się wynikiem negatywnym. cena wywoławcza nieruchomości: 140 000,00zł + 23%VAT najwyższa cena osiągnięta w przetargu: - 0 liczba osób dopuszczonych do uczestnictwa w przetargu – 0 liczba osób niedopuszczonych do przetargu – 0 nabywca nieruchomości – nie wyłoniono nabywcy';

// ------------------------------------------------------------- round

test('roundFromText: "(III przetarg)" parenthetical Roman form (Węgielsztyn, real fixture)', () => {
  assert.equal(roundFromText(WEGIELSZTYN_FULL), 3);
});
test('roundFromText: "pierwszy" word form (Armii Krajowej, real fixture)', () => {
  assert.equal(roundFromText(ARMIIKRAJOWEJ_FULL), 1);
});
test('roundFromText: unstated on a first-time announcement -> null (Sztynort/Pniewo, real fixtures)', () => {
  assert.equal(roundFromText(SZTYNORT_FULL), null);
  assert.equal(roundFromText(PNIEWO_FULL), null);
});
test('roundFromText: "piąty" (5th) on a result body reaching round VI territory (Kal land, real fixture)', () => {
  assert.equal(roundFromText(KAL_LAND_RESULT_BODY), 5);
});
test('roundFromText: genitive "pierwszego" inside "informacji o wyniku pierwszego przetargu" (real fixture)', () => {
  assert.equal(roundFromText(PNIEWO_RESULT_BODY), 1);
});

// ------------------------------------------------------------- date

test('auctionDateFromBody: word-date "dnia D MONTH YYYY r." (Węgielsztyn, real fixture)', () => {
  assert.equal(auctionDateFromBody(WEGIELSZTYN_FULL), '2018-01-19');
});
test('auctionDateFromBody: word-date "w dniu D MONTH YYYY r." (Sztynort, real fixture)', () => {
  assert.equal(auctionDateFromBody(SZTYNORT_FULL), '2022-03-29');
});
test('auctionDateFromBody: numeric "w dniu DD.MM.YYYYr." (Armii Krajowej, real fixture)', () => {
  assert.equal(auctionDateFromBody(ARMIIKRAJOWEJ_FULL), '2025-03-06');
});
test('auctionDateFromBody: time BEFORE the "dnia" date, "o godz. 10:00 dnia DD.MM.YYYY r." (Kal, real fixture)', () => {
  assert.equal(auctionDateFromBody(KAL_FULL), '2020-02-07');
});
test('auctionDateFromBody: long venue text between "odbędzie się" and the date (Słowackiego, real fixture)', () => {
  assert.equal(auctionDateFromBody(SLOWACKIEGO_FULL), '2026-07-09');
});
test('auctionDateFromBody: past-tense "odbył się w dniu" on a result body (real fixtures)', () => {
  assert.equal(auctionDateFromBody(PNIEWO_RESULT_BODY), '2025-06-26');
  assert.equal(auctionDateFromBody(KAL_LAND_RESULT_BODY), '2024-10-23');
});
test('auctionDateFromBody: null for empty/no date', () => {
  assert.equal(auctionDateFromBody(''), null);
  assert.equal(auctionDateFromBody('brak daty'), null);
});

// ------------------------------------------------------------- area

test('areaFromBody: "o pow. X m2" with no "użytkowej" (Węgielsztyn, real fixture)', () => {
  assert.equal(areaFromBody(WEGIELSZTYN_FULL), 109.03);
});
test('areaFromBody: "o pow. X m2" no space before unit (Armii Krajowej, real fixture "14,30m2")', () => {
  assert.equal(areaFromBody(ARMIIKRAJOWEJ_FULL), 14.30);
});
test('areaFromBody: "o powierzchni użytkowej X m2" (Pniewo, real fixture)', () => {
  assert.equal(areaFromBody(PNIEWO_FULL), 33.20);
});
test('areaFromBody: "o powierzchni użytkowej X m²" real ² glyph (Kal, real fixture)', () => {
  assert.equal(areaFromBody(KAL_FULL), 89.20);
});
test('areaFromBody: also reads a COMMERCIAL (niemieszkalny) unit area (real captured title)', () => {
  const t =
    'Informacja o wyniku trzeciego przetargu ustnego nieograniczonego na zbycie lokalu niemieszkalnego nr 5 o pow. 97,43 m2, poł. w Radziejach przy ul. Węgorzewskiej 25, obręb geod. 0020 Radzieje, gmina Węgorzewo.';
  assert.equal(areaFromBody(t), 97.43);
});
test('areaFromBody: null when absent', () => {
  assert.equal(areaFromBody('brak powierzchni'), null);
  assert.equal(areaFromBody(''), null);
});

// ------------------------------------------------------------- starting price

test('startingPriceFromBody: dot-thousands, dash-for-grosze "60.000,-zł" (Węgielsztyn, real fixture)', () => {
  assert.equal(startingPriceFromBody(WEGIELSZTYN_FULL), 60000);
});
test('startingPriceFromBody: dot-thousands ",00 zł" via "Cena wywoławcza za nieruchomość:" label (Sztynort, real fixture)', () => {
  assert.equal(startingPriceFromBody(SZTYNORT_FULL), 23600);
});
test('startingPriceFromBody: (Armii Krajowej / Pniewo, real fixtures)', () => {
  assert.equal(startingPriceFromBody(ARMIIKRAJOWEJ_FULL), 39400);
  assert.equal(startingPriceFromBody(PNIEWO_FULL), 40300);
});
test('startingPriceFromBody: space-thousands "IV. Cena wywoławcza nieruchomości: 91 000,00 zł" (Kal, real fixture)', () => {
  assert.equal(startingPriceFromBody(KAL_FULL), 91000);
});
test('startingPriceFromBody: stray space BEFORE the comma, "12 000, 00 zł" (Słowackiego, real fixture typo)', () => {
  assert.equal(startingPriceFromBody(SLOWACKIEGO_FULL), 12000);
});
test('startingPriceFromBody: null when absent', () => {
  assert.equal(startingPriceFromBody('brak ceny'), null);
  assert.equal(startingPriceFromBody(''), null);
});

// ------------------------------------------------------------- achieved price / outcome

test('achievedPriceFromBody: sold, "najwyższa cena osiągnięta w przetargu: X zł" (real fixtures)', () => {
  assert.equal(achievedPriceFromBody(PNIEWO_RESULT_BODY), 40703);
  assert.equal(achievedPriceFromBody(ARMIIKRAJOWEJ_RESULT_BODY), 70132);
});
test('achievedPriceFromBody: unsold, "- 0" has no "zł" at all -> null (Kal land, real fixture)', () => {
  assert.equal(achievedPriceFromBody(KAL_LAND_RESULT_BODY), null);
});
test('isNegativeOutcome: true only on the unsold fixture', () => {
  assert.equal(isNegativeOutcome(KAL_LAND_RESULT_BODY), true);
  assert.equal(isNegativeOutcome(PNIEWO_RESULT_BODY), false);
  assert.equal(isNegativeOutcome(ARMIIKRAJOWEJ_RESULT_BODY), false);
});

// ------------------------------------------------------------- address

test('addressFromText: pattern A, town street form (Armii Krajowej, real fixture)', () => {
  const a = addressFromText(ARMIIKRAJOWEJ_FULL);
  assert.deepEqual(a, { apt: '3', street: 'Armii Krajowej', building: '42' });
});
test('addressFromText: pattern B, "we wsi VILLAGE BLDG" (Sztynort Mały, real fixture)', () => {
  const a = addressFromText(SZTYNORT_FULL);
  assert.deepEqual(a, { apt: '6', street: 'Sztynort Mały', building: '3' });
});
test('addressFromText: pattern B, "we wsi VILLAGE BLDG" (Pniewo, real fixture)', () => {
  const a = addressFromText(PNIEWO_FULL);
  assert.deepEqual(a, { apt: '4', street: 'Pniewo', building: '5' });
});
test('addressFromText: pattern B, "w miejscowości VILLAGE BLDG" (Węgielsztyn, real fixture)', () => {
  const a = addressFromText(WEGIELSZTYN_FULL);
  assert.deepEqual(a, { apt: '4', street: 'Węgielsztyn', building: '37' });
});
test('addressFromText: pattern C, body-only fallback, title has NO address at all (Kal, real fixture)', () => {
  const a = addressFromText(KAL_FULL);
  assert.ok(a, 'address must be non-null');
  assert.equal(a.apt, '2');
  assert.equal(a.building, '38');
  assert.match(a.street, /Kal/i); // locative "Kalu" kept as-is (no PL-declension guessing)
});
test('addressFromText: null when no address anywhere', () => {
  assert.equal(addressFromText('brak adresu'), null);
  assert.equal(addressFromText(''), null);
});
test('addressFromText: COMMERCIAL unit ("lokal niemieszkalny", real fixture, Węgorzewska 25/5) — a bare "mieszkaln" stem misses this', () => {
  const a = addressFromText(
    'Burmistrz Węgorzewa ogłasza pierwszy przetarg ustny nieograniczony na sprzedaż nieruchomości, stanowiącej lokal niemieszkalny nr 5 poł. w Radziejach przy ul. Węgorzewskiej 25, Gmina Węgorzewo.',
  );
  assert.deepEqual(a, { apt: '5', street: 'Węgorzewskiej', building: '25' });
});

// ------------------------------------------------------------- land

test('landParcelFromText + landAreaFromText + obrebFromText: Słowackiego multi-parcel notice (real fixture, first parcel only)', () => {
  assert.equal(landParcelFromText(SLOWACKIEGO_FULL), '636/36');
  assert.equal(landAreaFromText(SLOWACKIEGO_FULL), 23); // 0,0023 ha -> 23 m2
  assert.match(obrebFromText(SLOWACKIEGO_FULL), /Węgorzewo/i);
});
test('landParcelFromText + landAreaFromText: Kal result (real fixture, "numerem X" no "działka" word nearby)', () => {
  assert.equal(landParcelFromText(KAL_LAND_RESULT_BODY), '132/45');
  assert.equal(landAreaFromText(KAL_LAND_RESULT_BODY), 1850); // 0,1850 ha -> 1850 m2
});
test('landParcelFromText: null when absent', () => {
  assert.equal(landParcelFromText('brak działki'), null);
});

// REAL BUG caught by the live `node crawl.js` smoke test (2026-07-11, not by
// a unit test — see resolveKind() in parse.js): core/classify-kind.js's
// GARAGE_RE fires on ANY "garaż" mention and is checked BEFORE LAND_RE, so
// an undeveloped PARCEL whose own zoning text mentions a garage building
// misclassifies as kind 'garaz' (address-keyed) instead of 'grunt'
// (parcel-keyed) and silently fails to parse (no address exists for a bare
// działka). Two independent real notices hit this on bip.wegorzewo.pl.
test('parseAnnouncement: land whose OWN zoning text says "budowie budynku garażowego" still classifies grunt, not garaz (real fixture, Słowackiego)', () => {
  const rec = parseAnnouncement(SLOWACKIEGO_FULL, 'x');
  assert.ok(rec, 'must not be null — this exact shape used to fail');
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.dzialka_nr, '636/36');
});
test('parseAnnouncement: land explicitly "przeznaczonych pod zabudowę garażową" (real fixture, ul. Teatralnej garage plots)', () => {
  const title =
    'Burmistrz Węgorzewa ogłasza drugi przetarg ustny nieograniczony na sprzedaż działek gruntu nr ewid. 1100 o pow. 23m2 oraz nr ewid. 1101 o pow. 23m2, poł w obrębie geod 0001 miasta Węgorzewo, użytek ŁV, przeznaczonych pod zabudowę garażową, położonych w Węgorzewie przy ul Teatralnej.';
  const rec = parseAnnouncement(title, 'x');
  assert.ok(rec, 'must not be null');
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.dzialka_nr, '1100');
  assert.equal(rec.round, 2); // "drugi"
});

// ===================================================== parseAnnouncement

test('parseAnnouncement: PENDING flat (real fixture, Armii Krajowej 42/3) -> active listing', () => {
  const rec = parseAnnouncement(ARMIIKRAJOWEJ_FULL, 'https://bip.wegorzewo.pl/wiadomosci/3/wiadomosc/801593/x');
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address.key, 'armii krajowej|42|3');
  assert.equal(rec.address.street, 'Armii Krajowej');
  assert.equal(rec.address.building, '42');
  assert.equal(rec.address.apt, '3');
  assert.equal(rec.area_m2, 14.30);
  assert.equal(rec.starting_price_pln, 39400);
  assert.equal(rec.auction_date, '2025-03-06');
  assert.equal(rec.round, 1);
  assert.equal(rec.detail_url, 'https://bip.wegorzewo.pl/wiadomosci/3/wiadomosc/801593/x');
});

test('parseAnnouncement: PENDING flat, body-only address, village in locative case (real fixture, Kal 38/2)', () => {
  const rec = parseAnnouncement(KAL_FULL, 'https://bip.wegorzewo.pl/wiadomosci/3/wiadomosc/501783/x');
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address.building, '38');
  assert.equal(rec.address.apt, '2');
  assert.equal(rec.area_m2, 89.20);
  assert.equal(rec.starting_price_pln, 91000);
  assert.equal(rec.auction_date, '2020-02-07');
});

test('parseAnnouncement: PENDING land, multi-parcel notice (real fixture, Słowackiego) -> kind grunt, first parcel', () => {
  const rec = parseAnnouncement(SLOWACKIEGO_FULL, 'https://bip.wegorzewo.pl/wiadomosci/3/wiadomosc/886596/x');
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.dzialka_nr, '636/36');
  assert.equal(rec.area_m2, 23);
  assert.equal(rec.starting_price_pln, 12000);
  assert.equal(rec.auction_date, '2026-07-09');
  assert.equal(rec.round, 1);
});

test('parseAnnouncement: LEASE (dzierżawa) title never reaches parseAnnouncement — crawl.js gates on isSaleAuctionTitle first', () => {
  // Asserted at the gate directly (mirrors the real crawl.js flow: the
  // lease title is filtered out BEFORE any detail fetch, so
  // parseAnnouncement is never even called on it).
  assert.equal(isSaleAuctionTitle(LEASE_TITLE), false);
});

test('parseAnnouncement: returns null when neither an address nor a parcel can be found', () => {
  assert.equal(parseAnnouncement('Burmistrz Węgorzewa ogłasza przetarg ustny nieograniczony na sprzedaż', 'x'), null);
  assert.equal(parseAnnouncement('', 'x'), null);
});

// ======================================================== parseResultDoc

test('parseResultDoc: flat SOLD (real fixture, Pniewo 5/4 — 40 300 -> 40 703 zł)', () => {
  const [r] = parseResultDoc(
    PNIEWO_RESULT_BODY,
    null,
    'https://bip.wegorzewo.pl/wiadomosci/14619/wiadomosc/830000/x',
  );
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'pniewo|5|4');
  assert.equal(r.area_m2, 33.20);
  assert.equal(r.starting_price_pln, 40300);
  assert.equal(r.final_price_pln, 40703);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2025-06-26');
  assert.equal(r.source_url, 'https://bip.wegorzewo.pl/wiadomosci/14619/wiadomosc/830000/x');
});

test('parseResultDoc: flat SOLD (real fixture, Armii Krajowej 42/3 — 39 400 -> 70 132 zł; building number only in the title, see fixture comment)', () => {
  const [r] = parseResultDoc(
    ARMIIKRAJOWEJ_RESULT_FULL,
    null,
    'https://bip.wegorzewo.pl/wiadomosci/14619/wiadomosc/809365/x',
  );
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'armii krajowej|42|3');
  assert.equal(r.starting_price_pln, 39400);
  assert.equal(r.final_price_pln, 70132);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2025-03-06');
});

test('parseResultDoc: land UNSOLD, round V, "nie wyłoniono nabywcy" (real fixture, Kal dz. 132/45)', () => {
  const [r] = parseResultDoc(KAL_LAND_RESULT_BODY, null, 'https://bip.wegorzewo.pl/wiadomosci/14619/wiadomosc/783284/x');
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '132/45');
  assert.equal(r.area_m2, 1850);
  assert.equal(r.starting_price_pln, 140000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.round, 5);
  assert.equal(r.auction_date, '2024-10-23');
});

test('parseResultDoc: uses fallbackDate only when the body itself has no date', () => {
  const [r] = parseResultDoc(
    'lokal mieszkalny nr 1 poł. w Węgorzewie przy ul. Testowej 5 cena wywoławcza nieruchomości – 1000 zł nabywca nieruchomości – Jan Kowalski',
    '2025-01-01',
    'x',
  );
  assert.equal(r.auction_date, '2025-01-01');
});

test('parseResultDoc: returns [] for empty/unparseable text', () => {
  assert.deepEqual(parseResultDoc('', null, 'x'), []);
  assert.deepEqual(parseResultDoc(null, null, 'x'), []);
  assert.deepEqual(parseResultDoc('no useful content here', null, 'x'), []);
});
