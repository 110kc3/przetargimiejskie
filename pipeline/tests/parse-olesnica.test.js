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
} from '../src/cities/olesnica/parse.js';

test('olesnica: parseNotice extracts land auction announcement with attachment text', () => {
  const samplePdf = `
Burmistrz Miasta Oleśnicy, ul. Rynek 1, 56-400 Oleśnica, ogłasza:
I-przetarg ustny nieograniczony na sprzedaż następującej nieruchomości położonej w Oleśnicy
Adres nieruchomości: Oleśnica ul. Stawowa, obręb Lucień
Numer działki: 11/8
Arkusz Mapy: 98
Powierzchnia działki w m2: 1.655
KW Nr: WR1E/00040060/4
Cena wywoławcza nieruchomości w zł.: 442.000,00
Wadium w zł.: 44.200,00

Przetarg odbędzie się w dniu 10 grudnia 2026 r. o godz. 11.00 w sali nr 114 Urzędu Miasta Oleśnicy.
`;

  const parsed = parseNotice({
    id: '3244',
    title: 'I-przetarg ustny nieograniczony na sprzedaż następującej nieruchomości położonej w Oleśnicy',
    content: '<p>ul. Stawowa, obręb Lucień, WR1E/00040060/4</p>',
    attachmentsText: samplePdf,
    date: '2026-10-29',
    url: 'https://www.olesnica.pl/urzad/ogloszenia-burmistrza/I-przetarg/idn:3244',
    attachments: [{ name: 'BIP-I_przet_Stawowa.pdf', url: 'https://www.olesnica.pl/download/BIP-I_przet_Stawowa.pdf' }],
  });

  assert.ok(parsed, 'should parse notice');
  assert.equal(parsed.id, 'olesnica-3244');
  assert.equal(parsed.city, 'Oleśnica');
  assert.equal(parsed.teryt, '0214011');
  assert.equal(parsed.status, 'active');
  assert.equal(parsed.auctionType, 'oral_unlimited');
  assert.equal(parsed.propertyType, 'land');
  assert.equal(parsed.price, 442000);
  assert.equal(parsed.deposit, 44200);
  assert.equal(parsed.auctionDate, '2026-12-10');
  assert.equal(parsed.kwNumber, 'WR1E/00040060/4');
  assert.equal(parsed.areaM2, 1655);
  assert.ok(parsed.parcels.includes('11/8'));
  assert.ok(parsed.address.includes('Stawowa'));
});

test('olesnica: parseNotice extracts flat auction announcement', () => {
  const samplePdf = `
Burmistrz Miasta Oleśnicy ogłasza pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego:
Adres: Rynek 33 m. 1 w Oleśnicy
Powierzchnia użytkowa: 45,50 m2
Cena wywoławcza: 165 000,00 zł
Wadium: 16 500,00 zł
Termin przetargu: w dniu 22 października 2026 r.
`;

  const parsed = parseNotice({
    id: 'rynek-33',
    title: 'Przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego Rynek 33 m. 1',
    content: '',
    attachmentsText: samplePdf,
    date: '2026-09-15',
    url: 'https://www.olesnica.pl/urzad/ogloszenia-burmistrza/rynek/idn:1234',
  });

  assert.ok(parsed);
  assert.equal(parsed.propertyType, 'residential');
  assert.equal(parsed.price, 165000);
  assert.equal(parsed.deposit, 16500);
  assert.equal(parsed.auctionDate, '2026-10-22');
  assert.equal(parsed.areaM2, 45.5);
  assert.ok(parsed.address.includes('Rynek 33 m. 1'));
});

test('olesnica: parseNotice detects wykaz notice', () => {
  const parsed = parseNotice({
    id: 'wykaz-14',
    title: 'WYKAZ nr 14/2026 nieruchomości stanowiących własność Gminy Miasta Oleśnicy przeznaczonych do zbycia',
    content: 'Wykaz podaje się do publicznej wiadomości na okres 21 dni.',
    attachmentsText: '',
    date: '2026-05-01',
    url: 'https://www.olesnica.pl/urzad/ogloszenia-burmistrza/wykaz-14/idn:3150',
  });

  assert.ok(parsed);
  assert.equal(parsed.status, 'wykaz');
});

test('olesnica: parseNotice ignores unrelated notice', () => {
  const parsed = parseNotice({
    id: 'polowania-3237',
    title: 'Obwieszczenie o terminach polowań zbiorowych',
    content: 'Koło łowieckie informuje o terminach polowań.',
    attachmentsText: '',
    date: '2026-10-25',
    url: 'https://www.olesnica.pl/urzad/ogloszenia-burmistrza/polowania/idn:3237',
  });

  assert.equal(parsed, null);
});

test('olesnica: extractAuctionType covers forms', () => {
  assert.equal(extractAuctionType('I-przetarg ustny nieograniczony na sprzedaż'), 'oral_unlimited');
  assert.equal(extractAuctionType('przetarg ustny ograniczony do sąsiadów'), 'oral_limited');
  assert.equal(extractAuctionType('przetarg pisemny nieograniczony na zbycie'), 'written_unlimited');
  assert.equal(extractAuctionType('rokowania po drugim przetargu zakończonym wynikiem negatywnym'), 'negotiations');
});

test('olesnica: extractPropertyType classifies accurately', () => {
  assert.equal(extractPropertyType('sprzedaż lokalu mieszkalnego nr 2'), 'residential');
  assert.equal(extractPropertyType('lokal użytkowy przy ul. Rzemieślniczej'), 'commercial');
  assert.equal(extractPropertyType('działka pod zabudowę mieszkaniową jednorodzinną'), 'land');
  assert.equal(extractPropertyType('garaż jednostanowiskowy murowany'), 'garage');
});

test('olesnica: extractPrice and extractDeposit parse properly', () => {
  assert.equal(extractPrice('Cena wywoławcza nieruchomości w zł.: 442.000,00'), 442000);
  assert.equal(extractPrice('Cena: 165 000 zł brutto'), 165000);
  assert.equal(extractDeposit('Wadium w zł.: 44.200,00 płatne'), 44200);
});

test('olesnica: extractAuctionDate finds dates', () => {
  assert.equal(extractAuctionDate('w dniu 10 grudnia 2026 r.'), '2026-12-10');
  assert.equal(extractAuctionDate('w dniu 22 października 2026 r.'), '2026-10-22');
});

test('olesnica: extractParcels finds parcel numbers', () => {
  const parcels = extractParcels('Numer działki: 11/8 oraz dz. 45/2');
  assert.deepEqual(parcels.sort(), ['11/8', '45/2'].sort());
});

test('olesnica: extractKw matches standard format', () => {
  assert.equal(extractKw('KW Nr: WR1E/00040060/4 prowadzona przez sąd'), 'WR1E/00040060/4');
});
