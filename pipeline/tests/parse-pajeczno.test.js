// Pajęczno parser tests. Fixtures are condensed-but-faithful copies of the
// REAL HTML fetched live from www.pajeczno.pl on 2026-07-10 (verified with
// curl from this Pi's Polish residential IP) — the load-bearing quirky
// sentences (glued words, inconsistent price-format spacing, the garbled
// area-unit character) are preserved byte-for-byte from the source, with only
// non-parsed legal boilerplate paragraphs trimmed for fixture size. The
// result-notice fixture is the REAL tesseract -l pol OCR output (cached at
// pipeline/ocr-cache/Informacja_o_wyniku_przetargu_przeprowadzonego_w_dniu_12_01_2022.pdf.*.txt)
// of the one live "Informacja o wyniku przetargu" PDF found on the board.
//
//   n,410660  ul. Rekreacyjnej 7/20  — 30,00 m²,  220 000,00 zł netto (glued "SIĘDNIA", no-space price)
//   n,410661  ul. Rekreacyjnej 3/10  — 25,80 m²,  189 000,00 zł netto (spaced "SIĘ DNIA", apostrophe-before-"wynoszącej")
//   n,410662  ul. Małej 1/18         — 32,80 m²,  228 000,00 zł netto (glued "NETTONIERUCHOMOŚCI", "zł(słownie")
//   n,395483  Działka 1092 obręb Niwiska Dolne — 0,2500 ha, 40 000,00 zł (clean text, lowercase "odbędzie się dnia")
//   n,400452  wykaz (31-03-2026)     — no per-flat HTML data (scanned PDF only) → must be skipped
//   n,354725  "Informacja o wyniku przetargu" (14-01-2022) — INLINE BODY EMPTY;
//             real text lives only in the attached scanned PDF (confirmed via
//             pdftotext: 0 fonts, 1 embedded 200dpi JPEG) — OCR'd multi-parcel
//             land result: działka 894 SOLD, 591 UNSOLD (nikt nie wpłacił
//             wadium), 533/3 SOLD.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parsePLN,
  parseArea,
  parseDateText,
  auctionDateFromText,
  startingPriceFromText,
  achievedPriceFromText,
  isUnsoldText,
  roundFromTitle,
  parseBoardPage,
  extractTitle,
  extractBody,
  publishedDateFromDetail,
  extractAttachmentPdf,
  isResultTitle,
  parseDetailPage,
  parseResultDoc,
} from '../src/cities/pajeczno/parse.js';

// ---------------------------------------------------------------------------
// unit funcs
// ---------------------------------------------------------------------------

test('parsePLN: glued (no separator), spaced-thousands, dot-thousands (OCR)', () => {
  assert.equal(parsePLN('220000,00'), 220000);
  assert.equal(parsePLN('189 000,00'), 189000);
  assert.equal(parsePLN('62.500,00'), 62500);
  assert.equal(parsePLN(''), null);
  assert.equal(parsePLN(null), null);
});

test('parseArea: comma-decimal m2 / ha', () => {
  assert.equal(parseArea('30,00'), 30);
  assert.equal(parseArea('25,80'), 25.8);
  assert.equal(parseArea('0,2500'), 0.25);
  assert.equal(parseArea(null), null);
});

test('parseDateText: "15 maja 2026" -> 2026-05-15', () => {
  assert.equal(parseDateText('15 maja 2026'), '2026-05-15');
  assert.equal(parseDateText(null), null);
});

test('auctionDateFromText: glued "SIĘDNIA" (no space before DNIA)', () => {
  assert.equal(
    auctionDateFromText('PRZETARG ODBĘDZIE SIĘDNIA 17 czerwca 2026 ROKU O GODZ. 12:00 wbudynku Urzędu'),
    '2026-06-17',
  );
});

test('auctionDateFromText: spaced "SIĘ DNIA" (normal spacing)', () => {
  assert.equal(
    auctionDateFromText('PRZETARG ODBĘDZIE SIĘ DNIA 17 czerwca 2026 ROKU O GODZ. 11:00 w budynku Urzędu'),
    '2026-06-17',
  );
});

test('auctionDateFromText: lowercase land phrasing "odbędzie się dnia"', () => {
  assert.equal(
    auctionDateFromText('Przetarg odbędzie się dnia 12 marca 2026 r. o godz. 14:30 w budynku Urzędu'),
    '2026-03-12',
  );
});

test('startingPriceFromText: glued "NETTONIERUCHOMOŚCI...zł(słownie" (no spaces around punctuation)', () => {
  assert.equal(
    startingPriceFromText('CENA WYWOŁAWCZA NETTONIERUCHOMOŚCI WYNOSI - 228 000,00 zł(słownie: dwieście'),
    228000,
  );
});

test('startingPriceFromText: em-dash + no-space price run', () => {
  assert.equal(
    startingPriceFromText('CENA WYWOŁAWCZA NETTO NIERUCHOMOŚCI WYNOSI — 220000,00 zł (słownie: dwieście'),
    220000,
  );
});

test('startingPriceFromText: past tense "wynosiła" (result-doc phrasing)', () => {
  assert.equal(startingPriceFromText('Cena wywoławcza wynosiła 62.500,00 zł netto + 23 % podatek VAT.'), 62500);
});

test('startingPriceFromText: never matches the genitive wadium clause ("ceny wywoławczej")', () => {
  assert.equal(
    startingPriceFromText('Wadium w wysokości 10% ceny wywoławczej, tj. 22 000,00 zł, należy wnieść najpóźniej...'),
    null,
  );
});

test('achievedPriceFromText: "Cena uzyskana w przetargu wynosi ..."', () => {
  assert.equal(
    achievedPriceFromText('Cena uzyskana w przetargu wynosi 63.130,00 zł netto+ 23% podatek VAT'),
    63130,
  );
  assert.equal(achievedPriceFromText('Cena wywoławcza wynosiła 62.500,00 zł netto.'), null);
});

test('isUnsoldText: "nikt nie wpłacił wadium" / negative markers', () => {
  assert.equal(isUnsoldText('do wskazanego w ogłoszeniu dnia nikt nie wpłacił wadium.'), true);
  assert.equal(isUnsoldText('Przetarg zakończył się wynikiem negatywnym.'), true);
  assert.equal(isUnsoldText('Nabywcą zostali Państwo Łukasz i Krzysztofa Dzieszkowscy.'), false);
});

test('roundFromTitle: word ordinal "Pierwszy przetarg" and Roman fallback', () => {
  assert.equal(roundFromTitle('Pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego'), 1);
  assert.equal(roundFromTitle('Drugi przetarg ustny nieograniczony'), 2);
  assert.equal(roundFromTitle('II przetarg ustny nieograniczony na sprzedaż'), 2);
});

test('isResultTitle', () => {
  assert.equal(isResultTitle('Informacja o wyniku przetargu'), true);
  assert.equal(isResultTitle('Pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 20'), false);
});

// ---------------------------------------------------------------------------
// parseBoardPage — condensed real board fixture (2 pages, 2026-07-10)
// ---------------------------------------------------------------------------

const REKREACYJNA7_URL =
  'https://www.pajeczno.pl/informator/ogloszenia-o-sprzedazy-nieruchomosci/n,410660,pierwszy-przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-nr-20-polozonego-w-pajecznie-przy-ul-rekreacyjnej-7-wraz-z-udzialem-w-czesciach-wspolnych-budynku-i-wspolwlasnosci-gruntu.html';
const MALA1_URL =
  'https://www.pajeczno.pl/informator/ogloszenia-o-sprzedazy-nieruchomosci/n,410662,pierwszy-przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-nr-18-polozonego-w-pajecznie-przy-ul-malej-1-wraz-z-udzialem-w-czesciach-wspolnych-budynku-i-wspolwlasnosci-gruntu.html';
const DZIALKA1092_URL =
  'https://www.pajeczno.pl/informator/ogloszenia-o-sprzedazy-nieruchomosci/n,395483,ogloszenie-o-przetargu-na-sprzedaz-nieruchomosci-gminy-pajeczno-dzialka-1092-obreb-niwiska-dolne.html';
const WYKAZ_URL =
  'https://www.pajeczno.pl/informator/ogloszenia-o-sprzedazy-nieruchomosci/n,400452,ogloszenie-burmistrza-pajeczna-z-dnia-31-marca-2026-r-w-sprawie-sporzadzenia-wykazu-nieruchomosci-lokalowych-przeznaczonych-do-sprzedazy-w-trybie-przetargu-ustnego-nieograniczonego.html';

const BOARD_HTML = `
<div class="grouplist_main">
    <article class="row mb-5 g-0 position-relative" style="border-bottom: 0.3rem solid ;">
        <div class="col-md-5 d-flex flex-column justify-content-between">
            <div class="img_news"><img class="w-100" src="https://cdn02.sulimo.pl/media/public/pajeczno.pl/placeholder.png?1" alt="alt"/></div>
            <div class="date_news mb-2 mt-3 ps-3">
                        Opublikowane dn. 15-05-2026
                    </div>
        </div>
        <div class="col-md-7 d-flex flex-column justify-content-between ps-3">
            <h2 class="fw-bold h5" style="color: #414141;">Pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 18 położonego w
Pajęcznie przy...</h2>
            <p></p>
            <div class="text-end">
                <a class="btn fw-bold stretched-link" style="; " href="${MALA1_URL}">Czytaj więcej</a>
            </div>
        </div>
    </article>
    <div class="clearfix"></div>
    <article class="row mb-5 g-0 position-relative" style="border-bottom: 0.3rem solid ;">
        <div class="col-md-5 d-flex flex-column justify-content-between">
            <div class="img_news"><img class="w-100" src="https://cdn02.sulimo.pl/media/public/pajeczno.pl/placeholder.png?2" alt="alt"/></div>
            <div class="date_news mb-2 mt-3 ps-3">
                        Opublikowane dn. 15-05-2026
                    </div>
        </div>
        <div class="col-md-7 d-flex flex-column justify-content-between ps-3">
            <h2 class="fw-bold h5" style="color: #414141;">Pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 20 położonego w
Pajęcznie przy...</h2>
            <p></p>
            <div class="text-end">
                <a class="btn fw-bold stretched-link" style="; " href="${REKREACYJNA7_URL}">Czytaj więcej</a>
            </div>
        </div>
    </article>
    <div class="clearfix"></div>
    <article class="row mb-5 g-0 position-relative" style="border-bottom: 0.3rem solid ;">
        <div class="col-md-5 d-flex flex-column justify-content-between">
            <div class="img_news"><img class="w-100" src="https://cdn02.sulimo.pl/media/public/pajeczno.pl/placeholder.png?3" alt="alt"/></div>
            <div class="date_news mb-2 mt-3 ps-3">
                        Opublikowane dn. 03-04-2026
                    </div>
        </div>
        <div class="col-md-7 d-flex flex-column justify-content-between ps-3">
            <h2 class="fw-bold h5" style="color: #414141;">Ogłoszenie Burmistrza Pajęczna z dnia 31 marca 2026 r. w sprawie sporządzenia wykazu nieruchomości...</h2>
            <p></p>
            <div class="text-end">
                <a class="btn fw-bold stretched-link" style="; " href="${WYKAZ_URL}">Czytaj więcej</a>
            </div>
        </div>
    </article>
    <div class="clearfix"></div>
    <article class="row mb-5 g-0 position-relative" style="border-bottom: 0.3rem solid ;">
        <div class="col-md-5 d-flex flex-column justify-content-between">
            <div class="img_news"><img class="w-100" src="https://cdn02.sulimo.pl/media/public/pajeczno.pl/placeholder.png?4" alt="alt"/></div>
            <div class="date_news mb-2 mt-3 ps-3">
                        Opublikowane dn. 30-01-2026
                    </div>
        </div>
        <div class="col-md-7 d-flex flex-column justify-content-between ps-3">
            <h2 class="fw-bold h5" style="color: #414141;">Ogłoszenie o przetargu na sprzedaż nieruchomości Gminy Pajęczno Działka 1092 obręb Niwiska Dolne</h2>
            <p></p>
            <div class="text-end">
                <a class="btn fw-bold stretched-link" style="; " href="${DZIALKA1092_URL}">Czytaj więcej</a>
            </div>
        </div>
    </article>
    <div class="clearfix"></div>
</div>`;

test('parseBoardPage: extracts url + published_date for every article', () => {
  const items = parseBoardPage(BOARD_HTML);
  assert.equal(items.length, 4);
  const mala = items.find((i) => i.url === MALA1_URL);
  assert.ok(mala, 'Małej 1 item not found');
  assert.equal(mala.published_date, '2026-05-15');
  const dzialka = items.find((i) => i.url === DZIALKA1092_URL);
  assert.ok(dzialka, 'Działka 1092 item not found');
  assert.equal(dzialka.published_date, '2026-01-30');
});

test('parseBoardPage: deduplicates repeated hrefs', () => {
  const dupeHtml = BOARD_HTML + `<article class="row mb-5 g-0 position-relative"><a href="${MALA1_URL}">dup</a></article>`;
  const items = parseBoardPage(dupeHtml);
  assert.equal(items.filter((i) => i.url === MALA1_URL).length, 1);
});

test('parseBoardPage: empty/no-match HTML -> []', () => {
  assert.deepEqual(parseBoardPage(''), []);
  assert.deepEqual(parseBoardPage('<html><body>nothing</body></html>'), []);
});

// ---------------------------------------------------------------------------
// parseDetailPage — flat fixtures (condensed real HTML, 2026-07-10)
// ---------------------------------------------------------------------------

// n,410660 — ul. Rekreacyjnej 7/20. Load-bearing quirk: "SIĘDNIA" (glued, no
// space before "DNIA") and "220000,00 zł" (no thousands separator at all).
const REKREACYJNA7_HTML = `
<article class="news mb-4">
    <h2 class="h5 mb-3">Pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 20 położonego w
Pajęcznie przy ul. Rekreacyjnej 7 wraz z udziałem w częściach wspólnych budynku i współwłasności
gruntu.</h2>
            <div class="float-start w-50 me-3 mb-2">
                <img src="https://cdn02.sulimo.pl/media/public/pajeczno.pl/placeholder.png" alt="alt" class="w-100">
            <div class="py-2 ps-2 bg-light">
                                    Data publikacji:
                    15

                                            maja

                    2026
                            </div>
        </div>
                        <div class="news_content_pdf"> <p><strong>BURMISTRZ PAJĘCZNA</strong><br><strong>OGŁASZA</strong></p>
<p>Pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 20 położonego w<br>Pajęcznie przy ul. Rekreacyjnej 7 wraz z udziałem w częściach wspólnych budynku i współwłasności<br>gruntu.</p>
<p>Przedmiotem sprzedaży jest samodzielny lokal mieszkalny nr 20, położony na trzecim piętrze budynku<br>wielorodzinnego przy ul. Rekreacyjnej 7, składający się zjednego pokoju, kuchni, przedpokoju oraz<br>łazienki z WC o łącznej powierzchni użytkowej wynosźącej 30,00 m', do którego przynależy piwnica<br>o pow. 2,0 m<sup>2</sup>.</p>
<p><strong>CENA WYWOŁAWCZA NETTO NIERUCHOMOŚCI WYNOSI — 220000,00 zł (słownie: dwieście</strong><br><strong>dwadzieścia tysięcy złotych)</strong></p>
<p><strong><span style="text-decoration: underline;">PRZETARG ODBĘDZIE SIĘDNIA 17 czerwca 2026 ROKU O GODZ. 12:00</span> wbudynku Urzędu</strong><br><strong>Miejskiego w Pajęcznie, ul. Parkowa 8/12 (sala konferencyjna)</strong></p>
<p>Warunkiem przystąpienia do przetargu jest wniesienie przez uczestników przetargu wadium w<br>pieniądzu.</p>
<p>Wadium w wysokości 10% ceny wywoławczej, tj. <strong>22 000,00 zł</strong>, należy wnieść najpóźniej 7 dni przed<br>przetargiem.</p></div>
            <div style="clear: both;"></div>
                                <div class="news_content">
    <section class="my-5 p-3" style="background-color: #f4f4f4;">
        <h2 class="fw-bold h5 ps-4 pt-2 pb-3" style="color: #001B60;">Załączniki</h2>
        <table class="table table-borderless table-hover border-0">
            <tr class="d-flex">
                <td><a href="https://cdn02.sulimo.pl/media/userfiles/pajeczno.pl/PDF/Ogloszenie_przetarg_ustny_nieograniczony_lokal_ul_Rekreacyjna_7_m_20_Pajeczno.pdf" target="_blank" class="matomo_download">Ogloszenie.pdf</a></td>
            </tr>
        </table>
    </section>
</div>
</article>`;

test('parseDetailPage (Rekreacyjnej 7/20): kind + address', () => {
  const r = parseDetailPage(REKREACYJNA7_HTML, REKREACYJNA7_URL, null);
  assert.ok(r, 'must parse');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'rekreacyjnej|7|20');
  assert.equal(r.address.street, 'Rekreacyjnej');
  assert.equal(r.address.building, '7');
  assert.equal(r.address.apt, '20');
});

test('parseDetailPage (Rekreacyjnej 7/20): area/price/date survive the glued-word typos', () => {
  const r = parseDetailPage(REKREACYJNA7_HTML, REKREACYJNA7_URL, null);
  assert.equal(r.area_m2, 30);
  assert.equal(r.starting_price_pln, 220000);
  assert.equal(r.auction_date, '2026-06-17');
  assert.equal(r.round, 1);
  assert.equal(r.published_date, '2026-05-15');
  assert.equal(r.detail_url, REKREACYJNA7_URL);
});

// n,410661 — ul. Rekreacyjnej 3/10. Load-bearing quirk: normally-spaced "SIĘ
// DNIA" and "189 000,00 zł" (space-thousands), plus the area apostrophe
// glitch appearing BEFORE "wynoszącej" this time ("ołącznej powierzchni
// użytkowej 'wynoszącej 25,80 m²") rather than after the number.
const REKREACYJNA3_HTML = `
<article class="news mb-4">
    <h2 class="h5 mb-3">Pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 10 położonego w
Pajęcznie przy ul. Rekreacyjnej 3 wraz z udziałem w częściach wspólnych budynku i współwłasności
gruntu.</h2>
            <div class="float-start w-50 me-3 mb-2">
                <img src="https://cdn02.sulimo.pl/media/public/pajeczno.pl/placeholder.png" alt="alt" class="w-100">
            <div class="py-2 ps-2 bg-light">
                                    Data publikacji:
                    15

                                            maja

                    2026
                            </div>
        </div>
                        <div class="news_content_pdf"> <p><strong>BURMISTRZ PAJĘCZNA</strong><br><strong>OGŁASZA</strong></p>
<p>Przedmiotem sprzedaży jest samodzielny lokal mieszkalny nr 10, położony na pierwszym piętrze<br>budynku wielorodzinnego przy ul. Rekreacyjnej 3, składający się z jednego pokoju, kuchni, przedpokoju<br>oraz łazienki z z WC ołącznej powierzchni użytkowej 'wynoszącej 25,80 m<sup>2</sup>, do którego przynależy<br>piwnica o pow. 3,4 m<sup>2</sup>.</p>
<p><strong>CENA WYWOŁAWCZA NETTO NIERUCHOMOŚCI WYNOSI — 189 000,00 zł (słownie: sto</strong><br><strong>osiemdziesiąt dziewięć tysięcy złotych)</strong></p>
<p><strong><span style="text-decoration: underline;">PRZETARG ODBĘDZIE SIĘ DNIA 17 czerwca 2026 ROKU O GODZ. 11:00</span> w budynku Urzędu</strong><br><strong>Miejskiego w Pajęcznie, ul. Parkowa 8/12 (sala konferencyjna)</strong></p>
<p>Wadium w wysokości 10% ceny wywoławczej, tj. <strong>18 900,00 zł</strong>, należy wnieść najpóźniej 7 dni przed<br>przetargiem.</p></div>
            <div style="clear: both;"></div>
</article>`;

test('parseDetailPage (Rekreacyjnej 3/10): address + area survive the apostrophe-before-"wynoszącej" placement', () => {
  const r = parseDetailPage(REKREACYJNA3_HTML, 'https://example.com/410661', null);
  assert.equal(r.address.key, 'rekreacyjnej|3|10');
  assert.equal(r.area_m2, 25.8);
});

test('parseDetailPage (Rekreacyjnej 3/10): price/date with normal spacing', () => {
  const r = parseDetailPage(REKREACYJNA3_HTML, 'https://example.com/410661', null);
  assert.equal(r.starting_price_pln, 189000);
  assert.equal(r.auction_date, '2026-06-17');
});

// n,410662 — ul. Małej 1/18. Load-bearing quirk: "NETTONIERUCHOMOŚCI" (glued)
// and "228 000,00 zł(słownie" (no space before the parenthesis).
const MALA1_HTML = `
<article class="news mb-4">
    <h2 class="h5 mb-3">Pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 18 położonego w
Pajęcznie przy ul. Małej 1 wraz z udziałem w częściach wspólnych budynku i współwłasności
gruntu.</h2>
            <div class="float-start w-50 me-3 mb-2">
                <img src="https://cdn02.sulimo.pl/media/public/pajeczno.pl/placeholder.png" alt="alt" class="w-100">
            <div class="py-2 ps-2 bg-light">
                                    Data publikacji:
                    15

                                            maja

                    2026
                            </div>
        </div>
                        <div class="news_content_pdf"> <p><strong>BURMISTRZ PAJĘCZNA</strong><br><strong>OGŁASZA</strong></p>
<p>Przedmiotem sprzedaży jest samodzielny lokal mieszkalny nr 18, położony na drugim piętrze budynku<br>wielorodzinnego przy ul. Małej 1, składający się z jednego pokoju, kuchni, przedpokoju oraz łazienki z<br>WC o łącznej powierzchni użytkowej wynoszącej 32,80 m<sup>2</sup>, do którego przynależy piwnica o pow. 3,10<br>m<sup>2</sup>.</p>
<p><strong>CENA WYWOŁAWCZA NETTONIERUCHOMOŚCI WYNOSI - 228 000,00 zł(słownie: dwieście</strong><br><strong>dwadzieścia osiem tysięcy złotych)</strong></p>
<p><strong><span style="text-decoration: underline;">PRZETARG ODBĘDZIE SIĘ DNIA 17 czerwca 2026 ROKU O GODZ. 10:00</span> w budynku Urzędu</strong><br><strong>Miejskiego w Pajęcznie, ul. Parkowa 8/12 (sala konferencyjna)</strong></p></div>
            <div style="clear: both;"></div>
</article>`;

test('parseDetailPage (Małej 1/18): survives glued "NETTONIERUCHOMOŚCI" + "zł(słownie"', () => {
  const r = parseDetailPage(MALA1_HTML, MALA1_URL, '2026-05-15');
  assert.equal(r.address.key, 'malej|1|18');
  assert.equal(r.area_m2, 32.8);
  assert.equal(r.starting_price_pln, 228000);
  assert.equal(r.auction_date, '2026-06-17');
  assert.equal(r.published_date, '2026-05-15');
});

// ---------------------------------------------------------------------------
// parseDetailPage — land fixture (n,395483 Działka 1092 obręb Niwiska Dolne)
// ---------------------------------------------------------------------------

const LAND_HTML = `
<article class="news mb-4">
    <h2 class="h5 mb-3">Ogłoszenie o przetargu na sprzedaż nieruchomości Gminy Pajęczno Działka 1092 obręb Niwiska Dolne</h2>
            <div class="float-start w-50 me-3 mb-2">
                <img src="https://cdn02.sulimo.pl/media/public/pajeczno.pl/placeholder.png" alt="alt" class="w-100">
            <div class="py-2 ps-2 bg-light">
                                    Data publikacji:
                    30

                                            stycznia

                    2026
                            </div>
        </div>
                        <div class="news_content_pdf"> <p>Ogłoszenie o pierwszym przetargu ustnym nieograniczonym na sprzedaż nieruchomości stanowiących własność Gminy Pajęczno.</p>
<p>Przedmiotem sprzedaży jest nieruchomość niezabudowana o numerze 1092 położona w obrębie Niwiska Dolne o pow. 0,2500 ha dla której Sąd Rejonowy w Wieluniu VII Zamiejscowy Wydział Ksiąg Wieczystych z siedzibą w Pajęcznie prowadzi Księgę Wieczystą.</p>
<p>Cena wywoławcza netto nieruchomości wynosi 40 000,00 zł (słownie: czterdzieści tysięcy złotych) sprzedaż opodatkowana podatkiem VAT zgodnie z obowiązującymi przepisami.</p>
<p>Przetarg odbędzie się dnia 12 marca 2026 r. o godz. 14:30 w budynku Urzędu Miejskiego w Pajęcznie, ul. Parkowa 8/12 (sala konferencyjna).</p></div>
            <div style="clear: both;"></div>
</article>`;

test('parseDetailPage (Działka 1092): kind grunt with parcel + obręb + ha->m2 area', () => {
  const r = parseDetailPage(LAND_HTML, DZIALKA1092_URL, '2026-01-30');
  assert.ok(r, 'must parse');
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '1092');
  assert.equal(r.obreb, 'Niwiska Dolne');
  assert.equal(r.area_m2, 2500);
  assert.equal(r.starting_price_pln, 40000);
  assert.equal(r.auction_date, '2026-03-12');
  assert.equal(r.published_date, '2026-01-30');
});

// ---------------------------------------------------------------------------
// parseDetailPage — skip cases (wykaz / rokowania / bezprzetargowa / null)
// ---------------------------------------------------------------------------

const WYKAZ_HTML = `
<article class="news mb-4">
    <h2 class="h5 mb-3">Ogłoszenie Burmistrza Pajęczna z dnia 31 marca 2026 r. w sprawie sporządzenia wykazu nieruchomości lokalowych przeznaczonych
do sprzedaży w trybie przetargu ustnego nieograniczonego.</h2>
                        <div class="news_content_pdf"> <p>Działając na podstawie art. 35 ust. 1 i 2, art. 37 ust. 1 ustawy z dnia 21 sierpnia 1997 r. o gospodarce nieruchomościami Burmistrz Pajęczna ogłasza, co następuje:</p>
<ol>
<li>Z zasobu nieruchomości mieszkaniowego Gminy Pajęczno przeznaczone zostały do sprzedaży w trybie przetargu ustnego nieograniczonego trzy nieruchomości objęte wykazem stanowiącym załącznik do ogłoszenia.</li>
</ol></div>
            <div style="clear: both;"></div>
</article>`;

test('parseDetailPage: wykaz notice -> null (no per-flat HTML data, PDF only)', () => {
  assert.equal(parseDetailPage(WYKAZ_HTML, WYKAZ_URL, '2026-04-03'), null);
});

test('parseDetailPage: rokowania notice -> null (different disposal procedure)', () => {
  const html = `<article class="news mb-4"><h2 class="h5 mb-3">Ogłoszenie o pierwszych rokowaniach na sprzedaż nieruchomości gruntowej</h2></article>`;
  assert.equal(parseDetailPage(html, 'https://example.com/rokowania', null), null);
});

test('parseDetailPage: bezprzetargowa notice -> null (direct sale to tenant, not an open auction)', () => {
  const html = `<article class="news mb-4"><h2 class="h5 mb-3">Ogłoszenie o wykazie lokalu mieszkalnego przeznaczonego do sprzedaży w drodze bezprzetargowej</h2></article>`;
  assert.equal(parseDetailPage(html, 'https://example.com/bezprzetargowa', null), null);
});

test('parseDetailPage: result-notice title -> null (crawl.js routes results separately)', () => {
  const html = `<article class="news mb-4"><h2 class="h5 mb-3">Informacja o wyniku przetargu</h2></article>`;
  assert.equal(parseDetailPage(html, 'https://example.com/wynik', null), null);
});

test('parseDetailPage: null/empty html -> null', () => {
  assert.equal(parseDetailPage(null, 'x', null), null);
  assert.equal(parseDetailPage('', 'x', null), null);
});

// ---------------------------------------------------------------------------
// Result notice — inline body is EMPTY, text lives only in the attached PDF
// (n,354725, confirmed live 2026-07-10 — see module header)
// ---------------------------------------------------------------------------

const RESULT_NOTICE_URL =
  'https://www.pajeczno.pl/informator/ogloszenia-o-sprzedazy-nieruchomosci/n,354725,informacja-o-wyniku-przetargu.html';
const RESULT_PDF_URL =
  'https://cdn02.sulimo.pl/media/userfiles/pajeczno.pl/PDF/Informacja_o_wyniku_przetargu_przeprowadzonego_w_dniu_12_01_2022.pdf';

const RESULT_NOTICE_HTML = `
<article class="news mb-4">
    <h2 class="h5 mb-3">Informacja o wyniku przetargu</h2>
            <div class="float-start w-50 me-3 mb-2">
                <img src="https://cdn02.sulimo.pl/media/public/pajeczno.pl/placeholder.png" alt="alt" class="w-100">
            <div class="py-2 ps-2 bg-light">
                                    Data publikacji:
                    14

                                            stycznia

                    2022
                            </div>
        </div>
            <div class="lead mb-3 fw-bold">ustnego nieograniczonego przeprowadzonego w dniu 12 stycznia 2022 roku</div>
                        <div class="news_content_pdf"> </div>
            <div style="clear: both;"></div>
                                <div class="news_content">
    <section class="my-5 p-3" style="background-color: #f4f4f4;">
        <table class="table table-borderless table-hover border-0">
            <tr class="d-flex">
                <td><a href="${RESULT_PDF_URL}" target="_blank" class="matomo_download">Informacja o wyniku przetargu przeprowadzonego w dniu 12.01.2022.pdf</a></td>
            </tr>
        </table>
    </section>
</div>
</article>`;

test('result notice: title matches, inline body is empty, attachment PDF found', () => {
  const title = extractTitle(RESULT_NOTICE_HTML);
  assert.equal(isResultTitle(title), true);
  assert.equal(extractBody(RESULT_NOTICE_HTML), '');
  assert.equal(extractAttachmentPdf(RESULT_NOTICE_HTML), RESULT_PDF_URL);
  assert.equal(publishedDateFromDetail(RESULT_NOTICE_HTML), '2022-01-14');
});

test('result notice: parseDetailPage returns null (routed separately by crawl.js)', () => {
  assert.equal(parseDetailPage(RESULT_NOTICE_HTML, RESULT_NOTICE_URL, null), null);
});

// ---------------------------------------------------------------------------
// parseResultDoc — REAL tesseract -l pol OCR text of the attached PDF above.
// Multi-parcel land result: działka 894 SOLD, 591 UNSOLD, 533/3 SOLD.
// ---------------------------------------------------------------------------

const RESULT_OCR_TEXT = `URZĄD MIEJSKI
W PAJĘCZNIE

ul. Parkowa 8/12, 98-330 Pajęczno
tel. (034) 311-15-23, fax (34) 311-21-35

INFORMACJA O WYNIKU PRZETARGU
ustnego nieograniczonego przeprowadzonego
w dniu 12 stycznia 2022 r.

Zgodnie z $ 12 rozporządzenia Rady Ministrów z dnia 14 września 2004r. w sprawie sposobu
i trybu przeprowadzania przetargów oraz rokowań na zbycie nieruchomości (t.j. Dz. U. z 2021
r. poz. 2213) informuję, że w dniu 12 stycznia 2022 r. w siedzibie Urzędu Miejskiego
w Pajęcznie został przeprowadzony pierwszy przetarg ustny nieograniczony na sprzedaż
nieruchomości położonych w Pajęcznie, Starych Gajęcicach i Patrzykowie oznaczonych
w ewidencji gruntów jako działki numer: 894 o pow. 0,14 ha obręb M. Pajęczno, 591 o pow.
0,13 ha obręb Stare Gajęcice, 533/3 o pow. 0,3802 ha obręb Patrzyków.

1. Dla działki nr 894 o pow. 0,14 ha położonej w Pajęcznie zostało wpłacone jedno wadium,
do przetargu została dopuszczona jedna osoba spełniająca warunki przetargu.

Cena wywoławcza wynosiła 62.500,00 zł netto + 23 % podatek VAT.

Cena uzyskana w przetargu wynosi 63.130,00 zł netto+ 23% podatek VAT (proporcjonalnie
do powierzchni podlegającej opodatkowaniu).

Cena brutto wynosi : 70.389,95 zł (słownie: siedemdziesiąt tysięcy trzysta osiemdziesiąt
dziewięć złotych 95/100).
Nabywcą zostali Państwo Łukasz i Krzysztofa Dzieszkowscy.

2. Dla działki nr 591 o pow. 0,13 ha położonej w Starych Gajęcicach do wskazanego
w ogłoszeniu dnia nikt nie wpłacił wadium.

3. Dla działki nr 533/3 o pow. 0,3802 ha położonej w Patrzykowie zostały wpłacone trzy wadia,
do przetargu zostało dopuszczonych dwóch kandydatów na nabywcę spełniających warunki
przetargu.

Cena wywoławcza wynosiła 6.160,00 zł netto + podatek VAT zgodnie z obowiązującymi
przepisami,

Cena uzyskana w przetargu wynosi 15.070,00 zł netto.

Cena brutto wynosi : 15.070,00 zł (słownie: piętnaście tysięcy siedemdziesiąt złotych 00/100).
Nabywcą została Pani Elżbieta Kula-Przybytek.

Niniejsza informacja podlega wywieszeniu na tablicy ogłoszeń Urzędu Miejskiego w Pajęcznie
i umieszczeniu na stronie internetowej www.pajeczno.pl. i w BIP.
`;

test('parseResultDoc (real OCR, multi-parcel): 3 records, one per działka', () => {
  const recs = parseResultDoc(RESULT_OCR_TEXT, '2022-01-14', RESULT_PDF_URL);
  assert.equal(recs.length, 3);
  assert.deepEqual(recs.map((r) => r.dzialka_nr), ['894', '591', '533/3']);
  assert.ok(recs.every((r) => r.kind === 'grunt'));
  assert.ok(recs.every((r) => r.auction_date === '2022-01-12'), 'auction_date from "w dniu 12 stycznia 2022"');
});

test('parseResultDoc (real OCR): działka 894 SOLD 62 500 -> 63 130', () => {
  const [r] = parseResultDoc(RESULT_OCR_TEXT, '2022-01-14', RESULT_PDF_URL);
  assert.equal(r.starting_price_pln, 62500);
  assert.equal(r.final_price_pln, 63130);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.unsold_reason, null);
});

test('parseResultDoc (real OCR): działka 591 UNSOLD (nikt nie wpłacił wadium, no restated price)', () => {
  const recs = parseResultDoc(RESULT_OCR_TEXT, '2022-01-14', RESULT_PDF_URL);
  const r = recs.find((x) => x.dzialka_nr === '591');
  assert.equal(r.starting_price_pln, null);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'brak wadium');
});

test('parseResultDoc (real OCR): działka 533/3 SOLD 6 160 -> 15 070', () => {
  const recs = parseResultDoc(RESULT_OCR_TEXT, '2022-01-14', RESULT_PDF_URL);
  const r = recs.find((x) => x.dzialka_nr === '533/3');
  assert.equal(r.starting_price_pln, 6160);
  assert.equal(r.final_price_pln, 15070);
  assert.equal(r.outcome, 'sold');
});

// ---------------------------------------------------------------------------
// parseResultDoc — single-property branch: flat template (UNVERIFIED against
// a live doc — no flat result has posted on the board as of 2026-07-10; this
// exercises the same confirmed vocabulary applied to the flat/address shape
// already verified live for announcements — see parse.js header)
// ---------------------------------------------------------------------------

const FLAT_RESULT_SOLD_TEXT =
  'INFORMACJA O WYNIKU PRZETARGU\n' +
  'Burmistrz Pajęczna informuje, że w dniu 17 czerwca 2026 r. odbył się pierwszy przetarg ustny ' +
  'nieograniczony na sprzedaż lokalu mieszkalnego nr 20 położonego w Pajęcznie przy ul. Rekreacyjnej 7 ' +
  'wraz z udziałem w częściach wspólnych budynku i współwłasności gruntu.\n' +
  'Cena wywoławcza wynosiła 220 000,00 zł.\n' +
  'Cena uzyskana w przetargu wynosi 225 000,00 zł.\n' +
  'Nabywcą została Pani Jan Kowalska.';

test('parseResultDoc (flat template, sold): address + prices + notes flag it unverified', () => {
  const [r] = parseResultDoc(FLAT_RESULT_SOLD_TEXT, null, 'https://example.com/wynik-mieszkalny');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'rekreacyjnej|7|20');
  assert.equal(r.starting_price_pln, 220000);
  assert.equal(r.final_price_pln, 225000);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.auction_date, '2026-06-17');
  assert.ok(r.notes.some((n) => /unverified/i.test(n)), 'must flag the flat branch as unverified');
});

const FLAT_RESULT_UNSOLD_TEXT =
  'INFORMACJA O WYNIKU PRZETARGU\n' +
  'w dniu 17 czerwca 2026 r. odbył się pierwszy przetarg ustny nieograniczony na sprzedaż lokalu ' +
  'mieszkalnego nr 10 położonego w Pajęcznie przy ul. Rekreacyjnej 3 wraz z udziałem w częściach ' +
  'wspólnych budynku i współwłasności gruntu.\n' +
  'Nikt nie przystąpił do przetargu. Przetarg zakończył się wynikiem negatywnym.';

test('parseResultDoc (flat template, unsold): outcome unsold, no final price', () => {
  const [r] = parseResultDoc(FLAT_RESULT_UNSOLD_TEXT, null, 'https://example.com/wynik-mieszkalny-2');
  assert.equal(r.address.key, 'rekreacyjnej|3|10');
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
});

// ---------------------------------------------------------------------------
// parseResultDoc — gates
// ---------------------------------------------------------------------------

test('parseResultDoc: an ordinary announcement (not a result notice) -> []', () => {
  assert.deepEqual(
    parseResultDoc(
      'Burmistrz Pajęczna ogłasza pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 1.',
      null,
      'x',
    ),
    [],
  );
});

test('parseResultDoc: empty/null text -> []', () => {
  assert.deepEqual(parseResultDoc('', null, 'x'), []);
  assert.deepEqual(parseResultDoc(null, null, 'x'), []);
});
