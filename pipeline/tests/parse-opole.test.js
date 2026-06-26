// Opole parser test. Fixture is a condensed-but-faithful copy of the REAL SISCO
// article (verified 2026-06-26): flat nr 2, ul. Rynek 3, łączna pow. 68,38m2,
// cena wywoławcza 624.000,00 zł, przetarg 28.01.2026. The "Cena osiągnięta …
// obniżona o 30%" line is BOILERPLATE (not a result), and "Rynek 1A" is the office.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSaleAnnouncement, flatAreaFromText, flatAddressFromText, parseAnnouncement } from '../src/cities/opole/parse.js';

const BODY = `PREZYDENT MIASTA OPOLA ogłasza I przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 2 (wymagającego przeprowadzenia remontu) położonego w Opolu przy ul. Rynek 3, zlokalizowanego na I piętrze budynku, składającego się z 2 pokoi, kuchni, przedpokoju i łazienki o łącznej pow. 68,38m2 wraz ze sprzedażą ułamkowej części gruntu w udziale 11,66% obejmującego dz. nr 59/15 o pow. 0,0195ha, obręb Opole, KW OP1O/00072229/1, niezbędnego do racjonalnego korzystania z lokalu.
Cena wywoławcza nieruchomości wynosi: 624.000,00 zł; wadium: 62.500,00 zł.
UWAGA: Cena osiągnięta w przetargu za nabycie na własność ww. lokalu mieszkalnego z uwagi na zabytkowy charakter budynku może zostać obniżona o 30% na wniosek nabywcy.
Przetarg odbędzie się w dniu 28 stycznia 2026r., o godz. 10.00 w Urzędzie Miasta Opola – sala konferencyjna nr 312, Rynek 1A, Opole.`;

test('helpers', () => {
  assert.equal(isSaleAnnouncement(BODY), true);
  assert.equal(flatAreaFromText(BODY), 68.38);
  assert.equal(flatAddressFromText(BODY), 'ul. Rynek 3/2'); // property, not the office Rynek 1A
  // robust area — pick the flat, NEVER the ancillary (komórka/piwnica). This was
  // the cellar-area + insane-m2 bug that failed the opole CI refresh.
  assert.equal(flatAreaFromText('o powierzchni użytkowej 47,00 m2 oraz pomieszczenia przynależnego – komórki o pow. 6,94 m2'), 47);
  assert.equal(flatAreaFromText('o łącznej pow. 90,00 m2 oraz przynależnej komórki o pow. 11,14 m2'), 90);
  assert.equal(flatAreaFromText('o łącznej pow. 95,38m2 wraz ze sprzedażą ułamkowej części gruntu obejmującego dz. nr 2513 o pow. 0,0257ha'), 95.38);
});

test('parseAnnouncement: flat — address key, area, price, future date, round', () => {
  const rec = parseAnnouncement('I PRZETARG ... RYNEK 3', BODY, 'https://bip.um.opole.pl/przetargi,9_2026-1_390');
  assert.ok(rec);
  assert.equal(rec.kind, 'mieszkalny');
  assert.equal(rec.address.key, 'rynek|3|2');
  assert.equal(rec.area_m2, 68.38);
  assert.equal(rec.starting_price_pln, 624000); // NOT mistaking the "30%" boilerplate
  assert.equal(rec.auction_date, '2026-01-28');
  assert.equal(rec.round, 1);
});
