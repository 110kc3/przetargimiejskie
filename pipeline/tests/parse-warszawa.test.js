// Warszawa parser tests.
//
// All fixtures derived from LIVE pages fetched 2026-06-29. No network calls.
//
// Live sources groundtruthed:
//   ETO LIST   https://eto.um.warszawa.pl/category/165/announcement (11 items)
//   DETAIL A   https://srodmiescie.um.warszawa.pl/-/marszalkowska-81-m-19-...
//   DETAIL B   https://srodmiescie.um.warszawa.pl/-/ul-noakowskiego-4-...
//   AMW DETAIL https://eto.um.warszawa.pl/category/165/announcement/153692
//              PDF at /announcement/attachment/153692/255542

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseEtoListPage,
  isResultNoticeTitle,
  parseDetailText,
  articleTextFromHtml,
  attachmentUrlFromEtoDetail,
  roundFromText,
  isResultNotice,
  auctionDateFromResultText,
  startingPriceFromResultText,
  achievedPriceFromResultText,
  addressFromResultText,
  parseResultDoc,
  parseAmwPdfText,
} from '../src/cities/warszawa/parse.js';

// ---------------------------------------------------------------------------
// Helper: build one ETO list <li> block (groundtruthed structure 2026-06-29)
// ---------------------------------------------------------------------------
function etoLi(etoId, etoNr, title, outerHref, pubFrom, pubTo) {
  return `<li>
  <div class="col-lg-12 custom-main_announcement_element">
    <a href="${outerHref}" class="announcement-link">
      <div class="box category-kind-announcement custom-main_announcement_element_link"
           data-id="${etoId}" data-title="${title}">
        <div class="col-lg-1 signature">Ogłoszenie<br />nr ${etoNr}</div>
        <div class="col-lg-9 title"><h3>${title}</h3></div>
        <div class="col-lg-1 publication-info">
          <p>Okres publikacji<br /><span>Od</span> ${pubFrom} <br /><span>Do</span> ${pubTo}</p>
        </div>
      </div>
    </a>
  </div>
</li>`;
}

// ---- Real titles from live ETO (2026-06-29) --------------------------------

const TITLE_MARSZALKOWSKA_19 =
  'Marszałkowska 81 m 19 - lokal mieszkalny przeznaczony do sprzedaży w drodze przetargu';
const TITLE_MARSZALKOWSKA_11 =
  'Marszałkowska 81 m 11 - lokal mieszkalny przeznaczony do sprzedaży w drodze przetargu';
const TITLE_NOAKOWSKI =
  'Śródmieście. ul. S. Noakowskiego 4 - przetargi ustne nieograniczone na sprzedaż lokali mieszkalnych nr 17 i nr 18';
const TITLE_AMW_ANDERSA =
  'Agencja Mienia Wojskowego, Ogłoszenie o pierwszym (I) przetargu ustnym nieograniczonym Nr 83/2026 ws. sprzedaży lokalu mieszkalnego nr 62 położonego przy ul. Gen. W. Andersa 20 w Warszawie, działka ew. nr 7 obręb 5-02-04';
const TITLE_AMW_SMOCZA =
  'Agencja Mienia Wojskowego, Ogłoszenie o drugim (II) przetargu ustnym nieograniczonym Nr 79/2026 ws. sprzedaży lokalu mieszkalnego nr 38 położonego przy ul. Smoczej 4 w Warszawie, działka ew. nr 60 obręb 6-02-07';
const TITLE_RESULT_OKRAG =
  'Śródmieście - Informacja o wyniku przetargu ustnego nieograniczonego na sprzedaż lokalu mieszkalnego nr 11, ul. Okrąg 2';
const TITLE_RESULT_NOAKOWSKI_10 =
  'Informacja o wyniku przetargu ustnego nieograniczonego na sprzedaż lokalu mieszkalnego nr 2a, ul. Noakowskiego 10';

const ETO_LIST_HTML = `<html><body><ul>
${etoLi('155716', '12745/2026', 'Agencja Mienia Wojskowego, Wykaz ws. sprzedaży w trybie przetargu ustnego nieograniczonego samodzielnego lokalu mieszkalnego nr 78, ul. Grójecka 66 w Dzielnicy Ochota w Warszawie, działka ew. nr 43 obręb 2-02-07', 'https://eto.um.warszawa.pl/category/165/announcement/155716', '25-06-2026', '16-07-2026')}
${etoLi('154472', '11501/2026', TITLE_MARSZALKOWSKA_19, 'https://srodmiescie.um.warszawa.pl/-/marszalkowska-81-m-19-lokal-mieszkalny-przeznaczony-do-sprzedazy-w-drodze-przetargu', '08-06-2026', '29-06-2026')}
${etoLi('154466', '11495/2026', TITLE_MARSZALKOWSKA_11, 'https://srodmiescie.um.warszawa.pl/-/marszalkowska-81-m-11-lokal-mieszkalny-przeznaczony-do-sprzedazy-w-drodze-przetargu', '08-06-2026', '29-06-2026')}
${etoLi('153692', '10721/2026', TITLE_AMW_ANDERSA, 'https://eto.um.warszawa.pl/category/165/announcement/153692', '29-05-2026', '03-08-2026')}
${etoLi('153350', '10379/2026', TITLE_AMW_SMOCZA, 'https://eto.um.warszawa.pl/category/165/announcement/153350', '26-05-2026', '27-07-2026')}
${etoLi('151079', '8108/2026', TITLE_NOAKOWSKI, 'https://srodmiescie.um.warszawa.pl/-/ul-noakowskiego-4-przetargi-ustne-nieograniczone-na-sprzedaz-lokali-mieszkalnych-nr-17-i-18', '22-04-2026', '09-07-2026')}
${etoLi('148000', '7777/2026', TITLE_RESULT_OKRAG, 'https://bip.warszawa.pl/web/srodmiescie/-/wynik-okrag', '04-05-2026', '12-05-2026')}
</ul></body></html>`;

// ---------------------------------------------------------------------------
// parseEtoListPage
// ---------------------------------------------------------------------------

test('parseEtoListPage: returns all 7 items', () => {
  const items = parseEtoListPage(ETO_LIST_HTML);
  assert.equal(items.length, 7);
});

test('parseEtoListPage: Marszałkowska 81 m 19 — city-owned metadata', () => {
  const items = parseEtoListPage(ETO_LIST_HTML);
  const item = items.find((i) => i.title.includes('m 19'));
  assert.ok(item, 'Marszalkowska m 19 must be present');
  assert.equal(item.eto_nr, '11501/2026');
  assert.equal(item.eto_id, '154472');
  assert.equal(item.published_from, '2026-06-08');
  assert.equal(item.published_to,   '2026-06-29');
  assert.equal(item.is_eto_hosted, false);
  assert.ok(item.detail_url.includes('srodmiescie.um.warszawa.pl'));
  assert.equal(item.kind, 'mieszkalny');
});

test('parseEtoListPage: AMW Andersa — ETO-hosted metadata', () => {
  const items = parseEtoListPage(ETO_LIST_HTML);
  const item = items.find((i) => i.title.includes('Andersa'));
  assert.ok(item, 'AMW Andersa must be present');
  assert.equal(item.eto_nr, '10721/2026');
  assert.equal(item.eto_id, '153692');
  assert.equal(item.published_from, '2026-05-29');
  assert.equal(item.published_to,   '2026-08-03');
  assert.equal(item.is_eto_hosted, true);
  assert.ok(item.detail_url.includes('eto.um.warszawa.pl/category/165/announcement/153692'));
  assert.equal(item.kind, 'mieszkalny');
});

test('parseEtoListPage: Noakowski — city-owned, Śródmieście portal link', () => {
  const items = parseEtoListPage(ETO_LIST_HTML);
  const item = items.find((i) => i.title.includes('Noakowskiego'));
  assert.ok(item, 'Noakowski must be present');
  assert.equal(item.eto_nr, '8108/2026');
  assert.equal(item.is_eto_hosted, false);
  assert.ok(item.detail_url.includes('srodmiescie.um.warszawa.pl'));
});

test('parseEtoListPage: result notice item is parsed', () => {
  const items = parseEtoListPage(ETO_LIST_HTML);
  const item = items.find((i) => i.title.includes('wyniku'));
  assert.ok(item, 'result notice must be present');
  assert.equal(item.eto_nr, '7777/2026');
});

test('parseEtoListPage: date DD-MM-YYYY → ISO YYYY-MM-DD (AMW Smocza)', () => {
  const items = parseEtoListPage(ETO_LIST_HTML);
  // Title has genitive "Smoczej" not nominative "Smocza"
  const amw = items.find((i) => i.title.includes('Smoczej'));
  assert.ok(amw, 'AMW Smocza item (genitive "Smoczej") must be found');
  assert.equal(amw.published_from, '2026-05-26');
  assert.equal(amw.published_to,   '2026-07-27');
});

test('parseEtoListPage: empty HTML returns empty array', () => {
  assert.deepEqual(parseEtoListPage('<html><body></body></html>'), []);
});

// ---------------------------------------------------------------------------
// isResultNoticeTitle
// ---------------------------------------------------------------------------

test('isResultNoticeTitle: detects result notice titles', () => {
  assert.ok(isResultNoticeTitle(TITLE_RESULT_OKRAG));
  assert.ok(isResultNoticeTitle(TITLE_RESULT_NOAKOWSKI_10));
  assert.ok(isResultNoticeTitle('Informacja o wyniku przetargu ustnego nieograniczonego na sprzedaż lokalu'));
});

test('isResultNoticeTitle: does not flag normal auction titles', () => {
  assert.ok(!isResultNoticeTitle(TITLE_MARSZALKOWSKA_19));
  assert.ok(!isResultNoticeTitle(TITLE_AMW_ANDERSA));
  assert.ok(!isResultNoticeTitle(TITLE_NOAKOWSKI));
});

// ---------------------------------------------------------------------------
// articleTextFromHtml
// ---------------------------------------------------------------------------

// Real HTML structure from srodmiescie.um.warszawa.pl (groundtruthed 2026-06-29)
const HTML_MARSZALKOWSKA = `<html><body>
<article class="entry-full-content journal-content-article" data-analytics-asset-id="160944475">
08.06.2026 Zarząd Dzielnicy Śródmieście m.st. Warszawy informuje, że na Elektronicznej Tablicy
Ogłoszeń m.st. Warszawy został zamieszczony na okres 21 dni wykaz lokalu mieszkalnego nr 19
położonego przy ul.&nbsp;Marszałkowskiej 81, przeznaczonego&nbsp;do sprzedaży w drodze przetargu
ustnego nieograniczonego wraz z udziałem w prawie własności gruntu.
</article>
</body></html>`;

// Real Noakowski article (groundtruthed 2026-06-29) — has two odbędzie się clauses:
// first anchors to venue (no date), second to actual auction date.
const HTML_NOAKOWSKI = `<html><body>
<article class="entry-full-content journal-content-article" data-analytics-asset-id="157992894">
22.04.2026 Zarząd Dzielnicy Śródmieście m.st. Warszawy informuje, że zostało podane do publicznej
wiadomości ogłoszenie o organizowanych przetargach ustnych nieograniczonych na sprzedaż lokali
mieszkalnych nr 17 i 18 przy ul. S. Noakowskiego 4 wraz z udziałami w prawie własności gruntu.
Przetargi odbędą się w siedzibie Urzędu Dzielnicy Śródmieście przy ul. Nowogrodzkiej 43.
Przetarg na sprzedaż lokalu mieszkalnego nr 17 odbędzie się w dniu 9 lipca 2026 r. o godzinie 10.00.
Przetarg na sprzedaż lokalu mieszkalnego nr 18 odbędzie się w dniu 9 lipca 2026 r. o godzinie 11.00.
</article>
</body></html>`;

test('articleTextFromHtml: extracts Liferay journal-content-article text', () => {
  const text = articleTextFromHtml(HTML_MARSZALKOWSKA);
  assert.ok(text.includes('Marszałkowskiej 81'), 'must include street name');
  assert.ok(text.includes('nr 19'), 'must include flat number');
  assert.ok(!text.includes('<'), 'must be stripped of HTML');
});

test('articleTextFromHtml: empty string on missing article element', () => {
  assert.equal(articleTextFromHtml('<div>no article here</div>'), '');
});

// ---------------------------------------------------------------------------
// parseDetailText
// ---------------------------------------------------------------------------

const TEXT_MARSZALKOWSKA = articleTextFromHtml(HTML_MARSZALKOWSKA);
const TEXT_NOAKOWSKI = articleTextFromHtml(HTML_NOAKOWSKI);

test('parseDetailText: Marszałkowska 81 m 19 — flat 19, building 81', () => {
  const r = parseDetailText(TEXT_MARSZALKOWSKA);
  assert.equal(r.apt, '19');
  assert.ok(r.address, 'address must be parsed');
  assert.ok(/marszalk/i.test(r.address.street_norm), `street_norm: ${r.address.street_norm}`);
  assert.equal(r.address.building, '81');
  assert.equal(r.address.apt, '19');
  assert.equal(r.address.key, 'marszalkowskiej|81|19');
});

test('parseDetailText: Marszałkowska 81 m 19 — address_raw includes building + apt', () => {
  const r = parseDetailText(TEXT_MARSZALKOWSKA);
  assert.ok(r.address_raw, 'address_raw must be set');
  assert.ok(r.address_raw.includes('81'));
  assert.ok(r.address_raw.includes('19'));
});

test('parseDetailText: Marszałkowska — no auction date (wykaz-phase)', () => {
  const r = parseDetailText(TEXT_MARSZALKOWSKA);
  assert.equal(r.auction_date, null, 'wykaz notice has no auction date');
});

test('parseDetailText: Noakowski 4 — flat 17 (first of multi-flat announcement)', () => {
  const r = parseDetailText(TEXT_NOAKOWSKI);
  assert.equal(r.apt, '17');
});

test('parseDetailText: Noakowski 4 — street noakowsk, building 4', () => {
  const r = parseDetailText(TEXT_NOAKOWSKI);
  assert.ok(r.address, 'address must be parsed');
  assert.ok(/noakowsk/i.test(r.address.street_norm), `street_norm: ${r.address.street_norm}`);
  assert.equal(r.address.building, '4');
});

test('parseDetailText: Noakowski 4 — auction date 2026-07-09 (second odbędzie się clause)', () => {
  const r = parseDetailText(TEXT_NOAKOWSKI);
  assert.equal(r.auction_date, '2026-07-09',
    'must find date from second "odbędzie się w dniu 9 lipca" clause, not first venue clause');
});

test('parseDetailText: null input → all-null result', () => {
  const r = parseDetailText(null);
  assert.equal(r.apt, null);
  assert.equal(r.address, null);
  assert.equal(r.auction_date, null);
});

// Synthetic text with area, round, and numeric auction date
const TEXT_WITH_EXTRAS =
  'Zarząd ogłasza drugi przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 5 ' +
  'o powierzchni użytkowej 42,50 m2 znajdującego się przy ul. Pięknej 10 w Warszawie. ' +
  'Przetarg odbędzie się w dniu 15.09.2026 r. o godzinie 10.00.';

test('parseDetailText: area "42,50 m2"', () => {
  const r = parseDetailText(TEXT_WITH_EXTRAS);
  assert.equal(r.area_m2, 42.5);
});

test('parseDetailText: round from "drugi przetarg"', () => {
  const r = parseDetailText(TEXT_WITH_EXTRAS);
  assert.equal(r.round, 2);
});

test('parseDetailText: numeric auction date 15.09.2026', () => {
  const r = parseDetailText(TEXT_WITH_EXTRAS);
  assert.equal(r.auction_date, '2026-09-15');
});

// ---------------------------------------------------------------------------
// roundFromText
// ---------------------------------------------------------------------------

test('roundFromText: Roman I / II / III prefix', () => {
  assert.equal(roundFromText('I przetarg ustny'), 1);
  assert.equal(roundFromText('II przetarg ustny'), 2);
  assert.equal(roundFromText('III przetarg ustny'), 3);
});

test('roundFromText: Polish ordinal word', () => {
  assert.equal(roundFromText('o drugim przetargu ustnym nieograniczonym'), 2);
  assert.equal(roundFromText('o trzecim przetargu ustnym'), 3);
  assert.equal(roundFromText('o pierwszym przetargu'), 1);
});

test('roundFromText: bare "przetarg" = 1', () => {
  assert.equal(roundFromText('przetarg ustny nieograniczony na sprzedaż'), 1);
});

test('roundFromText: null when no przetarg', () => {
  assert.equal(roundFromText(''), null);
  assert.equal(roundFromText('informacja o wyniku'), null);
});

// ---------------------------------------------------------------------------
// attachmentUrlFromEtoDetail
// ---------------------------------------------------------------------------

// Real HTML from ETO detail 153692 (AMW Andersa 20), groundtruthed 2026-06-29
const AMW_DETAIL_WITH_ATT = `<div>
<a href="/announcement/attachment/153692/255542">Ogłoszenie o przetargu nr 83/2026</a>
<a href="/announcement/attachment/153692/255542">pobierz plik</a>
</div>`;

test('attachmentUrlFromEtoDetail: extracts absolute ETO attachment URL', () => {
  const url = attachmentUrlFromEtoDetail(AMW_DETAIL_WITH_ATT);
  assert.ok(url);
  assert.equal(url, 'https://eto.um.warszawa.pl/announcement/attachment/153692/255542');
});

test('attachmentUrlFromEtoDetail: null when no attachment', () => {
  assert.equal(attachmentUrlFromEtoDetail('<p>Brak załączników.</p>'), null);
  assert.equal(attachmentUrlFromEtoDetail(null), null);
  assert.equal(attachmentUrlFromEtoDetail(''), null);
});

// ---------------------------------------------------------------------------
// Result notice parsers — groundtruthed on spike May 2026 data
// (nr 8944/2026: Okrąg 2 sold 965k→1060k, nr 8936/2026: Noakowskiego 10)
// ---------------------------------------------------------------------------

const RESULT_TEXT_SOLD = `Informacja o wyniku przetargu ustnego nieograniczonego
na sprzedaż lokalu mieszkalnego nr 11, położonego przy ul. Okrąg 2 w Warszawie,
przeprowadzonego dnia 5 maja 2026 r. w siedzibie Urzędu Dzielnicy Śródmieście.
Cena wywoławcza: 965 000,00 zł
Najwyższa cena osiągnięta w przetargu: 1 060 000,00 zł
Nabywcą nieruchomości została ustalona: Anna Kowalska, ul. Przykładowa 1, 00-001 Warszawa`;

const RESULT_TEXT_SOLD_2 = `Informacja o wyniku przetargu ustnego nieograniczonego
na sprzedaż lokalu mieszkalnego nr 2a, położonego przy ul. Noakowskiego 10 w Warszawie,
przeprowadzonego dnia 5 maja 2026 r. o godz. 10.00 w Urzędzie Dzielnicy Śródmieście.
Cena wywoławcza: 1 182 000,00 zł
Najwyższa cena osiągnięta w przetargu: 1 350 000,00 zł
Nabywcą nieruchomości został ustalony: Jan Nowak, ul. Inna 5, 00-002 Warszawa`;

const RESULT_TEXT_NEGATIVE = `Informacja o wyniku przetargu ustnego nieograniczonego
na sprzedaż lokalu mieszkalnego nr 17, położonego w budynku przy ul. Noakowskiego 4
w Warszawie, przeprowadzonego dnia 9 lipca 2026 r. w Urzędzie Dzielnicy Śródmieście.
Cena wywoławcza: 750 000,00 zł
Przetarg zakończył się wynikiem negatywnym — nikt nie przystąpił do licytacji.`;

test('isResultNotice: true for standard result notice', () => {
  assert.ok(isResultNotice(RESULT_TEXT_SOLD));
  assert.ok(isResultNotice(RESULT_TEXT_NEGATIVE));
  assert.ok(!isResultNotice('Ogłoszenie o przetargu ustnym na sprzedaż lokalu'));
});

test('auctionDateFromResultText: "przeprowadzonego dnia 5 maja 2026 r."', () => {
  assert.equal(auctionDateFromResultText(RESULT_TEXT_SOLD), '2026-05-05');
  assert.equal(auctionDateFromResultText(RESULT_TEXT_SOLD_2), '2026-05-05');
});

test('auctionDateFromResultText: "9 lipca 2026 r."', () => {
  assert.equal(auctionDateFromResultText(RESULT_TEXT_NEGATIVE), '2026-07-09');
});

test('auctionDateFromResultText: null when no date', () => {
  assert.equal(auctionDateFromResultText('Informacja o wyniku przetargu bez daty'), null);
});

test('startingPriceFromResultText: 965 000', () => {
  assert.equal(startingPriceFromResultText(RESULT_TEXT_SOLD), 965000);
});

test('startingPriceFromResultText: 1 182 000', () => {
  assert.equal(startingPriceFromResultText(RESULT_TEXT_SOLD_2), 1182000);
});

test('startingPriceFromResultText: 750 000 (negative result)', () => {
  assert.equal(startingPriceFromResultText(RESULT_TEXT_NEGATIVE), 750000);
});

test('achievedPriceFromResultText: 1 060 000', () => {
  assert.equal(achievedPriceFromResultText(RESULT_TEXT_SOLD), 1060000);
});

test('achievedPriceFromResultText: 1 350 000', () => {
  assert.equal(achievedPriceFromResultText(RESULT_TEXT_SOLD_2), 1350000);
});

test('achievedPriceFromResultText: null when not present', () => {
  assert.equal(achievedPriceFromResultText('Cena wywoławcza: 750 000,00 zł'), null);
});

test('addressFromResultText: Okrąg 2 — street okrag, building 2', () => {
  const addr = addressFromResultText(RESULT_TEXT_SOLD);
  assert.ok(addr);
  assert.ok(/okrag/i.test(addr.street_norm), `street_norm: ${addr.street_norm}`);
  assert.equal(addr.building, '2');
});

test('addressFromResultText: Noakowskiego 10 — building 10', () => {
  const addr = addressFromResultText(RESULT_TEXT_SOLD_2);
  assert.ok(addr);
  assert.ok(/noakowsk/i.test(addr.street_norm));
  assert.equal(addr.building, '10');
});

// ---------------------------------------------------------------------------
// parseResultDoc — full round-trips
// ---------------------------------------------------------------------------

test('parseResultDoc: Okrąg 2 sold — correct prices, date, apt, address', () => {
  const recs = parseResultDoc(
    RESULT_TEXT_SOLD,
    null,
    'https://bip.warszawa.pl/web/srodmiescie/-/wynik-okrag-2',
  );
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.outcome, 'sold');
  assert.equal(r.auction_date, '2026-05-05');
  assert.equal(r.starting_price_pln, 965000);
  assert.equal(r.final_price_pln, 1060000);
  assert.equal(r.kind, 'mieszkalny');
  assert.ok(r.address);
  assert.ok(/okrag/i.test(r.address.street_norm));
  assert.equal(r.apt, '11');
  assert.ok(r.source_pdf.includes('bip.warszawa.pl'));
});

test('parseResultDoc: Noakowskiego 10 sold — 1 182 000 → 1 350 000, apt 2a', () => {
  const recs = parseResultDoc(
    RESULT_TEXT_SOLD_2,
    null,
    'https://srodmiescie.um.warszawa.pl/-/wynik-noakowskiego-10',
  );
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.outcome, 'sold');
  assert.equal(r.starting_price_pln, 1182000);
  assert.equal(r.final_price_pln, 1350000);
  assert.equal(r.auction_date, '2026-05-05');
  assert.equal(r.apt, '2a');
});

test('parseResultDoc: negative outcome — unsold, final_price null', () => {
  const recs = parseResultDoc(
    RESULT_TEXT_NEGATIVE,
    null,
    'https://srodmiescie.um.warszawa.pl/-/wynik-negatywny',
  );
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.final_price_pln, null);
  assert.equal(r.starting_price_pln, 750000);
  assert.equal(r.auction_date, '2026-07-09');
});

test('parseResultDoc: fallbackDate used when text has no date', () => {
  const noDate = RESULT_TEXT_SOLD.replace(/przeprowadzonego dnia[\s\S]*?r\./, '');
  const recs = parseResultDoc(noDate, '2026-06-01', 'https://example.com/wynik.html');
  assert.equal(recs.length, 1);
  assert.equal(recs[0].auction_date, '2026-06-01');
});

test('parseResultDoc: non-result text returns empty array', () => {
  const recs = parseResultDoc(
    'Ogłoszenie o przetargu ustnym na sprzedaż lokalu mieszkalnego nr 5',
    null,
    'https://eto.um.warszawa.pl/x',
  );
  assert.deepEqual(recs, []);
});

// ---------------------------------------------------------------------------
// attachmentUrlFromEtoDetail: absolute URL (live ETO pages use full https://)
// ---------------------------------------------------------------------------

test('attachmentUrlFromEtoDetail: handles absolute https:// URL (live page format)', () => {
  const html = '<div>' +
    '<a target="_blank" href="https://eto.um.warszawa.pl/announcement/attachment/153692/255542">' +
    'Ogloszenie o przetargu nr 83/2026 (PDF, 1563 kB)' +
    '</a>' +
    '</div>';
  const url = attachmentUrlFromEtoDetail(html);
  assert.equal(url, 'https://eto.um.warszawa.pl/announcement/attachment/153692/255542');
});

// ---------------------------------------------------------------------------
// parseAmwPdfText — AMW PDF OCR text parser
// Fixtures derived from tesseract (eng) on PDFs 153692 and 154506, 2026-06-29.
// ---------------------------------------------------------------------------

const AMW_PDF_OCR_ANDERSA = [
  'ogtasza pierwszy (I) przetarg ustny nieograniczony nr 83/2026,',
  '',
  'na sprzedaz lokalu mieszkalnego nr 62, potozonego w Warszawie, przy ul. Gen. W. Andersa 20,',
  '',
  'bedqcego w zasobie Oddziatu Regionalnego Agencji Mienia Wojskowego w Warszawie.',
  '',
  'Warszawa, ul. Gen. W. Andersa 20 m. 62',
  '',
  '3} Powierzchnia lokalu',
  '',
  '20,76 m?',
  '',
  '===PAGE BREAK===',
  '',
  'Lokal mieszkalny nr 62 0 powierzchni 20,76 m*, usytuowany jest na piatym pietrze.',
  '',
  '466 000,00 zt netto',
  'Cena wywotawcza_ | sprzedazy. Na dzien publikacji ogloszenia.',
  'nie moze byc nizsze niz 1% tj. 4 660,00 zt.',
  '',
  '===PAGE BREAK===',
  '',
  'Przetarg odbedzie sie w dniu 10.08.2026 r. o godz. 10.00 w siedzibie Oddziatu.',
].join('\n');

const AMW_PDF_OCR_SMOCZA = [
  'ogtasza drugi (II) przetarg ustny nieograniczony nr 87/2026,',
  '',
  'na sprzedaz lokalu mieszkalnego nr 13, potozonego w Warszawie, przy ul. Smoczej 4,',
  '',
  'bedqcego w zasobie Oddziatu Regionalnego Agencji Mienia Wojskowego w Warszawie.',
  '',
  'Warszawa, ul. Smocza 4 m. 13',
  '',
  '3} Powierzchnia lokalu',
  '',
  '19,60 m?',
  '',
  '===PAGE BREAK===',
  '',
  'Lokal mieszkalny nr 13 0 powierzchni 19,60 m2, usytuowany na drugim pietrze.',
  '',
  '340 000,00 zt netto',
  'Cena wywotawcza_ | sprzedazy.',
  '',
  '===PAGE BREAK===',
  '',
  'Przetarg odbedzie sie w dniu 24.07.2026 r. o godz. 10.00 w siedzibie Oddziatu.',
].join('\n');

test('parseAmwPdfText: Andersa 20 m 62 — starting price 466 000', () => {
  const r = parseAmwPdfText(AMW_PDF_OCR_ANDERSA);
  assert.equal(r.starting_price_pln, 466000,
    'starting_price_pln should be 466000, got ' + r.starting_price_pln);
});

test('parseAmwPdfText: Andersa 20 m 62 — area 20.76', () => {
  const r = parseAmwPdfText(AMW_PDF_OCR_ANDERSA);
  assert.equal(r.area_m2, 20.76, 'area_m2 should be 20.76, got ' + r.area_m2);
});

test('parseAmwPdfText: Andersa 20 m 62 — auction date 2026-08-10', () => {
  const r = parseAmwPdfText(AMW_PDF_OCR_ANDERSA);
  assert.equal(r.auction_date, '2026-08-10',
    'auction_date should be 2026-08-10, got ' + r.auction_date);
});

test('parseAmwPdfText: Andersa 20 m 62 — round = 1', () => {
  const r = parseAmwPdfText(AMW_PDF_OCR_ANDERSA);
  assert.equal(r.round, 1, 'round should be 1, got ' + r.round);
});

test('parseAmwPdfText: Andersa 20 m 62 — apt = 62', () => {
  const r = parseAmwPdfText(AMW_PDF_OCR_ANDERSA);
  assert.equal(r.apt, '62', 'apt should be 62, got ' + r.apt);
});

test('parseAmwPdfText: Andersa 20 — address contains "Andersa" and building "20"', () => {
  const r = parseAmwPdfText(AMW_PDF_OCR_ANDERSA);
  assert.ok(r.address, 'address must be parsed');
  assert.ok(
    /anders/i.test(r.address.street_norm),
    'street_norm should contain "anders", got: ' + r.address?.street_norm,
  );
  assert.equal(r.address.building, '20');
});

test('parseAmwPdfText: Smocza 4 m 13 — starting price 340 000', () => {
  const r = parseAmwPdfText(AMW_PDF_OCR_SMOCZA);
  assert.equal(r.starting_price_pln, 340000,
    'starting_price_pln should be 340000, got ' + r.starting_price_pln);
});

test('parseAmwPdfText: Smocza 4 m 13 — area 19.60', () => {
  const r = parseAmwPdfText(AMW_PDF_OCR_SMOCZA);
  assert.equal(r.area_m2, 19.6, 'area_m2 should be 19.6, got ' + r.area_m2);
});

test('parseAmwPdfText: Smocza 4 m 13 — auction date 2026-07-24', () => {
  const r = parseAmwPdfText(AMW_PDF_OCR_SMOCZA);
  assert.equal(r.auction_date, '2026-07-24',
    'auction_date should be 2026-07-24, got ' + r.auction_date);
});

test('parseAmwPdfText: Smocza 4 m 13 — round = 2', () => {
  const r = parseAmwPdfText(AMW_PDF_OCR_SMOCZA);
  assert.equal(r.round, 2, 'round should be 2, got ' + r.round);
});

test('parseAmwPdfText: Smocza 4 m 13 — apt = 13', () => {
  const r = parseAmwPdfText(AMW_PDF_OCR_SMOCZA);
  assert.equal(r.apt, '13', 'apt should be 13, got ' + r.apt);
});

test('parseAmwPdfText: null/empty returns all-null', () => {
  const r = parseAmwPdfText(null);
  assert.equal(r.starting_price_pln, null);
  assert.equal(r.area_m2, null);
  assert.equal(r.auction_date, null);
  assert.equal(r.address, null);
  assert.equal(r.apt, null);
});
