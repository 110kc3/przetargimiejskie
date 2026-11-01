import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAnnouncementTitle,
  isResultTitle,
  parsePlDate,
  parsePrice,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/siemiatycze/parse.js';

test('isAnnouncementTitle and isResultTitle correctly distinguish notices', () => {
  assert.equal(
    isAnnouncementTitle('Ogłoszenie o przetargu ustnym na sprzedaż nieruchomości gruntowej'),
    true
  );
  assert.equal(
    isAnnouncementTitle('Przetarg na zbycie nieruchomości lokalowej'),
    true
  );
  assert.equal(
    isAnnouncementTitle('Informacja o wyniku przetargu na sprzedaż nieruchomości'),
    false
  );
  assert.equal(
    isResultTitle('Informacja o wyniku przetargu na sprzedaż nieruchomości niezabudowanej'),
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
  assert.equal(parsePlDate('22 października 2026 r.'), '2026-10-22');
  assert.equal(parsePlDate('10.11.2026'), '2026-11-10');
  assert.equal(parsePlDate('2026-10-22'), '2026-10-22');
  assert.equal(parsePrice('89 000,00 zł'), 89000);
  assert.equal(parsePrice('24.500 zł'), 24500);
  assert.equal(parsePrice('170000 PLN'), 170000);
});

test('parseAnnouncement extracts auction details from Siemiatycze notice', () => {
  const item = {
    id: 'zarzadzenie-nr-24426',
    url: 'https://bip-umsiemiatycze.podlaskie.eu/gospodarowanie-mieniem/zarzadzenie-nr-24426.html',
    title: 'Ogłoszenie o przetargu ustnym na sprzedaż nieruchomości przy ul. Wysokiej',
    date: '2026-09-10',
  };
  const docText = `
    BURMISTRZ MIASTA SIEMIATYCZE
    ogłasza I przetarg ustny nieograniczony na sprzedaż nieruchomości gruntowej
    położonej w Siemiatyczach w rejonie ul. Wysokiej.
    Oznaczonej jako działka nr 2309/22 o powierzchni 689 m2.
    Cena wywoławcza: 78 000,00 zł.
    Przetarg odbędzie się w dniu 22 października 2026 r. o godz. 10:00.
    Księga wieczysta: BI3P/00019283/4.
  `;

  const notice = parseAnnouncement(item, docText);
  assert.equal(notice.id, 'siemiatycze-zarzadzenie-nr-24426');
  assert.equal(notice.auctionDate, '2026-10-22');
  assert.equal(notice.price, 78000);
  assert.equal(notice.parcel, '2309/22');
  assert.equal(notice.area, 689);
  assert.equal(notice.kw, 'BI3P/00019283/4');
  assert.equal(notice.kind, 'grunt');
});

test('parseResultDoc extracts achieved price and buyer', () => {
  const item = {
    id: 'informacja-o-wyniku-przetargu-wysoka',
    url: 'https://bip-umsiemiatycze.podlaskie.eu/gospodarowanie-mieniem/informacja-o-wyniku-przetargu.html',
    title: 'Informacja o wyniku przetargu na sprzedaż nieruchomości w rejonie ul. Wysokiej',
  };
  const docText = `
    INFORMACJA O WYNIKU PRZETARGU
    W dniu 22 października 2026 r. przeprowadzono przetarg ustny nieograniczony na sprzedaż działki nr 2309/22.
    Cena wywoławcza wynosiła: 78 000,00 zł.
    Najwyższa cena osiągnięta w przetargu: 85 500,00 zł.
    Nabywcą nieruchomości został ustalony: Adam Zieliński.
  `;

  const result = parseResultDoc(item, docText);
  assert.equal(result.id, 'siemiatycze-result-informacja-o-wyniku-przetargu-wysoka');
  assert.equal(result.status, 'completed');
  assert.equal(result.price, 85500);
  assert.equal(result.parcel, '2309/22');
  assert.equal(result.buyer, 'Adam Zieliński');
});
