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
} from '../src/cities/wrzesnia/parse.js';

test('wrzesnia parsePLN', () => {
  assert.equal(parsePLN('210 000,00 zł'), 210000);
  assert.equal(parsePLN('102 010 ,00 zł'), 102010);
  assert.equal(parsePLN('101 0 0 0 ,00 zł'), 101000);
  assert.equal(parsePLN('brak'), null);
});

test('wrzesnia parseArea', () => {
  assert.equal(parseArea('54,89 m2'), 54.89);
  assert.equal(parseArea('27,30 m²'), 27.3);
  assert.equal(parseArea('0,2146 ha'), 2146);
  assert.equal(parseArea('xyz'), null);
});

test('wrzesnia parseDate', () => {
  assert.equal(parseDate('26.11.2026 r.'), '2026-11-26');
  assert.equal(parseDate('17 września 2026 r.'), '2026-09-17');
  assert.equal(parseDate('12.09.2025'), '2025-09-12');
  assert.equal(parseDate('2026-10-20'), '2026-10-20');
  assert.equal(parseDate('brak'), null);
});

test('wrzesnia extractRound', () => {
  assert.equal(extractRound('ogłasza trzeci przetarg ustny nieograniczony'), 3);
  assert.equal(extractRound('czwartym przetargu ustnym'), 4);
  assert.equal(extractRound('pierwszy przetarg ustny'), 1);
});

test('wrzesnia extractParcels and extractKw', () => {
  const text = 'działce nr geod. 945/11 o pow. 0,2146 ha, zapisanej w księdze wieczystej nr PO1F/00012345/6';
  assert.deepEqual(extractParcels(text), ['945/11']);
  assert.deepEqual(extractKw(text), ['PO1F/00012345/6']);
});

test('wrzesnia isAnnouncementTitle and isResultTitle', () => {
  assert.equal(isAnnouncementTitle('Ogłoszenie o trzecim przetargu ustnym nieograniczonym na sprzedaż nieruchomości lokalowej'), true);
  assert.equal(isAnnouncementTitle('Wykaz nieruchomości przeznaczonej do dzierżawy'), false);
  assert.equal(isAnnouncementTitle('Informacja o wynikach przetargu z dnia 17 września 2026 r.'), false);

  assert.equal(isResultTitle('Informacja o wynikach przetargu z dnia 17 września 2026 r.'), true);
  assert.equal(isResultTitle('Ogłoszenie o przetargu'), false);
});

test('wrzesnia isFlat', () => {
  assert.equal(isFlat('Ogłoszenie na sprzedaż nieruchomości lokalowej przy ul. Przemysłowej 5A/9'), true);
  assert.equal(isFlat('Sprzedaż nieruchomości gruntowej położonej w Bierzglinie'), false);
  assert.equal(isFlat('Przetarg na lokal użytkowy'), false);
});

test('wrzesnia parseAnnouncement real sample', () => {
  const sample = `
BURMISTRZ MIASTA I GMINY WRZEŚNIA
ogłasza trzeci przetarg ustny nieograniczony na sprzedaż następującej nieruchomości lokalowej:
1. Adres nieruchomości: ul. Przemysłowa 5A/9, 62-300 Września
2. Opis nieruchomości: Lokal mieszkalny nr 9, o pow. użytkowej 54,89 m2, składający się z 2 pokoi, kuchni, łazienki oraz 2 przedpokoi, położony we Wrześni w budynku przy ul. Przemysłowej 5A wraz z udziałem w gruncie wynoszącym 5489/47255 części w działce nr geod. 945/11 o pow. 0,2146 ha, zapisanej w księdze wieczystej nr PO1F/00012345/6.
6. Miejsce i termin przetargu: Przetarg odbędzie się 26.11.2026 r. o godz. 9.00.
7. Cena wywoławcza: Cena wywoławcza lokalu nr 9 wynosi 210 000,00 zł.
  `;

  const parsed = parseAnnouncement(
    sample,
    'Ogłoszenie o trzecim przetargu ustnym nieograniczonym na sprzedaż nieruchomości lokalowej przy ul. Przemysłowej 5A/9',
    'https://bip.wrzesnia.pl/?bip=2&cid=216&id=15325',
  );

  assert.equal(parsed.round, 3);
  assert.equal(parsed.area_m2, 54.89);
  assert.equal(parsed.price, 210000);
  assert.equal(parsed.auction_date, '2026-11-26');
  assert.deepEqual(parsed.parcels, ['945/11']);
  assert.deepEqual(parsed.kw, ['PO1F/00012345/6']);
  assert.ok(parsed.address);
  assert.equal(parsed.kind, 'mieszkalny');
});

test('wrzesnia parseResultDoc won outcome', () => {
  const doc = {
    title: 'Informacja o wynikach przetargu z dnia 17 września 2026 r.',
    source_url: 'https://bip.wrzesnia.pl/?bip=2&cid=216&id=15246',
    auction_date: '2026-09-17',
    text: `
INFORMACJA O WYNIKACH PRZETARGU
w dniu 17 września 2026 r. odbył się w Urzędzie Miasta i Gminy we Wrześni pierwszy przetarg ustny nieograniczony na sprzedaż następującej nieruchomości lokalowej:
Lokal mieszkalny nr 6, o pow. użytkowej 27,30 m² , składający się z 1 pokoju i kuchni, położony we Wrześni w budynku przy ul. Harcerskiej 17 wraz z udziałem w gruncie w działce nr geod. 1500/2.
Cena wywoławcza nieruchomości wynosiła 101 000,00 zł , a w przetargu osiągnięto cenę 102 010,00 zł .
Nabywcą nieruchomości lokalowej został Pan Roman Stachowiak.
    `,
  };

  const parsed = parseResultDoc(doc);
  assert.equal(parsed.status, 'won');
  assert.equal(parsed.price_reserve, 101000);
  assert.equal(parsed.price_achieved, 102010);
  assert.equal(parsed.auction_date, '2026-09-17');
  assert.deepEqual(parsed.parcels, ['1500/2']);
  assert.equal(parsed.buyer, 'Pan Roman Stachowiak');
  assert.ok(parsed.address_raw);
});

test('wrzesnia parseResultDoc unresolved outcome', () => {
  const doc = {
    title: 'Informacja o wynikach przetargu',
    source_url: 'https://bip.wrzesnia.pl/?bip=2&cid=216&id=11111',
    auction_date: '2026-05-10',
    text: `
Informacja o wyniku przetargu ustnego na sprzedaż nieruchomości.
Cena wywoławcza: 150 000,00 zł.
Przetarg zakończył się wynikiem negatywnym z powodu braku ofert.
    `,
  };

  const parsed = parseResultDoc(doc);
  assert.equal(parsed.status, 'unresolved');
  assert.equal(parsed.price_reserve, 150000);
  assert.equal(parsed.price_achieved, null);
  assert.equal(parsed.auction_date, '2026-05-10');
});
