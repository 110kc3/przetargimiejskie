// Chrzanów parser test — MULTI-PROPERTY land TABLE. Fixture is a condensed-but-
// faithful copy of the REAL notice (verified 2026-06-26): obręb Pogorzyce, ul.
// Borowcowej, dz. 49/283 (0,0912 ha) = 205 000 zł and dz. 49/284 (0,0972 ha) =
// 217 000 zł, przetarg 19.11.2025. The shared road działka 49/286 (udział, no
// cena) is correctly skipped.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSaleAnnouncement, obrebFromText, streetFromText, parseRows, parseAnnouncement } from '../src/cities/chrzanow/parse.js';

const BODY = `Ogłoszenie Burmistrza Miasta Chrzanowa z dnia 9 października 2025 r.
Burmistrz Miasta Chrzanowa ogłasza przetargi ustne nieograniczone na sprzedaż niezabudowanych nieruchomości, położonych w rejonie ul. Borowcowej w Chrzanowie, obejmujących działki oznaczone w ewidencji gruntów jednostka ewidencyjna Chrzanów-miasto, obręb Pogorzyce numerami:
1 49/283 – 0,0912 KR1C/00104660/5 205 000 19.11.2025 - 11.00 41 000
49/286 – 0,0374 (udz.1/3) KR1C/00041090/8 13.11.2025
2 49/284 – 0,0972 KR1C/00104661/2 217 000 19.11.2025 - 12.00 43 400
49/286 - 0,0374 (udz.1/3) KR1C/00041090/8 13.11.2025
Działy II ksiąg wieczystych – własność: Gmina Chrzanów.
24. Przetargi przeprowadzone 30.09.2025 r. zakończyły się wynikiem negatywnym.`;

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
