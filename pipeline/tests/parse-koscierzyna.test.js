// Unit tests for Kościerzyna adapter parsers and crawl helpers.
//
// Groundtruthed against live BIP pages and extracted texts from bip.koscierzyna.gda.pl:
// - Announcements:
//   - WGN/4/2026 (id 1912): ul. Sikorskiego 6 m. 7 (52.13 m², 170 000 zł, auction 2026-07-31, round 2)
//   - WGN/2/2026 (id 1873): ul. Sikorskiego 6 m. 7 (52.13 m², 200 000 zł, auction 2026-05-22, round 1)
//   - WGN/5/2024 (id 1567): ul. Świętojańska 14 m. 5 (15.94 m², 50 750 zł, auction 2024-09-12, round 1)
//   - WGN/1/2024 (id 1427): Multi-flat: ul. Sikorskiego 6 m. 7 (47.10 m², 175 000 zł)
//     + ul. dr. Leona Heykego 1/C/11 (25.63 m², 120 000 zł), auction 2024-04-04, round 2
// - Results:
//   - Sold flat notice
//   - Unsold flat notice (no bids)
//   - Land result doc (out of scope for flat adapter -> returns [])

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { config } from '../src/cities/koscierzyna/config.js';
import {
  yearBoardUrl,
  YEAR_CIDS,
} from '../src/cities/koscierzyna/crawl.js';
import {
  cleanHtml,
  parsePLN,
  parseArea,
  cleanAddrStr,
  auctionDateFromAnnouncement,
  auctionDateFromResult,
  roundFromText,
  isAnnouncement,
  isResultNotice,
  parseListPage,
  attachmentPdfsFromDetail,
  attachmentPdfFromDetail,
  resultPdfFromDetail,
  addressFromText,
  areaFromText,
  startingPriceFromText,
  finalPriceFromText,
  parseAnnouncementDetail,
  parseResultDoc,
} from '../src/cities/koscierzyna/parse.js';

// ── Config ───────────────────────────────────────────────────────────────────

test('config: exports correct municipal metadata', () => {
  assert.equal(config.id, 'koscierzyna');
  assert.equal(config.label, 'Kościerzyna');
  assert.equal(config.voivodeship, 'pomorskie');
  assert.equal(config.authority, 'Burmistrz Miasta Kościerzyna (Gmina Miejska Kościerzyna)');
  assert.equal(config.host, 'bip.koscierzyna.gda.pl');
  assert.equal(config.source, 'html');
  assert.equal(config.teryt, '220601_1');
});

// ── Crawl URL helpers ────────────────────────────────────────────────────────

test('crawl urls: constructs correct year board pagination URLs and has valid cids', () => {
  assert.equal(yearBoardUrl(557, 0), 'https://bip.koscierzyna.gda.pl/?bip=1&bsc=N&cid=557&pg=0');
  assert.equal(yearBoardUrl(501, 1), 'https://bip.koscierzyna.gda.pl/?bip=1&bsc=N&cid=501&pg=1');
  assert.equal(yearBoardUrl(454, 2), 'https://bip.koscierzyna.gda.pl/?bip=1&bsc=N&cid=454&pg=2');

  const y2026 = YEAR_CIDS.find((y) => y.year === 2026);
  assert.equal(y2026?.cid, 557);
  const y2025 = YEAR_CIDS.find((y) => y.year === 2025);
  assert.equal(y2025?.cid, 501);
  const y2024 = YEAR_CIDS.find((y) => y.year === 2024);
  assert.equal(y2024?.cid, 454);
  const y2023 = YEAR_CIDS.find((y) => y.year === 2023);
  assert.equal(y2023?.cid, 437);
});

// ── List-page parser ─────────────────────────────────────────────────────────

const SAMPLE_LIST_HTML = `
<div class="artykuly">
  <div class="artykul-tlo aktualnosci-tlo">
    <div class="artykul-tresc-tlo aktualnosci-tresc-tlo">
      <div class="strona-data aktualnosci-data">Data wytworzenia <span>2026-06-24</span>, ostatniej modyfikacji <span>2026-06-24 10:52</span></div>
      <div class="submenu"><a href="?bip=2&amp;cid=557&amp;id=1912">WGN/4/2026 ustny nieorganiczony przetarg na sprzedaż lokalu mieszklanego wraz z&nbsp;udziałem w&nbsp;nieruchomości wspólnej</a></div>
      <div class="strona-skrot aktualnosci-skrot">Burmistrz Miasta Kościerzyna ogłasza ustny nieograniczone przetargi na sprzedaż lokalu mieszkalnego...</div>
    </div>
  </div>
  <div class="artykul-tlo aktualnosci-tlo">
    <div class="artykul-tresc-tlo aktualnosci-tresc-tlo">
      <div class="strona-data aktualnosci-data">Data wytworzenia <span>2026-04-13</span>, ostatniej modyfikacji <span>2026-04-13 14:39</span></div>
      <div class="submenu"><a href="?bip=2&amp;cid=557&amp;id=1873">WGN/2/2026 ustny nieorganiczony przetarg na sprzedaż lokalu mieszklanego wraz z&nbsp;udziałem w&nbsp;nieruchomości wspólnej</a></div>
      <div class="strona-skrot aktualnosci-skrot">Burmistrz Miasta Kościerzyna ogłasza ustny nieograniczone przetargi na sprzedaż lokalu mieszkalnego...</div>
    </div>
  </div>
  <div class="artykul-tlo aktualnosci-tlo">
    <div class="artykul-tresc-tlo aktualnosci-tresc-tlo">
      <div class="strona-data aktualnosci-data">Data wytworzenia <span>2026-03-20</span>, ostatniej modyfikacji <span>2026-03-20 12:00</span></div>
      <div class="submenu"><a href="?bip=2&amp;cid=557&amp;id=1872">WGN/1/2026 Ogłoszenie o&nbsp;publicznych ustnych aukcjach na najem części działki gruntu ozn. nr geodez. 42/2</a></div>
      <div class="strona-skrot aktualnosci-skrot">Burmistrz Miasta Kościerzyna ogłasza aukcje na najem...</div>
    </div>
  </div>
</div>
`;

test('parseListPage: extracts items with full URLs, dates, titles, and summaries', () => {
  const items = parseListPage(SAMPLE_LIST_HTML);
  assert.equal(items.length, 3);

  assert.equal(items[0].url, 'https://bip.koscierzyna.gda.pl/?bip=2&cid=557&id=1912');
  assert.equal(items[0].published_date, '2026-06-24');
  assert.ok(items[0].title.includes('WGN/4/2026'));
  assert.ok(items[0].summary.includes('Burmistrz Miasta Kościerzyna'));

  assert.equal(items[1].url, 'https://bip.koscierzyna.gda.pl/?bip=2&cid=557&id=1873');
  assert.equal(items[1].published_date, '2026-04-13');

  assert.equal(items[2].url, 'https://bip.koscierzyna.gda.pl/?bip=2&cid=557&id=1872');
});

// ── Attachment discovery helpers ─────────────────────────────────────────────

const SAMPLE_DETAIL_WITH_RESULT_HTML = `
<div class="aktualnosci-tresc">
  <p><a href="#skip-tresc">Przejdź do treści głównej</a></p>
  <p><a href="?bip=1&amp;cid=39&amp;bsc=N">Wyniki głosowań</a></p>
  <p><a href="fls/bip_pliki/2024_09/BIPF622C33D15CAB5Z/I_nieograniczony_przetarg_ul._Szymanowskiego.pdf">Treść ogłoszenia</a></p>
  <p><a href="fls/bip_pliki/2024_12/BIPF629606994A791Z/Wyniki_przetargu.pdf">Wyniki przetargu</a></p>
</div>
`;

test('attachment discovery: extracts and distinguishes announcement and result PDFs', () => {
  const atts = attachmentPdfsFromDetail(SAMPLE_DETAIL_WITH_RESULT_HTML);
  assert.equal(atts.length, 2);

  const ann = atts.find((a) => a.isAnnouncement);
  assert.ok(ann);
  assert.ok(ann.url.includes('I_nieograniczony_przetarg_ul._Szymanowskiego.pdf'));

  const res = atts.find((a) => a.isResult);
  assert.ok(res);
  assert.ok(res.url.includes('Wyniki_przetargu.pdf'));

  assert.equal(
    attachmentPdfFromDetail(SAMPLE_DETAIL_WITH_RESULT_HTML),
    'https://bip.koscierzyna.gda.pl/fls/bip_pliki/2024_09/BIPF622C33D15CAB5Z/I_nieograniczony_przetarg_ul._Szymanowskiego.pdf',
  );
  assert.equal(
    resultPdfFromDetail(SAMPLE_DETAIL_WITH_RESULT_HTML),
    'https://bip.koscierzyna.gda.pl/fls/bip_pliki/2024_12/BIPF629606994A791Z/Wyniki_przetargu.pdf',
  );
});

// ── Filters ──────────────────────────────────────────────────────────────────

test('isAnnouncement: identifies residential sales and rejects rentals, land, and non-flats', () => {
  // Positive residential auction cases (including live typos from Kościerzyna BIP)
  assert.ok(
    isAnnouncement(
      'WGN/4/2026 ustny nieorganiczony przetarg na sprzedaż lokalu mieszklanego wraz z udziałem w nieruchomości wspólnej',
      '',
    ),
  );
  assert.ok(
    isAnnouncement(
      'WGN/5/2024 pierwszy ustny nieograniczony przetarg na sprzedaz lokalu mieszkalnego wraz z udziałem w nieruchomości wspólnej',
      '',
    ),
  );
  assert.ok(
    isAnnouncement(
      'WGN/1/2024 drugi ustny nieograniczony przetarg na sprzedaż okali mieszkalnych wraz z udziałem w nieruchomości wspólnej',
      '',
    ),
  );
  assert.ok(
    isAnnouncement(
      'WGN/11/20 Pierwszy ustny nieograniczony przetarg na sprzedaż lokalu mieszkalnego nr 16 położonego przy ul. Kartuskiej 16/B w obrębie 04',
      '',
    ),
  );

  // Negative: rentals, leases, land, adverts, garages
  assert.equal(
    isAnnouncement(
      'WGN/5/2026 Ogłoszenie o publicznych ustnych aukcjach na najem części działki gruntu ozn. nr geodez. 42/2',
      '',
    ),
    false,
  );
  assert.equal(
    isAnnouncement(
      'WGN/8/2025 publiczna ustna aukcja na dzierżawę części niezabudowanych działek gruntu',
      '',
    ),
    false,
  );
  assert.equal(
    isAnnouncement(
      'WGN/11/2025 Pierwsze ustne nieograniczone przetargi na sprzedaż niezabudowanych działek gruntu',
      '',
    ),
    false,
  );
  assert.equal(
    isAnnouncement(
      'WGN/13/2021 Publiczna ustna aukcja na dzierżawę dwóch garaży',
      '',
    ),
    false,
  );
  assert.equal(
    isAnnouncement(
      'Przetarg pisemny nieograniczony na najem lokalu użytkowego stanowiącego własność Gminy Miejskiej Kościerzyna',
      '',
    ),
    false,
  );
  assert.equal(
    isAnnouncement(
      'Wyniki przetargu na sprzedaż lokalu mieszkalnego',
      '',
    ),
    false,
  );
});

test('isResultNotice: identifies result notices and filters out voting/council records', () => {
  assert.ok(isResultNotice('Informacja o wynikach przetargu', ''));
  assert.ok(isResultNotice('Wyniki przetargów na sprzedaż mienia', ''));
  assert.ok(isResultNotice('Rozstrzygnięcie przetargu ustnego', ''));

  assert.equal(isResultNotice('Wyniki głosowań Rady Miasta', ''), false);
  assert.equal(isResultNotice('Wybory samorządowe 2024', ''), false);
  assert.equal(isResultNotice('Aukcja na najem lokalu', ''), false);
});

// ── Helper parsing ───────────────────────────────────────────────────────────

test('helpers: cleanHtml, parsePLN, parseArea, cleanAddrStr, roundFromText', () => {
  assert.equal(cleanHtml('<p>Tekst&nbsp;z&nbsp;<strong>tagami</strong></p>'), 'Tekst z tagami');

  assert.equal(parsePLN('170.000,00 zł'), 170000);
  assert.equal(parsePLN('50.750,00'), 50750);
  assert.equal(parsePLN('1 570 000 zł'), 1570000);
  assert.equal(parsePLN('0,00 zł'), null);
  assert.equal(parsePLN(null), null);

  assert.equal(parseArea('52,13 m²'), 52.13);
  assert.equal(parseArea('15.94'), 15.94);
  assert.equal(parseArea(null), null);

  assert.equal(cleanAddrStr('ul. Sikorskiego 6 m. 7'), 'ul. Sikorskiego 6/7');
  assert.equal(cleanAddrStr('ul. Świętojańska 14 m. 5'), 'ul. Świętojańska 14/5');
  assert.equal(cleanAddrStr('ul. dr. Leona Heykego 1/C/11'), 'ul. dr. Leona Heykego 1C/11');
  assert.equal(cleanAddrStr('ul. Drogowców 4, lokal nr 3'), 'ul. Drogowców 4/3');

  assert.equal(roundFromText('ogłasza pierwszy ustny nieograniczony przetarg'), 1);
  assert.equal(roundFromText('ogłasza drugi ustny nieograniczony przetarg'), 2);
  assert.equal(roundFromText('ogłasza trzeci ustny nieograniczony przetarg'), 3);
  assert.equal(roundFromText('ogłasza IV ustny przetarg nieograniczony'), 4);
  assert.equal(
    roundFromText(
      'ogłasza pierwszy ustny nieograniczony przetarg... Pierwszy ustny nieograniczony przetarg zaplanowany był na dzień 22 maja 2026 r. i zakończył się wynikiem negatywnym.',
    ),
    2,
  );
});

test('auction dates: extracts dates correctly from announcements and results', () => {
  assert.equal(
    auctionDateFromAnnouncement('Przetarg odbędzie się w dniu 31 lipca 2026 r. o godz. 11:00'),
    '2026-07-31',
  );
  assert.equal(
    auctionDateFromAnnouncement('Przetargi odbędą się w dniu 4 kwietnia 2024 r. o godz. 12:00'),
    '2024-04-04',
  );
  assert.equal(
    auctionDateFromAnnouncement('termin przetargu: 12 września 2024 r.'),
    '2024-09-12',
  );

  assert.equal(
    auctionDateFromResult('Data przetargu: 19 września 2025 r.'),
    '2025-09-19',
  );
  assert.equal(
    auctionDateFromResult('W dniu 5 grudnia 2024 r. odbył się przetarg'),
    '2024-12-05',
  );
});

// ── Announcement fixtures (Groundtruthed against real BIP Kościerzyna notices) ─

const FIXTURE_SIKORSKIEGO_2026_HTML = `
<div class="aktualnosci-tresc">
  <p>Burmistrz Miasta Kościerzyna ogłasza ustny nieograniczone przetargi na sprzedaż lokalu mieszkalnego wraz z&nbsp;udziałem w&nbsp;nieruchomości wspólnej, stanowiący własność Gminy Miejskiej Kościerzyna:</p>
  <ul><li>lokal mieszkalny nr 7, w&nbsp;budynku nr 6, przy ulicy W. Sikorskiego, położony na działce gruntu ozn. nr geodez. 416/31, obręb 06 miasta Kościerzyna.</li></ul>
  <p><a href="fls/bip_pliki/2026_06/BIPF654FB27A6110CZ/Ogloszenie_przetarg_-_lokal_Sikorskiego_6.pdf">Treść ogłoszenia</a></p>
</div>
`;

const FIXTURE_SIKORSKIEGO_2026_PDF = `
WGN.6840.28.2025 Kościerzyna, 22 czerwca 2026 r.
Ogłoszenie
Burmistrz Miasta Kościerzyna ogłasza pierwszy ustny nieograniczony przetarg na sprzedaż lokalu
mieszkalnego wraz z udziałem w nieruchomości wspólnej, stanowiący własność Gminy Miejskiej
Kościerzyna. Pierwszy ustny nieograniczony przetarg zaplanowany był na dzień 22 maja 2026 r.
i zakończył się wynikiem negatywnym.

obręb nr 06, działka gruntu ozn. nr geodez. 416/31,
Adres lokalu ul. Sikorskiego 6 m. 7
II piętro, III kondygnacja

Powierzchnia użytkowa w m²
a) 52,13
a) lokalu
b) 5,18
b) pomieszczeń przynależnych
Opis lokalu Dostępne media: energia elektryczna, woda zimna, kanalizacja.
Nr księgi wieczystej GD1E/00002313/2
Udział w nieruchomości wspólnej 0,1136
Cena wywoławcza
(nie podlega VAT) w zł
a) lokalu i pomieszczeń a) 163.030,00
przynależnych
b) udziału w gruncie b) 6.970,00
c) łącznie c) 170.000,00
Wadium w zł 34.000,00

1. Przetarg odbędzie się w dniu 31 lipca 2026 r. o godz. 1100 w siedzibie Urzędu Miasta Kościerzyna, ul. 3 Maja 9 A.
`;

test('parseAnnouncementDetail: parses single flat WGN/4/2026 (ul. Sikorskiego 6/7)', () => {
  const records = parseAnnouncementDetail(
    FIXTURE_SIKORSKIEGO_2026_HTML,
    FIXTURE_SIKORSKIEGO_2026_PDF,
    {
      title: 'WGN/4/2026 ustny nieorganiczony przetarg na sprzedaż lokalu mieszklanego',
      published_date: '2026-06-24',
      url: 'https://bip.koscierzyna.gda.pl/?bip=2&cid=557&id=1912',
    },
  );

  assert.equal(records.length, 1);
  const r = records[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.street, 'Sikorskiego');
  assert.equal(r.address.building, '6');
  assert.equal(r.address.apt, '7');
  assert.equal(r.address.key, 'sikorskiego|6|7');
  assert.equal(r.address_raw, 'Sikorskiego 6/7');
  assert.equal(r.area_m2, 52.13);
  assert.equal(r.starting_price_pln, 170000);
  assert.equal(r.auction_date, '2026-07-31');
  assert.equal(r.published_date, '2026-06-24');
  assert.equal(r.round, 2);
  assert.equal(r.detail_url, 'https://bip.koscierzyna.gda.pl/?bip=2&cid=557&id=1912');
});

const FIXTURE_SWIETOJANSKA_2024_HTML = `
<div class="aktualnosci-tresc">
  <p>Burmistrz Miasta Kościerzyna ogłasza ustny nieograniczony przetarg na sprzedaż lokalu mieszkalnego wraz z&nbsp;udziałem w&nbsp;nieruchomości wspólnej, stanowiący własność Gminy Miejskiej Kościerzyna:</p>
  <ul><li>lokal mieszkalny nr 5, w&nbsp;budynku nr 14, przy ulicy Świętojańskiej, położony na działce gruntu ozn. nr geodez. 267/3, obręb 11 miasta Kościerzyna.</li></ul>
  <p><a href="fls/bip_pliki/2024_07/BIPF61D47D24EA1E2Z/Ogloszenie_przetarg_-_lokal_Swietojanska_14_m._5.pdf">Treść ogloszenia</a></p>
</div>
`;

const FIXTURE_SWIETOJANSKA_2024_PDF = `
WGN.6840.12.2024 Kościerzyna, 15 lipca 2024 r.
Ogłoszenie
Burmistrz Miasta Kościerzyna ogłasza pierwszy ustny nieograniczony przetarg na sprzedaż lokalu
mieszkalnego wraz z udziałem w nieruchomości wspólnej, stanowiący własność Gminy Miejskiej Kościerzyna

obręb nr 11, działka gruntu ozn. nr geodez. 267/3,
Adres lokalu ul. Świętojańska 14 m. 5
III kondygnacja

Powierzchnia użytkowa lokalu w m² 15,94

Opis lokalu Trzy pokoje, łazienka, kuchnia.
Nr księgi wieczystej GD1E/00012910/0
Udział w nieruchomości wspólnej 0,0535
Cena wywoławcza
(nie podlega VAT) w zł
a) lokalu i pomieszczeń a) 47.862,00
przynależnych
b) udziału w gruncie b) 2.888,00
c) łącznie c) 50.750,00
Wadium w zł 10.000,00

1. Przetarg odbędzie się w dniu 12 września 2024 r. o godz. 1100 w siedzibie Urzędu Miasta Kościerzyna.
`;

test('parseAnnouncementDetail: parses single flat WGN/5/2024 (ul. Świętojańska 14/5)', () => {
  const records = parseAnnouncementDetail(
    FIXTURE_SWIETOJANSKA_2024_HTML,
    FIXTURE_SWIETOJANSKA_2024_PDF,
    {
      title: 'WGN/5/2024 pierwszy ustny nieograniczony przetarg na sprzedaz lokalu mieszkalnego',
      published_date: '2024-07-16',
      url: 'https://bip.koscierzyna.gda.pl/?bip=2&cid=454&id=1567',
    },
  );

  assert.equal(records.length, 1);
  const r = records[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.street, 'Świętojańska');
  assert.equal(r.address.building, '14');
  assert.equal(r.address.apt, '5');
  assert.equal(r.address.key, 'swietojanska|14|5');
  assert.equal(r.address_raw, 'Świętojańska 14/5');
  assert.equal(r.area_m2, 15.94);
  assert.equal(r.starting_price_pln, 50750);
  assert.equal(r.auction_date, '2024-09-12');
  assert.equal(r.round, 1);
  assert.equal(r.detail_url, 'https://bip.koscierzyna.gda.pl/?bip=2&cid=454&id=1567');
});

const FIXTURE_MULTI_FLAT_2024_PDF = `
WGN.6840.37.2023 Kościerzyna, 21 lutego 2024 r.
Ogłoszenie
Burmistrz Miasta Kościerzyna ogłasza drugi ustny nieograniczony przetarg na sprzedaż lokali
mieszkalnych wraz z udziałem w nieruchomości wspólnej, stanowiące własność Gminy Miejskiej Kościerzyna
Pierwszy przetarg wyznaczony był na dzień 25 stycznia 2024 r., zakończył się wynikiem negatywnym.

                                    obręb nr 06, działka gruntu      obręb 05, działka gruntu
                                    ozn. nr geodez. 416/31,          ozn. nr geodez. 232/1,
  Adres lokalu
                                    ul. Sikorskiego 6 m. 7           ul. dr. Leona Heykego 1/C/11
                                    II kondygnacja                   IV kondygnacja
  Powierzchnia użytkowa w m²
                                    a) 47,10                         a) 25,63
  a) lokalu
                                    b) 5,18                          b) 2,75
  b) pomieszczeń przynależnych
  Cena wywoławcza
  (nie podlega VAT) w zł
  a) lokalu i pomieszczeń           a) 168.564,00                    a) 116.077,00
  przynależnych
  b) udziału w gruncie              b)    6.436,00                   b)    3.923,00
  c) łącznie                        c) 175.000,00                    c) 120.000,00
  Wadium w zł                       35.000,00                        24.000,00

1. Przetargi odbędą się w dniu 4 kwietnia 2024 r. o godz. 1200 w siedzibie Urzędu Miasta Kościerzyna.
`;

test('parseAnnouncementDetail: parses multi-flat WGN/1/2024 (Sikorskiego 6/7 and Heykego 1C/11)', () => {
  const records = parseAnnouncementDetail('', FIXTURE_MULTI_FLAT_2024_PDF, {
    title: 'WGN/1/2024 drugi ustny nieograniczony przetarg na sprzedaż okali mieszkalnych',
    published_date: '2024-02-21',
    url: 'https://bip.koscierzyna.gda.pl/?bip=2&cid=454&id=1427',
  });

  assert.equal(records.length, 2);

  const flat1 = records[0];
  assert.equal(flat1.address.street, 'Sikorskiego');
  assert.equal(flat1.address.building, '6');
  assert.equal(flat1.address.apt, '7');
  assert.equal(flat1.address.key, 'sikorskiego|6|7');
  assert.equal(flat1.area_m2, 47.1);
  assert.equal(flat1.starting_price_pln, 175000);
  assert.equal(flat1.auction_date, '2024-04-04');
  assert.equal(flat1.round, 2);

  const flat2 = records[1];
  assert.equal(flat2.address.street, 'dr. Leona Heykego');
  assert.equal(flat2.address.building, '1C');
  assert.equal(flat2.address.apt, '11');
  assert.equal(flat2.address.key, 'dr leona heykego|1C|11');
  assert.equal(flat2.area_m2, 25.63);
  assert.equal(flat2.starting_price_pln, 120000);
  assert.equal(flat2.auction_date, '2024-04-04');
  assert.equal(flat2.round, 2);
});

// ── Result document parser ───────────────────────────────────────────────────

const FIXTURE_SOLD_RESULT_DOC = `
Informacja o wynikach przeprowadzonego pierwszego ustnego
nieograniczonego przetargu na sprzedaż mienia Gminy Miejskiej Kościerzyna

Data przetargu: 12 września 2024 r.
Oznaczenie nieruchomości: lokal mieszkalny nr 5, ul. Świętojańska 14 m. 5
Ilość uczestników: 2
Cena wywoławcza: 50.750,00 zł
Osiągnięta cena w przetargu w zł: 55.000,00
Imię i nazwisko osoby ustalonej nabywcą: Jan Kowalski

Burmistrz Miasta Kościerzyna
Dawid Jereczek
`;

const FIXTURE_UNSOLD_RESULT_DOC = `
Informacja o wynikach przeprowadzonego pierwszego ustnego
nieograniczonego przetargu na sprzedaż mienia Gminy Miejskiej Kościerzyna

Data przetargu: 22 maja 2026 r.
Oznaczenie nieruchomości: lokal mieszkalny nr 7, ul. Sikorskiego 6 m. 7
Ilość uczestników: 0
Cena wywoławcza: 200.000,00 zł
Przetarg zakończył się wynikiem negatywnym z powodu braku uczestników

Burmistrz Miasta Kościerzyna
`;

const FIXTURE_LAND_RESULT_DOC = `
Informacja o wynikach przeprowadzonego pierwszego ustnego
nieograniczonego przetargu na sprzedaż mienia Gminy Miejskiej Kościerzyna

Data przetargu: 19 września 2025 r.
Oznaczenie nieruchomości: działka nr 1053 obręb nr 09, o pow. 0,1504 ha
Ilość uczestników: 1
Cena wywoławcza: 200.000,00
Osiągnięta cena w przetargu w zł: 202.000,00
Imię i nazwisko osoby ustalonej nabywcą: Krzysztof Sychta
`;

test('parseResultDoc: parses successful auction outcome with achieved price', () => {
  const records = parseResultDoc(
    FIXTURE_SOLD_RESULT_DOC,
    '2024-09-12',
    'https://bip.koscierzyna.gda.pl/fls/bip_pliki/2024_09/Wyniki_Swietojanska.pdf',
  );

  assert.equal(records.length, 1);
  const r = records[0];
  assert.equal(r.address.key, 'swietojanska|14|5');
  assert.equal(r.address_raw, 'Świętojańska 14/5');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.auction_date, '2024-09-12');
  assert.equal(r.round, 1);
  assert.equal(r.starting_price_pln, 50750);
  assert.equal(r.final_price_pln, 55000);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.unsold_reason, null);
  assert.equal(r.source_pdf, 'https://bip.koscierzyna.gda.pl/fls/bip_pliki/2024_09/Wyniki_Swietojanska.pdf');
});

test('parseResultDoc: parses negative auction outcome (unsold, no bids)', () => {
  const records = parseResultDoc(
    FIXTURE_UNSOLD_RESULT_DOC,
    '2026-05-22',
    'https://bip.koscierzyna.gda.pl/fls/bip_pliki/2026_05/Wyniki_Sikorskiego.pdf',
  );

  assert.equal(records.length, 1);
  const r = records[0];
  assert.equal(r.address.key, 'sikorskiego|6|7');
  assert.equal(r.address_raw, 'Sikorskiego 6/7');
  assert.equal(r.auction_date, '2026-05-22');
  assert.equal(r.round, 1);
  assert.equal(r.starting_price_pln, 200000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'no_bids');
});

test('parseResultDoc: ignores land results without flat address', () => {
  const records = parseResultDoc(
    FIXTURE_LAND_RESULT_DOC,
    '2025-09-19',
    'https://bip.koscierzyna.gda.pl/fls/bip_pliki/2025_10/Informacja_o_wynikach_przetargu_dz._1053.pdf',
  );

  assert.deepEqual(records, []);
});

test('parseResultDoc: handles unsold due to no deposit', () => {
  const doc = `
Informacja o wynikach przeprowadzonego pierwszego ustnego
nieograniczonego przetargu na sprzedaż mienia Gminy Miejskiej Kościerzyna
Data przetargu: 10 października 2024 r.
Oznaczenie nieruchomości: lokal mieszkalny nr 2, ul. Kartuska 16 m. 2
Ilość uczestników: 0
Cena wywoławcza: 110.000,00 zł
W wyznaczonym terminie nie odnotowano wpłaty wadium. Przetarg zakończył się wynikiem negatywnym.
Burmistrz Miasta Kościerzyna
`;
  const records = parseResultDoc(doc, '2024-10-10', 'https://bip.koscierzyna.gda.pl/wyniki.pdf');
  assert.equal(records.length, 1);
  assert.equal(records[0].outcome, 'unsold');
  assert.equal(records[0].unsold_reason, 'no_deposit');
});

test('addressFromText: extracts addresses across diverse streets and notations', () => {
  const a1 = addressFromText('położony przy ul. Sikorskiego 6 m. 7');
  assert.equal(a1?.key, 'sikorskiego|6|7');

  const a2 = addressFromText('w lokalu przy ul. Świętojańska 14 m. 5');
  assert.equal(a2?.key, 'swietojanska|14|5');

  const a3 = addressFromText('ul. dr. Leona Heykego 1/C/11');
  assert.equal(a3?.key, 'dr leona heykego|1C|11');

  const a4 = addressFromText('ul. Drogowców 4, lokal nr 3');
  assert.equal(a4?.key, 'drogowcow|4|3');

  const a5 = addressFromText('lokal w budynku przy ul. Kartuska 16, klatka B lokal nr 16');
  assert.equal(a5?.key, 'kartuska|16B|16');
});

test('adapter contract: index.js exports full required contract', async () => {
  const adapter = (await import('../src/cities/koscierzyna/index.js')).default;
  assert.equal(adapter.id, 'koscierzyna');
  assert.equal(adapter.label, 'Kościerzyna');
  assert.equal(adapter.voivodeship, 'pomorskie');
  assert.equal(adapter.host, 'bip.koscierzyna.gda.pl');
  assert.equal(adapter.source, 'html');
  assert.equal(typeof adapter.crawlActive, 'function');
  assert.equal(typeof adapter.crawlResultDocs, 'function');
  assert.equal(typeof adapter.parseResultDoc, 'function');
});

