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
} from '../src/cities/piaseczno/parse.js';

test('piaseczno: parseNotice extracts garage auction announcement', () => {
  const sampleContent = `
Burmistrz Miasta i Gminy Piaseczno ogłasza przetarg pisemny nieograniczony na sprzedaż:
części nieruchomości, oznaczonej jako działki ewid. nr 2/175 i nr 2/170 o powierzchni łącznej 21 m2,
zabudowanej murowanym garażem, położonej w obr. 4 m. Piaseczno przy ul. Energetycznej,
dla której Sąd Rejonowy w Piasecznie prowadzi księgę wieczystą nr WA5M/00293568/1.
Cena wywoławcza nieruchomości – 70.000,00 zł.
Wadium – 3.500,00 zł.
Część jawna przetargu odbędzie się w dniu 25.09.2026 r. o godz. 10.00 w budynku Urzędu Miasta i Gminy Piaseczno przy ul. Kościuszki 5.
`;

  const parsed = parseNotice({
    id: 'przetarg-garaz-energetyczna',
    title: 'Przetarg nieograniczony na sprzedaż murowanego garażu położonego w Piasecznie przy ul. Energetycznej nr dz. 2/175 i 2/170 obręb 4',
    content: sampleContent,
    attachmentsText: '',
    date: '2026-08-10',
    url: 'https://piaseczno.eu/przetarg-nieograniczony-na-sprzedaz-murowanego-garazu/',
  });

  assert.ok(parsed, 'should parse notice');
  assert.equal(parsed.id, 'piaseczno-przetarg-garaz-energetyczna');
  assert.equal(parsed.city, 'Piaseczno');
  assert.equal(parsed.teryt, '1418044');
  assert.equal(parsed.status, 'active');
  assert.equal(parsed.auctionType, 'written_unlimited');
  assert.equal(parsed.propertyType, 'garage');
  assert.equal(parsed.price, 70000);
  assert.equal(parsed.deposit, 3500);
  assert.equal(parsed.auctionDate, '2026-09-25');
  assert.equal(parsed.kwNumber, 'WA5M/00293568/1');
  assert.equal(parsed.areaM2, 21);
  assert.ok(parsed.parcels.includes('2/175'));
  assert.ok(parsed.parcels.includes('2/170'));
  assert.ok(parsed.address.includes('Energetycznej'));
});

test('piaseczno: parseNotice extracts cooperative flat right announcement', () => {
  const sampleContent = `
Burmistrz ogłasza przetarg pisemny nieograniczony na sprzedaż spółdzielczego własnościowego prawa do lokalu mieszkalnego nr 83
o powierzchni użytkowej 58,44 m2 przy ul. Sikorskiego 1A w Piasecznie.
Cena wywoławcza: 446 000,00 zł.
Wadium: 22 300,00 zł.
Termin części jawnej: w dniu 22 marca 2024 r.
`;

  const parsed = parseNotice({
    id: 'przetarg-sikorskiego',
    title: 'Przetarg na sprzedaż spółdzielczego własnościowego prawa do lokalu mieszkalnego nr 83',
    content: sampleContent,
    attachmentsText: '',
    date: '2024-01-15',
    url: 'https://piaseczno.eu/przetarg-sikorskiego/',
  });

  assert.ok(parsed);
  assert.equal(parsed.propertyType, 'residential');
  assert.equal(parsed.price, 446000);
  assert.equal(parsed.deposit, 22300);
  assert.equal(parsed.auctionDate, '2024-03-22');
  assert.equal(parsed.areaM2, 58.44);
  assert.ok(parsed.address.includes('Sikorskiego 1A'));
});

test('piaseczno: parseNotice ignores unrelated notice', () => {
  const parsed = parseNotice({
    id: 'turniej-tenisa',
    title: 'Turniej tenisa stołowego w Piasecznie',
    content: 'Zapisy do turnieju trwają do piątku.',
    attachmentsText: '',
    date: '2026-05-10',
    url: 'https://piaseczno.eu/turniej-tenisa/',
  });

  assert.equal(parsed, null);
});

test('piaseczno: extractAuctionType handles forms', () => {
  assert.equal(extractAuctionType('ogłasza przetarg pisemny nieograniczony na sprzedaż'), 'written_unlimited');
  assert.equal(extractAuctionType('ogłasza przetarg ustny nieograniczony'), 'oral_unlimited');
  assert.equal(extractAuctionType('przetarg pisemny ograniczony do mieszkańców'), 'written_limited');
  assert.equal(extractAuctionType('rokowania po przetargach'), 'negotiations');
});

test('piaseczno: extractPropertyType classifies accurately', () => {
  assert.equal(extractPropertyType('sprzedaż spółdzielczego własnościowego prawa do lokalu mieszkalnego'), 'residential');
  assert.equal(extractPropertyType('sprzedaż murowanego garażu przy ul. Energetycznej'), 'garage');
  assert.equal(extractPropertyType('sprzedaż części nieruchomości gruntowej działka ew. 539/8'), 'land');
  assert.equal(extractPropertyType('najem lokalu użytkowego przy rynku'), 'commercial');
});

test('piaseczno: extractPrice and extractDeposit parse properly', () => {
  assert.equal(extractPrice('Cena wywoławcza nieruchomości – 70.000,00 zł'), 70000);
  assert.equal(extractPrice('Cena wywoławcza: 446 000,00 zł brutto'), 446000);
  assert.equal(extractDeposit('Wadium – 3.500,00 zł'), 3500);
});

test('piaseczno: extractAuctionDate finds dates', () => {
  assert.equal(extractAuctionDate('Część jawna przetargu odbędzie się w dniu 25.09.2026 r.'), '2026-09-25');
  assert.equal(extractAuctionDate('w dniu 22 marca 2024 r.'), '2024-03-22');
});

test('piaseczno: extractParcels finds parcel numbers', () => {
  const parcels = extractParcels('działki ewid. nr 2/175 i nr 2/170 oraz dz. ew. 539/8');
  assert.deepEqual(parcels.sort(), ['2/170', '2/175', '539/8'].sort());
});

test('piaseczno: extractKw matches standard format', () => {
  assert.equal(extractKw('księgę wieczystą nr WA5M/00293568/1 prowadzi sąd'), 'WA5M/00293568/1');
});

test('piaseczno: extractArea handles square meters and hectares', () => {
  assert.equal(extractArea('powierzchni łącznej 21 m2'), 21);
  assert.equal(extractArea('powierzchni użytkowej 58,44 m2'), 58.44);
  assert.equal(extractArea('o powierzchni 1,1395 ha'), 11395);
});
