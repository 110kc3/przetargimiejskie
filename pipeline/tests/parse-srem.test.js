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
} from '../src/cities/srem/parse.js';

test('srem parsePLN', () => {
  assert.equal(parsePLN('195 000,00 zł'), 195000);
  assert.equal(parsePLN('210 600,00 zł'), 210600);
  assert.equal(parsePLN('80.000,00 zł'), 80000);
  assert.equal(parsePLN('brak'), null);
});

test('srem parseArea', () => {
  assert.equal(parseArea('49, 38'), 49.38);
  assert.equal(parseArea('49,38 m2'), 49.38);
  assert.equal(parseArea('1067 m2'), 1067);
  assert.equal(parseArea('0,1520 ha'), 1520);
  assert.equal(parseArea('xyz'), null);
});

test('srem parseDate', () => {
  assert.equal(parseDate('1 lipca 2026 r.'), '2026-07-01');
  assert.equal(parseDate('26 czerwca 2026 r.'), '2026-06-26');
  assert.equal(parseDate('15.10.2025'), '2025-10-15');
  assert.equal(parseDate('2026-09-11'), '2026-09-11');
  assert.equal(parseDate('brak'), null);
});

test('srem extractRound', () => {
  assert.equal(extractRound('ogłasza pierwszy publiczny przetarg ustny'), 1);
  assert.equal(extractRound('II przetarg ustny'), 2);
  assert.equal(extractRound('trzeci przetarg ustny'), 3);
});

test('srem extractParcels and extractKw', () => {
  const text = 'nr działek 1996/3, 1996/5 pow. działki w m2 1067, nr KW PO1M/00025726/7';
  assert.deepEqual(extractParcels(text), ['1996/3', '1996/5']);
  assert.deepEqual(extractKw(text), ['PO1M/00025726/7']);
});

test('srem isAnnouncementTitle and isResultTitle', () => {
  assert.equal(isAnnouncementTitle('Sprzedaż lokalu mieszkalnego położonego w Śremie przy ul. Modrzewskiego 8/6'), true);
  assert.equal(isAnnouncementTitle('Wykaz nieruchomości przeznaczonej do sprzedaży'), false);
  assert.equal(isAnnouncementTitle('Wyniki przetargów na sprzedaż nieruchomości 2026'), false);

  assert.equal(isResultTitle('Ogłoszenie o wyniku I przetargu na sprzedaż lokalu mieszkalnego'), true);
  assert.equal(isResultTitle('Wyniki przetargów na sprzedaż nieruchomości 2026'), true);
  assert.equal(isResultTitle('Sprzedaż lokalu mieszkalnego'), false);
});

test('srem isFlat', () => {
  assert.equal(isFlat('Sprzedaż lokalu mieszkalnego położonego w Śremie przy ul. Ogrodowej 27/10'), true);
  assert.equal(isFlat('Sprzedaż nieruchomości położonych w rejonie ul. Szkolnej'), false);
  assert.equal(isFlat('Sprzedaż lokalu użytkowego'), false);
});

test('srem parseAnnouncement real sample', () => {
  const sample = `
BURMISTRZ ŚREMU
ogłasza pierwszy publiczny przetarg ustny na sprzedaż lokalu
mieszkalnego położonego w Śremie przy ulicy Andrzeja Frycza
Modrzewskiego 8/6
Śrem, ul. Andrzeja Frycza Modrzewskiego 8/6 0007 Śrem/ 25 5585/54419
Cena wywoławcza 195 000,00 zł
nr KW PO1M/00025726/7 nr działek 1996/3, 1996/5 pow. działki w m2 1067 m2 pow. lokalu w m2 49, 38 + piwnica 6,47
Pierwszy przetarg odbędzie się 1 lipca 2026 r. o godz. 10:00 w siedzibie Urzędu Miejskiego w Śremie, ulica Plac 20 Października 1.
  `;

  const parsed = parseAnnouncement(
    sample,
    'Sprzedaż lokalu mieszkalnego położonego w Śremie przy ul. Andrzeja Frycza Modrzewskiego 8/6',
    'http://bip.srem.pl/public/?id=239452',
  );

  assert.equal(parsed.round, 1);
  assert.equal(parsed.area_m2, 49.38);
  assert.equal(parsed.price, 195000);
  assert.equal(parsed.auction_date, '2026-07-01');
  assert.deepEqual(parsed.parcels, ['1996/3', '1996/5']);
  assert.deepEqual(parsed.kw, ['PO1M/00025726/7']);
  assert.ok(parsed.address);
  assert.equal(parsed.kind, 'mieszkalny');
});

test('srem parseResultDoc won outcome', () => {
  const doc = {
    title: 'Ogłoszenie o wyniku I przetargu na sprzedaż lokalu mieszkalnego',
    pdf_url: 'http://bip.srem.pl/public/getFile?id=626800',
    auction_date: '2026-07-01',
    text: `
BURMISTRZ ŚREMU
informuje, że w dniu 1 lipca 2026 r. o godz. 10:00 w Urzędzie Miejskim w Śremie odbył się pierwszy publiczny, nieograniczony przetarg ustny na sprzedaż nieruchomości lokalowej położonej w Śremie przy ul. Andrzeja Frycza Modrzewskiego 8.
ul. Andrzeja Frycza Modrzewskiego 8/6
cena wywoławcza /netto/: 195 000,00 zł
cena osiągnięta w przetargu: 210 600,00 zł
nabywca nieruchomości: Kamil Dembiński
    `,
  };

  const parsed = parseResultDoc(doc);
  assert.equal(parsed.status, 'won');
  assert.equal(parsed.price_reserve, 195000);
  assert.equal(parsed.price_achieved, 210600);
  assert.equal(parsed.auction_date, '2026-07-01');
  assert.equal(parsed.buyer, 'Kamil Dembiński');
});

test('srem parseResultDoc unresolved outcome', () => {
  const doc = {
    title: 'Ogłoszenie o wyniku przetargu',
    pdf_url: 'http://bip.srem.pl/public/getFile?id=12345',
    auction_date: '2026-05-15',
    text: `
Informacja o wyniku przetargu ustnego na sprzedaż nieruchomości.
Cena wywoławcza: 80 000,00 zł.
Przetarg zakończył się wynikiem negatywnym z powodu braku wpłat wadium.
    `,
  };

  const parsed = parseResultDoc(doc);
  assert.equal(parsed.status, 'unresolved');
  assert.equal(parsed.price_reserve, 80000);
  assert.equal(parsed.price_achieved, null);
  assert.equal(parsed.auction_date, '2026-05-15');
});
