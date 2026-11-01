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
} from '../src/cities/legionowo/parse.js';

test('legionowo: isAnnouncementTitle & isResultTitle', () => {
  assert.equal(
    isAnnouncementTitle('I przetarg ustny nieograniczony (licytacja) na sprzedaż nieruchomości niezabudowanej'),
    true
  );
  assert.equal(
    isAnnouncementTitle('Informacja o wyniku przetargu ustnego na sprzedaż nieruchomości'),
    false
  );
  assert.equal(
    isResultTitle('Informacja o wyniku przetargu z dnia 2 kwietnia 2026 roku'),
    true
  );
  assert.equal(
    isResultTitle('Projekt uchwały'),
    false
  );
});

test('legionowo: cleanText decodes HTML entities correctly', () => {
  const html = '<p>I przetarg ustny na sprzeda&#380; nieruchomo&#347;ci &bdquo;Jasnog&oacute;rska&rdquo; &amp; inne</p>';
  const cleaned = cleanText(html);
  assert.equal(cleaned, 'I przetarg ustny na sprzedaż nieruchomości „Jasnogórska” & inne');
});

test('legionowo: parsePlDate and parsePrice', () => {
  assert.equal(parsePlDate('3 grudnia 2026 roku'), '2026-12-03');
  assert.equal(parsePlDate('2 kwietnia 2026 r.'), '2026-04-02');
  assert.equal(parsePrice('483 000,00 zł'), 483000);
  assert.equal(parsePrice('540 000 zł'), 540000);
  assert.equal(parsePrice('5 000,00 zł'), 5000);
});

test('legionowo: parseAnnouncement extracts auction details', () => {
  const article = {
    id: '96343',
    link: 'a,96343,i-przetarg.html',
    title: 'I przetarg ustny nieograniczony (licytacja) na sprzedaż nieruchomości niezabudowanej, stanowiącej własność Gminy Miejskiej Legionowo',
    date: '2026-09-29 11:23:37',
  };
  const html = `
    <h1>I przetarg ustny nieograniczony na sprzedaż nieruchomości niezabudowanej</h1>
    <p>w dniu 3 grudnia 2026 roku o godz. 11:00 w sali konferencyjnej Urzędu Miasta Legionowo odbędzie się przetarg.</p>
    <p>Oznaczona w ewidencji jako działka nr 21/4 o powierzchni 780 m2 w obrębie 32, położona przy ul. Jasnogórska.</p>
    <p>Cena wywoławcza: 483 000,00 zł. Wadium: 49 000,00 zł.</p>
    <p>Księga wieczysta KW Nr WA1L/00071802/3.</p>
  `;
  const res = parseAnnouncement(article, html);

  assert.equal(res.id, 'legionowo-96343');
  assert.equal(res.auction_date, '2026-12-03');
  assert.equal(res.price, 483000);
  assert.equal(res.deposit, 49000);
  assert.equal(res.parcel, '21/4');
  assert.equal(res.area, 780);
  assert.equal(res.land_registry, 'WA1L/00071802/3');
  assert.equal(res.type, 'announcement');
});

test('legionowo: parseResultDoc extracts result outcome, buyer and achieved price', () => {
  const article = {
    id: '94837',
    link: 'a,94837,wynik-przetargu.html',
    title: 'Informacja o wyniku przetargu',
  };
  const html = `
    <p>Informacja o wyniku przetargu</p>
    <p>w dniu 2 kwietnia 2026 roku odbył się II przetarg ustny nieograniczony na działkę 21/4 przy ul. Jasnogórska.</p>
    <p>Osoby dopuszczone do uczestniczenia w przetargu: 2. Osoby niedopuszczone: 0.</p>
    <p>Cena wywoławcza netto: 483 000,00 zł.</p>
    <p>Najwyższa cena osiągnięta w przetargu netto: 540 000,00 zł.</p>
    <p>Osoba/firma ustalona jako nabywca nieruchomości: Nowa Perspektywa BIS Sp z o.o.</p>
  `;
  const res = parseResultDoc(article, html);

  assert.equal(res.id, 'legionowo-result-94837');
  assert.equal(res.status, 'positive');
  assert.equal(res.price_achieved, 540000);
  assert.equal(res.buyer, 'Nowa Perspektywa BIS Sp z o.o');
  assert.equal(res.bidders_count, 2);
  assert.equal(res.parcel, '21/4');
  assert.equal(res.type, 'result');
});
