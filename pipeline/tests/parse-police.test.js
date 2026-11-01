import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAnnouncementTitle,
  isResultTitle,
  parsePlDate,
  parsePrice,
  parseNoticeHtml,
  parseResultNotice,
} from '../src/cities/police/parse.js';

test('isAnnouncementTitle and isResultTitle correctly distinguish notices', () => {
  assert.equal(
    isAnnouncementTitle('działki nr 3039/1, 3039/3, obręb nr 10 Police'),
    true
  );
  assert.equal(
    isAnnouncementTitle('Przetarg ustny na sprzedaż lokalu mieszkalnego'),
    true
  );
  assert.equal(
    isAnnouncementTitle('Informacja o wyniku przetargu'),
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
  assert.equal(parsePlDate('02.12.2026'), '2026-12-02');
  assert.equal(parsePlDate('2026-12-02T10:00:00'), '2026-12-02');
  assert.equal(parsePlDate('15 listopada 2026'), '2026-11-15');
  assert.equal(parsePrice('720 000,00 zł'), 720000);
  assert.equal(parsePrice('45.000 zł'), 45000);
  assert.equal(parsePrice('180000 PLN'), 180000);
});

test('parseNoticeHtml extracts auction details from Logonet HTML', () => {
  const html = `
    <html>
      <head><title>Przetarg - działki nr 3039/1, 3039/3</title></head>
      <body>
        <h1>działki nr 3039/1, 3039/3, obręb nr 10 Police</h1>
        <table class="table-details">
          <tr>
            <th scope="row">Rodzaj nieruchomości</th>
            <td>nieruchomość gruntowa zabudowana</td>
          </tr>
          <tr>
            <th scope="row">Cena wywoławcza</th>
            <td>720 000,00 zł</td>
          </tr>
          <tr>
            <th scope="row">Data przetargu</th>
            <td><time datetime="2026-12-02T10:00:00">02.12.2026 godz. 10:00</time></td>
          </tr>
        </table>
        <div class="wysiwyg">
          <p>Przetarg ustny nieograniczony na sprzedaż nieruchomości przy ul. Bankowej 18 w Policach, działka nr 3039/1 o pow. 1250 m2.</p>
        </div>
      </body>
    </html>
  `;
  const url = 'https://bip.police.pl/przetarg-nieruchomosci/21452/dzialki-nr-3039-1-3039-3-obreb-nr-10-police';

  const notice = parseNoticeHtml(html, url);
  assert.equal(notice.id, 'police-21452');
  assert.equal(notice.source_id, '21452');
  assert.equal(notice.auction_date, '2026-12-02');
  assert.equal(notice.price, 720000);
  assert.equal(notice.parcel, '3039/1');
  assert.equal(notice.area, 1250);
  assert.equal(notice.property_type, 'zabudowana');
});

test('parseResultNotice extracts result outcome and price', () => {
  const html = `
    <h1>Informacja o wyniku przetargu</h1>
    <p>W dniu 02 grudnia 2026 r. przeprowadzono przetarg na działkę nr 3039/1.</p>
    <p>Cena wywoławcza wynosiła 720 000,00 zł.</p>
    <p>Najwyższa cena osiągnięta w przetargu: 745 000,00 zł.</p>
    <p>Nabywca nieruchomości: Janina Kowalska Police.</p>
  `;
  const url = 'https://bip.police.pl/wynik/21452';

  const result = parseResultNotice(html, url);
  assert.equal(result.id, 'police-result-21452');
  assert.equal(result.status, 'positive');
  assert.equal(result.price_achieved, 745000);
  assert.equal(result.buyer, 'Janina Kowalska');
});
