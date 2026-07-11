// Pszczyna parser tests. Fixtures are condensed-but-faithful copies of REAL
// live bip.pszczyna.pl bodies (verified 2026-07-10):
//   ann Bednarska 21/4 — flat ANNOUNCEMENT, PDF-extracted (the inline HTML
//     body is EMPTY on this doc — the modern norm, see config.js/crawl.js),
//     VIII przetarg, cena wywoławcza 47.000 zł, przetarg 09.07.2025. The body
//     states the WHOLE BUILDING's combined usable area (10 lokali, łączna
//     powierzchnia użytkowa 508,02 m2) BEFORE this flat's own area
//     (28,97 m2) — a real trap for a naive first-match area extractor.
//   ann Rynek 22/3 — flat ANNOUNCEMENT, OLD-style INLINE HTML body (2007),
//     same building-total-vs-unit-area trap (7 lokali, łączna 401,66 m2,
//     vs this flat's own 41,06 m2), cena wywoławcza 23.290,00- zł (dash-grosze
//     format), przetarg 08.11.2007, address via locative "przy Rynku 22"
//     (normalised to nominative "Rynek").
//   wynik Korfantego 27/1 — flat RESULT SOLD (structured HTML table),
//     3 dopuszczona/0 niedopuszczona, 258.000,- zł -> 273.000,- zł, nabywca
//     "BUDUJE.MY sp. z o.o. z siedzibą w Pszczynie", 28.02.2024.
//   wynik Szymanowskiego 22/5 — flat RESULT SOLD, II, 250.000,- zł ->
//     252.500,- zł, nabywca "Justyna i Szymon JENCZURA" (two individuals),
//     23.07.2025 — also exercises the compound flat-id "22/5" against a
//     THREE-number street range "Karola Szymanowskiego 20-22-24".
//   ann Braci Jędrysików — land (niezabudowana) ANNOUNCEMENT, INLINE HTML,
//     dz. 6602/65 (+ 1/4 udział w dz. 6603/65), 0,0918 ha, cena wywoławcza
//     126 850,00 zł, przetarg 25.01.2023, I.
//   wynik dr. Witolda Antesa — land RESULT SOLD, dz. 464/12 (parcel stated
//     WITHOUT the usual "nr" label — "oznaczonej działką 464/12"),
//     280.000,00 -> 430.000,00, nabywca "Grzegorz Prokopowicz", 11.09.2024.
//   wynik ul. Katowicka — land RESULT UNSOLD, 4 parcels joined "nr: A, B i C"
//     (5959/513, 6228/514, 6238/513, 6240/513), NO table at all — prose-only
//     "zakończył się wynikiem negatywnym, z braku chętnych na jej nabycie."
//   lease title — real "…na wydzierżawienie nieruchomości … zabytkowego parku
//     pszczyńskiego (Dmuchaniec)" — must never reach an active listing.
//
// REAL PARSER BUG fixed here (see parse.js header + unitAreaFromText): the
// shared core/finn-bip.js areaFromText scans left-to-right and would return a
// multi-unit building's COMBINED total (401,66 / 508,02 m2) instead of the
// specific flat's own area (41,06 / 28,97 m2) — wrong by 10-14x. Both
// announcement fixtures below assert the FLAT's own figure wins.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isAnnouncementTitle,
  isResultTitle,
  isLeaseTitle,
  extractDetail,
  resultTableFromHtml,
  isNegativeOutcome,
  resultDateFromText,
  flatIdFromText,
  flatAddressFromText,
  unitAreaFromText,
  parcelFromText,
  obrebFromText,
  plotAreaFromText,
  landStreetFromText,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/pszczyna/parse.js';
import { searchUrl, harvestSearchItems, pickAttachment } from '../src/cities/pszczyna/crawl.js';

// ---------------------------------------------------------------- title routing

test('title routing: real announcement / result / lease titles', () => {
  assert.equal(
    isAnnouncementTitle(
      'Ogłoszenie o VIII przetargu ustnym nieograniczonym na sprzedaż lokalu mieszkalnego nr 21/4, planowanego do wyodrębnienia w budynkach położonych w Pszczynie przy ul. Bednarskiej 21 i ul. Rynek 3',
    ),
    true,
  );
  assert.equal(
    isAnnouncementTitle('Przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 3, w budynku położonym w Pszczynie przy Rynku 22'),
    true,
  );
  assert.equal(
    isAnnouncementTitle('Ogłoszenie o I przetargu na sprzedaż nieruchomości położonej w Pszczynie przy ul. Braci Jędrysików, oznaczonej działką  nr 6602/65'),
    true,
  );
  assert.equal(
    isResultTitle('Informacja o wyniku przetargu na sprzedaż lokalu mieszkalnego nr 27/1 w budynku położonym w Pszczynie przy ul. Wojciecha Korfantego 19-35'),
    true,
  );
  assert.equal(
    isResultTitle('Informacja o wyniku II przetargu na sprzedaż lokalu mieszkalnego nr 22/5 w budynku położonym w Pszczynie przy ul. Karola Szymanowskiego 20-22-24'),
    true,
  );
  assert.equal(isResultTitle('Informacja o wyniku przetargu na sprzedaż nieruchomości położonych w Pszczynie przy ul. Katowickiej'), true);
  // A result title must never also pass the announcement gate.
  assert.equal(
    isAnnouncementTitle('Informacja o wyniku II przetargu na sprzedaż lokalu mieszkalnego nr 22/5 w budynku położonym w Pszczynie przy ul. Karola Szymanowskiego 20-22-24'),
    false,
  );
  // Real lease title (Dmuchaniec park) — must never reach an active listing.
  const LEASE_TITLE =
    'Ogłoszenie o przetargu ustnym nieograniczonym w formie licytacji na wydzierżawienie nieruchomości położonej w Pszczynie obejmującej część zabytkowego parku pszczyńskiego (Dmuchaniec)';
  assert.equal(isLeaseTitle(LEASE_TITLE), true);
  assert.equal(isAnnouncementTitle(LEASE_TITLE), false);
});

// ------------------------------------------------------------------ fixtures

const ANN_BEDNARSKA_TITLE =
  'Ogłoszenie o VIII przetargu ustnym nieograniczonym na sprzedaż lokalu mieszkalnego nr 21/4, planowanego do wyodrębnienia w budynkach położonych w Pszczynie przy ul. Bednarskiej 21 i ul. Rynek 3';

// pdftotext -layout output of the real attachment (/zalacznik/80046), condensed
// to the load-bearing sentences (verified live 2026-07-10).
const ANN_BEDNARSKA_BODY = `OGŁOSZENIE O PRZETARGU
BURMISTRZ PSZCZYNY
Ogłasza VIII przetarg ustny nieograniczony na sprzedaż samodzielnego lokalu mieszkalnego nr 21/4, planowanego do wyodrębnienia w budynkach położonych w Pszczynie przy ul. Bednarskiej 21 i ul. Rynek 3
1. Dla nieruchomości będącej przedmiotem przetargu prowadzona jest przez Sąd Rejonowy w Pszczynie księga wieczysta oznaczona KA1P/00031938/7.
2. W katastrze nieruchomości obrębu Pszczyna nieruchomość z budynkami, w których znajduje się lokal oznaczona jest działką nr 1102/28 o powierzchni 0,0513 ha (B).
5. Nieruchomość zabudowana jest zespołem budynków o numerach ewidencyjnych 4770, 4771, 4772, 4773 tj.: kamienicą o adresie ul. Rynek 3, oficyną wraz z budynkiem gospodarczym, kamienicą o adresie ul. Bednarska 21, w której znajdują się lokale będące przedmiotem sprzedaży. W budynkach znajduje się 10 planowanych do wyodrębnienia samodzielnych lokali, w tym 9 lokali mieszkalnych i 1 lokal użytkowy, będących własnością Gminy Pszczyna, o łącznej powierzchni 616,15 m2, w tym łączna powierzchnia użytkowa 508,02 m2 i łączna powierzchnia pomieszczeń przynależnych 108,13 m2.
6. Lokal zostanie sprzedany na własność w trybie przetargu ustnego nieograniczonego.
8. Przedmiotem przetargu jest mieszczący się na I piętrze budynku położonego przy ul. Bednarskiej 21 dotychczas niewyodrębniony, samodzielny lokal mieszkalny nr 21/4 (1 pokój, kuchnia, łazienka), o powierzchni użytkowej 28,97 m2. Lokal jest wolny od zobowiązań oraz obciążeń.
9. Lokal wraz z udziałem w częściach wspólnych budynku i innych urządzeń oraz udziałem w gruncie, w ułamku wynoszącym 2897/61615, zostanie wyodrębniony i sprzedany na własność.
10. Cena wywoławcza wynosi 47.000,00 zł, w tym cena składnika budowlanego 44.349,00 zł oraz cena udziału w gruncie 2.651,00 zł.
11. Przetarg odbędzie się w dniu 9 lipca 2025 r. o godz. 1100 w siedzibie Urzędu Miejskiego w Pszczynie, ul. Rynek 2, budynek A, pokój – 201.
12. Wadium w wysokości: 9.400,00 zł należy wpłacić w pieniądzu.`;

const ANN_RYNEK22_TITLE =
  'Przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 3, w budynku położonym w Pszczynie przy Rynku 22';

// Inline <article class="content"> body (already flattened to text here —
// parseAnnouncement runs htmlToText on it regardless, which is a harmless
// no-op on plain text), condensed from the real 2007 announcement.
const ANN_RYNEK22_BODY = `O G Ł O S Z E N I E O P R Z E T A R G U
BURMISTRZ PSZCZYNY
ogłasza przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 3, w budynku położonym w Pszczynie przy Rynku 22.
1. Nieruchomość zapisana jest w księdze wieczystej Sądu Rejonowego w Pszczynie nr KA1P/00036833/6.
2. W katastrze nieruchomości obrębu Pszczyna (arkusz mapy 2 dodatek 3) nieruchomość oznaczona jest działką nr 816/26 o powierzchni 0,0404 ha.
4. Grunt zabudowany jest budynkiem mieszkalnym (częściowo podpiwniczony, piętrowy z użytkowym poddaszem), w którym mieści się siedem (7) lokali mieszkalnych o łącznej powierzchni użytkowej 401,66 m2. Budynek pochodzi z początku XX wieku. Przedmiotem przetargu jest lokal mieszkalny nr 3.
5. Lokal mieszkalny nr 3 składa się z dwóch pokoi, kuchni, łazienki i przedpokoju o łącznej powierzchni użytkowej 41,06 m2 oraz przynależnej komórki o powierzchni 10,02 m2.
8. Cena wywoławcza wynosi 23.290,00- zł, w tym za składnik budowlany 14.418,46- zł, za udział w gruncie 8.871,54- zł.
10. Przetarg odbędzie się w dniu 08 listopada 2007 r. o godz. 1100 w sali Ratusza w Pszczynie, Rynek 2, II piętro.`;

const RES_KORFANTEGO_HTML =
  'Informacja o wyniku przetargu na sprzedaż lokalu mieszkalnego nr 27/1 w budynku położonym w Pszczynie przy ul. Wojciecha Korfantego 19-35. ' +
  '<article class="content">\n\t<p><b>Informacja o wyniku przetargu</b></p><p>Burmistrz Pszczyny informuje, że przetarg ustny nieograniczony, wyznaczony na dzień<b> 28 lutego 2024 r</b>. w Urzędzie Miejskim w Pszczynie, na sprzedaż lokalu mieszkalnego <b>nr 27/1</b> w budynku położonym w <b>Pszczynie przy ul. Wojciecha Korfantego 19-35</b>, zakończył się następującym wynikiem: </p> <table> <tbody><tr> <td colspan="2"> <p>Liczba osób:</p> </td> <td colspan="2"> <p>Cena nieruchomości:</p> </td> <td rowspan="2"> <p>Nabywca nieruchomości:</p> </td> </tr> <tr> <td> <p>Dopuszczona</p> </td> <td> <p>Niedopuszczona</p> </td> <td> <p>Wywoławcza w zł</p> </td> <td> <p>Osiągnięta w zł</p> </td> </tr> <tr> <td> <p><b>3</b></p> </td> <td> <p><b>0</b></p> </td> <td> <p><b>258.000,- zł</b></p> </td> <td> <p><b>273.000,- zł</b></p> </td> <td> <p><b>BUDUJE.MY sp. z o.o. z siedzibą w Pszczynie</b></p> </td> </tr> </tbody></table></article>';

const RES_SZYMANOWSKIEGO_HTML =
  'Informacja o wyniku II przetargu na sprzedaż lokalu mieszkalnego nr 22/5 w budynku położonym w Pszczynie przy ul. Karola Szymanowskiego 20-22-24. ' +
  '<article class="content">\n\t<p>G.6840.18.2024</p><p><b>Informacja o wyniku przetargu</b></p><p>Burmistrz Pszczyny informuje, że II przetarg ustny nieograniczony, wyznaczony na dzień<b> 23 lipca 2025 r</b>. w Urzędzie Miejskim w Pszczynie, na sprzedaż lokalu mieszkalnego <b>nr 22/5</b> w budynku położonym w <b>Pszczynie przy ul. Karola Szymanowskiego </b><b>20-22-24</b>, wzniesionym na gruncie oznaczonym na mapie ewidencyjnej obrębu Stara Wieś działką nr 1084/24, zakończył się następującym wynikiem: </p> <table> <tbody><tr> <td colspan="2"> <p>Liczba osób:</p> </td> <td colspan="2"> <p>Cena nieruchomości:</p> </td> <td rowspan="2"> <p>Nabywca nieruchomości:</p> </td> </tr> <tr> <td> <p>Dopuszczona</p> </td> <td> <p>Niedopuszczona</p> </td> <td> <p>Wywoławcza w zł</p> </td> <td> <p>Osiągnięta w zł</p> </td> </tr> <tr> <td> <p><b>2</b></p> </td> <td> <p><b>0</b></p> </td> <td> <p><b>250.000,- zł</b></p> </td> <td> <p><b>252.500,- zł</b></p> </td> <td> <p><b>Justyna i Szymon JENCZURA</b></p> </td> </tr> </tbody></table><p><br></p></article>';

const ANN_JEDRYSIKOW_TITLE =
  'Ogłoszenie o I przetargu na sprzedaż nieruchomości położonej w Pszczynie przy ul. Braci Jędrysików, oznaczonej działką  nr 6602/65';

const ANN_JEDRYSIKOW_BODY = `O G Ł O S Z E N I E O P R Z E T A R G U
Burmistrz Pszczyny ogłasza I przetarg ustny nieograniczony na sprzedaż nieruchomości niezabudowanej, położonej w Pszczynie przy ul. Braci Jędrysików, oznaczonej działką nr 6602/65 oraz udziału wynoszącego ¼ we własności działki nr 6603/65
1.W katastrze nieruchomości obrębu Pszczyna na arkuszu 1 mapy ewidencyjnej, nieruchomość będąca przedmiotem przetargu, oznaczona jest działką nr 6602/65 o powierzchni 0,0918 ha (RIIIb-0,0252 ha, RIVa-0,0666 ha), dla której Sąd Rejonowy w Pszczynie prowadzi księgę wieczystą oznaczoną KA1P/00012278/3 oraz działką nr 6603/65 o powierzchni 0,0229 ha (RIVa), dla której Sąd Rejonowy w Pszczynie prowadzi księgę wieczystą oznaczoną KA1P/00092089/5.
9.Działka oznaczona nr 6602/65 zostanie sprzedana wraz z udziałem wynoszącym ¼ we własności działki nr 6603/65 przeznaczonej na urządzenie drogi wewnętrznej.
10. Cena wywoławcza nieruchomości wynosi 126 850,00 zł, w tym :
- cena działki nr 6602/65 wynosi 119 400,00 zł
- cena udziału wynoszącego ¼ we własności działki 6603/65 wynosi 7 450,00 zł.
11. Przetarg odbędzie się w dniu 25 stycznia 2023 r. o godz. 1100 w siedzibie Urzędu Miejskiego w Pszczynie, ul. Rynek 2, budynek A, pokój 202.`;

const RES_ANTESA_HTML =
  'Informacja o wyniku I przetargu ustnego nieograniczonego na sprzedaż nieruchomości niezabudowanej, położonej w Pszczynie przy ul. dr. Witolda Antesa. ' +
  '<article class="content">\n\t<p><b>Informacja o wyniku przetargu</b></p><p>Burmistrz Pszczyny informuje, że I przetarg ustny nieograniczony, wyznaczony na dzień <b>11 września 2024r</b>. w Urzędzie Miejskim w Pszczynie, na sprzedaż nieruchomości położonej <b>w Pszczynie przy ul. dr. Witolda Antesa</b>, oznaczonej działką 464/12, zakończył się następującym wynikiem:</p><table> <tbody><tr> <td colspan="2"> <p>Liczba osób:</p> </td> <td colspan="2"> <p>Cena nieruchomości:</p> </td> <td rowspan="2"> <p>Nabywca nieruchomości:</p> </td> </tr> <tr> <td> <p>Dopuszczona</p> </td> <td> <p>Niedopuszczona</p> </td> <td> <p>Wywoławcza w zł</p> </td> <td> <p>Osiągnięta w zł</p> </td> </tr> <tr> <td> <p><b>2</b></p> </td> <td> <p><b>0</b></p> </td> <td> <p><b>280.000,00</b></p> </td> <td> <p><b>430.000,00</b></p> </td> <td> <p><b>Grzegorz Prokopowicz</b></p> </td> </tr> </tbody></table></article>';

const RES_KATOWICKA_HTML =
  'Informacja o wyniku przetargu na sprzedaż nieruchomości położonych w Pszczynie przy ul. Katowickiej. ' +
  '<article class="content">\n\t<h2>Informacja o wyniku przetargu</h2> <p>Burmistrz Pszczyny informuje, że pierwszy przetarg ustny nieograniczony, wyznaczony na dzień <b>11 maja </b><b>2022 r</b>. w Urzędzie Miejskim w Pszczynie, na sprzedaż nieruchomości niezabudowanej, położonej w <b>Pszczynie </b>przy<b> ul. Katowickiej</b>, oznaczonej na arkuszu 1 mapy ewidencyjnej obrębu Pszczyna działkami nr: <b>5959/513, 6228/514, 6238/513 i 6240/513</b>,<b> </b>o łącznej powierzchni 0,2357 ha,<b> </b>dla której Sąd Rejonowy w Pszczynie prowadzi księgę wieczystą oznaczoną KA1P/00033326/8 <strong>zakończył się wynikiem </strong>negatywnym, z braku chętnych na jej nabycie. </p></article>';

// ---------------------------------------------------------------- unit extractors

test('resultTableFromHtml: structured SOLD table (with-zł and plain-decimal cell styles)', () => {
  const t1 = resultTableFromHtml(RES_KORFANTEGO_HTML);
  assert.deepEqual(t1, {
    dopuszczona: 3, niedopuszczona: 0,
    starting_price_pln: 258000, final_price_pln: 273000,
    buyer: 'BUDUJE.MY sp. z o.o. z siedzibą w Pszczynie',
  });
  const t2 = resultTableFromHtml(RES_ANTESA_HTML); // "280.000,00" cells — no "zł", no ",-"
  assert.deepEqual(t2, {
    dopuszczona: 2, niedopuszczona: 0,
    starting_price_pln: 280000, final_price_pln: 430000,
    buyer: 'Grzegorz Prokopowicz',
  });
});

test('resultTableFromHtml: returns null for a prose-only negative notice (no <table> at all)', () => {
  assert.equal(resultTableFromHtml(RES_KATOWICKA_HTML), null);
});

test('isNegativeOutcome / resultDateFromText', () => {
  assert.equal(isNegativeOutcome('zakończył się wynikiem negatywnym, z braku chętnych na jej nabycie.'), true);
  assert.equal(isNegativeOutcome('zakończył się następującym wynikiem:'), false);
  assert.equal(
    resultDateFromText('przetarg ustny nieograniczony, wyznaczony na dzień 28 lutego 2024 r. w Urzędzie Miejskim'),
    '2024-02-28',
  );
  assert.equal(
    resultDateFromText('pierwszy przetarg ustny nieograniczony, wyznaczony na dzień 11 maja 2022 r. w Urzędzie'),
    '2022-05-11',
  );
});

test('flatIdFromText: bare and compound flat ids', () => {
  assert.equal(flatIdFromText('na sprzedaż lokalu mieszkalnego nr 3, w budynku'), '3');
  assert.equal(flatIdFromText('na sprzedaż lokalu mieszkalnego nr 27/1 w budynku'), '27/1');
  assert.equal(flatIdFromText('na sprzedaż lokalu mieszkalnego nr 21/4, planowanego'), '21/4');
});

test('flatAddressFromText: compound id drops the street range; bare id combines with the street number; office address never wins', () => {
  const korfantego = flatAddressFromText('', 'w budynku położonym w Pszczynie przy ul. Wojciecha Korfantego 19-35 na sprzedaż lokalu mieszkalnego nr 27/1');
  assert.equal(korfantego.address_raw, 'Wojciecha Korfantego 27/1');
  assert.equal(korfantego.address.street, 'Wojciecha Korfantego');
  assert.equal(korfantego.address.building, '27');
  assert.equal(korfantego.address.apt, '1');

  const bednarska = flatAddressFromText(ANN_BEDNARSKA_TITLE, ANN_BEDNARSKA_BODY);
  assert.equal(bednarska.address_raw, 'Bednarskiej 21/4');
  assert.equal(bednarska.address.building, '21');
  assert.equal(bednarska.address.apt, '4');

  // Bare flat id ("3", no slash) combines with the STREET's own number.
  const rynek = flatAddressFromText(ANN_RYNEK22_TITLE, ANN_RYNEK22_BODY);
  assert.equal(rynek.address_raw, 'Rynek 22/3'); // "Rynku" (locative) normalised to "Rynek"
  assert.equal(rynek.address.street, 'Rynek');
  assert.equal(rynek.address.building, '22');
  assert.equal(rynek.address.apt, '3');
  // The office's own "Rynek 2" (mentioned later, "w sali Ratusza w Pszczynie,
  // Rynek 2") must never be picked as the property address.
  assert.notEqual(rynek.address.building, '2');
});

test('unitAreaFromText: REAL BUG — the flat\'s own area wins over the whole building\'s combined total', () => {
  // Bednarska 21/4: building total (10 lokali) 508,02 m2 vs this flat 28,97 m2.
  assert.equal(unitAreaFromText(ANN_BEDNARSKA_BODY, '21/4'), 28.97);
  // Rynek 22/3: building total (7 lokali) 401,66 m2 vs this flat 41,06 m2.
  assert.equal(unitAreaFromText(ANN_RYNEK22_BODY, '3'), 41.06);
});

test('parcelFromText: labelled "nr", colon-labelled list, and NO-label form ("działką 464/12")', () => {
  assert.equal(parcelFromText('oznaczona jest działką nr 6602/65 o powierzchni 0,0918 ha oraz działką nr 6603/65 o powierzchni 0,0229 ha'), '6602/65, 6603/65');
  assert.equal(parcelFromText('działkami nr: 5959/513, 6228/514, 6238/513 i 6240/513, o łącznej powierzchni'), '5959/513, 6228/514, 6238/513, 6240/513');
  assert.equal(parcelFromText('na sprzedaż nieruchomości położonej w Pszczynie przy ul. dr. Witolda Antesa, oznaczonej działką 464/12, zakończył'), '464/12');
  // A decimal area figure right after "działki" must never be mis-read as parcel "0".
  assert.equal(parcelFromText('o łącznej powierzchni działki 0,0918 ha'), null);
});

test('obrebFromText / plotAreaFromText (ha, tolerant of an inserted łącznej/łączna)', () => {
  assert.equal(obrebFromText('na arkuszu 1 mapy ewidencyjnej obrębu Pszczyna działkami nr:'), 'Pszczyna');
  assert.equal(plotAreaFromText('działką nr 6602/65 o powierzchni 0,0918 ha (RIIIb-0,0252 ha'), 918);
  assert.equal(plotAreaFromText('oznaczonych działkami nr: 5959/513 i in., o łącznej powierzchni 0,2357 ha, dla której'), 2357);
});

test('landStreetFromText: property street, never the office ("ul. Rynek 2")', () => {
  assert.equal(landStreetFromText('położonej w Pszczynie przy ul. Braci Jędrysików, oznaczonej działką nr 6602/65'), 'Braci Jędrysików');
  assert.equal(landStreetFromText('w Urzędzie Miejskim w Pszczynie, przy ul. Rynek 2, budynek A, przy ul. Katowickiej, oznaczonej'), 'Katowickiej');
});

// -------------------------------------------------------------- extractDetail

test('extractDetail: empty inline content + real "Pliki do pobrania" attachment block -> PDF attachment ref', () => {
  const html =
    `<article id="cnt" class="document"><header><h2>${ANN_BEDNARSKA_TITLE}</h2></header>` +
    '<article class="lead"><p>G.6840.11.2023 - przetarg</p></article>' +
    '<article class="content">\n\t</article>' +
    '<h3>Pliki do pobrania</h3>\n\t<ul class="attach_show_list"><li><p>' +
    '<a aria-label="Pobierz załącznik: ogłoszenie_przetarg_Bednarska_21_4_mieszkanie - VIII przetarg.pdf w formacie pdf o rozmiarze 153 kB" href="/zalacznik/80046"\n\t\t\ttitle="">ogłoszenie_przetarg_Bednarska_21_4_mieszkanie - VIII przetarg.pdf</a>' +
    '<span aria-hidden="true">153 kB</span></p></li></ul>';
  const detail = extractDetail(html);
  assert.equal(detail.title, ANN_BEDNARSKA_TITLE);
  assert.equal(detail.contentText, ''); // empty inline body — the modern norm
  assert.equal(detail.attachments.length, 1);
  assert.equal(detail.attachments[0].format, 'pdf');
  assert.equal(detail.attachments[0].url, 'https://bip.pszczyna.pl/zalacznik/80046');
  const att = pickAttachment(detail.attachments);
  assert.equal(att.url, 'https://bip.pszczyna.pl/zalacznik/80046');
});

test('extractDetail: returns null for a page with no id="cnt" region (defends the cross-tenant cache risk)', () => {
  assert.equal(extractDetail('<html><body>some other cached page</body></html>'), null);
});

test('end-to-end (extractDetail -> parseResultDoc), exactly like crawl.js: a full real page shape for Korfantego 27/1', () => {
  // Mirrors the real page layout: nav/menu chrome would precede id="cnt" on a
  // live fetch (crawl.js's fetch already returns that); extractDetail scopes
  // to the id="cnt" region regardless, so a minimal wrapper is sufficient here.
  const fullPage =
    '<html><body><nav>…thousands of unrelated sidebar links…</nav>' +
    `<article id="cnt" class="document"><header><h2>Informacja o wyniku przetargu na sprzedaż lokalu mieszkalnego nr 27/1 w budynku położonym w Pszczynie przy ul. Wojciecha Korfantego 19-35</h2></header>` +
    '<article class="lead"><p>G.6840.26.2023 - wynik przetargu</p></article>' +
    '<article class="content">\n\t<p><b>Informacja o wyniku przetargu</b></p><p>Burmistrz Pszczyny informuje, że przetarg ustny nieograniczony, wyznaczony na dzień<b> 28 lutego 2024 r</b>. w Urzędzie Miejskim w Pszczynie, na sprzedaż lokalu mieszkalnego <b>nr 27/1</b> w budynku położonym w <b>Pszczynie przy ul. Wojciecha Korfantego 19-35</b>, zakończył się następującym wynikiem: </p> <table> <tbody><tr> <td colspan="2"> <p>Liczba osób:</p> </td> <td colspan="2"> <p>Cena nieruchomości:</p> </td> <td rowspan="2"> <p>Nabywca nieruchomości:</p> </td> </tr> <tr> <td> <p>Dopuszczona</p> </td> <td> <p>Niedopuszczona</p> </td> <td> <p>Wywoławcza w zł</p> </td> <td> <p>Osiągnięta w zł</p> </td> </tr> <tr> <td> <p><b>3</b></p> </td> <td> <p><b>0</b></p> </td> <td> <p><b>258.000,- zł</b></p> </td> <td> <p><b>273.000,- zł</b></p> </td> <td> <p><b>BUDUJE.MY sp. z o.o. z siedzibą w Pszczynie</b></p> </td> </tr> </tbody></table></article>' +
    '<h3>Pliki do pobrania</h3><ul class="attach_show_list"><li><p>' +
    '<a aria-label="Pobierz załącznik: Informacja o wyniku przetargu - Pszczyna, ul. Korfantego 27)1.pdf w formacie pdf o rozmiarze 96 kB" href="/zalacznik/75463"\n\t\t\ttitle="">Informacja o wyniku przetargu - Pszczyna, ul. Korfantego 27)1.pdf</a>' +
    '<span aria-hidden="true">96 kB</span></p></li></ul>' +
    '<footer><h3>Historia dokumentu</h3><table><thead><tr><th>Wersja</th><th>Data</th></tr></thead><tbody><tr><td>1</td><td>26 lutego 2024</td></tr></tbody></table></footer>' +
    '</article></body></html>';

  const detail = extractDetail(fullPage);
  assert.ok(detail);
  assert.match(detail.title, /Korfantego 19-35$/);
  assert.match(detail.contentText, /BUDUJE\.MY/);
  // The footer's unrelated "Historia dokumentu" <table> must never leak into
  // contentHtml — resultTableFromHtml would misread it as the price table.
  assert.equal((detail.contentHtml.match(/<table/g) || []).length, 1);

  const [rec] = parseResultDoc(`${detail.title}. ${detail.contentHtml}`, null, 'https://bip.pszczyna.pl/informacja-o-wyniku-przetargu-...-korfantego-19-35');
  assert.equal(rec.address_raw, 'Wojciecha Korfantego 27/1');
  assert.equal(rec.final_price_pln, 273000);
  assert.equal(rec.buyer, 'BUDUJE.MY sp. z o.o. z siedzibą w Pszczynie');
  assert.equal(rec.outcome, 'sold');
});

// ------------------------------------------------------------ announcement parse

test('parseAnnouncement: PDF-extracted flat (Bednarska 21/4) — address, area (not building total), price, date, round VIII', () => {
  const rec = parseAnnouncement(ANN_BEDNARSKA_TITLE, ANN_BEDNARSKA_BODY, 'https://bip.pszczyna.pl/ogloszenie-o-viii-przetargu-...-bednarskiej-21-i-ul-rynek-3');
  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address_raw, 'Bednarskiej 21/4');
  assert.equal(rec.address.key, 'bednarskiej|21|4');
  assert.equal(rec.area_m2, 28.97);
  assert.equal(rec.starting_price_pln, 47000);
  assert.equal(rec.auction_date, '2025-07-09');
  assert.equal(rec.round, 8);
});

test('parseAnnouncement: inline-HTML flat (Rynek 22/3, 2007 archive doc) — same area-trap fix, dash-grosze price', () => {
  const rec = parseAnnouncement(ANN_RYNEK22_TITLE, ANN_RYNEK22_BODY, 'https://bip.pszczyna.pl/przetarg-ustny-nieograniczony-...-rynku-22');
  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address_raw, 'Rynek 22/3');
  assert.equal(rec.area_m2, 41.06);
  assert.equal(rec.starting_price_pln, 23290);
  assert.equal(rec.auction_date, '2007-11-08');
  assert.equal(rec.round, 1);
});

test('parseAnnouncement: land (Braci Jędrysików) — kind grunt, two parcels, ha->m2, price, date', () => {
  const rec = parseAnnouncement(ANN_JEDRYSIKOW_TITLE, ANN_JEDRYSIKOW_BODY, 'https://bip.pszczyna.pl/ogloszenie-o-i-przetargu-...-dzialka-nr-6602-65');
  assert.ok(rec);
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.dzialka_nr, '6602/65, 6603/65');
  assert.equal(rec.obreb, 'Pszczyna');
  assert.equal(rec.area_m2, 918);
  assert.equal(rec.address_raw, 'ul. Braci Jędrysików');
  assert.equal(rec.starting_price_pln, 126850);
  assert.equal(rec.auction_date, '2023-01-25');
  assert.equal(rec.round, 1);
});

test('parseAnnouncement: a lease title never reaches an active listing', () => {
  const rec = parseAnnouncement(
    'Ogłoszenie o przetargu ustnym nieograniczonym w formie licytacji na wydzierżawienie nieruchomości położonej w Pszczynie obejmującej część zabytkowego parku pszczyńskiego (Dmuchaniec)',
    'ogłasza przetarg na wydzierżawienie nieruchomości',
    'https://bip.pszczyna.pl/x',
  );
  assert.equal(rec, null);
});

// ------------------------------------------------------------------ result parse

test('parseResultDoc: flat SOLD — Korfantego 27/1 (the flagship example: 258.000 -> 273.000, nabywca)', () => {
  const [rec] = parseResultDoc(RES_KORFANTEGO_HTML, null, 'https://bip.pszczyna.pl/informacja-o-wyniku-przetargu-...-korfantego-19-35');
  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address_raw, 'Wojciecha Korfantego 27/1');
  assert.equal(rec.address.key, 'wojciecha korfantego|27|1');
  assert.equal(rec.starting_price_pln, 258000);
  assert.equal(rec.final_price_pln, 273000);
  assert.equal(rec.outcome, 'sold');
  assert.equal(rec.buyer, 'BUDUJE.MY sp. z o.o. z siedzibą w Pszczynie');
  assert.equal(rec.auction_date, '2024-02-28');
  assert.equal(rec.round, 1);
  assert.deepEqual(rec.notes, []);
});

test('parseResultDoc: flat SOLD — Szymanowskiego 22/5, II, two-individual buyer, 3-number street range', () => {
  const [rec] = parseResultDoc(RES_SZYMANOWSKIEGO_HTML, null, 'https://bip.pszczyna.pl/informacja-o-wyniku-ii-przetargu-...-szymanowskiego-20-22-24');
  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address_raw, 'Karola Szymanowskiego 22/5');
  assert.equal(rec.address.building, '22');
  assert.equal(rec.address.apt, '5');
  assert.equal(rec.starting_price_pln, 250000);
  assert.equal(rec.final_price_pln, 252500);
  assert.equal(rec.outcome, 'sold');
  assert.equal(rec.buyer, 'Justyna i Szymon JENCZURA');
  assert.equal(rec.auction_date, '2025-07-23');
  assert.equal(rec.round, 2);
});

test('parseResultDoc: land SOLD — dr. Witolda Antesa, parcel stated WITHOUT the "nr" label, buyer', () => {
  const [rec] = parseResultDoc(RES_ANTESA_HTML, null, 'https://bip.pszczyna.pl/informacja-o-wyniku-i-przetargu-...-antesa');
  assert.ok(rec);
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.dzialka_nr, '464/12');
  assert.equal(rec.starting_price_pln, 280000);
  assert.equal(rec.final_price_pln, 430000);
  assert.equal(rec.outcome, 'sold');
  assert.equal(rec.buyer, 'Grzegorz Prokopowicz');
  assert.equal(rec.auction_date, '2024-09-11');
  assert.equal(rec.round, 1);
});

test('parseResultDoc: land UNSOLD — ul. Katowicka, 4 parcels, NO table, prose negative, no price/buyer', () => {
  const [rec] = parseResultDoc(RES_KATOWICKA_HTML, null, 'https://bip.pszczyna.pl/informacja-o-wyniku-przetargu-...-katowickiej');
  assert.ok(rec);
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.dzialka_nr, '5959/513, 6228/514, 6238/513, 6240/513');
  assert.equal(rec.area_m2, 2357);
  assert.equal(rec.starting_price_pln, null); // never restated in a negative notice
  assert.equal(rec.final_price_pln, null);
  assert.equal(rec.outcome, 'unsold');
  assert.equal(rec.unsold_reason, 'wynik negatywny');
  assert.equal(rec.buyer, null);
  assert.equal(rec.auction_date, '2022-05-11');
  assert.equal(rec.round, 1);
  assert.deepEqual(rec.notes, ['parse: missing starting price']);
});

test('parseResultDoc: a lease-ish notice never reaches a result record', () => {
  assert.deepEqual(parseResultDoc('Informacja o wyniku przetargu na wydzierżawienie nieruchomości. wynik negatywny', null, 'x'), []);
});

// ----------------------------------------------------------- crawl discovery

test('searchUrl: page 1 has no page suffix; page N uses the real four-slash pattern', () => {
  assert.equal(searchUrl('sprzedaż lokalu mieszkalnego', 1), 'https://bip.pszczyna.pl/szukaj//sprzeda%C5%BC+lokalu+mieszkalnego');
  assert.equal(searchUrl('sprzedaż lokalu mieszkalnego', 2), 'https://bip.pszczyna.pl/szukaj//sprzeda%C5%BC+lokalu+mieszkalnego////2');
});

test('harvestSearchItems: extracts (href,title) pairs from a real search-results page', () => {
  const html = `
    <ol>
    <li><article><header><h3><a class="jstree-draggable document-title" data-id="50862" data-categoryid="4335" href="/informacja-o-wyniku-przetargu-ustnego-nieograniczonego-na-sprzedaz-nieruchomosci-polozonej-w-lace-przy-ul-sznelowiec-14-3-dz-154-34#cnt">Informacja o wyniku przetargu ustnego nieograniczonego na sprzedaż nieruchomości położonej w Łące przy ul. Sznelowiec 14/3 - dz. 154/34</a></h3></header></article></li>
    <li><article><header><h3><a class="jstree-draggable document-title" data-id="50462" data-categoryid="4334" href="/ogloszenie-o-przetargu-ustnym-nieograniczonym-na-sprzedaz-samodzielnego-lokalu-mieszkalnego-nr-14-3-planowanego-do-wyodrebnienia-w-budynkach-polozonych-w-lace-przy-ul-sznelowiec-14-16-18#cnt">Ogłoszenie o przetargu ustnym nieograniczonym na sprzedaż samodzielnego lokalu mieszkalnego nr 14/3</a></h3></header></article></li>
    </ol>`;
  const items = harvestSearchItems(html);
  assert.equal(items.length, 2);
  assert.equal(items[0].href, 'https://bip.pszczyna.pl/informacja-o-wyniku-przetargu-ustnego-nieograniczonego-na-sprzedaz-nieruchomosci-polozonej-w-lace-przy-ul-sznelowiec-14-3-dz-154-34');
  assert.match(items[0].title, /^Informacja o wyniku/);
  assert.match(items[1].title, /^Ogłoszenie o przetargu/);
});

test('pickAttachment: prefers .pdf over .doc(x)', () => {
  const attachments = [
    { name: 'Regulamin.docx', format: 'docx', url: 'https://bip.pszczyna.pl/zalacznik/1' },
    { name: 'ogloszenie.pdf', format: 'pdf', url: 'https://bip.pszczyna.pl/zalacznik/2' },
  ];
  assert.equal(pickAttachment(attachments).url, 'https://bip.pszczyna.pl/zalacznik/2');
  assert.equal(pickAttachment([attachments[0]]).url, 'https://bip.pszczyna.pl/zalacznik/1'); // doc fallback
  assert.equal(pickAttachment([]), null);
});
