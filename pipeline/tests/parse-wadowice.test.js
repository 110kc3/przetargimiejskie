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
} from '../src/cities/wadowice/parse.js';

test('wadowice: isAnnouncementTitle & isResultTitle', () => {
  assert.equal(
    isAnnouncementTitle('Ogłoszenie Burmistrza Wadowic o ogłoszeniu I przetargu ustnego nieograniczonego na sprzedaż nieruchomości'),
    true
  );
  assert.equal(
    isResultTitle('Informacja o wyniku II przetargu ustnego nieograniczonego na sprzedaż nieruchomości'),
    true
  );
});

test('wadowice: parsePlDate and parsePrice', () => {
  assert.equal(parsePlDate('2024-01-10'), '2024-01-10');
  assert.equal(parsePlDate('11 maja 2026 r.'), '2026-05-11');
  assert.equal(parsePrice('1.200.000,00 zł'), 1200000);
  assert.equal(parsePrice('180.000 zł'), 180000);
});

test('wadowice: parseAnnouncement extracts notice details', () => {
  const item = {
    id: '1932117',
    title: 'Ogłoszenie Burmistrza Wadowic o ogłoszeniu I przetargu ustnego na sprzedaż nieruchomości',
    date: '2026-05-11 15:00:00',
  };
  const docText = `
    Burmistrz Wadowic ogłasza I przetarg ustny nieograniczony na sprzedaż nieruchomości gruntowej.
    Działka nr 117/2 o powierzchni 0,1404 ha, położona w Wadowicach przy ul. Juliusza Słowackiego 7.
    Dla nieruchomości prowadzona jest księga wieczysta nr KR1W/00060185/8.
    Cena wywoławcza: 1.200.000,00 zł.
    Wysokość wadium: 120.000,00 zł.
    Przetarg odbędzie się w dniu 25 czerwca 2026 r. o godz. 11.00 w Urzędzie Miejskim w Wadowicach.
  `;
  const res = parseAnnouncement(item, docText);

  assert.equal(res.id, 'wadowice-1932117');
  assert.equal(res.auction_date, '2026-06-25');
  assert.equal(res.price, 1200000);
  assert.equal(res.deposit, 120000);
  assert.equal(res.parcel, '117/2');
  assert.equal(res.area, 1404);
  assert.equal(res.land_registry, 'KR1W/00060185/8');
  assert.equal(res.type, 'announcement');
  assert.equal(res.property_type, 'grunt');
});

test('wadowice: parseResultDoc extracts result status and buyer', () => {
  const item = {
    id: '2390377',
    title: 'Informacja o wyniku II przetargu ustnego nieograniczonego na sprzedaż nieruchomości, lokalizacja: Wadowice, ul. Juliusza Słowackiego 7',
    date: '2026-01-11 14:10:54',
  };
  const docText = `
    Wadowice, 2026-01-10
    INFORMACJA O WYNIKU II-GO PRZETARGU ustnego nieograniczonego na sprzedaż nieruchomości, składającej się z działek ozn. nr 117/2, 117/3 o łącznej pow. 0,1404 ha, zabudowanej budynkiem mieszkalnym nr 7 przy ul. Słowackiego w Wadowicach, objętej księgą wieczystą nr KR1W/00060185/8.
    Cena wywoławcza: 1.200.000,00 zł + 23 % podatku VAT.
    Wynik przetargu: Negatywny.
    Liczba podmiotów dopuszczonych do uczestnictwa w przetargu: 0.
  `;
  const res = parseResultDoc(item, docText);

  assert.equal(res.id, 'wadowice-result-2390377');
  assert.equal(res.status, 'negative');
  assert.equal(res.price_achieved, null);
  assert.equal(res.bidders_count, 0);
  assert.equal(res.parcel, '117/2');
  assert.equal(res.type, 'result');
});
