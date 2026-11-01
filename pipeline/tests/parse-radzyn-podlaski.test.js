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
} from '../src/cities/radzyn-podlaski/parse.js';

test('radzyn-podlaski: isAnnouncementTitle & isResultTitle', () => {
  assert.equal(
    isAnnouncementTitle('Zarządzenie w sprawie ogłoszenia pierwszego przetargu ustnego na sprzedaż nieruchomości'),
    true
  );
  assert.equal(
    isResultTitle('Informacja o wyniku przetargu ustnego na sprzedaż nieruchomości'),
    true
  );
});

test('radzyn-podlaski: parsePlDate and parsePrice', () => {
  assert.equal(parsePlDate('20 października 2026 r.'), '2026-10-20');
  assert.equal(parsePlDate('15.11.2026'), '2026-11-15');
  assert.equal(parsePrice('180 000,00 zł'), 180000);
  assert.equal(parsePrice('18 000 zł'), 18000);
});

test('radzyn-podlaski: parseAnnouncement extracts real notice details', () => {
  const item = {
    id_dokumentu: '2366951',
    tresc: 'Zarządzenie Nr 125 Burmistrza Miasta Radzyń Podlaski z dnia 20 października 2026 r. w sprawie ogłoszenia pierwszego przetargu ustnego ograniczonego na sprzedaż nieruchomości gruntowych położonych w Radzyniu Podlaskim przy ul. Partyzantów, stanowiących własność Miasta Radzyń Podlaski.',
    data_utworzenia: '2026-10-20',
  };
  const docText = `
    Burmistrz Miasta Radzyń Podlaski
    Ogłasza pierwszy przetarg ustny ograniczony na sprzedaż nieruchomości gruntowej.
    Działka nr 152/4 o powierzchni 850 m2, położona w Radzyniu Podlaskim przy ul. Partyzantów.
    Dla nieruchomości prowadzona jest księga wieczysta LU1R/00012345/6.
    Cena wywoławcza wynosi 180 000,00 zł brutto.
    Wadium wynosi 18 000,00 zł.
    Przetarg odbędzie się w dniu 25 listopada 2026 r. o godz. 10.00 w Urzędzie Miasta Radzyń Podlaski.
  `;
  const res = parseAnnouncement(item, docText);

  assert.equal(res.id, 'radzyn-podlaski-2366951');
  assert.equal(res.auction_date, '2026-11-25');
  assert.equal(res.price, 180000);
  assert.equal(res.deposit, 18000);
  assert.equal(res.parcel, '152/4');
  assert.equal(res.area, 850);
  assert.equal(res.land_registry, 'LU1R/00012345/6');
  assert.equal(res.type, 'announcement');
  assert.equal(res.property_type, 'grunt');
});

test('radzyn-podlaski: parseResultDoc extracts result status and buyer', () => {
  const item = {
    id_dokumentu: '2366952',
    tresc: 'Informacja o wyniku przetargu ustnego na sprzedaż nieruchomości',
    data_utworzenia: '2026-11-26',
  };
  const docText = `
    Informacja o wyniku przetargu ustnego
    W dniu 25 listopada 2026 r. odbył się przetarg na sprzedaż działki nr 152/4 przy ul. Partyzantów.
    Cena wywoławcza: 180 000,00 zł.
    Najwyższa cena osiągnięta w przetargu: 195 000,00 zł.
    Ustalona jako nabywca nieruchomości: Stanisław Kowalski
    Osoby dopuszczone do uczestniczenia: 2.
  `;
  const res = parseResultDoc(item, docText);

  assert.equal(res.id, 'radzyn-podlaski-result-2366952');
  assert.equal(res.status, 'positive');
  assert.equal(res.price_achieved, 195000);
  assert.equal(res.buyer, 'Stanisław Kowalski');
  assert.equal(res.parcel, '152/4');
  assert.equal(res.type, 'result');
});
