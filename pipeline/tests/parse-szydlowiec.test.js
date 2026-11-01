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
} from '../src/cities/szydlowiec/parse.js';

test('szydlowiec parsePLN', () => {
  assert.equal(parsePLN('109 700,00zł.'), 109700);
  assert.equal(parsePLN('85 850,00 zł'), 85850);
  assert.equal(parsePLN('50.000,00 zł'), 50000);
  assert.equal(parsePLN('brak'), null);
});

test('szydlowiec parseArea', () => {
  assert.equal(parseArea('39,00m2'), 39);
  assert.equal(parseArea('0,0344 ha'), 344);
  assert.equal(parseArea('233m2'), 233);
  assert.equal(parseArea('xyz'), null);
});

test('szydlowiec parseDate', () => {
  assert.equal(parseDate('11 marca 2021r.'), '2021-03-11');
  assert.equal(parseDate('18 GRUDNIA 2025 R.'), '2025-12-18');
  assert.equal(parseDate('15.05.2025'), '2025-05-15');
  assert.equal(parseDate('2026-10-30'), '2026-10-30');
  assert.equal(parseDate('brak'), null);
});

test('szydlowiec extractRound', () => {
  assert.equal(extractRound('OGŁASZA PRZETARG USTNY NIEOGRANICZONY'), 1);
  assert.equal(extractRound('drugi przetarg ustny'), 2);
  assert.equal(extractRound('III przetarg ustny nieograniczony'), 3);
});

test('szydlowiec extractParcels and extractKw', () => {
  const text = 'działki nr 5742/6 wraz z udziałem 39/900 części, księgą wieczystą nr RA1S/00009767/2';
  assert.deepEqual(extractParcels(text), ['5742/6']);
  assert.deepEqual(extractKw(text), ['RA1S/00009767/2']);
});

test('szydlowiec isAnnouncementTitle and isResultTitle', () => {
  assert.equal(isAnnouncementTitle('Ogłoszenie przetargu na sprzedaż lokalu mieszkalnego'), true);
  assert.equal(isAnnouncementTitle('Informacja o wywieszeniu wykazu nieruchomości'), false);
  assert.equal(isAnnouncementTitle('Informacja o wyniku przetargu'), false);

  assert.equal(isResultTitle('Informacja o wyniku przetargu ustnego ograniczonego'), true);
  assert.equal(isResultTitle('Ogłoszenie przetargu'), false);
});

test('szydlowiec isFlat', () => {
  assert.equal(isFlat('Ogłoszenie przetargu na sprzedaż lokalu mieszkalnego'), true);
  assert.equal(isFlat('Sprzedaż nieruchomości gruntowej'), false);
  assert.equal(isFlat('Przetarg na lokal użytkowy'), false);
});

test('szydlowiec parseAnnouncement real sample', () => {
  const sample = `
BURMISTRZ SZYDŁOWCA OGŁASZA PRZETARG USTNY NIEOGRANICZONY
na sprzedaż lokalu mieszkalnego
Do sprzedaży przeznacza się lokal mieszkalny Nr 1 położony na parterze w budynku wielomieszkaniowym przy ul. Staszica 13 w Szydłowcu, składający się z dwóch pokoi, kuchni, przedpokoju oraz łazienki o łącznej pow. użytk. 39,00m2 wraz z udziałem 39/900 części do działki nr 5742/6 o pow. 233m2, obj. księgą wieczystą nr RA1S/00009767/2.
Cena wywoławcza 109 700,00zł.
Przetarg odbędzie się w dniu 11 marca 2021r. o godz. 10:00 w Urzędzie Miejskim w Szydłowcu Pl. Rynek Wielki 1.
  `;
  const parsed = parseAnnouncement(
    sample,
    'Ogłoszenie przetargu na sprzedaż lokalu mieszkalnego',
    'https://bip.szydlowiec.pl/44/2232/Ogloszenie_przetargu_na_sprzedaz_lokalu_mieszkalnego/',
  );

  assert.equal(parsed.round, 1);
  assert.equal(parsed.area_m2, 39);
  assert.equal(parsed.price, 109700);
  assert.equal(parsed.auction_date, '2021-03-11');
  assert.deepEqual(parsed.parcels, ['5742/6']);
  assert.deepEqual(parsed.kw, ['RA1S/00009767/2']);
  assert.ok(parsed.address);
  assert.equal(parsed.kind, 'mieszkalny');
});

test('szydlowiec parseResultDoc won outcome', () => {
  const doc = {
    title: 'Informacja o wyniku przetargu',
    source_url: 'https://bip.szydlowiec.pl/44/3983/Informacja_o_wyniku_przetargu/',
    auction_date: '2025-12-18',
    text: `
INFORMACJĘ O WYNIKU PRZETARGU USTNEGO OGRANICZONEGO
KTÓRY ODBYŁ SIĘ W DNIU 18 GRUDNIA 2025 R. O GODZ. 10.00
W SIEDZIBIE URZĘDU MIEJSKIEGO W SZYDŁOWCU Pl. RYNEK WIELKI 1, 26-500 SZYDŁOWIEC
przetarg ustny ograniczony na sprzedaż nieruchomości gruntowej położonej w Szydłowcu oznaczonej numerem działki 4031/6 o powierzchni 0,0344 ha, dla której IV Wydział Ksiąg Wieczystych prowadzi księgę wieczystą nr RA1S/00031371/2.
cena wywoławcza nieruchomości: 85 000,00 zł. (brutto)
najwyższa cena osiągnięta w przetargu: 85 850,00zł. (brutto)
nabywca nieruchomości: BIGHOUSE Sp. z o.o. , ul. Świętokrzyska 30/63 , 00-116 Warszawa
    `,
  };

  const parsed = parseResultDoc(doc);
  assert.equal(parsed.status, 'won');
  assert.equal(parsed.price_reserve, 85000);
  assert.equal(parsed.price_achieved, 85850);
  assert.equal(parsed.auction_date, '2025-12-18');
  assert.deepEqual(parsed.parcels, ['4031/6']);
  assert.deepEqual(parsed.kw, ['RA1S/00031371/2']);
  assert.equal(parsed.buyer, 'BIGHOUSE Sp. z o.o. , ul. Świętokrzyska 30/63 , 00-116 Warszawa');
});

test('szydlowiec parseResultDoc unresolved outcome', () => {
  const doc = {
    title: 'Informacja o wyniku przetargu ustnego nieograniczonego',
    source_url: 'https://bip.szydlowiec.pl/44/1234/test/',
    auction_date: '2025-05-15',
    text: `
Przetarg przeprowadzony w dniu 15 maja 2025 r. na sprzedaż działki nr 500/2.
Cena wywoławcza: 50 000,00 zł.
Przetarg zakończył się wynikiem negatywnym z powodu braku wpłat wadium.
    `,
  };

  const parsed = parseResultDoc(doc);
  assert.equal(parsed.status, 'unresolved');
  assert.equal(parsed.price_reserve, 50000);
  assert.equal(parsed.price_achieved, null);
  assert.equal(parsed.auction_date, '2025-05-15');
});
