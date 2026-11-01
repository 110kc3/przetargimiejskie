import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isAnnouncementTitle,
  isResultTitle,
  parsePlDate,
  parsePrice,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/hajnowka/parse.js';

test('hajnowka: isAnnouncementTitle & isResultTitle', () => {
  assert.equal(isAnnouncementTitle('PRZETARG Nr 7/2024'), true);
  assert.equal(isAnnouncementTitle('OGŁOSZENIE o przetargu ustnym nieograniczonym na najem lokalu użytkowego położonego przy ul. Ks.I.Wierobieja 18'), true);
  assert.equal(isAnnouncementTitle('Zapytanie ofertowe na usuwanie wyrobów zawierających azbest'), false);
  assert.equal(isAnnouncementTitle('Informacja o wyniku przetargu na lokal użytkowy'), false);

  assert.equal(isResultTitle('Informacja o wyniku przetargu ustnego nieograniczonego'), true);
  assert.equal(isResultTitle('Rozstrzygnięcie przetargu'), true);
  assert.equal(isResultTitle('Ogłoszenie o przetargu'), false);
});

test('hajnowka: parsePlDate and parsePrice', () => {
  assert.equal(parsePlDate('15.11.2024 r.'), '2024-11-15');
  assert.equal(parsePlDate('15 listopada 2024 r.'), '2024-11-15');
  assert.equal(parsePlDate('2024-11-15'), '2024-11-15');

  assert.equal(parsePrice('Cena wywoławcza: 1 200,00 zł'), 1200);
  assert.equal(parsePrice('stawka wywoławcza: 35,00 zł'), 35);
  assert.equal(parsePrice('85 000 zł'), 85000);
});

test('hajnowka: parseAnnouncement extracts notice details', () => {
  const item = {
    id: 'ogloszenie-o-przetargu-lokal-wierobieja-18',
    title: 'OGŁOSZENIE o przetargu ustnym nieograniczonym na najem lokalu użytkowego położonego przy ul. Ks.I.Wierobieja 18 (lokal G) w Hajnówce',
    url: 'https://bip.hajnowka.pl/article/ogloszenie-o-przetargu-lokal-wierobieja-18/',
  };
  const docText = `
    BURMISTRZ MIASTA HAJNÓWKA
    ogłasza przetarg ustny nieograniczony na najem lokalu użytkowego położonego przy ul. Ks.I.Wierobieja 18 (lokal G) w Hajnówce.
    Powierzchnia użytkowa lokalu: 38,50 m2.
    Działka nr 156/8, księga wieczysta BI2P/00012345/6.
    Stawka wywoławcza: 1 200,00 zł miesięcznie.
    Przetarg odbędzie się w dniu 15 listopada 2024 r. o godz. 11.00 w Urzędzie Miasta Hajnówka, ul. Zina 1.
  `;
  const res = parseAnnouncement(item, docText);
  assert.equal(res.id, 'ogloszenie-o-przetargu-lokal-wierobieja-18');
  assert.equal(res.price, 1200);
  assert.equal(res.auctionDate, '2024-11-15');
  assert.equal(res.kw, 'BI2P/00012345/6');
  assert.equal(res.parcel, '156/8');
  assert.equal(res.area, 38.5);
  assert.equal(res.kind, 'uzytkowy');
});

test('hajnowka: parseResultDoc extracts result status and buyer', () => {
  const item = {
    id: 'informacja-o-wyniku-przetargu-wierobieja-18',
    title: 'Informacja o wyniku przetargu ustnego na lokal przy ul. Ks.I.Wierobieja 18',
  };
  const docText = `
    Informacja o wyniku przetargu ustnego nieograniczonego.
    W dniu 15 listopada 2024 r. w Hajnówce odbył się przetarg na najem lokalu użytkowego.
    Cena wywoławcza: 1 200,00 zł.
    Najwyższa cena osiągnięta w przetargu: 1 450,00 zł.
    Nabywcą nieruchomości została ustalona: Usługi Medyczne Podlasie Sp. z o.o.
  `;
  const res = parseResultDoc(item, docText);
  assert.equal(res.id, 'informacja-o-wyniku-przetargu-wierobieja-18');
  assert.equal(res.status, 'completed');
  assert.equal(res.price, 1450);
  assert.equal(res.buyer, 'Usługi Medyczne Podlasie Sp. z o.o.');
});
