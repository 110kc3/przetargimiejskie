import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAnnouncementTitle,
  isResultTitle,
  parsePlDate,
  parsePrice,
  parseAnnouncementHtml,
  parseResultNotice,
} from '../src/cities/zambrow/parse.js';

test('isAnnouncementTitle and isResultTitle correctly distinguish notices', () => {
  assert.equal(
    isAnnouncementTitle('Ogłoszenie o przetargu ustnym nieograniczonym na sprzedaż lokalu mieszkalnego'),
    true
  );
  assert.equal(
    isAnnouncementTitle('Przetarg ustny na sprzedaż działki niezabudowanej'),
    true
  );
  assert.equal(
    isAnnouncementTitle('Informacja o wyniku drugiego przetargu ustnego'),
    false
  );
  assert.equal(
    isResultTitle('Informacja o wyniku drugiego przetargu ustnego'),
    true
  );
  assert.equal(
    isResultTitle('Wynik przetargu na sprzedaż'),
    true
  );
});

test('parsePlDate and parsePrice handle formats', () => {
  assert.equal(parsePlDate('2026-10-01 13:09:48'), '2026-10-01');
  assert.equal(parsePlDate('23.09.2026'), '2026-09-23');
  assert.equal(parsePlDate('19 lutego 2025 r.'), '2025-02-19');
  assert.equal(parsePrice('198 073,00 zł'), 198073);
  assert.equal(parsePrice('21.500 zł'), 21500);
  assert.equal(parsePrice('310000 PLN'), 310000);
});

test('parseAnnouncementHtml extracts auction details from Zambrów HTML', () => {
  const html = `
    <html>
      <head><title>Ogłoszenie o przetargu - Zambrów</title></head>
      <body>
        <h1>Ogłoszenie o przetargu na sprzedaż lokalu mieszkalnego przy ul. Białostockiej 31 w Zambrowie</h1>
        <div class="article-content">
          <p>Burmistrz Miasta Zambrów ogłasza przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 113 przy ul. Białostockiej 31 w Zambrowie.</p>
          <p>Przetarg odbędzie się w dniu 19 lutego 2025 r. o godz. 10:00.</p>
          <p>Działka nr: 1086/4 o powierzchni 41,11 m2.</p>
          <p>Cena wywoławcza: 198 073,00 zł.</p>
        </div>
      </body>
    </html>
  `;
  const url = 'https://bip.zambrow.pl/artykul/przetarg-spoldzielcze-wlasnosciowe-prawo-do-lokalu-mieszkalnego';

  const notice = parseAnnouncementHtml(html, url);
  assert.equal(notice.id, 'zambrow-przetarg-spoldzielcze-wlasnosciowe-prawo-do-lokalu-mieszkalnego');
  assert.equal(notice.source_id, 'przetarg-spoldzielcze-wlasnosciowe-prawo-do-lokalu-mieszkalnego');
  assert.equal(notice.auction_date, '2025-02-19');
  assert.equal(notice.price, 198073);
  assert.equal(notice.parcel, '1086/4');
  assert.equal(notice.area, 41.11);
  assert.equal(notice.property_type, 'mieszkalny');
});

test('parseResultNotice extracts result outcome and price', () => {
  const html = `
    <h1>Informacja o wyniku przetargu</h1>
    <p>W dniu 19 lutego 2025 r. przeprowadzono przetarg na lokal mieszkalny przy ul. Białostockiej 31/113 w Zambrowie.</p>
    <p>Cena wywoławcza: 198 073,00 zł.</p>
    <p>Najwyższa cena osiągnięta w przetargu: 202 000,00 zł.</p>
    <p>Nabywca nieruchomości: Paweł Dąbrowski Zambrów.</p>
  `;
  const url = 'https://bip.zambrow.pl/artykul/informacja-o-wyniku-przetargu-bialostocka-31';

  const result = parseResultNotice(html, url);
  assert.equal(result.id, 'zambrow-result-informacja-o-wyniku-przetargu-bialostocka-31');
  assert.equal(result.status, 'positive');
  assert.equal(result.price_achieved, 202000);
  assert.equal(result.buyer, 'Paweł Dąbrowski');
});
