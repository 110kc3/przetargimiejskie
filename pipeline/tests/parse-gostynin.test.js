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
} from '../src/cities/gostynin/parse.js';

test('gostynin: parseNotice extracts land auction announcement with attachment text', () => {
  const samplePdf = `
OGŁOSZENIE
Burmistrz Miasta Gostynina ogłasza drugi przetarg ustny nieograniczony na sprzedaż nieruchomości stanowiącej własność Gminy Miasta Gostynina, położonej przy ul. Stefana Żeromskiego.
Działka: 5546/1
powierzchnia: 0,2223 ha
ul. Stefana Żeromskiego
Księga wieczysta: PL1G/00011596/0
Cena wywoławcza: 200 000,00 zł + VAT
Wadium: 20 000,00 zł
Przetarg odbędzie się w dniu 17 listopada 2026 r. o godzinie 11.00 w budynku Urzędu Miasta Gostynina przy ul. Parkowej 22, pokój nr 3.
`;

  const parsed = parseNotice({
    id: '6438',
    title: 'Ogłoszenie II przetarg nieograniczony na sprzedaż nieruchomości stanowiącej własność Gminy Miasta Gostynina, położonej przy ul. Stefana Żeromskiego',
    content: '<p>Szczegóły w załącznikach.</p>',
    attachmentsText: samplePdf,
    date: '2026-10-02',
    url: 'https://umgostynin.bip.org.pl/id/6438',
    attachments: [{ name: 'ogloszenie.pdf', url: 'https://umgostynin.bip.org.pl/pliki/umgostynin/ogloszenie.pdf' }],
  });

  assert.ok(parsed, 'should parse notice');
  assert.equal(parsed.id, 'gostynin-6438');
  assert.equal(parsed.city, 'Gostynin');
  assert.equal(parsed.teryt, '1404011');
  assert.equal(parsed.status, 'active');
  assert.equal(parsed.auctionType, 'oral_unlimited');
  assert.equal(parsed.propertyType, 'land');
  assert.equal(parsed.price, 200000);
  assert.equal(parsed.deposit, 20000);
  assert.equal(parsed.auctionDate, '2026-11-17');
  assert.equal(parsed.kwNumber, 'PL1G/00011596/0');
  assert.equal(parsed.areaM2, 2223);
  assert.ok(parsed.parcels.includes('5546/1'));
  assert.ok(parsed.address.includes('Stefana Żeromskiego'));
});

test('gostynin: parseNotice extracts flat auction announcement', () => {
  const samplePdf = `
Burmistrz Miasta Gostynina ogłasza pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 83
w budynku wielorodzinnym przy ul. Wojska Polskiego 28B o powierzchni użytkowej 48,39 m2.
Cena wywoławcza: 152 300,00 zł. Wadium: 15 200,00 zł.
Przetarg odbędzie się w dniu 24 czerwca 2024 r.
`;

  const parsed = parseNotice({
    id: 'flat-wojska-polskiego',
    title: 'Przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 83 przy ul. Wojska Polskiego 28B',
    content: '',
    attachmentsText: samplePdf,
    date: '2024-05-10',
    url: 'https://umgostynin.bip.org.pl/id/5500',
  });

  assert.ok(parsed);
  assert.equal(parsed.propertyType, 'residential');
  assert.equal(parsed.price, 152300);
  assert.equal(parsed.deposit, 15200);
  assert.equal(parsed.auctionDate, '2024-06-24');
  assert.equal(parsed.areaM2, 48.39);
  assert.ok(parsed.address.includes('Wojska Polskiego 28B'));
});

test('gostynin: parseNotice detects wykaz notice', () => {
  const parsed = parseNotice({
    id: '6437',
    title: 'Wykaz nieruchomości przeznaczonej do sprzedaży w drodze bezprzetargowej - ul. Bierzewicka',
    content: 'Wykaz podaje się do publicznej wiadomości na okres 21 dni.',
    attachmentsText: '',
    date: '2026-10-01',
    url: 'https://umgostynin.bip.org.pl/id/6437',
  });

  assert.ok(parsed);
  assert.equal(parsed.status, 'wykaz');
});

test('gostynin: parseNotice ignores unrelated notice', () => {
  const parsed = parseNotice({
    id: 'konsultacje-ngo',
    title: 'Protokół z przeprowadzonych konsultacji z organizacjami pozarządowymi',
    content: 'Wyniki konsultacji rocznego programu współpracy.',
    attachmentsText: '',
    date: '2026-09-01',
    url: 'https://umgostynin.bip.org.pl/id/2018',
  });

  assert.equal(parsed, null);
});

test('gostynin: extractAuctionType covers forms', () => {
  assert.equal(extractAuctionType('drugi przetarg ustny nieograniczony na sprzedaż'), 'oral_unlimited');
  assert.equal(extractAuctionType('przetarg ustny ograniczony do mieszkańców'), 'oral_limited');
  assert.equal(extractAuctionType('przetarg pisemny nieograniczony na zbycie'), 'written_unlimited');
  assert.equal(extractAuctionType('rokowania po przetargach'), 'negotiations');
});

test('gostynin: extractPropertyType classifies accurately', () => {
  assert.equal(extractPropertyType('sprzedaż lokalu mieszkalnego nr 11'), 'residential');
  assert.equal(extractPropertyType('lokal użytkowy przy Rynku 24'), 'commercial');
  assert.equal(extractPropertyType('sprzedaż nieruchomości gruntowej niezabudowanej'), 'land');
  assert.equal(extractPropertyType('garaż murowany przy ul. Parkowej'), 'garage');
});

test('gostynin: extractPrice and extractDeposit parse properly', () => {
  assert.equal(extractPrice('Cena wywoławcza: 200 000,00 zł + VAT'), 200000);
  assert.equal(extractDeposit('Wadium: 20 000,00 zł'), 20000);
});

test('gostynin: extractAuctionDate finds dates', () => {
  assert.equal(extractAuctionDate('w dniu 17 listopada 2026 r.'), '2026-11-17');
  assert.equal(extractAuctionDate('dniu 24 czerwca 2024 r.'), '2024-06-24');
});

test('gostynin: extractParcels finds parcel numbers', () => {
  const parcels = extractParcels('Działka nr: 5546/1 oraz dz. 241/7');
  assert.deepEqual(parcels.sort(), ['241/7', '5546/1'].sort());
});

test('gostynin: extractKw matches standard format', () => {
  assert.equal(extractKw('Księga wieczysta: PL1G/00011596/0 prowadzona przez sąd'), 'PL1G/00011596/0');
});
