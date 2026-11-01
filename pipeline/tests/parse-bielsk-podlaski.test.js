import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isAnnouncementTitle,
  isResultTitle,
  parsePlDate,
  parsePrice,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/bielsk-podlaski/parse.js';

test('bielsk-podlaski: isAnnouncementTitle & isResultTitle', () => {
  assert.equal(isAnnouncementTitle('ogłoszenie o przetargu na sprzedaż działki nr geod. 2306 położonej w okolicy ul. A. Mickiewicza'), true);
  assert.equal(isAnnouncementTitle('Przetarg ustny na sprzedaż lokalu mieszkalnego'), true);
  assert.equal(isAnnouncementTitle('Informacja o wyniku przetargu na sprzedaż działki nr 2306'), false);

  assert.equal(isResultTitle('Informacja o wyniku przetargu na sprzedaż działki nr 2306 położonej przy ul. Adama Mickiewicza'), true);
  assert.equal(isResultTitle('Rozstrzygnięcie przetargu ustnego'), true);
  assert.equal(isResultTitle('Ogłoszenie o przetargu'), false);
});

test('bielsk-podlaski: parsePlDate and parsePrice', () => {
  assert.equal(parsePlDate('26. marca 2026 r.'), '2026-03-26');
  assert.equal(parsePlDate('18 marca 2026 r.'), '2026-03-18');
  assert.equal(parsePlDate('2026-03-18'), '2026-03-18');

  assert.equal(parsePrice('Cena wywoławcza ustalona została w wysokości: 15 000,00'), 15000);
  assert.equal(parsePrice('cena sprzedaży ustalona została w wysokości: 15 150,00 zł'), 15150);
  assert.equal(parsePrice('45 000 zł'), 45000);
});

test('bielsk-podlaski: parseAnnouncement extracts notice details', () => {
  const item = {
    id: 'ogloszenie-o-przetargu-dzialka-2306',
    title: 'ogłoszenie o przetargu na sprzedaż działki nr geod. 2306 położonej w okolicy ul. A. Mickiewicza',
    url: 'https://bip-umbielsk.podlaskie.eu/nieruchomosci/ogloszenie-o-przetargu-dzialka-2306.html',
  };
  const docText = `
    BURMISTRZ MIASTA BIELSK PODLASKI
    ogłasza pierwszy przetarg ustny nieograniczony na sprzedaż nieruchomości oznaczonej numerem geodezyjnym 2306 o powierzchni 0,3317 ha położonej przy ul. Adama Mickiewicza w Bielsku Podlaskim.
    Księga wieczysta BI1P/00093057/4.
    Cena wywoławcza: 15 000,00 zł.
    Przetarg odbędzie się w dniu 18 marca 2026 r. o godz. 10.00 w siedzibie Urzędu Miasta Bielsk Podlaski przy ul. Mikołaja Kopernika 1.
  `;
  const res = parseAnnouncement(item, docText);
  assert.equal(res.id, 'ogloszenie-o-przetargu-dzialka-2306');
  assert.equal(res.price, 15000);
  assert.equal(res.auctionDate, '2026-03-18');
  assert.equal(res.kw, 'BI1P/00093057/4');
  assert.equal(res.parcel, '2306');
  assert.equal(res.area, 3317);
  assert.equal(res.kind, 'grunt');
});

test('bielsk-podlaski: parseResultDoc extracts real-world PDF result details', () => {
  const item = {
    id: 'informacja-o-wyniku-przetargu-dzialka-2306',
    title: 'Informacja o wyniku przetargu na sprzedaż działki nr 2306 położonej przy ul. Adama Mickiewicza',
    url: 'https://bip-umbielsk.podlaskie.eu/nieruchomosci/informacja-o-wyniku-przetargu-dzialka-2306.html',
  };
  const docText = `
    BURMISTRZ MIASTA BIELSK PODLASKI
    Bielsk Podlaski, 26. marca 2026 r.
    Gp.6840.4.2025
    Informacja o wyniku przetargu
    Burmistrz Miasta Bielsk Podlaski podaje do wiadomości publicznej, że w dniu 18 marca 2026 r. w siedzibie Urzędu Miasta Bielsk Podlaski w Bielsku Podlaskim przy ul. Mikołaja Kopernika 1, odbył się pierwszy przetarg ustny nieograniczony na sprzedaż nieruchomości oznaczonej numerem geodezyjnym 2306 o powierzchni 0,3317 ha położonej ul. Adama Mickiewicza w Bielsku Podlaskim, której prawo własności Gminy Miejskiej Bielsk Podlaski ujawnione zostało w prowadzonej przez Sąd Rejonowy w Bielsku Podlaskim V Wydział Ksiąg Wieczystych Księdze Wieczystej Nr BI1P/00093057/4.
    Cena wywoławcza ustalona została w wysokości: 15 000,00 złotych.
    W wyniku licytacji cena sprzedaży ustalona została w wysokości: 15 150,00 złotych.
    Na nabywcę nieruchomości ustalono: Helenę i Mirosława Burzyńskich.
    Burmistrz Miasta Piotr Wawulski
  `;
  const res = parseResultDoc(item, docText);
  assert.equal(res.id, 'informacja-o-wyniku-przetargu-dzialka-2306');
  assert.equal(res.status, 'completed');
  assert.equal(res.price, 15150);
  assert.equal(res.buyer, 'Helenę i Mirosława Burzyńskich');
});
