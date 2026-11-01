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
} from '../src/cities/swiecie/parse.js';

test('swiecie: isAnnouncementTitle & isResultTitle', () => {
  assert.equal(
    isAnnouncementTitle('Wykaz nieruchomości przeznaczonej do zbycia w drodze przetargu'),
    true
  );
  assert.equal(
    isResultTitle('Informacja o wyniku przetargu ustnego na sprzedaż nieruchomości'),
    true
  );
});

test('swiecie: parsePlDate and parsePrice', () => {
  assert.equal(parsePlDate('20.10.2026 r.'), '2026-10-20');
  assert.equal(parsePlDate('5 listopada 2026'), '2026-11-05');
  assert.equal(parsePrice('120 000,00 zł'), 120000);
  assert.equal(parsePrice('12.000 zł'), 12000);
});

test('swiecie: parseAnnouncement extracts notice details', () => {
  const item = {
    id: '11478',
    title: 'Wykaz nieruchomości przeznaczonej do zbycia - Zarządzenie Burmistrza',
    url: 'https://bip.swiecie.eu/artykul/197/11478',
  };
  const docText = `
    Burmistrz Świecia ogłasza przetarg ustny nieograniczony na sprzedaż nieruchomości gruntowej.
    Działka nr 742/1 o powierzchni 0,1250 ha, położona w Świeciu przy ul. Bydgoskiej.
    Księga wieczysta nr BY1S/00023456/1.
    Cena wywoławcza wynosi 120.000,00 zł brutto.
    Wadium wynosi 12.000,00 zł.
    Przetarg odbędzie się w dniu 25 listopada 2026 r. o godz. 10.00 w Urzędzie Miejskim w Świeciu.
  `;
  const res = parseAnnouncement(item, docText);

  assert.equal(res.id, 'swiecie-11478');
  assert.equal(res.auction_date, '2026-11-25');
  assert.equal(res.price, 120000);
  assert.equal(res.deposit, 12000);
  assert.equal(res.parcel, '742/1');
  assert.equal(res.area, 1250);
  assert.equal(res.land_registry, 'BY1S/00023456/1');
  assert.equal(res.type, 'announcement');
  assert.equal(res.property_type, 'grunt');
});

test('swiecie: parseResultDoc extracts result status and buyer', () => {
  const item = {
    id: '11479',
    title: 'Informacja o wyniku przetargu ustnego na sprzedaż nieruchomości',
    url: 'https://bip.swiecie.eu/artykul/197/11479',
  };
  const docText = `
    Informacja o wyniku przetargu ustnego
    W dniu 25 listopada 2026 r. odbył się przetarg na sprzedaż działki nr 742/1 przy ul. Bydgoskiej.
    Cena wywoławcza: 120.000,00 zł.
    Najwyższa cena osiągnięta w przetargu: 135.000,00 zł.
    Ustalona jako nabywca nieruchomości: Tomasz Lewandowski
    Osoby dopuszczone do uczestniczenia: 2.
  `;
  const res = parseResultDoc(item, docText);

  assert.equal(res.id, 'swiecie-result-11479');
  assert.equal(res.status, 'positive');
  assert.equal(res.price_achieved, 135000);
  assert.equal(res.buyer, 'Tomasz Lewandowski');
  assert.equal(res.parcel, '742/1');
  assert.equal(res.type, 'result');
});
