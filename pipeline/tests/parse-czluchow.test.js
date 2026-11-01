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
  isAnnouncement,
  isResult,
  isFlat,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/czluchow/parse.js';

test('czluchow parsePLN', () => {
  assert.equal(parsePLN('120 000,00 zł'), 120000);
  assert.equal(parsePLN('350.000 zł'), 350000);
  assert.equal(parsePLN('1 250 000 PLN'), 1250000);
  assert.equal(parsePLN('brak'), null);
});

test('czluchow parseArea', () => {
  assert.equal(parseArea('41,20 m2'), 41.2);
  assert.equal(parseArea('103,59 m²'), 103.59);
  assert.equal(parseArea('0,0905 ha'), 0.0905);
  assert.equal(parseArea('abc'), null);
});

test('czluchow parseDate', () => {
  assert.equal(parseDate('15 października 2026 r.'), '2026-10-15');
  assert.equal(parseDate('2026-11-20'), '2026-11-20');
  assert.equal(parseDate('02.12.2025'), '2025-12-02');
  assert.equal(parseDate('brak terminu'), null);
});

test('czluchow extractRound', () => {
  assert.equal(extractRound('I przetarg ustny nieograniczony'), 1);
  assert.equal(extractRound('II przetarg ustny nieograniczony'), 2);
  assert.equal(extractRound('III przetarg ustny nieograniczony'), 3);
  assert.equal(extractRound('IV przetarg ustny nieograniczony'), 4);
  assert.equal(extractRound('ogłoszenie kolejnego przetargu'), 2);
  assert.equal(extractRound('ogłoszenie o przetargu'), 1);
});

test('czluchow extractParcels and extractKw', () => {
  const text = 'działce nr 3668 (obręb nr 64) o pow. 0,0905 ha, KW SL1Z/00021650/0';
  assert.deepEqual(extractParcels(text), ['3668']);
  assert.deepEqual(extractKw(text), ['SL1Z/00021650/0']);
});

test('czluchow isAnnouncement and isResult', () => {
  assert.equal(isAnnouncement('I przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego'), true);
  assert.equal(isAnnouncement('Wykaz nieruchomości przeznaczonych do sprzedaży'), false);
  assert.equal(isAnnouncement('Informacja o wyniku przetargu ustnego'), false);

  assert.equal(isResult('Informacja o wynikach przetargu'), true);
  assert.equal(isResult('Protokół z rozstrzygnięcia przetargu'), true);
  assert.equal(isResult('I przetarg ustny nieograniczony'), false);
});

test('czluchow isFlat', () => {
  assert.equal(isFlat('I przetarg na sprzedaż lokalu mieszkalnego przy ul. Słowackiego'), true);
  assert.equal(isFlat('Przetarg na lokal użytkowy'), false);
  assert.equal(isFlat('Przetarg na działkę niezabudowaną'), false);
});

test('czluchow parseAnnouncement full sample', () => {
  const sample = `
Burmistrz Miasta Człuchowa ogłasza I przetarg ustny nieograniczony na sprzedaż:
Lokalu mieszkalnego, położonego w Człuchowie przy ulicy Słowackiego 18/2, o powierzchni
użytkowej 41,20 m2, z udziałem w działce nr 3668 (obręb nr 64) o pow. 0,0905 ha, w budynku
wielorodzinnym, dla którego prowadzona jest księga wieczysta SL1Z/00021650/0.
Cena wywoławcza: 120 000,00 zł.
Wadium: 12 000,00 zł.
Przetarg odbędzie się w dniu 15 października 2026 r. o godz. 10:00 w Urzędzie Miejskim w Człuchowie.
  `;
  const parsed = parseAnnouncement(
    sample,
    'I przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego',
    'https://bip.czluchow.pl/artykul/sample',
  );

  assert.equal(parsed.round, 1);
  assert.equal(parsed.area_m2, 41.2);
  assert.equal(parsed.price, 120000);
  assert.equal(parsed.auction_date, '2026-10-15');
  assert.deepEqual(parsed.parcels, ['3668']);
  assert.deepEqual(parsed.kw, ['SL1Z/00021650/0']);
  assert.ok(parsed.address);
  assert.equal(parsed.kind, 'mieszkalny');
});

test('czluchow parseResultDoc won outcome', () => {
  const doc = {
    title: 'Informacja o wynikach przetargu ustnego',
    pdf_url: 'https://bip.czluchow.pl/wynik.pdf',
    auction_date: '2026-10-22',
    text: `
Informacja o wyniku przetargu ustnego nieograniczonego na sprzedaż lokalu mieszkalnego
położonego w Człuchowie przy ulicy Szczecińskiej 7/5.
Cena wywoławcza: 150 000,00 zł.
Najwyższa cena osiągnięta w przetargu: 165 000,00 zł.
Nabywcą został: Jan Kowalski.
    `,
  };
  const parsed = parseResultDoc(doc);
  assert.equal(parsed.status, 'won');
  assert.equal(parsed.price_reserve, 150000);
  assert.equal(parsed.price_achieved, 165000);
  assert.equal(parsed.buyer, 'Jan Kowalski');
  assert.equal(parsed.auction_date, '2026-10-22');
});

test('czluchow parseResultDoc unresolved outcome', () => {
  const doc = {
    title: 'Informacja o wynikach przetargu ustnego',
    pdf_url: 'https://bip.czluchow.pl/wynik-neg.pdf',
    auction_date: '2026-10-22',
    text: `
Informacja o wyniku przetargu na sprzedaż nieruchomości przy ul. Batorego.
Cena wywoławcza: 200 000,00 zł.
Przetarg zakończył się wynikiem negatywnym z powodu braku uczestników. Nikt nie przystąpił do przetargu.
    `,
  };
  const parsed = parseResultDoc(doc);
  assert.equal(parsed.status, 'unresolved');
  assert.equal(parsed.price_reserve, 200000);
  assert.equal(parsed.price_achieved, null);
});
