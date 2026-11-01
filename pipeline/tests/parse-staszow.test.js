import test from 'node:test';
import assert from 'node:assert/strict';

import {
  cleanText,
  parsePLN,
  parseArea,
  parseDate,
  extractRound,
  extractParcels,
  extractKw,
  isAnnouncementTitle,
  isResultTitle,
  isFlat,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/staszow/parse.js';

test('staszow parsePLN', () => {
  assert.equal(parsePLN('98.757,00 zł'), 98757);
  assert.equal(parsePLN('98.000,00 zł'), 98000);
  assert.equal(parsePLN('10 000 zł'), 10000);
  assert.equal(parsePLN('brak'), null);
});

test('staszow parseArea', () => {
  assert.equal(parseArea('35,24 m.kw.'), 35.24);
  assert.equal(parseArea('0,2310 ha'), 0.231);
  assert.equal(parseArea('48,50 m²'), 48.5);
  assert.equal(parseArea('xyz'), null);
});

test('staszow parseDate', () => {
  assert.equal(parseDate('14.09.2026 r.'), '2026-09-14');
  assert.equal(parseDate('19 grudnia 2025 r.'), '2025-12-19');
  assert.equal(parseDate('2026-10-15'), '2026-10-15');
  assert.equal(parseDate('brak'), null);
});

test('staszow extractRound', () => {
  assert.equal(extractRound('Ogłoszenie o III przetargu ustnym nieograniczonym'), 3);
  assert.equal(extractRound('Ogłoszenie o II przetargu ustnym'), 2);
  assert.equal(extractRound('I przetarg ustny'), 1);
  assert.equal(extractRound('Informacja o wyniku przetargu'), 1);
});

test('staszow extractParcels and extractKw', () => {
  const text = 'Nr działki: 1410/16, KW KI1A/00023184/6';
  assert.deepEqual(extractParcels(text), ['1410/16']);
  assert.deepEqual(extractKw(text), ['KI1A/00023184/6']);
});

test('staszow isAnnouncementTitle and isResultTitle', () => {
  assert.equal(isAnnouncementTitle('Ogłoszenie o III przetargu ustnym nieograniczonym na sprzedaż nieruchomości'), true);
  assert.equal(isAnnouncementTitle('Wykaz nieruchomości przeznaczonej do wydzierżawienia'), false);
  assert.equal(isAnnouncementTitle('Informacja o wyniku przetargu nieograniczonego'), false);

  assert.equal(isResultTitle('Informacja o wyniku wyniku przetargu nieograniczonego'), true);
  assert.equal(isResultTitle('Ogłoszenie o przetargu'), false);
});

test('staszow isFlat', () => {
  assert.equal(isFlat('Ogłoszenie o sprzedaży lokalu mieszkalnego przy ul. Opatowskiej 20/3'), true);
  assert.equal(isFlat('Sprzedaż nieruchomości lokalowej w Staszowie'), true);
  assert.equal(isFlat('Sprzedaż nieruchomości gruntowej, Staszów'), false);
});

test('staszow parseAnnouncement real sample', () => {
  const sample = `
Burmistrz Miasta i Gminy Staszów ogłasza pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego Nr 3,
położonego przy ul. Opatowskiej 20 w Staszowie o powierzchni użytkowej 35,24 m.kw.
Działka nr 808/3, KW KI1A/00023184/6.
Cena wywoławcza: 98 757,00 zł.
Wadium: 10 000,00 zł.
Przetarg w dniu 15.10.2025 r. o godz. 11:00 w Urzędzie Miasta i Gminy w Staszowie.
  `;
  const parsed = parseAnnouncement(
    sample,
    'Ogłoszenie o sprzedaży w drodze ustnego przetargu nieograniczonego lokalu mieszkalnego Nr 3',
    'https://www.bip.staszow.pl/article.html',
  );

  assert.equal(parsed.round, 1);
  assert.equal(parsed.area_m2, 35.24);
  assert.equal(parsed.price, 98757);
  assert.equal(parsed.auction_date, '2025-10-15');
  assert.deepEqual(parsed.parcels, ['808/3']);
  assert.deepEqual(parsed.kw, ['KI1A/00023184/6']);
  assert.ok(parsed.address);
  assert.equal(parsed.kind, 'mieszkalny');
});

test('staszow parseResultDoc won outcome', () => {
  const doc = {
    title: 'Informacja o wyniku ustnego przetargu nieograniczonego',
    pdf_url: 'https://www.bip.staszow.pl/pliki/wynik.pdf',
    auction_date: '2025-12-19',
    text: `
Informacja o wyniku przetargu ustnego nieograniczonego na sprzedaż lokalu mieszkalnego przy ul. Opatowskiej 20.
Cena wywoławcza: 98 757,00 zł.
Najwyższa cena uzyskana w przetargu: 105 000,00 zł.
Nabywcą został: Krzysztof Mazur.
    `,
  };
  const parsed = parseResultDoc(doc);
  assert.equal(parsed.status, 'won');
  assert.equal(parsed.price_reserve, 98757);
  assert.equal(parsed.price_achieved, 105000);
  assert.equal(parsed.buyer, 'Krzysztof Mazur');
  assert.equal(parsed.auction_date, '2025-12-19');
});

test('staszow parseResultDoc unresolved outcome', () => {
  const doc = {
    title: 'Informacja o wyniku przetargu',
    pdf_url: 'https://www.bip.staszow.pl/pliki/wynik-neg.pdf',
    auction_date: '2025-12-19',
    text: `
Informacja o wyniku przetargu ustnego nieograniczonego na sprzedaż nieruchomości przy ul. Krakowska.
Cena wywoławcza: 150 000,00 zł.
Przetarg zakończył się wynikiem negatywnym z powodu braku uczestników, brak ofert.
    `,
  };
  const parsed = parseResultDoc(doc);
  assert.equal(parsed.status, 'unresolved');
  assert.equal(parsed.price_reserve, 150000);
  assert.equal(parsed.price_achieved, null);
  assert.equal(parsed.auction_date, '2025-12-19');
});
