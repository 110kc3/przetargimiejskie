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
} from '../src/cities/gryfino/parse.js';

test('gryfino: parseNotice extracts land auction announcement with attachment text', () => {
  const samplePdf = `
Gryfino, 13.10.2026 r.
BURMISTRZ MIASTA I GMINY GRYFINO
ogłasza drugi przetarg ustny nieograniczony,
na sprzedaż nieruchomości gruntowej, położonej w obrębie ewidencyjnym Pniewo, przeznaczonej pod zabudowę przemysłowo - składową i usługową.

Oznaczenie nieruchomości: dz. nr 470/5 (KW SZ1Y/00072119/8)
Pow. w ha: 1,9361
Cena wywoławcza netto w zł: 1.050.000,00
Wadium w zł: 105.000,00

Przetarg odbędzie się w dniu 15 grudnia 2026 r. o godz. 10:00 w sali nr 36 Urzędu Miasta.
`;

  const parsed = parseNotice({
    id: '92D91814F050463DBA501FEA78861F6B',
    title: 'BURMISTRZ MIASTA I GMINY GRYFINO ogłasza drugi przetarg ustny nieograniczony, na sprzedaż nieruchomości gruntowej, położonej w obrębie ewidencyjnym Pniewo',
    content: '<table><tr><td>Ogłoszenie</td></tr></table>',
    attachmentsText: samplePdf,
    date: '2026-10-13',
    url: 'https://bip.gryfino.pl/chapter_56933.asp?soid=92D91814F050463DBA501FEA78861F6B',
    attachments: [{ name: 'II_Przetarg.pdf', url: 'https://bip.gryfino.pl/UMGryfino/files/II_Przetarg.pdf' }],
  });

  assert.ok(parsed, 'should parse notice');
  assert.equal(parsed.id, 'gryfino-92D91814F050463DBA501FEA78861F6B');
  assert.equal(parsed.city, 'Gryfino');
  assert.equal(parsed.teryt, '3206044');
  assert.equal(parsed.status, 'active');
  assert.equal(parsed.auctionType, 'oral_unlimited');
  assert.equal(parsed.propertyType, 'commercial');
  assert.equal(parsed.price, 1050000);
  assert.equal(parsed.deposit, 105000);
  assert.equal(parsed.auctionDate, '2026-12-15');
  assert.equal(parsed.kwNumber, 'SZ1Y/00072119/8');
  assert.equal(parsed.areaM2, 19361);
  assert.ok(parsed.parcels.includes('470/5'));
});

test('gryfino: parseNotice extracts flat auction announcement', () => {
  const samplePdf = `
Burmistrz Miasta i Gminy Gryfino ogłasza trzeci przetarg ustny nieograniczony na sprzedaż nieruchomości lokalowej mieszkalnej w miejscowości Parsówek.
Lokal mieszkalny nr 2 o pow. użytkowej 48,20 m2, dz. 89.
Cena wywoławcza: 75 000,00 zł. Wadium: 7 500,00 zł.
Przetarg odbędzie się w dniu 20 marca 2026 r.
`;

  const parsed = parseNotice({
    id: 'parsowek-flat',
    title: 'Burmistrz ogłasza trzeci przetarg ustny nieograniczony na sprzedaż nieruchomości lokalowej mieszkalnej w miejscowości Parsówek',
    content: '',
    attachmentsText: samplePdf,
    date: '2026-02-03',
    url: 'https://bip.gryfino.pl/chapter_56933.asp?soid=ABC',
  });

  assert.ok(parsed);
  assert.equal(parsed.propertyType, 'residential');
  assert.equal(parsed.price, 75000);
  assert.equal(parsed.deposit, 7500);
  assert.equal(parsed.auctionDate, '2026-03-20');
  assert.equal(parsed.areaM2, 48.2);
  assert.ok(parsed.parcels.includes('89'));
});

test('gryfino: parseNotice detects wykaz notice', () => {
  const parsed = parseNotice({
    id: 'wykaz-41',
    title: 'Wykaz nr 41/2026 - dot. sprzedaży lokalu w Gryfinie, ul. Zielna 8',
    content: 'Wykaz podaje się do publicznej wiadomości na okres 21 dni.',
    attachmentsText: '',
    date: '2026-10-26',
    url: 'https://bip.gryfino.pl/chapter_56933.asp?soid=6471395F95B049D993A534A7D46ACE7D',
  });

  assert.ok(parsed);
  assert.equal(parsed.status, 'wykaz');
  assert.equal(parsed.propertyType, 'residential');
});

test('gryfino: parseNotice ignores unrelated notice', () => {
  const parsed = parseNotice({
    id: 'sesja-rady',
    title: 'Zawiadomienie o sesji Rady Miejskiej w Gryfinie',
    content: 'Porządek obrad sesji.',
    attachmentsText: '',
    date: '2026-05-10',
    url: 'https://bip.gryfino.pl/chapter_56001.asp',
  });

  assert.equal(parsed, null);
});

test('gryfino: extractAuctionType handles terms', () => {
  assert.equal(extractAuctionType('ogłasza drugi przetarg ustny nieograniczony'), 'oral_unlimited');
  assert.equal(extractAuctionType('przetarg ustny ograniczony do mieszkańców'), 'oral_limited');
  assert.equal(extractAuctionType('przetarg pisemny nieograniczony na zbycie'), 'written_unlimited');
  assert.equal(extractAuctionType('rokowania po przetargach zakończonych wynikiem negatywnym'), 'negotiations');
});

test('gryfino: extractPropertyType classifies accurately', () => {
  assert.equal(extractPropertyType('sprzedaż nieruchomości lokalowej mieszkalnej'), 'residential');
  assert.equal(extractPropertyType('zabudowa przemysłowo - składowa i usługowa'), 'commercial');
  assert.equal(extractPropertyType('działka pod zabudowę mieszkaniową jednorodzinną'), 'land');
  assert.equal(extractPropertyType('garaż jednostanowiskowy'), 'garage');
});

test('gryfino: extractPrice and extractDeposit handle net and gross forms', () => {
  assert.equal(extractPrice('Cena wywoławcza netto w zł: 1.050.000,00'), 1050000);
  assert.equal(extractPrice('Cena wywoławcza wynosi 75 000 zł'), 75000);
  assert.equal(extractDeposit('Wadium w zł: 105.000,00 wpłacone'), 105000);
});

test('gryfino: extractAuctionDate finds dates', () => {
  assert.equal(extractAuctionDate('w dniu 15 grudnia 2026 r.'), '2026-12-15');
  assert.equal(extractAuctionDate('dnia 20 marca 2026 r.'), '2026-03-20');
});

test('gryfino: extractParcels finds parcel numbers', () => {
  const parcels = extractParcels('działka nr 470/5 oraz dz. nr 12/3');
  assert.deepEqual(parcels.sort(), ['12/3', '470/5'].sort());
});

test('gryfino: extractKw matches standard format', () => {
  assert.equal(extractKw('KW SZ1Y/00072119/8 prowadzona przez sąd'), 'SZ1Y/00072119/8');
});
