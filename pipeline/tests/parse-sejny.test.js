import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAnnouncementTitle,
  isResultTitle,
  parsePlDate,
  parsePrice,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/sejny/parse.js';

test('isAnnouncementTitle and isResultTitle correctly distinguish notices', () => {
  assert.equal(
    isAnnouncementTitle('Burmistrz Miasta Sejny ogłasza I przetarg ustny nieograniczony na sprzedaż'),
    true
  );
  assert.equal(
    isAnnouncementTitle('Przetarg na zbycie nieruchomości w Sejnach'),
    true
  );
  assert.equal(
    isAnnouncementTitle('Informacja o wyniku przetargu ustnego nieograniczonego'),
    false
  );
  assert.equal(
    isResultTitle('Informacja o wyniku przetargu'),
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
  assert.equal(parsePlDate('26 października 2026 r.'), '2026-10-26');
  assert.equal(parsePlDate('15.11.2026'), '2026-11-15');
  assert.equal(parsePlDate('2026-10-26'), '2026-10-26');
  assert.equal(parsePrice('75 000,00 zł'), 75000);
  assert.equal(parsePrice('16.800 zł'), 16800);
  assert.equal(parsePrice('195000 PLN'), 195000);
});

test('parseAnnouncement extracts auction details from Sejny notice', () => {
  const item = {
    id: 'burmistrz-miasta-sejny-oglasza-przetarg-96530',
    url: 'https://bip-umsejny.podlaskie.eu/gospodarka_nieruchomociami/burmistrz-miasta-sejny-oglasza-przetarg-96530.html',
    title: 'Burmistrz Miasta Sejny ogłasza I przetarg ustny nieograniczony na sprzedaż nieruchomości',
    date: '2026-09-15',
  };
  const docText = `
    BURMISTRZ MIASTA SEJNY
    ogłasza I przetarg ustny nieograniczony na sprzedaż nieruchomości gruntowej
    stanowiącej własność Miasta Sejny składającej się z działki o numerze ewidencyjnym: 466 o powierzchni 850 m2
    położonej w Sejnach przy ul. Zawadzkiego.
    Cena wywoławcza: 68 000,00 zł.
    Przetarg odbędzie się w dniu 26 października 2026 r. o godz. 10:00.
    Księga wieczysta nr SU1N/00015421/3.
  `;

  const notice = parseAnnouncement(item, docText);
  assert.equal(notice.id, 'sejny-burmistrz-miasta-sejny-oglasza-przetarg-96530');
  assert.equal(notice.auctionDate, '2026-10-26');
  assert.equal(notice.price, 68000);
  assert.equal(notice.parcel, '466');
  assert.equal(notice.area, 850);
  assert.equal(notice.kw, 'SU1N/00015421/3');
  assert.equal(notice.kind, 'grunt');
});

test('parseResultDoc extracts achieved price and buyer', () => {
  const item = {
    id: 'informacja-o-wyniku-przetargu-17112027',
    url: 'https://bip-umsejny.podlaskie.eu/gospodarka_nieruchomociami/informacja-o-wyniku-przetargu.html',
    title: 'Informacja o wyniku przetargu',
  };
  const docText = `
    INFORMACJA O WYNIKU PRZETARGU
    W dniu 26 października 2026 r. w Sejnach przeprowadzono przetarg na sprzedaż działki o numerze ewidencyjnym 466.
    Cena wywoławcza: 68 000,00 zł.
    Najwyższa cena osiągnięta w przetargu: 74 000,00 zł.
    Nabywcą nieruchomości został: Paweł Szymański.
  `;

  const result = parseResultDoc(item, docText);
  assert.equal(result.id, 'sejny-result-informacja-o-wyniku-przetargu-17112027');
  assert.equal(result.status, 'completed');
  assert.equal(result.price, 74000);
  assert.equal(result.parcel, '466');
  assert.equal(result.buyer, 'Paweł Szymański');
});
