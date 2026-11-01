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
} from '../src/cities/sochaczew/parse.js';

test('sochaczew parsePLN', () => {
  assert.equal(parsePLN('45 000,00 zł'), 45000);
  assert.equal(parsePLN('760 000,00 zł'), 760000);
  assert.equal(parsePLN('27 000 zł'), 27000);
  assert.equal(parsePLN('brak'), null);
});

test('sochaczew parseArea', () => {
  assert.equal(parseArea('47,90 m²'), 47.9);
  assert.equal(parseArea('0,0700 ha'), 0.07);
  assert.equal(parseArea('10,75 m2'), 10.75);
  assert.equal(parseArea('xyz'), null);
});

test('sochaczew parseDate', () => {
  assert.equal(parseDate('22.10.2026 r.'), '2026-10-22');
  assert.equal(parseDate('14 lutego 2025 r.'), '2025-02-14');
  assert.equal(parseDate('2026-10-22'), '2026-10-22');
  assert.equal(parseDate('brak terminu'), null);
});

test('sochaczew extractRound', () => {
  assert.equal(extractRound('I przetarg ustny nieograniczony'), 1);
  assert.equal(extractRound('II przetarg ustny nieograniczony'), 2);
  assert.equal(extractRound('III przetarg ustny nieograniczony'), 3);
  assert.equal(extractRound('kolejny przetarg ustny'), 2);
});

test('sochaczew extractParcels and extractKw', () => {
  const text = 'działek nr 2526/2, 3366/4, 3368 położonych przy ul. Zamiejskiej, KW PL1O/00016289/8';
  assert.deepEqual(extractParcels(text), ['2526/2', '3366/4', '3368']);
  assert.deepEqual(extractKw(text), ['PL1O/00016289/8']);
});

test('sochaczew isAnnouncementTitle and isResultTitle', () => {
  assert.equal(isAnnouncementTitle('I przetarg ustny nieograniczony na sprzedaż prawa własności działek'), true);
  assert.equal(isAnnouncementTitle('Zawiadomienie Wojewody Mazowieckiego o wszczęciu postępowania'), false);
  assert.equal(isAnnouncementTitle('Zgromadzenie publiczne'), false);

  assert.equal(isResultTitle('Informacja o wyniku przetargu ustnego'), true);
  assert.equal(isResultTitle('Rozstrzygnięcie przetargu ustnego'), true);
  assert.equal(isResultTitle('I przetarg ustny nieograniczony'), false);
});

test('sochaczew isFlat', () => {
  assert.equal(isFlat('sprzedaż prawa własności nieruchomości lokalowej przy al. 600-lecia'), true);
  assert.equal(isFlat('sprzedaż lokalu mieszkalnego nr 11'), true);
  assert.equal(isFlat('sprzedaż lokalu użytkowego nr 2'), false);
  assert.equal(isFlat('sprzedaż prawa własności działek nr 2526/2'), false);
});

test('sochaczew parseAnnouncement real OCR sample', () => {
  const sample = `
BURMISTRZ MIASTA SOCHACZEWA ogłasza I przetarg ustny nieograniczony na sprzedaż prawa własności nieruchomości:
Lokal mieszkalny nr 11 położony przy al. 600-lecia 23A/11 w Sochaczewie o powierzchni użytkowej 47,90 m2,
działka numer 1386/6, KW PL1O/00016289/8.
Cena wywoławcza: 180 000,00 zł.
Wadium: 18 000,00 zł.
Przetarg odbędzie się w dniu 22.10.2026 r. o godz. 10:00 w siedzibie Urzędu Miejskiego w Sochaczewie.
  `;
  const parsed = parseAnnouncement(
    sample,
    'I przetarg ustny nieograniczony na sprzedaż prawa własności lokalu mieszkalnego przy al. 600-lecia 23A/11',
    'https://bip.sochaczew.pl/aktualnosci/sample.html',
  );

  assert.equal(parsed.round, 1);
  assert.equal(parsed.area_m2, 47.9);
  assert.equal(parsed.price, 180000);
  assert.equal(parsed.auction_date, '2026-10-22');
  assert.deepEqual(parsed.parcels, ['1386/6']);
  assert.deepEqual(parsed.kw, ['PL1O/00016289/8']);
  assert.ok(parsed.address);
  assert.equal(parsed.kind, 'mieszkalny');
});

test('sochaczew parseResultDoc won outcome', () => {
  const doc = {
    title: 'Informacja o wyniku przetargu ustnego',
    pdf_url: 'https://bip.sochaczew.pl/files/wynik.pdf',
    auction_date: '2026-10-22',
    text: `
Informacja o wyniku przetargu ustnego nieograniczonego na sprzedaż lokalu mieszkalnego przy al. 600-lecia 23A.
Cena wywoławcza: 180 000,00 zł.
Najwyższa cena osiągnięta w przetargu: 195 000,00 zł.
Nabywcą został: Tomasz Lewandowski.
    `,
  };
  const parsed = parseResultDoc(doc);
  assert.equal(parsed.status, 'won');
  assert.equal(parsed.price_reserve, 180000);
  assert.equal(parsed.price_achieved, 195000);
  assert.equal(parsed.buyer, 'Tomasz Lewandowski');
  assert.equal(parsed.auction_date, '2026-10-22');
});

test('sochaczew parseResultDoc unresolved outcome', () => {
  const doc = {
    title: 'Informacja o wyniku przetargu ustnego',
    pdf_url: 'https://bip.sochaczew.pl/files/wynik-neg.pdf',
    auction_date: '2026-10-22',
    text: `
Informacja o wyniku przetargu na sprzedaż nieruchomości przy ul. Zamiejskiej.
Cena wywoławcza: 45 000,00 zł.
Przetarg zakończył się wynikiem negatywnym z powodu braku uczestników. Nikt nie przystąpił do przetargu, nie wyłoniono nabywcy.
    `,
  };
  const parsed = parseResultDoc(doc);
  assert.equal(parsed.status, 'unresolved');
  assert.equal(parsed.price_reserve, 45000);
  assert.equal(parsed.price_achieved, null);
  assert.equal(parsed.auction_date, '2026-10-22');
});
