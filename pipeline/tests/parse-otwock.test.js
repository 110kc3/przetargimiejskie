// Unit tests for Otwock adapter parsers and crawl helpers.
//
// Groundtruthed against live BIP pages and OCR texts from bip.otwock.pl:
// - Announcements:
//   - ID 30906: III przetarg, ul. Stanisława Wyspiańskiego 6/27 (49.42 m², 440 000 zł, auction 2026-12-08)
//   - ID 30905: III przetarg, ul. gen. Władysława Sikorskiego 1/13 (56.00 m², 470 000 zł, auction 2026-12-03)
//   - ID 21975: Multi-flat announcement, ul. Poniatowskiego 29G (lokale nr 1, 5, 9, auction 2021-09-10)
// - Results:
//   - ID 30005: IV przetarg, ul. Józefa Ignacego Kraszewskiego 76/17 (sold, final 97 010 zł, starting 89 000 zł, auction 2026-03-05)
//   - ID 26313: I przetarg, ul. Marii Dąbrowskiej 17/9 (sold, final 550 800 zł, starting 540 000 zł, auction 2023-12-07)
//   - ID 30743: II przetarg, ul. Stanisława Wyspiańskiego 6/27 (unsold, nikt nie przystąpił, auction 2026-07-30)
//   - ID 28862: I przetarg, ul. Józefa Ignacego Kraszewskiego 76/17 (unsold, wadium po terminie, auction 2025-06-26)
//   - ID 30008: II przetarg, ul. Marii Skłodowskiej-Curie 11/10 (unsold, nikt nie przystąpił, auction 2026-03-05)

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { config } from '../src/cities/otwock/config.js';
import {
  announcementBoardUrl,
  resultBoardUrl,
} from '../src/cities/otwock/crawl.js';
import {
  cleanHtml,
  parsePLN,
  parseArea,
  auctionDateFromAnnouncement,
  auctionDateFromResult,
  roundFromText,
  isAnnouncement,
  isResultNotice,
  parseListPage,
  attachmentPdfFromDetail,
  addressFromText,
  areaFromText,
  startingPriceFromText,
  finalPriceFromText,
  parseAnnouncementDetail,
  parseResultDoc,
} from '../src/cities/otwock/parse.js';

// ── Config ───────────────────────────────────────────────────────────────────

test('config: exports correct municipal metadata', () => {
  assert.equal(config.id, 'otwock');
  assert.equal(config.label, 'Otwock');
  assert.equal(config.voivodeship, 'mazowieckie');
  assert.equal(config.authority, 'Prezydent Miasta Otwocka');
  assert.equal(config.host, 'bip.otwock.pl');
  assert.equal(config.source, 'html');
  assert.equal(config.teryt, '141702_1');
});

// ── Crawl URL helpers ────────────────────────────────────────────────────────

test('crawl urls: constructs correct board pagination URLs', () => {
  assert.equal(announcementBoardUrl(0), 'https://bip.otwock.pl/?bip=1&cid=1018&pg=0');
  assert.equal(announcementBoardUrl(2), 'https://bip.otwock.pl/?bip=1&cid=1018&pg=2');
  assert.equal(resultBoardUrl(0), 'https://bip.otwock.pl/?bip=1&cid=1039&pg=0');
  assert.equal(resultBoardUrl(3), 'https://bip.otwock.pl/?bip=1&cid=1039&pg=3');
});

// ── List-page parser ─────────────────────────────────────────────────────────

const SAMPLE_LIST_HTML = `
<div class="artykuly">
  <div class="artykul-tlo aktualnosci-tlo">
    <div class="artykul-tresc-tlo aktualnosci-tresc-tlo">
      <div class="strona-data aktualnosci-data">Data wytworzenia <span>2026-10-02</span>, ostatniej modyfikacji <span>2026-10-06 11:06</span></div>
      <div class="submenu"><a href="?bip=2&amp;cid=1018&amp;id=30906">III ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego nr 27 znajdującego się w&nbsp;budynku przy ul. Stanisława Wyspiańskiego 6 w&nbsp;Otwocku</a></div>
      <div class="strona-skrot aktualnosci-skrot">Prezydent Miasta Otwocka ogłasza III ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego...</div>
    </div>
  </div>
  <div class="artykul-tlo aktualnosci-tlo">
    <div class="artykul-tresc-tlo aktualnosci-tresc-tlo">
      <div class="strona-data aktualnosci-data">Data wytworzenia <span>2026-10-02</span>, ostatniej modyfikacji <span>2026-10-02 14:39</span></div>
      <div class="submenu"><a href="?bip=2&amp;cid=1018&amp;id=30905">III ustny przetarg nieograniczony </a></div>
      <div class="strona-skrot aktualnosci-skrot">Prezydent Miasta Otwocka ogłasza III ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego, stanowiącego własność Miasta Otwocka data przetargu: 3 grudnia 2026 r., godz. 9:15 cena wywoławcza nieruchomości: 470 000,00 zł...</div>
    </div>
  </div>
  <div class="artykul-tlo aktualnosci-tlo">
    <div class="artykul-tresc-tlo aktualnosci-tresc-tlo">
      <div class="strona-data aktualnosci-data">Data wytworzenia <span>2026-10-02</span>, ostatniej modyfikacji <span>2026-10-02 14:22</span></div>
      <div class="submenu"><a href="?bip=2&amp;cid=1018&amp;id=30903">IX ustny przetarg nieograniczony na sprzedaż nieruchomości gruntowej stanowiącej własność Miasta Otwocka dz. ew. 45 obr. 32</a></div>
      <div class="strona-skrot aktualnosci-skrot">Prezydent Miasta Otwocka ogłasza IX ustny przetarg nieograniczony na sprzedaż nieruchomości gruntowej...</div>
    </div>
  </div>
</div>
`;

test('parseListPage: extracts items with full URLs, dates, titles, and summaries', () => {
  const items = parseListPage(SAMPLE_LIST_HTML);
  assert.equal(items.length, 3);

  assert.equal(items[0].url, 'https://bip.otwock.pl/?bip=2&cid=1018&id=30906');
  assert.equal(items[0].published_date, '2026-10-02');
  assert.ok(items[0].title.includes('Stanisława Wyspiańskiego 6'));
  assert.ok(items[0].summary.includes('Prezydent Miasta Otwocka'));

  assert.equal(items[1].url, 'https://bip.otwock.pl/?bip=2&cid=1018&id=30905');
  assert.equal(items[1].published_date, '2026-10-02');

  assert.equal(items[2].url, 'https://bip.otwock.pl/?bip=2&cid=1018&id=30903');
});

test('parseListPage: handles empty or invalid HTML gracefully', () => {
  assert.deepEqual(parseListPage(''), []);
  assert.deepEqual(parseListPage('<div>brak wyników</div>'), []);
});

// ── Routing filters ──────────────────────────────────────────────────────────

test('isAnnouncement: identifies flat sale notices and rejects rentals/land', () => {
  // Flat sales - true
  assert.equal(
    isAnnouncement(
      'III ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego nr 27 znajdującego się w budynku przy ul. Stanisława Wyspiańskiego 6 w Otwocku',
      'Prezydent Miasta Otwocka ogłasza III ustny przetarg...',
    ),
    true,
  );
  assert.equal(
    isAnnouncement(
      'III ustny przetarg nieograniczony',
      'Prezydent Miasta Otwocka ogłasza III ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego, stanowiącego własność Miasta Otwocka',
    ),
    true,
  );
  assert.equal(
    isAnnouncement(
      'Prezydent Miasta Otwocka ogłasza I ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych, oznaczonych nr 1, nr 5, nr 9',
      'usytuowanych w budynku przy ul. Poniatowskiego 29 G w Otwocku',
    ),
    true,
  );

  // Land sales - false
  assert.equal(
    isAnnouncement(
      'IX ustny przetarg nieograniczony na sprzedaż nieruchomości gruntowej stanowiącej własność Miasta Otwocka dz. ew. 45',
      'Prezydent Miasta Otwocka ogłasza IX ustny przetarg...',
    ),
    false,
  );

  // Leases / rentals - false
  assert.equal(
    isAnnouncement(
      'Ogłoszenie o konkursie na najem garażu usytuowanego w zespole boksów garażowych przy ul. Johna Lennona 2 w Otwocku',
      'Prezydent Miasta Otwocka ogłosił ustny konkurs...',
    ),
    false,
  );
  assert.equal(
    isAnnouncement(
      'Ogłoszenie o przetargach na najem lokali użytkowych stanowiących własność Miasta Otwocka',
      'Prezydent Miasta Otwocka ogłasza...',
    ),
    false,
  );

  // Results - false
  assert.equal(
    isAnnouncement(
      'Informacja o wynikach przetargów na najem lokali',
      'ogłoszenie o wynikach przetargów...',
    ),
    false,
  );
});

test('isResultNotice: identifies flat result notices and rejects other notices', () => {
  // Flat results - true
  assert.equal(
    isResultNotice(
      'Wynik II ustanego przetargu nieograniczonego na sprzedaż lokalu mieszkalnego nr 10',
      'Wynik - Skłodowskiej.pdf',
    ),
    true,
  );
  assert.equal(
    isResultNotice(
      'Informacja po przetargu',
      'wynik II ustnego przetargu nieograniczonego na sprzedaż lokalu mieszkalnego nr 27 znajdującego się w budynku przy ul. Stanisława Wyspiańskiego 6',
    ),
    true,
  );
  assert.equal(
    isResultNotice(
      'Informacja o wyniku I ustnego przetargu nieograniczonego na sprzedaż lokalu mieszkalnego nr 6 położonego przy ul. Majowej 18 w Otwocku',
      'Informacja',
    ),
    true,
  );
  assert.equal(
    isResultNotice(
      'Wynik I ustnego przetargu nieograniczonego na sprzedaż lokalu mieszkalnego nr 9 znajdującego się w budynku przy ul. Marii Dąbrowskiej 17 w Warszawie',
      'wynik postępowania.pdf',
    ),
    true,
  );

  // Land results - false
  assert.equal(
    isResultNotice(
      'Informacja',
      'wynik I ustanego przetargu na sprzedaż nieruchomości gruntowej stanowiącej własność Miasta Otwock oznaczonej jako działka ewidencyjna nr 23/5 obr. 234',
    ),
    false,
  );

  // Service tenders - false
  assert.equal(
    isResultNotice(
      'Protokół z otwarcia ofert cenowych na zadanie pt.: Opróżnianie lokali',
      'Protokół z otwarcia ofert cenowych.pdf',
    ),
    false,
  );
});

// ── Attachment extraction ────────────────────────────────────────────────────

test('attachmentPdfFromDetail: extracts pdf and docx links', () => {
  const htmlPdf = `
    <div class="aktualnosci-tresc">
      <p><a href="fls/bip_pliki/2026_10/BIPF65D26385801FZ/Przetarg_III_Wyspianskiego.pdf" target="_blank">Przetarg</a></p>
    </div>
  `;
  assert.equal(
    attachmentPdfFromDetail(htmlPdf),
    'https://bip.otwock.pl/fls/bip_pliki/2026_10/BIPF65D26385801FZ/Przetarg_III_Wyspianskiego.pdf',
  );

  const htmlDocx = `
    <div class="aktualnosci-tresc">
      <p><a href="/fls/bip_pliki/2021_07/BIPF5C6AFDBAF8EDCZ/Przetarg_Poniatowskiego.docx">Załącznik</a></p>
    </div>
  `;
  assert.equal(
    attachmentPdfFromDetail(htmlDocx),
    'https://bip.otwock.pl/fls/bip_pliki/2021_07/BIPF5C6AFDBAF8EDCZ/Przetarg_Poniatowskiego.docx',
  );

  assert.equal(attachmentPdfFromDetail('<div>brak załączników</div>'), null);
});

// ── Field extractors ─────────────────────────────────────────────────────────

test('parsePLN: parses various Polish currency string representations', () => {
  assert.equal(parsePLN('440 000,00 zł'), 440000);
  assert.equal(parsePLN('550 800,00 zł'), 550800);
  assert.equal(parsePLN('89 000 zł'), 89000);
  assert.equal(parsePLN('516 100 zł'), 516100);
  assert.equal(parsePLN('1 300 000,00'), 1300000);
  assert.equal(parsePLN(''), null);
});

test('parseArea: extracts numeric square meters', () => {
  assert.equal(parseArea('49,42 m²'), 49.42);
  assert.equal(parseArea('56,00 m2'), 56.0);
  assert.equal(parseArea('112,82'), 112.82);
  assert.equal(parseArea('15,70 m kw'), 15.7);
  assert.equal(parseArea(''), null);
});

test('auction date extractors: parses announcement and result dates accurately', () => {
  assert.equal(auctionDateFromAnnouncement('data przetargu: 8 grudnia 2026 r., godz. 11:00'), '2026-12-08');
  assert.equal(auctionDateFromAnnouncement('termin przetargu: 10 września 2021 r., godz.12.00'), '2021-09-10');
  assert.equal(
    auctionDateFromAnnouncement('Przetarg odbędzie się w budynku A przy ul. Armii Krajowej 5 w dniu 3 grudnia 2026 r. o godzinie 13:00'),
    '2026-12-03',
  );
  assert.equal(auctionDateFromAnnouncement('data przetargu: 08.12.2026'), '2026-12-08');
  assert.equal(auctionDateFromAnnouncement('brak terminu przetargu'), null);

  assert.equal(
    auctionDateFromResult('Podaje się do publicznej wiadomości, że w dniu 5 marca 2026 roku w siedzibie Urzędu Miasta Otwocka, odbył się IV ustny przetarg'),
    '2026-03-05',
  );
  assert.equal(
    auctionDateFromResult('w dniu 7 grudnia 2023 roku w siedzibie Urzędu Miasta Otwocka, odbył się I ustny przetarg'),
    '2023-12-07',
  );
  assert.equal(
    auctionDateFromResult('w dniu 14 sierpnia 2025 roku w siedzibie Urzędu Miasta Otwocka, odbył się II ustny przetarg'),
    '2025-08-14',
  );
  assert.equal(
    auctionDateFromResult('w dniu 30 lipca 2026 roku w siedzibie Urzędu Miasta Otwocka, odbył się ITUstny przetarg'),
    '2026-07-30',
  );
  assert.equal(auctionDateFromResult('informacja bez daty przetargu'), null);
});

test('roundFromText: parses Roman, Polish words, and OCR misreads', () => {
  assert.equal(roundFromText('I ustny przetarg nieograniczony'), 1);
  assert.equal(roundFromText('II ustny przetarg nieograniczony'), 2);
  assert.equal(roundFromText('III ustny przetarg nieograniczony'), 3);
  assert.equal(roundFromText('IV ustny przetarg nieograniczony'), 4);
  assert.equal(roundFromText('IX ustny przetarg nieograniczony'), 9);
  assert.equal(roundFromText('pierwszy ustny przetarg'), 1);
  assert.equal(roundFromText('drugi ustny przetarg'), 2);
  assert.equal(roundFromText('odbył się ITUstny przetarg nieograniczony'), 2);
  assert.equal(roundFromText('odbył się I ustny przetatg nieograniczony'), 1);
  assert.equal(roundFromText('brak informacji'), null);
});

test('addressFromText: parses diverse Otwock address formats with apt', () => {
  const addr1 = addressFromText(
    'III ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego nr 27 znajdującego się w budynku przy ul. Stanisława Wyspiańskiego 6 w Otwocku',
  );
  assert.ok(addr1);
  assert.equal(addr1.street, 'Stanisława Wyspiańskiego');
  assert.equal(addr1.building, '6');
  assert.equal(addr1.apt, '27');
  assert.equal(addr1.key, 'stanislawa wyspianskiego|6|27');

  const addr2 = addressFromText(
    'sprzedaż spółdzielczego własnościowego prawa do lokalu mieszkalnego nr 13 znajdującego się w budynku przy ul. gen. Władysława Sikorskiego 1 w Otwocku',
  );
  assert.ok(addr2);
  assert.equal(addr2.street, 'gen. Władysława Sikorskiego');
  assert.equal(addr2.building, '1');
  assert.equal(addr2.apt, '13');
  assert.equal(addr2.key, 'gen wladyslawa sikorskiego|1|13');

  const addr3 = addressFromText(
    'odbył się I ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego nr 9 znajdującego się w Warszawie przy ul. Marii Dąbrowskiej 17, stanowiącego własność Miasta Otwock',
  );
  assert.ok(addr3);
  assert.equal(addr3.street, 'Marii Dąbrowskiej');
  assert.equal(addr3.building, '17');
  assert.equal(addr3.apt, '9');
  assert.equal(addr3.key, 'marii dabrowskiej|17|9');

  const addr4 = addressFromText(
    'sprzedaż lokalu mieszkalnego nt 17 znajdującego się w Otwocku przy ul. Józefa Ignacego Kraszewskiego 76, stanowiącego własność',
  );
  assert.ok(addr4);
  assert.equal(addr4.building, '76');
  assert.equal(addr4.apt, '17');
  assert.equal(addr4.key, 'jozefa ignacego kraszewskiego|76|17');

  const addr5 = addressFromText(
    'sprzedaż lokalu mieszkalnego nr 10 znajdującego się w Otwocku przy ul. Marii Skłodowskiej — Curie 11, stanowiącego własność',
  );
  assert.ok(addr5);
  assert.equal(addr5.street, 'Marii Skłodowskiej-Curie');
  assert.equal(addr5.building, '11');
  assert.equal(addr5.apt, '10');
});

// ── Announcement detail parsing ──────────────────────────────────────────────

const ANNOUNCEMENT_DETAIL_30906 = `
<div class="aktualnosci-tresc">
  <p>Prezydent Miasta Otwocka ogłasza III ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego, stanowiącego własność Miasta Otwocka</p>
  <ul>
    <li>data przetargu: 8 grudnia 2026 r., godz. 11:00</li>
    <li>cena wywoławcza nieruchomości: 440 000,00 zł</li>
    <li>wysokość wadium: 50 000,00 zł</li>
    <li>termin wpłacenia wadium: 27 listopada 2026 r.</li>
  </ul>
</div>
`;

const ANNOUNCEMENT_OCR_30906 = `
PREZYDENT MIASTA OTWOCKA OGŁASZA III USTNY PRZETARG NIEOGRANICZONY
NA SPRZEDAŻ LOKALU MIESZKALNEGO, STANOWIĄCEGO WŁASNOŚĆ MIASTA OTWOCKA

Przedmiotem sprzedaży jest lokal mieszkalny nr 27 usytuowany w budynku przy ul. Stanisława
Wyspiańskiego 6 w Otwocku wraz z pomieszczeniem przynależnym w postaci piwnicy. Powierzchnia
użytkowa lokalu wynosi 49,42 m² natomiast powierzchnia użytkowa piwnicy wynosi 6,94 m².
`;

test('parseAnnouncementDetail: single flat announcement (ID 30906 fixture)', () => {
  const records = parseAnnouncementDetail(
    ANNOUNCEMENT_DETAIL_30906,
    ANNOUNCEMENT_OCR_30906,
    {
      title: 'III ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego nr 27 przy ul. Stanisława Wyspiańskiego 6',
      published_date: '2026-10-02',
      url: 'https://bip.otwock.pl/?bip=2&cid=1018&id=30906',
    },
  );

  assert.equal(records.length, 1);
  const r = records[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'stanislawa wyspianskiego|6|27');
  assert.equal(r.address_raw, 'Stanisława Wyspiańskiego 6/27');
  assert.equal(r.auction_date, '2026-12-08');
  assert.equal(r.published_date, '2026-10-02');
  assert.equal(r.round, 3);
  assert.equal(r.area_m2, 49.42);
  assert.equal(r.starting_price_pln, 440000);
  assert.equal(r.detail_url, 'https://bip.otwock.pl/?bip=2&cid=1018&id=30906');
});

const ANNOUNCEMENT_DETAIL_21975 = `
<div class="aktualnosci-tresc">
  <p>Prezydent Miasta Otwocka ogłasza I ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych, oznaczonych nr 1, nr 5, nr 9 usytuowanych w budynku przy ul. Poniatowskiego 29 G w Otwocku.</p>
  <p><strong>Lokal nr 1 pow. 112,82 m2</strong></p>
  <ul>
    <li>termin przetargu: 10 września 2021 r., godz.12.00</li>
    <li>termin wpłacenia wadium: 6 września 2021 r.</li>
    <li>cena wywoławcza lokalu: 814 400 zł</li>
    <li>wysokość wadium: 122 000 zł</li>
  </ul>
  <p><strong>Lokal nr 5 pow. 68,53 m2</strong></p>
  <ul>
    <li>termin przetargu: 10 września 2021 r., godz.12.30</li>
    <li>termin wpłacenia wadium: 6 września 2021 r.</li>
    <li>cena wywoławcza lokalu: 518 200 zł</li>
    <li>wysokość wadium: 77 000 zł</li>
  </ul>
  <p><strong>Lokal nr 9 pow. 68,24 m2</strong></p>
  <ul>
    <li>termin przetargu: 10 września 2021 r., godz.13.00</li>
    <li>termin wpłacenia wadium: 6 września 2021 r.</li>
    <li>cena wywoławcza lokalu: 516 100 zł</li>
    <li>wysokość wadium: 77 000 zł</li>
  </ul>
</div>
`;

test('parseAnnouncementDetail: multi-flat announcement (ID 21975 fixture)', () => {
  const records = parseAnnouncementDetail(
    ANNOUNCEMENT_DETAIL_21975,
    '',
    {
      title: 'I ustny przetarg nieograniczony na sprzedaż lokali mieszkalnych ul. Poniatowskiego 29G',
      published_date: '2021-07-09',
      url: 'https://bip.otwock.pl/?bip=2&cid=1018&id=21975',
    },
  );

  assert.equal(records.length, 3);

  assert.equal(records[0].address.key, 'poniatowskiego|29G|1');
  assert.equal(records[0].area_m2, 112.82);
  assert.equal(records[0].starting_price_pln, 814400);
  assert.equal(records[0].auction_date, '2021-09-10');
  assert.equal(records[0].round, 1);

  assert.equal(records[1].address.key, 'poniatowskiego|29G|5');
  assert.equal(records[1].area_m2, 68.53);
  assert.equal(records[1].starting_price_pln, 518200);
  assert.equal(records[1].auction_date, '2021-09-10');
  assert.equal(records[1].round, 1);

  assert.equal(records[2].address.key, 'poniatowskiego|29G|9');
  assert.equal(records[2].area_m2, 68.24);
  assert.equal(records[2].starting_price_pln, 516100);
  assert.equal(records[2].auction_date, '2021-09-10');
  assert.equal(records[2].round, 1);
});

// ── Result document parsing ──────────────────────────────────────────────────

const RESULT_OCR_KRASZEWSKIEGO_SOLD = `
PREZYDENT MIASTA OTWOCKA
ul. Armii Krajowej 5, 05-400 Otwock

Podaje się do publicznej wiadomości, że w dniu 5 marca 2026 roku w siedzibie Urzędu Miasta Otwocka,
odbył się IV ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego nt 17 znajdującego się w Otwocku
przy ul. Józefa Ignacego Kraszewskiego 76, stanowiącego własność Miasta Otwock.
W wyniku licytacji przedmiotowego lokalu, Nabywcą został:
Pan Krzysztof Wróbel.
Było dwóch uczestników przetargu. Nie było osób niedopuszczonych do licytacji.
Cena wywoławcza lokalu mieszkalnego została ustalona na kwotę w wysokości 89 000,00 zł a lokal został
sprzedany za najwyższą cenę osiągniętą w przetargu tj. 97 010,00 zł.
`;

test('parseResultDoc: parses positive sold auction outcome (ID 30005 fixture)', () => {
  const sourceUrl = 'https://bip.otwock.pl/fls/bip_pliki/2026_03/BIPF64D4C9E99CCCZ/Wynik_-_Kraszewskiego.pdf';
  const records = parseResultDoc(RESULT_OCR_KRASZEWSKIEGO_SOLD, '2026-03-06', sourceUrl);

  assert.equal(records.length, 1);
  const r = records[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'jozefa ignacego kraszewskiego|76|17');
  assert.equal(r.address_raw, 'Józefa Ignacego Kraszewskiego 76/17');
  assert.equal(r.auction_date, '2026-03-05');
  assert.equal(r.round, 4);
  assert.equal(r.starting_price_pln, 89000);
  assert.equal(r.final_price_pln, 97010);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.unsold_reason, null);
  assert.equal(r.source_pdf, sourceUrl);
});

const RESULT_OCR_DABROWSKIEJ_SOLD = `
PREZYDENT MIASTA OTWOCKA
ul. Armii Krajowej 5, 05-400 Otwock

Podaje się do publicznej wiadomości, że w dniu 7 grudnia 2023 roku w siedzibie Urzędu
Miasta Otwocka, odbył się I ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego nr 9
znajdującego się w Warszawie przy ul. Marii Dąbrowskiej 17, stanowiącego własność Miasta Otwock.
W wyniku licytacji przedmiotowego lokalu, Nabywcą została:
Pani Iga Karolina Oszczęda.
Było dwóch uczestników przetargu. Nie było osób niedopuszczonych do licytacji.
Cena wywoławcza lokalu mieszkalnego została ustalona na kwotę w wysokości
540 000,00 zł i lokal został sprzedany za najwyższą cenę osiągniętą w przetargu tj. 550 800,00 zł.
`;

test('parseResultDoc: parses positive sold auction outcome (ID 26313 fixture)', () => {
  const sourceUrl = 'https://bip.otwock.pl/fls/bip_pliki/2023_12/BIPF60D00C730258FZ/wynik_postepowania.pdf';
  const records = parseResultDoc(RESULT_OCR_DABROWSKIEJ_SOLD, '2023-12-19', sourceUrl);

  assert.equal(records.length, 1);
  const r = records[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'marii dabrowskiej|17|9');
  assert.equal(r.auction_date, '2023-12-07');
  assert.equal(r.round, 1);
  assert.equal(r.starting_price_pln, 540000);
  assert.equal(r.final_price_pln, 550800);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.unsold_reason, null);
});

const RESULT_OCR_WYSPIANSKIEGO_UNSOLD = `
PREZYDENT MIASTA OTWOCKA
ul. Armii Krajowej 5, 05-400 Otwock

Podaje się do publicznej wiadomości, że w dniu 30 lipca 2026 roku w siedzibie Urzędu Miasta
Otwocka, odbył się ITUstny przetarg nieograniczony na sprzedaż lokalu mieszkalnego nr 27 znajdującego
się w Otwocku przy ul. Stanisława Wyspiańskiego 6, stanowiącego własność Miasta Otwock.
Ogłoszony przetarg zakończył się wynikiem negatywnym, ponieważ nikt nie przystąpił do
przetargu.
`;

test('parseResultDoc: parses negative unsold outcome due to no bids (ID 30743 fixture)', () => {
  const sourceUrl = 'https://bip.otwock.pl/fls/bip_pliki/2026_08/BIPF6593E06A80FF9Z/wynik_przetargu_-_Wyspianskiego_6.pdf';
  const records = parseResultDoc(RESULT_OCR_WYSPIANSKIEGO_UNSOLD, '2026-08-17', sourceUrl);

  assert.equal(records.length, 1);
  const r = records[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'stanislawa wyspianskiego|6|27');
  assert.equal(r.auction_date, '2026-07-30');
  assert.equal(r.round, 2);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'no_bids');
});

const RESULT_OCR_KRASZEWSKIEGO_UNSOLD_DEPOSIT = `
PREZYDENT MIASTA OTWOCKA
ul. Armii Krajowej 5, 05-400 Otwock

Podaje się do publicznej wiadomości, że w dniu 26 czerwca 2025 roku w siedzibie Urzędu Miasta
Otwocka, odbył się I ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego nr 17 znajdującego
się w Otwocku przy ul. Józefa Ignacego Kraszewskiego 76, stanowiącego własność Miasta Otwock.
Ogłoszony przetarg zakończył się wynikiem negatywnym, ponieważ wpłacone wadium wpłynęło
po terminie.
`;

test('parseResultDoc: parses negative outcome due to late deposit (ID 28862 fixture)', () => {
  const records = parseResultDoc(RESULT_OCR_KRASZEWSKIEGO_UNSOLD_DEPOSIT, '2025-06-30', 'https://bip.otwock.pl/wynik.pdf');

  assert.equal(records.length, 1);
  const r = records[0];
  assert.equal(r.address.key, 'jozefa ignacego kraszewskiego|76|17');
  assert.equal(r.auction_date, '2025-06-26');
  assert.equal(r.round, 1);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'deposit_late');
  assert.equal(r.final_price_pln, null);
});

test('parseResultDoc: ignores non-flat result notices (e.g. land)', () => {
  const landText = `
    PREZYDENT MIASTA OTWOCKA
    Podaje się do publicznej wiadomości, że w dniu 15 stycznia 2026 roku odbył się I ustny przetarg
    nieograniczony na sprzedaż nieruchomości gruntowej oznaczonej jako działki ewidencyjne nr 13/3 obr. 12.
    Przetarg zakończył się wynikiem negatywnym.
  `;
  assert.deepEqual(parseResultDoc(landText, '2026-01-16', 'https://bip.otwock.pl/land.pdf'), []);
});

test('parseResultDoc: handles empty/garbage text gracefully', () => {
  assert.deepEqual(parseResultDoc('', null, 'empty.pdf'), []);
  assert.deepEqual(parseResultDoc('Losowy tekst bez informacji o przetargu', null, 'random.pdf'), []);
});
