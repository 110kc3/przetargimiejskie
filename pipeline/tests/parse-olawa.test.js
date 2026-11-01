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
  isAnnouncement,
  isResult,
  isFlat,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/olawa/parse.js';

test('olawa parsePLN', () => {
  assert.equal(parsePLN('150 000,00 zł'), 150000);
  assert.equal(parsePLN('254.000 zł'), 254000);
  assert.equal(parsePLN('151 500,00'), 151500);
  assert.equal(parsePLN('brak'), null);
});

test('olawa parseArea', () => {
  assert.equal(parseArea('65,34 metra'), 65.34);
  assert.equal(parseArea('0,0324 hektara'), 0.0324);
  assert.equal(parseArea('108,64 m²'), 108.64);
  assert.equal(parseArea('xyz'), null);
});

test('olawa parseDate', () => {
  assert.equal(parseDate('24 czerwca 2026r.'), '2026-06-24');
  assert.equal(parseDate('11 maja 2026r.'), '2026-05-11');
  assert.equal(parseDate('2026-06-24'), '2026-06-24');
  assert.equal(parseDate('brak terminu'), null);
});

test('olawa extractRound', () => {
  assert.equal(extractRound('ogłoszenia trzeciego przetargu ustnego nieograniczonego'), 3);
  assert.equal(extractRound('ogłoszenie drugiego przetargu'), 2);
  assert.equal(extractRound('I przetarg ustny'), 1);
  assert.equal(extractRound('wynik trzecich przetargów ustnych'), 3);
});

test('olawa extractParcels and extractKw', () => {
  const text = 'Działka numer 2/9 arkusz mapy 45 o powierzchni 0,0324 hektara, KW WR1O/00012345/6';
  assert.deepEqual(extractParcels(text), ['2/9']);
  assert.deepEqual(extractKw(text), ['WR1O/00012345/6']);
});

test('olawa isAnnouncement and isResult', () => {
  assert.equal(isAnnouncement('ogłoszenia trzeciego przetargu ustnego nieograniczonego na sprzedaż nieruchomości lokalowej'), true);
  assert.equal(isAnnouncement('wykazu nieruchomości przeznaczonych do zbycia w trybie bezprzetargowym'), false);
  assert.equal(isAnnouncement('zatwierdzenia protokołu z przeprowadzonego przetargu'), false);

  assert.equal(isResult('informacja o wyniku przetargu'), true);
  assert.equal(isResult('zatwierdzenia protokołu z przeprowadzonego drugiego przetargu ustnego'), true);
  assert.equal(isResult('ogłoszenie trzeciego przetargu'), false);
});

test('olawa isFlat', () => {
  assert.equal(isFlat('sprzedaż nieruchomości lokalowej (lokalu mieszkalnego) położonego w Oławie przy ul. Rybackiej'), true);
  assert.equal(isFlat('sprzedaż lokalu użytkowego nr 1'), false);
  assert.equal(isFlat('sprzedaż działki nr 29 niezabudowanej'), false);
});

test('olawa parseAnnouncement real sample', () => {
  const sample = `
Załącznik numer 1 do Zarządzenia Burmistrza Miasta Oława Numer 65/0050/2026 z dnia 11 maja 2026r.
OGŁOSZENIE
Burmistrz Miasta Oława ogłasza trzeci przetarg ustny nieograniczony na sprzedaż nieruchomości lokalowej położonej w Oławie przy ulicy Rybackiej 36/1
Działka numer 2/9 arkusz mapy 45 o powierzchni 0,0324 hektara
Lokal mieszkalny w budynku dwulokalowym w zabudowie bliźniaczej (Rybacka 34-36) o powierzchni użytkowej 65,34 metra
Cena wywoławcza nieruchomości netto (złotych): 150 000,00 zł
Wadium: 15 000,00 zł
Przetarg odbędzie się w siedzibie Urzędu Miejskiego w Oławie, Pl.Zamkowy 15 w sali nr 29 w dniu 24 czerwca 2026r. o godz. 11.00.
  `;
  const parsed = parseAnnouncement(
    sample,
    'Zarządzenie numer 65/0050/2026 Burmistrza Miasta Oława w sprawie ogłoszenia trzeciego przetargu ustnego na sprzedaż lokalu mieszkalnego przy ul. Rybackiej 36/1',
    'https://bip.um.olawa.pl/a,31923.html',
  );

  assert.equal(parsed.round, 3);
  assert.equal(parsed.area_m2, 65.34);
  assert.equal(parsed.price, 150000);
  assert.equal(parsed.auction_date, '2026-06-24');
  assert.deepEqual(parsed.parcels, ['2/9']);
  assert.ok(parsed.address);
  assert.equal(parsed.kind, 'mieszkalny');
});

test('olawa parseResultDoc won outcome', () => {
  const doc = {
    title: 'INFORMACJA BURMISTRZA MIASTA OŁAWA o wyniku trzecich przetargów',
    pdf_url: 'https://bip.um.olawa.pl/e,pobierz,get.html?id=46965',
    auction_date: '2026-06-24',
    text: `
INFORMACJA BURMISTRZA MIASTA OŁAWA
informację o wyniku trzecich przetargów ustnych nieograniczonych na sprzedaż lokali mieszkalnych w Oławie, który został ustalony na dzień 24 czerwca 2026r.
ulica Rybacka 36/1
działka numer 2/9
Cena wywoławcza w złotych: 150 000,00
Najwyższa cena osiągnięta w przetargu w złotych: 151 500,00
Imię i nazwisko osoby ustalonej jako nabywca nieruchomości: Paulina i Adam Kossakowscy
Burmistrz Miasta Oława
    `,
  };
  const parsed = parseResultDoc(doc);
  assert.equal(parsed.status, 'won');
  assert.equal(parsed.price_reserve, 150000);
  assert.equal(parsed.price_achieved, 151500);
  assert.equal(parsed.buyer, 'Paulina i Adam Kossakowscy');
  assert.equal(parsed.auction_date, '2026-06-24');
});

test('olawa parseResultDoc unresolved outcome', () => {
  const doc = {
    title: 'Informacja o wyniku przetargu ustnego',
    pdf_url: 'https://bip.um.olawa.pl/wynik-neg.pdf',
    auction_date: '2026-03-19',
    text: `
Protokół z przeprowadzonego przetargu na sprzedaż lokalu mieszkalnego przy ul. Nabrzeżnej.
Cena wywoławcza: 120 000,00 zł.
Przetarg zakończył się wynikiem negatywnym z powodu braku uczestników, nie wyłoniono nabywcy.
    `,
  };
  const parsed = parseResultDoc(doc);
  assert.equal(parsed.status, 'unresolved');
  assert.equal(parsed.price_reserve, 120000);
  assert.equal(parsed.price_achieved, null);
});
