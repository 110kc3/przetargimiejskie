import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAnnouncementTitle,
  isResultTitle,
  parsePlDate,
  parsePrice,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/swidnik/parse.js';

test('isAnnouncementTitle and isResultTitle correctly distinguish notices', () => {
  assert.equal(
    isAnnouncementTitle('Ogłoszenie Burmistrza Miasta Świdnik o przetargu ustnym na sprzedaż nieruchomości'),
    true
  );
  assert.equal(
    isAnnouncementTitle('Przetarg na zbycie nieruchomości lokalowej w Świdniku'),
    true
  );
  assert.equal(
    isAnnouncementTitle('Informacja o wyniku przetargu ustnego nieograniczonego'),
    false
  );
  assert.equal(
    isResultTitle('Informacja o wyniku drugiego przetargu ustnego nieograniczonego'),
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
  assert.equal(parsePlDate('28 października 2026 r.'), '2026-10-28');
  assert.equal(parsePlDate('14.11.2026'), '2026-11-14');
  assert.equal(parsePlDate('2026-10-28'), '2026-10-28');
  assert.equal(parsePrice('180 000,00 zł'), 180000);
  assert.equal(parsePrice('28.500 zł'), 28500);
  assert.equal(parsePrice('320000 PLN'), 320000);
});

test('parseAnnouncement extracts auction details from Świdnik notice', () => {
  const item = {
    id_dokumentu: '2368100',
    id_menu: '372',
    data_utworzenia: '2026-10-18',
    tresc: 'Ogłoszenie Burmistrza Miasta Świdnik o przetargu ustnym na sprzedaż nieruchomości',
    url: 'https://umswidnik.bip.lubelskie.pl/index.php?id=372&action=details&document_id=2368100',
  };
  const docText = `
    BURMISTRZ MIASTA ŚWIDNIK
    ogłasza II przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 12
    położonego w budynku przy ul. Niepodległości 15 w Świdniku.
    Lokal o powierzchni użytkowej 49,80 m2.
    Działka nr 450/3.
    Cena wywoławcza: 195 000,00 zł. Wadium wynosi 19 500,00 zł.
    Przetarg odbędzie się w dniu 28 października 2026 r. o godz. 10:00.
    Księga wieczysta nr LU1I/00041289/3.
  `;

  const notice = parseAnnouncement(item, docText);
  assert.equal(notice.id, 'swidnik-2368100');
  assert.equal(notice.source_id, '2368100');
  assert.equal(notice.auction_date, '2026-10-28');
  assert.equal(notice.price, 195000);
  assert.equal(notice.deposit, 19500);
  assert.equal(notice.parcel, '450/3');
  assert.equal(notice.area, 49.8);
  assert.equal(notice.land_registry, 'LU1I/00041289/3');
  assert.equal(notice.property_type, 'mieszkalny');
});

test('parseResultDoc extracts achieved price and buyer', () => {
  const item = {
    id_dokumentu: '2368250',
    id_menu: '372',
    data_utworzenia: '2026-10-29',
    tresc: 'Informacja o wyniku drugiego przetargu ustnego nieograniczonego z dnia 28.10.2026 r.',
  };
  const docText = `
    INFORMACJA O WYNIKU PRZETARGU
    W dniu 28 października 2026 r. w Świdniku przeprowadzono przetarg na sprzedaż lokalu przy ul. Niepodległości 15/12, działka 450/3.
    Cena wywoławcza: 195 000,00 zł.
    Najwyższa cena osiągnięta w przetargu: 204 000,00 zł.
    Nabywcą nieruchomości została: Joanna Lis.
    Liczba osób dopuszczonych do przetargu: 2.
  `;

  const result = parseResultDoc(item, docText);
  assert.equal(result.id, 'swidnik-result-2368250');
  assert.equal(result.status, 'positive');
  assert.equal(result.price_achieved, 204000);
  assert.equal(result.parcel, '450/3');
  assert.equal(result.buyer, 'Joanna Lis');
  assert.equal(result.bidders_count, 2);
});
