import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAnnouncementTitle,
  isResultTitle,
  parsePlDate,
  parsePrice,
  parseRow,
  parseResultNotice,
} from '../src/cities/swiebodzin/parse.js';

test('isAnnouncementTitle and isResultTitle correctly distinguish notices', () => {
  assert.equal(
    isAnnouncementTitle('Burmistrz Świebodzina ogłasza VII pisemne przetargi nieograniczone na sprzedaż gminnej nieruchomość gruntowej'),
    true
  );
  assert.equal(
    isAnnouncementTitle('Przetarg ustny na sprzedaż lokalu mieszkalnego'),
    true
  );
  assert.equal(
    isAnnouncementTitle('Unieważnienie przetargu'),
    false
  );
  assert.equal(
    isResultTitle('Wynik przetargu ustnego nieograniczonego'),
    true
  );
  assert.equal(
    isResultTitle('Rozstrzygnięcie przetargu'),
    true
  );
});

test('parsePlDate and parsePrice handle formats', () => {
  assert.equal(parsePlDate('2026-11-17 11:00:00'), '2026-11-17');
  assert.equal(parsePlDate('15.12.2026'), '2026-12-15');
  assert.equal(parsePlDate('17 listopada 2026'), '2026-11-17');
  assert.equal(parsePrice('95 000,00 zł'), 95000);
  assert.equal(parsePrice('32.000 zł'), 32000);
  assert.equal(parsePrice('140000 PLN'), 140000);
});

test('parseRow extracts auction details from SystemDoBIP table row', () => {
  const rowHtml = `
    <tr>
      <td class="td-date-1"><div>Data ogłoszenia</div>2026-10-16 00:00:00</td>
      <td class="td-date-2"><div>Data i godzina przetargu</div>2026-11-17 11:00:00</td>
      <td class="td-title-1"><div>Dotyczy</div><a href="https://bip.swiebodzin.eu/przetargi/361/485/454_/" title="Przejdź do szczegółów informacji">Burmistrz Świebodzina ogłasza przetarg na sprzedaż nieruchomości gruntowej przy ul. Poznańskiej 14, działka 125/4 o pow. 850 m2, cena 135 000 zł</a></td>
    </tr>
  `;

  const notice = parseRow(rowHtml);
  assert.equal(notice.id, 'swiebodzin-485-454');
  assert.equal(notice.source_id, '485-454');
  assert.equal(notice.auction_date, '2026-11-17');
  assert.equal(notice.price, 135000);
  assert.equal(notice.parcel, '125/4');
  assert.equal(notice.area, 850);
  assert.equal(notice.property_type, 'grunt');
});

test('parseResultNotice extracts result outcome and price', () => {
  const html = `
    <h1>Rozstrzygnięcie przetargu</h1>
    <p>W dniu 17 listopada 2026 r. rozstrzygnięto przetarg na działkę 125/4.</p>
    <p>Cena wywoławcza: 135 000,00 zł.</p>
    <p>Najwyższa cena osiągnięta w przetargu: 142 000,00 zł.</p>
    <p>Nabywca nieruchomości: Adam Lewandowski Świebodzin.</p>
  `;
  const url = 'https://bip.swiebodzin.eu/przetargi/361/485/454_/';

  const result = parseResultNotice(html, url);
  assert.equal(result.id, 'swiebodzin-result-485-454');
  assert.equal(result.status, 'positive');
  assert.equal(result.price_achieved, 142000);
  assert.equal(result.buyer, 'Adam Lewandowski');
});
