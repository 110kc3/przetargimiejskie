import { test } from 'node:test';
import assert from 'node:assert/strict';

import brzeskoAdapter from '../src/cities/brzesko/index.js';
import { config } from '../src/cities/brzesko/config.js';
import {
  cleanText,
  parsePLN,
  parseArea,
  polishDateToIso,
  extractRound,
  extractAuctionDate,
  extractStartingPrice,
  extractDeposit,
  extractAddress,
  extractParcels,
  extractArticleLinks,
  parseAnnouncementNotice,
  parseResultDoc,
} from '../src/cities/brzesko/parse.js';

test('brzesko config exports expected metadata', () => {
  assert.equal(config.id, 'brzesko');
  assert.equal(config.teryt, '1202024');
  assert.equal(config.label, 'Brzesko');
  assert.equal(config.voivodeship, 'malopolskie');
  assert.equal(config.authority, 'Burmistrz Brzeska');
  assert.equal(config.host, 'www.brzesko.pl');
  assert.equal(config.source, 'html');
});

test('adapter default export conforms to pipeline contract', () => {
  assert.equal(brzeskoAdapter.id, 'brzesko');
  assert.equal(typeof brzeskoAdapter.crawlActive, 'function');
  assert.equal(typeof brzeskoAdapter.crawlResultDocs, 'function');
  assert.equal(typeof brzeskoAdapter.parseResultDoc, 'function');
});

test('cleanText cleans html entities and tags', () => {
  assert.equal(cleanText('<p>Burmistrz &amp; przetarg&nbsp;1</p>'), 'Burmistrz & przetarg 1');
  assert.equal(cleanText('&bdquo;Pomianowski Stok&rdquo;'), '„Pomianowski Stok”');
});

test('parsePLN parses Polish amounts', () => {
  assert.equal(parsePLN('2 620 800,00 zł'), 2620800);
  assert.equal(parsePLN('350 000,00 zł'), 350000);
  assert.equal(parsePLN('160.300 zł'), 160300);
  assert.equal(parsePLN(null), null);
});

test('parseArea converts m2 and ha', () => {
  assert.equal(parseArea('65,34 m2'), 65.34);
  assert.equal(parseArea('1,0425 ha'), 10425);
  assert.equal(parseArea(null), null);
});

test('polishDateToIso parses dates', () => {
  assert.equal(polishDateToIso('27 listopada 2026'), '2026-11-27');
  assert.equal(polishDateToIso('9 lipca 2026 r.'), '2026-07-09');
});

test('extractRound handles Roman and Polish round words', () => {
  assert.equal(extractRound('pierwszy publiczny nieograniczony przetarg ustny'), 1);
  assert.equal(extractRound('drugi ustny przetarg nieograniczony'), 2);
  assert.equal(extractRound('trzeci przetarg ustny'), 3);
  assert.equal(extractRound('IV przetarg'), 4);
});

test('extractAuctionDate parses date from announcement text', () => {
  const text = 'Przetarg odbędzie się dnia 27 listopada 2026 r. o godz. 10.00 w sali obrad';
  assert.equal(extractAuctionDate(text), '2026-11-27');
});

test('extractStartingPrice and deposit', () => {
  const text = 'Łączna cena wywoławcza gruntu netto: 2 620 800,00 zł. Wysokość wadium: 350 000,00 zł';
  assert.equal(extractStartingPrice(text), 2620800);
  assert.equal(extractDeposit(text), 350000);
});

test('extractParcels extracts lot numbers', () => {
  const text = 'Działka ewidencyjna nr 1411/438 oraz działka nr 1411/436 i działka 1411/443';
  assert.deepEqual(extractParcels(text), ['1411/438', '1411/436', '1411/443']);
});

test('extractArticleLinks parses blog list HTML', () => {
  const html = `
    <div>
      <a href="https://www.brzesko.pl/wpis/89096,ogloszenie-o-przetargu">
        <img src="foo.png" alt="Ogłoszenie o przetargu">
      </a>
      <a href="https://www.brzesko.pl/wpis/89096,ogloszenie-o-przetargu">Czytaj więcej</a>
      <a href="/wpis/89064,inny-przetarg">Czytaj więcej</a>
    </div>
  `;
  const links = extractArticleLinks(html);
  assert.equal(links.length, 2);
  assert.equal(links[0].url, 'https://www.brzesko.pl/wpis/89096,ogloszenie-o-przetargu');
  assert.equal(links[0].title, 'Ogłoszenie o przetargu');
  assert.equal(links[1].url, 'https://www.brzesko.pl/wpis/89064,inny-przetarg');
});

test('parseAnnouncementNotice extracts land lot correctly', () => {
  const sample = {
    url: 'https://www.brzesko.pl/wpis/89096,ogloszenie-o-przetargu',
    title: 'Ogłoszenie o przetargu',
    html: `
      <div>
        Burmistrz Brzeska ogłasza pierwszy publiczny nieograniczony przetarg ustny na zbycie prawa własności nieruchomości gruntowych położonych w Brzesku na „Pomianowskim Stoku”.
        Numer działki ewidencyjnej: 1411/438, powierzchnia działki [ha]: 1,0425.
        Cena wywoławcza: 2 620 800,00 zł. Wadium: 350 000,00 zł.
        Przetarg odbędzie się dnia 27 listopada 2026 r. o godz. 10.00.
      </div>
    `,
  };
  const parsed = parseAnnouncementNotice(sample);
  assert.ok(parsed);
  assert.equal(parsed.type, 'land');
  assert.equal(parsed.data.starting_price_pln, 2620800);
  assert.equal(parsed.data.auction_date, '2026-11-27');
  assert.equal(parsed.data.round, 1);
  assert.deepEqual(parsed.data.parcels, ['1411/438']);
});

test('parseAnnouncementNotice extracts residential flat correctly', () => {
  const sample = {
    url: 'https://www.brzesko.pl/wpis/12345,przetarg-mieszkanie',
    title: 'Sprzedaż lokalu mieszkalnego',
    html: `
      <div>
        Burmistrz Brzeska ogłasza drugi publiczny nieograniczony przetarg ustny na zbycie lokalu mieszkalnego nr 3, położonego przy ul. Mickiewicza 68a w Brzesku.
        Powierzchnia użytkowa lokalu: 54,20 m2.
        Cena wywoławcza: 215 000,00 zł. Wadium: 20 000,00 zł.
        Przetarg odbędzie się dnia 15 grudnia 2026 r. o godz. 11.00.
      </div>
    `,
  };
  const parsed = parseAnnouncementNotice(sample);
  assert.ok(parsed);
  assert.equal(parsed.type, 'property');
  assert.equal(parsed.data.area_m2, 54.2);
  assert.equal(parsed.data.starting_price_pln, 215000);
  assert.equal(parsed.data.deposit_pln, 20000);
  assert.equal(parsed.data.round, 2);
  assert.equal(parsed.data.auction_date, '2026-12-15');
});

test('parseResultDoc extracts sold and unsold outcomes', () => {
  const soldRef = {
    url: 'https://www.brzesko.pl/wpis/9999,wynik',
    title: 'Informacja o wyniku przetargu ustnego',
    text: 'Informacja o wyniku przetargu ustnego na sprzedaż nieruchomości przy ul. Mickiewicza 68a. Osiągnięto cenę 220 000,00 zł. Nabywca: Jan Kowalski. Przetarg odbył się 10 listopada 2026 r.',
  };
  const resSold = parseResultDoc(soldRef);
  assert.equal(resSold.length, 1);
  assert.equal(resSold[0].final_price_pln, 220000);
  assert.equal(resSold[0].outcome, 'sold');

  const unsoldRef = {
    url: 'https://www.brzesko.pl/wpis/9998,wynik-negatywny',
    title: 'Informacja o wyniku przetargu',
    text: 'Przetarg na nieruchomość przy ul. Rynek zakończył się wynikiem negatywnym z powodu braku wpłat wadium.',
  };
  const resUnsold = parseResultDoc(unsoldRef);
  assert.equal(resUnsold.length, 1);
  assert.equal(resUnsold[0].outcome, 'unsold');
});
