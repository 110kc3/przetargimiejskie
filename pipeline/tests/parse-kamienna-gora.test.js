// Kamienna Góra parser tests. Fixtures are condensed-but-faithful copies of the
// REAL born-digital PDF text (pdftotext -layout) fetched live from
// bip.kamiennagora.pl (verified 2026-07-11 from this Pi's Polish residential IP,
// with the browser UA the host requires). Long non-load-bearing boilerplate
// (wadium-handling procedure, pierwszeństwo/RODO paragraphs, MPZP clause,
// notarial-cost warnings) is trimmed; every sentence that feeds a parsed field
// (address, area, price, date, round, outcome) is kept VERBATIM.
//
// The announcement fixture deliberately KEEPS the real mid-street line break
// ("...przy ul. Tadeusza\n Kościuszki 20\nPrzetarg odbędzie się...") as a
// regression fixture: the subject sentence runs straight into the next sentence
// with NO period after the building number, and the street name is split across
// two physical lines — normalizeBody() must rejoin whitespace before the field
// regexes run, and the building number must be found without relying on a
// trailing period. It also keeps "...z 11,8% udziałem we współwłasności wynosi
// 120 000,00 zł" so the price extractor is proven to skip the "11,8%" and land
// on the real amount.
//
// Groundtruth (hand-verified against the live PDFs):
//   ul. Tadeusza Kościuszki 20/8, obręb 6:
//     OGŁOSZENIE   /609 ogłoszenie   round I  48,45 m²  cena wywoławcza 120 000 zł,
//                   auction 04.11.2022, published 21.09.2022
//     WYNIK NEG    /744 negatywny    round I  120 000 zł  → wynik negatywny
//                   (SAME address key as the announcement — the merge point)
//   ul. Mostowej 6/10, obręb 3:
//     WYNIK POZ    /1897 pozytywny   round II 17,35 m²  39 000 → 39 400 zł SOLD,
//                   auction 12.12.2023 (the "w dniu" auction date, NOT the
//                   "dnia 20 grudnia" publication date)
//   ul. Wiejskiej 4/17A, obręb 5:
//     WYNIK POZ    /1752 pozytywny   round I  21,05 m²  51 000 → 51 510 zł SOLD,
//                   auction 26.10.2023 — apartment "17A", obręb stated WITHOUT
//                   "nr" ("w obrębie 5 miasta")
//   pl. Wolności 22/5A, obręb 6:
//     WYNIK NEG    /3574 negatywny   round IV (word "czwartego") 12,95 m²
//                   21 000 zł → wynik negatywny, auction 03.09.2025 — a "pl."
//                   (plac) address, not "ul.".

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parsePLN,
  parseArea,
  textMonthDate,
  roundFromText,
  isResultNotice,
  isAnnouncement,
  extractSubject,
  extractStartingPrice,
  normalizeBody,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/kamienna-gora/parse.js';

import {
  isFlatSaleSlug,
  parseYearIndex,
  parseAttachmentUrls,
} from '../src/cities/kamienna-gora/crawl.js';

// --------------------------------------------------------------- fixtures

const KOSCIUSZKI_ANNOUNCE = `Kamienna Góra, dnia 21 września 2022 r.
OGŁOSZENIE
Burmistrz Miasta Kamienna Góra ogłasza I przetarg ustny nieograniczony na zbycie lokalu
mieszkalnego nr 8 położonego w obrębie nr 6 miasta Kamienna Góra przy ul. Tadeusza
 Kościuszki 20
Przetarg odbędzie się 4 listopada 2022 r. o godz. 9 00 w Urzędzie Miasta Kamienna Góra – sala
nr 211.
Przedmiotem przetargu jest lokal mieszkalny nr 8 o pow. 48,45 m2 składający się z pokoju I
o pow. 16,24 m2, pokoju II o pow. 12,76 m2, kuchni o pow. 14,88 m2.
Cena wywoławcza lokalu mieszkalnego nr 8 przy ul. Tadeusza Kościuszki 20 z 11,8% udziałem
we współwłasności wynosi 120 000,00 zł brutto (słownie: sto dwadzieścia tysięcy złotych brutto).`;

// A SECOND announcement, using the OTHER (dominant) real phrasing: the
// full-word "przy ulicy …" street type (result notices abbreviate to "przy
// ul."), "w Kamiennej Górze" with NO "w obrębie nr N miasta" (→ obręb null),
// and a "N/1000 udziałem" share fraction sitting between the "Cena wywoławcza"
// label and the real amount (the price extractor must skip "139/1000").
const BOHATEROW_ANNOUNCE = `Kamienna Góra, dnia 20 czerwca 2022 r.
OGŁOSZENIE
Burmistrz Miasta Kamienna Góra ogłasza I przetarg ustny nieograniczony na zbycie lokalu
mieszkalnego nr 4 położonego w Kamiennej Górze przy ulicy Bohaterów Getta 19.
Przetarg odbędzie się 2 sierpnia 2022 r. o godz. 1000 w Urzędzie Miasta Kamienna Góra – sala
nr 211.
Przedmiotem przetargu jest lokal mieszkalny nr 4 o pow. 41,09 m położony na I piętrze
(II kondygnacja) w budynku mieszkalnym.
Cena wywoławcza lokalu mieszkalnego nr 4 przy ul. Bohaterów Getta 19 z 139/1000 udziałem
we współwłasności wynosi 100 500,00 zł brutto.`;

const KOSCIUSZKI_NEG = `Kamienna Góra, dnia 4 listopada 2022 r.
INFORMACJA
O WYNIKU PIERWSZEGO PRZETARGU USTNEGO NIEOGRANICZONEGO NA SPRZEDAŻ
NIERUCHOMOŚCI
Burmistrz Miasta Kamienna Góra informuje, że w dniu 4 listopada 2022 r. o godz. 900
w siedzibie Urzędu Miasta Kamienna Góra (sala nr 211) odbył się pierwszy przetarg ustny
nieograniczony na zbycie lokalu mieszkalnego nr 8, położonego w obrębie nr 6 miasta
Kamienna Góra przy ul. Tadeusza Kościuszki 20.
Przedmiotem przetargu był lokal mieszkalny nr 8 o pow. 48,45 m2 składający się z pokoju I.
Cena wywoławcza nieruchomości wynosiła:
120 000,00 zł brutto (słownie: sto dwadzieścia tysięcy złotych brutto).
Podmiot wyłoniony w przetargu jako nabywca nieruchomości:
W wyniku przetargu nie wyłoniono nabywcy nieruchomości.
Z uwagi na powyższe przetarg zakończył się wynikiem negatywnym.`;

const MOSTOWA_SOLD = `Kamienna Góra, dnia 20 grudnia 2023 r.
INFORMACJA
O WYNIKU DRUGIEGO PRZETARGU USTNEGO NIEOGRANICZONEGO NA SPRZEDAŻ
NIERUCHOMOŚCI
Burmistrz Miasta Kamienna Góra informuje, że w dniu 12 grudnia 2023 r. o godz. 1000
w siedzibie Urzędu Miasta Kamienna Góra (sala nr 211) odbył się drugi przetarg ustny
nieograniczony na zbycie lokalu mieszkalnego nr 10, położonego w obrębie nr 3 miasta
Kamienna Góra przy ul. Mostowej 6.
Przedmiotem przetargu był lokal mieszkalny nr 10 o pow. 17,35 m2 składający się z pokoju.
Cena wywoławcza nieruchomości wynosiła:
39 000,00 zł brutto (słownie: trzydzieści dziewięć tysięcy złotych brutto)
Najwyższa cena osiągnięta w przetargu wyniosła:
39 400,00 zł brutto (słownie: trzydzieści dziewięć tysięcy czterysta złotych brutto).
Podmiot wyłoniony w przetargu jako nabywca nieruchomości:
Nabywcą przedmiotowej nieruchomości został Pan Grzegorz Grobel.
Z uwagi na powyższe przetarg zakończył się wynikiem pozytywnym.`;

const WIEJSKA_SOLD = `Kamienna Góra, dnia 3 listopada 2023 r.
INFORMACJA
O WYNIKU PIERWSZEGO PRZETARGU USTNEGO NIEOGRANICZONEGO NA SPRZEDAŻ
NIERUCHOMOŚCI
Burmistrz Miasta Kamienna Góra informuje, że w dniu 26 października 2023 r. o godz. 1000
w siedzibie Urzędu Miasta Kamienna Góra (sala nr 211) odbył się pierwszy przetarg ustny
nieograniczony na zbycie lokalu mieszkalnego nr 17A położonego w obrębie 5 miasta
Kamienna Góra przy ul. Wiejskiej 4.
Przedmiotem przetargu był lokal mieszkalny nr 17A o pow. 21,05 m2 położony na I piętrze.
Cena wywoławcza nieruchomości wynosiła:
51 000,00 zł brutto (słownie: pięćdziesiąt jeden tysięcy złotych brutto).
Najwyższa cena osiągnięta w przetargu wyniosła:
51 510,00 zł brutto (słownie: pięćdziesiąt jeden tysięcy pięćset dziesięć złotych brutto).
Podmiot wyłoniony w przetargu jako nabywca nieruchomości:
Nabywcą przedmiotowej nieruchomości został Pan Daniel Dąbrowski.
Z uwagi na powyższe przetarg zakończył się wynikiem pozytywnym.`;

const PLAC_NEG = `Kamienna Góra, dnia 4 września 2025 r.
INFORMACJA
O WYNIKU CZWARTEGO PRZETARGU USTNEGO NIEOGRANICZONEGO NA SPRZEDAŻ
NIERUCHOMOŚCI
Burmistrz Miasta Kamienna Góra informuje, że w dniu 3 września 2025 r. o godz. 1000
w siedzibie Urzędu Miasta Kamienna Góra (sala nr 211) odbył się czwarty przetarg ustny
nieograniczony na zbycie lokalu mieszkalnego nr 5A, położonego w obrębie nr 6 miasta
Kamienna Góra przy pl. Wolności 22.
Przedmiotem przetargu był lokal mieszkalny nr 5A o pow. 12,95 m2, położony na II piętrze.
Cena wywoławcza nieruchomości wynosiła:
21 000,00 zł brutto (słownie: dwadzieścia jeden tysięcy złotych brutto).
Podmiot wyłoniony w przetargu jako nabywca nieruchomości:
W wyniku przetargu nie wyłoniono nabywcy nieruchomości.
Z uwagi na powyższe przetarg zakończył się wynikiem negatywnym.`;

// -------------------------------------------------------------- unit funcs

test('parsePLN: space-thousands zł amounts and grosze', () => {
  assert.equal(parsePLN('120 000,00'), 120000);
  assert.equal(parsePLN('39 400,00'), 39400);
  assert.equal(parsePLN('51 510'), 51510);
  assert.equal(parsePLN('21 000,00'), 21000);
  assert.equal(parsePLN('brak'), null);
});

test('parseArea: comma and dot decimal separators', () => {
  assert.equal(parseArea('48,45'), 48.45);
  assert.equal(parseArea('17.35'), 17.35);
  assert.equal(parseArea('21,05'), 21.05);
});

test('textMonthDate: Polish genitive text months (incl. accented września/października)', () => {
  assert.equal(textMonthDate('4 listopada 2022'), '2022-11-04');
  assert.equal(textMonthDate('12 grudnia 2023'), '2023-12-12');
  assert.equal(textMonthDate('26 października 2023'), '2023-10-26');
  assert.equal(textMonthDate('3 września 2025'), '2025-09-03');
  assert.equal(textMonthDate('bez daty'), null);
});

test('roundFromText: Roman (announcement "ogłasza I przetarg") AND word ordinal (result "DRUGIEGO/czwarty przetarg")', () => {
  assert.equal(roundFromText('ogłasza I przetarg ustny nieograniczony'), 1);
  assert.equal(roundFromText('O WYNIKU DRUGIEGO PRZETARGU USTNEGO'), 2);
  assert.equal(roundFromText('odbył się czwarty przetarg ustny'), 4);
  assert.equal(roundFromText(KOSCIUSZKI_ANNOUNCE), 1);
  assert.equal(roundFromText(MOSTOWA_SOLD), 2);
  assert.equal(roundFromText(PLAC_NEG), 4);
});

test('isResultNotice / isAnnouncement: discriminate the two notice types on the body', () => {
  assert.equal(isResultNotice(KOSCIUSZKI_NEG), true);
  assert.equal(isResultNotice(MOSTOWA_SOLD), true);
  assert.equal(isResultNotice(KOSCIUSZKI_ANNOUNCE), false);
  assert.equal(isAnnouncement(KOSCIUSZKI_ANNOUNCE), true);
  assert.equal(isAnnouncement(KOSCIUSZKI_NEG), false); // a result is never an announcement
});

test('extractSubject: street/building from "przy ul." with a mid-street line break, apt from "lokalu mieszkalnego nr", and a "pl." (plac) address', () => {
  const k = extractSubject(KOSCIUSZKI_ANNOUNCE.replace(/\s+/g, ' ').trim());
  assert.equal(k.address.key, 'tadeusza kosciuszki|20|8');
  assert.equal(k.address.street, 'Tadeusza Kościuszki');
  assert.equal(k.address.building, '20');
  assert.equal(k.address.apt, '8');
  assert.equal(k.obreb, '6');

  const p = extractSubject(PLAC_NEG.replace(/\s+/g, ' ').trim());
  assert.equal(p.address.key, 'wolnosci|22|5A');
  assert.equal(p.address.street, 'Wolności');
  assert.equal(p.address.building, '22');
  assert.equal(p.address.apt, '5A');
});

test('extractSubject: plural "lokali mieszkalnych nr 5 i 7" (two flats sold as one lot) keys on the FIRST flat (nr 5)', () => {
  const s = extractSubject(normalizeBody(
    'odbył się trzeci przetarg ustny nieograniczony na zbycie lokali mieszkalnych nr 5 i 7, położonych w obrębie nr 3 miasta Kamienna Góra przy ul. Papieża Jana Pawła II 22.',
  ));
  assert.equal(s.address.key, 'papieza jana pawla ii|22|5');
  assert.equal(s.address.street, 'Papieża Jana Pawła II');
  assert.equal(s.address.building, '22');
  assert.equal(s.address.apt, '5');
});

test('extractStartingPrice: skips a "N/1000 udziałem" share fraction, and survives the 2023 "zł"-dropped render defect ("99 000,00 bru o")', () => {
  assert.equal(extractStartingPrice(normalizeBody(
    'Cena wywoławcza lokalu mieszkalnego nr 4 przy ul. Bohaterów Getta 19 z 139/1000 udziałem we współwłasności wynosi 100 500,00 zł brutto.',
  )), 100500);
  assert.equal(extractStartingPrice(normalizeBody(
    'Cena wywoławcza nieruchomości wynosiła: 99 000,00 bru o (słownie: dziewięćdziesiąt dziewięć tysięcy złotych).',
  )), 99000);
});

test('isFlatSaleSlug: keeps flat-sale przetarg slugs, rejects rent/lease/cancel and land/commercial/garage', () => {
  assert.equal(isFlatSaleSlug('iv-przetarg-ustny-nieograniczony-na-zbycie-lokalu-mieszkalnego-nr-5a-polozonego-w-kamiennej-gorze-przy-placu-wolnosci-22.html'), true);
  assert.equal(isFlatSaleSlug('iprzetarg-ustny-nieograniczony-nazbycie-lokalu-mieszkalnego-nr3-polozonego-wkamiennej-gorze.html'), true); // concatenated slug
  assert.equal(isFlatSaleSlug('i-przetarg-ustny-nieograniczony-na-najem-garazu-murowanego-przy-ul-spacerowa.html'), false); // rent
  assert.equal(isFlatSaleSlug('i-przetarg-ustny-nieograniczony-na-zbycie-nieruchomosci-gruntowej-polozonej.html'), false); // land
  assert.equal(isFlatSaleSlug('i-przetarg-ustny-nieograniczony-na-zbycie-lokalu-uzytkowego-polozonego.html'), false); // commercial
  assert.equal(isFlatSaleSlug('odwolanie-i-przetargu-ustnego-nieograniczonego-na-najem-garazu.html'), false); // cancelled
});

// ---------------------------------------------------- parseAnnouncement (active)

test('parseAnnouncement: Kościuszki 20/8 — round I, area, cena wywoławcza (skips "11,8%"), text-month auction+publication dates, address key', () => {
  const r = parseAnnouncement(KOSCIUSZKI_ANNOUNCE, 'https://bip.kamiennagora.pl/i-przetarg-...-kosciuszki-20.html');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.round, 1);
  assert.equal(r.area_m2, 48.45);
  assert.equal(r.starting_price_pln, 120000);
  assert.equal(r.auction_date, '2022-11-04');
  assert.equal(r.published_date, '2022-09-21');
  assert.equal(r.address.key, 'tadeusza kosciuszki|20|8');
  assert.equal(r.address.street, 'Tadeusza Kościuszki');
  assert.equal(r.address.building, '20');
  assert.equal(r.address.apt, '8');
  assert.equal(r.obreb, '6');
  assert.equal(r.detail_url, 'https://bip.kamiennagora.pl/i-przetarg-...-kosciuszki-20.html');
});

test('parseAnnouncement: Bohaterów Getta 19/4 — full-word "przy ulicy" street type, "w Kamiennej Górze" (obręb null), price skips the "139/1000" udział fraction', () => {
  const r = parseAnnouncement(BOHATEROW_ANNOUNCE, 'https://bip.kamiennagora.pl/462-i-przetarg-...-bohaterow-getta-19.html');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.round, 1);
  assert.equal(r.area_m2, 41.09);
  assert.equal(r.starting_price_pln, 100500);
  assert.equal(r.auction_date, '2022-08-02');
  assert.equal(r.published_date, '2022-06-20');
  assert.equal(r.address.key, 'bohaterow getta|19|4');
  assert.equal(r.address.street, 'Bohaterów Getta');
  assert.equal(r.address.building, '19');
  assert.equal(r.address.apt, '4');
  assert.equal(r.obreb, null);
});

// ---------------------------------------------------- parseResultDoc (achieved price)

test('parseResultDoc: Mostowej 6/10 SOLD — round II, achieved 39 400 zł, outcome sold, auction date from "w dniu" (12.12) NOT publication (20.12)', () => {
  const [r] = parseResultDoc(MOSTOWA_SOLD, null, 'https://bip.kamiennagora.pl/files/file_add/download/1897_ul-mostowa-6-10-ii-pozytywny.pdf');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.round, 2);
  assert.equal(r.area_m2, 17.35);
  assert.equal(r.starting_price_pln, 39000);
  assert.equal(r.final_price_pln, 39400);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.unsold_reason, null);
  assert.equal(r.auction_date, '2023-12-12');
  assert.equal(r.address.key, 'mostowej|6|10');
  assert.equal(r.source_pdf, 'https://bip.kamiennagora.pl/files/file_add/download/1897_ul-mostowa-6-10-ii-pozytywny.pdf');
});

test('parseResultDoc: Wiejskiej 4/17A SOLD — round I, achieved 51 510 zł, apt "17A", obręb stated without "nr"', () => {
  const [r] = parseResultDoc(WIEJSKA_SOLD, null, 'https://bip.kamiennagora.pl/x/1752.pdf');
  assert.equal(r.round, 1);
  assert.equal(r.area_m2, 21.05);
  assert.equal(r.starting_price_pln, 51000);
  assert.equal(r.final_price_pln, 51510);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.auction_date, '2023-10-26');
  assert.equal(r.address.key, 'wiejskiej|4|17A');
  assert.equal(r.address.apt, '17A');
  assert.equal(r.obreb, '5');
});

test('parseResultDoc: Kościuszki 20/8 NEGATIVE — round I, no final price, outcome unsold, SAME address key as its own announcement (the merge point)', () => {
  const [r] = parseResultDoc(KOSCIUSZKI_NEG, null, 'https://bip.kamiennagora.pl/x/744.pdf');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.round, 1);
  assert.equal(r.area_m2, 48.45);
  assert.equal(r.starting_price_pln, 120000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'negatywny');
  assert.equal(r.auction_date, '2022-11-04');
  assert.equal(r.address.key, 'tadeusza kosciuszki|20|8');
});

test('parseResultDoc: plac Wolności 22/5A NEGATIVE — round IV (word "czwartego"), "pl." address, 2025 auction date', () => {
  const [r] = parseResultDoc(PLAC_NEG, null, 'https://bip.kamiennagora.pl/x/3574.pdf');
  assert.equal(r.round, 4);
  assert.equal(r.area_m2, 12.95);
  assert.equal(r.starting_price_pln, 21000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.auction_date, '2025-09-03');
  assert.equal(r.address.key, 'wolnosci|22|5A');
  assert.equal(r.address.building, '22');
  assert.equal(r.address.apt, '5A');
});

test('parseResultDoc: an announcement PDF (not a result notice) returns []', () => {
  assert.deepEqual(parseResultDoc(KOSCIUSZKI_ANNOUNCE, null, 'x'), []);
});

test('parseResultDoc: empty/null input returns []', () => {
  assert.deepEqual(parseResultDoc('', null, 'x'), []);
  assert.deepEqual(parseResultDoc(null, null, 'x'), []);
});

// ----------------------------------------------------------- crawl discovery

test('parseYearIndex: keeps only flat-sale hrefs (absolute, deduped), drops numeric-prefix duplicates via URL, ignores rent/land/garage', () => {
  const html = `
    <a href="iv-przetarg-ustny-nieograniczony-na-zbycie-lokalu-mieszkalnego-nr-5a-przy-placu-wolnosci-22.html?">flat</a>
    <a href="1280-i-przetarg-ustny-nieograniczony-na-zbycie-lokalu-mieszkalnego-nr-5-papieza-jana-pawla-ii-22.html?">flat w/ id</a>
    <a href="i-przetarg-ustny-nieograniczony-na-najem-garazu-murowanego.html?">rent</a>
    <a href="i-przetarg-ustny-nieograniczony-na-zbycie-nieruchomosci-gruntowej.html?">land</a>
    <a href="2024.html">year nav</a>`;
  const urls = parseYearIndex(html);
  assert.equal(urls.length, 2);
  assert.ok(urls.every((u) => u.startsWith('https://bip.kamiennagora.pl/')));
  assert.ok(urls.some((u) => u.includes('placu-wolnosci-22')));
  assert.ok(urls.some((u) => u.includes('1280-i-przetarg')));
});

test('parseAttachmentUrls: extracts notice-PDF links absolute, skips floor plans (rzut) and images (png)', () => {
  const html = `
    <a href="files/file_add/download/609_ult-kosciuszki-208-przetarg-ustny-nieograniczony-ogloszenie.pdf">ogłoszenie</a>
    <a href="files/file_add/download/744_ul-t-kosciuszki-20-8-negatywny.pdf">wynik</a>
    <a href="files/file_add/download/608_rzut-t-kosciuszki-20-8.pdf">rzut</a>
    <a href="files/file_add/download/619_kosciuszki1.png">foto</a>`;
  const urls = parseAttachmentUrls(html);
  assert.equal(urls.length, 2);
  assert.ok(urls.includes('https://bip.kamiennagora.pl/files/file_add/download/609_ult-kosciuszki-208-przetarg-ustny-nieograniczony-ogloszenie.pdf'));
  assert.ok(urls.includes('https://bip.kamiennagora.pl/files/file_add/download/744_ul-t-kosciuszki-20-8-negatywny.pdf'));
});
