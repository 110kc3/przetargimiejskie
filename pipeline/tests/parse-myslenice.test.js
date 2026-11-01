import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAnnouncementTitle,
  isResultTitle,
  parsePlDate,
  parsePrice,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/myslenice/parse.js';

test('isAnnouncementTitle and isResultTitle correctly distinguish notices', () => {
  assert.equal(
    isAnnouncementTitle('Przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego w Myślenicach'),
    true
  );
  assert.equal(
    isAnnouncementTitle('Ogłoszenie o I przetargu na sprzedaż nieruchomości gruntowej'),
    true
  );
  assert.equal(
    isAnnouncementTitle('Wynik I przetargu ustnego nieograniczonego'),
    false
  );
  assert.equal(
    isResultTitle('Wynik przetargu ustnego nieograniczonego na sprzedaż nieruchomości'),
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
  assert.equal(parsePlDate('08 listopada 2026 r.'), '2026-11-08');
  assert.equal(parsePlDate('15.11.2026'), '2026-11-15');
  assert.equal(parsePlDate('2026-11-08 10:15:00'), '2026-11-08');
  assert.equal(parsePrice('175 000,00 zł'), 175000);
  assert.equal(parsePrice('23.500 zł'), 23500);
  assert.equal(parsePrice('380000 PLN'), 380000);
});

test('parseAnnouncement extracts auction details from MADKOM article', () => {
  const article = {
    id: '258123',
    link: 'a,258123,przetarg-ustny.html',
    title: 'Przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego przy ul. Słowackiego 14',
    date: '2026-10-01',
  };
  const html = `
    <h1>Ogłoszenie o przetargu</h1>
    <p>Burmistrz Miasta i Gminy Myślenice ogłasza przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 3 przy ul. Słowackiego 14 w Myślenicach.</p>
    <p>Przetarg odbędzie się w dniu 08 listopada 2026 roku o godz. 11:00.</p>
    <p>Działka nr: 512/3 o powierzchni 54,20 m2.</p>
    <p>Cena wywoławcza: 185 000,00 zł. Wadium wynosi 18 500,00 zł.</p>
    <p>Księga wieczysta: KR1Y/00032154/8.</p>
  `;

  const notice = parseAnnouncement(article, html);
  assert.equal(notice.id, 'myslenice-258123');
  assert.equal(notice.source_id, '258123');
  assert.equal(notice.auction_date, '2026-11-08');
  assert.equal(notice.price, 185000);
  assert.equal(notice.deposit, 18500);
  assert.equal(notice.parcel, '512/3');
  assert.equal(notice.area, 54.2);
  assert.equal(notice.land_registry, 'KR1Y/00032154/8');
  assert.equal(notice.property_type, 'mieszkalny');
});

test('parseResultDoc extracts achieved price and buyer', () => {
  const article = {
    id: '258200',
    link: 'a,258200,wynik.html',
    title: 'Wynik przetargu ustnego nieograniczonego na sprzedaż nieruchomości',
  };
  const html = `
    <h1>Informacja o wyniku przetargu</h1>
    <p>W dniu 08 listopada 2026 r. przeprowadzono przetarg na sprzedaż nieruchomości przy ul. Słowackiego 14/3 w Myślenicach, działka 512/3.</p>
    <p>Cena wywoławcza: 185 000,00 zł.</p>
    <p>Najwyższa cena osiągnięta w przetargu: 196 000,00 zł.</p>
    <p>Nabywcą nieruchomości został ustalony: Grzegorz Nowak.</p>
    <p>Liczba osób dopuszczonych: 2.</p>
  `;

  const result = parseResultDoc(article, html);
  assert.equal(result.id, 'myslenice-result-258200');
  assert.equal(result.status, 'positive');
  assert.equal(result.price_achieved, 196000);
  assert.equal(result.parcel, '512/3');
  assert.equal(result.buyer, 'Grzegorz Nowak');
  assert.equal(result.bidders_count, 2);
});
