// Wschowa parser tests. Fixtures are faithful copies of REAL board-row field
// values + REAL extracted result-attachment text, fetched live from
// bip.gminawschowa.pl (verified 2026-07-11). The WYNIK fixtures were captured
// by running the actual core docText/pdfText extractors against the live
// attachment URLs (not paraphrased), exactly like parse-naklo-nad-notecia.test.js.
//
//   Lp10  ul. Dworcowej 1/5   — PENDING flat, status=1 row whose Wynik is
//         genuinely "Brak wyniku" even though the auction date (2025-08-18)
//         is long past — this board leaves some rows unresolved; treated as
//         still-pending, matches the spike's Dworcowa 1/5 figures exactly
//         (60.88 m², 144 000 zł)
//   Lp28  ul. Bocznej 1a/15   — SOLD (Pozytywny), fetched DOCX
//         (INFORMACJA_Boczna.docx via core/doc-text.js): 130 000 zł wywoławcza
//         -> 135 000 zł osiągnięta, explicit "wynikiem pozytywnym"
//   Lp71  ul. Kilińskiego 11/4 — SOLD (Pozytywny), fetched born-digital PDF
//         (INFORMACJA_O_WYNIKACH_PRZETARGU-_Kilinskiego_11.pdf via
//         core/pdf-text.js): 11 100 zł -> 11 220 zł. This document NEVER
//         states "wynikiem pozytywnym" at all — outcome is inferred from the
//         achieved price + nabywca, same convention as braniewo/
//         gorzow-wielkopolski.
//   Lp44  ul. Bocznej 1a/15   — UNSOLD (Negatywny), built straight from the
//         board row (no fetch — same no-fetch-negative convention as
//         miedzyrzecz): 150 000 zł wywoławcza, no achieved price.
//   Lp1   ul. Cisowa/Jodłowa/Czereśniowa — LAND, status=0 (Ogłoszone), the
//         ONLY live ACTIVE row as of 2026-07-11: a 9-parcel bundle inside one
//         "Cena wywoławcza" cell. Embedded below as the exact raw HTML row
//         (byte-for-byte, incl. its real embedded newlines between lots).
//   Lp2   ul. Łaziennej 10 — LEASE (najem lokalu użytkowego), not a sale;
//         must never reach listings/land/results.
//
// See spike: spikes/lubuskie/powiat-wschowski/wschowa.md

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parsePLN,
  startingPriceFromText,
  achievedPriceFromText,
  flatAreaFromText,
  landAreaM2FromText,
  parcelNoFromText,
  roundFromText,
  extractFlatAddress,
  isLeaseRow,
  isFlatSaleRow,
  splitNumberedItems,
  recordsFromActiveRow,
  parseResultDoc,
  buildNegativeResultText,
  dateOnly,
} from '../src/cities/wschowa/parse.js';
import { parseBoardPage, boardUrl } from '../src/cities/wschowa/crawl.js';

// --------------------------------------------------------------- real fixtures

// Lp10, status=1 (Rozstrzygnięte), page 1 — matches the spike's Dworcowa 1/5
// figures exactly (60.88 m², 144 000 zł).
const DWORCOWA_1_5_PENDING = {
  detailUrl: 'https://bip.gminawschowa.pl/przetargi/29/114/160725_2/',
  dotyczyText:
    'Sprzedaż lokalu mieszkalnego Nr 5 położonego przy ul. Dworcowej  1 we Wschowie o powierzchni 60,88 m2,(składający się z: dwóch pokoi, kuchni, przedpokoju, korytarza, łazienki z WC, pomieszczenia gospodarczego) wraz z udziałem w wysokości 6088/27090 w działkach gruntu Nr 1895/4 o powierzchni 1327 m2, i Nr 1895/3 o powierzchni 16 m2',
  cenaText: '144 000,00 zł',
  wynikText: 'Brak wyniku',
  announcedDate: '2025-07-16',
  auctionDateRaw: '2025-08-18 00:00:00',
  attachments: [
    {
      url: 'https://bip.gminawschowa.pl/system/pobierz.php?plik=Ogloszenie_o_przetargu_lokal_ul._Dworcowa_1_295.doc&id=b55b2c9bdeff1409f092e73276b6d99a',
      filename: 'Ogloszenie_o_przetargu_lokal_ul._Dworcowa_1_295.doc',
    },
  ],
};

// Lp2, status=1, page 1 — a rental (najem lokalu użytkowego), never a sale.
const LAZIENNA_10_LEASE = {
  detailUrl: 'https://bip.gminawschowa.pl/przetargi/29/130/1_/',
  dotyczyText: 'Przetarg ustny nieograniczony na najem lokalu użytkowego położonego przy ul. Łaziennej 10 we Wschowie',
  cenaText: '5,00 zł netto za m2 powierzchni użytkowej lokalu',
  wynikText: 'Pozytywny',
  announcedDate: '2026-04-16',
  auctionDateRaw: '2026-05-19 09:00:00',
  attachments: [],
};

// Lp44, status=1, page 5 — Negatywny, single clean flat, no bundling.
const BOCZNA_1A_15_NEGATIVE_ROW = {
  detailUrl:
    'https://bip.gminawschowa.pl/przetargi/29/82/O_G_L_O_S_Z_E_N_I_E_Burmistrz_Miasta_i_Gminy_Wschowa_Oglasza_II_przetarg_ustny_nieograniczony_ul__Bo/',
  dotyczyText:
    'Sprzedaż spółdzielczego własnościowego prawa do lokalu mieszkalnego Nr 15 o powierzchni 27,98 m2 położonego we Wschowie przy ul. Bocznej 1a.',
  cenaText: '150000,00 zł',
  wynikText: 'Negatywny',
  announcedDate: '2024-07-30',
  auctionDateRaw: '2024-10-04 09:00:00',
  attachments: [],
};

// Lp28, status=1, page 3 — Pozytywny; real DOCX text extracted live via
// core/doc-text.js from
// https://bip.gminawschowa.pl/system/pobierz.php?plik=INFORMACJA_Boczna.docx&id=c3115a63a9e35fea6f450ea804b188fa
const BOCZNA_1A_15_WYNIK_DOCX =
  'Wschowa, dnia 17 kwietnia 2025 rokuNa podstawie § 12 Rozporządzenia Rady Ministrów z dnia 14 września 2004 r.w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości ( Dz. U. z 2021 r. poz. 2213 ), podaję do publicznej wiadomości:Informację o wyniku przetargu na zbycie nieruchomości lokalowej Gminy Wschowa, który odbył się w dniu 15 kwietnia 2025 r. w siedzibie Urzędu Miasta i Gminy Wschowa ul. Rynek 1, 67-400 Wschowa: 1.IV przetarg ustny nieograniczony na sprzedaż spółdzielczego własnościowego prawa do lokalu mieszkalnego nr 15 o powierzchni użytkowej 27,98 m2, położonego przy ul. Bocznej 1a we Wschowie.Księga wieczysta dla nieruchomości: ZG1W/00028052/3. Cena wywoławcza: 130 000,00 złotych - Przetarg zakończył się wynikiem pozytywnym.- najwyższa cena osiągnięta w przetargu – 135 000,00 zł.,- liczba osób dopuszczonych do uczestnictwa w przetargu – 3,- 3 osoby przybyły na przetarg ,- liczba osób niedopuszczonych do przetargu – 0,- nabywcy lokalu mieszkalnego – Dorota Barbara Kidziak, Mariusz Kidziak,- przetarg zakończył się wynikiem pozytywnym. Zastępca Burmistrza Miasta i Gminy Wschowa /-/ Marek Kraśny';

// Lp71, status=1, page 8 — Pozytywny; real born-digital-PDF text extracted
// live via core/pdf-text.js from
// https://bip.gminawschowa.pl/system/pobierz.php?plik=INFORMACJA_O_WYNIKACH_PRZETARGU-_Kilinskiego_11.pdf&id=2b6303a8878a6dff54d9f4c17788b834
// NOTE: this document never states "wynikiem pozytywnym" — outcome must be
// inferred from the achieved price ("Cena osiągnięta w przetargu") + nabywca.
const KILINSKIEGO_11_4_WYNIK_PDF = `                                   Wschowa, dnia 12 kwietnia 2023 roku


                     INFORMACJA
                O WYNIKACH PRZETARGU



            W dniu: 12 kwietnia 2023 roku o godz.9,00 w sali posiedzeń
Urzędu Miasta i Gminy Wschowa odbył się: II-gi         przetarg ustny
ograniczony       na    sprzedaż    lokalu    mieszkalnego     nr    4
o powierzchni użytkowej 9,98 m2 położonego na II piętrze budynku
przy ul. Kilińskiego 11 we Wschowie. Budynek usytuowany na działce:
1482 o powierzchni 0,0321 ha, księga wieczysta dla nieruchomości:
ZG1W/0001442/9.

Wadium– w wysokości 1 110,00 zł. zostało uiszczone w terminie
przez: 1 oferenta.
Cena wywoławcza: 11 100,00 złotych
Cena osiągnięta w przetargu: 11 220,00 złotych

Nabywca: Urszula, Marek Szczepaniak`;

// Lp1, status=0 (Ogłoszone) — the ONLY live ACTIVE row as of 2026-07-11.
// Exact raw HTML, byte-for-byte (incl. the cell's real embedded newlines
// between the 9 bundled parcels), from
// https://bip.gminawschowa.pl/przetargi/29/status/0/
const CISOWA_LAND_BUNDLE_ROW_HTML = `<tr class="odd">
			<td class="td-no"><span>Lp: </span>1</td>
			<td class="td-date-1"><div>Data ogłoszenia</div>2026-04-27 00:00:00</td>
			<td class="td-date-2"><div>Data i godzina przetargu</div>2026-07-15 00:00:00</td>
			<td class="td-title-1"><div>Dotyczy</div><a href="https://bip.gminawschowa.pl/przetargi/29/132/6_2FBN_2F2026__2880_2FBN_29/" title="Przejdź do szczegółów informacji"> II przetarg ustny nieograniczony na sprzedaż nieruchomości stanowiącej mienie gminne położonej we Wschowie przy ul. Cisowej, Jodłowej, Czereśniowej</a></td>
			<td class="td-title-2"><div>Cena wywoławcza</div>1) Działka 138/1 o powierzchni 0,0773 ha.
Cena wywoławcza nieruchomości: 124.000,00 zł brutto (100.813,01 zł netto)
2) Działka 138/4 o powierzchni 0,0842 ha.
Cena wywoławcza nieruchomości: 135.000,00 zł brutto (109.756,10 zł netto)
3) Działka 138/7 o powierzchni 0,0,0842 ha.
Cena wywoławcza nieruchomości: 135.000,00 zł brutto (109.756,10 zł netto)
4) Działka 138/8 o powierzchni 0,0842 ha.
Cena wywoławcza nieruchomości: 135.000,00 zł brutto (109.756,10 zł netto)
5) Działka 138/5 o powierzchni 0,0842 ha.
Cena wywoławcza nieruchomości: 135.000,00 zł brutto (109.756,10 zł netto)
6) Działka 138/2 o powierzchni 0,0771 ha.
Cena wywoławcza nieruchomości: 123.000,00 zł brutto (100.000,00 zł netto)
7) Działka 138/6 o powierzchni 0,0844 ha.
Cena wywoławcza nieruchomości: 135.000,00 zł brutto (109.756,10 zł netto)
8) Działka 138/9 o powierzchni 0,0844 ha.
Cena wywoławcza nieruchomości: 135.000,00 zł brutto (109.756,10 zł netto)
9) Działka 138/3 o powierzchni 0,0771 ha.
Cena wywoławcza nieruchomości: 123.000,00 zł brutto (100.000,00 zł netto)</td>
			<td class="td-title-1"><div>Wynik</div>Negatywny</td>
			<td class="td-attachments-1"><div>Załączniki</div>	<!-- .......................... start : lista uproszczona zalacznikow .......................... -->
	<ul class="attachments">
			<li><a href="https://bip.gminawschowa.pl/system/pobierz.php?plik=Ogloszenie__-__II_przetarg__28Cisowa-Jodlowa_Czeresniowa_29.pdf&amp;id=f1a77de19df342fec0da98c552670cee" title="Pobierz załącznik"><img src="https://bip.gminawschowa.pl/ikona.php?plik=Ogloszenie__-__II_przetarg__28Cisowa-Jodlowa_Czeresniowa_29.pdf" alt="Ikona (PDF)" /></a></li>
				<li><a href="https://bip.gminawschowa.pl/system/pobierz.php?plik=WYCIAG__II_przetarg__28Wschowa_ul._Cisowa-Jodlowa-Czeresniowa_29.pdf&amp;id=bb19707d545448240bc176f8dd803090" title="Pobierz załącznik"><img src="https://bip.gminawschowa.pl/ikona.php?plik=WYCIAG__II_przetarg__28Wschowa_ul._Cisowa-Jodlowa-Czeresniowa_29.pdf" alt="Ikona (PDF)" /></a></li>
				<li><a href="https://bip.gminawschowa.pl/system/pobierz.php?plik=WYNIK_PRZETARGU_15.07.2026.pdf&amp;id=4eefb505057c038eb8546ba73fd8de96" title="Pobierz załącznik"><img src="https://bip.gminawschowa.pl/ikona.php?plik=WYNIK_PRZETARGU_15.07.2026.pdf" alt="Ikona (PDF)" /></a></li>
			</ul>
	<!-- .......................... koniec : lista uproszczona zalacznikow .......................... -->
	</td>
		</tr>`;

// ------------------------------------------------------------------- unit funcs

test('parsePLN: dot-thousands, space-thousands, and unseparated amounts', () => {
  assert.equal(parsePLN('70.343,00'), 70343);
  assert.equal(parsePLN('144 000,00'), 144000);
  assert.equal(parsePLN('150000,00'), 150000); // no thousands separator at all (real live data)
  assert.equal(parsePLN('10000'), 10000); // no separator, no grosze
  assert.equal(parsePLN('brak'), null);
});

test('startingPriceFromText / achievedPriceFromText: labeled, dash, bare, "złotych"', () => {
  assert.equal(startingPriceFromText('Cena wywoławcza: 11 100,00 złotych'), 11100);
  assert.equal(startingPriceFromText('Cena wywoławcza nieruchomości: 124.000,00 zł brutto (100.813,01 zł netto)'), 124000);
  assert.equal(startingPriceFromText('… przy ul. Rynek we Wschowie - 70.343,00 zł + VAT (zwolniony).'), 70343);
  assert.equal(startingPriceFromText('144 000,00 zł'), 144000);
  assert.equal(achievedPriceFromText('najwyższa cena osiągnięta w przetargu – 135 000,00 zł.'), 135000);
  assert.equal(achievedPriceFromText('Cena osiągnięta w przetargu: 11 220,00 złotych'), 11220);
  assert.equal(achievedPriceFromText('brak wpłaty'), null);
});

test('flatAreaFromText / landAreaM2FromText', () => {
  assert.equal(flatAreaFromText('o powierzchni 60,88 m2'), 60.88);
  assert.equal(flatAreaFromText('o powierzchni użytkowej 27,98 m2,'), 27.98);
  assert.equal(landAreaM2FromText('Działka 138/1 o powierzchni 0,0773 ha.'), 773);
  assert.equal(landAreaM2FromText('brak'), null);
});

test('parcelNoFromText', () => {
  assert.equal(parcelNoFromText('1) Działka 138/1 o powierzchni 0,0773 ha.'), '138/1');
  assert.equal(parcelNoFromText('Działka nr 1895/4'), '1895/4');
});

test('roundFromText: roman numeral anchored on "<numeral> przetarg", traps rejected', () => {
  assert.equal(roundFromText('IV przetarg ustny nieograniczony na sprzedaż'), 4);
  assert.equal(roundFromText('odbył się: II-gi         przetarg ustny ograniczony'), 2); // PDF layout spacing + "-gi" ordinal suffix
  assert.equal(roundFromText('I przetarg ustny ograniczony do mieszkańców wspólnoty'), 1);
  assert.equal(roundFromText('DO OGŁOSZENIA BURMISTRZA MIASTA I GMINY WSCHOWA IV PRZETARGU USTNEGO NIEOGRANICZONEGO'), 4);
  // traps: a bare roman numeral NOT immediately followed by "przetarg" must not match
  assert.equal(roundFromText('składający się z pokoju położonym na II piętrze przy ul. Kilińskiego nr 11'), null);
  assert.equal(roundFromText('II WYCIĄG z dnia 12.03.2025 r. DO OGŁOSZENIA'), null);
  assert.equal(roundFromText('Sprzedaż lokalu mieszkalnego Nr 5 położonego przy ul. Dworcowej 1'), null);
});

test('extractFlatAddress: direct "ul. X N", "ul. X nr N", budynek-nr fallback, multi-word street', () => {
  assert.equal(
    extractFlatAddress('Sprzedaż lokalu mieszkalnego Nr 5 położonego przy ul. Dworcowej  1 we Wschowie o powierzchni 60,88 m2'),
    'Dworcowej 1/5',
  );
  assert.equal(
    extractFlatAddress(
      'sprzedaż spółdzielczego własnościowego prawa do lokalu mieszkalnego nr 15 o powierzchni użytkowej 27,98 m2, położonego przy ul. Bocznej 1a we Wschowie',
    ),
    'Bocznej 1A/15',
  );
  assert.equal(
    extractFlatAddress(
      'Lokal mieszkalny nr 4 o powierzchni 9,98 m2,składający się z pokoju położonym na II piętrze przy ul.  Kilińskiego nr  11  we Wschowie',
    ),
    'Kilińskiego 11/4',
  );
  // "budynku nr N przy ul. <street with no number>" fallback (Rynek/Kostki phrasing)
  assert.equal(
    extractFlatAddress(
      '1.Lokal mieszkalny nr 1 o powierzchni 49,95 m2, położony na parterze budynku nr 9 przy ul. Rynek we Wschowie - 70.343,00 zł + VAT (zwolniony).',
    ),
    'Rynek 9/1',
  );
  assert.equal(
    extractFlatAddress(
      '2. Lokal mieszkalny nr 2 o powierzchni 66,16 m2, położony na parterze budynku nr 32A przy ul. Księdza Kostki we Wschowie - 83.921,00 zł',
    ),
    'Księdza Kostki 32A/2',
  );
  // no explicit "lokal … nr N" -> unkeyable, returns null (a real bundled-item
  // shape seen live: the Kilińskiego 3 item in a 2020 3-lot bundle never
  // states a lokal number)
  assert.equal(
    extractFlatAddress('Lokal mieszkalny o powierzchni 55,45 m2, położony przy ul. Kilińskiego nr  3 we Wschowie - 88.418,00 zł'),
    null,
  );
});

test('extractFlatAddress: a wynik document preamble naming the AUCTION VENUE must not win over the flat address', () => {
  // The real Boczna 1a/15 wynik DOCX names "ul. Rynek 1" (Urząd Miasta i
  // Gminy Wschowa's address) BEFORE ever mentioning the flat itself.
  assert.equal(extractFlatAddress(BOCZNA_1A_15_WYNIK_DOCX), 'Bocznej 1A/15');
});

test('isLeaseRow / isFlatSaleRow', () => {
  assert.equal(isLeaseRow(LAZIENNA_10_LEASE.dotyczyText), true);
  assert.equal(isFlatSaleRow(LAZIENNA_10_LEASE.dotyczyText), false);
  assert.equal(isFlatSaleRow(DWORCOWA_1_5_PENDING.dotyczyText), true);
  assert.equal(isFlatSaleRow('II przetarg … sprzedaż nieruchomości … Cisowej, Jodłowej, Czereśniowej'), false); // land, not a flat
});

test('splitNumberedItems: bundled cell vs single-item cell', () => {
  const items = splitNumberedItems(CISOWA_LAND_BUNDLE_ROW_HTML.match(/<td class="td-title-2">[\s\S]*?<\/td>/)[0]
    .replace(/^<td class="td-title-2"><div>[\s\S]*?<\/div>/, '')
    .replace(/<\/td>$/, ''));
  assert.equal(items.length, 9);
  assert.equal(parcelNoFromText(items[0].text), '138/1');
  assert.equal(parcelNoFromText(items[8].text), '138/3');
  assert.deepEqual(splitNumberedItems('144 000,00 zł'), [{ n: 1, text: '144 000,00 zł' }]);
  assert.deepEqual(splitNumberedItems(''), []);
});

// ------------------------------------------------------------- active listings

test('recordsFromActiveRow: pending flat (Dworcowa 1/5) — no bundling, address from Dotyczy, price bare in Cena cell', () => {
  const { listings, land } = recordsFromActiveRow(DWORCOWA_1_5_PENDING);
  assert.equal(land.length, 0);
  assert.equal(listings.length, 1);
  assert.deepEqual(listings[0], {
    kind: 'mieszkalny',
    address_raw: 'Dworcowej 1/5',
    address: {
      street: 'Dworcowej',
      street_norm: 'dworcowej',
      building: '1',
      apt: '5',
      key: 'dworcowej|1|5',
      warning: null,
    },
    area_m2: 60.88,
    starting_price_pln: 144000, // matches the spike's Dworcowa 1/5 figure exactly
    auction_date: '2025-08-18',
    round: null,
    detail_url: DWORCOWA_1_5_PENDING.detailUrl,
    source_url: DWORCOWA_1_5_PENDING.attachments[0].url,
  });
});

test('recordsFromActiveRow: land bundle (Cisowa/Jodłowa/Czereśniowa, 9 parcels in one cell) via REAL raw HTML row', () => {
  const rows = parseBoardPage(`<table><tbody>${CISOWA_LAND_BUNDLE_ROW_HTML}</tbody></table>`);
  assert.equal(rows.length, 1);
  const { listings, land } = recordsFromActiveRow(rows[0]);
  assert.equal(listings.length, 0);
  assert.equal(land.length, 9);
  assert.deepEqual(land[0], {
    kind: 'grunt',
    dzialka_nr: '138/1',
    obreb: null,
    area_m2: 773,
    address_raw: null,
    starting_price_pln: 124000,
    auction_date: '2026-07-15',
    round: 2, // "II przetarg" in Dotyczy, applied to every lot in the row
    detail_url: 'https://bip.gminawschowa.pl/przetargi/29/132/6_2FBN_2F2026__2880_2FBN_29/',
    source_url: 'https://bip.gminawschowa.pl/system/pobierz.php?plik=Ogloszenie__-__II_przetarg__28Cisowa-Jodlowa_Czeresniowa_29.pdf&id=f1a77de19df342fec0da98c552670cee',
  });
  assert.deepEqual(
    land.map((l) => l.dzialka_nr),
    ['138/1', '138/4', '138/7', '138/8', '138/5', '138/2', '138/6', '138/9', '138/3'],
  );
  // every lot shares the row's own round/date (a bundled cell doesn't restate them per-item)
  assert.ok(land.every((l) => l.round === 2 && l.auction_date === '2026-07-15'));
});

test('recordsFromActiveRow: lease-skip (Łaziennej 10, najem lokalu użytkowego) never yields a listing or land record', () => {
  const { listings, land } = recordsFromActiveRow(LAZIENNA_10_LEASE);
  assert.equal(listings.length, 0);
  assert.equal(land.length, 0);
});

// ----------------------------------------------------------------- result records

test('parseResultDoc: SOLD via DOCX with explicit "wynikiem pozytywnym" (Boczna 1a/15)', () => {
  const out = parseResultDoc(
    BOCZNA_1A_15_WYNIK_DOCX,
    '2025-04-15',
    'https://bip.gminawschowa.pl/system/pobierz.php?plik=INFORMACJA_Boczna.docx&id=c3115a63a9e35fea6f450ea804b188fa',
  );
  assert.equal(out.length, 1);
  assert.deepEqual(out[0], {
    auction_date: '2025-04-15',
    source_pdf: 'https://bip.gminawschowa.pl/system/pobierz.php?plik=INFORMACJA_Boczna.docx&id=c3115a63a9e35fea6f450ea804b188fa',
    kind: 'mieszkalny',
    address_raw: 'Bocznej 1A/15',
    address: {
      street: 'Bocznej',
      street_norm: 'bocznej',
      building: '1A',
      apt: '15',
      key: 'bocznej|1A|15',
      warning: null,
    },
    round: 4,
    starting_price_pln: 130000,
    final_price_pln: 135000,
    outcome: 'sold',
    unsold_reason: null,
    area_m2: 27.98,
    notes: [],
  });
});

test('parseResultDoc: SOLD via PDF with NO explicit outcome sentence — inferred from achieved price (Kilińskiego 11/4)', () => {
  const out = parseResultDoc(
    KILINSKIEGO_11_4_WYNIK_PDF,
    '2023-04-12',
    'https://bip.gminawschowa.pl/system/pobierz.php?plik=INFORMACJA_O_WYNIKACH_PRZETARGU-_Kilinskiego_11.pdf&id=2b6303a8878a6dff54d9f4c17788b834',
  );
  assert.equal(out.length, 1);
  assert.deepEqual(out[0], {
    auction_date: '2023-04-12',
    source_pdf: 'https://bip.gminawschowa.pl/system/pobierz.php?plik=INFORMACJA_O_WYNIKACH_PRZETARGU-_Kilinskiego_11.pdf&id=2b6303a8878a6dff54d9f4c17788b834',
    kind: 'mieszkalny',
    address_raw: 'Kilińskiego 11/4',
    address: {
      street: 'Kilińskiego',
      street_norm: 'kilinskiego',
      building: '11',
      apt: '4',
      key: 'kilinskiego|11|4',
      warning: null,
    },
    round: 2, // "II-gi … przetarg"
    starting_price_pln: 11100,
    final_price_pln: 11220,
    outcome: 'sold',
    unsold_reason: null,
    area_m2: 9.98,
    notes: [],
  });
});

test('parseResultDoc: UNSOLD, no-fetch — built straight from a Negatywny board row (Boczna 1a/15)', () => {
  const text = buildNegativeResultText(BOCZNA_1A_15_NEGATIVE_ROW);
  assert.match(text, /wynikiem negatywnym/i);
  const out = parseResultDoc(text, dateOnly(BOCZNA_1A_15_NEGATIVE_ROW.auctionDateRaw), BOCZNA_1A_15_NEGATIVE_ROW.detailUrl);
  assert.equal(out.length, 1);
  assert.deepEqual(out[0], {
    auction_date: '2024-10-04',
    source_pdf: BOCZNA_1A_15_NEGATIVE_ROW.detailUrl,
    kind: 'mieszkalny',
    address_raw: 'Bocznej 1A/15',
    address: {
      street: 'Bocznej',
      street_norm: 'bocznej',
      building: '1A',
      apt: '15',
      key: 'bocznej|1A|15',
      warning: null,
    },
    round: null,
    starting_price_pln: 150000, // real unseparated "150000,00" — regression guard for the parsePLN fix
    final_price_pln: null,
    outcome: 'unsold',
    unsold_reason: 'unknown',
    area_m2: 27.98,
    notes: [],
  });
});

test('parseResultDoc: land and non-flat text never produce a record (flats-only scope)', () => {
  assert.deepEqual(parseResultDoc('II przetarg … sprzedaż nieruchomości … Cisowej, Jodłowej, Czereśniowej — wynikiem negatywnym'), []);
  assert.deepEqual(parseResultDoc(''), []);
  assert.deepEqual(parseResultDoc(null), []);
});

// ----------------------------------------------------------- board + pagination

test('boardUrl: page 1 omits the page segment, page >1 inserts it before /status/', () => {
  assert.equal(boardUrl(0, 1), 'https://bip.gminawschowa.pl/przetargi/29/status/0/');
  assert.equal(boardUrl(1, 1), 'https://bip.gminawschowa.pl/przetargi/29/status/1/');
  assert.equal(boardUrl(1, 3), 'https://bip.gminawschowa.pl/przetargi/29/3/status/1/');
  assert.equal(boardUrl(1, 12), 'https://bip.gminawschowa.pl/przetargi/29/12/status/1/');
});

test('parseBoardPage: real raw HTML row — dates, Dotyczy/Wynik label stripped, attachments', () => {
  const rows = parseBoardPage(`<table><tbody>${CISOWA_LAND_BUNDLE_ROW_HTML}</tbody></table>`);
  assert.equal(rows.length, 1);
  const row = rows[0];
  assert.equal(row.detailUrl, 'https://bip.gminawschowa.pl/przetargi/29/132/6_2FBN_2F2026__2880_2FBN_29/');
  assert.equal(row.announcedDate, '2026-04-27 00:00:00');
  assert.equal(row.auctionDateRaw, '2026-07-15 00:00:00');
  assert.match(row.dotyczyText, /Cisowej, Jodłowej, Czereśniowej/);
  // the "Wynik" label itself must NOT leak into the cell value
  assert.equal(row.wynikText, 'Negatywny');
  assert.equal(row.attachments.length, 3);
  assert.equal(row.attachments[2].filename, 'WYNIK_PRZETARGU_15.07.2026.pdf');
  // the bundled cell's real embedded newlines must survive board parsing
  assert.equal(splitNumberedItems(row.cenaText).length, 9);
});
