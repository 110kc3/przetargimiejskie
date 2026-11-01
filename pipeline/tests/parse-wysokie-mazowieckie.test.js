import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAnnouncementTitle,
  isResultTitle,
  parsePlDate,
  parsePrice,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/wysokie-mazowieckie/parse.js';

test('isAnnouncementTitle and isResultTitle correctly distinguish notices', () => {
  assert.equal(
    isAnnouncementTitle('Przetarg ustny nieograniczony na sprzedaż nieruchomości gruntowych w Wysokiem Mazowieckiem'),
    true
  );
  assert.equal(
    isAnnouncementTitle('Ogłoszenie o przetargu na zbycie nieruchomości'),
    true
  );
  assert.equal(
    isAnnouncementTitle('Informacja o wyniku przetargu ustnego nieograniczonego'),
    false
  );
  assert.equal(
    isResultTitle('Informacja o wyniku przeprowadzonego w dniu 17.09.2026 r. przetargu ustnego nieograniczonego'),
    true
  );
  assert.equal(
    isResultTitle('Wynik postępowania przetargowego'),
    true
  );
  assert.equal(
    isResultTitle('Ogłoszenie o przetargu'),
    false
  );
});

test('parsePlDate and parsePrice handle formats', () => {
  assert.equal(parsePlDate('17 września 2026 r.'), '2026-09-17');
  assert.equal(parsePlDate('17.09.2026'), '2026-09-17');
  assert.equal(parsePlDate('2026-09-17'), '2026-09-17');
  assert.equal(parsePrice('350 000,00 zł'), 350000);
  assert.equal(parsePrice('45.000 zł'), 45000);
  assert.equal(parsePrice('520000 PLN'), 520000);
});

test('parseAnnouncement extracts auction details from Wysokie Mazowieckie notice', () => {
  const item = {
    id: 'przetarg-ustny-nieograniczony-warszawska',
    url: 'https://bip-umwysokiemaz.podlaskie.eu/ogloszenia/inne/przetarg-warszawska.html',
    title: 'Przetarg ustny nieograniczony na sprzedaż nieruchomości przy ul. Warszawskiej',
    date: '2026-08-15',
  };
  const docText = `
    BURMISTRZ MIASTA WYSOKIE MAZOWIECKIE
    ogłasza I przetarg ustny nieograniczony na sprzedaż nieruchomości gruntowej niezabudowanej,
    położonej w Wysokiem Mazowieckiem przy ul. Warszawskiej.
    Oznaczonej jako działka nr 2438/4 o powierzchni 8982 m2.
    Cena wywoławcza: 320 000,00 zł.
    Przetarg odbędzie się w dniu 17 września 2026 r. o godz. 11:00.
    Księga wieczysta nr LM1W/00019842/5.
  `;

  const notice = parseAnnouncement(item, docText);
  assert.equal(notice.id, 'wysokie-mazowieckie-przetarg-ustny-nieograniczony-warszawska');
  assert.equal(notice.auctionDate, '2026-09-17');
  assert.equal(notice.price, 320000);
  assert.equal(notice.parcel, '2438/4');
  assert.equal(notice.area, 8982);
  assert.equal(notice.kw, 'LM1W/00019842/5');
  assert.equal(notice.kind, 'grunt');
});

test('parseResultDoc extracts achieved price and buyer', () => {
  const item = {
    id: 'ogloszenie-o-wyniku',
    url: 'https://bip-umwysokiemaz.podlaskie.eu/ogloszenia/inne/ogloszenie-o-wyniku.html',
    title: 'Informacja o wyniku przeprowadzonego w dniu 17.09.2026 r. przetargu ustnego nieograniczonego dot. sprzedaży nieruchomości',
  };
  const docText = `
    INFORMACJA O WYNIKU PRZETARGU
    W dniu 17.09.2026 r. w Urzędzie Miasta Wysokie Mazowieckie przeprowadzono przetarg ustny nieograniczony na sprzedaż działki nr 2438/4.
    Cena wywoławcza: 320 000,00 zł.
    Najwyższa cena osiągnięta w przetargu: 345 000,00 zł.
    Nabywcą nieruchomości został ustalony: Tomasz Dąbrowski.
  `;

  const result = parseResultDoc(item, docText);
  assert.equal(result.id, 'wysokie-mazowieckie-result-ogloszenie-o-wyniku');
  assert.equal(result.status, 'completed');
  assert.equal(result.price, 345000);
  assert.equal(result.parcel, '2438/4');
  assert.equal(result.buyer, 'Tomasz Dąbrowski');
});
