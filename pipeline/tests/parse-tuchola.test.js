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
} from '../src/cities/tuchola/parse.js';

test('tuchola: isAnnouncementTitle & isResultTitle', () => {
  assert.equal(
    isAnnouncementTitle('Ogłoszenie o przetargu nieograniczonym na sprzedaż działki'),
    true
  );
  assert.equal(
    isResultTitle('Informacja o wyniku przetargu ustnego na sprzedaż nieruchomości'),
    true
  );
});

test('tuchola: parsePlDate and parsePrice', () => {
  assert.equal(parsePlDate('22 września 2026 r.'), '2026-09-22');
  assert.equal(parsePlDate('15.10.2026'), '2026-10-15');
  assert.equal(parsePrice('348.800,00 zł'), 348800);
  assert.equal(parsePrice('30.000,00 zł'), 30000);
});

test('tuchola: parseAnnouncement extracts real-world notice details', () => {
  const article = {
    id: '33479',
    link: 'a,33479,ogloszenie-o-przetargu.html',
    title: 'Ogłoszenie o przetargu nieograniczonym na sprzedaż działki położonej w Tucholi przy ul. Jaśminowej',
    date: '2026-08-15 10:00:00',
  };
  const html = `
    <p>Burmistrz Tucholi ogłasza Pierwszy przetarg ustny nieograniczony na sprzedaż działki położonej w Tucholi przy ul. Jaśminowej przeznaczonej pod budowę budynku mieszkalnego jednorodzinnego.</p>
    <p>Nr działki: 3909, Pow. w m 2: 2052, Nr księgi wieczystej: BY1T/00040432/3, Cena wywoławcza w zł: 348.800,00, Wysokość wadium w zł: 30.000,00.</p>
    <p>Przetarg odbędzie się w dniu 22 września 2026 r. o godz. 10.00 w Urzędzie Miejskim w Tucholi.</p>
  `;
  const res = parseAnnouncement(article, html);

  assert.equal(res.id, 'tuchola-33479');
  assert.equal(res.auction_date, '2026-09-22');
  assert.equal(res.price, 348800);
  assert.equal(res.deposit, 30000);
  assert.equal(res.parcel, '3909');
  assert.equal(res.area, 2052);
  assert.equal(res.land_registry, 'BY1T/00040432/3');
  assert.equal(res.type, 'announcement');
  assert.equal(res.property_type, 'grunt');
});

test('tuchola: parseResultDoc extracts result status and buyer', () => {
  const article = {
    id: '33480',
    link: 'a,33480,wynik-przetargu.html',
    title: 'Informacja o wyniku przetargu ustnego na sprzedaż działki',
  };
  const html = `
    <p>Informacja o wyniku przetargu ustnego</p>
    <p>W dniu 22 września 2026 r. odbył się przetarg na sprzedaż działki nr 3909 przy ul. Jaśminowej.</p>
    <p>Cena wywoławcza: 348.800,00 zł.</p>
    <p>Najwyższa cena osiągnięta w przetargu: 360.000,00 zł.</p>
    <p>Ustalona jako nabywca nieruchomości: Robert Zieliński</p>
    <p>Osoby dopuszczone do uczestniczenia: 2.</p>
  `;
  const res = parseResultDoc(article, html);

  assert.equal(res.id, 'tuchola-result-33480');
  assert.equal(res.status, 'positive');
  assert.equal(res.price_achieved, 360000);
  assert.equal(res.buyer, 'Robert Zieliński');
  assert.equal(res.parcel, '3909');
  assert.equal(res.type, 'result');
});
