import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseNotice,
  extractAuctionType,
  extractPropertyType,
  extractPrice,
  extractDeposit,
  extractAuctionDate,
  extractParcels,
  extractKw,
  extractArea,
  extractAddress,
} from '../src/cities/zyrardow/parse.js';

test('zyrardow: parseNotice extracts residential announcement with attachment text', () => {
  const samplePdf = `
GN.6840.38.2026.GS
PRZETARG
PREZYDENT MIASTA ŻYRARDOWA
ogłasza przetarg ustny nieograniczony na sprzedaż nieruchomości stanowiących własność Gminy Miasto Żyrardów

Lp. Adres i nr ewid. działki: Bolesława Limanowskiego 22 m. 7 dz. ewid. 2588/17
Pow. (m2): lokal o pow. 22,50 m2
NrKW: PL1Z/00026244/2
Opis: Lokal mieszkalny (I piętro)
Cena wywoławcza: 98 700,00 zł
Wadium: 10 000,00 zł

Przetarg odbędzie się w budynku Urzędu Miasta Żyrardowa w dniu 3 grudnia 2026 roku o godz. 11:00.
Wadium w podanej wysokości należy wpłacić do 30 listopada 2026 roku.
`;

  const parsed = parseNotice({
    id: '119258',
    title: 'Przetarg ustny nieograniczony na sprzedaż nieruchomości – lokal mieszkalny ul. Bolesława Limanowskiego 22 m. 7 (dz. 2588/17)',
    content: '<p>Treść ogłoszenia</p>',
    attachmentsText: samplePdf,
    date: '2026-10-23 12:42:30',
    url: 'https://www.bip.zyrardow.pl/a,119258,ogloszenie.html',
    attachments: [{ name: 'ogloszenie.pdf', url: 'https://www.bip.zyrardow.pl/e,pobierz,get.html?id=163499' }],
  });

  assert.ok(parsed, 'should parse notice');
  assert.equal(parsed.id, 'zyrardow-119258');
  assert.equal(parsed.city, 'Żyrardów');
  assert.equal(parsed.teryt, '1438011');
  assert.equal(parsed.status, 'active');
  assert.equal(parsed.auctionType, 'oral_unlimited');
  assert.equal(parsed.propertyType, 'residential');
  assert.equal(parsed.price, 98700);
  assert.equal(parsed.deposit, 10000);
  assert.equal(parsed.auctionDate, '2026-12-03');
  assert.equal(parsed.kwNumber, 'PL1Z/00026244/2');
  assert.equal(parsed.areaM2, 22.5);
  assert.ok(parsed.parcels.includes('2588/17'));
  assert.ok(parsed.address.includes('Limanowskiego 22 m. 7'));
});

test('zyrardow: parseNotice detects result notice', () => {
  const parsed = parseNotice({
    id: '118001',
    title: 'Wynik przetargu ustnego ograniczony na sprzedaż nieruchomości stanowiącej własność Gminy (ul. Wrzosowa, dz. ewid. 3280/1)',
    content: 'Komisja przetargowa informuje o wyniku przetargu ustnego ograniczonego.',
    attachmentsText: '',
    date: '2025-05-15',
    url: 'https://www.bip.zyrardow.pl/a,118001,wynik.html',
  });

  assert.ok(parsed);
  assert.equal(parsed.status, 'result');
  assert.equal(parsed.auctionType, 'oral_limited');
  assert.ok(parsed.parcels.includes('3280/1'));
  assert.equal(parsed.propertyType, 'land');
});

test('zyrardow: parseNotice ignores unrelated notice', () => {
  const parsed = parseNotice({
    id: '999999',
    title: 'Zawiadomienie o sesji Rady Miasta Żyrardowa',
    content: 'Porządek obrad sesji w dniu 15 listopada 2026 r.',
    attachmentsText: '',
    date: '2026-11-01',
    url: 'https://www.bip.zyrardow.pl/a,999999,sesja.html',
  });

  assert.equal(parsed, null);
});

test('zyrardow: extractAuctionType covers various types', () => {
  assert.equal(extractAuctionType('ogłoszenie o przetargu ustnym nieograniczonym'), 'oral_unlimited');
  assert.equal(extractAuctionType('przetarg ustny ograniczony do właścicieli sąsiednich'), 'oral_limited');
  assert.equal(extractAuctionType('pierwszy przetarg pisemny nieograniczony na sprzedaż'), 'written_unlimited');
  assert.equal(extractAuctionType('rokowania po drugim przetargu zakończonym wynikiem negatywnym'), 'negotiations');
});

test('zyrardow: extractPropertyType classifies correctly', () => {
  assert.equal(extractPropertyType('sprzedaż lokalu mieszkalnego nr 5'), 'residential');
  assert.equal(extractPropertyType('najem lokalu użytkowego przy ulicy'), 'commercial');
  assert.equal(extractPropertyType('sprzedaż działki budowlanej nr 123'), 'land');
  assert.equal(extractPropertyType('sprzedaż garażu murowanego'), 'garage');
});

test('zyrardow: extractPrice and extractDeposit work with spaces and decimals', () => {
  assert.equal(extractPrice('Cena wywoławcza: 125 000,00 zł'), 125000);
  assert.equal(extractPrice('Cena: 45 500 zł netto'), 45500);
  assert.equal(extractDeposit('Wadium wynosi 12 500,00 zł płatne na konto'), 12500);
});

test('zyrardow: extractAuctionDate handles Polish text dates', () => {
  assert.equal(extractAuctionDate('przetarg odbędzie się w dniu 29 sierpnia 2024 roku'), '2024-08-29');
  assert.equal(extractAuctionDate('dnia 15 stycznia 2026 r. o godzinie 10:00'), '2026-01-15');
});

test('zyrardow: extractParcels handles parcel formats', () => {
  const parcels = extractParcels('działka nr 2588/17 oraz dz. ewid. 142/2');
  assert.deepEqual(parcels.sort(), ['142/2', '2588/17'].sort());
});

test('zyrardow: extractKw matches standard format', () => {
  assert.equal(extractKw('Księga wieczysta PL1Z/00026244/2 prowadzona przez sąd'), 'PL1Z/00026244/2');
});

test('zyrardow: extractArea extracts area in square meters', () => {
  assert.equal(extractArea('powierzchnia użytkowa 56,40 m2'), 56.4);
  assert.equal(extractArea('pow. 1250 m2'), 1250);
});
