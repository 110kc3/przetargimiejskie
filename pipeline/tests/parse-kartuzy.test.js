import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isAnnouncementTitle,
  isResultTitle,
  parsePlDate,
  parsePrice,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/kartuzy/parse.js';

test('kartuzy: isAnnouncementTitle & isResultTitle', () => {
  assert.equal(isAnnouncementTitle('Ogłoszenie o przetargu ustnym nieograniczonym na oddanie w dzierżawę lokalu użytkowego'), true);
  assert.equal(isAnnouncementTitle('Zarządzenie w sprawie przeprowadzenia przetargu ustnego nieograniczonego'), true);
  assert.equal(isAnnouncementTitle('Informacja o wyniku przetargu na lokal użytkowy'), false);

  assert.equal(isResultTitle('Informacja o wyniku przetargu ustnego nieograniczonego'), true);
  assert.equal(isResultTitle('Rozstrzygnięcie przetargu z dnia 12.08.2026'), true);
  assert.equal(isResultTitle('Ogłoszenie o przetargu'), false);
});

test('kartuzy: parsePlDate and parsePrice', () => {
  assert.equal(parsePlDate('12.08.2026 r.'), '2026-08-12');
  assert.equal(parsePlDate('30.07.2026r.'), '2026-07-30');
  assert.equal(parsePlDate('2026-08-03 14:57:28'), '2026-08-03');

  assert.equal(parsePrice('Stawka wywoławcza do przetargu wynosi 14.700,00 zł netto miesięcznie'), 14700);
  assert.equal(parsePrice('wadium w wysokości 44.100,00 zł'), 44100);
  assert.equal(parsePrice('cena sprzedaży: 250 000 zł'), 250000);
});

test('kartuzy: parseAnnouncement extracts real-world PDF details', () => {
  const item = {
    id: '22526',
    title: 'Ogłoszenie o przetargu ustnym nieograniczonym na oddanie w dzierżawę lokalu użytkowego przy ul. Dworzec 4 w Kartuzach',
    link: 'a,22526,ogloszenie-o-przetargu.html',
    date: '2026-08-03 14:57:28',
  };
  const docText = `
    BURMISTRZ KARTUZ
    Kartuzy, dnia 30.07.2026r.
    GN.7151.4.2026.KO
    Ogłoszenie o przetargu
    Burmistrz Kartuz ogłasza przetarg ustny nieograniczony na oddanie w dzierżawę lokalu użytkowego przy ul. Dworzec 4 w Kartuzach tj. pomieszczenia dworca o łącznej pow. 341,54 m2 do obsługi podróżnych.
    Stawka wywoławcza do przetargu wynosi 14.700,00 zł netto miesięcznie, postąpienie wynosi 300,00 zł netto.
    Przetarg odbędzie się w budynku Urzędu Miejskiego w Kartuzach ul. gen. Józefa Hallera 1, dnia 12.08.2026r. w sali nr 104 na I piętrze budynku, o godzinie 10.00.
    W przetargu mogą brać udział osoby, które wpłacą wadium w wysokości 44.100,00 zł.
  `;
  const res = parseAnnouncement(item, docText);
  assert.equal(res.id, '22526');
  assert.equal(res.price, 14700);
  assert.equal(res.auctionDate, '2026-08-12');
  assert.equal(res.area, 341.54);
  assert.equal(res.kind, 'uzytkowy');
});

test('kartuzy: parseResultDoc extracts result status and buyer', () => {
  const item = {
    id: '22526',
    title: 'Informacja o wyniku przetargu ustnego nieograniczonego na lokal przy ul. Dworzec 4',
  };
  const docText = `
    Informacja o wyniku przetargu ustnego nieograniczonego.
    W dniu 12.08.2026 r. odbył się przetarg.
    Cena wywoławcza: 14.700,00 zł.
    Najwyższa cena osiągnięta w przetargu: 16.500,00 zł.
    Nabywcą nieruchomości została ustalona: Firma Handlowa Pomorze Sp. z o.o.
  `;
  const res = parseResultDoc(item, docText);
  assert.equal(res.id, '22526');
  assert.equal(res.status, 'completed');
  assert.equal(res.price, 16500);
  assert.equal(res.buyer, 'Firma Handlowa Pomorze Sp. z o.o.');
});
