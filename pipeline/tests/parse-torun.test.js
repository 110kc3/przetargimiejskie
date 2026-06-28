// Toruń parser tests — groundtruthed against REAL fixtures (2026-06-27).
//
// Fixtures sourced from:
//   XML feed:  https://bip.torun.pl/przetargi-nieruchomosci/xml/1/100
//   Detail:    https://bip.torun.pl/przetarg-nieruchomosci/61786/ul-mostowa-10-m-2-lokal-sprzedany
//   DOCX 59378 (19.05.2026): Mostowa 10 m.2 SOLD 194,930 zl; Slusarska 5 nr 5A unsold
//   DOCX 58022 (17.03.2026): Mostowa 10 unsold; Slusarska 5 nr 5A unsold; Mickiewicza 110 unsold
//   DOCX 55913 (06.11.2025): Wielkie Garbary 5 Nr 21A SOLD 138,000 zl
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
  areaFromDetailHtml,
} from '../src/cities/torun/parse.js';

import {
  attachmentsFromDetailHtml,
  resultDocAttachments,
} from '../src/cities/torun/crawl.js';

// -- parseDateField -----------------------------------------------------------

test('parseDateField: clean date string', () => {
  assert.equal(parseDateField('08.09.2026 godz. 10:00'), '2026-09-08');
});

test('parseDateField: whitespace-embedded date (real XML format)', () => {
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

// -- parsePriceField ----------------------------------------------------------

test('parsePriceField: standard format with wadium semicolon', () => {
  assert.equal(parsePriceField('140.000,00 zł; wadium 14.000,00 zł'), 140000);
});

test('parsePriceField: comma-separated wadium', () => {
  assert.equal(parsePriceField('100.000,00 zł, wadium 10.000,00 zł'), 100000);
});

test('parsePriceField: 193000 with semicolon wadium', () => {
  assert.equal(parsePriceField('193.000,00 zł; wadium 19.000,00 zł'), 193000);
});

test('parsePriceField: range "od ... do ..." returns null (multi-plot)', () => {
  assert.equal(parsePriceField('od 585.000,00 zł do 760.000,00 zł'), null);
});

test('parsePriceField: multi-plot price string returns null', () => {
  assert.equal(
    parsePriceField('ul. Osadnicza 22 -cena wywolawcza 320.000,-zł, wadium 32.000,-zł; ul. Osadnicza 22C - cena wywolawcza 320.000,-zł'),
    null,
  );
});

test('parsePriceField: null/empty returns null', () => {
  assert.equal(parsePriceField(''), null);
  assert.equal(parsePriceField(null), null);
});

// Regression: Poznańska 81 m. 7 (34.3 m², auction 2025-11-25).
// The BIP XML field used "90.000,-zł" (dash-decimal shorthand) for the cena
// wywoławcza while the wadium used the standard "9.000,00 zł" form.
// The old regex /([\d][\d .,]*)[\s]*z[łl]/ stopped at the "-" in ",-zł",
// so only the wadium (9 000 zł) was matched and stored as starting_price_pln,
// yielding 9 000 / 34.3 = 262 zł/m² — flagged as [insane-m2] by sanity-check.
// Fix: priceRe now allows optional ",-" before "zł" so the cena wywoławcza
// is captured too; with 2 matches + "wadium" present, hits[0] = 90 000 is returned.
test('parsePriceField: dash-decimal cena wywoławcza — Poznańska 81/7 regression', () => {
  // The actual format that caused 9000 to be stored instead of 90000.
  assert.equal(parsePriceField('90.000,-zł; wadium 9.000,00 zł'), 90000);
});

test('parsePriceField: dash-decimal both cena and wadium', () => {
  // Both use ",-zł" format — should still return the first (cena wywoławcza).
  assert.equal(parsePriceField('90.000,-zł; wadium 9.000,-zł'), 90000);
});

test('parsePriceField: dash-decimal with space before zł', () => {
  assert.equal(parsePriceField('90.000,- zł; wadium 9.000,- zł'), 90000);
});

// -- roundFromText ------------------------------------------------------------

test('roundFromText: bare przetarg returns 1', () => {
  assert.equal(roundFromText('przetarg ustny nieograniczony'), 1);
  assert.equal(roundFromText('na sprzedaz lokalu mieszkalnego'), null);
});

test('roundFromText: Drugie przetargi returns 2', () => {
  assert.equal(roundFromText('Drugie przetargi ustne nieograniczone na sprzedaz'), 2);
});

test('roundFromText: pierwszych przetargach returns 1', () => {
  assert.equal(roundFromText('Sprzedaz w pierwszych przetargach 3 nieruchomosci'), 1);
});

test('roundFromText: kolejny returns null (unspecified repeat)', () => {
  assert.equal(roundFromText('kolejny przetarg ustny nieograniczony'), null);
});

test('roundFromText: null/empty text returns null', () => {
  assert.equal(roundFromText(''), null);
  assert.equal(roundFromText(null), null);
});

// -- isResolved ---------------------------------------------------------------

test('isResolved: "lokal sprzedany" suffix returns true', () => {
  assert.equal(isResolved('ul. Mostowa 10 m. 2 - lokal sprzedany'), true);
});

test('isResolved: "lokale sprzedane" returns true', () => {
  assert.equal(isResolved('ul. Wielkie Garbary 17 m. 3 i m. 4 - lokale sprzedane'), true);
});

test('isResolved: active listing returns false', () => {
  assert.equal(isResolved('ul. Slusarska 5 m. 5a'), false);
  assert.equal(isResolved(''), false);
});

// -- parseXmlFeed -------------------------------------------------------------
//
// Condensed but structurally faithful excerpt of the real XML export
// (captured 2026-06-27). Contains:
//   - Slusarska 5 m. 5a     -- active flat (Lokal mieszkalny)
//   - Mickiewicza 93 m. 13A -- active flat (Lokal mieszkalny)
//   - Mostowa 10 m. 2       -- resolved flat (Lokal mieszkalny, "lokal sprzedany")
//   - Szubinska 13A         -- land (Nieruchomość niezabudowana)
//   - Grudziadzka 165 B     -- land (skip from flat stream)

const XML_FIXTURE = `<?phpxml version="1.0" encoding="UTF-8"?><bip.torun.pl>
    <przetargi-nieruchomosci>
        <strona>1</strona>
        <ilosc-stron>1</ilosc-stron>
        <ilosc-rekordow>5</ilosc-rekordow>
        <artykuly>
            <artykul>
                <url>https://bip.torun.pl/przetarg-nieruchomosci/61782/ul-slusarska-5-m-5a</url>
                <adres-nieruchomosci>ul. Slusarska 5 m. 5a</adres-nieruchomosci>
                <przetarg-na>na sprzedaz lokalu mieszkalnego nr 5 A stanowiacego wlasnosc Gminy Miasta Torun usytuowanego w budynku polozonym w Toruniu przy ul. Slusarskiej 5 </przetarg-na>
                <typ-przetargu>Przetarg ustny nieograniczony</typ-przetargu>
                <rodzaj-nieruchomosci>Lokal mieszkalny</rodzaj-nieruchomosci>
                <cena-wywolawcza>140.000,00 zl; wadium 14.000,00 zl</cena-wywolawcza>
                <data-przetargu>14                                .07                                .2026  godz. 11:00</data-przetargu>
            </artykul>
            <artykul>
                <url>https://bip.torun.pl/przetarg-nieruchomosci/54536/ul-mickiewicza-93-m-13a</url>
                <adres-nieruchomosci>ul. Mickiewicza 93 m. 13A</adres-nieruchomosci>
                <przetarg-na>na sprzedaz lokalu mieszkalnego nr 13A, stanowiacego wlasnosc Gminy Miasta Torun, usytuowanego w budynku oficyny polozonym przy ul. Mickiewicza 93 w Toruniu </przetarg-na>
                <typ-przetargu>Przetarg ustny nieograniczony</typ-przetargu>
                <rodzaj-nieruchomosci>Lokal mieszkalny</rodzaj-nieruchomosci>
                <cena-wywolawcza>100.000,00 zl, wadium 10.000,00 zl</cena-wywolawcza>
                <data-przetargu>30                                .06                                .2026  godz. 10:00</data-przetargu>
            </artykul>
            <artykul>
                <url>https://bip.torun.pl/przetarg-nieruchomosci/61786/ul-mostowa-10-m-2-lokal-sprzedany</url>
                <adres-nieruchomosci>ul. Mostowa 10 m. 2 - lokal sprzedany</adres-nieruchomosci>
                <przetarg-na>sprzedaz lokalu mieszkalnego nr 2 stanowiacego wlasnosc Gminy Miasta Torun usytuowanego w budynku polozonym w Toruniu przy ul. Mostowej 10 </przetarg-na>
                <typ-przetargu>Przetarg ustny nieograniczony</typ-przetargu>
                <rodzaj-nieruchomosci>Lokal mieszkalny</rodzaj-nieruchomosci>
                <cena-wywolawcza>193.000,00 zl; wadium 19.000,00 zl</cena-wywolawcza>
                <data-przetargu>19                                .05                                .2026  godz. 11:00</data-przetargu>
            </artykul>
            <artykul>
                <url>https://bip.torun.pl/przetarg-nieruchomosci/62648/ul-szubinska-13a-w-toruniu</url>
                <adres-nieruchomosci>ul. Szubinska 13A w Toruniu</adres-nieruchomosci>
                <przetarg-na>Sprzedaz nieruchomosci niezabudowanej polozonej w Toruniu przy ul. Szubinskiej 13A - II przetarg </przetarg-na>
                <typ-przetargu>Przetarg ustny nieograniczony</typ-przetargu>
                <rodzaj-nieruchomosci>Nieruchomość niezabudowana</rodzaj-nieruchomosci>
                <cena-wywolawcza>1.500.000,00 zl, brutto z VAT wg stawki 23%; wadium : 150.000,00 zl</cena-wywolawcza>
                <data-przetargu>25                                .08                                .2026  godz. 10:00</data-przetargu>
            </artykul>
            <artykul>
                <url>https://bip.torun.pl/przetarg-nieruchomosci/62030/ul-grudziadzka-165-b</url>
                <adres-nieruchomosci>ul. Grudziadzka 165 B</adres-nieruchomosci>
                <przetarg-na>sprzedaz nieruchomosci polozonej w Toruniu przy ul. Grudziadzkiej 165B</przetarg-na>
                <typ-przetargu>Przetarg ustny nieograniczony</typ-przetargu>
                <rodzaj-nieruchomosci>Nieruchomość niezabudowana</rodzaj-nieruchomosci>
                <cena-wywolawcza>cena wywolawcza 8.000.000,00 zl, wadium 800.000,00 zl</cena-wywolawcza>
                <data-przetargu>12                                .05                                .2026  godz. 10:00</data-przetargu>
            </artykul>
        </artykuly>
    </przetargi-nieruchomosci>
</bip.torun.pl>`;

test('parseXmlFeed: extracts 5 records from fixture XML', () => {
  const records = parseXmlFeed(XML_FIXTURE);
  assert.equal(records.length, 5);
});

test('parseXmlFeed: Slusarska 5 m. 5a -- flat, price, date, round=null, not resolved', () => {
  const records = parseXmlFeed(XML_FIXTURE);
  const r = records.find((x) => /lusarska/.test(x.address_raw));
  assert.ok(r, 'Slusarska record must be present');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.starting_price_pln, 140000);
  assert.equal(r.auction_date, '2026-07-14');
  assert.equal(r.round, null);
  assert.equal(r.resolved, false);
  assert.match(r.detail_url, /\/przetarg-nieruchomosci\/61782\//);
  assert.equal(r.id, '61782');
});

test('parseXmlFeed: Mickiewicza 93 m. 13A -- price and date', () => {
  const records = parseXmlFeed(XML_FIXTURE);
  const r = records.find((x) => /Mickiewicza 93/.test(x.address_raw));
  assert.ok(r);
  assert.equal(r.starting_price_pln, 100000);
  assert.equal(r.auction_date, '2026-06-30');
  assert.equal(r.kind, 'mieszkalny');
});

test('parseXmlFeed: Mostowa 10 m. 2 -- resolved=true, address stripped of "lokal sprzedany"', () => {
  const records = parseXmlFeed(XML_FIXTURE);
  const r = records.find((x) => /Mostowa/.test(x.address_raw));
  assert.ok(r, 'Mostowa record must be present');
  assert.equal(r.resolved, true);
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.starting_price_pln, 193000);
  assert.ok(!/lokal sprzeda/i.test(r.address_raw), 'address_raw must be clean');
  assert.equal(r.address_raw, 'ul. Mostowa 10 m. 2');
});

test('parseXmlFeed: Szubinska -- kind=grunt (niezabudowana)', () => {
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

// -- attachmentsFromDetailHtml ------------------------------------------------
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

// -- parseResultDoc DOCX 59378 (19 maja 2026r.) ------------------------------
//
// Real DOCX text captured via unzip -p word/document.xml + XML stripping.
// Two rows: Slusarska 5 Nr 5A (unsold), Mostowa 10 Nr 2 (SOLD 194,930 zl).

const DOCX_59378_TEXT = `INFORMACJA O WYNIKACH  USTNYCH PRZETARGOW NIEOGRANICZONYCH
przeprowadzonych w  dniu 19 maja 2026r. w siedzibie Wydzialu Gospodarki Nieruchomosciami, mieszczacej sie przy ul. Grudziadzkiej 126 B
Polozenie\tLokal/pow. \tDzialka\tKsiega Wieczysta \tMPZP\tCena wywolawcza\tCena wylicytowana\tIlosc osob dopuszczonych/niedopuszczonych\tNabywca nieruchomosci /lokalu
ul. Slusarska 5 \tNr 5A 23,87m2\t104/2 (B) ob. 17\n\t\tTO1T/00015081/9\t\tbrak\t175.000,00 zl\t-\t0/0\t
ul. Mostowa 10 \tNr 2\n28,80 m2 \t125/2 ob. 16\nPow. 0,0215 ha\t\tTO1T/00005537/8\t\tbrak\t193.000,00 zl\t194.930,00 zl\t1/0\tSSKI Sobierajski Spolka Komandytowa
\t\t\t\t\t\t\t\t\tKierownik \n\t\t\t\t\t\t\t\tReferatu Gospodarowania Mieniem\n\t\t\t\t\t\t\t\t(-) Marcin Gawelk`;

test('isResultNotice: recognises Torun DOCX header', () => {
  assert.equal(isResultNotice(DOCX_59378_TEXT), true);
  assert.equal(isResultNotice('zwykly ogloszenie'), false);
  assert.equal(isResultNotice(''), false);
});

test('parseResultDoc DOCX-59378: returns 2 rows (Slusarska unsold, Mostowa sold)', () => {
  const rows = parseResultDoc(DOCX_59378_TEXT, null, 'https://bip.torun.pl/attachments/download/59378');
  assert.equal(rows.length, 2, `expected 2 rows, got ${rows.length}: ${JSON.stringify(rows.map(r=>r.address_raw))}`);
});

test('parseResultDoc DOCX-59378: auction date parsed from "19 maja 2026r."', () => {
  const rows = parseResultDoc(DOCX_59378_TEXT, null, 'https://bip.torun.pl/attachments/download/59378');
  assert.ok(rows.every((r) => r.auction_date === '2026-05-19'), 'all rows must have auction_date 2026-05-19');
});

test('parseResultDoc DOCX-59378: Mostowa 10 Nr 2 -- SOLD for 194930 zl', () => {
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

test('parseResultDoc DOCX-59378: Slusarska 5 Nr 5A -- unsold (cena wylicytowana = "-")', () => {
  const rows = parseResultDoc(DOCX_59378_TEXT, null, 'https://bip.torun.pl/attachments/download/59378');
  const slusarska = rows.find((r) => /lusarska/i.test(r.address_raw));
  assert.ok(slusarska, 'Slusarska row must be present');
  assert.equal(slusarska.outcome, 'unsold');
  assert.equal(slusarska.final_price_pln, null);
  assert.equal(slusarska.starting_price_pln, 175000);
  assert.equal(slusarska.area_m2, 23.87);
  assert.equal(slusarska.address.building, '5');
  assert.equal(slusarska.address.apt, '5A');
});

// -- parseResultDoc DOCX 55913 (6 listopada 2025r.) --------------------------
//
// Different title: "INFORMACJA O WYNIKU KOLEJNEGO PRZETARGU..."
// One row: Wielkie Garbary 5 Nr 21A -- SOLD 138,000 zl.

const DOCX_55913_TEXT = `INFORMACJA O WYNIKU KOLEJNEGO PRZETARGU NIEOGRANICZONEGO
przeprowadzonego w  dniu 6 listopada 2025r. w siedzibie Wydzialu Gospodarki Nieruchomosciami, mieszczacej sie przy ul. Grudziadzkiej 126 B
Polozenie\tLokal/pow. \tDzialka\tKsiega Wieczysta \tMPZP\tCena wywolawcza\tCena wylicytowana\tIlosc osob dopuszczonych/niedopuszczonych\tNabywca nieruchomosci /lokalu
Wielkie Garbary 5\tNr 21 A\n23,60 m2\t23/1 i 23/2 (B) ob. 17 pow. 0,0715 ha\t\tTO1T/00021508/4\t\tbrak\t109.000,00 zl\t138.000,00 zl\t5/0\tFranciszek Zuchowski
\t\t\t\t\t\t\t\tZastepca Dyrektora\n\t\t\t\tWydzialu Gospodarki Nieruchomosciami\n\t\t\t\t(-) Ewa Koman`;

test('parseResultDoc DOCX-55913: isResultNotice true for "WYNIKU KOLEJNEGO PRZETARGU"', () => {
  assert.equal(isResultNotice(DOCX_55913_TEXT), true);
});

test('parseResultDoc DOCX-55913: Wielkie Garbary 5 Nr 21A -- SOLD 138000 zl', () => {
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

// -- parseResultDoc DOCX 58022 (17 marca 2026r.) -----------------------------
//
// Three rows, all unsold: Mickiewicza 110, Slusarska 5 Nr 5A, Mostowa 10 Nr 2.

const DOCX_58022_TEXT = `INFORMACJA O WYNIKACH  USTNYCH PRZETARGOW NIEOGRANICZONYCH
przeprowadzonych w  dniu 17 marca 2026r. w siedzibie Wydzialu Gospodarki Nieruchomosciami, mieszczacej sie przy ul. Grudziadzkiej 126 B
Polozenie\tLokal/pow. \tDzialka\tKsiega Wieczysta \tMPZP\tCena wywolawcza\tCena wylicytowana\tIlosc osob dopuszczonych/niedopuszczonych\tNabywca nieruchomosci /lokalu
ul. Mickiewicza 110 \t79,45 m2\t278 (B) ob. 7 pow. 0,0319 ha\t\tTO1T/00036010/4\t\tbrak\t150.000,00 zl\t-\t0/0\t
ul. Slusarska 5 \tNr 5A 23,87m2\t104/2 (B) ob. 17\n\t\tTO1T/00015081/9\t\tbrak\t205.000,00 zl\t-\t1/0\t
ul. Mostowa 10 \tNr 2\n28,80 m2 \t125/2 ob. 16\nPow. 0,0215 ha\t\tTO1T/00005537/8\t\tbrak\t250.000,00 zl\t-\t0/0\t
\t\t\t\t\t\t\t\t\tZastepca Dyrektora \n\t\t\t\t\t\t\tWydzialu Gospodarki Nieruchomosciami\n\t\t\t\t\t\t\t(-) Ewa Koman`;

test('parseResultDoc DOCX-58022: returns 3 rows (Mickiewicza, Slusarska, Mostowa -- all unsold)', () => {
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
  const noDate = DOCX_55913_TEXT.replace(/przeprowadzon\w+.*\n/, '\n');
  const rows = parseResultDoc(noDate, '2025-11-06', 'https://example.com/test');
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

// -- areaFromDetailHtml -------------------------------------------------------
//
// Groundtruthed against the live bip.torun.pl detail pages (2026-06-28).
//
// ROOT CAUSE FIX: Mickiewicza 93 m. 13A (apt 13A, area 50.30 m2) was
// previously missing area_m2 because the BIP XML feed does not include the
// floor area -- it lives only in the detail page body text. crawlDetailAreas()
// now fetches each active flat's detail page and calls areaFromDetailHtml()
// to extract the area, returning a Map<propertyKey, area> consumed by
// buildCityData's detailAreas parameter.

// Condensed real HTML from Mickiewicza 93 m. 13A detail page (2026-06-28).
// Critical text: "lacznej powierzchni uzytkowej 50,30 m2"
const DETAIL_HTML_MICKIEWICZA_13A = [
  '<div class="article-body">',
  '  <p><span>Przedmiotem przetargu jest sprzedaz lokalu mieszkalnego nr 13A wraz z pomieszczeniem',
  '  przynaleznym o lacznej powierzchni uzytkowej 50,30 m2, stanowiacego wlasnosc Gminy Miasta Torun,',
  '  usytuowanego na I pietrze oficyny budynku mieszkalnego wielorodzinnego, posadowionego na nieruchomosci',
  '  oznaczonej geodezyjnie numerami dzialek 361 i 362, polozonej w Toruniu przy ul. Mickiewicza 93',
  '  o lacznej powierzchni 0,1222 ha, zapisanej w ksiedze wieczystej KW Nr TO1T/00029719/2</span></p>',
  '  <p>Powierzchnia uzytkowa lokalu wynosi lacznie 50,30 m2. Klatka schodowa nie nalezy do lokalu.</p>',
  '</div>',
].join('\n');

// Condensed real HTML from Slusarska 5 m. 5A detail page.
// Format: "o powierzchni uzytkowej 23,87 m2" (without "lacznej").
// Second area value (piwnica 7,44 m2) must be ignored -- first match wins.
const DETAIL_HTML_SLUSARSKA_5A = [
  '<div class="article-body">',
  '  <p><span>Przedmiotem przetargu jest sprzedaz lokalu mieszkalnego nr 5A o powierzchni uzytkowej 23,87 m2',
  '  wraz z pomieszczeniem przynaleznym - piwnica o powierzchni 7,44 m2, stanowiacego wlasnosc Gminy Miasta Torun.',
  '  Nieruchomosc gruntowa o lacznej powierzchni 0,0359 ha.</span></p>',
  '</div>',
].join('\n');

// Condensed real HTML from Slusarska 5 m. 8 detail page.
// Format: "o powierzchni 61,08 m2" (bare "powierzchni", no "uzytkowej").
const DETAIL_HTML_SLUSARSKA_8 = [
  '<div class="article-body">',
  '  <p><span>Przedmiotem przetargu jest sprzedaz lokalu mieszkalnego nr 8 o powierzchni 61,08 m2, stanowiacego wlasnosc Gminy Miasta Torun.</span></p>',
  '</div>',
].join('\n');

test('areaFromDetailHtml: Mickiewicza 93 m. 13A -- 50.30 m2 (apt with letter suffix, the missed listing)', () => {
  const area = areaFromDetailHtml(DETAIL_HTML_MICKIEWICZA_13A);
  assert.equal(area, 50.3, 'expected 50.3 for Mickiewicza 93 m. 13A');
});

test('areaFromDetailHtml: Slusarska 5 m. 5A -- 23.87 m2 (first match wins, piwnica 7.44 ignored)', () => {
  const area = areaFromDetailHtml(DETAIL_HTML_SLUSARSKA_5A);
  assert.equal(area, 23.87);
});

test('areaFromDetailHtml: Slusarska 5 m. 8 -- 61.08 m2 (bare "powierzchni")', () => {
  const area = areaFromDetailHtml(DETAIL_HTML_SLUSARSKA_8);
  assert.equal(area, 61.08);
});

test('areaFromDetailHtml: null/empty input returns null', () => {
  assert.equal(areaFromDetailHtml(''), null);
  assert.equal(areaFromDetailHtml(null), null);
  assert.equal(areaFromDetailHtml('<div>no area here</div>'), null);
});
