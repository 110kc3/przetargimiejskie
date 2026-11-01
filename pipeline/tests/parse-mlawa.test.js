import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanText,
  isAnnouncementTitle,
  isResultTitle,
  parsePlDate,
  parsePrice,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/mlawa/parse.js';

test('mlawa: isAnnouncementTitle & isResultTitle', () => {
  assert.equal(
    isAnnouncementTitle('Pierwszy przetarg ustny nieograniczony na sprzedaż niezabudowanej nieruchomości'),
    true
  );
  assert.equal(
    isResultTitle('Informacja o wyniku przetargu ustnego na sprzedaż nieruchomości'),
    true
  );
});

test('mlawa: parsePlDate and parsePrice', () => {
  assert.equal(parsePlDate('11.05.2026 r.'), '2026-05-11');
  assert.equal(parsePlDate('7 maja 2026 r.'), '2026-05-07');
  assert.equal(parsePrice('140.000 zł'), 140000);
  assert.equal(parsePrice('14.000,00 zł'), 14000);
});

test('mlawa: parseAnnouncement extracts real notice details', () => {
  const item = {
    id: 'pierwszy-przetarg-wetmanskiego',
    title: 'Pierwszy przetarg ustny nieograniczony na sprzedaż niezabudowanej nieruchomości komunalnej nr 4636',
    url: 'https://bip.mlawa.pl/ogloszenie/pierwszy-przetarg-ustny-nieograniczony',
  };
  const docText = `
    Burmistrz Miasta Mławy ogłasza pierwszy przetarg ustny nieograniczony na sprzedaż niezabudowanej nieruchomości komunalnej nr 4636 o powierzchni 888 m2, położonej w Mławie przy ul. Biskupa L. Wetmańskiego.
    Nieruchomość ma urządzoną księgę wieczystą KW 41254.
    Ceny wywoławcza: 140.000 zł.
    Wadium: 14.000 zł.
    Przetarg odbędzie się w dniu 11.05.2026 r. o godz. 10.00 w budynku Urzędu Miasta w Mławie.
  `;
  const res = parseAnnouncement(item, docText);

  assert.equal(res.id, 'mlawa-pierwszy-przetarg-wetmanskiego');
  assert.equal(res.auction_date, '2026-05-11');
  assert.equal(res.price, 140000);
  assert.equal(res.deposit, 14000);
  assert.equal(res.parcel, '4636');
  assert.equal(res.area, 888);
  assert.equal(res.type, 'announcement');
  assert.equal(res.property_type, 'grunt');
});

test('mlawa: parseResultDoc extracts result status and buyer', () => {
  const item = {
    id: 'wynik-przetargu-4636',
    title: 'Informacja o wyniku przetargu ustnego na sprzedaż nieruchomości',
    url: 'https://bip.mlawa.pl/ogloszenie/wynik-przetargu-4636',
  };
  const docText = `
    Informacja o wyniku przetargu ustnego nieograniczonego
    W dniu 11.05.2026 r. odbył się przetarg na sprzedaż nieruchomości komunalnej nr 4636 przy ul. Wetmańskiego.
    Cena wywoławcza: 140.000 zł.
    Najwyższa cena osiągnięta w przetargu: 155.000 zł.
    Ustalona jako nabywca nieruchomości: Marian Wiśniewski
    Osoby dopuszczone do uczestniczenia: 2.
  `;
  const res = parseResultDoc(item, docText);

  assert.equal(res.id, 'mlawa-result-wynik-przetargu-4636');
  assert.equal(res.status, 'positive');
  assert.equal(res.price_achieved, 155000);
  assert.equal(res.buyer, 'Marian Wiśniewski');
  assert.equal(res.parcel, '4636');
  assert.equal(res.type, 'result');
});
