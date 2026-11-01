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
} from '../src/cities/zary/parse.js';

test('zary parsePLN', () => {
  assert.equal(parsePLN('217.500,00 zł'), 217500);
  assert.equal(parsePLN('225 000,00 zł'), 225000);
  assert.equal(parsePLN('7.858,50 zł'), 7858.5);
  assert.equal(parsePLN('brak'), null);
});

test('zary parseArea', () => {
  assert.equal(parseArea('78,8m2'), 78.8);
  assert.equal(parseArea('0,0165 ha'), 165);
  assert.equal(parseArea('52,40 m²'), 52.4);
  assert.equal(parseArea('xyz'), null);
});

test('zary parseDate', () => {
  assert.equal(parseDate('02.12.2026 r'), '2026-12-02');
  assert.equal(parseDate('21.10.2026r.'), '2026-10-21');
  assert.equal(parseDate('23 października 2026 r.'), '2026-10-23');
  assert.equal(parseDate('brak'), null);
});

test('zary extractRound', () => {
  assert.equal(extractRound('ogłoszenia drugiego przetargu ustnego nieograniczonego'), 2);
  assert.equal(extractRound('pierwszy przetarg ustny'), 1);
  assert.equal(extractRound('III przetarg ustny nieograniczony'), 3);
});

test('zary extractParcels and extractKw', () => {
  const text = 'działki nr 154/1, księgi wieczystej nr ZG1R/00017366/3';
  assert.deepEqual(extractParcels(text), ['154/1']);
  assert.deepEqual(extractKw(text), ['ZG1R/00017366/3']);
});

test('zary isAnnouncementTitle and isResultTitle', () => {
  assert.equal(isAnnouncementTitle('Przetarg - 02.12.2026 r.'), true);
  assert.equal(isAnnouncementTitle('Nieruchomości gminne wyznaczone do sprzedaży'), false);
  assert.equal(isAnnouncementTitle('Wyniki przetargów przeprowadzonych dnia 21.10.2026r.'), false);

  assert.equal(isResultTitle('Wyniki przetargów przeprowadzonych dnia 21.10.2026r.'), true);
  assert.equal(isResultTitle('Informacja o wynikach przetargów'), true);
  assert.equal(isResultTitle('Przetarg - 02.12.2026 r.'), false);
});

test('zary isFlat', () => {
  assert.equal(isFlat('Sprzedaż lokali mieszkalnych wraz z udziałami w gruncie'), true);
  assert.equal(isFlat('Sprzedaż nieruchomości gruntowej niezabudowanej'), false);
  assert.equal(isFlat('Przetarg na lokal użytkowy'), false);
});

test('zary parseAnnouncement real sample', () => {
  const sample = `
ZARZĄDZENIE NR WA.0050.210.2026 BURMISTRZA MIASTA ŻARY
w sprawie ogłoszenia drugiego przetargu ustnego nieograniczonego na sprzedaż z zasobu nieruchomości Gminy Żary o statusie miejskim lokali mieszkalnych wraz z udziałami w częściach wspólnych nieruchomości.
Załącznik do zarządzenia.
1. Nr działki 154/1, Nr księgi wieczystej ZG1R/00017366/3, Powierzchnia działki 0,0165ha
Położenie ul. Śródmiejska 21 obręb 2
Lokal mieszkalny nr 5, położony na II piętrze budynku, składający się z dwóch pokoi, kuchni, spiżarki i dwóch garderób o łącznej powierzchni użytkowej 78,8m2.
Cena wywoławcza: 217.500,00 zł, w tym: 209.641,50 zł – lokal, 7.858,50 zł – udział w gruncie.
  `;

  const parsed = parseAnnouncement(
    sample,
    'Przetarg - 02.12.2026 r.',
    'https://bip.zary.pl/312/6780/Przetarg_-_02_12_2026_r/',
  );

  assert.equal(parsed.round, 2);
  assert.equal(parsed.area_m2, 78.8);
  assert.equal(parsed.price, 217500);
  assert.equal(parsed.auction_date, '2026-12-02');
  assert.deepEqual(parsed.parcels, ['154/1']);
  assert.deepEqual(parsed.kw, ['ZG1R/00017366/3']);
  assert.ok(parsed.address);
  assert.equal(parsed.kind, 'mieszkalny');
  assert.equal(parsed.address_raw, 'ul. Śródmiejska 21/5');
});

test('zary parseResultDoc won outcome', () => {
  const doc = {
    title: 'Wyniki przetargów przeprowadzonych dnia 21.10.2026r.',
    source_url: 'https://bip.zary.pl/837/6785/Wyniki_przetargow_przeprowadzonych_dnia_21_10_2026r/',
    auction_date: '2026-10-21',
    text: `
INFORMACJA O WYNIKACH PRZETARGÓW
przeprowadzonych dnia 21.10.2026 r.
Sprzedaż lokalu mieszkalnego przy ul. Śródmiejskiej 21/5.
Cena wywoławcza: 217 500,00 zł.
Najwyższa cena osiągnięta w przetargu: 225 000,00 zł.
Nabywcą został Jan Kowalski.
    `,
  };

  const parsed = parseResultDoc(doc);
  assert.equal(parsed.status, 'won');
  assert.equal(parsed.price_reserve, 217500);
  assert.equal(parsed.price_achieved, 225000);
  assert.equal(parsed.auction_date, '2026-10-21');
  assert.equal(parsed.buyer, 'Jan Kowalski');
  assert.ok(parsed.address_raw);
});

test('zary parseResultDoc unresolved outcome', () => {
  const doc = {
    title: 'Wyniki przetargów',
    source_url: 'https://bip.zary.pl/837/1111/',
    auction_date: '2026-04-20',
    text: `
Wyniki przetargów przeprowadzonych w dniu 20.04.2026 r.
Cena wywoławcza: 100 000,00 zł.
Przetarg zakończył się wynikiem negatywnym z powodu braku wpłat wadium.
    `,
  };

  const parsed = parseResultDoc(doc);
  assert.equal(parsed.status, 'unresolved');
  assert.equal(parsed.price_reserve, 100000);
  assert.equal(parsed.price_achieved, null);
  assert.equal(parsed.auction_date, '2026-04-20');
});
