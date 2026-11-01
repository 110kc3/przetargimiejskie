import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAnnouncementTitle,
  isResultTitle,
  parsePlDate,
  parsePrice,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/miechow/parse.js';

test('isAnnouncementTitle and isResultTitle correctly distinguish notices', () => {
  assert.equal(
    isAnnouncementTitle('Przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego w Miechowie'),
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
    id: '2095850',
    link: 'a,2095850,przetarg-ustny.html',
    title: 'Przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego przy ul. Kopernika 12',
    date: '2026-10-01',
  };
  const html = `
    <h1>Ogłoszenie o przetargu</h1>
    <p>Burmistrz Gminy i Miasta Miechów ogłasza przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 2 przy ul. Kopernika 12 w Miechowie.</p>
    <p>Przetarg odbędzie się w dniu 18 listopada 2026 roku o godz. 11:00.</p>
    <p>Działka nr: 312/4 o powierzchni 48,50 m2.</p>
    <p>Cena wywoławcza: 165 000,00 zł. Wadium wynosi 16 500,00 zł.</p>
    <p>Księga wieczysta: KR1M/00030500/6.</p>
  `;

  const notice = parseAnnouncement(article, html);
  assert.equal(notice.id, 'miechow-2095850');
  assert.equal(notice.source_id, '2095850');
  assert.equal(notice.auction_date, '2026-11-18');
  assert.equal(notice.price, 165000);
  assert.equal(notice.deposit, 16500);
  assert.equal(notice.parcel, '312/4');
  assert.equal(notice.area, 48.5);
  assert.equal(notice.land_registry, 'KR1M/00030500/6');
  assert.equal(notice.property_type, 'mieszkalny');
});

test('parseResultDoc extracts achieved price and buyer', () => {
  const article = {
    id: '2096000',
    link: 'a,2096000,wynik.html',
    title: 'Wynik przetargu ustnego nieograniczonego na sprzedaż nieruchomości',
  };
  const html = `
    <h1>Informacja o wyniku przetargu</h1>
    <p>W dniu 18 listopada 2026 r. przeprowadzono przetarg na sprzedaż nieruchomości przy ul. Kopernika 12 w Miechowie, działka 312/4.</p>
    <p>Cena wywoławcza: 165 000,00 zł.</p>
    <p>Najwyższa cena osiągnięta w przetargu: 172 000,00 zł.</p>
    <p>Nabywcą nieruchomości został ustalony: Jan Kowalski.</p>
    <p>Liczba osób dopuszczonych: 2.</p>
  `;

  const result = parseResultDoc(article, html);
  assert.equal(result.id, 'miechow-result-2096000');
  assert.equal(result.status, 'positive');
  assert.equal(result.price_achieved, 172000);
  assert.equal(result.parcel, '312/4');
  assert.equal(result.buyer, 'Jan Kowalski');
  assert.equal(result.bidders_count, 2);
});
