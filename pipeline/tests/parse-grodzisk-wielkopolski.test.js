// Grodzisk Wielkopolski parser unit tests.
// Tests groundtruthed against real municipal auction documents fetched from bip.grodzisk.wlkp.pl:
//   - Announcement 23474: II przetarg on ul. Kolejowa 9/2 (67.80 m²) & ul. 27 Stycznia 8/2 (35.49 m²)
//   - Result 23548: 18.05.2026 results (ul. Kolejowa 9/2 SOLD, ul. 27 Stycznia 8/2 UNSOLD)
//   - Result 23054: 03.09.2025 mixed notice (3 land plots skipped, 3 flats parsed: Kolejowa 9/2, 27 Stycznia 8/2, os. Wojska Polskiego 24/24A)
//   - Result 22375: 22.04.2024 mixed notice (2 land plots skipped, 1 flat parsed: Kąkolewo 189/1 SOLD)
//   - Result 23784: Land-only result notice (correctly skipped, 0 flat records)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  cleanHtml,
  parsePLN,
  parseNum,
  extractDate,
  extractRound,
  isFlatNotice,
  extractAnnouncementAddress,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/grodzisk-wielkopolski/parse.js';

import adapter from '../src/cities/grodzisk-wielkopolski/index.js';
import { config } from '../src/cities/grodzisk-wielkopolski/config.js';

const FIXTURES_PATH = fileURLToPath(
  new URL('../test-fixtures/grodzisk-wielkopolski/fixtures.json', import.meta.url),
);
const fixtures = JSON.parse(readFileSync(FIXTURES_PATH, 'utf8'));

// ------------------------------------------------------------- 1. Config & contract

test('config exports valid city metadata', () => {
  assert.equal(config.id, 'grodzisk-wielkopolski');
  assert.equal(config.teryt, '3005024');
  assert.equal(config.label, 'Grodzisk Wielkopolski');
  assert.equal(config.voivodeship, 'wielkopolskie');
  assert.equal(config.authority, 'Burmistrz Grodziska Wielkopolskiego');
  assert.equal(config.host, 'bip.grodzisk.wlkp.pl');
  assert.equal(config.source, 'html');
});

test('adapter exports full contract interface', () => {
  assert.equal(adapter.id, 'grodzisk-wielkopolski');
  assert.equal(typeof adapter.crawlActive, 'function');
  assert.equal(typeof adapter.crawlResultDocs, 'function');
  assert.equal(typeof adapter.parseResultDoc, 'function');
});

// ------------------------------------------------------------- 2. Helper primitives

test('cleanHtml unescapes entities and collapses whitespace', () => {
  assert.equal(
    cleanHtml('Og&#322;oszenie o przetargu na sprzeda&#380; nieruchomo&#347;ci lokalowych &nbsp;'),
    'Ogłoszenie o przetargu na sprzedaż nieruchomości lokalowych',
  );
  assert.equal(
    cleanHtml('Powierzchnia u&#380;ytkowa 67,80 m&sup2; &ndash; &oacute;'),
    'Powierzchnia użytkowa 67,80 m² – ó',
  );
  assert.equal(
    cleanHtml('&#x201e;Grodzisk&#x201d; &amp; &lt;Wielkopolski&gt;'),
    '„Grodzisk” & <Wielkopolski>',
  );
});

test('parsePLN parses Polish currency strings', () => {
  assert.equal(parsePLN('200.000,00 zł'), 200000);
  assert.equal(parsePLN('125.000 zł'), 125000);
  assert.equal(parsePLN('202 000 zł'), 202000);
  assert.equal(parsePLN('171.700 zł'), 171700);
  assert.equal(parsePLN('-'), null);
  assert.equal(parsePLN(null), null);
});

test('parseNum parses comma-decimal numbers', () => {
  assert.equal(parseNum('67,80'), 67.8);
  assert.equal(parseNum('35,49'), 35.49);
  assert.equal(parseNum('74.77'), 74.77);
  assert.equal(parseNum(null), null);
});

test('extractDate parses various date formats to ISO YYYY-MM-DD', () => {
  assert.equal(extractDate('18.05.2026r.'), '2026-05-18');
  assert.equal(extractDate('18.05. 2026'), '2026-05-18');
  assert.equal(extractDate('13. 05.2026r.'), '2026-05-13');
  assert.equal(extractDate('03.09.2025r.'), '2025-09-03');
  assert.equal(extractDate('22.04.2024'), '2024-04-22');
  assert.equal(extractDate('invalid'), null);
});

test('extractRound detects Roman numerals without prefix collision', () => {
  assert.equal(extractRound('II PRZETARG USTNY NIEOGRANICZONY'), 2);
  assert.equal(extractRound('I PRZETARG USTNY NIEOGRANICZONY'), 1);
  assert.equal(extractRound('III PRZETARG USTNY'), 3);
  assert.equal(extractRound('IV PRZETARG'), 4);
  assert.equal(extractRound('V PRZETARG'), 5);
  assert.equal(extractRound('Bez numeru przetargu'), 1);
});

test('isFlatNotice filters flat vs land / transport / procurement notices', () => {
  assert.equal(
    isFlatNotice('Ogłoszenie o przetargu ustnym nieograniczonym na sprzedaż nieruchomości lokalowych'),
    true,
  );
  assert.equal(
    isFlatNotice('Informacja o wyniku przetargu ustnego nieograniczonego na sprzedaż nieruchomości lokalowych'),
    true,
  );
  assert.equal(
    isFlatNotice('Przetarg na sprzedaż nieruchomości', '<p>przetarg na lokal mieszkalny nr 2</p>'),
    true,
  );
  // Pure land / transport notices must be rejected:
  assert.equal(
    isFlatNotice('Ogłoszenie o przetargu ustnym ograniczonym na sprzedaż nieruchomości rolnej'),
    false,
  );
  assert.equal(
    isFlatNotice('Dowóz uczniów do szkół w roku szkolnym 2020/2021'),
    false,
  );
  assert.equal(
    isFlatNotice('Ogłoszenie o przetargu na dzierżawę nieruchomości'),
    false,
  );
});

test('extractAnnouncementAddress extracts normalized street, building and apartment', () => {
  const text1 =
    'Lokal mieszkalny nr 2 oraz udział w częściach wspólnych budynku (do 778/1516 części), ' +
    'położonego w Grodzisku Wlkp. przy ul. Kolejowej 9 i w prawie własności gruntu – działka nr 496/4.';
  const res1 = extractAnnouncementAddress(text1);
  assert.ok(res1);
  assert.equal(res1.address.key, 'kolejowa|9|2');
  assert.equal(res1.address.street, 'Kolejowa');
  assert.equal(res1.address.building, '9');
  assert.equal(res1.address.apt, '2');

  const text2 =
    'Lokal mieszkalny nr 2 oraz udział w częściach wspólnych budynku (do 3989/58532 części), ' +
    'położonego w Grodzisku Wlkp. przy ul. 27 Stycznia 8 i w prawie własności gruntu – działka nr 1326.';
  const res2 = extractAnnouncementAddress(text2);
  assert.ok(res2);
  assert.equal(res2.address.key, '27 stycznia|8|2');
  assert.equal(res2.address.street, '27 Stycznia');
  assert.equal(res2.address.building, '8');
  assert.equal(res2.address.apt, '2');
});

// ------------------------------------------------------------- 3. Announcement parsing

test('parseAnnouncement extracts both flats from Fixture 23474', () => {
  const f = fixtures['23474'];
  const listings = parseAnnouncement(f.content, {
    title: f.title,
    detail_url: `https://bip.grodzisk.wlkp.pl/${f.link}`,
  });

  assert.equal(listings.length, 2);

  const [l1, l2] = listings;

  assert.equal(l1.address.key, 'kolejowa|9|2');
  assert.equal(l1.address.street, 'Kolejowa');
  assert.equal(l1.address.building, '9');
  assert.equal(l1.address.apt, '2');
  assert.equal(l1.area_m2, 67.8);
  assert.equal(l1.starting_price_pln, 200000);
  assert.equal(l1.wadium_pln, 20000);
  assert.equal(l1.auction_date, '2026-05-18');
  assert.equal(l1.auction_time, '10:00');
  assert.equal(l1.wadium_deadline, '2026-05-13');
  assert.equal(l1.round, 2);
  assert.equal(l1.kind, 'mieszkalny');
  assert.equal(l1.url, 'https://bip.grodzisk.wlkp.pl/a,23474,ogloszenie-o-przetargu-ustnym-nieograniczonym-na-sprzedaz-nieruchomosci-lokalowych.html');

  assert.equal(l2.address.key, '27 stycznia|8|2');
  assert.equal(l2.address.street, '27 Stycznia');
  assert.equal(l2.address.building, '8');
  assert.equal(l2.address.apt, '2');
  assert.equal(l2.area_m2, 35.49);
  assert.equal(l2.starting_price_pln, 125000);
  assert.equal(l2.wadium_pln, 13000);
  assert.equal(l2.auction_date, '2026-05-18');
  assert.equal(l2.round, 2);
  assert.equal(l2.kind, 'mieszkalny');
});

// ------------------------------------------------------------- 4. Result document parsing

test('parseResultDoc extracts sold and unsold flats from Fixture 23548 (auction 18.05.2026)', () => {
  const f = fixtures['23548'];
  const results = parseResultDoc(f.content, null, `https://bip.grodzisk.wlkp.pl/${f.link}`);

  assert.equal(results.length, 2);

  const byKey = Object.fromEntries(results.map((r) => [r.address.key, r]));

  // Flat 1: ul. Kolejowa 9/2 — SOLD for 202 000 zł
  const r1 = byKey['kolejowa|9|2'];
  assert.ok(r1, 'kolejowa|9|2 must be present');
  assert.equal(r1.auction_date, '2026-05-18');
  assert.equal(r1.area_m2, 67.8);
  assert.equal(r1.starting_price_pln, 200000);
  assert.equal(r1.final_price_pln, 202000);
  assert.equal(r1.outcome, 'sold');
  assert.equal(r1.buyer, 'Artur Roszak');
  assert.equal(r1.unsold_reason, null);
  assert.equal(r1.kind, 'mieszkalny');

  // Flat 2: ul. 27 Stycznia 8/2 — UNSOLD (no bids)
  const r2 = byKey['27 stycznia|8|2'];
  assert.ok(r2, '27 stycznia|8|2 must be present');
  assert.equal(r2.auction_date, '2026-05-18');
  assert.equal(r2.area_m2, 35.49);
  assert.equal(r2.starting_price_pln, 125000);
  assert.equal(r2.final_price_pln, null);
  assert.equal(r2.outcome, 'unsold');
  assert.equal(r2.buyer, null);
  assert.equal(r2.unsold_reason, 'no_bids');
  assert.equal(r2.kind, 'mieszkalny');
});

test('parseResultDoc extracts 3 flats and skips 3 land plots from Fixture 23054 (auction 03.09.2025)', () => {
  const f = fixtures['23054'];
  const results = parseResultDoc(f.content, null, `https://bip.grodzisk.wlkp.pl/${f.link}`);

  // Exactly 3 flat records (land plots 268/8, 268/9, 268/10 must be skipped)
  assert.equal(results.length, 3);

  const byKey = Object.fromEntries(results.map((r) => [r.address.key, r]));

  // 1. Kolejowa 9/2 (unsold, no wadium)
  const r1 = byKey['kolejowa|9|2'];
  assert.ok(r1);
  assert.equal(r1.auction_date, '2025-09-03');
  assert.equal(r1.area_m2, 67.8);
  assert.equal(r1.starting_price_pln, 200000);
  assert.equal(r1.final_price_pln, null);
  assert.equal(r1.outcome, 'unsold');
  assert.equal(r1.unsold_reason, 'no_wadium');

  // 2. 27 Stycznia 8/2 (unsold, no wadium)
  const r2 = byKey['27 stycznia|8|2'];
  assert.ok(r2);
  assert.equal(r2.auction_date, '2025-09-03');
  assert.equal(r2.area_m2, 35.49);
  assert.equal(r2.starting_price_pln, 125000);
  assert.equal(r2.final_price_pln, null);
  assert.equal(r2.outcome, 'unsold');
  assert.equal(r2.unsold_reason, 'no_wadium');

  // 3. os. Wojska Polskiego 24/24A (unsold, no wadium)
  const r3 = byKey['wojska polskiego|24|24A'];
  assert.ok(r3);
  assert.equal(r3.auction_date, '2025-09-03');
  assert.equal(r3.area_m2, 74.77);
  assert.equal(r3.starting_price_pln, 400000);
  assert.equal(r3.final_price_pln, null);
  assert.equal(r3.outcome, 'unsold');
  assert.equal(r3.unsold_reason, 'no_wadium');
});

test('parseResultDoc extracts flat in village and skips land from Fixture 22375 (auction 22.04.2024)', () => {
  const f = fixtures['22375'];
  const results = parseResultDoc(f.content, null, `https://bip.grodzisk.wlkp.pl/${f.link}`);

  // Exactly 1 flat record (land plots 3569/1 and 3589/11 must be skipped)
  assert.equal(results.length, 1);

  const r = results[0];
  assert.equal(r.address.key, 'kakolewo|189|1');
  assert.equal(r.auction_date, '2024-04-22');
  assert.equal(r.area_m2, 73.6);
  assert.equal(r.starting_price_pln, 170000);
  assert.equal(r.final_price_pln, 171700);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.buyer, 'Aleksandra i Paweł Augustyniak');
  assert.equal(r.unsold_reason, null);
});

test('parseResultDoc skips pure land notice (Fixture 23784)', () => {
  const f = fixtures['23784'];
  const results = parseResultDoc(f.content, null, `https://bip.grodzisk.wlkp.pl/${f.link}`);
  assert.equal(results.length, 0);
});
