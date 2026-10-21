// Unit tests for Słubice adapter parsers and crawl helpers.
//
// Groundtruthed against real BIP announcements and OCR fixtures from bip.slubice.pl:
// - File 2622: II przetarg, ul. Żeromskiego 18/8 (43.68 m², 165 000 zł, wadium 15 000 zł, auction 2026-07-16)
// - File 2625: II przetarg, ul. Daszyńskiego 20/3 (37.44 m², 145 000 zł, wadium 14 000 zł, auction 2026-07-17)
// - File 2626: II przetarg, ul. Wojska Polskiego 53/3 (30.49 m², 115 000 zł, wadium 10 000 zł, auction 2026-07-17)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { config } from '../src/cities/slubice/config.js';
import { boardPageUrl } from '../src/cities/slubice/crawl.js';
import {
  cleanHtml,
  parsePLN,
  parseArea,
  auctionDateFromText,
  auctionDateFromResult,
  publishedDateFromText,
  roundFromText,
  isAnnouncement,
  isResultNotice,
  parseListPage,
  attachmentPdfFromDetail,
  addressFromText,
  areaFromText,
  startingPriceFromText,
  finalPriceFromText,
  extractTableFields,
  parseAnnouncementDetail,
  parseResultDoc,
} from '../src/cities/slubice/parse.js';

// Helper to load OCR cache fixture or fallback
function loadOcrFixture(id, hash) {
  const file = new URL(`../ocr-cache/${id}.${hash}.txt`, import.meta.url);
  if (fs.existsSync(file)) {
    return fs.readFileSync(file, 'utf8');
  }
  throw new Error(`Fixture not found: ${id}.${hash}.txt`);
}

// ── Config ───────────────────────────────────────────────────────────────────

test('config: exports correct municipal metadata', () => {
  assert.equal(config.id, 'slubice');
  assert.equal(config.label, 'Słubice');
  assert.equal(config.voivodeship, 'lubuskie');
  assert.equal(config.authority, 'Burmistrz Słubic (Gmina Słubice)');
  assert.equal(config.host, 'bip.slubice.pl');
  assert.equal(config.source, 'html');
  assert.equal(config.teryt, '080505_4');
});

// ── Crawl URL helpers ────────────────────────────────────────────────────────

test('crawl urls: constructs correct board pagination URLs', () => {
  assert.equal(
    boardPageUrl(0),
    'https://bip.slubice.pl/kategorie/193-sprzedaz-mienia-przetargi?lang=PL',
  );
  assert.equal(
    boardPageUrl(1),
    'https://bip.slubice.pl/kategorie/193-sprzedaz-mienia-przetargi?page=1&lang=PL',
  );
  assert.equal(
    boardPageUrl(3),
    'https://bip.slubice.pl/kategorie/193-sprzedaz-mienia-przetargi?page=3&lang=PL',
  );
});

// ── Helpers ──────────────────────────────────────────────────────────────────

test('cleanHtml: strips tags and normalizes whitespace', () => {
  assert.equal(
    cleanHtml('<p>Ogłoszenie &nbsp;o&nbsp; <strong>przetargu</strong></p>'),
    'Ogłoszenie o przetargu',
  );
  assert.equal(cleanHtml('ul.&nbsp;Żeromskiego&ndash;18'), 'ul. Żeromskiego-18');
  assert.equal(cleanHtml(null), '');
});

test('parsePLN: parses PLN amounts correctly', () => {
  assert.equal(parsePLN('165 000 zł'), 165000);
  assert.equal(parsePLN('145.000,00 zł'), 145000);
  assert.equal(parsePLN('115000 zł'), 115000);
  assert.equal(parsePLN('15 000'), 15000);
  assert.equal(parsePLN('0 zł'), null);
  assert.equal(parsePLN(null), null);
});

test('parseArea: parses area values correctly', () => {
  assert.equal(parseArea('43,68'), 43.68);
  assert.equal(parseArea('37.44 m2'), 37.44);
  assert.equal(parseArea('30,49'), 30.49);
  assert.equal(parseArea(null), null);
});

test('roundFromText: extracts ordinal and roman rounds', () => {
  assert.equal(
    roundFromText('drugi przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego'),
    2,
  );
  assert.equal(
    roundFromText('pierwszy przetarg ustny nieograniczony na sprzedaż lokalu'),
    1,
  );
  assert.equal(
    roundFromText('trzeci przetarg ustny nieograniczony na sprzedaż'),
    3,
  );
  assert.equal(roundFromText('II ustny przetarg nieograniczony'), 2);
  assert.equal(roundFromText('I przetarg na sprzedaż'), 1);
  assert.equal(roundFromText('brak informacji o turze'), null);
});

// ── Filters ──────────────────────────────────────────────────────────────────

test('isAnnouncement: identifies flat sale auction announcements', () => {
  assert.equal(
    isAnnouncement(
      'Ogłoszenie o drugim przetargu na sprzedaż lokalu mieszkalnego - Słubice, ul. Żeromskiego 18/8',
    ),
    true,
  );
  assert.equal(
    isAnnouncement(
      'Ogłoszenie o przetargu na sprzedaż lokalu mieszkalnego - Słubice, ul. Wojska Polskiego 53/3',
    ),
    true,
  );
  assert.equal(
    isAnnouncement(
      'Drugi przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 3 przy ul. Daszyńskiego 20',
    ),
    true,
  );
  // Rejects result notices
  assert.equal(
    isAnnouncement(
      'Informacja o wyniku przetargu ustnego na sprzedaż lokalu mieszkalnego',
    ),
    false,
  );
  assert.equal(
    isAnnouncement('Wynik przetargu na sprzedaż lokalu mieszkalnego nr 8'),
    false,
  );
  // Rejects rentals and leases
  assert.equal(
    isAnnouncement('Przetarg na najem lokalu użytkowego przy ul. Kościuszki'),
    false,
  );
  assert.equal(
    isAnnouncement('Przetarg ustny na dzierżawę nieruchomości'),
    false,
  );
  // Rejects non-residential
  assert.equal(
    isAnnouncement('Przetarg ustny nieograniczony na sprzedaż nieruchomości gruntowej'),
    false,
  );
  assert.equal(isAnnouncement('Przetarg na sprzedaż garażu murowanego'), false);
});

test('isResultNotice: identifies flat sale result notices', () => {
  assert.equal(
    isResultNotice(
      'Informacja o wyniku przetargu ustnego na sprzedaż lokalu mieszkalnego przy ul. Żeromskiego 18/8',
    ),
    true,
  );
  assert.equal(
    isResultNotice(
      'Informacja z przetargu na sprzedaż lokalu mieszkalnego nr 3 przy ul. Daszyńskiego 20',
    ),
    true,
  );
  assert.equal(
    isResultNotice(
      'Rozstrzygnięcie przetargu na sprzedaż lokalu mieszkalnego w Słubicach',
    ),
    true,
  );
  // Rejects announcement
  assert.equal(
    isResultNotice(
      'Ogłoszenie o drugim przetargu na sprzedaż lokalu mieszkalnego - Słubice, ul. Żeromskiego 18/8',
    ),
    false,
  );
  // Rejects lease/rental results
  assert.equal(isResultNotice('Wynik przetargu na najem lokalu'), false);
  assert.equal(isResultNotice('Wynik przetargu na dzierżawę gruntu'), false);
});

// ── List-page parser ─────────────────────────────────────────────────────────

test('parseListPage: extracts articles from HTML links and RSC flight chunks', () => {
  const sampleHtml = `
    <div class="articles">
      <a href="/kategorie/193-sprzedaz-mienia-przetargi/artykuly/1629-ogloszenie-o-drugim-przetargu-na-sprzedaz-lokalu-mieszkalnego-slubice-ul-zeromskiego-18-8?lang=PL">
        Ogłoszenie o drugim przetargu na sprzedaż lokalu mieszkalnego - Słubice, ul. Żeromskiego 18/8
      </a>
      <a href="/kategorie/193-sprzedaz-mienia-przetargi/artykuly/1632-ogloszenie-o-drugim-przetargu-na-sprzedaz-lokalu-mieszkalnego-slubice-ul-daszynskiego-20-3?lang=PL">
        Ogłoszenie o drugim przetargu na sprzedaż lokalu mieszkalnego - Słubice, ul. Daszyńskiego 20/3
      </a>
    </div>
  `;
  const items = parseListPage(sampleHtml, 'https://bip.slubice.pl');
  assert.equal(items.length, 2);
  assert.equal(items[0].id, '1629');
  assert.equal(
    items[0].url,
    'https://bip.slubice.pl/kategorie/193-sprzedaz-mienia-przetargi/artykuly/1629-ogloszenie-o-drugim-przetargu-na-sprzedaz-lokalu-mieszkalnego-slubice-ul-zeromskiego-18-8?lang=PL',
  );
  assert.equal(
    items[0].title,
    'Ogłoszenie o drugim przetargu na sprzedaż lokalu mieszkalnego - Słubice, ul. Żeromskiego 18/8',
  );
  assert.equal(items[1].id, '1632');
});

test('parseListPage: handles Next.js RSC flight stream chunks', () => {
  const flightHtml = `
    <script>self.__next_f.push([1,"{\\"id\\":1633,\\"displayText\\":\\"Ogłoszenie o drugim przetargu na sprzedaż lokalu mieszkalnego - Słubice, ul. Wojska Polskiego 53/3\\",\\"slug\\":\\"kategorie/193-sprzedaz-mienia-przetargi/artykuly/1633-ogloszenie-wojska-polskiego\\",\\"publishedDate\\":\\"2026-06-11T10:00:00.000Z\\"}"])</script>
  `;
  const items = parseListPage(flightHtml, 'https://bip.slubice.pl');
  assert.equal(items.length, 1);
  assert.equal(items[0].id, '1633');
  assert.equal(items[0].published_date, '2026-06-11');
  assert.equal(
    items[0].url,
    'https://bip.slubice.pl/kategorie/193-sprzedaz-mienia-przetargi/artykuly/1633-ogloszenie-wojska-polskiego',
  );
});

// ── Attachment extractor ─────────────────────────────────────────────────────

test('attachmentPdfFromDetail: resolves API and document attachment links', () => {
  const html1 = '<a href="/api/attachments/2622">Żeromskiego 18-8.pdf</a>';
  assert.equal(
    attachmentPdfFromDetail(html1, 'https://bip.slubice.pl'),
    'https://bip-docrepo-api.slubice.pl/api/files/2622',
  );

  const html2 = '<a href="https://bip-docrepo-api.slubice.pl/api/files/2625">Daszyńskiego 20-3.pdf</a>';
  assert.equal(
    attachmentPdfFromDetail(html2, 'https://bip.slubice.pl'),
    'https://bip-docrepo-api.slubice.pl/api/files/2625',
  );

  const html3 = '<a href="/static/files/ogloszenie.pdf">Pobierz ogłoszenie</a>';
  assert.equal(
    attachmentPdfFromDetail(html3, 'https://bip.slubice.pl'),
    'https://bip.slubice.pl/static/files/ogloszenie.pdf',
  );

  assert.equal(attachmentPdfFromDetail('<div>Brak załącznika</div>'), null);
  assert.equal(attachmentPdfFromDetail(null), null);
});

// ── Real Fixture 1: ul. Żeromskiego 18/8 (File 2622) ─────────────────────────

test('fixture 2622: ul. Żeromskiego 18/8 extracted accurately', () => {
  const ocrText = loadOcrFixture('2622', '18aadb01');

  // Address
  const addr = addressFromText(ocrText);
  assert.ok(addr);
  assert.equal(addr.street, 'Żeromskiego');
  assert.equal(addr.building, '18');
  assert.equal(addr.apt, '8');
  assert.equal(addr.key, 'zeromskiego|18|8');

  // Table fields
  const table = extractTableFields(ocrText);
  assert.ok(table);
  assert.equal(table.area_m2, 43.68);
  assert.equal(table.starting_price_pln, 165000);
  assert.equal(table.wadium_pln, 15000);

  // Field helpers
  assert.equal(areaFromText(ocrText), 43.68);
  assert.equal(startingPriceFromText(ocrText), 165000);
  assert.equal(auctionDateFromText(ocrText), '2026-07-16');
  assert.equal(publishedDateFromText(ocrText), '2026-06-11');
  assert.equal(roundFromText(ocrText), 2);

  // Full announcement detail parse
  const context = {
    title: 'Ogłoszenie o drugim przetargu na sprzedaż lokalu mieszkalnego - Słubice, ul. Żeromskiego 18/8',
    url: 'https://bip.slubice.pl/kategorie/193-sprzedaz-mienia-przetargi/artykuly/1629-ogloszenie-zeromskiego',
  };
  const listings = parseAnnouncementDetail('', ocrText, context);
  assert.equal(listings.length, 1);
  const rec = listings[0];
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address_raw, 'Żeromskiego 18/8');
  assert.deepEqual(rec.address, addr);
  assert.equal(rec.area_m2, 43.68);
  assert.equal(rec.starting_price_pln, 165000);
  assert.equal(rec.auction_date, '2026-07-16');
  assert.equal(rec.published_date, '2026-06-11');
  assert.equal(rec.round, 2);
  assert.equal(rec.detail_url, context.url);
});

// ── Real Fixture 2: ul. Daszyńskiego 20/3 (File 2625) ─────────────────────────

test('fixture 2625: ul. Daszyńskiego 20/3 extracted accurately', () => {
  const ocrText = loadOcrFixture('2625', 'c394b22d');

  // Address
  const addr = addressFromText(ocrText);
  assert.ok(addr);
  assert.equal(addr.street, 'Daszyńskiego');
  assert.equal(addr.building, '20');
  assert.equal(addr.apt, '3');
  assert.equal(addr.key, 'daszynskiego|20|3');

  // Table fields
  const table = extractTableFields(ocrText);
  assert.ok(table);
  assert.equal(table.area_m2, 37.44);
  assert.equal(table.starting_price_pln, 145000);
  assert.equal(table.wadium_pln, 14000);

  // Field helpers
  assert.equal(areaFromText(ocrText), 37.44);
  assert.equal(startingPriceFromText(ocrText), 145000);
  assert.equal(auctionDateFromText(ocrText), '2026-07-17');
  assert.equal(publishedDateFromText(ocrText), '2026-06-11');
  assert.equal(roundFromText(ocrText), 2);

  // Full announcement detail parse
  const context = {
    title: 'Ogłoszenie o drugim przetargu na sprzedaż lokalu mieszkalnego - Słubice, ul. Daszyńskiego 20/3',
    url: 'https://bip.slubice.pl/kategorie/193-sprzedaz-mienia-przetargi/artykuly/1632-ogloszenie-daszynskiego',
  };
  const listings = parseAnnouncementDetail('', ocrText, context);
  assert.equal(listings.length, 1);
  const rec = listings[0];
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address_raw, 'Daszyńskiego 20/3');
  assert.deepEqual(rec.address, addr);
  assert.equal(rec.area_m2, 37.44);
  assert.equal(rec.starting_price_pln, 145000);
  assert.equal(rec.auction_date, '2026-07-17');
  assert.equal(rec.published_date, '2026-06-11');
  assert.equal(rec.round, 2);
});

// ── Real Fixture 3: ul. Wojska Polskiego 53/3 (File 2626) ─────────────────────

test('fixture 2626: ul. Wojska Polskiego 53/3 extracted accurately', () => {
  const ocrText = loadOcrFixture('2626', '519da691');

  // Address
  const addr = addressFromText(ocrText);
  assert.ok(addr);
  assert.equal(addr.street, 'Wojska Polskiego');
  assert.equal(addr.building, '53');
  assert.equal(addr.apt, '3');
  assert.equal(addr.key, 'wojska polskiego|53|3');

  // Table fields
  const table = extractTableFields(ocrText);
  assert.ok(table);
  assert.equal(table.area_m2, 30.49);
  assert.equal(table.starting_price_pln, 115000);
  assert.equal(table.wadium_pln, 10000);

  // Field helpers
  assert.equal(areaFromText(ocrText), 30.49);
  assert.equal(startingPriceFromText(ocrText), 115000);
  assert.equal(auctionDateFromText(ocrText), '2026-07-17');
  assert.equal(publishedDateFromText(ocrText), '2026-06-11');
  assert.equal(roundFromText(ocrText), 2);

  // Full announcement detail parse
  const context = {
    title: 'Ogłoszenie o drugim przetargu na sprzedaż lokalu mieszkalnego - Słubice, ul. Wojska Polskiego 53/3',
    url: 'https://bip.slubice.pl/kategorie/193-sprzedaz-mienia-przetargi/artykuly/1633-ogloszenie-wojska-polskiego',
  };
  const listings = parseAnnouncementDetail('', ocrText, context);
  assert.equal(listings.length, 1);
  const rec = listings[0];
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address_raw, 'Wojska Polskiego 53/3');
  assert.deepEqual(rec.address, addr);
  assert.equal(rec.area_m2, 30.49);
  assert.equal(rec.starting_price_pln, 115000);
  assert.equal(rec.auction_date, '2026-07-17');
  assert.equal(rec.published_date, '2026-06-11');
  assert.equal(rec.round, 2);
});

// ── Result Doc Parser ────────────────────────────────────────────────────────

test('parseResultDoc: parses sold outcome with hammer price and buyer', () => {
  const resultText = `
    Informacja o wyniku przetargu
    Burmistrz Słubic informuje, że w dniu 16 lipca 2026 r. odbył się drugi przetarg ustny
    nieograniczony na sprzedaż lokalu mieszkalnego nr 8 położonego w Słubicach przy
    ul. Żeromskiego 18 o powierzchni użytkowej 43,68 m2.
    Cena wywoławcza wynosiła: 165 000 zł.
    Najwyższa cena osiągnięta w przetargu: 172 000 zł.
    Nabywcą został Pan Jan Kowalski.
  `;
  const records = parseResultDoc(resultText, '2026-07-16', 'https://example.com/wynik-2622.pdf');
  assert.equal(records.length, 1);
  const r = records[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.street, 'Żeromskiego');
  assert.equal(r.address.building, '18');
  assert.equal(r.address.apt, '8');
  assert.equal(r.auction_date, '2026-07-16');
  assert.equal(r.round, 2);
  assert.equal(r.area_m2, 43.68);
  assert.equal(r.starting_price_pln, 165000);
  assert.equal(r.final_price_pln, 172000);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.unsold_reason, null);
  assert.equal(r.source_pdf, 'https://example.com/wynik-2622.pdf');
});

test('parseResultDoc: parses unsold outcome with no bids', () => {
  const resultText = `
    Informacja o wyniku przetargu
    Burmistrz Słubic podaje do publicznej wiadomości, że w dniu 17 lipca 2026 roku odbył się
    drugi przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 3 położonego
    przy ul. Daszyńskiego 20 w Słubicach.
    Cena wywoławcza: 145 000 zł. Powierzchnia lokalu wynosi 37,44 m2.
    W wyznaczonym terminie nikt nie przystąpił do przetargu.
    Przetarg zakończył się wynikiem negatywnym.
  `;
  const records = parseResultDoc(resultText, '2026-07-17', 'https://example.com/wynik-2625.pdf');
  assert.equal(records.length, 1);
  const r = records[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.street, 'Daszyńskiego');
  assert.equal(r.address.building, '20');
  assert.equal(r.address.apt, '3');
  assert.equal(r.auction_date, '2026-07-17');
  assert.equal(r.round, 2);
  assert.equal(r.area_m2, 37.44);
  assert.equal(r.starting_price_pln, 145000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'no_bids');
});

test('parseResultDoc: parses unsold outcome with no deposit', () => {
  const resultText = `
    Informacja o wyniku przetargu
    Burmistrz Słubic informuje, że w dniu 17 lipca 2026 r. odbył się drugi przetarg ustny
    nieograniczony na sprzedaż lokalu mieszkalnego przy ul. Wojska Polskiego 53/3.
    Cena wywoławcza: 115 000 zł.
    Nie odnotowano wpłaty wadium.
    Przetarg zakończył się wynikiem negatywnym.
  `;
  const records = parseResultDoc(resultText, '2026-07-17', 'https://example.com/wynik-2626.pdf');
  assert.equal(records.length, 1);
  const r = records[0];
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'no_deposit');
  assert.equal(r.final_price_pln, null);
});

test('parseResultDoc: guards against non-result and non-residential texts', () => {
  assert.deepEqual(parseResultDoc('', null, null), []);
  assert.deepEqual(
    parseResultDoc(
      'Zarządzenie Burmistrza Słubic w sprawie regulaminu organizacyjnego',
      null,
      null,
    ),
    [],
  );
  assert.deepEqual(
    parseResultDoc(
      'Informacja o wyniku przetargu na dzierżawę gruntu rolnego w Słubicach',
      null,
      null,
    ),
    [],
  );
});
