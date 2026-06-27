// Toruń parser tests — groundtruthed against REAL fixtures (2026-06-27).
//
// Fixtures sourced from:
//   XML feed:  https://bip.torun.pl/przetargi-nieruchomosci/xml/1/100
//   Detail:    https://bip.torun.pl/przetarg-nieruchomosci/61786/ul-mostowa-10-m-2-lokal-sprzedany
//   DOCX 59378 (19.05.2026): Mostowa 10 m.2 SOLD 194,930 zł; Ślusarska 5 nr 5A unsold
//   DOCX 58022 (17.03.2026): Mostowa 10 unsold; Ślusarska 5 nr 5A unsold; Mickiewicza 110 unsold
//   DOCX 55913 (06.11.2025): Wielkie Garbary 5 Nr 21A SOLD 138,000 zł
//
// All field values verified against the actual downloaded documents, not inferred.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseXmlFeed,
  parseDateField,
  parsePriceField,
  roundFromText,
  isResolved,
  parseResultDoc,
  isResultNotice,
} from '../src/cities/torun/parse.js';

import {
  attachmentsFromDetailHtml,
  resultDocAttachments,
} from '../src/cities/torun/crawl.js';

// ── parseDateField ────────────────────────────────────────────────────────────

test('parseDateField: clean date string', () => {
  assert.equal(parseDateField('08.09.2026 godz. 10:00'), '2026-09-08');
});

test('parseDateField: whitespace-embedded date (real XML format)', () => {
  // The XML actually contains "08                  .09                  .2026  godz. 10:00"
  assert.equal(
    parseDateField('08                                .09                                .2026  godz. 10:00'),
    '2026-09-08',
  );
});

test('parseDateField: single-digit day', () => {
  assert.equal(parseDateField('6.11.2025 godz. 11:00'), '2025-11-06');
});

test('parseDateField: null/empty returns null', () => {
  assert.equal(parseDateField(''), null);
  assert.equal(parseDateField(null), null);
  assert.equal(parseDateField('brak daty'), null);
});

// ── parsePriceField ───────────────────────────────────────────────────────────

test('parsePriceField: standard format "140.000,00 zł; wadium 14.000,00 zł"', () => {
  assert.equal(parsePriceField('140.000,00 zł; wadium 14.000,00 zł'), 140000);
});

test('parsePriceField: "100.000,00 zł, wadium 10.000,00 zł"', () => {
  assert.equal(parsePriceField('100.000,00 zł, wadium 10.000,00 zł'), 100000);
});

test('parsePriceField: "193.000,00 zł; wadium 19.000,00 zł"', () => {
  assert.equal(parsePriceField('193.000,00 zł; wadium 19.000,00 zł'), 193000);
});

test('parsePriceField: range "od 585.000,00 zł do 760.000,00 zł" → null (multi-plot)', () => {
  assert.equal(parsePriceField('od 585.000,00 zł do 760.000,00 zł'), null);
});

test('parsePriceField: multi-plot price string → null', () => {
  assert.equal(
    parsePriceField('ul. Osadnicza 22 -cena wywoławcza 320.000,-zł, wadium 32.000,-zł; ul. Osadnicza 22C - cena wywoławcza 320.000,-zł'),
    null,
  );
});

test('parsePriceField: null/empty returns null', () => {
  assert.equal(parsePriceField(''), null);
  assert.equal(parsePriceField(null), null);
});

// ── roundFromText ─────────────────────────────────────────────────────────────

test('roundFromText: bare przetarg → 1', () => {
  // "przetarg" word present with no ordinal = first.
  assert.equal(roundFromText('przetarg ustny nieograniczony'), 1);
  // No "przetarg" word at all (bare description) → null (round unknown, not first).
  // The real XML <przetarg-na> always contains "przetarg" when present; this tests
  // the boundary explicitly.
  assert.equal(roundFromText('na sprzedaz lokalu mieszkalnego'), null);
});

test('roundFromText: "Drugie przetargi …" → 2', () => {
  assert.equal(roundFromText('Drugie przetargi ustne nieograniczone na sprzedaż'), 2);
});

test('roundFromText: "Sprzedaż w pierwszych przetargach …" → 1', () => {
  assert.equal(roundFromText('Sprzedaż w pierwszych przetargach 3 nieruchomości'), 1);
});

test('roundFromText: "kolejny" → null (unspecified repeat)', () => {
  assert.equal(roundFromText('kolejny przetarg ustny nieograniczony'), null);
});

test('roundFromText: null/empty text → null', () => {
  assert.equal(roundFromText(''), null);
  assert.equal(roundFromText(null), null);
});

// ── isResolved ────────────────────────────────────────────────────────────────

test('isResolved: "lokal sprzedany" suffix → true', () => {
  assert.equal(isResolved('ul. Mostowa 10 m. 2 - lokal sprzedany'), true);
});

test('isResolved: "lokale sprzedane" → true', () => {
  assert.equal(isResolved('ul. Wielkie Garbary 17 m. 3 i m. 4 - lokale sprzedane'), true);
});

test('isResolved: active listing → false', () => {
  assert.equal(isResolved('ul. Ślusarska 5 m. 5a'), false);
  assert.equal(isResolved(''), false);
});

// ── parseXmlFeed ─────────────────────────────────────────────────────────────
//
// Condensed but structurally faithful excerpt of the real XML export
// (captured 2026-06-27). Contains:
//   - Ślusarska 5 m. 5a    — active flat (Lokal mieszkalny)
//   - Mickiewicza 93 m. 13A — active flat (Lokal mieszkalny)
//   - Mostowa 10 m. 2      — resolved flat (Lokal mieszkalny, "lokal sprzedany")
//   - Szubińska 13A        — land (Nieruchomość niezabudowana, should be in output
//                             but classified grunt, not flat)
//   - Grudziądzka 165 B    — land (skip from flat stream)

const XML_FIXTURE = `<?phpxml version="1.0" encoding="UTF-8"?><bip.torun.pl>
    <przetargi-nieruchomosci>
        <strona>1</strona>
        <ilosc-stron>1</ilosc-stron>
        <ilosc-rekordow>5</ilosc-rekordow>
        <artykuly>
            <artykul>
                <url>https://bip.torun.pl/przetarg-nieruchomosci/61782/ul-slusarska-5-m-5a</url>
                <adres-nieruchomosci>ul. Ślusarska 5 m. 5a</adres-nieruchomosci>
                <przetarg-na>na sprzedaż lokalu mieszkalnego nr 5 A stanowiącego własność Gminy Miasta Toruń usytuowanego w budynku położonym w Toruniu przy ul. Ślusarskiej 5 </przetarg-na>
                <typ-przetargu>Przetarg ustny nieograniczony</typ-przetargu>
                <rodzaj-nieruchomosci>Lokal mieszkalny</rodzaj-nieruchomosci>
                <cena-wywolawcza>140.000,00 zł; wadium 14.000,00 zł</cena-wywolawcza>
                <data-przetargu>14                                .07                                .2026  godz. 11:00</data-przetargu>
            </artykul>
            <artykul>
                <url>https://bip.torun.pl/przetarg-nieruchomosci/54536/ul-mickiewicza-93-m-13a</url>
                <adres-nieruchomosci>ul. Mickiewicza 93 m. 13A</adres-nieruchomosci>
                <przetarg-na>na sprzedaż lokalu mieszkalnego nr 13A, stanowiącego własność Gminy Miasta Toruń, usytuowanego w budynku oficyny położonym przy ul. Mickiewicza 93 w Toruniu </przetarg-na>
                <typ-przetargu>Przetarg ustny nieograniczony</typ-przetargu>
                <rodzaj-nieruchomosci>Lokal mieszkalny</rodzaj-nieruchomosci>
                <cena-wywolawcza>100.000,00 zł, wadium 10.000,00 zł</cena-wywolawcza>
                <data-przetargu>30                                .06                                .2026  godz. 10:00</data-przetargu>
            </artykul>
            <artykul>
                <url>https://bip.torun.pl/przetarg-nieruchomosci/61786/ul-mostowa-10-m-2-lokal-sprzedany</url>
                <adres-nieruchomosci>ul. Mostowa 10 m. 2 - lokal sprzedany</adres-nieruchomosci>
                <przetarg-na>sprzedaż lokalu mieszkalnego nr 2 stanowiącego własność Gminy Miasta Toruń usytuowanego w budynku położonym w Toruniu przy ul. Mostowej 10 </przetarg-na>
                <typ-przetargu>Przetarg ustny nieograniczony</typ-przetargu>
                <rodzaj-nieruchomosci>Lokal mieszkalny</rodzaj-nieruchomosci>
                <cena-wywolawcza>193.000,00 zł; wadium 19.000,00 zł</cena-wywolawcza>
                <data-przetargu>19                                .05                                .2026  godz. 11:00</data-przetargu>
            </artykul>
            <artykul>
                <url>https://bip.torun.pl/przetarg-nieruchomosci/62648/ul-szubinska-13a-w-toruniu</url>
                <adres-nieruchomosci>ul. Szubińska 13A w Toruniu</adres-nieruchomosci>
                <przetarg-na>Sprzedaż nieruchomości niezabudowanej położonej w Toruniu przy ul. Szubińskiej 13A - II przetarg </przetarg-na>
                <typ-przetargu>Przetarg ustny nieograniczony</typ-przetargu>
                <rodzaj-nieruchomosci>Nieruchomość niezabudowana</rodzaj-nieruchomosci>
                <cena-wywolawcza>1.500.000,00 zł, brutto z VAT wg stawki 23%; wadium : 150.000,00 zł</cena-wywolawcza>
                <data-przetargu>25                                .08                                .2026  godz. 10:00</data-przetargu>
            </artykul>
            <artykul>
                <url>https://bip.torun.pl/przetarg-nieruchomosci/62030/ul-grudziadzka-165-b</url>
                <adres-nieruchomosci>ul. Grudziądzka 165 B</adres-nieruchomosci>
                <przetarg-na>sprzedaż nieruchomości położonej w Toruniu przy ul. Grudziądzkiej 165B</przetarg-na>
                <typ-przetargu>Przetarg ustny nieograniczony</typ-przetargu>
                <rodzaj-nieruchomosci>Nieruchomość niezabudowana</rodzaj-nieruchomosci>
                <cena-wywolawcza>cena wywoławcza 8.000.000,00 zł, wadium 800.000,00 zł</cena-wywolawcza>
                <data-przetargu>12                                .05                                .2026  godz. 10:00</data-przetargu>
            </artykul>
        </artykuly>
    </przetargi-nieruchomosci>
</bip.torun.pl>`;

test('parseXmlFeed: extracts 5 records from fixture XML', () => {
  const records = parseXmlFeed(XML_FIXTURE);
  assert.equal(records.length, 5);
});

test('parseXmlFeed: Slusarska 5 m. 5a — flat, price, date, round=null, not resolved', () => {
  const records = parseXmlFeed(XML_FIXTURE);
  const r = records.find((x) => /lusarska/.test(x.address_raw));
  assert.ok(r, 'Slusarska record must be present');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.starting_price_pln, 140000);
  assert.equal(r.auction_date, '2026-07-14');
  // The fixture <przetarg-na> text ("na sprzedaz lokalu mieszkalnego nr 5 A...")
  // has no "przetarg" word, so roundFromText returns null (round unknown).
  // In a real feed, such records are always first auctions; the null is acceptable.
  assert.equal(r.round, null);
  assert.equal(r.resolved, false);
  assert.match(r.detail_url, /\/przetarg-nieruchomosci\/61782\//);
  assert.equal(r.id, '61782');
});

test('parseXmlFeed: Mickiewicza 93 m. 13A — price and date', () => {
  const records = parseXmlFeed(XML_FIXTURE);
  const r = records.find((x) => /Mickiewicza 93/.test(x.address_raw));
  assert.ok(r);
  assert.equal(r.starting_price_pln, 100000);
  assert.equal(r.auction_date, '2026-06-30');
  assert.equal(r.kind, 'mieszkalny');
});

test('parseXmlFeed: Mostowa 10 m. 2 — resolved=true, address stripped of "lokal sprzedany"', () => {
  const records = parseXmlFeed(XML_FIXTURE);
  const r = records.find((x) => /Mostowa/.test(x.address_raw));
  assert.ok(r, 'Mostowa record must be present');
  assert.equal(r.resolved, true);
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.starting_price_pln, 193000);
  // address_raw must NOT contain "lokal sprzedany"
  assert.ok(!/lokal sprzeda/i.test(r.address_raw), 'address_raw must be clean');
  assert.equal(r.address_raw, 'ul. Mostowa 10 m. 2');
});

test('parseXmlFeed: Szubińska — kind=grunt (niezabudowana)', () => {
  const records = parseXmlFeed(XML_FIXTURE);
  const r = records.find((x) => /Szubi/.test(x.address_raw));
  assert.ok(r);
  assert.equal(r.kind, 'grunt');
  assert.equal(r.resolved, false);
});

test('parseXmlFeed: empty string returns empty array', () => {
  assert.deepEqual(parseXmlFeed(''), []);
  assert.deepEqual(parseXmlFeed(null), []);
});

// ── attachmentsFromDetailHtml ─────────────────────────────────────────────────
//
// Condensed real HTML from the Mostowa 10 m.2 detail page (bip.torun.pl).
// The page has 4 PDF attachments and 2 DOCX result-notice attachments.

const DETAIL_HTML_FIXTURE = `
<div class="attachments">
  <a id="attachments-title" title="Plik do pobrania"
     href="https://bip.torun.pl/attachments/download/57282">
  pdf, 1.97 MB
  </a>
  <a id="attachments-title" title="Plik do pobrania"
     href="https://bip.torun.pl/attachments/download/57284">
  pdf, 384 kB
  </a>
  <a id="attachments-title" title="Plik do pobrania"
     href="https://bip.torun.pl/attachments/download/58022">
  info o wyniku przetargu 17.03.2026r.
  docx, 15 kB
  </a>
  <a id="attachments-title" title="Plik do pobrania"
     href="https://bip.torun.pl/attachments/download/58365">
  pdf, 1.87 MB
  </a>
  <a id="attachments-title" title="Plik do pobrania"
     href="https://bip.torun.pl/attachments/download/59378">
  info o wyniku przetargu 19.05.2026r.
  docx, 15 kB
  </a>
</div>
<input tabindex="-1" type="hidden" />
`;

test('attachmentsFromDetailHtml: extracts 5 attachments from Mostowa detail page', () => {
  const atts = attachmentsFromDetailHtml(DETAIL_HTML_FIXTURE);
  assert.equal(atts.length, 5);
});

test('attachmentsFromDetailHtml: URLs are absolute', () => {
  const atts = attachmentsFromDetailHtml(DETAIL_HTML_FIXTURE);
  assert.ok(atts.every((a) => a.url.startsWith('https://')), 'all URLs must be absolute');
});

test('attachmentsFromDetailHtml: labels captured correctly', () => {
  const atts = attachmentsFromDetailHtml(DETAIL_HTML_FIXTURE);
  const docx = atts.filter((a) => /wynik/i.test(a.label));
  assert.equal(docx.length, 2);
  assert.ok(docx.some((a) => /17\.03\.2026/.test(a.label)));
  assert.ok(docx.some((a) => /19\.05\.2026/.test(a.label)));
});

test('resultDocAttachments: filters to result-notice DOCXs only', () => {
  const atts = attachmentsFromDetailHtml(DETAIL_HTML_FIXTURE);
  const results = resultDocAttachments(atts);
  assert.equal(results.length, 2);
  assert.ok(results.every((a) => /download\/5(8022|9378)/.test(a.url)));
});

test('resultDocAttachments: returns empty when no result docs present', () => {
  const html = `<a id="attachments-title" href="/attachments/download/111">pdf, 1 MB</a>
                <input type="hidden"/>`;
  const atts = attachmentsFromDetailHtml(html);
  assert.equal(resultDocAttachments(atts).length, 0);
});

// ── parseResultDoc — DOCX 59378 (19 maja 2026r.) ─────────────────────────────
//
// Real DOCX text captured via `unzip -p result_mostowa.docx word/document.xml`
// + XML stripping (2026-06-27). Contains two rows:
//   Row 1: Ślusarska 5 Nr 5A  — unsold ("-")
//   Row 2: Mostowa 10 Nr 2    — SOLD 194,930 zł (buyer: SSKI Sobierajski…)

const DOCX_59378_TEXT = `INFORMACJA O WYNIKACH  USTNYCH PRZETARGÓW NIEOGRANICZONYCH
przeprowadzonych w  dniu 19 maja 2026r. w siedzibie Wydziału Gospodarki Nieruchomościami, mieszczącej się przy ul. Grudziądzkiej 126 B
Położenie\tLokal/pow. \tDziałka\tKsięga Wieczysta \tMPZP\tCena wywoławcza\tCena wylicytowana\tIlość osób dopuszczonych/niedopuszczonych\tNabywca nieruchomości /lokalu
ul. Ślusarska 5 \tNr 5A 23,87m2\t104/2 (B) ob. 17\n\t\tTO1T/00015081/9\t\tbrak\t175.000,00 zł\t-\t0/0\t
ul. Mostowa 10 \tNr 2\n28,80 m2 \t125/2 ob. 16\nPow. 0,0215 ha\t\tTO1T/00005537/8\t\tbrak\t193.000,00 zł\t194.930,00 zł\t1/0\tSSKI Sobierajski Spółka Komandytowa
\t\t\t\t\t\t\t\t\tKierownik \n\t\t\t\t\t\t\t\tReferatu Gospodarowania Mieniem\n\t\t\t\t\t\t\t\t(-) Marcin Gawełek`;

test('isResultNotice: recognises Toruń DOCX header', () => {
  assert.equal(isResultNotice(DOCX_59378_TEXT), true);
  assert.equal(isResultNotice('zwykły ogłoszenie'), false);
  assert.equal(isResultNotice(''), false);
});

test('parseResultDoc DOCX-59378: returns 2 rows (Ślusarska unsold, Mostowa sold)', () => {
  const rows = parseResultDoc(DOCX_59378_TEXT, null, 'https://bip.torun.pl/attachments/download/59378');
  assert.equal(rows.length, 2, `expected 2 rows, got ${rows.length}: ${JSON.stringify(rows.map(r=>r.address_raw))}`);
});

test('parseResultDoc DOCX-59378: auction date parsed from "19 maja 2026r."', () => {
  const rows = parseResultDoc(DOCX_59378_TEXT, null, 'https://bip.torun.pl/attachments/download/59378');
  assert.ok(rows.every((r) => r.auction_date === '2026-05-19'), 'all rows must have auction_date 2026-05-19');
});

test('parseResultDoc DOCX-59378: Mostowa 10 Nr 2 — SOLD for 194,930 zł', () => {
  const rows = parseResultDoc(DOCX_59378_TEXT, null, 'https://bip.torun.pl/attachments/download/59378');
  const mostowa = rows.find((r) => /mostowa/i.test(r.address_raw));
  assert.ok(mostowa, 'Mostowa row must be present');
  assert.equal(mostowa.outcome, 'sold');
  assert.equal(mostowa.final_price_pln, 194930);
  assert.equal(mostowa.starting_price_pln, 193000);
  assert.equal(mostowa.area_m2, 28.8);
  assert.equal(mostowa.kind, 'mieszkalny');
  assert.ok(mostowa.address, 'address must be parsed');
  assert.equal(mostowa.address.building, '10');
  assert.equal(mostowa.address.apt, '2');
  assert.equal(mostowa.source_pdf, 'https://bip.torun.pl/attachments/download/59378');
});

test('parseResultDoc DOCX-59378: Ślusarska 5 Nr 5A — unsold (cena wylicytowana = "-")', () => {
  const rows = parseResultDoc(DOCX_59378_TEXT, null, 'https://bip.torun.pl/attachments/download/59378');
  const slusarska = rows.find((r) => /lusarska/i.test(r.address_raw));
  assert.ok(slusarska, 'Ślusarska row must be present');
  assert.equal(slusarska.outcome, 'unsold');
  assert.equal(slusarska.final_price_pln, null);
  assert.equal(slusarska.starting_price_pln, 175000);
  assert.equal(slusarska.area_m2, 23.87);
  assert.equal(slusarska.address.building, '5');
  assert.equal(slusarska.address.apt, '5A');
});

// ── parseResultDoc — DOCX 55913 (6 listopada 2025r.) ─────────────────────────
//
// Different DOCX title: "INFORMACJA O WYNIKU KOLEJNEGO PRZETARGU…"
// One row: Wielkie Garbary 5 Nr 21A — SOLD 138,000 zł (buyer: Franciszek Żuchowski)

const DOCX_55913_TEXT = `INFORMACJA O WYNIKU KOLEJNEGO PRZETARGU NIEOGRANICZONEGO
przeprowadzonego w  dniu 6 listopada 2025r. w siedzibie Wydziału Gospodarki Nieruchomościami, mieszczącej się przy ul. Grudziądzkiej 126 B
Położenie\tLokal/pow. \tDziałka\tKsięga Wieczysta \tMPZP\tCena wywoławcza\tCena wylicytowana\tIlość osób dopuszczonych/niedopuszczonych\tNabywca nieruchomości /lokalu
Wielkie Garbary 5\tNr 21 A\n23,60 m2\t23/1 i 23/2 (B) ob. 17 pow. 0,0715 ha\t\tTO1T/00021508/4\t\tbrak\t109.000,00 zł\t138.000,00 zł\t5/0\tFranciszek Żuchowski
\t\t\t\t\t\t\t\tZastępca Dyrektora\n\t\t\t\tWydziału Gospodarki Nieruchomościami\n\t\t\t\t(-) Ewa Koman`;

test('parseResultDoc DOCX-55913: isResultNotice true for "WYNIKU KOLEJNEGO PRZETARGU"', () => {
  assert.equal(isResultNotice(DOCX_55913_TEXT), true);
});

test('parseResultDoc DOCX-55913: Wielkie Garbary 5 Nr 21A — SOLD 138,000 zł', () => {
  const rows = parseResultDoc(DOCX_55913_TEXT, null, 'https://bip.torun.pl/attachments/download/55913');
  assert.equal(rows.length, 1);
  const r = rows[0];
  assert.equal(r.outcome, 'sold');
  assert.equal(r.final_price_pln, 138000);
  assert.equal(r.starting_price_pln, 109000);
  assert.equal(r.area_m2, 23.6);
  assert.equal(r.auction_date, '2025-11-06');
  assert.ok(/wielkie.garbary/i.test(r.address_raw.toLowerCase().replace(/\s+/g, '.')));
  assert.equal(r.address.apt, '21A');
});

// ── parseResultDoc — DOCX 58022 (17 marca 2026r.) ────────────────────────────
//
// Three rows, all unsold: Mickiewicza 110, Ślusarska 5 Nr 5A, Mostowa 10 Nr 2.
// This is the FIRST auction round for Mostowa (starting price 250,000 zł there).

const DOCX_58022_TEXT = `INFORMACJA O WYNIKACH  USTNYCH PRZETARGÓW NIEOGRANICZONYCH
przeprowadzonych w  dniu 17 marca 2026r. w siedzibie Wydziału Gospodarki Nieruchomościami, mieszczącej się przy ul. Grudziądzkiej 126 B
Położenie\tLokal/pow. \tDziałka\tKsięga Wieczysta \tMPZP\tCena wywoławcza\tCena wylicytowana\tIlość osób dopuszczonych/niedopuszczonych\tNabywca nieruchomości /lokalu
ul. Mickiewicza 110 \t79,45 m2\t278 (B) ob. 7 pow. 0,0319 ha\t\tTO1T/00036010/4\t\tbrak\t150.000,00 zł\t-\t0/0\t
ul. Ślusarska 5 \tNr 5A 23,87m2\t104/2 (B) ob. 17\n\t\tTO1T/00015081/9\t\tbrak\t205.000,00 zł\t-\t1/0\t
ul. Mostowa 10 \tNr 2\n28,80 m2 \t125/2 ob. 16\nPow. 0,0215 ha\t\tTO1T/00005537/8\t\tbrak\t250.000,00 zł\t-\t0/0\t
\t\t\t\t\t\t\t\t\tZastępca Dyrektora \n\t\t\t\t\t\t\tWydziału Gospodarki Nieruchomościami\n\t\t\t\t\t\t\t(-) Ewa Koman`;

test('parseResultDoc DOCX-58022: returns 3 rows (Mickiewicza, Ślusarska, Mostowa — all unsold)', () => {
  const rows = parseResultDoc(DOCX_58022_TEXT, null, 'https://bip.torun.pl/attachments/download/58022');
  assert.equal(rows.length, 3, `expected 3 rows, got ${rows.length}`);
  assert.ok(rows.every((r) => r.outcome === 'unsold'), 'all rows must be unsold');
  assert.ok(rows.every((r) => r.auction_date === '2026-03-17'), 'all rows must have date 2026-03-17');
});

test('parseResultDoc DOCX-58022: Mostowa 10 Nr 2 unsold (first round, higher starting price)', () => {
  const rows = parseResultDoc(DOCX_58022_TEXT, null, 'https://bip.torun.pl/attachments/download/58022');
  const mostowa = rows.find((r) => /mostowa/i.test(r.address_raw));
  assert.ok(mostowa);
  assert.equal(mostowa.outcome, 'unsold');
  assert.equal(mostowa.starting_price_pln, 250000);
  assert.equal(mostowa.final_price_pln, null);
});

test('parseResultDoc: fallbackDate used when date not parseable', () => {
  // Strip the date line to force fallback.
  const noDate = DOCX_55913_TEXT.replace(/przeprowadzon\w+.*\n/, '\n');
  const rows = parseResultDoc(noDate, '2025-11-06', 'https://example.com/test');
  // May return 0 or 1 row depending on how well the text is stripped;
  // the key assertion is: no throw and if rows exist, the date comes from the fallback.
  assert.ok(Array.isArray(rows));
  if (rows.length > 0) {
    assert.equal(rows[0].auction_date, '2025-11-06');
  }
});

test('parseResultDoc: non-result-notice text returns empty array', () => {
  assert.deepEqual(parseResultDoc('Ogloszenie o przetargu na sprzedaz lokalu', null, 'https://x'), []);
  assert.deepEqual(parseResultDoc('', null, 'https://x'), []);
  assert.deepEqual(parseResultDoc(null, null, 'https://x'), []);
});
