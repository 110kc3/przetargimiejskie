import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isAnnouncementTitle,
  isResultTitle,
  parsePlDate,
  parsePrice,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/puck/parse.js';

test('puck: isAnnouncementTitle & isResultTitle', () => {
  assert.equal(isAnnouncementTitle('Ogłoszenie o I przetargu ustnym nieograniczonym na sprzedaż nieruchomości lokalu mieszkalnego przy ul. Nowej 8 m.2'), true);
  assert.equal(isAnnouncementTitle('Ogłoszenie o V przetargu ustnym nieograniczonym na sprzedaż nieruchomości dz. nr 15/11'), true);
  assert.equal(isAnnouncementTitle('Informacja o wyniku przetargu na sprzedaż nieruchomości'), false);

  assert.equal(isResultTitle('Informacja o wyniku przetargu ustnego nieograniczonego'), true);
  assert.equal(isResultTitle('Rozstrzygnięcie przetargu na działkę nr 15/11'), true);
  assert.equal(isResultTitle('Ogłoszenie o przetargu'), false);
});

test('puck: parsePlDate and parsePrice', () => {
  assert.equal(parsePlDate('30.07.2026 r.'), '2026-07-30');
  assert.equal(parsePlDate('30 lipca 2026 r.'), '2026-07-30');
  assert.equal(parsePlDate('2026-07-30'), '2026-07-30');

  assert.equal(parsePrice('Cena wywoławcza: 185 000,00 zł'), 185000);
  assert.equal(parsePrice('cena osiągnięta: 196 000 zł'), 196000);
  assert.equal(parsePrice('320 000 zł'), 320000);
});

test('puck: parseAnnouncement extracts real-world PDF notice details', () => {
  const item = {
    id: 'ogloszenie-o-i-przetargu-lokal-mieszkalny-ul-nowa-8-m-2',
    slug: 'ogloszenie-o-i-przetargu-lokal-mieszkalny-ul-nowa-8-m-2',
    title: 'Ogłoszenie o I przetargu ustnym nieograniczonym na sprzedaż nieruchomości lokalu mieszkalnego przy ul. Nowej 8 m.2',
    url: 'https://bip.miastopuck.pl/artykul/ogloszenie-o-i-przetargu-lokal-mieszkalny-ul-nowa-8-m-2',
  };
  const docText = `
    BURMISTRZ MIASTA PUCK
    Ogłoszenie o I przetargu ustnym nieograniczonym na sprzedaż nieruchomości lokalowej
    Przedmiotem przetargu jest lokal mieszkalny nr 2 położony w Pucku przy ul. Nowej 8.
    Powierzchnia użytkowa lokalu: 54,20 m2.
    Księga wieczysta GD2W/00012345/6, działka nr 473.
    Cena wywoławcza: 185 000,00 zł.
    Przetarg odbędzie się w dniu 30 lipca 2026 r. o godz. 10.00 w sali posiedzeń Urzędu Miasta Puck, ul. 1 Maja 13.
  `;
  const res = parseAnnouncement(item, docText);
  assert.equal(res.id, 'ogloszenie-o-i-przetargu-lokal-mieszkalny-ul-nowa-8-m-2');
  assert.equal(res.price, 185000);
  assert.equal(res.auctionDate, '2026-07-30');
  assert.equal(res.kw, 'GD2W/00012345/6');
  assert.equal(res.parcel, '473');
  assert.equal(res.area, 54.2);
  assert.equal(res.kind, 'mieszkalny');
});

test('puck: parseResultDoc extracts result status and buyer', () => {
  const item = {
    id: 'informacja-o-wyniku-przetargu-ul-nowa-8-m-2',
    title: 'Informacja o wyniku przetargu ustnego na lokal przy ul. Nowej 8 m.2',
  };
  const docText = `
    Informacja o wyniku przetargu ustnego nieograniczonego na sprzedaż lokalu mieszkalnego przy ul. Nowej 8 m. 2.
    W dniu 30 lipca 2026 r. w Urzędzie Miasta Puck przeprowadzono przetarg.
    Cena wywoławcza: 185 000,00 zł.
    Cena osiągnięta w przetargu: 195 500,00 zł.
    Nabywcą nieruchomości została: Marzena Kowalczyk.
  `;
  const res = parseResultDoc(item, docText);
  assert.equal(res.id, 'informacja-o-wyniku-przetargu-ul-nowa-8-m-2');
  assert.equal(res.status, 'completed');
  assert.equal(res.price, 195500);
  assert.equal(res.buyer, 'Marzena Kowalczyk');
});
