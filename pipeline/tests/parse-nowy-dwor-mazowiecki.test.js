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
} from '../src/cities/nowy-dwor-mazowiecki/parse.js';

test('nowy-dwor-mazowiecki: isAnnouncementTitle & isResultTitle', () => {
  assert.equal(
    isAnnouncementTitle('Ogłoszenie o II przetargu ustnym nieograniczonym na zbycie nieruchomości w dniu 09 grudnia 2026 r.'),
    true
  );
  assert.equal(
    isResultTitle('Informacja o wyniku przetargu ustnego na zbycie nieruchomości'),
    true
  );
});

test('nowy-dwor-mazowiecki: parsePlDate and parsePrice', () => {
  assert.equal(parsePlDate('09 grudnia 2026 r.'), '2026-12-09');
  assert.equal(parsePlDate('09.10.2026 r.'), '2026-10-09');
  assert.equal(parsePrice('21 000 000,00 zł'), 21000000);
  assert.equal(parsePrice('210 000,00 zł'), 210000);
});

test('nowy-dwor-mazowiecki: parseAnnouncement extracts real-world PDF details', () => {
  const item = {
    id: '6920',
    title: 'Ogłoszenie o II przetargu ustnym nieograniczonym na zbycie nieruchomości w dniu 09 grudnia 2026 r. o godz. 11.00 (dz.6/40 obr. 0015 3-09 przy ul. gen. I. Ledóchowskiego).',
    url: 'https://bip.nowydwormaz.pl/plik,6920.pdf',
  };
  const docText = `
    Burmistrz Miasta Nowy Dwór Mazowiecki
    Ogłoszenie o przetargu
    Burmistrz Miasta Nowy Dwór Mazowiecki ogłasza, że w dniu 09 grudnia 2026 roku o godz. 11.00 w sali 410 odbędzie się II przetarg ustny nieograniczony na sprzedaż prawa własności nieruchomości stanowiącej własność Miasta Nowy Dwór Mazowiecki.
    Lp. Nr ewid. Powierzchnia w ha Cena wywoławcza w zł brutto Minimalne postąpienie w zł
    1 6/40 7,8379 21 000 000,00 210 000,00
    Nieruchomość objęta jest KW WA1N/00064164/8.
    Opis: nieruchomość niezabudowana, położona w Nowym Dworze Mazowieckim przy ul. gen. Ignacego Ledóchowskiego w obrębie 0015 3-09.
    Wadium: 2 100 000,00 zł.
  `;
  const res = parseAnnouncement(item, docText);

  assert.equal(res.id, 'nowy-dwor-mazowiecki-6920');
  assert.equal(res.auction_date, '2026-12-09');
  assert.equal(res.price, 21000000);
  assert.equal(res.deposit, 2100000);
  assert.equal(res.parcel, '6/40');
  assert.equal(res.area, 78379);
  assert.equal(res.land_registry, 'WA1N/00064164/8');
  assert.equal(res.type, 'announcement');
});

test('nowy-dwor-mazowiecki: parseResultDoc extracts result status and buyer', () => {
  const item = {
    id: '6921',
    title: 'Informacja o wyniku przetargu na zbycie nieruchomości',
    url: 'https://bip.nowydwormaz.pl/plik,6921.pdf',
  };
  const docText = `
    Informacja o wyniku przetargu ustnego nieograniczonego
    W dniu 09 grudnia 2026 r. odbył się przetarg na sprzedaż nieruchomości dz. 6/40.
    Cena wywoławcza: 21 000 000,00 zł.
    Najwyższa cena osiągnięta w przetargu: 22 500 000,00 zł.
    Ustalona jako nabywca nieruchomości: Mazovia Invest Sp. z o.o.
    Liczba osób dopuszczonych: 3.
  `;
  const res = parseResultDoc(item, docText);

  assert.equal(res.id, 'nowy-dwor-mazowiecki-result-6921');
  assert.equal(res.status, 'positive');
  assert.equal(res.price_achieved, 22500000);
  assert.equal(res.buyer, 'Mazovia Invest Sp. z o.o');
  assert.equal(res.parcel, '6/40');
  assert.equal(res.type, 'result');
});
