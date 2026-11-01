import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isAnnouncementTitle,
  isResultTitle,
  parsePlDate,
  parsePrice,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/dzialdowo/parse.js';

test('dzialdowo: isAnnouncementTitle & isResultTitle', () => {
  assert.equal(isAnnouncementTitle('Ogłoszenie o pierwszym przetargu ustnym nieograniczonym na sprzedaż lokalu'), true);
  assert.equal(isAnnouncementTitle('Przetarg ustny na sprzedaż nieruchomości przy ul. Zamkowej'), true);
  assert.equal(isAnnouncementTitle('Informacja o wyniku przetargu na sprzedaż nieruchomości przy ul. Młyńskiej 4 m. 6'), false);

  assert.equal(isResultTitle('Informacja o wyniku przetargu na sprzedaż nieruchomości przy ul. Młyńskiej 4 m. 6 w Działdowie.pdf'), true);
  assert.equal(isResultTitle('Rozstrzygnięcie przetargu ustnego'), true);
  assert.equal(isResultTitle('Ogłoszenie o przetargu'), false);
});

test('dzialdowo: parsePlDate and parsePrice', () => {
  assert.equal(parsePlDate('23.10.2026 r.'), '2026-10-23');
  assert.equal(parsePlDate('15 października 2026 r.'), '2026-10-15');
  assert.equal(parsePlDate('2026-10-15'), '2026-10-15');

  assert.equal(parsePrice('Cena wywoławcza wynosiła: 96 900,00 zł'), 96900);
  assert.equal(parsePrice('Najwyższa cena osiągnięta w przetargu: 97 870,00 zł'), 97870);
  assert.equal(parsePrice('120 000 zł'), 120000);
});

test('dzialdowo: parseAnnouncement extracts notice details', () => {
  const item = {
    id: '5968',
    title: 'Ogłoszenie o przetargu ustnym na sprzedaż lokalu mieszkalnego przy ul. Młyńskiej 4 m. 6',
    url: 'https://bip.dzialdowo.eu/artykul/590/5968',
  };
  const docText = `
    OGŁOSZENIE O PRZETARGU
    Burmistrz Miasta Działdowo ogłasza pierwszy przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 6 w budynku przy ul. Młyńskiej 4 w Działdowie.
    Działka o nr 1207, księga wieczysta EL1D/00026536/6.
    Powierzchnia użytkowa: 48,50 m2.
    Cena wywoławcza: 96 900,00 zł.
    Przetarg odbędzie się w dniu 15 października 2026 r. o godz. 11.00 w siedzibie Urzędu Miasta Działdowo.
  `;
  const res = parseAnnouncement(item, docText);
  assert.equal(res.id, '5968');
  assert.equal(res.price, 96900);
  assert.equal(res.auctionDate, '2026-10-15');
  assert.equal(res.kw, 'EL1D/00026536/6');
  assert.equal(res.parcel, '1207');
  assert.equal(res.area, 48.5);
  assert.equal(res.kind, 'mieszkalny');
});

test('dzialdowo: parseResultDoc extracts real-world PDF result details', () => {
  const item = {
    id: '5982',
    title: 'Informacja o wyniku przetargu na sprzedaż nieruchomości przy ul. Młyńskiej 4 m. 6 w Działdowie.pdf',
    url: 'https://bip.dzialdowo.eu/artykul/590/5982',
  };
  const docText = `
    GKW.6840.2.2026
    Działdowo, dnia 23.10.2026 r.
    Informacja o wyniku przetargu
    Działając zgodnie z § 12 rozporządzenia Rady Ministrów z dnia 14 września 2004 r. w sprawie sposobu i trybu przeprowadzenia przetargów oraz rokowań na zbycie nieruchomości
    podaję do publicznej wiadomości, że w dniu 15 października 2026 r. w siedzibie Urzędu Miasta Działdowo przy ul. Zamkowej 12, odbył się pierwszy ustny przetarg nieograniczony dotyczący sprzedaży nieruchomości położonej przy ul. Młyńskiej 4 m. 6 w Działdowie, stanowiącej własność Gminy – Miasto Działdowo, oznaczonej w ewidencji gruntów jako działka o nr 1207, zapisanej w księdze wieczystej nr EL1D/00026536/6.
    1) Liczba osób dopuszczonych do uczestnictwa w przetargu: 1
    2) Liczba osób niedopuszczonych do uczestnictwa w przetargu: 0
    3) Cena wywoławcza wynosiła: 96 900,00 zł
    4) Najwyższa cena osiągnięta w przetargu: 97 870,00 zł
    5) Nabywca nieruchomości: Michał i Monika Budzyńscy.
    BURMISTRZ /-/ Grzegorz Mrowiński
  `;
  const res = parseResultDoc(item, docText);
  assert.equal(res.id, '5982');
  assert.equal(res.status, 'completed');
  assert.equal(res.price, 97870);
  assert.equal(res.buyer, 'Michał i Monika Budzyńscy');
});
