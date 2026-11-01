import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isAnnouncementTitle,
  isResultTitle,
  parsePlDate,
  parsePrice,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/myszkow/parse.js';

test('myszkow: isAnnouncementTitle & isResultTitle', () => {
  assert.equal(isAnnouncementTitle('Ogłoszenie o pierwszym przetargu ustnym nieograniczonym na sprzedaż nieruchomości - nr działki 386/27'), true);
  assert.equal(isAnnouncementTitle('Ogłoszenie o przetargu na sprzedaż prawa własności nieruchomości'), true);
  assert.equal(isAnnouncementTitle('przetarg publiczny na sprzedaż pojazdu samochodowego Skoda Octavia'), false);
  assert.equal(isAnnouncementTitle('Informacja o wyniku przetargu na sprzedaż działki'), false);

  assert.equal(isResultTitle('Informacja o wyniku przetargu ustnego nieograniczonego'), true);
  assert.equal(isResultTitle('Rozstrzygnięcie przetargu'), true);
  assert.equal(isResultTitle('Ogłoszenie o przetargu'), false);
});

test('myszkow: parsePlDate and parsePrice', () => {
  assert.equal(parsePlDate('29 czerwca 2017 r.'), '2017-06-29');
  assert.equal(parsePlDate('2026-06-17'), '2026-06-17');
  assert.equal(parsePlDate('15.10.2026'), '2026-10-15');

  assert.equal(parsePrice('Cena wywoławcza nieruchomości: 130 000 zł + podatek VAT'), 130000);
  assert.equal(parsePrice('135 000 zł'), 135000);
  assert.equal(parsePrice('najwyższa cena: 142 000,00 zł'), 142000);
});

test('myszkow: parseAnnouncement extracts real-world PDF details', () => {
  const item = {
    id: '537',
    title: 'Ogłoszenie o pierwszym przetargu ustnym nieograniczonym na sprzedaż nieruchomości - nr działki 386/27',
    url: 'https://bip.miastomyszkow.pl/kategorie/450-przetargi-poza-ustawa-pzp/artykuly/537-ogloszenie-o-pierwszym-przetargu',
  };
  const docText = `
    OGŁOSZENIE O PRZETARGU
    BURMISTRZ MIASTA MYSZKOWA OGŁASZA:
    Pierwszy przetarg ustny nieograniczony na sprzedaż nieruchomości położonej w Myszkowie obręb Myszków, stanowiącej własność Gminy Myszków przeznaczonej do sprzedaży:
    Nr działki: 386/27
    Pow. w m2: 873
    Nr KW: CZ1M/00055320/1
    Położenie: Myszków w rejonie ul. Pięknej
    Przeznaczenie w MPZP: 32 MN - zabudowa mieszkaniowa jednorodzinna
    Cena wywoławcza nieruchomości (zł): 130 000 zł + podatek VAT
    Przetarg odbędzie się w dniu 24 września 2026 r. o godz. 10.00 w siedzibie Urzędu Miasta Myszkowa.
  `;
  const res = parseAnnouncement(item, docText);
  assert.equal(res.id, '537');
  assert.equal(res.price, 130000);
  assert.equal(res.auctionDate, '2026-09-24');
  assert.equal(res.kw, 'CZ1M/00055320/1');
  assert.equal(res.parcel, '386/27');
  assert.equal(res.area, 873);
  assert.equal(res.kind, 'grunt');
});

test('myszkow: parseResultDoc extracts result status and buyer', () => {
  const item = {
    id: '537',
    title: 'Informacja o wyniku przetargu ustnego nieograniczonego na działkę nr 386/27',
  };
  const docText = `
    Informacja o wyniku przetargu ustnego nieograniczonego na sprzedaż nieruchomości gruntowej.
    W dniu 24 września 2026 r. odbył się przetarg.
    Cena wywoławcza wynosiła 130 000,00 zł.
    Najwyższa cena osiągnięta w przetargu: 145 000,00 zł.
    Nabywcą nieruchomości został: Piotr Wiśniewski.
  `;
  const res = parseResultDoc(item, docText);
  assert.equal(res.id, '537');
  assert.equal(res.status, 'completed');
  assert.equal(res.price, 145000);
  assert.equal(res.buyer, 'Piotr Wiśniewski');
});
