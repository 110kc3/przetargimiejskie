// Międzyrzecz parser tests. Fixtures are REAL text/HTML fetched live from
// bip.miedzyrzecz.pl (verified 2026-07-10):
//
//   Kursko 28a/1     — result DOCX (born-digital), SOLD 76.000 -> 76.800 zł
//   Mieszka I 88B/5  — result PDF (SCANNED, OCR'd via tesseract --psm 1 pol),
//                      SOLD 115.000 -> 116.150 zł (the spike's "115 000 zł"
//                      was the STARTING price; OCR gives the real achieved
//                      figure — see parse.js file header)
//   Marcinkowskiego 28/7 — resolved-board list ROW text, UNSOLD (Negatywny);
//                      never fetched as a document (see buildNegativeResultText)
//   Kęszyca Leśna 74C/8  — resolved-board list ROW text, UNSOLD, village
//                      address with no "ul." (klatka + "budynku nr" form)
//   Jagielnik 25/3   — resolved-board list ROW text, bare "Miejscowość NN"
//                      address form (no "ul.", no "budynku nr")
//   dz. 675/115+675/125  — ACTIVE-board list ROW, LAND (not a flat) — must be
//                      excluded from both crawlActive and crawlResultDocs
//
// Raw single-row HTML fixtures (ACTIVE_ROW_HTML, RESOLVED_ROW_HTML) are
// byte-faithful copies of one <tr> from the live board fetch, used to
// groundtruth crawl.js's parseBoardPage() independently of the object-literal
// BoardRow fixtures used everywhere else in this file.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parsePLN,
  areaFromText,
  startingPriceFromText,
  achievedPriceFromText,
  isPositiveOutcome,
  isNegativeOutcome,
  isFlatSaleRow,
  isResultNotice,
  extractLokalAddress,
  dateOnly,
  parseActiveRow,
  buildNegativeResultText,
  parseResultDoc,
} from '../src/cities/miedzyrzecz/parse.js';
import { boardUrl, parseBoardPage } from '../src/cities/miedzyrzecz/crawl.js';

// --------------------------------------------------------------- real fixtures

// https://bip.miedzyrzecz.pl/system/pobierz.php?plik=Informacja_o_wyniku_przetargu.docx&id=9b49f5e78d06b9430e31361d95f26462
const KURSKO_WYNIK_TEXT = `BURMISTRZ MIĘDZYRZECZA
RYNEK 1
66-300 MIĘDZYRZECZ
Międzyrzecz, dnia 11 października 2021 r.
WGM.6840.31.2016
INFORMACJA o wyniku przetargu
Zgodnie z § 12 Rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości (t.j. Dz. U. z 2014 r. poz. 1490) Burmistrz Międzyrzecza podaje do publicznej wiadomości informację o wyniku przetargu:
Data i miejsce oraz rodzaj przeprowadzonego przetargu:
28 września 2021 r., godz. 10:00, Sala Ślubów Urzędu Miejskiego w Międzyrzeczu, ul. Rynek 1 (budynek Ratusza, parter), pierwszy przetarg ustny nieograniczony.
Oznaczenie nieruchomości będącej przedmiotem przetargu według katastru nieruchomości i księgi wieczystej;
Lokal mieszkalny nr 1 o położony w budynku nr 28A w Kursku, obręb geodezyjny 0008 Kursko o pow. 66,86 m2, dla którego Sąd Rejonowy Wydział Ksiąg Wieczystych w Międzyrzeczu prowadzi księgę wieczystą nr GW1M/00045293/7.
Liczba osób dopuszczonych oraz niedopuszczonych do uczestniczenia w przetargu
Liczba osób dopuszczonych do uczestniczenia w przetargu: 1,
Liczba osób niedopuszczonych do uczestniczenia w przetargu: 0.
Cena wywoławcza nieruchomości oraz najwyższa cena osiągnięta w przetargu
Cena wywoławcza: 76.000,00 zł,
Cena osiągnięta w przetargu: 76.800,00 zł
Imię, nazwisko albo nazwa lub firma osoby ustalonej jako nabywca nieruchomości:
Przetarg zakończył się wynikiem pozytywnym. Nabywca: Jerzy Różycki.
Z up. BURMISTRZA
mgr Tomasz Markiewicz
Zastępca Burmistrza`;

// https://bip.miedzyrzecz.pl/system/pobierz.php?plik=INFORMACJA_O_WYNIKU_PRZETARGU_-_MIESZKA_I_88.B.5.pdf&id=fa3c2ed0ee6d637ae66edf47526a4b15
// (SCANNED — Canon iR-ADV, no text layer; this is tesseract -l pol --psm 1 output verbatim, including its OCR slips)
const MIESZKA_WYNIK_TEXT = `Urząd Miejski w Międzyrzeczu

ul. Rynek 1 66-300 Międzyrzecz

tel (195) 742 69 30 - 31 fax (95! 742 69 60
NIP 596-000-65-53

Międzyrzecz 15.10.2025 r.

Gmina
Międzyrzecz

WGM.6840.11.2025

INFORMACJA o wyniku przetargu

Zgodnie z $12 Rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu
i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości
(t.j. Dz. U.z 2021r. poz. 2213) Burmistrz Międzyrzecza podaje do publicznej wiadomości
informację o wyniku przetargu:
1) Data i miejsce oraz rodzaj przeprowadzonego przetargu:
06 października 2025 r., godz. 11:00, Sala Ślubów Urzędu Miejskiego w Międzyrzeczu,
ul. Rynek 1 (budynek Ratusza, parter), pierwszy przetarg ustny nieograniczony.
2) Oznaczenie nieruchomości będącej przedmiotem przetargu według katastru
nieruchomości i księgi wieczystej;
Lokal mieszkalny nr 5 położony przy ul. Mieszka I 88B w Międzyrzeczu wraz ze sprzedażą
udziału w nieruchomości wspólnej stanowiącej grunt — działka nr 668/5, obręb 0002
Międzyrzecz oraz części budynku i urządzenia, które nie służą wyłącznie do użytku
właścicieli wynoszący 7/100 dla której Sąd Rejonowy w Międzyrzeczu prowadzi księgę
wieczystą nr GW1M/00022169/2.
3) Liczba osób dopuszczonych oraz niedopuszczonych do uczestnictwa w przetargu:
a) Liczba osób dopuszczonych do uczestnictwa w przetargu: 1,
b) Liczba osób niedopuszczonych do uczestnictwa w przetargu: 0.
4) Cena wywoławcza nieruchomości oraz najwyższa cena osiągnięta w przetargu:
a) Cena wywoławcza: 115.000,00 zł,
b) Cena osiągnięta w przetargu: 116.150,00 zł.
5) Imię i nazwisko osoby albo nazwa firmy ustalonej jako nabywca nieruchomości:
Przetarg odbył się i zakończył wynikiem pozytywnym.
Nabywca nieruchomości: Elżbieta Sobczyk.

Z up. BURMISTRZĄ`;

// Resolved board, row 1 (status=1, page 1) — "Dotyczy"/"Cena wywoławcza"/"Wynik" cell text.
const MARCINKOWSKI_ROW = {
  detailUrl: 'https://bip.miedzyrzecz.pl/przetargi/0/366/360_/',
  dotyczyText:
    'Sprzedaży lokalu mieszkalnego  nr 7 o pow. użytkowej 51,99 m² położony na poddaszu budynku ' +
    'mieszkalnego przy ul. Marcinkowskiego 28 w Międzyrzeczu wraz ze sprzedażą udział wynoszącego ' +
    '170/1000 w nieruchomości wspólnej stanowiący grunt - 337/1 obręb 0001 Międzyrzecz oraz części ' +
    'budynku i urządzenia, które nie służą wyłącznie do użytku właścicieli.',
  cenaText:
    'Cena wywoławcza Cena wywoławcza: 158.000,00 zł\nw tym:\ncena lokalu: 154.676,48 zł\n' +
    'cena gruntu w udziale 170/1000:  3.323,52 zł',
  wynikText: 'Wynik Negatywny',
  announcedDate: '2026-03-18 08:58:00',
  auctionDateRaw: '2026-05-13 12:00:00',
  attachments: [
    {
      url: 'https://bip.miedzyrzecz.pl/system/pobierz.php?plik=ogloszenie_o_przetargu_Marcinkowskiego.pdf&id=88c75db4fcf6c97307cdf48033c4ca80',
      filename: 'ogloszenie_o_przetargu_Marcinkowskiego.pdf',
    },
    {
      url: 'https://bip.miedzyrzecz.pl/system/pobierz.php?plik=informacja_o_wyniku_przetargu_Marcinkowskiego_28.pdf&id=bde5f4e3afa61fe89cf3b24d3be98dd8',
      filename: 'informacja_o_wyniku_przetargu_Marcinkowskiego_28.pdf',
    },
  ],
};

// Resolved board, row 2 — rural "klatka" + "budynku nr" address (no "ul.").
const KESZYCA_ROW = {
  detailUrl: 'https://bip.miedzyrzecz.pl/przetargi/0/365/359_/',
  dotyczyText:
    'Sprzedaży lokalu mieszkalnego nr 8 o pow. użytkowej 53,93 m², położonego w Kęszycy Leśnej w ' +
    'klatce C budynku nr 74 wraz ze sprzedażą udziałów wynoszących 232/10000 w nieruchomości wspólnej ' +
    'stanowiącej grunt - działka nr 195/33 obręb 0010 Kęszyca oraz części budynku i urządzenia, które ' +
    'nie służą wyłącznie do użytku właścicieli.',
  cenaText:
    'Cena wywoławcza Cena wywoławcza: 148.000,00 zł\nw tym:\ncena lokalu: 141.306,08 zł\n' +
    'cena gruntu w udziale 232/10000:  6.693,92 zł',
  wynikText: 'Wynik Negatywny',
  announcedDate: '2026-03-18 08:42:00',
  auctionDateRaw: '2026-05-13 11:00:00',
  attachments: [],
};

// Resolved board, row 3 — bare "Miejscowość NN" address (no "ul.", no "budynku nr").
const JAGIELNIK_ROW = {
  detailUrl: 'https://bip.miedzyrzecz.pl/przetargi/0/364/358_/',
  dotyczyText:
    'Sprzedaży lokalu mieszkalnego nr 3 o pow. użytkowej 29,62 m² położonego na poddaszu budynku ' +
    'mieszkalnego Jagielnik 25/4 wraz ze sprzedażą udziałów wynoszących 9/100 w nieruchomości wspólnej ' +
    'stanowiącej grunt - działka nr 319/20 obręb 0004 Święty Wojciech oraz części budynku i urządzenia, ' +
    'które nie służą wyłącznie do użytku właścicieli.',
  cenaText:
    'Cena wywoławcza Cena wywoławcza: 76.000,00 zł \nw tym:\ncena lokalu: 59.786,67 zł\n' +
    'cena gruntu w udziale 9/100: 16.213,33 zł',
  wynikText: 'Wynik Negatywny',
  announcedDate: '2026-03-18 08:10:00',
  auctionDateRaw: '2026-05-13 10:00:00',
  attachments: [],
};

// Active board, row 1 (status=0) — LAND, not a flat; must never reach crawlActive's listings.
const LAND_ROW = {
  detailUrl: 'https://bip.miedzyrzecz.pl/przetargi/0/367/361_/',
  dotyczyText:
    'Sprzedaż nieruchomości gruntowej w skład której wchodzą działki oznaczone ewidencyjnie nr ' +
    '675/115 oraz 675/125 obręb geodezyjny 0001 Międzyrzecz o łącznej pow. 0,5415 ha.',
  cenaText:
    'Cena wywoławcza Cena wywoławcza:   877.230,00 zł\nw tym:\ncena gruntu netto: 713.195,12 zł\n' +
    'podatek VAT (23%): 164.034,88 zł',
  wynikText: 'Wynik Brak wyniku',
  announcedDate: '2026-07-08 11:02:00',
  auctionDateRaw: '2026-09-15 10:00:00',
  attachments: [
    {
      url: 'https://bip.miedzyrzecz.pl/system/pobierz.php?plik=ogloszenie.pdf&id=e7981c77491475c7e6b3c22ae71efef1',
      filename: 'ogloszenie.pdf',
    },
  ],
};

// Raw <tr> HTML, active board (status=0), row 1 — byte-faithful (whitespace/entities intact).
const ACTIVE_ROW_HTML = `<tr class="odd">
			<td class="td-no"><span>Lp: </span>1</td>
			<td class="td-date-1"><div>Data ogłoszenia</div>2026-07-08 11:02:00</td>
			<td class="td-date-2"><div>Data i godzina przetargu</div>2026-09-15 10:00:00</td>
			<td class="td-title-1"><div>Dotyczy</div><a href="https://bip.miedzyrzecz.pl/przetargi/0/367/361_/" title="Przejdź do szczegółów informacji">Sprzedaż nieruchomości gruntowej w skład której wchodzą działki oznaczone ewidencyjnie nr 675/115 oraz 675/125 obręb geodezyjny 0001 Międzyrzecz o łącznej pow. 0,5415 ha.</a></td>
			<td class="td-title-2"><div>Cena wywoławcza</div>Cena wywoławcza:   877.230,00 zł
w tym:
cena gruntu netto: 713.195,12 zł
podatek VAT (23%): 164.034,88 zł</td>
			<td class="td-title-1"><div>Wynik</div>Brak wyniku</td>
			<td class="td-attachments-1"><div>Załączniki</div>	<!-- start -->
	<ul class="attachments">
			<li><a href="https://bip.miedzyrzecz.pl/system/pobierz.php?plik=ogloszenie.pdf&amp;id=e7981c77491475c7e6b3c22ae71efef1" title="Pobierz załącznik"><img src="https://bip.miedzyrzecz.pl/ikona.php?plik=ogloszenie.pdf" alt="Ikona (PDF)" /></a></li>
			</ul>
	<!-- koniec -->
	</td>
		</tr>`;

// Raw <tr> HTML, resolved board (status=1), row 1 (Marcinkowskiego 28/7) — two attachments, Negatywny.
const RESOLVED_ROW_HTML = `<tr class="odd">
			<td class="td-no"><span>Lp: </span>1</td>
			<td class="td-date-1"><div>Data ogłoszenia</div>2026-03-18 08:58:00</td>
			<td class="td-date-2"><div>Data i godzina przetargu</div>2026-05-13 12:00:00</td>
			<td class="td-title-1"><div>Dotyczy</div><a href="https://bip.miedzyrzecz.pl/przetargi/0/366/360_/" title="Przejdź do szczegółów informacji">Sprzedaży lokalu mieszkalnego  nr 7 o pow. użytkowej 51,99 m² położony na poddaszu budynku mieszkalnego przy ul. Marcinkowskiego 28 w Międzyrzeczu wraz ze sprzedażą udział wynoszącego 170/1000 w nieruchomości wspólnej stanowiący grunt - 337/1 obręb 0001 Międzyrzecz oraz części budynku i urządzenia, które nie służą wyłącznie do użytku właścicieli.</a></td>
			<td class="td-title-2"><div>Cena wywoławcza</div>Cena wywoławcza: 158.000,00 zł
w tym:
cena lokalu: 154.676,48 zł
cena gruntu w udziale 170/1000:  3.323,52 zł</td>
			<td class="td-title-1"><div>Wynik</div>Negatywny</td>
			<td class="td-attachments-1"><div>Załączniki</div>	<!-- start -->
	<ul class="attachments">
			<li><a href="https://bip.miedzyrzecz.pl/system/pobierz.php?plik=ogloszenie_o_przetargu_Marcinkowskiego.pdf&amp;id=88c75db4fcf6c97307cdf48033c4ca80" title="Pobierz załącznik"><img src="https://bip.miedzyrzecz.pl/ikona.php?plik=ogloszenie_o_przetargu_Marcinkowskiego.pdf" alt="Ikona (PDF)" /></a></li>
				<li><a href="https://bip.miedzyrzecz.pl/system/pobierz.php?plik=informacja_o_wyniku_przetargu_Marcinkowskiego_28.pdf&amp;id=bde5f4e3afa61fe89cf3b24d3be98dd8" title="Pobierz załącznik"><img src="https://bip.miedzyrzecz.pl/ikona.php?plik=informacja_o_wyniku_przetargu_Marcinkowskiego_28.pdf" alt="Ikona (PDF)" /></a></li>
			</ul>
	<!-- koniec -->
	</td>
		</tr>`;

// ------------------------------------------------------------------- unit funcs

test('parsePLN: dot-thousands, comma-grosze', () => {
  assert.equal(parsePLN('76.000,00'), 76000);
  assert.equal(parsePLN('877.230,00'), 877230);
  assert.equal(parsePLN('1.500.000,00'), 1500000);
  assert.equal(parsePLN('brak'), null);
});

test('areaFromText: "o pow. użytkowej X m²" (list row) and "o pow. X m2" (wynik doc)', () => {
  assert.equal(areaFromText(MARCINKOWSKI_ROW.dotyczyText), 51.99);
  assert.equal(areaFromText(KURSKO_WYNIK_TEXT), 66.86);
  assert.equal(areaFromText('no area mentioned here'), null);
});

test('startingPriceFromText: skips the repeated <div> label, finds the real value', () => {
  assert.equal(startingPriceFromText(MARCINKOWSKI_ROW.cenaText), 158000);
  assert.equal(startingPriceFromText(LAND_ROW.cenaText), 877230);
  assert.equal(startingPriceFromText(KURSKO_WYNIK_TEXT), 76000);
});

test('achievedPriceFromText: skips the section HEADING ("... cena osiągnięta w przetargu" with no value), finds the labelled value', () => {
  assert.equal(achievedPriceFromText(KURSKO_WYNIK_TEXT), 76800);
  assert.equal(achievedPriceFromText(MIESZKA_WYNIK_TEXT), 116150);
  assert.equal(achievedPriceFromText(MARCINKOWSKI_ROW.cenaText), null); // never resolved positively
});

test('isPositiveOutcome / isNegativeOutcome: doc sentence and terse list-row cell', () => {
  assert.equal(isPositiveOutcome(KURSKO_WYNIK_TEXT), true);
  assert.equal(isNegativeOutcome(KURSKO_WYNIK_TEXT), false);
  assert.equal(isPositiveOutcome(MIESZKA_WYNIK_TEXT), true);
  assert.equal(isPositiveOutcome(MARCINKOWSKI_ROW.wynikText), false);
  assert.equal(isNegativeOutcome(MARCINKOWSKI_ROW.wynikText), true);
  assert.equal(isPositiveOutcome(LAND_ROW.wynikText), false);
  assert.equal(isNegativeOutcome(LAND_ROW.wynikText), false); // "Brak wyniku" is neither
});

test('isFlatSaleRow: flats pass, land is excluded, the standard legal-basis boilerplate does not false-positive', () => {
  assert.equal(isFlatSaleRow(MARCINKOWSKI_ROW.dotyczyText), true);
  assert.equal(isFlatSaleRow(KESZYCA_ROW.dotyczyText), true);
  assert.equal(isFlatSaleRow(LAND_ROW.dotyczyText), false);
  // Every wynik doc cites "... przetargów oraz rokowań na zbycie nieruchomości"
  // as its legal basis — a bare "rokowa" substring exclusion would wrongly
  // reject this (see parse.js isFlatSaleRow doc comment).
  assert.equal(isFlatSaleRow(KURSKO_WYNIK_TEXT), true);
});

test('isResultNotice: guards the OCR-usability check in crawl.js', () => {
  assert.equal(isResultNotice(KURSKO_WYNIK_TEXT), true);
  assert.equal(isResultNotice(MIESZKA_WYNIK_TEXT), true);
  assert.equal(isResultNotice('random unrelated page'), false);
});

test('dateOnly: strips the time-of-day from the board\'s date+time column', () => {
  assert.equal(dateOnly('2026-05-13 12:00:00'), '2026-05-13');
  assert.equal(dateOnly(null), null);
});

test('extractLokalAddress: explicit "ul." form, entrance letter folded from "w klatce"', () => {
  assert.equal(extractLokalAddress(MARCINKOWSKI_ROW.dotyczyText), 'Marcinkowskiego 28/7');
  // List-row phrasing for Mieszka I 88/5 states the entrance separately
  // ("w klatce B ... ul. Mieszka I 88") — must fold to "88B" to key IDENTICALLY
  // to the doc-derived address below (ul. Mieszka I 88B, letter already inline).
  const listRowText =
    'Sprzedaży lokalu mieszkalnego nr 5 położonego w klatce B budynku przy ul. Mieszka I 88 w ' +
    'Międzyrzeczu - działka oznaczona ewidencyjnie nr 668/5 obręb 0002 Międzyrzecz.';
  assert.equal(extractLokalAddress(listRowText), 'Mieszka I 88B/5');
  assert.equal(extractLokalAddress(MIESZKA_WYNIK_TEXT), 'Mieszka I 88B/5');
});

test('extractLokalAddress: "budynku nr NN" + nearest place name (rural, no "ul.")', () => {
  // "Kęszycy Leśnej" (locative, as written) -> "Kęszyca Leśna" (nominative)
  // via the word-level locative-ending fix (ej->a, cy->ca) — same physical
  // flat's OTHER rounds use "w m. Kęszyca Leśna" (already nominative; see the
  // "same flat, two phrasings" test below), so both must key identically.
  assert.equal(extractLokalAddress(KESZYCA_ROW.dotyczyText), 'Kęszyca Leśna 74C/8');
  // Single-word locative "Kursku" is corrected via the OTHER heuristic (the
  // obręb's nominative spelling, on a 4-char prefix match) since it has no
  // "-ej"/"-cy" ending for the word-level fix to catch.
  assert.equal(extractLokalAddress(KURSKO_WYNIK_TEXT), 'Kursko 28A/1');
});

test('extractLokalAddress: same flat, two live phrasings ("w X" locative vs "w m. X" nominative) key identically', () => {
  const locative =
    'Sprzedaży lokalu mieszkalnego nr 8 położonego w Kęszycy Leśnej w klatce C budynku nr 74 - ' +
    'działka oznaczona ewidencyjnie nr 195/33 obręb 0010 Kęszyca.';
  const viaMiejscowosc =
    'Sprzedaży lokalu mieszkalnego nr 8 położonego w m. Kęszyca Leśna w klatce C budynku nr 74 - ' +
    'działka oznaczona ewidencyjnie nr 195/33, obręb 0010 Kęszyca';
  const a = extractLokalAddress(locative);
  const b = extractLokalAddress(viaMiejscowosc);
  assert.equal(a, 'Kęszyca Leśna 74C/8');
  assert.equal(a, b);
});

test('extractLokalAddress: bare "Miejscowość NN" (no "ul.", no "budynku nr")', () => {
  // The lokal nr (3) wins over the unrelated trailing "/4" in "Jagielnik 25/4".
  assert.equal(extractLokalAddress(JAGIELNIK_ROW.dotyczyText), 'Jagielnik 25/3');
});

test('extractLokalAddress: a wynik doc\'s venue address ("ul. Rynek 1", the Ratusz) never wins over the flat\'s own address', () => {
  assert.equal(extractLokalAddress(KURSKO_WYNIK_TEXT), 'Kursko 28A/1');
  assert.equal(extractLokalAddress(MIESZKA_WYNIK_TEXT), 'Mieszka I 88B/5');
});

test('extractLokalAddress: no lokal-nr anchor -> null', () => {
  assert.equal(extractLokalAddress(LAND_ROW.dotyczyText), null);
  assert.equal(extractLokalAddress(''), null);
});

// ------------------------------------------------------------------- board rows

test('parseBoardPage: active-board LAND row (real HTML) — all 7 columns extracted', () => {
  const [row] = parseBoardPage(ACTIVE_ROW_HTML);
  assert.equal(row.detailUrl, 'https://bip.miedzyrzecz.pl/przetargi/0/367/361_/');
  assert.match(row.dotyczyText, /nieruchomości gruntowej/);
  assert.match(row.cenaText, /877\.230,00 zł/);
  assert.equal(row.wynikText, 'Wynik Brak wyniku');
  assert.equal(row.announcedDate, '2026-07-08 11:02:00');
  assert.equal(row.auctionDateRaw, '2026-09-15 10:00:00');
  assert.equal(row.attachments.length, 1);
  assert.equal(row.attachments[0].filename, 'ogloszenie.pdf');
});

test('parseBoardPage: resolved-board flat row (real HTML) — Wynik is the SECOND td-title-1 cell, both attachments captured', () => {
  const [row] = parseBoardPage(RESOLVED_ROW_HTML);
  assert.match(row.dotyczyText, /Marcinkowskiego 28/);
  assert.equal(row.wynikText, 'Wynik Negatywny');
  assert.equal(row.attachments.length, 2);
  assert.equal(row.attachments[1].filename, 'informacja_o_wyniku_przetargu_Marcinkowskiego_28.pdf');
});

test('boardUrl: page 1 omits the page segment, page N inserts it before "status"', () => {
  assert.equal(boardUrl(0, 1), 'https://bip.miedzyrzecz.pl/przetargi/0/status/0/');
  assert.equal(boardUrl(1, 1), 'https://bip.miedzyrzecz.pl/przetargi/0/status/1/');
  assert.equal(boardUrl(1, 3), 'https://bip.miedzyrzecz.pl/przetargi/0/3/status/1/');
});

// ----------------------------------------------------------------- active rows

test('parseActiveRow: land row -> null (excluded, not a flat)', () => {
  assert.equal(parseActiveRow(LAND_ROW), null);
});

test('parseActiveRow: pending flat (Kęszyca Leśna, "Brak wyniku") -> active listing, zero document fetches', () => {
  const pending = { ...KESZYCA_ROW, wynikText: 'Wynik Brak wyniku' };
  const rec = parseActiveRow(pending);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address.key, 'keszyca lesna|74C|8');
  assert.equal(rec.area_m2, 53.93);
  assert.equal(rec.starting_price_pln, 148000);
  assert.equal(rec.auction_date, '2026-05-13');
  assert.equal(rec.round, null);
  assert.equal(rec.detail_url, 'https://bip.miedzyrzecz.pl/przetargi/0/365/359_/');
});

// ------------------------------------------------------------------ result docs

test('parseResultDoc: Kursko 28A/1 SOLD (born-digital DOCX, pierwszy przetarg)', () => {
  const [r] = parseResultDoc(KURSKO_WYNIK_TEXT, '2021-09-28', 'https://bip.miedzyrzecz.pl/x/kursko-wynik.docx');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'kursko|28A|1');
  assert.equal(r.address.street, 'Kursko');
  assert.equal(r.address.building, '28A');
  assert.equal(r.address.apt, '1');
  assert.equal(r.area_m2, 66.86);
  assert.equal(r.starting_price_pln, 76000);
  assert.equal(r.final_price_pln, 76800);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.unsold_reason, null);
  assert.equal(r.round, null);
  assert.equal(r.auction_date, '2021-09-28');
  assert.equal(r.source_pdf, 'https://bip.miedzyrzecz.pl/x/kursko-wynik.docx');
  assert.deepEqual(r.notes, []);
});

test('parseResultDoc: Mieszka I 88B/5 SOLD (OCR\'d scanned PDF) — achieved price ABOVE starting price, no false "below starting" note', () => {
  const [r] = parseResultDoc(MIESZKA_WYNIK_TEXT, '2025-10-06', 'https://bip.miedzyrzecz.pl/x/mieszka-wynik.pdf');
  assert.equal(r.address.key, 'mieszka i|88B|5');
  assert.equal(r.starting_price_pln, 115000);
  assert.equal(r.final_price_pln, 116150);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.auction_date, '2025-10-06');
  assert.deepEqual(r.notes, []);
});

test('parseResultDoc: Marcinkowskiego 28/7 UNSOLD (Negatywny, no document fetch — built from the list row alone)', () => {
  const text = buildNegativeResultText(MARCINKOWSKI_ROW);
  const [r] = parseResultDoc(text, dateOnly(MARCINKOWSKI_ROW.auctionDateRaw), MARCINKOWSKI_ROW.detailUrl);
  assert.equal(r.address.key, 'marcinkowskiego|28|7');
  assert.equal(r.area_m2, 51.99);
  assert.equal(r.starting_price_pln, 158000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'unknown');
  assert.equal(r.auction_date, '2026-05-13');
  assert.equal(r.source_pdf, MARCINKOWSKI_ROW.detailUrl);
});

test('parseResultDoc: Kęszyca Leśna 74C/8 UNSOLD (village address, no document fetch)', () => {
  const text = buildNegativeResultText(KESZYCA_ROW);
  const [r] = parseResultDoc(text, dateOnly(KESZYCA_ROW.auctionDateRaw), KESZYCA_ROW.detailUrl);
  assert.equal(r.address.key, 'keszyca lesna|74C|8');
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.final_price_pln, null);
});

test('parseResultDoc: land (not a flat) -> []', () => {
  const text = buildNegativeResultText({ ...LAND_ROW, wynikText: 'Negatywny' });
  assert.deepEqual(parseResultDoc(text, null, 'x'), []);
});

test('parseResultDoc: empty/pending text -> []', () => {
  assert.deepEqual(parseResultDoc('', null, 'x'), []);
  assert.deepEqual(parseResultDoc(buildNegativeResultText({ ...LAND_ROW, wynikText: 'Brak wyniku' }).replace('Przetarg zakończył się wynikiem negatywnym.', ''), null, 'x'), []);
});
