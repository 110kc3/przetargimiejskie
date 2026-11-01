import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAnnouncementTitle,
  isResultTitle,
  parsePlDate,
  parsePrice,
  parseAnnouncementHtml,
  parseResultNotice,
} from '../src/cities/olecko/parse.js';

test('isAnnouncementTitle and isResultTitle correctly distinguish notices', () => {
  assert.equal(
    isAnnouncementTitle('Ogłoszenie o drugim przetargu na sprzedaż dwóch nieruchomości pod zabudowę mieszkaniową jednorodzinną położonych w Plewkach'),
    true
  );
  assert.equal(
    isAnnouncementTitle('Ogłoszenie o rokowaniach na sprzedaż dwóch lokali nr 6 i 7 położonych w budynku Młynowa 2'),
    true
  );
  assert.equal(
    isAnnouncementTitle('Informacja o wyniku przetargu ustnego'),
    false
  );
  assert.equal(
    isResultTitle('Informacja o wyniku przetargu ustnego na sprzedaż'),
    true
  );
  assert.equal(
    isResultTitle('Wynik przetargu ustnego'),
    true
  );
});

test('parsePlDate and parsePrice handle formats', () => {
  assert.equal(parsePlDate('2026-12-08'), '2026-12-08');
  assert.equal(parsePlDate('08.12.2026'), '2026-12-08');
  assert.equal(parsePlDate('8 grudnia 2026 r.'), '2026-12-08');
  assert.equal(parsePrice('50 000,00 zł'), 50000);
  assert.equal(parsePrice('5.000 zł'), 5000);
  assert.equal(parsePrice('120000 PLN'), 120000);
});

test('parseAnnouncementHtml extracts auction details from Olecko HTML', () => {
  const html = `
    <html>
      <head><title>Ogłoszenie o przetargu - Olecko</title></head>
      <body>
        <h1 class="pageHeader">Ogłoszenie o przetargu na sprzedaż lokalu mieszkalnego Kolejowa 11 m 5 w Olecku</h1>
        <div class="bip-page__content">
          <p>Burmistrz Olecka informuje o ogłoszeniu przetargu ustnego nieograniczonego na sprzedaż lokalu mieszkalnego przy ul. Kolejowej 11/5 w Olecku.</p>
          <p>Przetarg odbędzie się w dniu 8 grudnia 2026 r. o godzinie 10:00.</p>
          <p>Działka nr: 169/8 o powierzchni 78,40 m2.</p>
          <p>Cena wywoławcza: 30 000,00 zł.</p>
          <p>Księga wieczysta: OL1C/00027639/4.</p>
        </div>
      </body>
    </html>
  `;
  const url = 'https://bip.olecko.pl/4341/ogloszenie-o-czwartym-przetargu-ustnym-nieograniczonym-na-sprzedaz-lokalu-mieszkalnego-kolejowa-11-m-5-w-olecku.html';

  const notice = parseAnnouncementHtml(html, url);
  assert.equal(notice.id, 'olecko-4341');
  assert.equal(notice.source_id, '4341');
  assert.equal(notice.auction_date, '2026-12-08');
  assert.equal(notice.price, 30000);
  assert.equal(notice.parcel, '169/8');
  assert.equal(notice.area, 78.4);
  assert.equal(notice.land_registry, 'OL1C/00027639/4');
  assert.equal(notice.property_type, 'mieszkalny');
});

test('parseResultNotice extracts result outcome and price', () => {
  const html = `
    <h1>Informacja o wyniku przetargu</h1>
    <p>W dniu 8 grudnia 2026 r. przeprowadzono przetarg na lokal mieszkalny przy ul. Kolejowej 11/5 w Olecku.</p>
    <p>Cena wywoławcza: 30 000,00 zł.</p>
    <p>Najwyższa cena osiągnięta w przetargu: 34 000,00 zł.</p>
    <p>Nabywca nieruchomości: Piotr Kozłowski Olecko.</p>
  `;
  const url = 'https://bip.olecko.pl/4342/wynik-przetargu.html';

  const result = parseResultNotice(html, url);
  assert.equal(result.id, 'olecko-result-4342');
  assert.equal(result.status, 'positive');
  assert.equal(result.price_achieved, 34000);
  assert.equal(result.buyer, 'Piotr Kozłowski');
});
