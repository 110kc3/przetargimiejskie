import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAnnouncementTitle,
  isResultTitle,
  parsePlDate,
  parsePrice,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/krotoszyn/parse.js';

test('isAnnouncementTitle and isResultTitle correctly distinguish notices', () => {
  assert.equal(
    isAnnouncementTitle('Ogłoszenie o trzecim przetargu ustnym nieograniczonym na sprzedaż lokalu mieszkalnego'),
    true
  );
  assert.equal(
    isAnnouncementTitle('Przetarg ustny nieograniczony na sprzedaż nieruchomości gruntowej'),
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
  assert.equal(parsePlDate('27 października 2026 r.'), '2026-10-27');
  assert.equal(parsePlDate('03.11.2026'), '2026-11-03');
  assert.equal(parsePlDate('2026-10-27 08:49:11'), '2026-10-27');
  assert.equal(parsePrice('125 000,00 zł'), 125000);
  assert.equal(parsePrice('18.500 zł'), 18500);
  assert.equal(parsePrice('290000 PLN'), 290000);
});

test('parseAnnouncement extracts auction details from MADKOM article', () => {
  const article = {
    id: '110437',
    link: 'a,110437,ogloszenie-o-trzecim-przetargu.html',
    title: 'Ogłoszenie o trzecim przetargu ustnym nieograniczonym na sprzedaż lokalu mieszkalnego położonego w Orpiszewie, dz. nr 53/1',
    date: '2026-10-27',
  };
  const html = `
    <h1>Ogłoszenie o przetargu</h1>
    <p>Burmistrz Krotoszyna ogłasza trzeci przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego położonego w miejscowości Orpiszew 12, gmina Krotoszyn.</p>
    <p>Przetarg odbędzie się w dniu 25 listopada 2026 roku o godz. 10:00.</p>
    <p>Działka nr: 53/1 o powierzchni 62,30 m2.</p>
    <p>Cena wywoławcza: 110 000,00 zł. Wadium wynosi 11 000,00 zł.</p>
    <p>Księga wieczysta: KZ1R/00028451/2.</p>
  `;

  const notice = parseAnnouncement(article, html);
  assert.equal(notice.id, 'krotoszyn-110437');
  assert.equal(notice.source_id, '110437');
  assert.equal(notice.auction_date, '2026-11-25');
  assert.equal(notice.price, 110000);
  assert.equal(notice.deposit, 11000);
  assert.equal(notice.parcel, '53/1');
  assert.equal(notice.area, 62.3);
  assert.equal(notice.land_registry, 'KZ1R/00028451/2');
  assert.equal(notice.property_type, 'mieszkalny');
});

test('parseResultDoc extracts achieved price and buyer', () => {
  const article = {
    id: '110500',
    link: 'a,110500,wynik.html',
    title: 'Wynik przetargu ustnego nieograniczonego na sprzedaż nieruchomości',
  };
  const html = `
    <h1>Informacja o wyniku przetargu</h1>
    <p>W dniu 25 listopada 2026 r. przeprowadzono przetarg na sprzedaż lokalu mieszkalnego w Orpiszewie, działka 53/1.</p>
    <p>Cena wywoławcza: 110 000,00 zł.</p>
    <p>Najwyższa cena osiągnięta w przetargu: 115 000,00 zł.</p>
    <p>Nabywcą nieruchomości został ustalony: Michał Wiśniewski.</p>
    <p>Liczba osób dopuszczonych: 2.</p>
  `;

  const result = parseResultDoc(article, html);
  assert.equal(result.id, 'krotoszyn-result-110500');
  assert.equal(result.status, 'positive');
  assert.equal(result.price_achieved, 115000);
  assert.equal(result.parcel, '53/1');
  assert.equal(result.buyer, 'Michał Wiśniewski');
  assert.equal(result.bidders_count, 2);
});
