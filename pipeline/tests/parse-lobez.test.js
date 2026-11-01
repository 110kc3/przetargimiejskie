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
} from '../src/cities/lobez/parse.js';

test('lobez parsePLN', () => {
  assert.equal(parsePLN('95.000,00 zł'), 95000);
  assert.equal(parsePLN('120 000 zł'), 120000);
  assert.equal(parsePLN('brak'), null);
});

test('lobez parseArea', () => {
  assert.equal(parseArea('39,35 m²'), 39.35);
  assert.equal(parseArea('13,81 m2'), 13.81);
  assert.equal(parseArea('0,0984 ha'), 0.0984);
  assert.equal(parseArea('xyz'), null);
});

test('lobez parseDate', () => {
  assert.equal(parseDate('18 grudnia 2025 r.'), '2025-12-18');
  assert.equal(parseDate('23 września 2025 r.'), '2025-09-23');
  assert.equal(parseDate('2026-01-16'), '2026-01-16');
  assert.equal(parseDate('brak'), null);
});

test('lobez extractRound', () => {
  assert.equal(extractRound('Ogłoszenie o I przetargu ustnym nieograniczonym'), 1);
  assert.equal(extractRound('Ogłoszenie o II przetargu ustnym nieograniczonym'), 2);
  assert.equal(extractRound('Informacja o wyniku trzeciego przetargu'), 3);
  assert.equal(extractRound('Ogłoszenie pierwszego przetargu'), 1);
});

test('lobez extractParcels and extractKw', () => {
  const text = 'działce oznaczonej numerem geodezyjnym 215/1, KW numer SZ1L/00013076/3';
  assert.deepEqual(extractParcels(text), ['215/1']);
  assert.deepEqual(extractKw(text), ['SZ1L/00013076/3']);
});

test('lobez isAnnouncementTitle and isResultTitle', () => {
  assert.equal(isAnnouncementTitle('Ogłoszenie o I przetargu ustnym nieograniczonym na zbycie lokalu'), true);
  assert.equal(isAnnouncementTitle('Oddanie w dzierżawę nieruchomości'), false);
  assert.equal(isAnnouncementTitle('Informacja o wyniku przetargu'), false);

  assert.equal(isResultTitle('Informacja o wynikach przetargów, które odbyły się w dniu 18 grudnia 2025 r.'), true);
  assert.equal(isResultTitle('Ogłoszenie o I przetargu'), false);
});

test('lobez isFlat', () => {
  assert.equal(isFlat('Sprzedaż niewyodrębnionego lokalu mieszkalnego nr 2 przy ul. Niepodległości'), true);
  assert.equal(isFlat('Sprzedaż lokalu użytkowego nr 5'), false);
  assert.equal(isFlat('Sprzedaż nieruchomości gruntowej zabudowanej'), false);
});

test('lobez parseAnnouncement real sample', () => {
  const sample = `
Burmistrz Łobza ogłasza pierwszy przetarg ustny nieograniczony na zbycie niewyodrębnionego lokalu
mieszkalnego nr 2 o powierzchni użytkowej 39,35 m², znajdującego się w budynku mieszkalnym nr 26
położonym przy ulicy Niepodległości w Łobzie wraz z przynależnym pomieszczeniem gospodarczym
o powierzchni użytkowej 5,44 m2, zlokalizowanym na działce oznaczonej numerem geodezyjnym 215/1,
położonej w obrębie 1 miasta Łobez, dla której Sąd Rejonowy w Łobzie IV Wydział Ksiąg Wieczystych
prowadzi księgę wieczystą numer SZ1L/00013076/3.

Cena wywoławcza niewyodrębnionego lokalu mieszkalnego do przetargu wynosi:
95.000,00 zł
Przetarg odbędzie się w dniu 24 października 2025 r. o godz. 10:00 w Urzędzie Miejskim w Łobzie.
  `;
  const parsed = parseAnnouncement(
    sample,
    'Ogłoszenie o I przetargu ustnym nieograniczonym na zbycie lokalu mieszkalnego nr 2',
    'https://bip.lobez.pl/artykul-sample.html',
  );

  assert.equal(parsed.round, 1);
  assert.equal(parsed.area_m2, 39.35);
  assert.equal(parsed.price, 95000);
  assert.equal(parsed.auction_date, '2025-10-24');
  assert.deepEqual(parsed.parcels, ['215/1']);
  assert.deepEqual(parsed.kw, ['SZ1L/00013076/3']);
  assert.ok(parsed.address);
  assert.equal(parsed.kind, 'mieszkalny');
});

test('lobez parseResultDoc won outcome', () => {
  const doc = {
    title: 'Informacja o wynikach przetargów z dnia 18 grudnia 2025 r.',
    pdf_url: 'https://bip.lobez.pl/files/file_add/download/6014_informacja.pdf',
    auction_date: '2025-12-18',
    text: `
Informacja o wynikach przetargów, które odbyły się w dniu 18 grudnia 2025 r. w Urzędzie Miejskim w Łobzie.
Oznaczenie nieruchomości: lokal mieszkalny nr 2 przy ul. Niepodległości 26.
Cena wywoławcza netto: 95.000,00 zł.
Najwyższa cena uzyskana: 102.000,00 zł.
Imię i nazwisko nabywców/dzierżawców: Anna i Piotr Kowalscy.
    `,
  };
  const parsed = parseResultDoc(doc);
  assert.equal(parsed.status, 'won');
  assert.equal(parsed.price_reserve, 95000);
  assert.equal(parsed.price_achieved, 102000);
  assert.equal(parsed.buyer, 'Anna i Piotr Kowalscy');
  assert.equal(parsed.auction_date, '2025-12-18');
});

test('lobez parseResultDoc unresolved outcome', () => {
  const doc = {
    title: 'Informacja o wynikach przetargów z dnia 23 września 2025 r.',
    pdf_url: 'https://bip.lobez.pl/files/file_add/download/5715_informacja.pdf',
    auction_date: '2025-09-23',
    text: `
Informacja o wynikach przetargów z dnia 23 września 2025 r.
Lokal mieszkalny nr 5, ul. Kraszewskiego 28.
Cena wywoławcza netto: 45.000,00 zł.
Brak uczestników przetargu. Nikt nie przystąpił do przetargu, nie wyłoniono nabywcy.
    `,
  };
  const parsed = parseResultDoc(doc);
  assert.equal(parsed.status, 'unresolved');
  assert.equal(parsed.price_reserve, 45000);
  assert.equal(parsed.price_achieved, null);
  assert.equal(parsed.auction_date, '2025-09-23');
});
