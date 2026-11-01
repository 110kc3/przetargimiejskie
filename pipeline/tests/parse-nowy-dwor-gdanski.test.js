import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isAnnouncementTitle,
  isResultTitle,
  parsePlDate,
  parsePrice,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/nowy-dwor-gdanski/parse.js';

test('nowy-dwor-gdanski: isAnnouncementTitle & isResultTitle', () => {
  assert.equal(isAnnouncementTitle('ZAWIADOMIENIE - wykazy nieruchomości przeznaczonych do zbycia w drodze przetargu ustnego nieograniczonego'), true);
  assert.equal(isAnnouncementTitle('Ogłoszenie o przetargu ustnym na sprzedaż lokalu mieszkalnego'), true);
  assert.equal(isAnnouncementTitle('Informacja o wyniku przetargu na sprzedaż nieruchomości'), false);

  assert.equal(isResultTitle('Informacja o wyniku przetargu ustnego nieograniczonego'), true);
  assert.equal(isResultTitle('Rozstrzygnięcie przetargu'), true);
  assert.equal(isResultTitle('Ogłoszenie o przetargu'), false);
});

test('nowy-dwor-gdanski: parsePlDate and parsePrice', () => {
  assert.equal(parsePlDate('06.10.2026 r.'), '2026-10-06');
  assert.equal(parsePlDate('6 października 2026 r.'), '2026-10-06');
  assert.equal(parsePlDate('2026-10-06'), '2026-10-06');

  assert.equal(parsePrice('Cena wywoławcza: 125 000,00 zł'), 125000);
  assert.equal(parsePrice('najwyższa cena: 135 000 zł'), 135000);
  assert.equal(parsePrice('85 000 zł'), 85000);
});

test('nowy-dwor-gdanski: parseAnnouncement extracts notice details', () => {
  const item = {
    id: 'zawiadomienie-wykazy-nieruchomosci',
    title: 'ZAWIADOMIENIE - wykazy nieruchomości przeznaczonych do zbycia w drodze przetargu ustnego nieograniczonego',
    link: 'https://bip.miastonowydwor.pl/aktualnosci/zawiadomienie-wykazy-nieruchomosci.html',
  };
  const docText = `
    Burmistrz Nowego Dworu Gdańskiego informuje, że w siedzibie Urzędu Miejskiego w Nowym Dworze Gdańskim ul. Wejhera 3 zostały wywieszone wykazy nieruchomości przeznaczonych do zbycia w drodze przetargu ustnego nieograniczonego:
    Przedmiotem przetargu jest nieruchomość gruntowa, działka o nr 45/2 położona przy ul. Morskiej.
    Księga wieczysta GD2M/00023456/7, powierzchnia: 1250 m2.
    Cena wywoławcza: 125 000,00 zł.
    Przetarg odbędzie się w dniu 28 października 2026 r. o godz. 11:00 w siedzibie Urzędu Miejskiego.
  `;
  const res = parseAnnouncement(item, docText);
  assert.equal(res.id, 'zawiadomienie-wykazy-nieruchomosci');
  assert.equal(res.price, 125000);
  assert.equal(res.auctionDate, '2026-10-28');
  assert.equal(res.kw, 'GD2M/00023456/7');
  assert.equal(res.parcel, '45/2');
  assert.equal(res.area, 1250);
  assert.equal(res.kind, 'grunt');
});

test('nowy-dwor-gdanski: parseResultDoc extracts result status and buyer', () => {
  const item = {
    id: 'informacja-o-wyniku-przetargu-ul-morska',
    title: 'Informacja o wyniku przetargu ustnego na działkę przy ul. Morskiej',
  };
  const docText = `
    Informacja o wyniku przetargu ustnego nieograniczonego.
    W dniu 28 października 2026 r. odbył się przetarg.
    Cena wywoławcza: 125 000,00 zł.
    Cena osiągnięta w przetargu: 138 000,00 zł.
    Nabywcą nieruchomości został wyłoniony: Tomasz Kamiński.
  `;
  const res = parseResultDoc(item, docText);
  assert.equal(res.id, 'informacja-o-wyniku-przetargu-ul-morska');
  assert.equal(res.status, 'completed');
  assert.equal(res.price, 138000);
  assert.equal(res.buyer, 'Tomasz Kamiński');
});
