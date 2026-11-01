import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAnnouncementTitle,
  isResultTitle,
  parsePlDate,
  parsePrice,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/nowy-sacz/parse.js';

test('isAnnouncementTitle and isResultTitle correctly distinguish notices', () => {
  assert.equal(
    isAnnouncementTitle('Prezydent Miasta Nowego Sącza ogłasza I przetarg ustny nieograniczony (ul. Sienkiewicza)'),
    true
  );
  assert.equal(
    isAnnouncementTitle('Ogłoszenie o przetargu na sprzedaż nieruchomości gruntowej'),
    true
  );
  assert.equal(
    isAnnouncementTitle('Wynik przetargu ustnego nieograniczonego'),
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
    isResultTitle('Ogłoszenie o przetargu'),
    false
  );
});

test('parsePlDate and parsePrice handle formats', () => {
  assert.equal(parsePlDate('13 lutego 2025 r.'), '2025-02-13');
  assert.equal(parsePlDate('10.01.2025'), '2025-01-10');
  assert.equal(parsePlDate('2025-01-10 08:41:44'), '2025-01-10');
  assert.equal(parsePrice('240 000,00 zł'), 240000);
  assert.equal(parsePrice('35.500 zł'), 35500);
  assert.equal(parsePrice('420000 PLN'), 420000);
});

test('parseAnnouncement extracts auction details from MADKOM article', () => {
  const article = {
    id: '2592446',
    link: 'nowysacz,a,2592446,przetarg.html',
    title: 'Prezydent Miasta Nowego Sącza ogłasza I przetarg ustny (ul. Sienkiewicza)',
    date: '2025-01-10',
  };
  const html = `
    <h1>Ogłoszenie o przetargu</h1>
    <p>Prezydent Miasta Nowego Sącza ogłasza I przetarg ustny na sprzedaż nieruchomości gruntowej przy ul. Sienkiewicza w Nowym Sączu.</p>
    <p>Przetarg odbędzie się w dniu 13 lutego 2025 roku o godz. 10:00.</p>
    <p>Działki gruntu o numerze: 125/4 o powierzchni 860 m2.</p>
    <p>Cena wywoławcza: 215 000,00 zł. Wadium wynosi 21 500,00 zł.</p>
    <p>Księga wieczysta: NS1S/00123747/9.</p>
  `;

  const notice = parseAnnouncement(article, html);
  assert.equal(notice.id, 'nowy-sacz-2592446');
  assert.equal(notice.source_id, '2592446');
  assert.equal(notice.auction_date, '2025-02-13');
  assert.equal(notice.price, 215000);
  assert.equal(notice.deposit, 21500);
  assert.equal(notice.parcel, '125/4');
  assert.equal(notice.area, 860);
  assert.equal(notice.land_registry, 'NS1S/00123747/9');
  assert.equal(notice.property_type, 'grunt');
});

test('parseResultDoc extracts achieved price and buyer', () => {
  const article = {
    id: '2592500',
    link: 'nowysacz,a,2592500,wynik.html',
    title: 'Wynik przetargu ustnego nieograniczonego na sprzedaż nieruchomości',
  };
  const html = `
    <h1>Informacja o wyniku przetargu</h1>
    <p>W dniu 13 lutego 2025 r. przeprowadzono przetarg na sprzedaż nieruchomości przy ul. Sienkiewicza w Nowym Sączu, działka 125/4.</p>
    <p>Cena wywoławcza: 215 000,00 zł.</p>
    <p>Najwyższa cena osiągnięta w przetargu: 228 000,00 zł.</p>
    <p>Nabywcą nieruchomości został ustalony: Stanisław Bąk.</p>
    <p>Liczba osób dopuszczonych: 2.</p>
  `;

  const result = parseResultDoc(article, html);
  assert.equal(result.id, 'nowy-sacz-result-2592500');
  assert.equal(result.status, 'positive');
  assert.equal(result.price_achieved, 228000);
  assert.equal(result.parcel, '125/4');
  assert.equal(result.buyer, 'Stanisław Bąk');
  assert.equal(result.bidders_count, 2);
});
