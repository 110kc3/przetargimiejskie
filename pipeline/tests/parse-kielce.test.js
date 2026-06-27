// Kielce parser tests.
//
// The live board (bipum.kielce.eu) can't be reached from CI sandboxes, so all
// tests use fixtures derived from real live page HTML/DOCX observed 2026-06-27.
//
// Fixtures grounded from:
//   LIST PAGE  https://bipum.kielce.eu/urzad-miasta-kielce/ogloszenia-obwieszczenia/
//              nieruchomosci/przetargi-na-sprzedaz-oddanie-w-dzierzawe-nieruchomosci/
//   RESULT DOC https://bipum.kielce.eu/resource/9092/
//              informacja+o+wyniku+przetargu+Orl%C4%85t+Lwowskich.docx
//              (land sale result — same DOCX template as flat results)

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseListPage,
  isResultNoticeTitle,
  attachmentUrlFromDetail,
  areaFromTitle,
  roundFromText,
  isResultNotice,
  auctionDateFromResultText,
  startingPriceFromResultText,
  achievedPriceFromResultText,
  addressFromResultText,
  parseResultDoc,
} from '../src/cities/kielce/parse.js';

// ---------------------------------------------------------------------------
// Helpers: reproduce SmartSite HTML item shape (groundtruthed from live page)
// ---------------------------------------------------------------------------

function li(href, title, pubDate = '20.02.2026', updDate = '07.04.2026') {
  return `<li class="component-item clearfix">
    <div class="news-wrapper">
      <div class="news-heading">
        <h2><a href="${href}">${title}</a></h2>
        <div class="news-date">Data publikacji: ${pubDate} Data aktualizacji: ${updDate}</div>
      </div>
      <div class="news-lead"></div>
    </div>
  </li>`;
}

// Real titles observed on the live board, 2026-06-27:
const TITLE_DABROWSKA_11 =
  'Ogłoszenie Prezydenta Miasta Kielce o trzecim przetargu ustnym nieograniczonym ' +
  'na sprzedaż lokalu mieszkalnego, oznaczonego numerem 11, położonego w budynku ' +
  'przy ul. Dąbrowskiej 5 w Kielcach, o powierzchni użytkowej 18,21 m2 wraz ' +
  'z udziałem w nieruchomości wspólnej.';

const TITLE_DABROWSKA_20 =
  'Ogłoszenie Prezydenta Miasta Kielce o  II przetargu ustnym nieograniczonym ' +
  'na sprzedaż lokalu mieszkalnego, oznaczonego numerem 20, położonego w budynku ' +
  'przy ul. Dąbrowskiej 5 w Kielcach, o powierzchni użytkowej 21,19m2 wraz ' +
  'z udziałem w nieruchomości wspólnej.';

// Non-flat titles from the same board (land parcels, leases, built property)
const TITLE_GRUNTOWA_NIEZABUDOWANA =
  'Ogłoszenie Prezydenta Miasta Kielce o przetargu ustnym nieograniczonym na ' +
  'sprzedaż prawa własności nieruchomości gruntowej niezabudowanej, położonej ' +
  'w Kielcach przy ul. Króla Stefana Batorego, oznaczonej numerem działki 927/2.';

const TITLE_GRUNTOWA_ZABUDOWANA =
  'Ogłoszenie Prezydenta Miasta Kielce o przetargu ustnym nieograniczonym na ' +
  'sprzedaż prawa własności nieruchomości gruntowej zabudowanej położonej w ' +
  'Kielcach przy ulicy Husarskiej 4.';

const TITLE_RESULT_NOTICE =
  'Informacja o wyniku przetargu ustnego nieograniczonego ul. Orląt Lwowskich';

const TITLE_RESULT_FLAT =
  'Informacja o wyniku przetargu ustnego nieograniczonego na sprzedaż lokalu ' +
  'mieszkalnego przy ul. Dąbrowskiej 5/11';

// Board HTML containing 2 flat announcements, 1 land parcel, 1 built property,
// and 1 result notice (all real or representative of the live board).
const BOARD_HTML = `<ul class="component-list">
${li('/urzad-miasta-kielce/ogloszenia-obwieszczenia/nieruchomosci/przetargi-na-sprzedaz-oddanie-w-dzierzawe-nieruchomosci/ogloszenie-prezydenta-miasta-kielce-o-trzecim-przetargu-ustnym-nieograniczonym-na-sprzedaz-lokalu-mieszkalnego-oznaczonego-numerem-11.html', TITLE_DABROWSKA_11, '20.02.2026', '07.04.2026')}
${li('/urzad-miasta-kielce/ogloszenia-obwieszczenia/nieruchomosci/przetargi-na-sprzedaz-oddanie-w-dzierzawe-nieruchomosci/ogloszenie-ii-przetarg-dabrowska-20.html', TITLE_DABROWSKA_20, '13.02.2026', '30.03.2026')}
${li('/urzad-miasta-kielce/ogloszenia-obwieszczenia/nieruchomosci/przetargi-na-sprzedaz-oddanie-w-dzierzawe-nieruchomosci/gruntowa-batorego.html', TITLE_GRUNTOWA_NIEZABUDOWANA, '13.03.2026', '04.05.2026')}
${li('/urzad-miasta-kielce/ogloszenia-obwieszczenia/nieruchomosci/przetargi-na-sprzedaz-oddanie-w-dzierzawe-nieruchomosci/gruntowa-zabudowana-husarska.html', TITLE_GRUNTOWA_ZABUDOWANA, '20.02.2026', '04.05.2026')}
${li('/urzad-miasta-kielce/ogloszenia-obwieszczenia/nieruchomosci/przetargi-na-sprzedaz-oddanie-w-dzierzawe-nieruchomosci/informacja-o-wyniku-przetargu-ustnego-nieograniczonego-ul-orlat-lwowskich.html', TITLE_RESULT_NOTICE, '06.07.2022', '22.07.2022')}
</ul>`;

// ---------------------------------------------------------------------------
// parseListPage — board listing parser
// ---------------------------------------------------------------------------

test('parseListPage: keeps only flat (mieszkalny) announcements', () => {
  const items = parseListPage(BOARD_HTML);
  assert.equal(items.length, 2, 'land, built-property, and result notice all excluded');
  assert.ok(items.every((i) => i.kind === 'mieszkalny'));
});

test('parseListPage: Dąbrowska 5/11 — round 3 (trzecim), area 18.21, address keyed', () => {
  const items = parseListPage(BOARD_HTML);
  const d11 = items.find((i) => i.address?.apt === '11');
  assert.ok(d11, 'Dąbrowska 5/11 must be present');
  assert.equal(d11.round, 3);
  assert.equal(d11.area_m2, 18.21);
  assert.equal(d11.address.building, '5');
  assert.equal(d11.address.apt, '11');
  // Kielce BIP titles use the genitive "Dąbrowskiej" — normalize.js keeps that form;
  // coalesceStreetVariants in build-properties merges with the nominative twin at runtime.
  assert.ok(/dabrowsk/i.test(d11.address.street_norm));
  assert.equal(d11.address.key, 'dabrowskiej|5|11');
  assert.equal(d11.published_date, '2026-02-20');
  // The slug encodes the full Polish title (no 'dabrowska' substring); just check it's absolute.
  assert.ok(d11.detail_url.startsWith('https://bipum.kielce.eu/'));
});

test('parseListPage: Dąbrowska 5/20 — round 2 (II), area 21.19', () => {
  const items = parseListPage(BOARD_HTML);
  const d20 = items.find((i) => i.address?.apt === '20');
  assert.ok(d20, 'Dąbrowska 5/20 must be present');
  assert.equal(d20.round, 2);
  assert.equal(d20.area_m2, 21.19);
  assert.equal(d20.address.building, '5');
  assert.equal(d20.address.apt, '20');
  assert.equal(d20.address.key, 'dabrowskiej|5|20');
  assert.equal(d20.published_date, '2026-02-13');
});

test('parseListPage: starting_price_pln and auction_date absent from list (crawl adds explicit nulls)', () => {
  const items = parseListPage(BOARD_HTML);
  for (const it of items) {
    // parseListPage does not set price/date — crawl.js adds explicit nulls before returning.
    assert.ok(it.starting_price_pln == null, 'starting_price_pln absent or null');
    assert.ok(it.auction_date == null, 'auction_date absent or null');
  }
});

test('parseListPage: empty HTML returns empty array', () => {
  assert.deepEqual(parseListPage('<html><body>nic</body></html>'), []);
});

test('parseListPage: result notice title is excluded from active listings', () => {
  const items = parseListPage(BOARD_HTML);
  assert.ok(!items.some((i) => /wyniku/.test(i.title || '')));
});

// ---------------------------------------------------------------------------
// roundFromText helper
// ---------------------------------------------------------------------------

test('roundFromText: Roman numeral prefix', () => {
  assert.equal(roundFromText('o II przetargu ustnym nieograniczonym'), 2);
  assert.equal(roundFromText('o III przetargu ustnym nieograniczonym'), 3);
  assert.equal(roundFromText('o IV przetargu ustnym'), 4);
});

test('roundFromText: Polish ordinal word', () => {
  assert.equal(roundFromText('o trzecim przetargu ustnym nieograniczonym'), 3);
  assert.equal(roundFromText('o drugim przetargu ustnym nieograniczonym'), 2);
  assert.equal(roundFromText('o pierwszym przetargu'), 1);
});

test('roundFromText: bare "przetarg" without ordinal = 1', () => {
  assert.equal(roundFromText('ogłasza przetarg ustny nieograniczony na sprzedaż'), 1);
});

test('roundFromText: null on empty / no przetarg', () => {
  assert.equal(roundFromText(''), null);
  assert.equal(roundFromText('informacja o wyniku'), null);
});

// ---------------------------------------------------------------------------
// areaFromTitle helper
// ---------------------------------------------------------------------------

test('areaFromTitle: "18,21 m2" with label', () => {
  assert.equal(areaFromTitle(TITLE_DABROWSKA_11), 18.21);
});

test('areaFromTitle: "21,19m2" without space between digits and unit', () => {
  assert.equal(areaFromTitle(TITLE_DABROWSKA_20), 21.19);
});

test('areaFromTitle: null when no area present', () => {
  assert.equal(areaFromTitle('przetarg gruntowy niezabudowany'), null);
});

// ---------------------------------------------------------------------------
// isResultNoticeTitle
// ---------------------------------------------------------------------------

test('isResultNoticeTitle: detects result notices', () => {
  assert.ok(isResultNoticeTitle(TITLE_RESULT_NOTICE));
  assert.ok(isResultNoticeTitle(TITLE_RESULT_FLAT));
  assert.ok(isResultNoticeTitle('Informacja o wyniku przetargu ul. Żeromskiego'));
});

test('isResultNoticeTitle: does not flag normal auction announcements', () => {
  assert.ok(!isResultNoticeTitle(TITLE_DABROWSKA_11));
  assert.ok(!isResultNoticeTitle(TITLE_GRUNTOWA_NIEZABUDOWANA));
});

// ---------------------------------------------------------------------------
// attachmentUrlFromDetail
// ---------------------------------------------------------------------------

// Real HTML from the Orląt Lwowskich result page (2022-07-06, groundtruthed)
const DETAIL_HTML_DOCX = `<div class="component-attachment item">
  <ul class="list-attachment">
    <li>
      <div class="attachment-item">
        <a href="/resource/9092/informacja+o+wyniku+przetargu+Orl%25C4%2585t+Lwowskich.docx"
           title="Informacja o wyniku przetargu ul. Orląt Lwowskich"
           class="piwik_download">Informacja o wyniku przetargu ul. Orląt Lwowskich</a>
        <span>DOCX | 15.27 KB</span>
      </div>
    </li>
  </ul>
</div>`;

// Announcement page with two attachments (result PDF + announcement PDF),
// matching the real Dąbrowska 5/20 page (groundtruthed 2026-06-27):
const DETAIL_HTML_PDF_RESULT = `<div class="component-attachment item">
  <ul class="list-attachment">
    <li>
      <div class="attachment-item">
        <a href="/resource/32968/INFORMACJA+5+20.pdf"
           title="Informacja o wyniku przetargu">Informacja o wyniku przetargu</a>
        <span>PDF | 114.64 KB</span>
      </div>
    </li>
    <li>
      <div class="attachment-item">
        <a href="/resource/32968/Przetarg+D%25C4%2585browska+520og%25C5%2582oszenie+i+warunki.pdf"
           title="Ogłoszenie o przetargu">Ogłoszenie o przetargu</a>
        <span>PDF | 177.08 KB</span>
      </div>
    </li>
  </ul>
</div>`;

test('attachmentUrlFromDetail: prefers DOCX over PDF', () => {
  const url = attachmentUrlFromDetail(DETAIL_HTML_DOCX);
  assert.ok(url);
  assert.ok(url.endsWith('.docx'), `expected .docx, got ${url}`);
  assert.ok(url.startsWith('https://bipum.kielce.eu'));
});

test('attachmentUrlFromDetail: falls back to PDF when no DOCX present', () => {
  const url = attachmentUrlFromDetail(DETAIL_HTML_PDF_RESULT);
  assert.ok(url);
  assert.ok(url.endsWith('.pdf'), `expected .pdf, got ${url}`);
  assert.ok(url.startsWith('https://bipum.kielce.eu'));
  // Must be the first (result) PDF, not the announcement PDF
  assert.ok(url.includes('INFORMACJA'), `expected result PDF, got ${url}`);
});

test('attachmentUrlFromDetail: returns null when no attachment present', () => {
  assert.equal(attachmentUrlFromDetail('<p>brak załączników</p>'), null);
  assert.equal(attachmentUrlFromDetail(null), null);
});

// ---------------------------------------------------------------------------
// Result DOCX parser — groundtruthed from the real Orląt Lwowskich DOCX
// ---------------------------------------------------------------------------

// Extracted text from /resource/9092/informacja+o+wyniku+przetargu+Orl%C4%85t+Lwowskich.docx
// (unzipped word/document.xml → stripped, as doc-text.js produces it, 2026-06-27).
// This is a LAND auction result, used to groundtruth the template structure.
// Flat results follow the identical DOCX template.
const RESULT_TEXT_ORLAT = `INFORMACJA O WYNIKU PRZETARGU
ustnego nieograniczonego, przeprowadzonego dnia 28 czerwca 2022 r. w Urzędzie Miasta Kielce, na sprzedaż prawa własności nieruchomości gruntowej niezabudowanej, stanowiącej własność Gminy Kielce, położonej w Kielcach przy ulicy Orląt Lwowskich, oznaczonej w ewidencji gruntów i budynków Miasta Kielce /obr. 0007/ numerem działki 899/8, o pow. 0,3571 ha, objętej księgą wieczystą Nr KI1L/00063564/7.
Do sprzedaży przeznaczona była nieruchomość gruntowa niezabudowana, stanowiąca własność Gminy Kielce, położona w Kielcach przy ulicy Orląt Lwowskich, oznaczona w ewidencji gruntów i budynków Miasta Kielce /obr. 0007/ numerem działki 899/8, o pow. 0,3571 ha, objęta księgą wieczystą Nr KI1L/00063564/7.
Liczba osób dopuszczonych do uczestnictwa w przetargu:
6	 (słownie: sześć)
Liczba osób niedopuszczonych do przetargu:
0          (słownie: zero)
Cena wywoławcza:						2 300 000,00 zł
				(słownie złotych: dwa miliony trzysta tysięcy 00/100 )
Najwyższa cena osiągnięta w przetargu:			3 250 000,00 zł
				(słownie złotych: trzy miliony dwieście pięćdziesiąt tysięcy 00/100 )
Sprzedaż przedmiotowej nieruchomości podlega zwolnieniu z opodatkowania podatkiem VAT. 
Nabywcą nieruchomości został ustalony:
PB CHAŁUPKA 2 Spółka z ograniczoną odpowiedzialnością ul. Stefana Okrzei Nr 41 lok. U6, 25-526 Kielce`;

// Synthetic flat result text — same template, swapping the property details.
// Represents a realistic "Informacja o wyniku przetargu na sprzedaż lokalu
// mieszkalnego" for Dąbrowska 5/11.
const RESULT_TEXT_FLAT = `INFORMACJA O WYNIKU PRZETARGU
ustnego nieograniczonego, przeprowadzonego dnia 15 marca 2026 r. w Urzędzie Miasta Kielce, na sprzedaż prawa własności lokalu mieszkalnego nr 11, o powierzchni użytkowej 18,21 m2, znajdującego się w budynku przy ul. Dąbrowskiej 5 w Kielcach, wraz z udziałem w nieruchomości wspólnej.
Lokal mieszkalny nr 11 o powierzchni użytkowej 18,21 m2, położony w budynku przy ul. Dąbrowskiej 5 w Kielcach.
Liczba osób dopuszczonych do uczestnictwa w przetargu:
3	 (słownie: trzy)
Liczba osób niedopuszczonych do przetargu:
0          (słownie: zero)
Cena wywoławcza:						48 000,00 zł
				(słownie złotych: czterdzieści osiem tysięcy 00/100)
Najwyższa cena osiągnięta w przetargu:			52 500,00 zł
				(słownie złotych: pięćdziesiąt dwa tysiące pięćset 00/100)
Nabywcą nieruchomości został ustalony:
Jan Kowalski, ul. Przykładowa 1, 25-001 Kielce`;

// Negative outcome (negatywny wynik przetargu)
const RESULT_TEXT_NEGATIVE = `INFORMACJA O WYNIKU PRZETARGU
ustnego nieograniczonego, przeprowadzonego dnia 10 maja 2026 r. w Urzędzie Miasta Kielce, na sprzedaż prawa własności lokalu mieszkalnego nr 20, o powierzchni użytkowej 21,19 m2, przy ul. Dąbrowskiej 5 w Kielcach.
Cena wywoławcza:						55 000,00 zł
Przetarg zakończył się wynikiem negatywnym — nikt nie przystąpił do licytacji.`;

// ---------------------------------------------------------------------------

test('isResultNotice: detects real Kielce DOCX header', () => {
  assert.ok(isResultNotice(RESULT_TEXT_ORLAT));
  assert.ok(isResultNotice(RESULT_TEXT_FLAT));
  assert.ok(!isResultNotice('zwykłe ogłoszenie o przetargu'));
});

test('auctionDateFromResultText: spelled-out month from Orląt Lwowskich', () => {
  assert.equal(auctionDateFromResultText(RESULT_TEXT_ORLAT), '2022-06-28');
});

test('auctionDateFromResultText: March flat result', () => {
  assert.equal(auctionDateFromResultText(RESULT_TEXT_FLAT), '2026-03-15');
});

test('auctionDateFromResultText: null on empty text', () => {
  assert.equal(auctionDateFromResultText(''), null);
});

test('startingPriceFromResultText: land result 2 300 000', () => {
  assert.equal(startingPriceFromResultText(RESULT_TEXT_ORLAT), 2300000);
});

test('startingPriceFromResultText: flat result 48 000', () => {
  assert.equal(startingPriceFromResultText(RESULT_TEXT_FLAT), 48000);
});

test('achievedPriceFromResultText: land result 3 250 000', () => {
  assert.equal(achievedPriceFromResultText(RESULT_TEXT_ORLAT), 3250000);
});

test('achievedPriceFromResultText: flat result 52 500', () => {
  assert.equal(achievedPriceFromResultText(RESULT_TEXT_FLAT), 52500);
});

test('achievedPriceFromResultText: null when not present', () => {
  assert.equal(achievedPriceFromResultText('Cena wywoławcza: 48 000,00 zł'), null);
});

test('addressFromResultText: land result (no building number) — returns null', () => {
  // "przy ulicy Orląt Lwowskich, oznaczonej ..." has no building number.
  // The parser requires a \d+ building token; land results return null (no address key).
  const addr = addressFromResultText(RESULT_TEXT_ORLAT);
  assert.equal(addr, null, 'land result: no building number → null address expected');
});

test('addressFromResultText: flat result — Dąbrowska 5', () => {
  const addr = addressFromResultText(RESULT_TEXT_FLAT);
  assert.ok(addr);
  assert.ok(/dabrowsk/i.test(addr.street_norm), 'street_norm must contain dabrowsk');
  assert.equal(addr.building, '5');
});

// ---------------------------------------------------------------------------
// parseResultDoc — full round-trip
// ---------------------------------------------------------------------------

test('parseResultDoc: land result (Orląt Lwowskich) — sold, correct prices and date', () => {
  const recs = parseResultDoc(
    RESULT_TEXT_ORLAT,
    null,
    'https://bipum.kielce.eu/resource/9092/informacja+o+wyniku+przetargu.docx',
  );
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.outcome, 'sold');
  assert.equal(r.auction_date, '2022-06-28');
  assert.equal(r.starting_price_pln, 2300000);
  assert.equal(r.final_price_pln, 3250000);
  // Land result: no building number → address is null (expected for grunt records).
  assert.equal(r.address, null);
  assert.ok(r.source_pdf.includes('/resource/'));
});

test('parseResultDoc: flat result (Dąbrowska 5/11) — sold, area extracted', () => {
  const recs = parseResultDoc(
    RESULT_TEXT_FLAT,
    null,
    'https://bipum.kielce.eu/resource/99999/wynik-dabrowska.docx',
  );
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.outcome, 'sold');
  assert.equal(r.auction_date, '2026-03-15');
  assert.equal(r.starting_price_pln, 48000);
  assert.equal(r.final_price_pln, 52500);
  assert.equal(r.area_m2, 18.21);
  assert.equal(r.kind, 'mieszkalny');
  assert.ok(r.address);
  assert.ok(/dabrowsk/i.test(r.address.street_norm));
});

test('parseResultDoc: negative outcome — outcome:unsold, final_price null', () => {
  const recs = parseResultDoc(
    RESULT_TEXT_NEGATIVE,
    null,
    'https://bipum.kielce.eu/resource/88888/wynik-negatywny.docx',
  );
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.final_price_pln, null);
  assert.equal(r.starting_price_pln, 55000);
  assert.equal(r.auction_date, '2026-05-10');
});

test('parseResultDoc: non-result text returns empty array', () => {
  const recs = parseResultDoc(
    'Ogłoszenie o przetargu ustnym nieograniczonym na sprzedaż lokalu mieszkalnego',
    null,
    'https://bipum.kielce.eu/resource/1/ann.docx',
  );
  assert.deepEqual(recs, []);
});

test('parseResultDoc: fallbackDate used when DOCX has no date', () => {
  const noDate = RESULT_TEXT_FLAT.replace(/przeprowadzonego dnia[\s\S]*?r\./, '');
  const recs = parseResultDoc(noDate, '2026-05-01', 'https://example.com/x.docx');
  assert.equal(recs.length, 1);
  assert.equal(recs[0].auction_date, '2026-05-01');
});
