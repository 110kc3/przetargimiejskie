import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAnnouncementTitle,
  isResultTitle,
  parsePlDate,
  parsePrice,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/parczew/parse.js';

test('isAnnouncementTitle and isResultTitle correctly distinguish notices', () => {
  assert.equal(
    isAnnouncementTitle('Ogłoszenie Burmistrza Parczewa o przetargu ustnym na sprzedaż nieruchomości'),
    true
  );
  assert.equal(
    isAnnouncementTitle('Przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego'),
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
    isResultTitle('Wynik postępowania przetargowego na zbycie nieruchomości'),
    true
  );
  assert.equal(
    isResultTitle('Ogłoszenie o przetargu'),
    false
  );
});

test('parsePlDate and parsePrice handle formats', () => {
  assert.equal(parsePlDate('28 listopada 2025 r.'), '2025-11-28');
  assert.equal(parsePlDate('15.12.2025'), '2025-12-15');
  assert.equal(parsePlDate('2025-11-18'), '2025-11-18');
  assert.equal(parsePrice('98 000,00 zł'), 98000);
  assert.equal(parsePrice('15.500 zł'), 15500);
  assert.equal(parsePrice('250000 PLN'), 250000);
});

test('parseAnnouncement extracts auction details from Parczew notice', () => {
  const item = {
    id_dokumentu: '2233723',
    id_menu: '413',
    data_utworzenia: '2025-11-18',
    tresc: 'Ogłoszenie Burmistrza Parczewa o przetargu ustnym na sprzedaż nieruchomości',
    url: 'https://umparczew.bip.lubelskie.pl/index.php?id=413&action=details&document_id=2233723',
  };
  const docText = `
    BURMISTRZ PARCZEWA
    ogłasza I przetarg ustny nieograniczony na sprzedaż nieruchomości lokalowej
    stanowiącej lokal mieszkalny nr 2 położony w budynku przy ul. Kościelna 14 w Parczewie.
    Lokal o powierzchni użytkowej 48,50 m2.
    Działka ewidencyjna nr 1234/5.
    Cena wywoławcza: 135 000,00 zł. Wadium wynosi 13 500,00 zł.
    Przetarg odbędzie się w dniu 18 grudnia 2025 r. o godz. 11:00.
    Księga wieczysta nr LU1R/00045612/1.
  `;

  const notice = parseAnnouncement(item, docText);
  assert.equal(notice.id, 'parczew-2233723');
  assert.equal(notice.source_id, '2233723');
  assert.equal(notice.auction_date, '2025-12-18');
  assert.equal(notice.price, 135000);
  assert.equal(notice.deposit, 13500);
  assert.equal(notice.parcel, '1234/5');
  assert.equal(notice.area, 48.5);
  assert.equal(notice.land_registry, 'LU1R/00045612/1');
  assert.equal(notice.property_type, 'mieszkalny');
});

test('parseResultDoc extracts achieved price and buyer', () => {
  const item = {
    id_dokumentu: '2234000',
    id_menu: '413',
    data_utworzenia: '2025-12-20',
    tresc: 'Informacja o wyniku przetargu ustnego nieograniczonego na sprzedaż nieruchomości',
  };
  const docText = `
    INFORMACJA O WYNIKU PRZETARGU
    W dniu 18 grudnia 2025 r. przeprowadzono przetarg na sprzedaż działki nr 890/2 położonej przy ul. Polna w Parczewie.
    Cena wywoławcza wynosiła: 75 000,00 zł.
    Najwyższa cena osiągnięta w przetargu: 82 000,00 zł.
    Nabywcą nieruchomości został ustalony: Jan Nowak.
    Liczba osób dopuszczonych do przetargu: 3.
  `;

  const result = parseResultDoc(item, docText);
  assert.equal(result.id, 'parczew-result-2234000');
  assert.equal(result.status, 'positive');
  assert.equal(result.price_achieved, 82000);
  assert.equal(result.parcel, '890/2');
  assert.equal(result.buyer, 'Jan Nowak');
  assert.equal(result.bidders_count, 3);
});
