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
} from '../src/cities/konin/parse.js';

test('konin: parseNotice extracts land auction announcement with attachment text', () => {
  const samplePdf = `
NR sprawy: GN. 6840.4.19.2025
Prezydent Miasta Konina Ogłasza
I przetarg ustny nieograniczony na sprzedaż zabudowanej nieruchomości stanowiącej własność Miasta Konina położonej w Koninie, obręb Starówka.

Przetarg odbędzie się w dniu 19 stycznia 2027 r. o godz. 11.00 w sali konferencyjnej Urzędu Miejskiego w Koninie (nr 300), Plac Wolności 1.

Numer działki: 445
Powierzchnia działki: 0,2624 ha
Nr księgi wieczystej: KN1N/00041234/5
Cena wywoławcza: 350.000,00 zł
Wadium: 35.000,00 zł
`;

  const parsed = parseNotice({
    id: 'przetarg-starowka-445',
    title: 'I przetarg ustny nieograniczony na sprzedaż zabudowanej nieruchomości stanowiącej własność Miasta Konina położonej w Koninie, obręb Starówka',
    content: 'Prezydent Miasta Konina ogłasza I przetarg ustny nieograniczony.',
    attachmentsText: samplePdf,
    date: '2026-10-15',
    url: 'https://gospodarka.konin.pl/I-przetarg-Starowka.htmlx',
    attachments: [{ name: 'przetarg.pdf', url: 'https://gospodarka.konin.pl/files/przetarg.pdf' }],
  });

  assert.ok(parsed, 'should parse notice');
  assert.equal(parsed.id, 'konin-przetarg-starowka-445');
  assert.equal(parsed.city, 'Konin');
  assert.equal(parsed.teryt, '3062011');
  assert.equal(parsed.status, 'active');
  assert.equal(parsed.auctionType, 'oral_unlimited');
  assert.equal(parsed.propertyType, 'land');
  assert.equal(parsed.price, 350000);
  assert.equal(parsed.deposit, 35000);
  assert.equal(parsed.auctionDate, '2027-01-19');
  assert.equal(parsed.kwNumber, 'KN1N/00041234/5');
  assert.equal(parsed.areaM2, 2624);
  assert.ok(parsed.parcels.includes('445'));
  assert.equal(parsed.address, 'Starówka');
});

test('konin: parseNotice extracts garage auction announcement', () => {
  const samplePdf = `
Prezydent Miasta Konina ogłasza przetarg ustny nieograniczony na sprzedaż nieruchomości zabudowanej garażem:
Położenie: Konin, obręb Czarków, działka nr 12/4 o pow. 24 m2.
Cena wywoławcza: 28 000,00 zł. Wadium: 2 800,00 zł.
Termin przetargu: w dniu 15 listopada 2026 r.
`;

  const parsed = parseNotice({
    id: 'garaz-czarkow',
    title: 'Przetarg na sprzedaż nieruchomości zabudowanej garażem obręb Czarków',
    content: '',
    attachmentsText: samplePdf,
    date: '2026-09-20',
    url: 'https://gospodarka.konin.pl/garaz.htmlx',
  });

  assert.ok(parsed);
  assert.equal(parsed.propertyType, 'garage');
  assert.equal(parsed.price, 28000);
  assert.equal(parsed.deposit, 2800);
  assert.equal(parsed.auctionDate, '2026-11-15');
  assert.equal(parsed.areaM2, 24);
  assert.ok(parsed.parcels.includes('12/4'));
});

test('konin: parseNotice detects wykaz notice', () => {
  const parsed = parseNotice({
    id: 'wykaz-gn-6840',
    title: 'Wykaz lokali mieszkalnych stanowiących własność Miasta Konina przeznaczonych do sprzedaży głównemu najemcy',
    content: 'Wykaz GN.6840.1.67.2025 podaje się do publicznej wiadomości.',
    attachmentsText: '',
    date: '2026-06-17',
    url: 'https://gospodarka.konin.pl/wykaz.htmlx',
  });

  assert.ok(parsed);
  assert.equal(parsed.status, 'wykaz');
  assert.equal(parsed.propertyType, 'residential');
});

test('konin: parseNotice ignores unrelated notice', () => {
  const parsed = parseNotice({
    id: 'informacja-cieplo',
    title: 'Informacja o dostawie ciepła w sezonie zimowym',
    content: 'MPEC Konin informuje o rozpoczęciu sezonu.',
    attachmentsText: '',
    date: '2026-10-01',
    url: 'https://gospodarka.konin.pl/cieplo.htmlx',
  });

  assert.equal(parsed, null);
});

test('konin: extractAuctionType covers forms', () => {
  assert.equal(extractAuctionType('I przetarg ustny nieograniczony na sprzedaż'), 'oral_unlimited');
  assert.equal(extractAuctionType('przetarg ustny ograniczony do właścicieli'), 'oral_limited');
  assert.equal(extractAuctionType('przetarg pisemny nieograniczony na zbycie'), 'written_unlimited');
  assert.equal(extractAuctionType('rokowania po drugim przetargu'), 'negotiations');
});

test('konin: extractPropertyType classifies accurately', () => {
  assert.equal(extractPropertyType('nieruchomość zabudowana garażem obręb Czarków'), 'garage');
  assert.equal(extractPropertyType('lokal użytkowy przy Al. 1 Maja'), 'commercial');
  assert.equal(extractPropertyType('sprzedaż działki gruntu obręb Maliniec'), 'land');
  assert.equal(extractPropertyType('sprzedaż lokalu mieszkalnego na rzecz najemcy'), 'residential');
});

test('konin: extractPrice and extractDeposit parse properly', () => {
  assert.equal(extractPrice('Cena wywoławcza: 350.000,00 zł'), 350000);
  assert.equal(extractPrice('Cena: 28 000 zł netto'), 28000);
  assert.equal(extractDeposit('Wadium: 35.000,00 zł'), 35000);
});

test('konin: extractAuctionDate finds dates', () => {
  assert.equal(extractAuctionDate('w dniu 19 stycznia 2027 r.'), '2027-01-19');
  assert.equal(extractAuctionDate('w dniu 15 listopada 2026 r.'), '2026-11-15');
});

test('konin: extractParcels finds parcel numbers', () => {
  const parcels = extractParcels('Numer działki: 445 oraz nieruchomość nr 12/4');
  assert.deepEqual(parcels.sort(), ['12/4', '445'].sort());
});

test('konin: extractKw matches standard format', () => {
  assert.equal(extractKw('Nr księgi wieczystej: KN1N/00041234/5 prowadzona przez sąd'), 'KN1N/00041234/5');
});
