import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isAnnouncementTitle,
  isResultTitle,
  parsePlDate,
  parsePrice,
  parseAnnouncement,
  parseResultDoc,
} from '../src/cities/zywiec/parse.js';

test('zywiec: isAnnouncementTitle & isResultTitle', () => {
  assert.equal(isAnnouncementTitle('Przetarg ustny nieograniczony na sprzedaż zabudowanych nieruchomości w Zwardoniu'), true);
  assert.equal(isAnnouncementTitle('Pięć przetargów ustnych nieograniczonych na sprzedaż niezabudowanych nieruchomości'), true);
  assert.equal(isAnnouncementTitle('Informacja o wyniku przetargu na sprzedaż lokalu'), false);

  assert.equal(isResultTitle('Informacja o wyniku przetargu ustnego nieograniczonego'), true);
  assert.equal(isResultTitle('Rozstrzygnięcie przetargu z dnia 10.12.2026'), true);
  assert.equal(isResultTitle('Ogłoszenie o przetargu'), false);
});

test('zywiec: parsePlDate and parsePrice', () => {
  assert.equal(parsePlDate('10 grudnia 2026 r.'), '2026-12-10');
  assert.equal(parsePlDate('16 lipca 2026 r.'), '2026-07-16');
  assert.equal(parsePlDate('2026-08-03'), '2026-08-03');

  assert.equal(parsePrice('Cena wywoławcza: 2 066 700,- zł brutto'), 2066700);
  assert.equal(parsePrice('Przetarg nr 2   29 000,-zł'), 29000);
  assert.equal(parsePrice('najwyższa cena: 35 500,00 zł'), 35500);
});

test('zywiec: parseAnnouncement extracts real notice details', () => {
  const item = {
    id: '9028',
    title: 'Przetarg ustny nieograniczony na sprzedaż zabudowanych nieruchomości położonych w Zwardoniu',
    url: 'https://www.bip.zywiec.pl/item/9028',
  };
  const html = `
    <div class="blog-post-content">
      <h1>Przetarg ustny nieograniczony na sprzedaż zabudowanych nieruchomości położonych w Zwardoniu</h1>
      <p>BURMISTRZ MIASTA ŻYWCA ogłasza przetarg ustny nieograniczony na sprzedaż nieruchomości zabudowanych dwoma budynkami położonych w Zwardoniu przy ul. Głównej 12.</p>
      <p>Cena wywoławcza: 2 066 700,- zł brutto</p>
      <p>Wadium w kwocie 150 000,-zł należy wpłacić do dnia 7 grudnia 2026 r.</p>
      <p>Przetarg odbędzie się dnia 10 grudnia 2026 r. o godz. 10:00 w budynku Urzędu Miejskiego w Żywcu, Rynek 2.</p>
      <p>Działka o numerze 3600/161 o powierzchni 0,0631 ha. Księga wieczysta: BB1Z/00061672/4</p>
    </div>
  `;
  const res = parseAnnouncement(item, html);
  assert.equal(res.id, '9028');
  assert.equal(res.price, 2066700);
  assert.equal(res.auctionDate, '2026-12-10');
  assert.equal(res.kw, 'BB1Z/00061672/4');
  assert.equal(res.parcel, '3600/161');
  assert.equal(res.area, 631);
  assert.equal(res.kind, 'zabudowana');
});

test('zywiec: parseResultDoc extracts result status and buyer', () => {
  const item = {
    id: '8884',
    title: 'Informacja o wyniku przetargu na sprzedaż nieruchomości',
  };
  const html = `
    <div class="blog-post-content">
      <p>Informacja o wyniku przetargu ustnego nieograniczonego na sprzedaż nieruchomości.</p>
      <p>W dniu 16 lipca 2026 r. odbył się przetarg.</p>
      <p>Cena wywoławcza wynosiła 29 000,00 zł.</p>
      <p>Najwyższa cena osiągnięta w przetargu: 34 500,00 zł.</p>
      <p>Nabywcą nieruchomości został: Jan Kowalski i Anna Kowalska.</p>
    </div>
  `;
  const res = parseResultDoc(item, html);
  assert.equal(res.id, '8884');
  assert.equal(res.status, 'completed');
  assert.equal(res.price, 34500);
  assert.equal(res.buyer, 'Jan Kowalski i Anna Kowalska');
});
