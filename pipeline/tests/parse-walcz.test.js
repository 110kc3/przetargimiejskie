import { test } from 'node:test';
import assert from 'node:assert/strict';

import walczAdapter from '../src/cities/walcz/index.js';
import { config } from '../src/cities/walcz/config.js';
import {
  cleanText,
  parsePLN,
  parseArea,
  polishDateToIso,
  extractRound,
  extractAuctionDate,
  extractStartingPrice,
  extractDeposit,
  extractWadiumDeadline,
  extractFlatArea,
  extractLandArea,
  extractParcels,
  extractAddress,
  extractLandStreet,
  parseBoardArticles,
  extractAttachments,
  pickAnnouncementPdf,
  pickResultPdf,
  parseAnnouncementNotice,
  parseResultDoc,
} from '../src/cities/walcz/parse.js';

// ------------------------------------------------------------- Config tests

test('walcz config exports expected metadata', () => {
  assert.equal(config.id, 'walcz');
  assert.equal(config.teryt, '3217011');
  assert.equal(config.label, 'Wałcz');
  assert.equal(config.voivodeship, 'zachodniopomorskie');
  assert.equal(config.authority, 'Burmistrz Miasta Wałcz');
  assert.equal(config.host, 'bip.walcz.pl');
  assert.equal(config.source, 'html');
});

test('adapter default export conforms to pipeline contract', () => {
  assert.equal(walczAdapter.id, 'walcz');
  assert.equal(typeof walczAdapter.crawlActive, 'function');
  assert.equal(typeof walczAdapter.crawlResultDocs, 'function');
  assert.equal(typeof walczAdapter.parseResultDoc, 'function');
});

// ------------------------------------------------------------- Basic helper tests

test('cleanText strips tags, unescapes entities, collapses spaces', () => {
  assert.equal(cleanText('  <p>Drugi &amp; <b>przetarg</b>&nbsp;</p> '), 'Drugi & przetarg');
  assert.equal(cleanText('&#039;test&#039; &quot;quote&quot;'), "'test' \"quote\"");
});

test('parsePLN parses formatted Polish amounts into integer PLN', () => {
  assert.equal(parsePLN('45.000,00 zł'), 45000);
  assert.equal(parsePLN('180 000,00 zł'), 180000);
  assert.equal(parsePLN('4.500,00'), 4500);
  assert.equal(parsePLN('112000 zł'), 112000);
  assert.equal(parsePLN(null), null);
  assert.equal(parsePLN('brak'), null);
});

test('parseArea parses numeric strings into floats', () => {
  assert.equal(parseArea('25,50'), 25.5);
  assert.equal(parseArea('44.43'), 44.43);
  assert.equal(parseArea('17,69 m2'), 17.69);
  assert.equal(parseArea(null), null);
});

test('polishDateToIso parses numeric and word dates to ISO', () => {
  assert.equal(polishDateToIso('18.11.2026'), '2026-11-18');
  assert.equal(polishDateToIso('18-11-2026'), '2026-11-18');
  assert.equal(polishDateToIso('18 listopada 2026 r.'), '2026-11-18');
  assert.equal(polishDateToIso('2 września 2026'), '2026-09-02');
  assert.equal(polishDateToIso('29 października 2026 r.'), '2026-10-29');
  assert.equal(polishDateToIso(null), null);
});

// ------------------------------------------------------------- Round & date extraction

test('extractRound recognizes Roman and Polish word rounds', () => {
  assert.equal(extractRound('Pierwszy ustny przetarg nieograniczony'), 1);
  assert.equal(extractRound('Drugi ustny przetarg nieograniczony'), 2);
  assert.equal(extractRound('Trzeci ustny przetarg nieograniczony'), 3);
  assert.equal(extractRound('Czwarty przetarg ustny'), 4);
  assert.equal(extractRound('Piąty przetarg ustny'), 5);
  assert.equal(extractRound('I ustny przetarg nieograniczony'), 1);
  assert.equal(extractRound('II przetarg'), 2);
  assert.equal(extractRound('III przetarg'), 3);
  assert.equal(extractRound('IV przetarg'), 4);
  assert.equal(extractRound('V przetarg'), 5);
  assert.equal(extractRound('Zawiadomienie o licytacji'), null);
});

test('extractAuctionDate extracts dates from title and body text', () => {
  assert.equal(
    extractAuctionDate('... przy ulicy Bydgoskiej 3 lok. nr 6, termin przetargu 18.11.2026 r.', ''),
    '2026-11-18',
  );
  assert.equal(
    extractAuctionDate('', 'Przetarg odbędzie się w dniu 18 listopada 2026 r. w siedzibie Urzędu'),
    '2026-11-18',
  );
  assert.equal(
    extractAuctionDate('... termin przetargu 29.10.2026 r.', ''),
    '2026-10-29',
  );
  assert.equal(extractAuctionDate('', 'brak terminu'), null);
});

// ------------------------------------------------------------- Financial & deadline extraction

test('extractStartingPrice extracts cena wywoławcza', () => {
  const text1 = 'Cena wywoławcza nieruchomości – 45.000,00 zł – cena obniżona o 40%.';
  assert.equal(extractStartingPrice(text1), 45000);
  const text2 = 'Cena wywoławcza wynosi 120.000,00 zł netto. Do wylicytowanej ceny zostanie doliczony VAT.';
  assert.equal(extractStartingPrice(text2), 120000);
  assert.equal(extractStartingPrice('Brak danych'), null);
});

test('extractDeposit extracts wadium across formatting variations and linebreaks', () => {
  const t1 = 'Wadium wynosi 4.500,00 zł, płatne gotówką w kasie';
  assert.equal(extractDeposit(t1), 4500);
  const t2 = 'wadium w wysokości 12.000,00 zł na konto Gminy Miejskiej Wałcz';
  assert.equal(extractDeposit(t2), 12000);
  const t3 = 'wadium w wysokości\n                11.200,00 zł na konto Gminy';
  assert.equal(extractDeposit(t3), 11200);
  assert.equal(extractDeposit('Brak wadium'), null);
});

test('extractWadiumDeadline extracts payment deadline date', () => {
  const t1 = 'Ustalona kwota wadium musi znaleźć się na koncie Urzędu Miasta Wałcz najpóźniej dnia 13 listopada 2026 r.';
  assert.equal(extractWadiumDeadline(t1), '2026-11-13');
  const t2 = 'kwota wadium musi znaleźć się na koncie Gminy najpóźniej dnia 16 listopada 2026 r.';
  assert.equal(extractWadiumDeadline(t2), '2026-11-16');
  assert.equal(extractWadiumDeadline('Brak terminu'), null);
});

// ------------------------------------------------------------- Area & parcel extraction

test('extractFlatArea extracts unit area in lead paragraph', () => {
  const t1 = 'Burmistrz Miasta Wałcz ogłasza drugi przetarg... o powierzchni 25,50 m2.\nLokal składa się...';
  assert.equal(extractFlatArea(t1), 25.5);
  const t2 = '... w budynku przy ul. Chełmińskiej nr 29, oznaczonego numerem 31, o powierzchni użytkowej 44,43 m 2.';
  assert.equal(extractFlatArea(t2), 44.43);
  const t3 = '... oznaczonego numerem 3, o powierzchni 75,20 m2.';
  assert.equal(extractFlatArea(t3), 75.2);
  assert.equal(extractFlatArea('Brak powierzchni'), null);
});

test('extractLandArea handles both hectares and square meters', () => {
  assert.equal(extractLandArea('... o łącznej pow. 0,1496 ha. Termin przetargu', ''), 1496);
  assert.equal(extractLandArea('... o pow. 0,0999 ha. Termin przetargu', ''), 999);
  assert.equal(extractLandArea('... o łącznej pow. 0,6745 ha ul. Nowomiejska', ''), 6745);
  assert.equal(extractLandArea('... o łącznej pow. 1496 m2, położonej w Wałczu', ''), 1496);
  assert.equal(extractLandArea('Brak danych', ''), null);
});

test('extractParcels extracts single and multi-parcel numbers from land notices', () => {
  const t1 = '... składającej się z działek oznaczonych numerami geodezyjnymi 1053/13 i 1053/16 o łącznej pow. 0,1496 ha.';
  assert.equal(extractParcels(t1, ''), '1053/13, 1053/16');
  const t2 = '... składającej się z działki oznaczonej numerem geodezyjnym 5661/102 o pow. 0,0999 ha.';
  assert.equal(extractParcels(t2, ''), '5661/102');
  const t3 = '... składającej się z działek oznaczonych numerami geodezyjnymi 32/4 i 5654/3 o łącznej pow. 0,6745 ha';
  assert.equal(extractParcels(t3, ''), '32/4, 5654/3');
  assert.equal(extractParcels('Ogłoszenie o sprzedaży lokalu', ''), null);
});

// ------------------------------------------------------------- Address extraction

test('extractAddress parses residential flat addresses with street, bldg, apt', () => {
  const a1 = extractAddress('Drugi ustny przetarg nieograniczony na sprzedaż spółdzielczego własnościowego prawa do lokalu mieszkalnego przy ulicy Chełmińskiej 29 lok. nr 31, termin przetargu 18.11.2026 r.', '');
  assert.deepEqual(a1, {
    street: 'Chełmińskiej',
    street_norm: 'chelminskiej',
    building: '29',
    apt: '31',
    key: 'chelminskiej|29|31',
    warning: null,
  });

  const a2 = extractAddress('Drugi ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego przy ulicy Wojska Polskiego 57 lok. nr 3, termin przetargu 18.11.2026 r.', '');
  assert.deepEqual(a2, {
    street: 'Wojska Polskiego',
    street_norm: 'wojska polskiego',
    building: '57',
    apt: '3',
    key: 'wojska polskiego|57|3',
    warning: null,
  });

  const a3 = extractAddress('Drugi ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego przy ulicy Bydgoskiej 3 lok. nr 6, termin przetargu 18.11.2026 r.', '');
  assert.deepEqual(a3, {
    street: 'Bydgoskiej',
    street_norm: 'bydgoskiej',
    building: '3',
    apt: '6',
    key: 'bydgoskiej|3|6',
    warning: null,
  });

  const a4 = extractAddress('Drugi ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego przy ulicy Leśnej 1 lok. nr 1, termin przetargu 18.11.2026 r.', '');
  assert.deepEqual(a4, {
    street: 'Leśnej',
    street_norm: 'lesnej',
    building: '1',
    apt: '1',
    key: 'lesnej|1|1',
    warning: null,
  });

  const a5 = extractAddress('', 'Burmistrz Miasta Wałcz ogłasza drugi przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego w budynku przy ul. Bydgoskiej nr 3, oznaczonego numerem 6, o powierzchni 25,50 m2.');
  assert.deepEqual(a5, {
    street: 'Bydgoskiej',
    street_norm: 'bydgoskiej',
    building: '3',
    apt: '6',
    key: 'bydgoskiej|3|6',
    warning: null,
  });
});

test('extractLandStreet parses street from land title or text', () => {
  assert.equal(
    extractLandStreet('... działek oznaczonych numerami geodezyjnymi 32/4 i 5654/3 o łącznej pow. 0,6745 ha ul. Nowomiejska. Termin przetargu 29.10.2026 r.', ''),
    'ul. Nowomiejska',
  );
  assert.equal(
    extractLandStreet('', 'położonej w Wałczu przy ul. Ciasnej, opisanej w księdze wieczystej'),
    'ul. Ciasnej',
  );
});

// ------------------------------------------------------------- Board & attachment extraction

const REAL_BOARD_HTML = `
<table class="com-govarticle-category__table category table table-striped table-bordered table-hover">
  <caption class="visually-hidden">Spis artykułów</caption>
  <thead>
    <tr><th scope="col">Tytuł</th><th scope="col">Data publikacji</th></tr>
  </thead>
  <tbody>
    <tr class="cat-list-row0">
      <th class="list-title" scope="row">
        <a href="/nieruchomosci/przetargi-na-sprzedaz-dzierzawe-nieruchomosci/przetargi-aktualne/drugi-ustny-przetarg-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-przy-ulicy-bydgoskiej-3-lok-nr-6-termin-przetargu-18-11-2026-r">
          Drugi ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego przy ulicy Bydgoskiej 3 lok. nr 6, termin przetargu 18.11.2026 r.
        </a>
      </th>
      <td class="list-date small">13-10-2026</td>
    </tr>
    <tr class="cat-list-row1">
      <th class="list-title" scope="row">
        <a href="/nieruchomosci/przetargi-na-sprzedaz-dzierzawe-nieruchomosci/przetargi-aktualne/pierwszy-ustny-przetarg-nieograniczony-na-sprzedaz-niezabudowanej-nieruchomosci-gruntowej-skladajacej-sie-z-dzialek-oznaczonych-numerami-geodezyjnymi-1053-13-i-1053-16-o-lacznej-pow-0-1496-ha-termin-przetargu-19-11-2026-r">
          Pierwszy ustny przetarg nieograniczony na sprzedaż niezabudowanej nieruchomości gruntowej składającej się z działek oznaczonych numerami geodezyjnymi 1053/13 i 1053/16 o łącznej pow. 0,1496 ha. Termin przetargu 19.11.2026 r.
        </a>
      </th>
      <td class="list-date small">13-10-2026</td>
    </tr>
  </tbody>
</table>
`;

test('parseBoardArticles parses table rows with title, url, publishDate', () => {
  const articles = parseBoardArticles(REAL_BOARD_HTML, 'https://bip.walcz.pl');
  assert.equal(articles.length, 2);
  assert.equal(articles[0].url, 'https://bip.walcz.pl/nieruchomosci/przetargi-na-sprzedaz-dzierzawe-nieruchomosci/przetargi-aktualne/drugi-ustny-przetarg-nieograniczony-na-sprzedaz-lokalu-mieszkalnego-przy-ulicy-bydgoskiej-3-lok-nr-6-termin-przetargu-18-11-2026-r');
  assert.match(articles[0].title, /Bydgoskiej 3 lok\. nr 6/);
  assert.equal(articles[0].publishDate, '2026-10-13');

  assert.equal(articles[1].url, 'https://bip.walcz.pl/nieruchomosci/przetargi-na-sprzedaz-dzierzawe-nieruchomosci/przetargi-aktualne/pierwszy-ustny-przetarg-nieograniczony-na-sprzedaz-niezabudowanej-nieruchomosci-gruntowej-skladajacej-sie-z-dzialek-oznaczonych-numerami-geodezyjnymi-1053-13-i-1053-16-o-lacznej-pow-0-1496-ha-termin-przetargu-19-11-2026-r');
  assert.match(articles[1].title, /1053\/13 i 1053\/16/);
});

test('parseBoardArticles returns empty array for empty HTML', () => {
  assert.deepEqual(parseBoardArticles(''), []);
  assert.deepEqual(parseBoardArticles('<div>Brak wyników</div>'), []);
});

const REAL_DETAIL_ATTACHMENTS_HTML = `
<div class="com-govarticle-category">
  <h1 itemprop="headline">Drugi ustny przetarg nieograniczony...</h1>
  <tbody id="article-attachments">
    <tr>
      <th class="w-100" scope="row">
        <a href="/images/pliki/gminna_ewidencja_zabytkow.pdf" target="_blank">Ewidencja Zabytków</a>
      </th>
    </tr>
    <tr>
      <th class="w-100" scope="row">
        <a href="/nieruchomosci?task=article.downloadAttachment&amp;id=7092&amp;version=11435" target="_blank" title="Pobierz załącznik: Ogłoszenie o przetargu">
          Ogłoszenie o przetargu
        </a>
      </th>
    </tr>
  </tbody>
</div>
`;

test('extractAttachments extracts download attachments and filters out generic files', () => {
  const atts = extractAttachments(REAL_DETAIL_ATTACHMENTS_HTML, 'https://bip.walcz.pl');
  assert.equal(atts.length, 1);
  assert.equal(atts[0].url, 'https://bip.walcz.pl/nieruchomosci?task=article.downloadAttachment&id=7092&version=11435');
  assert.equal(atts[0].text, 'Ogłoszenie o przetargu');

  const picked = pickAnnouncementPdf(atts);
  assert.equal(picked, 'https://bip.walcz.pl/nieruchomosci?task=article.downloadAttachment&id=7092&version=11435');
});

// ------------------------------------------------------------- Announcement notice parsing

const FLAT_PDF_FIXTURE = `
                          BURMISTRZ MIASTA WAŁCZ
  OGŁASZA         PRZETARG NA SPRZEDAŻ NIERUCHOMOŚCI STANOWIĄCEJ
                      WŁASNOŚĆ GMINY MIEJSKIEJ WAŁCZ
Burmistrz Miasta Wałcz ogłasza drugi przetarg ustny nieograniczony na sprzedaż lokalu
mieszkalnego w budynku przy ul. Bydgoskiej nr 3, oznaczonego numerem 6, o powierzchni
25,50 m2.
Lokal składa się z 2 pokoi o powierzchni 9,49 m 2 i 9,70 m2 oraz pomieszczeń przynależnych: kuchni wraz
z pomieszczeniem WC o łącznej powierzchni 6,31 m 2. Powierzchnia lokalu mieszkalnego z pomieszczeniami
przynależnymi: 25,50 m2.

CENA NIERUCHOMOŚCI I OPŁATY
- Cena wywoławcza nieruchomości – 45.000,00 zł – cena obniżona o 40%.
- Wadium wynosi 4.500,00 zł, płatne gotówką w kasie Urzędu Miasta Wałcz lub na konto Urzędu
Nr 38 1240 3712 1111 0000 4363 6633 Banku PEKAO S.A. I O/Wałcz. Ustalona kwota wadium
musi znaleźć się na koncie Urzędu Miasta Wałcz najpóźniej dnia 13 listopada 2026 r.

TERMIN I MIEJSCE PRZEPROWADZENIA PRZETARGU
Przetarg odbędzie się w dniu 18 listopada 2026 r. w siedzibie Urzędu Miasta Wałcz przy Placu Wolności nr 1.
`;

test('parseAnnouncementNotice parses residential flat announcement fixture into active listing', () => {
  const title = 'Drugi ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego przy ulicy Bydgoskiej 3 lok. nr 6, termin przetargu 18.11.2026 r.';
  const detailUrl = 'https://bip.walcz.pl/przetargi-aktualne/bydgoska-3-6';
  const pdfUrl = 'https://bip.walcz.pl/nieruchomosci?task=article.downloadAttachment&id=7092';

  const record = parseAnnouncementNotice({
    title,
    html: '',
    pdfText: FLAT_PDF_FIXTURE,
    detailUrl,
    pdfUrl,
  });

  assert.equal(record.kind, 'mieszkalny');
  assert.equal(record.round, 2);
  assert.equal(record.starting_price_pln, 45000);
  assert.equal(record.deposit_pln, 4500);
  assert.equal(record.wadium_deadline, '2026-11-13');
  assert.equal(record.area_m2, 25.5);
  assert.equal(record.auction_date, '2026-11-18');
  assert.equal(record.outcome, 'active');
  assert.equal(record.detail_url, detailUrl);
  assert.equal(record.source_pdf, pdfUrl);
  assert.deepEqual(record.address, {
    street: 'Bydgoskiej',
    street_norm: 'bydgoskiej',
    building: '3',
    apt: '6',
    key: 'bydgoskiej|3|6',
    warning: null,
  });
});

const LAND_PDF_FIXTURE = `
                      BURMISTRZ MIASTA WAŁCZ
            OGŁASZA PRZETARG NA SPRZEDAŻ NIERUCHOMOŚCI
            STANOWIĄCEJ WŁASNOŚĆ GMINY MIEJSKIEJ WAŁCZ

Burmistrz Miasta Wałcz ogłasza pierwszy ustny przetarg nieograniczony na sprzedaż
niezabudowanej nieruchomości gruntowej składające się z działek nr 1053/13 i 1053/16
o łącznej pow. 1496 m2, położonej w Wałczu przy ul. Ciasnej, opisanej w księdze wieczystej
KO1W/00043863/4 Sądu Rejonowego w Wałczu.

CENA I WARUNKI
Cena wywoławcza wynosi 120.000,00 zł netto.
wadium w wysokości 12.000,00 zł na konto Gminy Miejskiej Wałcz Nr 38 1240 3712 1111 0000 4363 6633.
Ustalona kwota wadium musi znaleźć się na koncie Gminy najpóźniej dnia 16 listopada 2026 r.
Przetarg odbędzie się w dniu 19 listopada 2026 r. o godz. 10:00.
`;

test('parseAnnouncementNotice parses land notice fixture into active land record', () => {
  const title = 'Pierwszy ustny przetarg nieograniczony na sprzedaż niezabudowanej nieruchomości gruntowej składającej się z działek oznaczonych numerami geodezyjnymi 1053/13 i 1053/16 o łącznej pow. 0,1496 ha. Termin przetargu 19.11.2026 r.';
  const detailUrl = 'https://bip.walcz.pl/przetargi-aktualne/dzialki-1053-13';
  const pdfUrl = 'https://bip.walcz.pl/nieruchomosci?task=article.downloadAttachment&id=7113';

  const record = parseAnnouncementNotice({
    title,
    html: '',
    pdfText: LAND_PDF_FIXTURE,
    detailUrl,
    pdfUrl,
  });

  assert.equal(record.kind, 'grunt');
  assert.equal(record.round, 1);
  assert.equal(record.starting_price_pln, 120000);
  assert.equal(record.deposit_pln, 12000);
  assert.equal(record.wadium_deadline, '2026-11-16');
  assert.equal(record.area_m2, 1496);
  assert.equal(record.dzialka_nr, '1053/13, 1053/16');
  assert.equal(record.address_raw, 'ul. Ciasnej');
  assert.equal(record.auction_date, '2026-11-19');
  assert.equal(record.outcome, 'active');
});

// ------------------------------------------------------------- Result doc parsing

const RESULT_SOLD_FIXTURE = `
                              INFORMACJA O WYNIKU PRZETARGU
Burmistrz Miasta Wałcz informuje, że w dniu 18 listopada 2026 r. w Urzędzie Miasta Wałcz
przeprowadzony został drugi ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego
w budynku przy ul. Bydgoskiej nr 3, oznaczonego numerem 6, o powierzchni 25,50 m2.

Cena wywoławcza nieruchomości: 45.000,00 zł.
Cena osiągnięta w przetargu: 48.000,00 zł.
Przetarg zakończył się wynikiem pozytywnym.
Ustalono jako nabywcę nieruchomości: Jan Kowalski.
`;

test('parseResultDoc parses positive sold result fixture', () => {
  const results = parseResultDoc(RESULT_SOLD_FIXTURE, null, 'https://bip.walcz.pl/results/1');
  assert.equal(results.length, 1);
  const r = results[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.round, 2);
  assert.equal(r.auction_date, '2026-11-18');
  assert.equal(r.starting_price_pln, 45000);
  assert.equal(r.final_price_pln, 48000);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.unsold_reason, null);
  assert.equal(r.area_m2, 25.5);
  assert.deepEqual(r.address, {
    street: 'Bydgoskiej',
    street_norm: 'bydgoskiej',
    building: '3',
    apt: '6',
    key: 'bydgoskiej|3|6',
    warning: null,
  });
});

const RESULT_UNSOLD_FIXTURE = `
                              INFORMACJA O WYNIKU PRZETARGU
Burmistrz Miasta Wałcz informuje, że w dniu 2 września 2026 r. w Urzędzie Miasta Wałcz
przeprowadzony został pierwszy ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego
przy ulicy Bydgoskiej 3 lok. nr 6.

Cena wywoławcza: 75.000,00 zł.
W terminie nie wpłynęło wadium.
Przetarg zakończył się wynikiem negatywnym z uwagi na brak uczestników.
`;

test('parseResultDoc parses negative unsold result fixture', () => {
  const results = parseResultDoc(RESULT_UNSOLD_FIXTURE, null, 'https://bip.walcz.pl/results/2');
  assert.equal(results.length, 1);
  const r = results[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2026-09-02');
  assert.equal(r.starting_price_pln, 75000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'no_buyer');
  assert.deepEqual(r.address, {
    street: 'Bydgoskiej',
    street_norm: 'bydgoskiej',
    building: '3',
    apt: '6',
    key: 'bydgoskiej|3|6',
    warning: null,
  });
});

test('parseResultDoc returns empty array on non-result text', () => {
  assert.deepEqual(parseResultDoc('', null, 'https://bip.walcz.pl'), []);
  assert.deepEqual(parseResultDoc('Protokół z posiedzenia komisji', null, 'https://bip.walcz.pl'), []);
});
