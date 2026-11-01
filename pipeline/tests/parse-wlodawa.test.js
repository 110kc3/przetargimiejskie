import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAnnouncementTitle,
  isResultTitle,
  parsePlDate,
  parsePrice,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/wlodawa/parse.js';

test('isAnnouncementTitle and isResultTitle correctly distinguish notices', () => {
  assert.equal(
    isAnnouncementTitle('Ogłoszenie drugiego przetargu ustnego nieograniczonego na sprzedaż lokalu mieszkalnego'),
    true
  );
  assert.equal(
    isAnnouncementTitle('Ogłoszenie o I przetargu na sprzedaż nieruchomości gruntowej'),
    true
  );
  assert.equal(
    isAnnouncementTitle('Informacja o wyniku przetargu ustnego nieograniczonego'),
    false
  );
  assert.equal(
    isResultTitle('Informacja o wyniku przetargu ustnego nieograniczonego'),
    true
  );
  assert.equal(
    isResultTitle('Wynik przetargu na zbycie nieruchomości'),
    true
  );
  assert.equal(
    isResultTitle('Ogłoszenie o przetargu'),
    false
  );
});

test('parsePlDate and parsePrice handle formats', () => {
  assert.equal(parsePlDate('04 września 2026 r.'), '2026-09-04');
  assert.equal(parsePlDate('14.10.2026'), '2026-10-14');
  assert.equal(parsePlDate('2026-09-04'), '2026-09-04');
  assert.equal(parsePrice('115 000,00 zł'), 115000);
  assert.equal(parsePrice('18.200 zł'), 18200);
  assert.equal(parsePrice('210000 PLN'), 210000);
});

test('parseAnnouncement extracts auction details from Włodawa notice', () => {
  const item = {
    id_dokumentu: '2350888',
    id_menu: '99',
    data_utworzenia: '2026-09-04',
    tresc: 'Ogłoszenie drugiego przetargu ustnego nieograniczonego na sprzedaż lokalu mieszkalnego',
    url: 'https://umwlodawa.bip.lubelskie.pl/index.php?id=99&action=details&document_id=2350888',
  };
  const docText = `
    BURMISTRZ WŁODAWY
    ogłasza drugi przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 25
    położonego w budynku przy ul. Żeromskiego 20 we Włodawie.
    Lokal o powierzchni użytkowej 37,20 m2.
    Działka ewidencyjna nr 145/8.
    Cena wywoławcza: 125 000,00 zł. Wadium wynosi 12 500,00 zł.
    Przetarg odbędzie się w dniu 14 października 2026 r. o godz. 10:00.
    Księga wieczysta nr LU1W/00021345/6.
  `;

  const notice = parseAnnouncement(item, docText);
  assert.equal(notice.id, 'wlodawa-2350888');
  assert.equal(notice.source_id, '2350888');
  assert.equal(notice.auction_date, '2026-10-14');
  assert.equal(notice.price, 125000);
  assert.equal(notice.deposit, 12500);
  assert.equal(notice.parcel, '145/8');
  assert.equal(notice.area, 37.2);
  assert.equal(notice.land_registry, 'LU1W/00021345/6');
  assert.equal(notice.property_type, 'mieszkalny');
});

test('parseResultDoc extracts achieved price and buyer', () => {
  const item = {
    id_dokumentu: '2368838',
    id_menu: '99',
    data_utworzenia: '2026-10-15',
    tresc: 'Informacja o wyniku przetargu ustnego nieograniczonego z dnia 14.10.2026 r.',
  };
  const docText = `
    INFORMACJA O WYNIKU PRZETARGU
    W dniu 14 października 2026 r. we Włodawie przeprowadzono drugi przetarg na sprzedaż lokalu przy ul. Żeromskiego 20/25, działka 145/8.
    Cena wywoławcza wynosiła: 125 000,00 zł.
    Najwyższa cena osiągnięta w przetargu: 132 000,00 zł.
    Nabywcą nieruchomości została: Maria Wiśniewska.
    Liczba osób dopuszczonych do przetargu: 2.
  `;

  const result = parseResultDoc(item, docText);
  assert.equal(result.id, 'wlodawa-result-2368838');
  assert.equal(result.status, 'positive');
  assert.equal(result.price_achieved, 132000);
  assert.equal(result.parcel, '145/8');
  assert.equal(result.buyer, 'Maria Wiśniewska');
  assert.equal(result.bidders_count, 2);
});
