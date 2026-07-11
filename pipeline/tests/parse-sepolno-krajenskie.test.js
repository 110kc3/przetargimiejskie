// Sępólno Krajeńskie parser tests. Fixtures are condensed-but-faithful copies
// of REAL page/PDF text fetched live from bip.gmina-sepolno.pl (verified
// 2026-07-11 via this Pi, insecureTLS + browser UA). Long non-load-bearing
// boilerplate (RODO/GDPR block, generic wadium/płatność procedure, the
// publication-period footer) is trimmed; every sentence that feeds a parsed
// field (address, area, price, date, round, kind, outcome) is kept verbatim,
// including the pdftotext line breaks the address/date regexes rely on.
//
// The notice-page HTML fixtures reproduce the real extranet "BIP w JST" CMS
// skeleton confirmed live: <h1 class="pageHeader">, the structured inline
// metadata block of repeated
//   <div class="cct-page__name"> LABEL: </div>
//   <div class="cct-page__value"> VALUE </div>
// pairs, and the /download/attachment/<id>/<name> links.
//
// Groundtruth (hand-verified against the live pages/PDFs):
//   ul. Hallera 9/4 — lokal mieszkalny nr 4, pow. użytkowa 34,30 m², udział
//     31/294, KW BY2T/00020115/6, dz. 254 obr. 4:
//       announce  /2562  Rodzaj nieruchomości "lokal mieszkalny", cena wyw.
//                        98 900 zł, I przetarg, Data przetargu 11-10-2023
//       result    informacja-o-wyniku-przetargu-hallera.pdf — SOLD: cena
//                        osiągnięta 99 900 zł, nabywca Pani Joanna Jelińska
//   ul. Plac Wolności 14/1 — lokal mieszkalny nr 1, cena wyw. 69 300 zł:
//       result    informacja-o-wyniku-przetargu-plac-wolnosci.pdf — NEGATYWNY:
//                        cena osiągnięta "brak", nabywca "brak"
//   ul. Plac Wolności 14/2 — lokal użytkowy nr 2, pow. użytkowa 28,50 m²:
//       announce  /5301  Rodzaj nieruchomości "lokal użytkowy", cena wyw.
//                        70 000 zł, II przetarg, Data przetargu 12-09-2024;
//                        body self-reports "I przetarg odbył się w dniu
//                        26 marca 2024 r. i zakończył się wynikiem negatywnym."
//       result    9-informacja-o-wyniku-przetargu.pdf — SOLD: cena osiągnięta
//                        70 700 zł, nabywca Państwo Izabela i Dariusz Głazik
//   ul. Osiedle Słowackiego — zabudowana nieruchomość garażem: an area-named
//     site with NO civic street/building number (only działka nr 576) → the
//     address is correctly unparseable (null), a documented residual not a bug.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parsePLN,
  parseArea,
  roundFromTitle,
  parseDataPrzetargu,
  polishDateToIso,
  extractTitle,
  extractMetadata,
  extractAttachments,
  pickAnnouncementPdf,
  pickResultPdf,
  parseNotice,
  areaFromAnnouncement,
  parseResultDoc,
} from '../src/cities/sepolno-krajenskie/parse.js';

// ------------------------------------------------------------- HTML fixtures

// Build one notice page in the real "BIP w JST" skeleton. `meta` is an ordered
// array of [label, value]; `attNames` are the download-attachment file names.
function noticeHtml(title, meta, attNames) {
  const metaHtml = meta
    .map(
      ([label, value], i) =>
        `<div class="cct-page__attribute--${100 + i}">` +
        `<div class="cct-page__name"> ${label}: </div>` +
        `<div class="cct-page__value"> ${value} </div>` +
        `</div>`,
    )
    .join('\n');
  const attHtml = attNames
    .map(
      (name, i) =>
        `<span class="fileIcon fileIconPDF"></span>` +
        `<a href="https://bip.gmina-sepolno.pl/download/attachment/${1000 + i}/${name}" ` +
        `title="${name}" target="_blank">${name}</a>`,
    )
    .join('\n');
  return `<!doctype html><html><head><title>${title} - Urząd Miejski w Sępólnie Krajeńskim</title></head><body>
<h1 class="pageHeader">${title}</h1>
<div class="cct-page__attributes">
${metaHtml}
</div>
<p>${attHtml}</p>
</body></html>`;
}

const HALLERA_TITLE =
  'Ogłoszenie o przetargu ustnym nieograniczonym na sprzedaż prawa własności nieruchomości lokalowej przy ul. Hallera 9/4 w Sępólnie Krajeńskim';
// Real: this notice has NO "Adres nieruchomości" row — address comes from the title.
const HALLERA_HTML = noticeHtml(
  HALLERA_TITLE,
  [
    ['Rodzaj przetargu', 'przetarg ustny nieograniczony'],
    ['Rodzaj nieruchomości', 'lokal mieszkalny'],
    ['Cena wywoławcza', '98 900,00 zł'],
    ['Data przetargu', '11-10-2023'],
    ['Rok', '2023'],
  ],
  [
    '2-akt-ogloszenia-o-przetargu-h94.pdf',
    '2-zal-nr-1-mapa.pdf',
    '2-zal-nr-2-zgloszenie-do-udzialu-w-przetargu.pdf',
    '2-zal-nr-6-klauzula-rodo.pdf',
    'informacja-o-wyniku-przetargu-hallera.pdf',
  ],
);

const PL142_TITLE =
  'Ogłoszenie o II przetargu ustnym nieograniczonym na sprzedaż prawa własności nieruchomości lokalowej przy ul. Plac Wolności 14/2 w Sępólnie Krajeńskim';
const PL142_HTML = noticeHtml(
  PL142_TITLE,
  [
    ['Adres nieruchomości', 'ul. Plac Wolności 14/2, 89-400 Sępólno Krajeńskie'],
    ['Przetarg na', 'sprzedaż prawa własności nieruchomości'],
    ['Rodzaj przetargu', 'przetarg ustny nieograniczony'],
    ['Rodzaj nieruchomości', 'lokal użytkowy'],
    ['Cena wywoławcza', '70 000,00 zł'],
    ['Data przetargu', '12-09-2024'],
    ['Rok', '2024'],
  ],
  [
    '9-ogloszenie-o-ii-przetargu-podpisane.pdf',
    '9-zal-nr-1-mapa.pdf',
    '9-zal-nr-4-szkic-lokalu.pdf',
    '9-informacja-o-wyniku-przetargu.pdf',
  ],
);

// A land notice (działki) — a genuine SALE, but grunt-kind (out of the
// address-keyed listing scope; crawl.js skips it).
const TARTACZNA_TITLE =
  'Ogłoszenie o przetargu na sprzedaż nieruchomości gruntowych położonych przy ul. Tartacznej w Sępólnie Krajeńskim';
const TARTACZNA_HTML = noticeHtml(
  TARTACZNA_TITLE,
  [
    ['Rodzaj przetargu', 'przetarg ustny nieograniczony'],
    ['Rodzaj nieruchomości', 'działki niezabudowane'],
    ['Data przetargu', '23-06-2023'],
    ['Rok', '2023'],
  ],
  ['44-przetarg-na-sprzedaz-dz-za-weterynaria-ogloszenie.pdf', 'informacja-o-wynikach-przetargow.pdf'],
);

// A lease notice (dzierżawa) — NOT a sale; crawl.js excludes it.
const DZIERZAWA_TITLE =
  'Burmistrz Sępólna Krajeńskiego ogłasza I publiczny przetarg ustny ograniczony na dzierżawę nieruchomości położonych w Sępólnie Krajeńskim przeznaczonych pod miejsca płatnego parkowania';
const DZIERZAWA_HTML = noticeHtml(
  DZIERZAWA_TITLE,
  [
    ['Przetarg na', 'dzierżawa'],
    ['Rodzaj przetargu', 'przetarg ustny ograniczony'],
    ['Data przetargu', '15-05-2024'],
  ],
  ['dzierzawa-ogloszenie.pdf'],
);

// A garaż notice on an area-named site: "Adres nieruchomości" has no building
// number → address unparseable (the documented residual).
const GARAZ_TITLE =
  'Ogłoszenie o przetargu ustnym nieograniczonym na sprzedaż prawa własności zabudowanej nieruchomości garażem położonej przy ul. Osiedle Słowackiego w Sępólnie Krajeńskim';
const GARAZ_HTML = noticeHtml(
  GARAZ_TITLE,
  [
    ['Adres nieruchomości', 'ul. Osiedle Słowackiego w Sępólnie Krajeńskim'],
    ['Rodzaj przetargu', 'przetarg ustny nieograniczony'],
    ['Rodzaj nieruchomości', 'nieruchomość zabudowana garażem'],
    ['Cena wywoławcza', '29 670,00 zł'],
    ['Data przetargu', '13-09-2024'],
    ['Rok', '2024'],
  ],
  ['5-ogloszenie-o-przetargu-sprzedaz-garaz-slowackiego-podpisane.pdf', '5-informacja-o-wyniku-przetargu.pdf'],
);

// --------------------------------------------------------------- PDF fixtures

// Hallera 9/4 ogłoszenie (born-digital) — condensed, keeping the powierzchnia
// użytkowa line verbatim.
const HALLERA_ANNOUNCE_PDF = `BURMISTRZ SĘPÓLNA KRAJEŃSKIEGO
ogłasza przetarg ustny nieograniczony na sprzedaż prawa własności nieruchomości lokalowej – lokal mieszkalny położony w Sępólnie Krajeńskim
Sępólno Krajeńskie, ul. Hallera 9/4          lokal mieszkalny – położony jest na pierwszym piętrze
lokal mieszkalny nr 4 w budynku przy ul. Hallera 9 w Sępólnie Krajeńskim wraz
z udziałem w wysokości 31/294 części w nieruchomości wspólnej
lokal o powierzchni użytkowej 34,30 m2, składający się z: pokoju (18,66 m2), kuchni (8,54 m2), łazienki (3,72 m2), przedpokoju (2,15 m2), schowka (1,23 m2).
98 900,00 zł
PRZETARG NA SPRZEDAŻ WW. NIERUCHOMOŚCI ODBĘDZIE SIĘ W DNIU 11 PAŹDZIERNIKA 2023 R.`;

// Plac Wolności 14/2 II ogłoszenie — condensed; keeps the powierzchnia użytkowa
// line and the round-II self-report ("I przetarg ... wynikiem negatywnym").
const PL142_ANNOUNCE_PDF = `BURMISTRZ SĘPÓLNA KRAJEŃSKIEGO
ogłasza II przetarg ustny nieograniczony na sprzedaż prawa własności nieruchomości lokalowej – lokal użytkowy położony w Sępólnie Krajeńskim
Sępólno Krajeńskie, ul. Plac Wolności 14/2
lokal użytkowy nr 2 w budynku przy ul. Plac Wolności 14 w Sępólnie Krajeńskim wraz z udziałem w wysokości 29/258 części w nieruchomości wspólnej
lokal o powierzchni użytkowej 28,50 m2, składający się z: sali (12,30 m2), sali (14,63 m2), łazienki z WC (1,57 m2).
70 000,00 zł
PRZETARG NA SPRZEDAŻ WW. NIERUCHOMOŚCI ODBĘDZIE SIĘ W DNIU 12 WRZEŚNIA 2024 R.
I przetarg odbył się w dniu 26 marca 2024 r. i zakończył się wynikiem negatywnym.`;

// Hallera 9/4 informacja o wyniku (SOLD) — near-verbatim (the whole notice is
// short); the address header line-break is preserved for addressFromResult.
const HALLERA_RESULT_PDF = `INFORMACJA
o wyniku przetargu ustnego nieograniczonego na sprzedaż prawa własności
nieruchomości lokalowej – lokal mieszkalny położony w Sępólnie Krajeńskim,
ul. Hallera 9/4.

1. Data, miejsce i rodzaj przetargu:
przetarg ustny nieograniczony, przeprowadzony w dniu 11 października 2023 r. o godz. 10:00
w Urzędzie Miejskim w Sępólnie Krajeńskim, pokój nr 3;
2. Oznaczenie nieruchomości wg katastru i księgi wieczystej:
przedmiotem przetargu była sprzedaż prawa własności nieruchomości lokalowej – lokal
mieszkalny nr 4 położony przy ul. Hallera 9 w Sępólnie Krajeńskim wraz z udziałem
w wysokości 31/294 części w nieruchomości wspólnej, nieruchomość oznaczona geodezyjnie
jako działka nr 254, obr. 4 Sępólno Krajeńskie, powierzchnia działki wynosi: 0,0254 ha
opisanej w księdze wieczystej pod oznaczeniem: BY2T/00020115/6.
3. Liczba osób dopuszczonych do uczestnictwa w przetargu: 1
5. Cena wywoławcza nieruchomości: 98 900,00 zł
6. Najwyższa cena osiągnięta w przetargu: 99 900,00 zł
7. Nabywca nieruchomości: Pani Joanna Jelińska`;

// Plac Wolności 14/1 informacja o wyniku (NEGATYWNY) — "brak" on lines 6 + 7.
const PL141_RESULT_PDF = `INFORMACJA
o wyniku przetargu ustnego nieograniczonego na sprzedaż prawa własności
nieruchomości lokalowej – lokal mieszkalny położony w Sępólnie Krajeńskim,
ul. Plac Wolności 14/1.

1. Data, miejsce i rodzaj przetargu:
przetarg ustny nieograniczony, przeprowadzony w dniu 11 października 2023 r. o godz. 10:45
w Urzędzie Miejskim w Sępólnie Krajeńskim, pokój nr 3;
2. Oznaczenie nieruchomości wg katastru i księgi wieczystej:
przedmiotem przetargu była sprzedaż prawa własności nieruchomości lokalowej – lokal
mieszkalny nr 1 położony przy ul. Plac Wolności 14 w Sępólnie Krajeńskim wraz z udziałem
w wysokości 24/258 części w nieruchomości wspólnej.
3. Liczba osób dopuszczonych do uczestnictwa w przetargu: 0
5. Cena wywoławcza nieruchomości: 69 300,00 zł
6. Najwyższa cena osiągnięta w przetargu: brak
7. Nabywca nieruchomości: brak`;

// Plac Wolności 14/2 informacja o wyniku (SOLD, lokal użytkowy).
const PL142_RESULT_PDF = `INFORMACJA
o wyniku przetargu ustnego nieograniczonego na sprzedaż prawa własności
nieruchomości lokalowej – lokal użytkowy położony w Sępólnie Krajeńskim,
ul. Plac Wolności 14/2.

1. Data, miejsce i rodzaj przetargu:
przetarg ustny nieograniczony, przeprowadzony w dniu 12 września 2024 r. o godz. 10:00
w Urzędzie Miejskim w Sępólnie Krajeńskim, pokój nr 3;
2. Oznaczenie nieruchomości wg katastru i księgi wieczystej:
przedmiotem przetargu była sprzedaż prawa własności nieruchomości lokalowej – lokal
użytkowy nr 2 położony przy ul. Plac Wolności 14 w Sępólnie Krajeńskim wraz z udziałem
w wysokości 29/258 części w nieruchomości wspólnej.
5. Cena wywoławcza nieruchomości: 70 000,00 zł
6. Najwyższa cena osiągnięta w przetargu: 70 700,00 zł
7. Nabywca nieruchomości: Państwo Izabela i Dariusz Głazik`;

// ------------------------------------------------------------------ unit funcs

test('parsePLN: space-thousands with and without a trailing "zł"', () => {
  assert.equal(parsePLN('98 900,00 zł'), 98900);
  assert.equal(parsePLN('78 100,00'), 78100);
  assert.equal(parsePLN('29 670,00 zł'), 29670);
  assert.equal(parsePLN('1 234 567,00 zł'), 1234567);
  assert.equal(parsePLN('brak'), null);
  assert.equal(parsePLN(null), null);
});

test('parseArea: comma and dot decimals', () => {
  assert.equal(parseArea('34,30'), 34.3);
  assert.equal(parseArea('28,50'), 28.5);
  assert.equal(parseArea('0,0254'), 0.0254);
});

test('roundFromTitle: roman-before-"przetarg", bare title = round 1', () => {
  assert.equal(roundFromTitle(HALLERA_TITLE), 1);
  assert.equal(roundFromTitle(PL142_TITLE), 2);
  assert.equal(roundFromTitle('Ogłoszenie o III przetargu ustnym nieograniczonym'), 3);
});

test('parseDataPrzetargu: DD-MM-YYYY → ISO; malformed → null', () => {
  assert.equal(parseDataPrzetargu('11-10-2023'), '2023-10-11');
  assert.equal(parseDataPrzetargu('12-09-2024'), '2024-09-12');
  assert.equal(parseDataPrzetargu('brak'), null);
});

test('polishDateToIso: spelled-out Polish month with diacritics (pdftotext output)', () => {
  assert.equal(polishDateToIso('11 października 2023'), '2023-10-11');
  assert.equal(polishDateToIso('12 września 2024'), '2024-09-12');
  assert.equal(polishDateToIso('26 marca 2024'), '2024-03-26');
});

// ------------------------------------------------------------ HTML structure

test('extractTitle / extractMetadata / extractAttachments: real "BIP w JST" skeleton', () => {
  assert.equal(extractTitle(HALLERA_HTML), HALLERA_TITLE);
  const meta = extractMetadata(HALLERA_HTML);
  assert.equal(meta['Rodzaj nieruchomości'], 'lokal mieszkalny');
  assert.equal(meta['Cena wywoławcza'], '98 900,00 zł');
  assert.equal(meta['Data przetargu'], '11-10-2023');
  assert.equal(meta['Rok'], '2023');
  const atts = extractAttachments(HALLERA_HTML);
  assert.equal(atts.length, 5);
  assert.ok(atts.every((a) => a.url.startsWith('https://bip.gmina-sepolno.pl/download/attachment/')));
});

test('pickAnnouncementPdf / pickResultPdf: ogłoszenie vs annex vs "informacja o wyniku"', () => {
  const atts = extractAttachments(HALLERA_HTML);
  assert.match(pickAnnouncementPdf(atts), /2-akt-ogloszenia-o-przetargu-h94\.pdf$/);
  assert.match(pickResultPdf(atts), /informacja-o-wyniku-przetargu-hallera\.pdf$/);
  // "podpisane" naming variant + numeric-prefixed result file:
  const atts2 = extractAttachments(PL142_HTML);
  assert.match(pickAnnouncementPdf(atts2), /9-ogloszenie-o-ii-przetargu-podpisane\.pdf$/);
  assert.match(pickResultPdf(atts2), /9-informacja-o-wyniku-przetargu\.pdf$/);
});

// -------------------------------------------------------------- parseNotice

test('parseNotice: Hallera 9/4 flat — kind/price/date from metadata, address from title (no "Adres" row)', () => {
  const n = parseNotice(HALLERA_HTML, 'https://bip.gmina-sepolno.pl/2562/405/x.html');
  assert.equal(n.is_sale, true);
  assert.equal(n.kind, 'mieszkalny');
  assert.equal(n.round, 1);
  assert.equal(n.address.street, 'Hallera');
  assert.equal(n.address.building, '9');
  assert.equal(n.address.apt, '4');
  assert.equal(n.address.key, 'hallera|9|4');
  assert.equal(n.starting_price_pln, 98900);
  assert.equal(n.auction_date, '2023-10-11');
  assert.equal(n.published_year, 2023);
  assert.match(n.announcementPdf, /akt-ogloszenia-o-przetargu-h94\.pdf$/);
  assert.match(n.resultPdf, /informacja-o-wyniku-przetargu-hallera\.pdf$/);
});

test('parseNotice: Plac Wolności 14/2 — lokal użytkowy classifies "uzytkowy", round II, address from "Adres nieruchomości" metadata (a Plac/square + zip suffix)', () => {
  const n = parseNotice(PL142_HTML, 'https://bip.gmina-sepolno.pl/5301/405/x.html');
  assert.equal(n.is_sale, true);
  assert.equal(n.kind, 'uzytkowy');
  assert.equal(n.round, 2);
  assert.equal(n.address.street, 'Plac Wolności');
  assert.equal(n.address.building, '14');
  assert.equal(n.address.apt, '2');
  assert.equal(n.address.key, 'plac wolnosci|14|2');
  assert.equal(n.starting_price_pln, 70000);
  assert.equal(n.auction_date, '2024-09-12');
});

test('parseNotice: land (działki niezabudowane) is a SALE but classifies "grunt" (crawl.js skips grunt from listings)', () => {
  const n = parseNotice(TARTACZNA_HTML, 'https://bip.gmina-sepolno.pl/1740/405/x.html');
  assert.equal(n.is_sale, true);
  assert.equal(n.kind, 'grunt');
});

test('parseNotice: lease (dzierżawa) is NOT a sale — excluded regardless of kind', () => {
  const n = parseNotice(DZIERZAWA_HTML, 'https://bip.gmina-sepolno.pl/8463/405/x.html');
  assert.equal(n.is_sale, false);
});

test('parseNotice: garaż on an area-named site (no building number) → address null (documented residual)', () => {
  const n = parseNotice(GARAZ_HTML, 'https://bip.gmina-sepolno.pl/5307/405/x.html');
  assert.equal(n.is_sale, true);
  assert.equal(n.kind, 'garaz');
  assert.equal(n.address, null);
  assert.equal(n.starting_price_pln, 29670);
});

// ---------------------------------------------------------- areaFromAnnouncement

test('areaFromAnnouncement: "powierzchni użytkowej 34,30 m2" / "28,50 m2" from the born-digital ogłoszenie', () => {
  assert.equal(areaFromAnnouncement(HALLERA_ANNOUNCE_PDF), 34.3);
  assert.equal(areaFromAnnouncement(PL142_ANNOUNCE_PDF), 28.5);
});

// ------------------------------------------------------------- parseResultDoc

test('parseResultDoc: Hallera 9/4 SOLD — cena wyw. 98 900 → osiągnięta 99 900, nabywca present, date from spelled-out month', () => {
  const [r] = parseResultDoc(HALLERA_RESULT_PDF, '2023-10-11', 'https://bip.gmina-sepolno.pl/download/attachment/4473/informacja-o-wyniku-przetargu-hallera.pdf');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'hallera|9|4');
  assert.equal(r.starting_price_pln, 98900);
  assert.equal(r.final_price_pln, 99900);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.unsold_reason, null);
  assert.equal(r.auction_date, '2023-10-11');
  assert.match(r.source_pdf, /informacja-o-wyniku-przetargu-hallera\.pdf$/);
});

test('parseResultDoc: Plac Wolności 14/1 NEGATYWNY — "brak" on lines 6+7 → unsold, no fabricated final price', () => {
  const [r] = parseResultDoc(PL141_RESULT_PDF, '2023-10-11', 'PL141');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'plac wolnosci|14|1');
  assert.equal(r.starting_price_pln, 69300);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'wynik negatywny');
  assert.equal(r.auction_date, '2023-10-11');
});

test('parseResultDoc: Plac Wolności 14/2 SOLD lokal użytkowy — cena osiągnięta 70 700, multi-word buyer name', () => {
  const [r] = parseResultDoc(PL142_RESULT_PDF, '2024-09-12', 'PL142');
  assert.equal(r.kind, 'uzytkowy');
  assert.equal(r.address.key, 'plac wolnosci|14|2');
  assert.equal(r.starting_price_pln, 70000);
  assert.equal(r.final_price_pln, 70700);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.auction_date, '2024-09-12');
});

test('parseResultDoc: a non-result document and empty input both return []', () => {
  assert.deepEqual(parseResultDoc('Ogłoszenie o przetargu na sprzedaż lokalu mieszkalnego.', null, 'x'), []);
  assert.deepEqual(parseResultDoc('', null, 'x'), []);
  assert.deepEqual(parseResultDoc(null, null, 'x'), []);
});
