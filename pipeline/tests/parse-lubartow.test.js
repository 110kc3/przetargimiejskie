import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAnnouncementTitle,
  isResultTitle,
  parsePlDate,
  parsePrice,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/lubartow/parse.js';

test('isAnnouncementTitle and isResultTitle correctly distinguish notices', () => {
  assert.equal(
    isAnnouncementTitle('Ogłoszenie Burmistrza Miasta Lubartów o przetargu ustnym na sprzedaż nieruchomości'),
    true
  );
  assert.equal(
    isAnnouncementTitle('Przetarg na sprzedaż lokalu mieszkalnego w Lubartowie'),
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
  assert.equal(parsePlDate('24 października 2026 r.'), '2026-10-24');
  assert.equal(parsePlDate('12.11.2026'), '2026-11-12');
  assert.equal(parsePlDate('2026-10-24'), '2026-10-24');
  assert.equal(parsePrice('140 000,00 zł'), 140000);
  assert.equal(parsePrice('21.500 zł'), 21500);
  assert.equal(parsePrice('280000 PLN'), 280000);
});

test('parseAnnouncement extracts auction details from Lubartów notice', () => {
  const item = {
    id_dokumentu: '2367290',
    id_menu: '96',
    data_utworzenia: '2026-10-15',
    tresc: 'Ogłoszenie Burmistrza Miasta Lubartów o przetargu ustnym na sprzedaż nieruchomości',
    url: 'https://umlubartow.bip.lubelskie.pl/index.php?id=96&action=details&document_id=2367290',
  };
  const docText = `
    BURMISTRZ MIASTA LUBARTÓW
    ogłasza I przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 6
    położonego w budynku przy ul. Cmentarnej 8 w Lubartowie.
    Lokal o powierzchni użytkowej 52,40 m2.
    Działka nr 789/2.
    Cena wywoławcza: 165 000,00 zł. Wadium wynosi 16 500,00 zł.
    Przetarg odbędzie się w dniu 24 października 2026 r. o godz. 11:00.
    Księga wieczysta nr LU1A/00034125/8.
  `;

  const notice = parseAnnouncement(item, docText);
  assert.equal(notice.id, 'lubartow-2367290');
  assert.equal(notice.source_id, '2367290');
  assert.equal(notice.auction_date, '2026-10-24');
  assert.equal(notice.price, 165000);
  assert.equal(notice.deposit, 16500);
  assert.equal(notice.parcel, '789/2');
  assert.equal(notice.area, 52.4);
  assert.equal(notice.land_registry, 'LU1A/00034125/8');
  assert.equal(notice.property_type, 'mieszkalny');
});

test('parseResultDoc extracts achieved price and buyer', () => {
  const item = {
    id_dokumentu: '2367500',
    id_menu: '96',
    data_utworzenia: '2026-10-25',
    tresc: 'Informacja o wyniku przetargu ustnego nieograniczonego na sprzedaż nieruchomości',
  };
  const docText = `
    INFORMACJA O WYNIKU PRZETARGU
    W dniu 24 października 2026 r. przeprowadzono przetarg na sprzedaż lokalu przy ul. Cmentarnej 8/6, działka 789/2.
    Cena wywoławcza wynosiła: 165 000,00 zł.
    Najwyższa cena osiągnięta w przetargu: 172 000,00 zł.
    Nabywcą nieruchomości została: Katarzyna Wójcik.
    Liczba osób dopuszczonych do przetargu: 2.
  `;

  const result = parseResultDoc(item, docText);
  assert.equal(result.id, 'lubartow-result-2367500');
  assert.equal(result.status, 'positive');
  assert.equal(result.price_achieved, 172000);
  assert.equal(result.parcel, '789/2');
  assert.equal(result.buyer, 'Katarzyna Wójcik');
  assert.equal(result.bidders_count, 2);
});
