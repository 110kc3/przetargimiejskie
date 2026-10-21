// Unit tests for Ożarów Mazowiecki adapter parsers.
// Fixtures are grounded in REAL announcements from ozarow-mazowiecki.pl
// and attached born-digital PDFs.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isSaleAuction,
  parseIndexPage,
  findAnnouncementPdfUrl,
  auctionDateFromOzarow,
  wadiumDeadlineFromText,
  priceFromOzarowText,
  extractUnitPrices,
  parcelFromOzarowText,
  obrebFromOzarowText,
  plotAreaFromOzarowText,
  titleFromPost,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/ozarow-mazowiecki/parse.js';

// ---------------------------------------------------------------------------
// 1. Helpers & Routing
// ---------------------------------------------------------------------------

test('isSaleAuction: identifies sale auctions and rejects non-auctions', () => {
  assert.equal(
    isSaleAuction('BURMISTRZ OŻAROWA MAZOWIECKIEGO OGŁASZA PIERWSZY PRZETARG USTNY NIEOGRANICZONY na sprzedaż lokalu mieszkalnego'),
    true,
  );
  assert.equal(
    isSaleAuction('Drugi przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 34 w budynku przy ul. Floriana 3'),
    true,
  );
  assert.equal(
    isSaleAuction('Pierwszy przetarg ustny nieograniczony na dzierżawę gruntu'),
    false,
  );
  assert.equal(
    isSaleAuction('Informacja o wyniku przetargu ustnego nieograniczonego'),
    false,
  );
  assert.equal(
    isSaleAuction('Odwołanie przetargu na sprzedaż nieruchomości'),
    false,
  );
});

test('parseIndexPage: parses li items and ignores non-property posts', () => {
  const html = `
  <article id="post-48911" class="page">
    <p><strong>Przetargi aktywne:</strong></p>
    <ul>
      <li>Pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 22 w budynku przy ul. Floriana 3 w Ożarowie Mazowieckim o pow. 51,00 m²<br />
        <a href="https://ozarow-mazowiecki.pl/2026/07/29/burmistrz-ozarowa-mazowieckiego-oglasza-pierwszy-przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-nr-22-w-budynku-przy-ul-floriana-3-w-ozarowie-mazowieckim-o-pow-5100-m%c2%b2//">link</a>
      </li>
      <li>Czwarty przetarg ustny nieograniczony na sprzedaż lokali mieszkalnych w budynku przy ul. Fabrycznej 5<br />
        <a href="http://ozarow-mazowiecki.pl/2026/07/31/burmistrz-ozarowa-mazowieckiego-oglasza-czwarty-przetarg-ustny-nieograniczony-na-sprzedaz-lokali-mieszkalnych-w-budynku-przy-ul-fabrycznej-5/">link</a>
      </li>
    </ul>
  </article>
  <aside>
    <a href="https://ozarow-mazowiecki.pl/2026/01/16/nowy-mobilny-system-informacji/">Nowy mobilny system</a>
    <a href="https://ozarow-mazowiecki.pl/2025/06/03/ozarowski-bon-zlobkowy-3/">Bon żłobkowy</a>
  </aside>
  `;
  const items = parseIndexPage(html);
  assert.equal(items.length, 2);
  assert.equal(
    items[0].url,
    'https://ozarow-mazowiecki.pl/2026/07/29/burmistrz-ozarowa-mazowieckiego-oglasza-pierwszy-przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-nr-22-w-budynku-przy-ul-floriana-3-w-ozarowie-mazowieckim-o-pow-5100-m%c2%b2',
  );
  assert.equal(
    items[1].url,
    'https://ozarow-mazowiecki.pl/2026/07/31/burmistrz-ozarowa-mazowieckiego-oglasza-czwarty-przetarg-ustny-nieograniczony-na-sprzedaz-lokali-mieszkalnych-w-budynku-przy-ul-fabrycznej-5',
  );
});

test('findAnnouncementPdfUrl: selects Załącznik nr 1 / Ogłoszenie o przetargu', () => {
  const html = `
    <a href="https://ozarow-mazowiecki.pl/wp-content/uploads/2026/07/Zarzadzenie_Nr_B.0050.181.2026.pdf">Zarządzenie</a>
    <a href="https://ozarow-mazowiecki.pl/wp-content/uploads/2026/07/Zalacznik_nr_1_-_Ogloszenie_o_przetargu.pdf">Załącznik 1</a>
    <a href="https://ozarow-mazowiecki.pl/wp-content/uploads/2026/07/Zalacznik_nr_2_-Regulamin_przetargu-2.pdf">Regulamin</a>
    <a href="https://ozarow-mazowiecki.pl/wp-content/uploads/2025/12/Fabryczna_5_parter.pdf">Rzut</a>
  `;
  const pdfUrl = findAnnouncementPdfUrl(html, 'https://ozarow-mazowiecki.pl/test-post/');
  assert.equal(
    pdfUrl,
    'https://ozarow-mazowiecki.pl/wp-content/uploads/2026/07/Zalacznik_nr_1_-_Ogloszenie_o_przetargu.pdf',
  );
});

test('auctionDateFromOzarow: handles explicit post PRZETARG date and typo year fallback in PDF', () => {
  const postHtml = '<p>PRZETARG 02 października 2026 roku szczegóły na stronie...</p>';
  const pdfWithTypo = 'Przetarg odbędzie się w dniu 2 października r. o godzinie 11:00 w budynku';
  assert.equal(auctionDateFromOzarow(postHtml, pdfWithTypo), '2026-10-02');

  const postWithoutDate = '<p>Szczegóły w załącznikach</p>';
  const pdfWithDate = 'Przetarg odbędzie się w dniu 24 czerwca 2026 r. o godzinie 10:00';
  assert.equal(auctionDateFromOzarow(postWithoutDate, pdfWithDate), '2026-06-24');
});

test('wadiumDeadlineFromText: extracts deadline date', () => {
  const pdf = 'Wadium należy wpłacić na rachunek bankowy do dnia 25 września 2026 r. z dopiskiem';
  assert.equal(wadiumDeadlineFromText(pdf), '2026-09-25');
});

test('priceFromOzarowText: extracts starting price with Polish delimiters', () => {
  const pdf = `Cena:
Cena wywoławcza lokalu mieszkalnego wraz z przypadającym udziałem w nieruchomości wspólnej wynosi 440 000,00 zł netto + VAT wg stawki obowiązującej.`;
  assert.equal(priceFromOzarowText(pdf), 440000);
});

test('extractUnitPrices: extracts multiple unit prices', () => {
  const pdf = `Cena:
Cena wywoławcza lokalu mieszkalnego wraz z przypadającym udziałem w nieruchomości wspólnej (budynku i gruncie) wynosi:
a) lokal nr 2 – 294 000,00 zł netto (słownie: dwieście dziewięćdziesiąt cztery tysiące złotych) + VAT wg stawki obowiązującej,
b) lokal nr 3 – 282 000,00 zł netto (słownie: dwieście osiemdziesiąt dwa tysiące złotych) + VAT wg stawki obowiązującej,
c) lokal nr 4 – 284 000,00 zł netto (słownie: dwieście osiemdziesiąt cztery tysiące złotych) + VAT wg stawki obowiązującej.`;
  const prices = extractUnitPrices(pdf);
  assert.equal(prices.get('2'), 294000);
  assert.equal(prices.get('3'), 282000);
  assert.equal(prices.get('4'), 284000);
});

test('parcelFromOzarowText, obrebFromOzarowText, plotAreaFromOzarowText: land parsing', () => {
  const text = `pierwszy przetarg ustny nieograniczony na sprzedaż nieruchomości gruntowej stanowiącej dz. ew. nr 11/202, 11/203 i 11/204 położonej w obrębie ewidencyjnym SHR Płochocin, w gminie Ożarów Mazowiecki`;
  assert.equal(parcelFromOzarowText(text), '11/202, 11/203 i 11/204');
  assert.equal(obrebFromOzarowText(text), 'SHR Płochocin');

  const textHa = `działkę ewidencyjną nr 156 z obrębu ewidencyjnego 0010 w Ożarowie Mazowieckim o powierzchni 0,1649 ha`;
  assert.equal(parcelFromOzarowText(textHa), '156');
  assert.equal(obrebFromOzarowText(textHa), '0010');
  assert.equal(plotAreaFromOzarowText(textHa), 1649);

  const textM2 = `działki ewidencyjne nr 167/11 i 167/12 z obrębu ewidencyjnego 0011 w Ożarowie Mazowieckim o łącznej powierzchni 386 m²`;
  assert.equal(parcelFromOzarowText(textM2), '167/11 i 167/12');
  assert.equal(obrebFromOzarowText(textM2), '0011');
  assert.equal(plotAreaFromOzarowText(textM2), 386);
});

// ---------------------------------------------------------------------------
// 2. Single Flat Fixture — Floriana 3/22 (Notice 2)
// ---------------------------------------------------------------------------

const FLORIANA_22_POST = `<!doctype html>
<html>
<head><title>BURMISTRZ OŻAROWA MAZOWIECKIEGO OGŁASZA PIERWSZY PRZETARG USTNY NIEOGRANICZONY na sprzedaż lokalu mieszkalnego nr 22 w budynku przy ul. Floriana 3 w Ożarowie Mazowieckim o pow. 51,00 m² : Serwis Gminy Ożarów Mazowiecki</title></head>
<body>
<h1>BURMISTRZ OŻAROWA MAZOWIECKIEGO OGŁASZA PIERWSZY PRZETARG USTNY NIEOGRANICZONY na sprzedaż lokalu mieszkalnego nr 22 w budynku przy ul. Floriana 3 w Ożarowie Mazowieckim o pow. 51,00 m²</h1>
<p>PRZETARG 02 października 2026 roku szczegóły na stronie ozarow-mazowiecki.pl</p>
<a href="https://ozarow-mazowiecki.pl/wp-content/uploads/2026/07/Zalacznik_nr_1_-Ogloszenie_o_przetargu-1.pdf">Załącznik nr 1</a>
</body>
</html>`;

const FLORIANA_22_PDF = `
Zał. 1 do ZARZĄDZENIA nr B.0050.177.2026 Burmistrza Ożarowa Mazowieckiego z dnia 22 lipca 2026 r.
Burmistrz Ożarowa Mazowieckiego ogłasza pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 22 w budynku przy ul. Floriana 3 w Ożarowie Mazowieckim o pow. 51,00 m² wraz z przypadającym udziałem w nieruchomości wspólnej wynoszącym 5100/167370.
Przedmiotem przetargu jest:
lokal mieszkalny nr 22 w budynku przy ul. Floriana 3 w Ożarowie Mazowieckim o pow. 51,00 m².
Cena:
Cena wywoławcza lokalu mieszkalnego wraz z przypadającym udziałem w nieruchomości wspólnej wynoszącym 5100/167370) wynosi 440 000,00 zł (słownie: czterysta czterdzieści tysięcy złotych) netto + VAT wg stawki obowiązującej.
Wadium:
44 000,00 zł (słownie: czterdzieści cztery tysiące złotych).
Wadium należy wpłacić na rachunek bankowy Gminy Ożarów Mazowiecki do dnia 25 września 2026 r.
Przetarg odbędzie się w dniu 2 października 2026 r. o godzinie 12:00 w budynku przy ul. Konotopskiej 4 w Ożarowie Mazowieckim.
`;

test('parseAnnouncement: single flat (Floriana 3/22)', () => {
  const url = 'https://ozarow-mazowiecki.pl/2026/07/29/burmistrz-ozarowa-mazowieckiego-oglasza-pierwszy-przetarg-ustny-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-nr-22-w-budynku-przy-ul-floriana-3-w-ozarowie-mazowieckim-o-pow-5100-m%c2%b2';
  const recs = parseAnnouncement(FLORIANA_22_POST, FLORIANA_22_PDF, url);
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address_raw, 'ul. Floriana 3/22');
  assert.ok(r.address);
  assert.equal(r.address.street_norm, 'floriana');
  assert.equal(r.address.building, '3');
  assert.equal(r.address.apt, '22');
  assert.equal(r.area_m2, 51);
  assert.equal(r.starting_price_pln, 440000);
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2026-10-02');
  assert.equal(r.wadium_deadline, '2026-09-25');
  assert.equal(r.detail_url, url);
});

// ---------------------------------------------------------------------------
// 3. Single Flat Fixture — Floriana 3/34 (Notice 3, second round)
// ---------------------------------------------------------------------------

const FLORIANA_34_POST = `<!doctype html>
<html>
<body>
<h1>Drugi przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 34 w budynku przy ul. Floriana 3 w Ożarowie Mazowieckim o pow. 50,90 m²</h1>
<p>PRZETARG 02 października 2026 roku</p>
</body>
</html>`;

const FLORIANA_34_PDF = `
Zał. 1 do ZARZĄDZENIA nr B.0050.176.2026 Burmistrza Ożarowa Mazowieckiego z dnia 22 lipca 2026 r.
Burmistrz Ożarowa Mazowieckiego ogłasza drugi przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 34 w budynku przy ul. Floriana 3 w Ożarowie Mazowieckim o pow. 50,90 m².
Cena:
Cena wywoławcza lokalu mieszkalnego wraz z przypadającym udziałem w nieruchomości wspólnej wynoszącym 5090/167370 wynosi 440 000,00 zł netto.
Wadium:
Wadium należy wpłacić do dnia 25 września 2026 r.
Przetarg odbędzie się w dniu 2 października r. o godzinie 11:00.
`;

test('parseAnnouncement: single flat II round with typo in PDF date (Floriana 3/34)', () => {
  const url = 'https://ozarow-mazowiecki.pl/2026/07/29/drugi-przetarg-floriana-3-34';
  const recs = parseAnnouncement(FLORIANA_34_POST, FLORIANA_34_PDF, url);
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address_raw, 'ul. Floriana 3/34');
  assert.equal(r.address.apt, '34');
  assert.equal(r.area_m2, 50.9);
  assert.equal(r.starting_price_pln, 440000);
  assert.equal(r.round, 2);
  assert.equal(r.auction_date, '2026-10-02');
  assert.equal(r.wadium_deadline, '2026-09-25');
});

// ---------------------------------------------------------------------------
// 4. Multi-Unit Fixture — Poznańska 171 (Notice 4)
// ---------------------------------------------------------------------------

const POZNANSKA_171_POST = `<!doctype html>
<html>
<body>
<h1>BURMISTRZ OŻAROWA MAZOWIECKIEGO OGŁASZA PIERWSZY PRZETARG USTNY NIEOGRANICZONY na sprzedaż lokali mieszkalnych nr 13 i 14 w budynku przy ul. Poznańskiej 171</h1>
<p>PRZETARG 2 października 2026 roku</p>
</body>
</html>`;

const POZNANSKA_171_PDF = `
Burmistrz Ożarowa Mazowieckiego ogłasza pierwszy przetarg ustny nieograniczony na sprzedaż lokali mieszkalnych nr 13 i 14 w budynku przy ul. Poznańskiej 171
Przedmiotem przetargu są lokale mieszkalne:
a) nr 13 w budynku przy ul. Poznańskiej 171 o pow. 40,84 m² wraz z udziałem w nieruchomości wspólnej wynoszącym 4084/172675,
b) nr 14 w budynku przy ul. ul. Poznańskiej 171 o pow. 29,04 m² wraz z udziałem w nieruchomości wspólnej wynoszącym 2904/172675,
zlokalizowane w budynku mieszkalnym wielorodzinnym na działce ewidencyjnej nr 6.
Cena:
Cena wywoławcza lokalu mieszkalnego wraz z przypadającym udziałem w nieruchomości wspólnej (budynku i gruncie) wynosi:
a) lokal nr 13 – 550 000,00 zł netto + VAT wg stawki obowiązującej,
b) lokal nr 14 – 390 000,00 zł netto + VAT wg stawki obowiązującej.
Wadium:
Wadium należy wpłacić do dnia 25 września 2026 r.
Przetarg odbędzie się w dniu 2 października 2026 r. o godzinie 10:00.
`;

test('parseAnnouncement: multi-unit (Poznańska 171 lok. 13 and 14)', () => {
  const url = 'https://ozarow-mazowiecki.pl/2026/07/29/poznanska-171-lokale-13-14';
  const recs = parseAnnouncement(POZNANSKA_171_POST, POZNANSKA_171_PDF, url);
  assert.equal(recs.length, 2);

  const u1 = recs.find((x) => x.address.apt === '13');
  assert.ok(u1);
  assert.equal(u1.address_raw, 'ul. Poznańskiej 171/13');
  assert.equal(u1.area_m2, 40.84);
  assert.equal(u1.starting_price_pln, 550000);
  assert.equal(u1.round, 1);
  assert.equal(u1.auction_date, '2026-10-02');
  assert.equal(u1.wadium_deadline, '2026-09-25');

  const u2 = recs.find((x) => x.address.apt === '14');
  assert.ok(u2);
  assert.equal(u2.address_raw, 'ul. Poznańskiej 171/14');
  assert.equal(u2.area_m2, 29.04);
  assert.equal(u2.starting_price_pln, 390000);
  assert.equal(u2.round, 1);
  assert.equal(u2.auction_date, '2026-10-02');
});

// ---------------------------------------------------------------------------
// 5. Multi-Unit Fixture — Fabryczna 5 IV przetarg (Notice 1)
// ---------------------------------------------------------------------------

const FABRYCZNA_5_POST = `<!doctype html>
<html>
<body>
<h1>BURMISTRZ OŻAROWA MAZOWIECKIEGO OGŁASZA CZWARTY PRZETARG USTNY NIEOGRANICZONY na sprzedaż lokali mieszkalnych w budynku przy ul. Fabrycznej 5</h1>
<p>PRZETARG 9 października 2026 roku</p>
</body>
</html>`;

const FABRYCZNA_5_PDF = `
Burmistrz Ożarowa Mazowieckiego ogłasza czwarty przetarg ustny nieograniczony na sprzedaż lokali mieszkalnych w budynku przy ul. Fabrycznej 5
Przedmiotem przetargu są lokale mieszkalne:
a) nr 2 w budynku przy ul. Fabrycznej 5 o pow. 39,86 m² wraz z udziałem,
b) nr 3 w budynku przy ul. Fabrycznej 5 o pow. 38,19 m² wraz z udziałem,
c) nr 4 w budynku przy ul. Fabrycznej 5 o pow. 38,52 m² wraz z udziałem,
d) nr 5 w budynku przy ul. Fabrycznej 5 o pow. 38,48 m² wraz z udziałem,
e) nr 11 w budynku przy ul. Fabrycznej 5 o pow. 41,98 m² wraz z udziałem,
f) nr 13 w budynku przy ul. Fabrycznej 5 o pow. 40,60 m² wraz z udziałem,
g) nr 14 w budynku przy ul. Fabrycznej 5 o pow. 40,76 m² wraz z udziałem.
Cena:
Cena wywoławcza lokalu mieszkalnego wraz z przypadającym udziałem w nieruchomości wspólnej wynosi:
a) lokal nr 2 – 294 000,00 zł netto,
b) lokal nr 3 – 282 000,00 zł netto,
c) lokal nr 4 – 284 000,00 zł netto,
d) lokal nr 5 – 284 000,00 zł netto,
e) lokal nr 11 – 353 000,00 zł netto,
f) lokal nr 13 – 341 000,00 zł netto,
g) lokal nr 14 – 342 000,00 zł netto.
Wadium należy wpłacić do dnia 2 października 2026 r.
Przetarg odbędzie się w dniu 9 października 2026 r. o godzinie 11:00.
`;

test('parseAnnouncement: multi-unit IV round (Fabryczna 5, 7 flats)', () => {
  const url = 'https://ozarow-mazowiecki.pl/2026/07/31/fabryczna-5-iv-przetarg';
  const recs = parseAnnouncement(FABRYCZNA_5_POST, FABRYCZNA_5_PDF, url);
  assert.equal(recs.length, 7);
  for (const r of recs) {
    assert.equal(r.kind, 'mieszkalny');
    assert.equal(r.round, 4);
    assert.equal(r.auction_date, '2026-10-09');
    assert.equal(r.wadium_deadline, '2026-10-02');
    assert.equal(r.address.building, '5');
  }
  const apt2 = recs.find((r) => r.address.apt === '2');
  assert.equal(apt2.area_m2, 39.86);
  assert.equal(apt2.starting_price_pln, 294000);

  const apt11 = recs.find((r) => r.address.apt === '11');
  assert.equal(apt11.area_m2, 41.98);
  assert.equal(apt11.starting_price_pln, 353000);
});

// ---------------------------------------------------------------------------
// 6. Land Fixture — SHR Płochocin (Notice 5)
// ---------------------------------------------------------------------------

const SHR_POST = `<!doctype html>
<html><body>
<h1>BURMISTRZ OŻAROWA MAZOWIECKIEGO OGŁASZA PIERWSZY PRZETARG USTNY NIEOGRANICZONY na sprzedaż nieruchomości gruntowej położonej w obrębie ewidencyjnym SHR Płochocin</h1>
<p>PRZETARG 29 września 2026 roku</p>
</body></html>`;

const SHR_PDF = `
Burmistrz Ożarowa Mazowieckiego ogłasza pierwszy przetarg ustny nieograniczony na sprzedaż nieruchomości gruntowej stanowiącej dz. ew. nr 11/202, 11/203, 11/204, 11/205, 11/206, 11/210, 11/211, 11/212, 11/213, 11/214 i 11/215 położonej w obrębie ewidencyjnym SHR Płochocin, w gminie Ożarów Mazowiecki
Cena:
Cena wywoławcza każdej z działek wraz z udziałem 1/18 w dz. ew. nr 11/207 z obr. SHR Płochocin wynosi 8 800,00 zł netto + VAT wg stawki obowiązującej.
Wadium należy wpłacić do dnia 22 września 2026 r.
Przetarg odbędzie się w dniu 29 września 2026 r. o godzinie 10:00.
`;

test('parseAnnouncement: land plot (SHR Płochocin)', () => {
  const url = 'https://ozarow-mazowiecki.pl/2026/07/29/shr-plochocin-land';
  const recs = parseAnnouncement(SHR_POST, SHR_PDF, url);
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '11/202, 11/203, 11/204, 11/205, 11/206, 11/210, 11/211, 11/212, 11/213, 11/214 i 11/215');
  assert.equal(r.obreb, 'SHR Płochocin');
  assert.equal(r.starting_price_pln, 8800);
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2026-09-29');
  assert.equal(r.wadium_deadline, '2026-09-22');
});

// ---------------------------------------------------------------------------
// 7. Land Fixture — dz. 167/11 i 167/12 (Notice 12)
// ---------------------------------------------------------------------------

const DZ_167_POST = `<!doctype html>
<html><body>
<h1>Pierwszy przetarg ustny nieograniczony na sprzedaż nieruchomości oznaczonej w ewidencji gruntów i budynków jako działki ewidencyjne nr 167/11 i 167/12 z obrębu ewidencyjnego 0011 w Ożarowie Mazowieckim</h1>
</body></html>`;

const DZ_167_PDF = `
Burmistrz Ożarowa Mazowieckiego ogłasza pierwszy przetarg ustny nieograniczony na sprzedaż nieruchomości oznaczonej w ewidencji gruntów i budynków jako działki ewidencyjne nr 167/11 i 167/12 z obrębu ewidencyjnego 0011 w Ożarowie Mazowieckim o łącznej powierzchni 386 m², w gminie Ożarów Mazowiecki.
Cena:
Cena wywoławcza nieruchomości oznaczonej w ewidencji gruntów i budynków jako działki ewidencyjne nr 167/11 i 167/12 z obrębu ewidencyjnego 0011 w Ożarowie Mazowieckim o łącznej powierzchni 386 m² wynosi 240 000,00 zł netto + VAT wg stawki obowiązującej.
Przetarg odbędzie się w dniu 7 listopada 2025 r. o godzinie 11:00.
`;

test('parseAnnouncement: land plot (dz. 167/11 i 167/12)', () => {
  const url = 'https://ozarow-mazowiecki.pl/2025/09/16/dzialki-167';
  const recs = parseAnnouncement(DZ_167_POST, DZ_167_PDF, url);
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '167/11 i 167/12');
  assert.equal(r.obreb, '0011');
  assert.equal(r.area_m2, 386);
  assert.equal(r.starting_price_pln, 240000);
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2025-11-07');
});

// ---------------------------------------------------------------------------
// 8. Result doc stub
// ---------------------------------------------------------------------------

test('parseResultDoc: returns [] for stubs', () => {
  assert.deepEqual(parseResultDoc(), []);
  assert.deepEqual(parseResultDoc('Informacja o wyniku przetargu'), []);
});
