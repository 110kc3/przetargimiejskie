import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAnnouncementTitle,
  isResultTitle,
  parsePlDate,
  parsePrice,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/zamosc/parse.js';

test('isAnnouncementTitle and isResultTitle correctly distinguish notices', () => {
  assert.equal(
    isAnnouncementTitle('Ogłoszenie Prezydenta Miasta Zamość o pierwszym ustnym nieograniczonym przetargu'),
    true
  );
  assert.equal(
    isAnnouncementTitle('Przetarg na zbycie nieruchomości lokalowej w Zamościu'),
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
  assert.equal(parsePlDate('05 listopada 2026 r.'), '2026-11-05');
  assert.equal(parsePlDate('21.11.2026'), '2026-11-21');
  assert.equal(parsePlDate('2026-11-05'), '2026-11-05');
  assert.equal(parsePrice('210 000,00 zł'), 210000);
  assert.equal(parsePrice('32.000 zł'), 32000);
  assert.equal(parsePrice('450000 PLN'), 450000);
});

test('parseAnnouncement extracts auction details from Zamość notice', () => {
  const item = {
    id_dokumentu: '2366100',
    id_menu: '91',
    data_utworzenia: '2026-10-10',
    tresc: 'Ogłoszenie Prezydenta Miasta Zamość o pierwszym ustnym nieograniczonym przetargu',
    url: 'https://umzamosc.bip.lubelskie.pl/index.php?id=91&action=details&document_id=2366100',
  };
  const docText = `
    PREZYDENT MIASTA ZAMOŚĆ
    ogłasza I przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 4
    położonego w budynku przy ul. Partyzantów 12 w Zamościu.
    Lokal o powierzchni użytkowej 61,50 m2.
    Działka nr 210/4.
    Cena wywoławcza: 220 000,00 zł. Wadium wynosi 22 000,00 zł.
    Przetarg odbędzie się w dniu 05 listopada 2026 r. o godz. 11:00.
    Księga wieczysta nr ZA1Z/00049812/7.
  `;

  const notice = parseAnnouncement(item, docText);
  assert.equal(notice.id, 'zamosc-2366100');
  assert.equal(notice.source_id, '2366100');
  assert.equal(notice.auction_date, '2026-11-05');
  assert.equal(notice.price, 220000);
  assert.equal(notice.deposit, 22000);
  assert.equal(notice.parcel, '210/4');
  assert.equal(notice.area, 61.5);
  assert.equal(notice.land_registry, 'ZA1Z/00049812/7');
  assert.equal(notice.property_type, 'mieszkalny');
});

test('parseResultDoc extracts achieved price and buyer', () => {
  const item = {
    id_dokumentu: '2366300',
    id_menu: '91',
    data_utworzenia: '2026-11-06',
    tresc: 'Informacja o wyniku pierwszego przetargu ustnego nieograniczonego z dnia 05.11.2026 r.',
  };
  const docText = `
    INFORMACJA O WYNIKU PRZETARGU
    W dniu 05 listopada 2026 r. w Zamościu przeprowadzono przetarg na sprzedaż lokalu przy ul. Partyzantów 12/4, działka 210/4.
    Cena wywoławcza: 220 000,00 zł.
    Najwyższa cena osiągnięta w przetargu: 231 000,00 zł.
    Nabywcą nieruchomości został ustalony: Michał Lewandowski.
    Liczba osób dopuszczonych do przetargu: 3.
  `;

  const result = parseResultDoc(item, docText);
  assert.equal(result.id, 'zamosc-result-2366300');
  assert.equal(result.status, 'positive');
  assert.equal(result.price_achieved, 231000);
  assert.equal(result.parcel, '210/4');
  assert.equal(result.buyer, 'Michał Lewandowski');
  assert.equal(result.bidders_count, 3);
});
