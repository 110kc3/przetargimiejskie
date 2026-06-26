// Olkusz parser test. Fixture is a condensed-but-faithful copy of the REAL
// WordPress post (verified 2026-06-26): dz. 638/25, V przetarg, ul. Wapiennej,
// cena wywoławcza 627 400,00 zł, przetarg 11.04.2025. Title is a date, so the
// sale gate + kind come from the body; the office "Rynek 1" is not a street.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSaleAnnouncement, parcelFromText, plotAreaFromText, landStreetFromText, parseAnnouncement } from '../src/cities/olkusz/parse.js';

const BODY = `Olkusz, dnia 07.02.2025 r.
Burmistrz Miasta i Gminy Olkusz Rynek 1 ogłasza V przetarg ustny, nieograniczony na sprzedaż nieruchomości niezabudowanej, położonej w Olkuszu.
1. Przedmiotem przetargu jest nieruchomość niezabudowana składająca się z działki nr 638/25 o pow. 3 137m2, położona w Olkuszu w pobliżu ul. Wapiennej w pośredniej strefie miasta. Nieruchomość stanowi własność Gminy Olkusz, objęta jest księgą wieczystą nr: KR1O/00023702/2.
I przetarg został przeprowadzony w dniu 29.09.2023 r.
IV przetarg został przeprowadzony w dniu 09.08.2024 r.
4. Cena wywoławcza do przetargu wynosi: 627 400,00 zł.
7. Przetarg odbędzie się w dniu 11.04.2025 r. o godz. 9.00 w budynku Urzędu Miasta i Gminy w Olkuszu, Rynek 1.`;

test('helpers', () => {
  assert.equal(isSaleAnnouncement(BODY), true);
  assert.equal(isSaleAnnouncement('Burmistrz ogłasza wykaz nieruchomości do dzierżawy'), false);
  assert.equal(parcelFromText(BODY), '638/25');
  assert.equal(plotAreaFromText(BODY), 3137);
  assert.equal(landStreetFromText(BODY), 'Wapiennej'); // NOT "Rynek" (office)
});

test('parseAnnouncement: land — parcel, area, street, price, date, round', () => {
  const rec = parseAnnouncement('7 lutego 2025', BODY, 'https://umig.olkusz.pl/index.php/2025/02/07/7-lutego-2025-3/');
  assert.ok(rec);
  assert.equal(rec.kind, 'grunt');
  assert.equal(rec.dzialka_nr, '638/25');
  assert.equal(rec.area_m2, 3137);
  assert.equal(rec.address_raw, 'ul. Wapiennej');
  assert.equal(rec.starting_price_pln, 627400);
  assert.equal(rec.auction_date, '2025-04-11'); // future przetarg, not a prior round
  assert.equal(rec.round, 5);
});
