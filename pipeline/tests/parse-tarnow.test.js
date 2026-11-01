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
} from '../src/cities/tarnow/parse.js';

test('tarnow: parseNotice extracts land auction from harmonogram entry', () => {
  const sampleContent = `
Sprzedaż nieruchomości ul. Grochowska dz. 355/11 (obręb 281)
Przeznaczenie: Studium M2 – teren zabudowy mieszkaniowej niskiej intensywnej
Powierzchnia: 1584 m²
Termin sprzedaży: 23.09.2026 r.
`;

  const parsed = parseNotice({
    id: 'harmonogram-4',
    title: 'Sprzedaż nieruchomości ul. Grochowska dz. 355/11 (obręb 281)',
    content: sampleContent,
    attachmentsText: '',
    date: null,
    url: 'https://www.tarnow.pl/harmonogram',
  });

  assert.ok(parsed, 'should parse notice');
  assert.equal(parsed.id, 'tarnow-harmonogram-4');
  assert.equal(parsed.city, 'Tarnów');
  assert.equal(parsed.teryt, '1263011');
  assert.equal(parsed.status, 'active');
  assert.equal(parsed.propertyType, 'land');
  assert.equal(parsed.auctionDate, '2026-09-23');
  assert.equal(parsed.areaM2, 1584);
  assert.ok(parsed.parcels.includes('355/11'));
  assert.ok(parsed.address.includes('Grochowska'));
});

test('tarnow: parseNotice extracts industrial/commercial land auction', () => {
  const sampleContent = `
Sprzedaż nieruchomości ul. Strefowa dz. 312 obr. 74
Przeznaczenie: 5P/U – teren obiektów produkcyjnych, składów i magazynów
Powierzchnia: 19359 m²
Termin sprzedaży: 08.12.2026 r.
`;

  const parsed = parseNotice({
    id: 'harmonogram-2',
    title: 'Sprzedaż nieruchomości ul. Strefowa dz. 312 obr. 74',
    content: sampleContent,
    attachmentsText: '',
    date: null,
    url: 'https://www.tarnow.pl/harmonogram',
  });

  assert.ok(parsed);
  assert.equal(parsed.propertyType, 'commercial');
  assert.equal(parsed.auctionDate, '2026-12-08');
  assert.equal(parsed.areaM2, 19359);
  assert.ok(parsed.parcels.includes('312'));
  assert.ok(parsed.address.includes('Strefowa'));
});

test('tarnow: parseNotice ignores unrelated notice', () => {
  const parsed = parseNotice({
    id: 'teatr-solskiego',
    title: 'Premiera w Teatrze im. Ludwika Solskiego w Tarnowie',
    content: 'Zapraszamy na spektakl teatralny.',
    attachmentsText: '',
    date: '2026-10-01',
    url: 'https://www.tarnow.pl/teatr',
  });

  assert.equal(parsed, null);
});

test('tarnow: extractAuctionType handles forms', () => {
  assert.equal(extractAuctionType('przetarg ustny nieograniczony na sprzedaż'), 'oral_unlimited');
  assert.equal(extractAuctionType('przetarg ustny ograniczony do sąsiadów'), 'oral_limited');
  assert.equal(extractAuctionType('przetarg pisemny nieograniczony na zbycie'), 'written_unlimited');
  assert.equal(extractAuctionType('rokowania po przetargach'), 'negotiations');
});

test('tarnow: extractPropertyType classifies accurately', () => {
  assert.equal(extractPropertyType('teren obiektów produkcyjnych, składów i magazynów'), 'commercial');
  assert.equal(extractPropertyType('teren budownictwa mieszkaniowego jednorodzinnego'), 'land');
  assert.equal(extractPropertyType('garaż murowany przy ul. Nowej'), 'garage');
  assert.equal(extractPropertyType('sprzedaż lokalu mieszkalnego nr 12'), 'residential');
});

test('tarnow: extractPrice and extractDeposit parse properly', () => {
  assert.equal(extractPrice('Cena wywoławcza: 320 000 zł'), 320000);
  assert.equal(extractDeposit('Wadium: 32 000 zł'), 32000);
});

test('tarnow: extractAuctionDate finds dates', () => {
  assert.equal(extractAuctionDate('Termin sprzedaży: 23.09.2026 r.'), '2026-09-23');
  assert.equal(extractAuctionDate('w dniu 8 grudnia 2026 r.'), '2026-12-08');
});

test('tarnow: extractParcels finds parcel numbers', () => {
  const parcels = extractParcels('dz. 50/7, 73/8, 43/39 oraz dz. 355/11');
  assert.ok(parcels.includes('50/7'));
  assert.ok(parcels.includes('73/8'));
  assert.ok(parcels.includes('355/11'));
});

test('tarnow: extractArea parses square meters and hectares', () => {
  assert.equal(extractArea('1584 m²'), 1584);
  assert.equal(extractArea('19359 m²'), 19359);
  assert.equal(extractArea('pow. 0,55 ha'), 5500);
});

test('tarnow: extractAddress finds street names', () => {
  assert.equal(extractAddress('ul. Grochowska dz. 355/11'), 'Grochowska');
  assert.equal(extractAddress('ul. Wojska Polskiego dz. 50/7'), 'Wojska Polskiego');
});
