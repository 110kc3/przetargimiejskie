import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAnnouncementTitle,
  isResultTitle,
  parsePlDate,
  parsePrice,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/sokolka/parse.js';

test('isAnnouncementTitle and isResultTitle correctly distinguish notices', () => {
  assert.equal(
    isAnnouncementTitle('GR.K.6840.11.2026.JS - przetarg ustny nieograniczony na sprzedaż działki'),
    true
  );
  assert.equal(
    isAnnouncementTitle('Przetarg na zbycie nieruchomości w Sokółce'),
    true
  );
  assert.equal(
    isAnnouncementTitle('Informacja o wyniku przetargu ustnego nieograniczonego'),
    false
  );
  assert.equal(
    isResultTitle('Informacja o wyniku przetargu na sprzedaż nieruchomości'),
    true
  );
  assert.equal(
    isResultTitle('GR.K.6840.11.2026.JS-wynik'),
    true
  );
  assert.equal(
    isResultTitle('Ogłoszenie o przetargu'),
    false
  );
});

test('parsePlDate and parsePrice handle formats', () => {
  assert.equal(parsePlDate('18 listopada 2026 r.'), '2026-11-18');
  assert.equal(parsePlDate('05.12.2026'), '2026-12-05');
  assert.equal(parsePlDate('2026-11-18'), '2026-11-18');
  assert.equal(parsePrice('95 000,00 zł'), 95000);
  assert.equal(parsePrice('19.900 zł'), 19900);
  assert.equal(parsePrice('310000 PLN'), 310000);
});

test('parseAnnouncement extracts auction details from Sokółka notice', () => {
  const item = {
    id: 'grk6840112026js',
    url: 'https://bip-umsokolka.podlaskie.eu/przet_zam/47cac52c6f2e811/2026/grk6840112026js.html',
    title: 'GR.K.6840.11.2026.JS',
    date: '2026-10-10',
  };
  const docText = `
    BURMISTRZ SOKÓŁKI
    ogłasza I przetarg ustny nieograniczony na sprzedaż nieruchomości gruntowej
    położonej w Sokółce przy ul. Kolejowej.
    Działka nr 156/4 o powierzchni 1200 m2.
    Cena wywoławcza: 110 000,00 zł.
    Przetarg odbędzie się w dniu 18 listopada 2026 r. o godz. 11:00.
    Księga wieczysta nr BI1S/00028712/9.
  `;

  const notice = parseAnnouncement(item, docText);
  assert.equal(notice.id, 'sokolka-grk6840112026js');
  assert.equal(notice.auctionDate, '2026-11-18');
  assert.equal(notice.price, 110000);
  assert.equal(notice.parcel, '156/4');
  assert.equal(notice.area, 1200);
  assert.equal(notice.kw, 'BI1S/00028712/9');
  assert.equal(notice.kind, 'grunt');
});

test('parseResultDoc extracts achieved price and buyer', () => {
  const item = {
    id: 'grk6840112026js-wynik',
    url: 'https://bip-umsokolka.podlaskie.eu/przet_zam/47cac52c6f2e811/2026/grk6840112026js.html',
    title: 'GR.K.6840.11.2026.JS-wynik',
  };
  const docText = `
    INFORMACJA O WYNIKU PRZETARGU
    W dniu 18 listopada 2026 r. w Urzędzie Miejskim w Sokółce przeprowadzono przetarg na sprzedaż działki nr 156/4.
    Cena wywoławcza: 110 000,00 zł.
    Najwyższa cena osiągnięta w przetargu: 118 000,00 zł.
    Nabywcą nieruchomości został ustalony: Krzysztof Kamiński.
  `;

  const result = parseResultDoc(item, docText);
  assert.equal(result.id, 'sokolka-result-grk6840112026js-wynik');
  assert.equal(result.status, 'completed');
  assert.equal(result.price, 118000);
  assert.equal(result.parcel, '156/4');
  assert.equal(result.buyer, 'Krzysztof Kamiński');
});
