import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanText,
  isAnnouncementTitle,
  isResultTitle,
  parsePlDate,
  parsePrice,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/pruszkow/parse.js';

test('pruszkow: isAnnouncementTitle & isResultTitle', () => {
  assert.equal(
    isAnnouncementTitle('Ogłoszenia o przetargu na sprzedaż nieruchomosći'),
    true
  );
  assert.equal(
    isResultTitle('Informacja o wyniku przetargu ustnego na sprzedaż nieruchomości'),
    true
  );
});

test('pruszkow: parsePlDate and parsePrice', () => {
  assert.equal(parsePlDate('17.11.2026 r.'), '2026-11-17');
  assert.equal(parsePlDate('10 listopada 2026 r.'), '2026-11-10');
  assert.equal(parsePrice('99 000,00 zł'), 99000);
  assert.equal(parsePrice('19 800,00 zł'), 19800);
});

test('pruszkow: parseAnnouncement extracts real-world notice details', () => {
  const item = {
    id: '26864',
    title: 'Ogłoszenie o przetargu na sprzedaż nieruchomości',
    url: 'https://bip.um.pruszkow.pl/attachments/download/26864',
  };
  const docText = `
    Prezydent Miasta Pruszkowa
    Ogłasza przetarg ustny ograniczony na sprzedaż niżej wymienionej nieruchomości gruntowej:
    L.p. Miejsce położenia Nr działki/obręb/KW Pow. w m² Przeznaczenie Cena wywoławcza Wadium
    1 Pruszków 205/4 obr. 20 KW- WA1P/00023902/7 199 99 000,00 zł brutto 19 800,00 zł.
    ul. 1-go Sierpnia
    Przetarg odbędzie się w dniu 17.11.2026 r. o godz. 11.00 w siedzibie Urzędu Miasta Pruszkowa - sala nr 25.
    Wadium: 19 800,00 zł.
  `;
  const res = parseAnnouncement(item, docText);

  assert.equal(res.id, 'pruszkow-26864');
  assert.equal(res.auction_date, '2026-11-17');
  assert.equal(res.price, 99000);
  assert.equal(res.deposit, 19800);
  assert.equal(res.parcel, '205/4');
  assert.equal(res.area, 199);
  assert.equal(res.land_registry, 'WA1P/00023902/7');
  assert.equal(res.type, 'announcement');
});

test('pruszkow: parseResultDoc extracts result status and buyer', () => {
  const item = {
    id: '26865',
    title: 'Informacja o wyniku przetargu',
    url: 'https://bip.um.pruszkow.pl/attachments/download/26865',
  };
  const docText = `
    Informacja o wyniku przetargu ustnego
    W dniu 17.11.2026 r. odbył się przetarg na sprzedaż nieruchomości dz. 205/4 przy ul. 1-go Sierpnia.
    Cena wywoławcza: 99 000,00 zł.
    Najwyższa cena osiągnięta w przetargu: 105 000,00 zł.
    Ustalona jako nabywca nieruchomości: Jan Kowalski
    Osoby dopuszczone do uczestniczenia: 1.
  `;
  const res = parseResultDoc(item, docText);

  assert.equal(res.id, 'pruszkow-result-26865');
  assert.equal(res.status, 'positive');
  assert.equal(res.price_achieved, 105000);
  assert.equal(res.buyer, 'Jan Kowalski');
  assert.equal(res.parcel, '205/4');
  assert.equal(res.type, 'result');
});
