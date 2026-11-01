import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAnnouncementTitle,
  isResultTitle,
  parsePlDate,
  parsePrice,
  parseAnnouncementHtml,
  parseResultHtml,
} from '../src/cities/rawicz/parse.js';

test('isAnnouncementTitle and isResultTitle correctly distinguish notices', () => {
  assert.equal(
    isAnnouncementTitle('wykaz nieruchomości przeznaczonych do sprzedaży - lokal mieszkalny ul. Marii Konopnickiej 1/3 w Rawiczu'),
    true
  );
  assert.equal(
    isAnnouncementTitle('Ogłoszenie o I ustnym przetargu na sprzedaż działki niezabudowanej'),
    true
  );
  assert.equal(
    isAnnouncementTitle('Wynik przetargu na sprzedaż działki nr 30'),
    false
  );
  assert.equal(
    isResultTitle('Wynik przetargu ustnego nieograniczonego'),
    true
  );
  assert.equal(
    isResultTitle('Informacja o wyniku przetargu na sprzedaż'),
    true
  );
});

test('parsePlDate and parsePrice handle formats', () => {
  assert.equal(parsePlDate('2026-11-20'), '2026-11-20');
  assert.equal(parsePlDate('28.11.2026'), '2026-11-28');
  assert.equal(parsePlDate('15 listopada 2026 r.'), '2026-11-15');
  assert.equal(parsePrice('145 000,00 zł'), 145000);
  assert.equal(parsePrice('25.000 zł'), 25000);
  assert.equal(parsePrice('210000 PLN'), 210000);
});

test('parseAnnouncementHtml extracts auction details from Logonet HTML', () => {
  const html = `
    <html>
      <head><title>wykaz nieruchomości - lokal mieszkalny ul. Marii Konopnickiej 1/3 w Rawiczu</title></head>
      <body>
        <h1>wykaz nieruchomości przeznaczonych do sprzedaży - lokal mieszkalny ul. Marii Konopnickiej 1/3 w Rawiczu</h1>
        <div class="wysiwyg">
          <p>Przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 3 przy ul. Marii Konopnickiej 1 w Rawiczu.</p>
          <p>Przetarg odbędzie się w dniu 28 listopada 2026 roku.</p>
          <p>Działka nr: 469/3 o powierzchni 52,40 m2.</p>
          <p>Cena wywoławcza: 155 000,00 zł.</p>
        </div>
      </body>
    </html>
  `;
  const url = 'https://bip.rawicz.pl/artykul/786/12010/wykaz-nieruchomosci-przeznaczonych-do-sprzedazy-lokal-mieszkalny-ul-marii-konopnickiej-1-3-w-rawiczu';

  const notice = parseAnnouncementHtml(html, url);
  assert.equal(notice.id, 'rawicz-12010');
  assert.equal(notice.source_id, '12010');
  assert.equal(notice.auction_date, '2026-11-28');
  assert.equal(notice.price, 155000);
  assert.equal(notice.parcel, '469/3');
  assert.equal(notice.area, 52.4);
  assert.equal(notice.property_type, 'mieszkalny');
});

test('parseResultHtml extracts result outcome and price', () => {
  const html = `
    <h1>Wynik przetargu na sprzedaż nieruchomości</h1>
    <p>W dniu 28 listopada 2026 r. przeprowadzono przetarg na lokal mieszkalny przy ul. Konopnickiej 1/3 w Rawiczu.</p>
    <p>Cena wywoławcza: 155 000,00 zł.</p>
    <p>Najwyższa cena osiągnięta w przetargu: 161 000,00 zł.</p>
    <p>Nabywca nieruchomości: Tomasz Zieliński Rawicz.</p>
  `;
  const url = 'https://bip.rawicz.pl/artykul/786/11829/wynik-przetargu';

  const result = parseResultHtml(html, url);
  assert.equal(result.id, 'rawicz-result-11829');
  assert.equal(result.status, 'positive');
  assert.equal(result.price_achieved, 161000);
  assert.equal(result.buyer, 'Tomasz Zieliński');
});
