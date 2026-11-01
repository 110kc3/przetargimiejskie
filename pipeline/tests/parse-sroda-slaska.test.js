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
} from '../src/cities/sroda-slaska/parse.js';

test('sroda-slaska parsePLN', () => {
  assert.equal(parsePLN('371.000,00 zł'), 371000);
  assert.equal(parsePLN('374.710,00 zł'), 374710);
  assert.equal(parsePLN('320 000,00 zł'), 320000);
  assert.equal(parsePLN('brak'), null);
});

test('sroda-slaska parseArea', () => {
  assert.equal(parseArea('86,31 m2'), 86.31);
  assert.equal(parseArea('0,1196 ha'), 1196);
  assert.equal(parseArea('0,1275 ha'), 1275);
  assert.equal(parseArea('xyz'), null);
});

test('sroda-slaska parseDate', () => {
  assert.equal(parseDate('21.07.2026 r.'), '2026-07-21');
  assert.equal(parseDate('25.08.2025'), '2025-08-25');
  assert.equal(parseDate('14 lipca 2026 r.'), '2026-07-14');
  assert.equal(parseDate('2026-10-27'), '2026-10-27');
  assert.equal(parseDate('brak'), null);
});

test('sroda-slaska extractRound', () => {
  assert.equal(extractRound('czwarty ustny przetarg nieograniczony'), 4);
  assert.equal(extractRound('drugi ustny przetarg nieograniczony'), 2);
  assert.equal(extractRound('I ustny przetarg nieograniczony'), 1);
});

test('sroda-slaska extractParcels and extractKw', () => {
  const text = 'działki niezabudowanej nr 105/2 AM-16 oraz działki nr 51/5, KW WR1S/00028911/3';
  assert.deepEqual(extractParcels(text), ['105/2', '51/5']);
  assert.deepEqual(extractKw(text), ['WR1S/00028911/3']);
});

test('sroda-slaska isAnnouncementTitle and isResultTitle', () => {
  assert.equal(isAnnouncementTitle('Ogłoszenie IV ustny przetarg nieograniczony na sprzedaż nieruchomości'), true);
  assert.equal(isAnnouncementTitle('Wykaz nieruchomości przeznaczonej do dzierżawy'), false);
  assert.equal(isAnnouncementTitle('Informacja o wyniku przetargu'), false);

  assert.equal(isResultTitle('Informacja o wyniku przetargu'), true);
  assert.equal(isResultTitle('Ogłoszenie o przetargu'), false);
});

test('sroda-slaska isFlat', () => {
  assert.equal(isFlat('Sprzedaż lokalu mieszkalnego nr 4 przy pl. Wolności 10'), true);
  assert.equal(isFlat('Sprzedaż nieruchomości stanowiących własność gminy'), false);
  assert.equal(isFlat('Przetarg na lokal użytkowy'), false);
});

test('sroda-slaska parseAnnouncement real sample', () => {
  const sample = `
BURMISTRZ ŚRODY ŚLĄSKIEJ
ogłasza drugi ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego nr 4
o pow. użytkowej 86,31 m2, położonego przy pl. Wolności 10 w Środzie Śląskiej,
działka nr 150, KW WR1S/00028911/3.
Cena wywoławcza: 320 000,00 zł.
Przetarg odbędzie się w dniu 25.08.2025 r. o godz. 11:00 w sali Urzędu Miejskiego.
  `;

  const parsed = parseAnnouncement(
    sample,
    'Ogłoszenie II ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego nr 4',
    'https://bip.srodaslaska.pl/index.php?id=173&p1=szczegoly&p2=10006807',
  );

  assert.equal(parsed.round, 2);
  assert.equal(parsed.area_m2, 86.31);
  assert.equal(parsed.price, 320000);
  assert.equal(parsed.auction_date, '2025-08-25');
  assert.deepEqual(parsed.parcels, ['150']);
  assert.deepEqual(parsed.kw, ['WR1S/00028911/3']);
  assert.ok(parsed.address);
  assert.equal(parsed.kind, 'mieszkalny');
});

test('sroda-slaska parseResultDoc won outcome', () => {
  const doc = {
    title: 'Informacja o wyniku przetargu',
    source_url: 'https://bip.srodaslaska.pl/upload/pliki/13Informacja_o_wyniku_przetargu.jpg',
    auction_date: '2026-07-21',
    text: `
Urząd Miejski w Środzie Śląskiej
INFORMACJA O WYNIKU PRZETARGU
Zarządzeniem Burmistrza Środy Śląskiej nr 133/2026 z dnia 16.07.2026 r. została powołana
komisja przetargowa do przeprowadzenia dnia 21.07.2026 r. w sali konferencyjnej Urzędu
Miejskiego w Środzie Śląskiej przy pl. Wolności 1, pierwszego ustnego przetargu
nieograniczonego na sprzedaż działki niezabudowanej nr 105/2 AM-16 położonej w Środzie Śląskiej
— działka nr 105/2 AM-16 o pow. 0,1196 ha, cena wywoławcza 371.000,00 zł
W wyznaczonym terminie wpłacający przystąpił do licytacji działki nr 105/2 AM-16 zaoferował cenę za działkę - 374.710,00 zł i został nabywcą działki: Bank Spółdzielczy w Środzie Śląskiej.
    `,
  };

  const parsed = parseResultDoc(doc);
  assert.equal(parsed.status, 'won');
  assert.equal(parsed.price_reserve, 371000);
  assert.equal(parsed.price_achieved, 374710);
  assert.equal(parsed.auction_date, '2026-07-21');
  assert.deepEqual(parsed.parcels, ['105/2']);
  assert.equal(parsed.buyer, 'Bank Spółdzielczy w Środzie Śląskiej');
});

test('sroda-slaska parseResultDoc unresolved outcome', () => {
  const doc = {
    title: 'Informacja o wyniku przetargu',
    source_url: 'https://bip.srodaslaska.pl/upload/pliki/wynik-neg.jpg',
    auction_date: '2026-04-22',
    text: `
Informacja o wyniku przetargu ustnego na sprzedaż nieruchomości.
Cena wywoławcza: 120 000,00 zł.
Przetarg zakończył się wynikiem negatywnym z powodu braku uczestników, nikt nie wpłacił wadium.
    `,
  };

  const parsed = parseResultDoc(doc);
  assert.equal(parsed.status, 'unresolved');
  assert.equal(parsed.price_reserve, 120000);
  assert.equal(parsed.price_achieved, null);
  assert.equal(parsed.auction_date, '2026-04-22');
});
