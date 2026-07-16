// Włocławek parser tests. Fixtures are condensed-but-faithful copies of REAL
// page/doc text fetched live from bip.wloclawek.eu (verified 2026-07-16 via
// this Pi, plain bot UA — no insecureTLS/browser-UA needed). Long
// non-load-bearing boilerplate (the numbered participation-conditions list,
// the RODO/GDPR-style footer, the repeated "Bliższych informacji..." contact
// block) is trimmed; every sentence that feeds a parsed field (address, area,
// price, date, round, kind, outcome, buyer) is kept verbatim, including the
// real line breaks / spacing quirks the regexes rely on.
//
// The notice-page HTML fixtures reproduce the real extranet "BIP w JST" CMS
// skeleton confirmed live: <h1 class="pageHeader">, the structured inline
// metadata block of repeated
//   <div class="cct-page__attribute cct-page__attribute--NNN">
//     <div class="cct-page__name"> LABEL: </div>
//     <div class="cct-page__value"> VALUE </div>
//   </div>
// pairs (the SAME skeleton as sepolno-krajenskie/bip.gmina-sepolno.pl — this
// city runs the same CMS vendor), and the /download/attachment/<id>/<name>
// links.
//
// Groundtruth (hand-verified against the live pages/docs, 2026-07-16):
//   Kilińskiego 12A/1 — lokal mieszkalny nr 1, pow. 40,70 m², udział 407/3568,
//     KW WL1W/00043190/6, dz. 7/1 KM 45:
//       announce (III)  /6939  Rodzaj nieruchomości "Lokale mieszkalne", cena
//                        wyw. 110 270 zł, Data przetargu 24-04-2024, self-report
//                        "I ... 12 czerwca 2023 ... wynikiem negatywnym. II ...
//                        13 listopada 2023 ... wynikiem negatywnym."
//       announce (II)   /3615  Status Realizacji "Nieroztrzygnięte", Data
//                        przetargu 13-11-2023, NO result attachment (checked
//                        live — unresolved rounds on this board never carry
//                        one; see config.js KNOWN LIMITATION).
//       result          informacja-o-wyniku-przetargu-kilinskiego-12a-m-1.docx
//                        (the "dokument dostępny cyfrowo" DOCX twin; its PDF
//                        sibling wynik-przetarg-kilinskiego.pdf turns out to be
//                        SCANNED too — pdfinfo Creator "RICOH MP 3555", a
//                        copier; pdftotext yields only \f — the DOCX is the
//                        ONLY born-digital source for this fixture) — SOLD:
//                        cena wywoławcza 110 270 zł, wylicytowana 111 380 zł,
//                        nabywca Pan Adam Kuliński.
//   Jagiellońska 2/4 — udział 271/350 części zabudowanej budynkiem mieszkalnym
//     nieruchomości, dz. 53/5 KM 49/1:
//       announce (III)  /4446  metadata "Rodzaj nieruchomości: Nieruchomości
//                        niezabudowane" (the CMS's own coarse board-filter
//                        category is WRONG here — the title clearly reads
//                        "...zabudowanej budynkiem mieszkalnym..."; classifyKind
//                        on metadata+title resolves this correctly via its
//                        BUILT_RE guard), cena wyw. netto 83 250 zł, Data
//                        przetargu 18-12-2023, self-report "Pierwszy ... 24
//                        lipca 2023 ... wynikiem negatywnym. Drugi ... 18
//                        września 2023 ... wynikiem negatywnym."
//       result          informacja-o-rozstrzygnietym-przetargu-...-dokument-
//                        dostepny-cyfrowo.pdf — labelled "dostępny cyfrowo" but
//                        is in fact a SCANNED image PDF (pdftotext -> a single
//                        \f byte, the documented scanned-PDF gotcha); OCR'd
//                        (core/ocr-pdf.js, tesseract -l pol) — SOLD: cena
//                        wywoławcza netto 83 250 zł, wylicytowana netto
//                        84 100 zł, nabywca "KA-BO Borkowski Spółka
//                        Komandytowa" (a COMPANY, not "Pan/Pani" — the buyer
//                        regex must not assume a person). The OCR'd text is
//                        terse enough ("sprzedaż nieruchomości ... działka nr
//                        53/5 ... o pow. 0,0209 ha", no "zabudowan"/"udział"
//                        repeated) that classifyKind() alone reads 'grunt' —
//                        parseResultDoc's resultKind() override (a resolved
//                        civic address => not bare land on this board) fixes
//                        it to 'zabudowana'.
//       LOAD-BEARING GOTCHA (caught only by testing against these real
//       fixtures): BOTH result docs mention the auction VENUE's address ("ul.
//       3 Maja 22") before the property's own address — a naive "first ul."
//       match grabs the venue (and in Kilińskiego's fixture, with no comma
//       terminating that clause, swallows the entire following sentence and
//       fails to parse at all). addressFromResult() anchors on "położonego/
//       położonej ... przy ul." instead.
//   Kruszyńska 1A — a LEASE (najem) notice, not a sale: excluded regardless of
//     kind. Its "Cena wywoławcza" metadata field is repurposed to describe the
//     WADIUM instead of a price (a real data quirk on this board) — harmless
//     since the notice never reaches price parsing.
//   Real board titles (Skarb Państwa land, plain gmina land, dzierżawa) confirm
//     the Skarb Państwa / grunt / lease exclusions at the title level.

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
  pickResultAttachment,
  addressRawFromNotice,
  areaFromBody,
  parseNotice,
  parseResultDoc,
} from '../src/cities/wloclawek/parse.js';

// ------------------------------------------------------------- HTML fixtures

// Build one notice page in the real "BIP w JST" skeleton. `meta` is an ordered
// array of [label, value]; `attachments` is an ordered array of
// [attId, filename]; `bodyExtra` is the load-bearing tail of the body prose
// (area sentence, prior-round self-report).
function noticeHtml(title, meta, attachments, bodyExtra) {
  const metaHtml = meta
    .map(
      ([label, value], i) =>
        `<div class="cct-page__attribute cct-page__attribute--${210 + i * 3}">` +
        `<div class="cct-page__name">\n${label}:\n</div>` +
        `<div class="cct-page__value">\n${value}                </div>` +
        `</div>`,
    )
    .join('\n');
  const attHtml = attachments
    .map(
      ([id, name]) =>
        `<span class="fileIcon fileIconPDF"></span>` +
        `<a href="https://bip.wloclawek.eu/download/attachment/${id}/${name}" ` +
        `title="${name}" target="_blank">${name}</a>`,
    )
    .join('\n');
  return `<!doctype html><html><head><title>${title} - Urząd Miasta we Włocławku</title></head><body>
<h1 class="pageHeader">${title}</h1>
<div id="webreaderContainer"></div>
<div class="bip-page__content">
<div class="cct-page template-bip">
${metaHtml}
</div>
<p>${bodyExtra || ''}</p>
<p>${attHtml}</p>
</div>
<div class="bip-page__footer"></div>
</body></html>`;
}

const KIL_III_TITLE =
  'III przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 1 stanowiącego własność Gminy Miasto Włocławek, położonego w budynku przy ul. Kilińskiego 12A we Włocławku, usytuowanego na dz. nr 7/1, KM 45, o łącznej pow. 0,0260 ha.';
const KIL_III_HTML = noticeHtml(
  KIL_III_TITLE,
  [
    ['Typ przetargu', 'Przetarg ustny nieograniczony'],
    ['Rodzaj nieruchomości', 'Lokale mieszkalne'],
    ['Rok publikacji', '2024'],
    ['Status Realizacji', 'Aktualne'],
    ['Data przetargu', '24-04-2024'],
    ['Godzina przetargu', '11:00'],
    ['Adres nieruchomości', 'ul. Kilińskiego 12A we Włocławku'],
    [
      'Cena wywoławcza',
      '110 270,00 zł. Sprzedaż lokalu mieszkalnego zwolniona jest z podatku od towarów i usług na podstawie art. 43 ust. 1 pkt 10 ustawy z dnia 11 marca 2004 r. o podatku od towarów i usług ( Dz. U. z 2023 r. poz. 1570 z późn. zm.).<br />\nWadium wynosi 10 000,00 zł.<br />',
    ],
  ],
  [
    ['14811', 'wynik-przetarg-kilinskiego.pdf'],
    ['14808', 'informacja-o-wyniku-przetargu-kilinskiego-12a-m-1.docx'],
  ],
  'Przedmiotowy lokal położony jest na parterze budynku, o powierzchni 40,70 m², składa się z 2 pokoi o pow. 13,50 m² oraz o pow. 11,28 m², kuchni o pow. 7,59 m², łazienki z WC o pow. 3,27 m², kotłowni o pow. 1,49 m² oraz przedpokoju o pow. 3,57 m². Lokal wyposażony jest w instalację elektryczną i wodno – kanalizacyjną. Udział w nieruchomości wspólnej 407/3568.</p> <p>I przetarg ustny nieograniczony na sprzedaż przedmiotowej nieruchomości miał miejsce w dniu 12 czerwca 2023 r. i zakończył się wynikiem negatywnym. II przetarg na sprzedaż przedmiotowej nieruchomości miał miejsce w dniu 13 listopada 2023 r. i zakończył się wynikiem negatywnym.',
);

const KIL_II_TITLE =
  'II przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 1 stanowiącego własność Gminy Miasto Włocławek, położonego w budynku przy ul. Kilińskiego 12A we Włocławku, usytuowanego na dz. nr 7/1, KM 45, o łącznej pow. 0,0260 ha.';
const KIL_II_HTML = noticeHtml(
  KIL_II_TITLE,
  [
    ['Typ przetargu', 'Przetarg ustny nieograniczony'],
    ['Rodzaj nieruchomości', 'Lokale mieszkalne'],
    ['Rok publikacji', '2023'],
    ['Status Realizacji', 'Nieroztrzygnięte'],
    ['Data przetargu', '13-11-2023'],
    ['Godzina przetargu', '12:00'],
    [
      'Adres nieruchomości',
      'ul. Kilińskiego 12A we Włocławku, usytuowanego na dz. nr 7/1, KM 45, o łącznej pow. 0,0260 ha.',
    ],
    ['Cena wywoławcza', '110 270,00 zł, Wadium wynosi 10 000,00 zł.'],
  ],
  [], // Nieroztrzygnięte -> no result attachment (checked live, see config.js)
  'Pierwszy przetarg ustny nieograniczony na sprzedaż przedmiotowej nieruchomości miał miejsce w dniu 12 czerwca 2023 r. i zakończył się wynikiem negatywnym.',
);

const JAG_III_TITLE =
  'III przetarg ustny nieograniczony na sprzedaż udziału w wysokości 271/350 części zabudowanej budynkiem mieszkalnym nieruchomości oznaczonej jako działka ewidencyjna nr 53/5 o powierzchni 0,0209 ha w obrębie Włocławek KM 49/1 położonej we Włocławku przy ul. Jagiellońskiej 2/4, stanowiącego własność Gminy Miasto Włocławek.';
const JAG_III_HTML = noticeHtml(
  JAG_III_TITLE,
  [
    ['Typ przetargu', 'Przetarg ustny nieograniczony'],
    ['Rodzaj nieruchomości', 'Nieruchomości niezabudowane'], // CMS mis-tag — see header comment
    ['Rok publikacji', '2023'],
    ['Status Realizacji', 'Roztrzygnięte'],
    ['Data przetargu', '18-12-2023'],
    ['Godzina przetargu', '12:30'],
    ['Adres nieruchomości', 'ul. Jagiellońskiej 2/4'],
    ['Cena wywoławcza', 'Cena netto wynosi – 83 250,00 zł.<br />\nWadium w wysokości 10% ceny wywoławczej netto wynosi – 8 325,00 zł<br />'],
  ],
  [['9726', 'informacja-o-rozstrzygnietym-przetargu-uljagiellonskiej-2_4-dokument-dostepny-cyfrowo.pdf']],
  'Pierwszy przetarg ustny nieograniczony na sprzedaż przedmiotowej nieruchomości miał miejsce w dniu 24 lipca 2023 r. i zakończył się wynikiem negatywnym. Drugi przetarg ustny nieograniczony na sprzedaż przedmiotowej nieruchomości miał miejsce w dniu 18 września 2023 r. i zakończył się wynikiem negatywnym.',
);

// A LEASE (najem) notice — NOT a sale; excluded regardless of kind. Its "Cena
// wywoławcza" field is repurposed to describe the wadium (a real data quirk).
const KRUSZYNSKA_TITLE =
  'II przetarg ustny nieograniczony na najem lokalu użytkowego, stanowiącego własność Gminy Miasto Włocławek, o powierzchni użytkowej 82,27 m², położonego we Włocławku przy ul. Kruszyńskiej 1A.';
const KRUSZYNSKA_HTML = noticeHtml(
  KRUSZYNSKA_TITLE,
  [
    ['Typ przetargu', 'Przetarg ustny nieograniczony'],
    ['Rodzaj nieruchomości', 'Najem lokali niemieszkalnych'],
    ['Status Realizacji', 'Aktualne'],
    ['Data przetargu', '11-02-2026'],
    ['Adres nieruchomości', 'ul. Kruszyńskiej 1A, dz. nr 3/10 o powierzchni 0,0447 ha, obręb Włocławek KM 79/1.'],
    ['Cena wywoławcza', 'Wadium w wysokości 54,79 zł, stanowiącego 20% ceny wywoławczej netto'],
  ],
  [['30666', 'przetarg-kruszynska-1a.pdf']],
  '',
);

// Real board titles (2026-07-16) confirming exclusions at the title level.
const SKARB_PANSTWA_TITLE =
  'I przetarg ustny ograniczony na sprzedaż nieruchomości gruntowej, stanowiącej własność Skarbu Państwa, położonej we Włocławku przy ul. Duninowskiej.';
const DZIERZAWA_TITLE =
  'I przetarg ustny nieograniczony na wydzierżawienie nw. nieruchomości, stanowiącej własność Gminy Miasto Włocławek, położonej we Włocławku przy ul. Energetyków.';
const GRUNT_TITLE =
  'I przetarg ustny nieograniczony na sprzedaż nieruchomości niezabudowanej stanowiącej własność Gminy Miasto Włocławek, oznaczonej jako działka ewidencyjna nr 12/9, położonej we Włocławku przy ul. Papieżka.';

// --------------------------------------------------------------- result-doc text

// Kilińskiego 12A/1 result — real DOCX text (word/document.xml unzip, matching
// core/doc-text.js's own extraction; verbatim except the trailing blank-line
// run before "KG\nUID: 1171557" is condensed).
const KIL_RESULT_DOCX = `Włocławek, 8 maja 2024 r.

PREZYDENT MIASTA WŁOCŁAWEK

Zgodnie z § 12 Rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości (Dz. U. z 2021 r. poz. 2213).

INFORMUJE

	W dniu 24 kwietnia 2024 r. w siedzibie Urzędu Miasta Włocławek przy ul. 3 Maja 22 odbył się III przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 1 stanowiącego własność Gminy Miasto Włocławek, położonego w budynku przy ul. Kilińskiego 12A we Włocławku, usytuowanego na dz. nr 7/1, KM 45, o łącznej pow. 0,0260 ha. Dla ww. nieruchomości w Sądzie Rejonowym we Włocławku w Wydziale VI Ksiąg Wieczystych, prowadzona jest księga wieczysta nr WL1W/00043190/6.
Lista osób, które wpłaciły wadium: 1
Lista osób, które zostały dopuszczone do przetargu: 1
Cena wywoławcza nieruchomości: 110 270,00 zł
Wylicytowana cena nieruchomości: 111 380,00 zł
Nabywcą nieruchomości został Pan Adam Kuliński.

KG
UID: 1171557`;

// Jagiellońska 2/4 result — real OCR text (tesseract -l pol on the 300 DPI
// raster; verbatim, including the "$ 12"/"Ill przetarg" OCR misreads pdftotext
// would never produce — proof this really is the OCR path, not pdftotext).
const JAG_RESULT_OCR = `Włocławek, 27 grudnia 2023 r.

PREZYDENT MIASTA WŁOCŁAWEK

Zgodnie z $ 12 rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu i trybu
przeprowadzania przetargów oraz rokowań na zbycie nieruchomości
(t.j. Dz. U. z 2021 r. poz. 2213)

a

INFORMUJE

W dniu 18 grudnia 2023 r. w siedzibie Urzędu Miasta Włocławek ul. 3 Maja 22, w sali nr 9, odbył
się Ill przetarg ustny nieograniczony na sprzedaż nieruchomości, stanowiącej własność Gminy

Miasto Włocławek, położonej we Włocławku przy ul. Jagiellońskiej 2/4, oznaczonej jako działka nr 53/5
(Włocławek KM 49/1) o pow. 0,0209 ha.

Liczba osób dopuszczonych do przetargu — 1.
Liczba osób niedopuszczonych do przetargu — 0.

Cena netto wywoławcza nieruchomości: 83 250,00 zł.
Wylicytowana cena netto nieruchomości: 84 100,00 zł.
Nabywcą nieruchomości została - KA-BO Borkowski Spółka Komandytowa.`;

// ------------------------------------------------------------------ unit funcs

test('parsePLN: space-thousands with and without a trailing "zł"', () => {
  assert.equal(parsePLN('110 270,00 zł'), 110270);
  assert.equal(parsePLN('83 250,00'), 83250);
  assert.equal(parsePLN('1 234 567,00 zł'), 1234567);
  assert.equal(parsePLN('brak'), null);
  assert.equal(parsePLN(null), null);
});

test('parseArea: comma decimals', () => {
  assert.equal(parseArea('40,70'), 40.7);
  assert.equal(parseArea('0,0209'), 0.0209);
});

test('roundFromTitle: roman-before-"przetarg", bare title = round 1', () => {
  assert.equal(roundFromTitle(KIL_III_TITLE), 3);
  assert.equal(roundFromTitle(KIL_II_TITLE), 2);
  assert.equal(roundFromTitle('Ogłoszenie o przetargu ustnym nieograniczonym'), 1);
});

test('parseDataPrzetargu: DD-MM-YYYY -> ISO; malformed -> null', () => {
  assert.equal(parseDataPrzetargu('24-04-2024'), '2024-04-24');
  assert.equal(parseDataPrzetargu('18-12-2023'), '2023-12-18');
  assert.equal(parseDataPrzetargu('brak'), null);
});

test('polishDateToIso: spelled-out Polish month with diacritics', () => {
  assert.equal(polishDateToIso('24 kwietnia 2024'), '2024-04-24');
  assert.equal(polishDateToIso('18 grudnia 2023'), '2023-12-18');
});

// ------------------------------------------------------------ HTML structure

test('extractTitle / extractMetadata / extractAttachments: real "BIP w JST" skeleton', () => {
  assert.equal(extractTitle(KIL_III_HTML), KIL_III_TITLE);
  const meta = extractMetadata(KIL_III_HTML);
  assert.equal(meta['Rodzaj nieruchomości'], 'Lokale mieszkalne');
  assert.equal(meta['Status Realizacji'], 'Aktualne');
  assert.equal(meta['Data przetargu'], '24-04-2024');
  assert.equal(meta['Rok publikacji'], '2024');
  const atts = extractAttachments(KIL_III_HTML);
  assert.equal(atts.length, 2);
  assert.ok(atts.every((a) => a.url.startsWith('https://bip.wloclawek.eu/download/attachment/')));
});

test('pickResultAttachment: prefers the .docx twin over the .pdf when both exist', () => {
  const atts = extractAttachments(KIL_III_HTML);
  assert.match(pickResultAttachment(atts), /informacja-o-wyniku-przetargu-kilinskiego-12a-m-1\.docx$/);
});

test('pickResultAttachment: "rozstrzygniętym" naming variant (no "wynik" substring), pdf-only', () => {
  const atts = extractAttachments(JAG_III_HTML);
  assert.match(pickResultAttachment(atts), /dokument-dostepny-cyfrowo\.pdf$/);
});

test('pickResultAttachment: no matching attachment -> null (Kilińskiego II round)', () => {
  assert.equal(pickResultAttachment(extractAttachments(KIL_II_HTML)), null);
});

// -------------------------------------------------------------- addressRawFromNotice

test('addressRawFromNotice: "Adres nieruchomości" omits the lokal unit — combined with the title\'s "lokal ... nr N"', () => {
  const meta = extractMetadata(KIL_III_HTML);
  assert.equal(addressRawFromNotice(meta, KIL_III_TITLE), 'Kilińskiego 12A/1');
});

test('addressRawFromNotice: Adres field with trailing cadastral clause is trimmed before combining', () => {
  const meta = extractMetadata(KIL_II_HTML);
  assert.equal(addressRawFromNotice(meta, KIL_II_TITLE), 'Kilińskiego 12A/1');
});

test('addressRawFromNotice: a compound building number ("2/4") already carries a slash — no lokal nr appended', () => {
  const meta = extractMetadata(JAG_III_HTML);
  assert.equal(addressRawFromNotice(meta, JAG_III_TITLE), 'Jagiellońskiej 2/4');
});

// ---------------------------------------------------------------- areaFromBody

test('areaFromBody: "o powierzchni 40,70 m², składa się z ..." from the notice body prose', () => {
  assert.equal(areaFromBody(KIL_III_HTML), 40.7);
});

// -------------------------------------------------------------- parseNotice

test('parseNotice: Kilińskiego 12A/1 III round — flat, price/date/area from metadata+body, address combines Adres+lokal-nr', () => {
  const n = parseNotice(KIL_III_HTML, 'https://bip.wloclawek.eu/6939/726/x.html');
  assert.equal(n.is_sale, true);
  assert.equal(n.kind, 'mieszkalny');
  assert.equal(n.round, 3);
  assert.equal(n.address.key, 'kilinskiego|12A|1');
  assert.equal(n.starting_price_pln, 110270);
  assert.equal(n.auction_date, '2024-04-24');
  assert.equal(n.area_m2, 40.7);
  assert.equal(n.published_year, 2024);
  assert.match(n.resultDocUrl, /informacja-o-wyniku-przetargu-kilinskiego-12a-m-1\.docx$/);
});

test('parseNotice: Kilińskiego 12A/1 II round — Nieroztrzygnięte, no result attachment (documented v1 limitation)', () => {
  const n = parseNotice(KIL_II_HTML, 'https://bip.wloclawek.eu/3615/726/x.html');
  assert.equal(n.is_sale, true);
  assert.equal(n.kind, 'mieszkalny');
  assert.equal(n.round, 2);
  assert.equal(n.resultDocUrl, null);
});

test('parseNotice: Jagiellońska 2/4 — udział sale classifies "zabudowana" despite the CMS mis-tagging metadata "Rodzaj nieruchomości" as niezabudowane', () => {
  const n = parseNotice(JAG_III_HTML, 'https://bip.wloclawek.eu/4446/726/x.html');
  assert.equal(n.is_sale, true);
  assert.equal(n.kind, 'zabudowana');
  assert.equal(n.round, 3);
  assert.equal(n.address.key, 'jagiellonskiej|2|4');
  assert.equal(n.starting_price_pln, 83250);
  assert.equal(n.auction_date, '2023-12-18');
});

test('parseNotice: Kruszyńska 1A najem (lease) — NOT a sale, excluded regardless of kind or the repurposed "Cena wywoławcza" field', () => {
  const n = parseNotice(KRUSZYNSKA_HTML, 'https://bip.wloclawek.eu/19188/726/x.html');
  assert.equal(n.is_sale, false);
});

test('parseNotice: Skarb Państwa ownership is excluded from is_sale even though the title says "sprzedaż"', () => {
  const n = parseNotice(noticeHtml(SKARB_PANSTWA_TITLE, [], [], ''), 'https://bip.wloclawek.eu/x/726/x.html');
  assert.equal(n.is_sale, false);
});

test('parseNotice: dzierżawa (land lease) is NOT a sale', () => {
  const n = parseNotice(noticeHtml(DZIERZAWA_TITLE, [], [], ''), 'https://bip.wloclawek.eu/x/726/x.html');
  assert.equal(n.is_sale, false);
});

test('parseNotice: plain gmina land (niezabudowana, no Skarb Państwa) IS a sale but classifies "grunt" (crawl.js\'s LISTING_KINDS skips grunt)', () => {
  const n = parseNotice(noticeHtml(GRUNT_TITLE, [], [], ''), 'https://bip.wloclawek.eu/x/726/x.html');
  assert.equal(n.is_sale, true);
  assert.equal(n.kind, 'grunt');
});

// ------------------------------------------------------------- parseResultDoc

test('parseResultDoc: Kilińskiego 12A/1 SOLD (docx) — venue address ("ul. 3 Maja 22") correctly skipped in favor of the property\'s own "położonego ... ul." clause', () => {
  const [r] = parseResultDoc(KIL_RESULT_DOCX, '2024-04-24', 'https://bip.wloclawek.eu/download/attachment/14808/informacja-o-wyniku-przetargu-kilinskiego-12a-m-1.docx');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'kilinskiego|12A|1');
  assert.equal(r.starting_price_pln, 110270);
  assert.equal(r.final_price_pln, 111380);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.unsold_reason, null);
  assert.equal(r.auction_date, '2024-04-24');
  assert.match(r.source_pdf, /informacja-o-wyniku-przetargu-kilinskiego-12a-m-1\.docx$/);
});

test('parseResultDoc: Jagiellońska 2/4 SOLD (OCR) — company buyer (not "Pan/Pani"), "netto" price labels, terse text still resolves "zabudowana" not "grunt"', () => {
  const [r] = parseResultDoc(JAG_RESULT_OCR, '2023-12-18', 'https://bip.wloclawek.eu/download/attachment/9726/x.pdf');
  assert.equal(r.kind, 'zabudowana');
  assert.equal(r.address.key, 'jagiellonskiej|2|4');
  assert.equal(r.starting_price_pln, 83250);
  assert.equal(r.final_price_pln, 84100);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.auction_date, '2023-12-18');
});

test('parseResultDoc: a non-result document and empty input both return []', () => {
  assert.deepEqual(parseResultDoc('Ogłoszenie o przetargu na sprzedaż lokalu mieszkalnego.', null, 'x'), []);
  assert.deepEqual(parseResultDoc('', null, 'x'), []);
  assert.deepEqual(parseResultDoc(null, null, 'x'), []);
});
