import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanText,
  isAnnouncementTitle,
  isResultTitle,
  parsePlDate,
  parsePrice,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/inowroclaw/parse.js';

test('inowroclaw: isAnnouncementTitle & isResultTitle', () => {
  assert.equal(
    isAnnouncementTitle('Rokowania po drugim przetargu ustnym nieograniczonym na sprzedaż działki'),
    true
  );
  assert.equal(
    isResultTitle('Informacja o wyniku przetargu ustnego na sprzedaż nieruchomości'),
    true
  );
});

test('inowroclaw: parsePlDate and parsePrice', () => {
  assert.equal(parsePlDate('20 października 2026 r.'), '2026-10-20');
  assert.equal(parsePlDate('15.09.2026'), '2026-09-15');
  assert.equal(parsePrice('85 000,00 zł'), 85000);
  assert.equal(parsePrice('8.500 zł'), 8500);
});

test('inowroclaw: parseAnnouncement extracts notice details', () => {
  const item = {
    id: '40704',
    title: 'Rokowania po drugim przetargu ustnym nieograniczonym na sprzedaż działki nr 4/508',
    url: 'https://bip.inowroclaw.pl/attachments/download/40704',
  };
  const docText = `
    PREZYDENT MIASTA INOWROCŁAWIA ogłasza rokowania po drugim przetargu ustnym nieograniczonym na sprzedaż działki nr 4/508 położonej w Inowrocławiu przy ul. Cypriana Kamila Norwida.
    Działka nr 4/508 o pow. 0,0110 ha, zapisana w księdze wieczystej nr BY1I/00017812/1.
    Cena wywoławcza wynosi 85.000,00 zł brutto.
    Zaliczka wynosi 8.500,00 zł.
    Termin rokowań wyznaczono na dzień 20 października 2026 r. o godz. 11.00 w sali nr 20 Urzędu Miasta Inowrocławia.
  `;
  const res = parseAnnouncement(item, docText);

  assert.equal(res.id, 'inowroclaw-40704');
  assert.equal(res.auction_date, '2026-10-20');
  assert.equal(res.price, 85000);
  assert.equal(res.deposit, 8500);
  assert.equal(res.parcel, '4/508');
  assert.equal(res.area, 110);
  assert.equal(res.land_registry, 'BY1I/00017812/1');
  assert.equal(res.type, 'announcement');
  assert.equal(res.property_type, 'grunt');
});

test('inowroclaw: parseResultDoc extracts result status and buyer', () => {
  const item = {
    id: '40705',
    title: 'Informacja o wyniku rokowań na sprzedaż nieruchomości',
    url: 'https://bip.inowroclaw.pl/attachments/download/40705',
  };
  const docText = `
    Informacja o wyniku rokowań
    W dniu 20 października 2026 r. odbyły się rokowania na sprzedaż działki nr 4/508 przy ul. Norwida.
    Cena wywoławcza: 85.000,00 zł.
    Najwyższa cena osiągnięta w przetargu: 90.000,00 zł.
    Ustalona jako nabywca nieruchomości: Kujawska Spółka Inwestycyjna
    Osoby dopuszczone do uczestniczenia: 1.
  `;
  const res = parseResultDoc(item, docText);

  assert.equal(res.id, 'inowroclaw-result-40705');
  assert.equal(res.status, 'positive');
  assert.equal(res.price_achieved, 90000);
  assert.equal(res.buyer, 'Kujawska Spółka Inwestycyjna');
  assert.equal(res.parcel, '4/508');
  assert.equal(res.type, 'result');
});
