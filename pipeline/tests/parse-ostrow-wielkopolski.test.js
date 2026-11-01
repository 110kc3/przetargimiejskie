import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAnnouncementTitle,
  isResultTitle,
  parsePlDate,
  parsePrice,
  parseAnnouncementHtml,
  parseResultHtml,
} from '../src/cities/ostrow-wielkopolski/parse.js';

test('isAnnouncementTitle and isResultTitle correctly distinguish notices', () => {
  assert.equal(
    isAnnouncementTitle('wykaz nieruchomości przeznaczonej do sprzedaży - dz. nr 7/4 obręb 0066'),
    true
  );
  assert.equal(
    isAnnouncementTitle('Ogłoszenie o przetargu na sprzedaż lokalu użytkowego'),
    true
  );
  assert.equal(
    isAnnouncementTitle('Wynik przetargu na sprzedaż lokalu'),
    false
  );
  assert.equal(
    isResultTitle('Wynik przetargu ustnego nieograniczonego'),
    true
  );
  assert.equal(
    isResultTitle('Informacja o wyniku przetargu na lokal'),
    true
  );
});

test('parsePlDate and parsePrice handle formats', () => {
  assert.equal(parsePlDate('2026-11-24'), '2026-11-24');
  assert.equal(parsePlDate('30.11.2026'), '2026-11-30');
  assert.equal(parsePlDate('18 listopada 2026 r.'), '2026-11-18');
  assert.equal(parsePrice('195 000,00 zł'), 195000);
  assert.equal(parsePrice('35.000 zł'), 35000);
  assert.equal(parsePrice('280000 PLN'), 280000);
});

test('parseAnnouncementHtml extracts auction details from Logonet HTML', () => {
  const html = `
    <html>
      <head><title>wykaz nieruchomości przeznaczonej do sprzedaży - Ostrów Wielkopolski</title></head>
      <body>
        <h1>Ogłoszenie o przetargu na sprzedaż lokalu użytkowego przy Al. Powstańców Wielkopolskich 22 w Ostrowie Wielkopolskim</h1>
        <article class="box">
          <p>Prezydent Miasta Ostrowa Wielkopolskiego ogłasza przetarg ustny nieograniczony na sprzedaż lokalu użytkowego przy Al. Powstańców Wielkopolskich 22 w Ostrowie Wielkopolskim.</p>
          <p>Przetarg odbędzie się w dniu 30 listopada 2026 roku.</p>
          <p>Działka nr: 14/2 o powierzchni 64,20 m2.</p>
          <p>Cena wywoławcza: 195 000,00 zł.</p>
        </article>
      </body>
    </html>
  `;
  const url = 'https://bip.umostrow.pl/artykul/21/3784/ogloszenie-o-przetargu';

  const notice = parseAnnouncementHtml(html, url);
  assert.equal(notice.id, 'ostrow-wielkopolski-3784');
  assert.equal(notice.source_id, '3784');
  assert.equal(notice.auction_date, '2026-11-30');
  assert.equal(notice.price, 195000);
  assert.equal(notice.parcel, '14/2');
  assert.equal(notice.area, 64.2);
  assert.equal(notice.property_type, 'uzytkowy');
});

test('parseResultHtml extracts result outcome and price', () => {
  const html = `
    <h1>Informacja o wyniku przetargu</h1>
    <p>W dniu 30 listopada 2026 r. przeprowadzono przetarg na sprzedaż lokalu przy Al. Powstańców Wielkopolskich 22.</p>
    <p>Cena wywoławcza: 195 000,00 zł.</p>
    <p>Najwyższa cena osiągnięta w przetargu: 205 000,00 zł.</p>
    <p>Nabywca nieruchomości: Krzysztof Kaczmarek Ostrów.</p>
  `;
  const url = 'https://bip.umostrow.pl/artykul/21/3785/wynik-przetargu';

  const result = parseResultHtml(html, url);
  assert.equal(result.id, 'ostrow-wielkopolski-result-3785');
  assert.equal(result.status, 'positive');
  assert.equal(result.price_achieved, 205000);
  assert.equal(result.buyer, 'Krzysztof Kaczmarek');
});
