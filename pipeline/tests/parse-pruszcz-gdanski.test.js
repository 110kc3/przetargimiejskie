import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isAnnouncementTitle,
  isResultTitle,
  parsePlDate,
  parsePrice,
  parseAnnouncement,
  parseResultDoc,
  parseXmlDoc,
} from '../src/cities/pruszcz-gdanski/parse.js';

test('pruszcz-gdanski: isAnnouncementTitle & isResultTitle', () => {
  assert.equal(isAnnouncementTitle('III ustny przetarg nieograniczony na sprzedaż nieruchomości niezabudowanej'), true);
  assert.equal(isAnnouncementTitle('Przetarg ustny nieograniczony na sprzedaż lokalu'), true);
  assert.equal(isAnnouncementTitle('Informacja o wyniku przetargu na nieruchomość'), false);

  assert.equal(isResultTitle('Informacja o wyniku przetargu ustnego nieograniczonego'), true);
  assert.equal(isResultTitle('Rozstrzygnięcie przetargu'), true);
  assert.equal(isResultTitle('Ogłoszenie o przetargu'), false);
});

test('pruszcz-gdanski: parsePlDate and parsePrice', () => {
  assert.equal(parsePlDate('28 .04 .2026 godz. 10:00'), '2026-04-28');
  assert.equal(parsePlDate('28.04.2026'), '2026-04-28');

  assert.equal(parsePrice('2 132 300,00 netto'), 2132300);
  assert.equal(parsePrice('150 000 zł'), 150000);
  assert.equal(parsePrice('cena osiągnięta: 2 450 000,00 zł'), 2450000);
});

test('pruszcz-gdanski: parseXmlDoc extracts real Logonet XML export fields', () => {
  const xml = `
    <?phpxml version="1.0" encoding="UTF-8"?>
    <bip.pruszcz-gdanski.pl>
      <artykuly>
        <artykul>
          <url>https://bip.pruszcz-gdanski.pl/przetarg-nieruchomosci/14224/iii-ustny-przetarg</url>
          <adres-nieruchomosci>ul. Zastawna</adres-nieruchomosci>
          <przetarg-na>Działki gruntowe niezabudowane stanowiące własność Gminy Miejskiej Pruszcz Gdański</przetarg-na>
          <typ-przetargu>Przetarg ustny nieograniczony</typ-przetargu>
          <rodzaj-nieruchomosci>Nieruchomość niezabudowana</rodzaj-nieruchomosci>
          <cena-wywolawcza>2 132 300,00 netto</cena-wywolawcza>
          <data-przetargu>28 .04 .2026 godz. 10:00</data-przetargu>
          <rozstrzygniecie><![CDATA[<p>Wyniki przetargu w załączniku.</p>]]></rozstrzygniecie>
          <tresc><![CDATA[<p>Burmistrz Pruszcza Gdańskiego ogłasza trzeci ustny przetarg nieograniczony na sprzedaż nieruchomości niezabudowanej stanowiącej własność Gminy Miejskiej Pruszcz Gdański<br /><br />1.<strong>Działki gruntowe niezabudowane nr 2/23, 2/25 o łącznej pow. 0,9890 ha, obr. 21</strong> zapisane w KW – GD1G/00302578/2, GD1G/00020192/1, położone przy ul. Zastawnej w Pruszczu Gdańskim.</p>]]></tresc>
        </artykul>
      </artykuly>
    </bip.pruszcz-gdanski.pl>
  `;
  const res = parseXmlDoc(xml);
  assert.equal(res.id, '14224');
  assert.equal(res.price, 2132300);
  assert.equal(res.auctionDate, '2026-04-28');
  assert.equal(res.address, 'ul. Zastawna');
  assert.equal(res.kw, 'GD1G/00302578/2');
  assert.equal(res.parcel, '2/23');
  assert.equal(res.area, 9890);
  assert.equal(res.kind, 'grunt');
});

test('pruszcz-gdanski: parseResultDoc extracts result status and buyer', () => {
  const item = {
    id: '14224',
    title: 'Informacja o wyniku przetargu ustnego na działki przy ul. Zastawnej',
  };
  const docText = `
    Informacja o wyniku przetargu ustnego nieograniczonego.
    W dniu 28.04.2026 r. odbył się przetarg.
    Cena wywoławcza: 2 132 300,00 zł.
    Najwyższa cena osiągnięta w przetargu: 2 250 000,00 zł.
    Nabywcą nieruchomości został wyłoniony: Deweloper Nadmorski Sp. z o.o.
  `;
  const res = parseResultDoc(item, docText);
  assert.equal(res.id, '14224');
  assert.equal(res.status, 'completed');
  assert.equal(res.price, 2250000);
  assert.equal(res.buyer, 'Deweloper Nadmorski Sp. z o.o.');
});
