// Szamotuły parser unit tests.
// Tests groundtruthed against real municipal auction documents fetched from bip.szamotuly.pl:
//   - ul. Kolarska 9/25 (I przetarg announcement art. 38186 + result notices art. 38698, 40170)
//   - Rynek 6 lokal użytkowy (I przetarg announcement art. 39685 + sold result art. 39816)
//   - ul. Wroniecka 43 nieruchomość zabudowana (I przetarg art. 40048 + unsold result art. 40171)
//   - Przysieczyn 52 nieruchomość zabudowana (II przetarg art. 40047 + unsold result art. 40156)
//   - Mutowo działka 87/17 (III przetarg announcement art. 40145)
//   - Szamotuły działka 1819/2 (I przetarg sold result art. 40249)
//   - ul. Skrajna działki (multi-plot result art. 40214)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  decodeHtml,
  htmlToText,
  parsePLN,
  parseArea,
  parseDatePL,
  roundFromText,
  auctionDateFromText,
  extractWadiumDeadline,
  extractKW,
  extractAddress,
  extractUnitArea,
  extractStartingPrice,
  extractWadium,
  extractOutcome,
  parseTables,
  isSkippableArticle,
  isResultArticle,
  isAnnouncementArticle,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/szamotuly/parse.js';

import adapter from '../src/cities/szamotuly/index.js';
import { config } from '../src/cities/szamotuly/config.js';

const FIXTURES_PATH = fileURLToPath(
  new URL('../test-fixtures/szamotuly/fixtures.json', import.meta.url),
);
const fixtures = JSON.parse(readFileSync(FIXTURES_PATH, 'utf8'));

// ------------------------------------------------------------- parsing helpers

test('decodeHtml: unescapes numeric decimal, hex, and named entities', () => {
  assert.equal(
    decodeHtml('Szamotu&#322;y dzia&#322;ka sp&oacute;&#322;dzielczego w&#322;asno&#347;ciowego'),
    'Szamotuły działka spółdzielczego własnościowego',
  );
  assert.equal(
    decodeHtml('powierzchnia u&#380;ytkowa 56,50 m&sup2; &ndash; &sect; 12 &bdquo;test&rdquo;'),
    'powierzchnia użytkowa 56,50 m² – § 12 „test”',
  );
  assert.equal(decodeHtml('&quot;Hello&quot; &amp; &lt;World&gt;'), '"Hello" & <World>');
});

test('htmlToText: cleans markup, removes action button aside, preserves lines', () => {
  const html = `
    <h1>Tytuł artykułu&nbsp;</h1>
    <aside madkom-actionbuttons class="mkModule">Buttons</aside>
    <p>Burmistrz Miasta i Gminy Szamotu&#322;y og&#322;asza I przetarg.</p>
    <p>Cena: 350&nbsp;000,00 z&#322;</p>
  `;
  const text = htmlToText(html);
  assert.ok(!text.includes('Buttons'));
  assert.ok(text.includes('Tytuł artykułu'));
  assert.ok(text.includes('Burmistrz Miasta i Gminy Szamotuły ogłasza I przetarg.'));
  assert.ok(text.includes('Cena: 350 000,00 zł'));
});

test('parsePLN: parses currency text to integer PLN', () => {
  assert.equal(parsePLN('350 000,00 zł'), 350000);
  assert.equal(parsePLN('70 000,00 zł'), 70000);
  assert.equal(parsePLN('353 500,00 zł'), 353500);
  assert.equal(parsePLN('111 930,00 zł Brutto'), 111930);
  assert.equal(parsePLN('140 761,20 zł'), 140761);
  assert.equal(parsePLN('brak'), null);
  assert.equal(parsePLN('0,00 zł'), null);
});

test('parseArea: parses square meters', () => {
  assert.equal(parseArea('56,50'), 56.5);
  assert.equal(parseArea('29,21 m²'), 29.21);
  assert.equal(parseArea('68 m2'), 68);
  assert.equal(parseArea('4844'), 4844);
});

test('parseDatePL: formats dates into YYYY-MM-DD', () => {
  assert.equal(parseDatePL('19 grudnia 2024 r.'), '2024-12-19');
  assert.equal(parseDatePL('27 marca 2025 r.'), '2025-03-27');
  assert.equal(parseDatePL('12 maja 2026 r.'), '2026-05-12');
  assert.equal(parseDatePL('28 sierpnia 2026 r.'), '2026-08-28');
  assert.equal(parseDatePL('30 września 2026 r.'), '2026-09-30');
  assert.equal(parseDatePL('27 października 2026 r.'), '2026-10-27');
  assert.equal(parseDatePL('10.09.2026'), '2026-09-10');
});

test('roundFromText: parses ordinals and Roman numerals', () => {
  assert.equal(roundFromText('ogłasza I przetarg ustny'), 1);
  assert.equal(roundFromText('protokół z II przetargu'), 2);
  assert.equal(roundFromText('III przetarg ustny nieograniczony'), 3);
  assert.equal(roundFromText('ogłasza IV przetarg'), 4);
  assert.equal(roundFromText('ogłasza pierwszy przetarg ustny'), 1);
  assert.equal(roundFromText('wynik drugiego przetargu'), 2);
  assert.equal(roundFromText('ogłasza trzeci przetarg'), 3);
  assert.equal(roundFromText('ogłasza czwarty przetarg'), 4);
});

test('extractKW: extracts land register numbers', () => {
  assert.equal(extractKW('prowadzi księgę wieczystą numer PO1A/00048624/7.'), 'PO1A/00048624/7');
  assert.equal(extractKW('KW nr PO1B/00014689/4'), 'PO1B/00014689/4');
  assert.equal(extractKW('brak kw'), null);
});

// ----------------------------------------------------------------- title routing

test('isSkippableArticle: filters out rentals, cancellations, and lists of bidders', () => {
  assert.equal(isSkippableArticle('Dzierżawa nieruchomości gruntowej', '', ''), true);
  assert.equal(isSkippableArticle('Najem lokalu użytkowego', '', ''), true);
  assert.equal(isSkippableArticle('Odwołanie przetargu na sprzedaż nieruchomości', '', ''), true);
  assert.equal(isSkippableArticle('Przetarg-lista', 'Lista osób zakwalifikowanych', ''), true);
  assert.equal(isSkippableArticle('Sprostowanie ogłoszenia', '', ''), true);

  // Real announcements and results are NOT skippable
  assert.equal(isSkippableArticle('Kolarska', 'Burmistrz ogłasza I przetarg na lokal', 'kolarska.html'), false);
  assert.equal(isSkippableArticle('Informacja', 'INFORMACJA o wyniku I przetargu', 'informacja.html'), false);
  assert.equal(isSkippableArticle('Przetarg - Mutowo', 'Burmistrz ogłasza III przetarg', 'przetarg-mutowo.html'), false);
});

test('isResultArticle: identifies result notices', () => {
  assert.equal(isResultArticle('Informacja', 'INFORMACJA o wyniku II przetargu', 'informacja.html'), true);
  assert.equal(
    isResultArticle('Informacja- Lokal mieszkalny Szamotuły, ul. Kolarska 9/25', '', 'informacja-lokal.html'),
    true,
  );
  assert.equal(isResultArticle('Informacja o przetargu - Koźle', 'Informacja o wyniku przetargu', ''), true);
  assert.equal(isResultArticle('Przetarg', 'Burmistrz ogłasza I przetarg', 'przetarg.html'), false);
});

test('isAnnouncementArticle: identifies auction announcements', () => {
  assert.equal(isAnnouncementArticle('Przetarg', 'Burmistrz ogłasza I przetarg ustny na zbycie', 'przetarg.html'), true);
  assert.equal(isAnnouncementArticle('Kolarska', 'Burmistrz ogłasza I przetarg na zbycie spółdzielczego', 'kolarska.html'), true);
  assert.equal(isAnnouncementArticle('Przetarg Wroniecka', 'Burmistrz ogłasza I przetarg ustny na zbycie nieruchomości', ''), true);
  assert.equal(isAnnouncementArticle('Informacja', 'INFORMACJA o wyniku I przetargu', 'informacja.html'), false);
});

// ------------------------------------------------------------- fixture groundtruth

test('fixture 38186: flat Kolarska 9/25 announcement (round 1)', () => {
  const f = fixtures['38186'];
  const text = htmlToText(f.content);

  assert.equal(auctionDateFromText(text), '2024-12-19');
  assert.equal(roundFromText(text), 1);
  assert.equal(extractWadiumDeadline(text), '2024-12-13');
  assert.equal(extractKW(text), 'PO1A/00048624/7');
  assert.equal(extractStartingPrice(text), 350000);
  assert.equal(extractWadium(text), 70000);
  assert.equal(extractUnitArea(text), 56.5);

  const { address_raw, address } = extractAddress(text, f.title);
  assert.equal(address_raw, 'ul. Kolarskiej 9/25');
  assert.equal(address.street, 'Kolarskiej');
  assert.equal(address.building, '9');
  assert.equal(address.apt, '25');
  assert.equal(address.key, 'kolarskiej|9|25');

  const recs = parseAnnouncement(f);
  assert.equal(recs.length, 1);
  const rec = recs[0];
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address.key, 'kolarskiej|9|25');
  assert.equal(rec.area_m2, 56.5);
  assert.equal(rec.starting_price_pln, 350000);
  assert.equal(rec.wadium_pln, 70000);
  assert.equal(rec.wadium_deadline, '2024-12-13');
  assert.equal(rec.auction_date, '2024-12-19');
  assert.equal(rec.round, 1);
});

test('fixture 38698: flat Kolarska 9/25 result (round 2, unsold)', () => {
  const f = fixtures['38698'];
  const text = htmlToText(f.content);

  assert.equal(auctionDateFromText(text), '2025-03-27');
  assert.equal(roundFromText(text), 2);
  const outcome = extractOutcome(text);
  assert.equal(outcome.outcome, 'unsold');
  assert.equal(outcome.final_price_pln, null);
  assert.equal(outcome.unsold_reason, 'brak wpłaty wadium');

  const { address_raw, address } = extractAddress(text, f.title);
  assert.equal(address_raw, 'ul. Kolarskiej 9/25');
  assert.equal(address.key, 'kolarskiej|9|25');

  const recs = parseResultDoc(f.content, null, 'https://bip.szamotuly.pl/a,38698,informacja.html');
  assert.equal(recs.length, 1);
  const rec = recs[0];
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address.key, 'kolarskiej|9|25');
  assert.equal(rec.round, 2);
  assert.equal(rec.auction_date, '2025-03-27');
  assert.equal(rec.outcome, 'unsold');
  assert.equal(rec.unsold_reason, 'brak wpłaty wadium');
  assert.equal(rec.final_price_pln, null);
});

test('fixture 40170: flat Kolarska 9/25 result (round 1, unsold)', () => {
  const f = fixtures['40170'];
  const recs = parseResultDoc(f.content, null, 'https://bip.szamotuly.pl/a,40170,informacja.html');
  assert.equal(recs.length, 1);
  const rec = recs[0];
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address.key, 'kolarskiej|9|25');
  assert.equal(rec.round, 1);
  assert.equal(rec.auction_date, '2026-08-28');
  assert.equal(rec.outcome, 'unsold');
  assert.equal(rec.unsold_reason, 'brak wpłaty wadium');
});

test('fixture 39685: commercial unit Rynek 6 announcement', () => {
  const f = fixtures['39685'];
  const text = htmlToText(f.content);

  assert.equal(auctionDateFromText(text), '2026-05-12');
  assert.equal(roundFromText(text), 1);
  assert.equal(extractStartingPrice(text), 350000);
  assert.equal(extractWadium(text), 70000);
  assert.equal(extractUnitArea(text), 29.21);
  assert.equal(extractKW(text), 'PO1A/00021244/4');

  const { address_raw, address } = extractAddress(text, f.title);
  assert.equal(address_raw, 'Rynek 6');
  assert.equal(address.key, 'rynek|6|');

  const recs = parseAnnouncement(f);
  assert.equal(recs.length, 1);
  const rec = recs[0];
  assert.equal(rec.kind, 'uzytkowy');
  assert.equal(rec.address.key, 'rynek|6|');
  assert.equal(rec.area_m2, 29.21);
  assert.equal(rec.starting_price_pln, 350000);
  assert.equal(rec.auction_date, '2026-05-12');
});

test('fixture 39816: commercial unit Rynek 6 result (sold)', () => {
  const f = fixtures['39816'];
  const text = htmlToText(f.content);

  assert.equal(auctionDateFromText(text), '2026-05-12');
  assert.equal(roundFromText(text), 1);
  assert.equal(extractStartingPrice(text), 350000);
  assert.equal(extractUnitArea(text), 29.21);

  const outcome = extractOutcome(text);
  assert.equal(outcome.outcome, 'sold');
  assert.equal(outcome.final_price_pln, 353500);

  const recs = parseResultDoc(f.content, null, 'https://bip.szamotuly.pl/a,39816,informacja.html');
  assert.equal(recs.length, 1);
  const rec = recs[0];
  assert.equal(rec.kind, 'uzytkowy');
  assert.equal(rec.address.key, 'rynek|6|');
  assert.equal(rec.round, 1);
  assert.equal(rec.auction_date, '2026-05-12');
  assert.equal(rec.outcome, 'sold');
  assert.equal(rec.final_price_pln, 353500);
  assert.equal(rec.starting_price_pln, 350000);
  assert.equal(rec.area_m2, 29.21);
});

test('fixture 40048: built property Wroniecka 43 announcement', () => {
  const f = fixtures['40048'];
  const text = htmlToText(f.content);

  assert.equal(auctionDateFromText(text), '2026-08-28');
  assert.equal(roundFromText(text), 1);
  assert.equal(extractStartingPrice(text), 160000);
  assert.equal(extractWadium(text), 32000);
  assert.equal(extractUnitArea(text), 22.55);
  assert.equal(extractKW(text), 'PO1A/00024546/2');

  const { address_raw, address } = extractAddress(text, f.title);
  assert.equal(address_raw, 'ul. Wronieckiej 43');
  assert.equal(address.key, 'wronieckiej|43|');

  const recs = parseAnnouncement(f);
  assert.equal(recs.length, 1);
  const rec = recs[0];
  assert.equal(rec.kind, 'zabudowana');
  assert.equal(rec.address.key, 'wronieckiej|43|');
  assert.equal(rec.area_m2, 22.55);
  assert.equal(rec.starting_price_pln, 160000);
  assert.equal(rec.auction_date, '2026-08-28');
});

test('fixture 40171: built property Wroniecka 43 result (unsold)', () => {
  const f = fixtures['40171'];
  const recs = parseResultDoc(f.content, null, 'https://bip.szamotuly.pl/a,40171,informacja.html');
  assert.equal(recs.length, 1);
  const rec = recs[0];
  assert.equal(rec.kind, 'zabudowana');
  assert.equal(rec.address.key, 'wronieckiej|43|');
  assert.equal(rec.round, 1);
  assert.equal(rec.auction_date, '2026-08-28');
  assert.equal(rec.outcome, 'unsold');
  assert.equal(rec.unsold_reason, 'brak wpłaty wadium');
  assert.equal(rec.area_m2, 22.55);
});

test('fixture 40047: built property Przysieczyn 52 announcement', () => {
  const f = fixtures['40047'];
  const text = htmlToText(f.content);

  assert.equal(auctionDateFromText(text), '2026-08-28');
  assert.equal(roundFromText(text), 2);
  assert.equal(extractUnitArea(text), 68);
  assert.equal(extractKW(text), 'PO1B/00014689/4');

  const { address_raw, address } = extractAddress(text, f.title);
  assert.equal(address_raw, 'Przysieczyn 52');
  assert.equal(address.key, 'przysieczyn|52|');

  const recs = parseAnnouncement(f);
  assert.equal(recs.length, 1);
  const rec = recs[0];
  assert.equal(rec.kind, 'zabudowana');
  assert.equal(rec.address.key, 'przysieczyn|52|');
  assert.equal(rec.area_m2, 68);
  assert.equal(rec.auction_date, '2026-08-28');
  assert.equal(rec.round, 2);
});

test('fixture 40156: built property Przysieczyn 52 result (unsold)', () => {
  const f = fixtures['40156'];
  const recs = parseResultDoc(f.content, null, 'https://bip.szamotuly.pl/a,40156,informacja.html');
  assert.equal(recs.length, 1);
  const rec = recs[0];
  assert.equal(rec.kind, 'zabudowana');
  assert.equal(rec.address.key, 'przysieczyn|52|');
  assert.equal(rec.round, 2);
  assert.equal(rec.auction_date, '2026-08-28');
  assert.equal(rec.outcome, 'unsold');
  assert.equal(rec.area_m2, 68);
});

test('fixture 40145: land Mutowo parcel 87/17 active announcement (table parsed)', () => {
  const f = fixtures['40145'];
  const text = htmlToText(f.content);

  assert.equal(auctionDateFromText(text), '2026-10-27');
  assert.equal(roundFromText(text), 3);
  assert.equal(extractWadiumDeadline(text), '2026-10-21');

  const tables = parseTables(f.content);
  assert.equal(tables.length, 1);
  assert.equal(tables[0].dzialka_nr, '87/17');
  assert.equal(tables[0].area_m2, 4844);
  assert.equal(tables[0].kw, 'PO1A/00038694/5');
  assert.equal(tables[0].starting_price_pln, 490000);
  assert.equal(tables[0].wadium_pln, 98000);

  const recs = parseAnnouncement(f);
  assert.equal(recs.length, 1);
  const rec = recs[0];
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.dzialka_nr, '87/17');
  assert.equal(rec.area_m2, 4844);
  assert.equal(rec.starting_price_pln, 490000);
  assert.equal(rec.wadium_pln, 98000);
  assert.equal(rec.auction_date, '2026-10-27');
  assert.equal(rec.round, 3);
});

test('fixture 40249: land Szamotuły parcel 1819/2 result (sold)', () => {
  const f = fixtures['40249'];
  const recs = parseResultDoc(f.content, null, 'https://bip.szamotuly.pl/a,40249,informacja.html');
  assert.equal(recs.length, 1);
  const rec = recs[0];
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.dzialka_nr, '1819/2');
  assert.equal(rec.area_m2, 400);
  assert.equal(rec.starting_price_pln, 70000);
  assert.equal(rec.final_price_pln, 111930);
  assert.equal(rec.outcome, 'sold');
  assert.equal(rec.auction_date, '2026-09-30');
});

test('fixture 40214: land Skrajna multi-plot result (table parsed, 6 plots)', () => {
  const f = fixtures['40214'];
  const recs = parseResultDoc(f.content, null, 'https://bip.szamotuly.pl/a,40214,informacja.html');
  assert.equal(recs.length, 6);

  const byPlot = Object.fromEntries(recs.map((r) => [r.dzialka_nr, r]));
  assert.ok(byPlot['1138/3']);
  assert.ok(byPlot['1138/4']);
  assert.ok(byPlot['1138/6']);
  assert.ok(byPlot['1138/8']);
  assert.ok(byPlot['1138/12']);
  assert.ok(byPlot['1139/8']);

  // Check sold plots
  assert.equal(byPlot['1138/8'].outcome, 'sold');
  assert.equal(byPlot['1138/8'].final_price_pln, 140761);
  assert.equal(byPlot['1138/12'].outcome, 'sold');
  assert.equal(byPlot['1138/12'].final_price_pln, 140761);

  // Check unsold plots
  assert.equal(byPlot['1138/4'].outcome, 'unsold');
  assert.equal(byPlot['1138/6'].outcome, 'unsold');
});

// ------------------------------------------------------------- adapter contract

test('szamotuly adapter config matches specification', () => {
  assert.equal(config.id, 'szamotuly');
  assert.equal(config.label, 'Szamotuły');
  assert.equal(config.voivodeship, 'wielkopolskie');
  assert.equal(config.authority, 'Burmistrz Miasta i Gminy Szamotuły');
  assert.equal(config.host, 'bip.szamotuly.pl');
  assert.equal(config.source, 'html');
  assert.equal(config.teryt, '3024074');
});

test('szamotuly adapter exports expected functions', () => {
  assert.equal(typeof adapter.crawlActive, 'function');
  assert.equal(typeof adapter.crawlResultDocs, 'function');
  assert.equal(typeof adapter.parseResultDoc, 'function');
});
