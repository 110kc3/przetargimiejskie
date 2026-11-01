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
} from '../src/cities/goleniow/parse.js';

test('goleniow: parseNotice extracts land auction announcement with attachment text', () => {
  const samplePdf = `
Goleniów, dnia 15.10.2026 r.
BURMISTRZ GMINY GOLENIÓW
ogłasza przetarg ustny nieograniczony na zbycie nieruchomości stanowiących własność Gminy Goleniów.

Trzeci przetarg:
Obręb Białuń
- działka nr 26/16 o powierzchni 0,2151ha, KW nr SZ1O/00023813/8.
Cena wywoławcza: 228.130,00 zł
Wadium: 23.000,00 zł
Przetarg odbędzie się w dniu 8 grudnia 2026 r. w sali konferencyjnej.
`;

  const parsed = parseNotice({
    id: 'burmistrz-gminy-goleniow-oglasza-przetarg-ustny-nieograniczony-na-zbycie-nieruchomosci-stanowia-32',
    title: 'Burmistrz Gminy Goleniów ogłasza kolejny przetarg ustny nieograniczony na zbycie nieruchomości stanowiących własność Gminy Goleniów na dzień 08 grudnia 2026 r.',
    content: '<p>Szczegóły w załączniku.</p>',
    attachmentsText: samplePdf,
    date: '2026-10-23 12:12:47',
    url: 'https://bip.goleniow.pl/artykul/burmistrz-gminy-goleniow-oglasza-przetarg-ustny-nieograniczony-na-zbycie-nieruchomosci-stanowia-32',
    attachments: [{ name: 'ogloszenie.pdf', url: 'https://bip.goleniow.pl/pliki/goleniow/zalaczniki/36416/ogloszenie.pdf' }],
  });

  assert.ok(parsed, 'should parse notice');
  assert.equal(parsed.id, 'goleniow-burmistrz-gminy-goleniow-oglasza-przetarg-ustny-nieograniczony-na-zbycie-nieruchomosci-stanowia-32');
  assert.equal(parsed.city, 'Goleniów');
  assert.equal(parsed.teryt, '3204024');
  assert.equal(parsed.status, 'active');
  assert.equal(parsed.auctionType, 'oral_unlimited');
  assert.equal(parsed.propertyType, 'land');
  assert.equal(parsed.price, 228130);
  assert.equal(parsed.deposit, 23000);
  assert.equal(parsed.auctionDate, '2026-12-08');
  assert.equal(parsed.kwNumber, 'SZ1O/00023813/8');
  assert.equal(parsed.areaM2, 2151);
  assert.ok(parsed.parcels.includes('26/16'));
});

test('goleniow: parseNotice extracts flat auction announcement', () => {
  const sampleContent = `
Ogłoszenie o przetargu ustnym nieograniczonym na zbycie nieruchomości stanowiącej lokal mieszkalny:
ul. Cicha 9 m. 4 w Goleniowie, pow. użytkowa 28,54 m2, dz. 142.
Cena wywoławcza: 110 000,00 zł. Wadium: 11 000,00 zł.
Przetarg odbędzie się w dniu 10 października 2024r.
`;

  const parsed = parseNotice({
    id: 'przetarg-lokal-cicha',
    title: 'Przetarg ustny nieograniczony na lokal mieszkalny ul. Cicha 9 m. 4',
    content: sampleContent,
    attachmentsText: '',
    date: '2024-09-01',
    url: 'https://bip.goleniow.pl/artykul/przetarg-lokal-cicha',
  });

  assert.ok(parsed);
  assert.equal(parsed.propertyType, 'residential');
  assert.equal(parsed.price, 110000);
  assert.equal(parsed.deposit, 11000);
  assert.equal(parsed.auctionDate, '2024-10-10');
  assert.equal(parsed.areaM2, 28.54);
  assert.ok(parsed.address.includes('Cicha 9 m. 4'));
});

test('goleniow: parseNotice detects result notice', () => {
  const parsed = parseNotice({
    id: 'informacja-o-wyniku-10-pazdziernika',
    title: 'Informacja o wyniku przetargu ustnego nieograniczonego na sprzedaż nieruchomości ogłoszonego na dzień 10 października 2024r.',
    content: 'Przetarg na zbycie nieruchomości działka nr 15/2 zakończył się wynikiem pozytywnym. Cena wywoławcza wynosiła 80 000 zł.',
    attachmentsText: '',
    date: '2024-10-15',
    url: 'https://bip.goleniow.pl/artykul/informacja-o-wyniku-10-pazdziernika',
  });

  assert.ok(parsed);
  assert.equal(parsed.status, 'result');
  assert.equal(parsed.auctionType, 'oral_unlimited');
  assert.ok(parsed.parcels.includes('15/2'));
});

test('goleniow: parseNotice ignores unrelated notice', () => {
  const parsed = parseNotice({
    id: 'zawiadomienie-o-sesji',
    title: 'Zawiadomienie o sesji Rady Miejskiej w Goleniowie',
    content: 'Sesja odbędzie się w sali narad.',
    attachmentsText: '',
    date: '2026-05-10',
    url: 'https://bip.goleniow.pl/artykul/zawiadomienie-o-sesji',
  });

  assert.equal(parsed, null);
});

test('goleniow: extractAuctionType covers various forms', () => {
  assert.equal(extractAuctionType('ogłasza przetarg publiczny nieograniczony na zbycie'), 'oral_unlimited');
  assert.equal(extractAuctionType('ogłasza pierwszy przetarg ustny ograniczony'), 'oral_limited');
  assert.equal(extractAuctionType('pierwszy przetarg pisemny nieograniczony'), 'written_unlimited');
  assert.equal(extractAuctionType('rokowania w sprawie nabycia'), 'negotiations');
});

test('goleniow: extractPropertyType classifies correctly', () => {
  assert.equal(extractPropertyType('sprzedaż lokalu mieszkalnego nr 3'), 'residential');
  assert.equal(extractPropertyType('najem lokalu użytkowego przy ul. Lipowej'), 'commercial');
  assert.equal(extractPropertyType('przetarg na zbycie działki niezabudowanej'), 'land');
  assert.equal(extractPropertyType('sprzedaż garażu murowanego'), 'garage');
});

test('goleniow: extractPrice and extractDeposit parse formats', () => {
  assert.equal(extractPrice('Cena wywoławcza: 228.130,00 zł'), 228130);
  assert.equal(extractPrice('Cena wywoławcza wynosi 95 000 zł brutto'), 95000);
  assert.equal(extractDeposit('Wadium: 23.000,00 zł wpłacone'), 23000);
});

test('goleniow: extractAuctionDate handles na dzień and w dniu', () => {
  assert.equal(extractAuctionDate('na dzień 08 grudnia 2026 r.'), '2026-12-08');
  assert.equal(extractAuctionDate('w dniu 10 października 2024r.'), '2024-10-10');
  assert.equal(extractAuctionDate('dnia 26 kwiecień 2024 r.'), '2024-04-26');
});

test('goleniow: extractParcels finds parcel numbers', () => {
  const parcels = extractParcels('działka nr 26/16 oraz działki nr 142/1');
  assert.deepEqual(parcels.sort(), ['142/1', '26/16'].sort());
});

test('goleniow: extractKw matches standard format', () => {
  assert.equal(extractKw('KW nr SZ1O/00023813/8 prowadzona w Goleniowie'), 'SZ1O/00023813/8');
});
