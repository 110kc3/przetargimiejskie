import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parsePLN,
  parseArea,
  toAscii,
  roundFromText,
  isCancelled,
  extractArticleText,
  extractTitle,
  extractPublishedDate,
  extractAuctionDate,
  extractStartingPrice,
  extractFinalPrice,
  extractAreaM2,
  findResultPdfHref,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/kolbuszowa/parse.js';
import { discoverSprzedazYearCats } from '../src/cities/kolbuszowa/crawl.js';


function pageHtml(fullTitle, bodyText, publishedIso, attachmentsHtml = '') {
  return `<!doctype html><html><head>
<title>Przetargi - 2026 r. - ${fullTitle}</title></head><body>
<div class="site-content"><div class="art-body clearfix">
  <div class="row"><div id="akapitBody" class="col-xs-12">
    <p style="text-align: center;"><strong>Ogłoszenie o przetargu</strong></p>
    <p>${bodyText}</p>
  </div></div>
  <!--ZALACZNIKI-->
  <div class="attachments"><ul class="list-unstyled attachments">${attachmentsHtml}</ul></div>
</div>
<div class="user-create"><span class="glyphicon glyphicon-calendar"></span>Data publikacji: <strong>${publishedIso} 18:33</strong></div>
</div></body></html>`;
}

function att(href, label) {
  return `<li><em class="fal fa-paperclip"></em><span class="img-pdf"></span><a href="${href}" target="_blank">${label}</a></li>`;
}

const FLAT2022_TITLE =
  'Burmistrz Kolbuszowej ogłasza I publiczny przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego własności Gminy Kolbuszowa wraz z pomieszczeniem przynależnym oraz udziałem w nieruchomości wspólnej.';
const FLAT2022_HTML = pageHtml(
  FLAT2022_TITLE,
  `Burmistrz Kolbuszowej ogłasza I publiczny przetarg ustny nieograniczony na sprzedaż
lokalu mieszkalnego własności Gminy Kolbuszowa wraz z pomieszczeniem przynależnym oraz
udziałem w nieruchomości wspólnej. Przedmiotem przetargu jest: Lokal mieszkalny nr 2
położony w budynku wielorodzinnym w Kolbuszowej przy ulicy Targowej 8 o powierzchni
użytkowej 25,04 m 2 wraz z pomieszczeniem przynależnym oraz ze sprzedażą udziału
2742/94095 części nieruchomości wspólnej, oraz udział wynoszący 2742/94095 części w
prawie własności działki oznaczonej nr ew. 1321/2 o powierzchni 0,0239 ha, objętej KW
TB1K/00005975/3. Osoby zainteresowane nabyciem lokalu mogą go oglądać w dniach 17 i 24
listopada 2022 r. w godzinach 8 00 - 13 00. Cena wywoławcza nieruchomości wynosi
102 990,00 złotych brutto; w tym cena lokalu - 102 481,00 złotych cena udziału w gruncie
- 509,00 złotych Wadium wynosi - 20 598,00 złotych. Przetarg odbędzie się w Urzędzie
Miejskim w Kolbuszowej przy ul. Obrońców Pokoju 21 w sali Nr 1 w dniu 7 grudnia 2022 r.
o godzinie 9 00.`,
  '2022-11-02',
  att('/static/img/k05/2022/OGLOSZENIA/2_11_ogloszenie_lokal_kolbuszowa.pdf', 'Ogłoszenie o przetargu (312,49 kB)') +
    att('/static/img/k05/2022/SPRZEDAZ_NIERUCHOMOSCI/20_12_Informacja_o_wyniku_przetargu_lokal_Kolbuszowa.pdf', 'Informacja o wyniku przetargu (1,15 MB)'),
);

const FLAT2025_TITLE =
  'Burmistrz Kolbuszowej ogłasza I publiczny przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego własności Gminy Kolbuszowa wraz z pomieszczeniem przynależnym oraz udziałem w nieruchomości wspólnej.';
const FLAT2025_HTML = pageHtml(
  FLAT2025_TITLE,
  `Burmistrz Kolbuszowej ogłasza I publiczny przetarg ustny nieograniczony na sprzedaż
lokalu mieszkalnego własności Gminy Kolbuszowa. Przedmiotem przetargu jest: Samodzielny
lokal mieszkalny nr 17 położony w budynku wielorodzinnym w Kolbuszowej przy ulicy
Kolejowej 12 o powierzchni użytkowej 24,60 m 2 wraz z pomieszczeniem przynależnym oraz
ze sprzedażą udziału 2460/104020 części nieruchomości wspólnej, oraz udział wynoszący
2460/104020 części w prawie własności działki oznaczonej nr ew. 1539/5 o powierzchni
0,2163 ha, objętej KW TB1K/00024136/9. Osoby zainteresowane nabyciem lokalu mogą go
oglądać w dniach 18 i 25 czerwca 2025 r. w godzinach 8:00 - 13:00. Cena wywoławcza
nieruchomości wynosi 130 439,00 złotych brutto, w tym: cena lokalu – 125 553,00 złotych
cena udziału w gruncie – 4 886,00 złotych Wadium wynosi: 26 080,00 złotych. Przetarg
odbędzie się w dniu 11 lipca 2025 r. w Urzędzie Miejskim w Kolbuszowej przy ul. Obrońców
Pokoju 21 w sali nr 1 o godz. 9:00.`,
  '2025-06-10',
  att('/static/img/k05/2025/rolnictwo/10_6_25_lokal_mieszkalny_17.pdf', 'Ogłoszenie o przetargu (1,92 MB)') +
    att('/static/img/k05/2025/przetargi/rolnictwo/wynik_przetargu_23_07_2025.pdf', 'Wynik przetargu (525,94 kB)'),
);

const LAND2026_TITLE =
  'Burmistrz Kolbuszowej ogłasza II publiczny przetarg ustny nieograniczony na sprzedaż nieruchomości własności Gminy Kolbuszowa.';
const LAND2026_HTML = pageHtml(
  LAND2026_TITLE,
  `Burmistrz Kolbuszowej ogłasza II publiczny przetarg ustny nieograniczony na sprzedaż
nieruchomości własności Gminy Kolbuszowa. Przedmiotem przetargu jest: Niezabudowana
nieruchomość gruntowa położona w Kupnie, oznaczona nr ew. działek 1125/147 i 2030
objętych KW TB1K/00021820/0, stanowiących kompleks funkcjonalno-użytkowy o łącznej
powierzchni 0,1257 ha. Cena wywoławcza nieruchomości wynosi: 69 135,00 złotych brutto.
Wadium wynosi: 13 827,00 złotych. Przetarg odbędzie się w dniu 13 lipca 2026 r. w
Urzędzie Miejskim w Kolbuszowej przy ul. Obrońców Pokoju 21 w sali nr 1 o godz. 10:00.`,
  '2026-06-12',
);

const BUILT2026_TITLE =
  'Burmistrz Kolbuszowej ogłasza III publiczny przetarg ustny nieograniczony na sprzedaż nieruchomości własności Gminy Kolbuszowa.';
const BUILT2026_HTML = pageHtml(
  BUILT2026_TITLE,
  `Burmistrz Kolbuszowej ogłasza III publiczny przetarg ustny nieograniczony na sprzedaż
nieruchomości własności Gminy Kolbuszowa. Przedmiotem przetargu jest: Zabudowana
nieruchomość gruntowa położona w Hucie Przedborskiej oznaczona nr ew. działki 300/2 o
powierzchni 0,2057 ha, objętej KW TB1K/00030000/0. Pierwszy przetarg odbył się w dniu 6
października 2025 r. i zakończył się wynikiem negatywnym. Drugi przetarg zakończył się
wynikiem negatywnym. Cena wywoławcza nieruchomości wynosi: 300 000,00 (brutto, w tym
podatek VAT 23%). Przetarg odbędzie się w dniu 24 marca 2026 r. w Urzędzie Miejskim w
Kolbuszowej przy ul. Obrońców Pokoju 21 w sali nr 1 o godz. 10:00.`,
  '2026-02-20',
);

const TOWNLAND2026_HTML = pageHtml(
  'Burmistrz Kolbuszowej ogłasza I publiczny przetarg ustny nieograniczony na sprzedaż nieruchomości własności Gminy Kolbuszowa.',
  `Burmistrz Kolbuszowej ogłasza I publiczny przetarg ustny nieograniczony na sprzedaż
nieruchomości własności Gminy Kolbuszowa. Przedmiotem przetargu jest: Niezabudowana
nieruchomość gruntowa położona w Kolbuszowej przy ulicy Błonie oznaczona nr ew. działki
39/1 o powierzchni 0,8097 ha. Cena wywoławcza nieruchomości wynosi: 107 411,00 złotych
brutto. Przetarg odbędzie się w dniu 13 lipca 2026 r. w Urzędzie Miejskim w Kolbuszowej
przy ul. Obrońców Pokoju 21 w sali nr 1 o godz. 9:00.`,
  '2026-05-15',
);

const RESULT2022_OCR =
  `Informację o wyniku przetargu ustnego nieograniczonego na zbycie nieruchomości Gminy
Kolbuszowa, który odbył się w dniu 7 grudnia 2022 r. w siedzibie Urzędu Miejskiego w
Kolbuszowej. I publiczny przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego
nr 2 położonego w budynku wielorodzinnym w Kolbuszowej przy ulicy Targowej 8 wraz z
pomieszczeniem przynależnym oraz sprzedażą udziału 2742/94095 części w nieruchomości
wspólnej. Cena wywoławcza nieruchomości — 102 990,00 złotych (brutto) Najwyższa cena
osiągnięta w przetargu — 172 000,00 złotych (brutto) Liczba osób dopuszczonych do
uczestnictwa w przetargu — 8 Nabywca nieruchomości — Pan Roman Puk`;

const RESULT2025_OCR =
  `Informację o wyniku przetargu ustnego nieograniczonego na zbycie nieruchomości Gminy
Kolbuszowa, który odbył się w dniu 11 lipca 2025 r. w siedzibie Urzędu Miejskiego w
Kolbuszowej. I publiczny przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego
nr 17 własności Gminy Kolbuszowa, położonego w budynku wielorodzinnym w Kolbuszowej przy
ulicy Kolejowej 12, wraz z pomieszczeniem przynależnym. Cena wywoławcza nieruchomości —
130 439,00 złotych brutto Najwyższa cena osiągnięta w przetargu — 131 749,00 złotych
(brutto) Nabywca nieruchomości — Państwo Magdalena i Marek Piróg`;

const RESULT2021_OCR =
  `Informację o wyniku przetargu ustnego nieograniczonego na zbycie nieruchomości Gminy
Kolbuszowa, który odbył się w dniu 25 maja 2021 r. w siedzibie Urzędu Miejskiego w
Kolbuszowej. I publiczny przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego
nr 21 położonego w budynku wielorodzinnym w Kolbuszowej przy ulicy Piłsudskiego 6/10
wraz ze sprzedażą udziału 4124/248791 części w nieruchomości wspólnej. Cena wywoławcza
nieruchomości — 106 985,00 złotych (brutto) Najwyższa cena osiągnięta w przetargu —
146 000,00 złotych (brutto) Nabywca nieruchomości — Pani Bożena Bester`;

const RESULT_NEGATIVE_OCR =
  `Informację o wyniku I publicznego przetargu ustnego nieograniczonego na sprzedaż lokalu
mieszkalnego nr 2 położonego w budynku wielorodzinnym w Kolbuszowej przy ulicy Targowej 8,
który odbył się w dniu 7 grudnia 2022 r. Cena wywoławcza nieruchomości — 102 990,00 złotych
(brutto). Przetarg zakończył się wynikiem negatywnym, ponieważ nikt nie wpłacił wadium.`;


test('parsePLN: space-thousands + comma-grosze, plain, and null', () => {
  assert.equal(parsePLN('102 990,00'), 102990);
  assert.equal(parsePLN('69 135,00'), 69135);
  assert.equal(parsePLN('172 000,00'), 172000);
  assert.equal(parsePLN('88500'), 88500);
  assert.equal(parsePLN('brak'), null);
});

test('parseArea: comma and dot decimals', () => {
  assert.equal(parseArea('24,60'), 24.6);
  assert.equal(parseArea('0,1257'), 0.1257);
  assert.equal(parseArea('0.0239'), 0.0239);
});

test('extractAreaM2: flat "powierzchni użytkowej X m 2" vs land "X ha" (×10000)', () => {
  assert.equal(extractAreaM2('o powierzchni użytkowej 25,04 m 2', 'mieszkalny'), 25.04);
  assert.equal(extractAreaM2('o łącznej powierzchni 0,1257 ha', 'grunt'), 1257);
  assert.equal(extractAreaM2('o powierzchni 0,0322 ha', 'grunt'), 322);
});

test('roundFromText: "I/II publiczny przetarg ustny" (intervening "publiczny")', () => {
  assert.equal(roundFromText('ogłasza I publiczny przetarg ustny nieograniczony'), 1);
  assert.equal(roundFromText('ogłasza II publiczny przetarg ustny nieograniczony'), 2);
  assert.equal(roundFromText('III publiczny przetarg ustny ograniczony'), 3);
  assert.equal(roundFromText('coś bez numeru'), null);
});

test('extractAuctionDate: spelled-out "w dniu" (singular) — never the "w dniach" viewing dates', () => {
  const body = 'oglądać w dniach 17 i 24 listopada 2022 r. ... odbędzie się ... w dniu 7 grudnia 2022 r.';
  assert.equal(extractAuctionDate(body), '2022-12-07');
  assert.equal(extractAuctionDate('który odbył się w dniu 25 maja 2021 r.'), '2021-05-25');
  assert.equal(extractAuctionDate('brak daty'), null);
});

test('isCancelled: title-scoped "odwołanie"/"unieważnienie", not the standing body clause', () => {
  assert.equal(isCancelled('Burmistrz Kolbuszowej ogłasza I publiczny przetarg ustny'), false);
  assert.equal(isCancelled('Informacja o odwołaniu przetargów na sprzedaż nieruchomości'), true);
  assert.equal(isCancelled('Unieważnienie przetargu'), true);
});

test('extractArticleText / extractTitle / extractPublishedDate: real Pro3W containers, body stops before ZALACZNIKI', () => {
  const text = extractArticleText(FLAT2022_HTML);
  assert.ok(text.includes('102 990,00 złotych'), `price missing from body: ${text.slice(0, 120)}`);
  assert.ok(!/Informacja o wyniku/i.test(text), 'attachment label leaked into article text');
  assert.ok(extractTitle(FLAT2022_HTML).startsWith('Burmistrz Kolbuszowej'), 'title breadcrumb prefix not stripped');
  assert.equal(extractPublishedDate(FLAT2022_HTML), '2022-11-02');
});

test('extractStartingPrice / extractFinalPrice: total (not the cena-lokalu breakdown) + achieved price', () => {
  const body = extractArticleText(FLAT2022_HTML);
  assert.equal(extractStartingPrice(body), 102990);
  assert.equal(extractFinalPrice(RESULT2022_OCR), 172000);
  assert.equal(extractFinalPrice('brak takiej linii'), null);
});

test('findResultPdfHref: picks the "wynik" attachment, not the "Ogłoszenie" one', () => {
  assert.equal(
    findResultPdfHref(FLAT2022_HTML),
    '/static/img/k05/2022/SPRZEDAZ_NIERUCHOMOSCI/20_12_Informacja_o_wyniku_przetargu_lokal_Kolbuszowa.pdf',
  );
  assert.equal(findResultPdfHref(FLAT2025_HTML), '/static/img/k05/2025/przetargi/rolnictwo/wynik_przetargu_23_07_2025.pdf');
  assert.equal(findResultPdfHref(LAND2026_HTML), null);
});


test('parseAnnouncement: 2022 flat (Targowej 8/2) — flat classified from BODY; office "przy ul. Obrońców Pokoju 21" NOT captured', () => {
  const r = parseAnnouncement(FLAT2022_HTML, 'https://bip.kolbuszowa.pl/63-przetargi/8331-2022-r/9714-x.html');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.street, 'Targowej');
  assert.equal(r.address.building, '8');
  assert.equal(r.address.apt, '2');
  assert.equal(r.address.key, 'targowej|8|2');
  assert.equal(r.area_m2, 25.04);
  assert.equal(r.starting_price_pln, 102990);
  assert.equal(r.auction_date, '2022-12-07');
  assert.equal(r.published_date, '2022-11-02');
  assert.equal(r.round, 1);
  assert.equal(r.cancelled, false);
});

test('parseAnnouncement: 2025 flat (Kolejowej 12/17) — "Samodzielny lokal … nr 17"; auction date precedes the office clause', () => {
  const r = parseAnnouncement(FLAT2025_HTML, 'https://bip.kolbuszowa.pl/63-przetargi/13508-2025-r/14625-x.html');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.street, 'Kolejowej');
  assert.equal(r.address.building, '12');
  assert.equal(r.address.apt, '17');
  assert.equal(r.area_m2, 24.6);
  assert.equal(r.starting_price_pln, 130439);
  assert.equal(r.auction_date, '2025-07-11');
  assert.equal(r.round, 1);
});


test('parseAnnouncement: 2026 land (Kupno) — kind grunt, parcel-keyed, ha→m², round II', () => {
  const r = parseAnnouncement(LAND2026_HTML, 'https://bip.kolbuszowa.pl/63-przetargi/16729-2026-r/17732-x.html');
  assert.equal(r.kind, 'grunt');
  assert.equal(r.address, null);
  assert.equal(r.dzialka_nr, '1125/147 i 2030');
  assert.equal(r.obreb, 'Kupnie');
  assert.equal(r.area_m2, 1257);
  assert.equal(r.starting_price_pln, 69135);
  assert.equal(r.auction_date, '2026-07-13');
  assert.equal(r.round, 2);
});

test('parseAnnouncement: built plot ("zabudowana nieruchomość gruntowa", no street) reroutes to grunt; auction date is the FUTURE "odbędzie się" (not the prior round\'s "odbył się"); price without "złotych"', () => {
  const r = parseAnnouncement(BUILT2026_HTML, 'https://bip.kolbuszowa.pl/63-przetargi/16729-2026-r/16730-x.html');
  assert.equal(r.kind, 'grunt');
  assert.equal(r.address, null);
  assert.equal(r.dzialka_nr, '300/2');
  assert.equal(r.obreb, 'Hucie Przedborskiej');
  assert.equal(r.area_m2, 2057);
  assert.equal(r.round, 3);
  assert.equal(r.auction_date, '2026-03-24');
  assert.equal(r.starting_price_pln, 300000);
});

test('parseAnnouncement: in-town land ("…w Kolbuszowej przy ulicy Błonie…") — obręb is "Kolbuszowej", never "Kolbuszowej przy"', () => {
  const r = parseAnnouncement(TOWNLAND2026_HTML, 'u');
  assert.equal(r.kind, 'grunt');
  assert.equal(r.obreb, 'Kolbuszowej');
  assert.equal(r.dzialka_nr, '39/1');
  assert.equal(r.starting_price_pln, 107411);
  assert.equal(r.auction_date, '2026-07-13');
});


test('parseResultDoc: 2022 flat result (Targowej 8/2) — SOLD, real achieved price 172 000', () => {
  const [r] = parseResultDoc(RESULT2022_OCR, null, 'https://bip.kolbuszowa.pl/x/res2022.pdf');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'targowej|8|2');
  assert.equal(r.starting_price_pln, 102990);
  assert.equal(r.final_price_pln, 172000);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.unsold_reason, null);
  assert.equal(r.auction_date, '2022-12-07');
  assert.equal(r.round, 1);
  assert.equal(r.source_pdf, 'https://bip.kolbuszowa.pl/x/res2022.pdf');
});

test('parseResultDoc: 2025 flat result (Kolejowej 12/17) — SOLD, achieved 131 749', () => {
  const [r] = parseResultDoc(RESULT2025_OCR, null, 'x');
  assert.equal(r.address.key, 'kolejowej|12|17');
  assert.equal(r.starting_price_pln, 130439);
  assert.equal(r.final_price_pln, 131749);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.auction_date, '2025-07-11');
});

test('parseResultDoc: 2021 flat result (Piłsudskiego 6/10 lokal nr 21) — SOLD; compound building "6/10" → bare 6, apt 21 from "lokal … nr 21"', () => {
  const [r] = parseResultDoc(RESULT2021_OCR, null, 'x');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.street, 'Piłsudskiego');
  assert.equal(r.address.building, '6');
  assert.equal(r.address.apt, '21');
  assert.equal(r.starting_price_pln, 106985);
  assert.equal(r.final_price_pln, 146000);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.auction_date, '2021-05-25');
});

test('parseResultDoc: negative-outcome notice (template) — unsold, no fabricated final price', () => {
  const [r] = parseResultDoc(RESULT_NEGATIVE_OCR, '2022-12-07', 'x');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'targowej|8|2');
  assert.equal(r.starting_price_pln, 102990);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'wynik negatywny');
});

test('parseResultDoc: a LAND result is not a flat result (flat achieved-price stream only) → []', () => {
  const land = 'Informację o wyniku przetargu na sprzedaż niezabudowanej nieruchomości gruntowej ' +
    'położonej w Kupnie, dz. nr 8/464. Najwyższa cena osiągnięta w przetargu — 30 000,00 złotych.';
  assert.deepEqual(parseResultDoc(land, null, 'x'), []);
});

test('parseResultDoc: empty / non-result input → []', () => {
  assert.deepEqual(parseResultDoc('', null, 'x'), []);
  assert.deepEqual(parseResultDoc(null, null, 'x'), []);
  assert.deepEqual(parseResultDoc('Zwykły tekst bez wyniku przetargu.', null, 'x'), []);
});


test('discoverSprzedazYearCats: reads only the "Sprzedaż nieruchomości" year categories from the board nav tree', () => {
  const board = `
    <a href="/63-przetargi/3666-zamowienia-publiczne.html">Zamówienia Publiczne</a>
    <a href="/63-przetargi/16338-2026-r.html">2026 r.</a>
    <a href="/63-przetargi/13515-2025-r.html">2025 r.</a>
    <a href="/63-przetargi/3670-pozostale-przetargi.html">Pozostałe przetargi</a>
    <a href="/63-przetargi/16339-2026-r.html">2026 r.</a>
    <a href="/63-przetargi/3669-sprzedaz-nieruchomosci.html">Sprzedaż nieruchomości</a>
    <a href="/63-przetargi/16729-2026-r.html">2026 r.</a>
    <a href="/63-przetargi/13508-2025-r.html">2025 r.</a>
    <a href="/63-przetargi/8331-2022-r.html">2022 r.</a>`;
  const cats = discoverSprzedazYearCats(board).sort((a, b) => b.year - a.year);
  assert.deepEqual(cats.map((c) => [c.year, c.id]), [[2026, 16729], [2025, 13508], [2022, 8331]]);
  assert.ok(!cats.some((c) => [16338, 13515, 16339].includes(c.id)));
});
