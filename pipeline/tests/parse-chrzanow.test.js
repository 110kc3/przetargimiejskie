// Chrzanów parser test — MULTI-PROPERTY land TABLE. Fixture is a condensed-but-
// faithful copy of the REAL notice (verified 2026-06-26): obręb Pogorzyce, ul.
// Borowcowej, dz. 49/283 (0,0912 ha) = 205 000 zł and dz. 49/284 (0,0972 ha) =
// 217 000 zł, przetarg 19.11.2025. The shared road działka 49/286 (udział, no
// cena) is correctly skipped.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildLand } from '../src/core/build-land.js';
import { harvestArticles } from '../src/cities/chrzanow/crawl.js';
import { isSaleAnnouncement, obrebFromText, streetFromText, parseRows, parseAnnouncement } from '../src/cities/chrzanow/parse.js';

const BODY = `Ogłoszenie Burmistrza Miasta Chrzanowa z dnia 9 października 2025 r.
Burmistrz Miasta Chrzanowa ogłasza przetargi ustne nieograniczone na sprzedaż niezabudowanych nieruchomości, położonych w rejonie ul. Borowcowej w Chrzanowie, obejmujących działki oznaczone w ewidencji gruntów jednostka ewidencyjna Chrzanów-miasto, obręb Pogorzyce numerami:
1 49/283 – 0,0912 KR1C/00104660/5 205 000 19.11.2025 - 11.00 41 000
49/286 – 0,0374 (udz.1/3) KR1C/00041090/8 13.11.2025
2 49/284 – 0,0972 KR1C/00104661/2 217 000 19.11.2025 - 12.00 43 400
49/286 - 0,0374 (udz.1/3) KR1C/00041090/8 13.11.2025
Działy II ksiąg wieczystych – własność: Gmina Chrzanów.
24. Przetargi przeprowadzone 30.09.2025 r. zakończyły się wynikiem negatywnym.`;

const currentNotice = () => readFileSync(new URL('./fixtures/remediation/chrzanow-2950984.html', import.meta.url), 'utf8');

test('October source table preserves one combined price and area for all three parcels', () => {
  // Rendered official article 2950984, fetched 2026-10-19. The whole lot has
  // three constituent areas plus a displayed total; the price is not per parcel.
  const rows = parseAnnouncement('', currentNotice(), 'https://bip.malopolska.pl/umchrzanow,a,2950984');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].kind, 'grunt');
  assert.equal(rows[0].dzialka_nr, '6297, 1535, 1559/1');
  assert.equal(rows[0].obreb, 'Chrzanów');
  assert.equal(rows[0].area_m2, 43439);
  assert.equal(rows[0].starting_price_pln, 8005000);
  assert.equal(rows[0].auction_date, '2026-12-17');
  assert.equal(rows[0].round, null, 'a prior unsuccessful date does not establish a stated round');
  const { plots } = buildLand(rows, 'chrzanow');
  assert.equal(plots.length, 1);
  assert.equal(plots[0].parcels.length, 3);
  assert.equal(plots[0].listings.length, 1);
  assert.equal(plots[0].listings[0].starting_price_pln, 8005000);
});

test('inconsistent total area and invalid auction dates cannot produce a combined lot', () => {
  assert.ok(currentNotice().includes('4,3439'));
  assert.equal(parseAnnouncement('', currentNotice().replace('4,3439', '4,9999'), '').length, 0);
  assert.ok(currentNotice().includes('17.12.2026'));
  assert.equal(parseAnnouncement('', currentNotice().replace('17.12.2026', '31.02.2026'), '').length, 0);
  const price = '8&nbsp;005 000</strong></p>';
  assert.ok(currentNotice().includes(price));
  assert.equal(parseAnnouncement('', currentNotice().replace(price, price + '<p>100 000</p>'), '').length, 0);
});

test('stub discovery follows BIP article links and excludes unrelated menu pages', () => {
  const article = 'https://bip.malopolska.pl/umchrzanow,a,2950984,sale.html';
  const menu = 'https://bip.malopolska.pl/umchrzanow,m,441366,sygnalisci.html';
  assert.deepEqual(harvestArticles(`<a href="${article}">Sale</a><a href="${menu}">Menu</a><a href="${article}">Duplicate</a>`), [article]);
});

test('helpers', () => {
  assert.equal(isSaleAnnouncement(BODY), true);
  assert.equal(obrebFromText(BODY), 'Pogorzyce');
  assert.equal(streetFromText(BODY), 'Borowcowej');
  assert.equal(parseRows(BODY).length, 2); // shared road działka (no cena) skipped
});

test('parseAnnouncement: 2 priced land rows', () => {
  const recs = parseAnnouncement('Ogłoszenie Burmistrza Miasta Chrzanowa', BODY, 'https://www.chrzanow.pl/...');
  assert.equal(recs.length, 2);
  assert.equal(recs[0].kind, 'grunt');
  assert.equal(recs[0].dzialka_nr, '49/283');
  assert.equal(recs[0].obreb, 'Pogorzyce');
  assert.equal(recs[0].area_m2, 912); // 0,0912 ha
  assert.equal(recs[0].address_raw, 'ul. Borowcowej');
  assert.equal(recs[0].starting_price_pln, 205000);
  assert.equal(recs[0].auction_date, '2025-11-19');
  assert.equal(recs[1].dzialka_nr, '49/284');
  assert.equal(recs[1].area_m2, 972);
  assert.equal(recs[1].starting_price_pln, 217000);
});
