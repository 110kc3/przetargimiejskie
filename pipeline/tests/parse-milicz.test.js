import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAnnouncementTitle,
  isResultTitle,
  parsePlDate,
  parsePrice,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/milicz/parse.js';

test('isAnnouncementTitle and isResultTitle correctly distinguish notices', () => {
  assert.equal(
    isAnnouncementTitle('Przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego Rynek 30/4'),
    true
  );
  assert.equal(
    isAnnouncementTitle('Ogłoszenie o I przetargu na sprzedaż nieruchomości gruntowej'),
    true
  );
  assert.equal(
    isAnnouncementTitle('Wynik I publicznego przetargu ustnego nieograniczonego'),
    false
  );
  assert.equal(
    isResultTitle('Wynik I publicznego przetargu ustnego nieograniczonego na sprzedaż nieruchomości'),
    true
  );
  assert.equal(
    isResultTitle('Informacja o wyniku przetargu ustnego'),
    true
  );
  assert.equal(
    isResultTitle('Przetarg na sprzedaż lokalu'),
    false
  );
});

test('parsePlDate and parsePrice handle formats', () => {
  assert.equal(parsePlDate('15 września 2026 r.'), '2026-09-15');
  assert.equal(parsePlDate('04.09.2026'), '2026-09-04');
  assert.equal(parsePlDate('2026-09-04 09:04:45'), '2026-09-04');
  assert.equal(parsePrice('145 000,00 zł'), 145000);
  assert.equal(parsePrice('12.500 zł'), 12500);
  assert.equal(parsePrice('350000 PLN'), 350000);
});

test('parseAnnouncement extracts auction details from MADKOM article', () => {
  const article = {
    id: '30020',
    link: 'a,30020,przetarg-ustny.html',
    title: 'Przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego Rynek 30 lok. 4',
    date: '2026-08-10',
  };
  const html = `
    <h1>Ogłoszenie o przetargu</h1>
    <p>Burmistrz Gminy Milicz ogłasza przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 4 przy ul. Rynek 30 w Miliczu.</p>
    <p>Przetarg odbędzie się w dniu 15 września 2026 roku o godz. 10:00.</p>
    <p>Działka nr: 47/1 o powierzchni 18,3 m2.</p>
    <p>Cena wywoławcza: 120 000,00 zł. Wadium wynosi 12 000,00 zł.</p>
    <p>Księga wieczysta: WR1M/00024512/3.</p>
  `;

  const notice = parseAnnouncement(article, html);
  assert.equal(notice.id, 'milicz-30020');
  assert.equal(notice.source_id, '30020');
  assert.equal(notice.auction_date, '2026-09-15');
  assert.equal(notice.price, 120000);
  assert.equal(notice.deposit, 12000);
  assert.equal(notice.parcel, '47/1');
  assert.equal(notice.area, 18.3);
  assert.equal(notice.land_registry, 'WR1M/00024512/3');
  assert.equal(notice.property_type, 'mieszkalny');
});

test('parseResultDoc extracts achieved price and buyer', () => {
  const article = {
    id: '33553',
    link: 'a,33553,wynik.html',
    title: 'Wynik I publicznego przetargu ustnego nieograniczonego na sprzedaż nieruchomości',
  };
  const html = `
    <h1>Informacja o wyniku przetargu</h1>
    <p>W dniu 04 września 2026 r. przeprowadzono przetarg na sprzedaż nieruchomości przy ul. Kolejowa 5 w Miliczu, działka 35/140.</p>
    <p>Cena wywoławcza: 95 000,00 zł.</p>
    <p>Najwyższa cena osiągnięta w przetargu: 104 500,00 zł.</p>
    <p>Nabywcą nieruchomości została: Jan Kowalski i Anna Kowalska.</p>
    <p>Liczba osób dopuszczonych: 2.</p>
  `;

  const result = parseResultDoc(article, html);
  assert.equal(result.id, 'milicz-result-33553');
  assert.equal(result.status, 'positive');
  assert.equal(result.price_achieved, 104500);
  assert.equal(result.parcel, '35/140');
  assert.equal(result.buyer, 'Jan Kowalski i Anna Kowalska');
  assert.equal(result.bidders_count, 2);
});
