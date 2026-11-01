import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isAnnouncementTitle,
  isResultTitle,
  parsePlDate,
  parsePrice,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/krasnystaw/parse.js';

test('krasnystaw: isAnnouncementTitle & isResultTitle', () => {
  assert.equal(isAnnouncementTitle('Ogłoszenie o pierwszym przetargu ustnym nieograniczonym na sprzedaż lokalu'), true);
  assert.equal(isAnnouncementTitle('Przetarg ustny nieograniczony na sprzedaż nieruchomości przy ul. Okrzei'), true);
  assert.equal(isAnnouncementTitle('Informacja o wyniku przetargu na sprzedaż lokalu'), false);

  assert.equal(isResultTitle('Informacja o wyniku przetargu ustnego nieograniczonego'), true);
  assert.equal(isResultTitle('Rozstrzygnięcie przetargu'), true);
  assert.equal(isResultTitle('Ogłoszenie o przetargu'), false);
});

test('krasnystaw: parsePlDate and parsePrice', () => {
  assert.equal(parsePlDate('28.10.2026 r.'), '2026-10-28');
  assert.equal(parsePlDate('28 października 2026 r.'), '2026-10-28');
  assert.equal(parsePlDate('2026-10-28'), '2026-10-28');

  assert.equal(parsePrice('Cena wywoławcza: 110 000,00 zł'), 110000);
  assert.equal(parsePrice('najwyższa cena: 122 000 zł'), 122000);
  assert.equal(parsePrice('95 000 zł'), 95000);
});

test('krasnystaw: parseAnnouncement extracts notice details', () => {
  const item = {
    id_dokumentu: '2370318',
    tresc: 'Ogłoszenie o przetargu ustnym nieograniczonym na sprzedaż nieruchomości lokalowej',
    data_utworzenia: '2026-10-28',
  };
  const docText = `
    BURMISTRZ KRASNYSTAWU
    Ogłoszenie o przetargu ustnym nieograniczonym na sprzedaż lokalu mieszkalnego przy ul. Okrzei 15 m. 4 w Krasnymstawie.
    Lokal o powierzchni użytkowej 42,30 m2.
    Księga wieczysta ZA1K/00045678/9, działka nr 112/4.
    Cena wywoławcza: 110 000,00 zł.
    Przetarg odbędzie się w dniu 25 listopada 2026 r. o godz. 10:00 w sali konferencyjnej Urzędu Miasta Krasnystaw.
  `;
  const res = parseAnnouncement(item, docText);
  assert.equal(res.id, '2370318');
  assert.equal(res.price, 110000);
  assert.equal(res.auctionDate, '2026-11-25');
  assert.equal(res.kw, 'ZA1K/00045678/9');
  assert.equal(res.parcel, '112/4');
  assert.equal(res.area, 42.3);
  assert.equal(res.kind, 'mieszkalny');
});

test('krasnystaw: parseResultDoc extracts result status and buyer', () => {
  const item = {
    id_dokumentu: '2370319',
    tresc: 'Informacja o wyniku przetargu ustnego na lokal przy ul. Okrzei 15 m. 4',
  };
  const docText = `
    Informacja o wyniku przetargu ustnego nieograniczonego.
    W dniu 25 listopada 2026 r. w Krasnymstawie odbył się przetarg.
    Cena wywoławcza: 110 000,00 zł.
    Cena osiągnięta w przetargu: 121 500,00 zł.
    Nabywcą nieruchomości został ustalony: Paweł Kozłowski.
  `;
  const res = parseResultDoc(item, docText);
  assert.equal(res.id, '2370319');
  assert.equal(res.status, 'completed');
  assert.equal(res.price, 121500);
  assert.equal(res.buyer, 'Paweł Kozłowski');
});
