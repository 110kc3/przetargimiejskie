// Mysłowice parser tests. Mysłowice runs on the FINN eUrząd platform, so the
// parsing is the shared core/finn-bip.js logic (re-exported via the city's
// parse.js). The live BIP can't be reached from CI sandboxes, so we exercise the
// parsers against fixtures reproducing the real `/artykul/` announcement HTML
// (entity-encoded) documented in SPIKE-WAVE2.md "Mysłowice".

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseAnnouncement,
  isFlatAuction,
  roundFromTitle,
  auctionDateFromText,
  areaFromText,
  priceFromText,
  htmlToText,
  parseIndexLinks,
} from '../src/cities/myslowice/parse.js';

// A real flat-auction announcement: round in the TITLE ("o I przetargu"),
// price/area/date in the body. Body entity-encoded like FINN returns it
// (&#322;=ł, &#380;=ż, &sup2;=²). Includes the plot "o pow. 512 m2" to confirm
// it is NOT mistaken for the flat's usable area.
const FLAT_TITLE =
  'Ogłoszenie o I przetargu ustnym nieograniczonym na sprzedaż lokalu mieszkalnego nr 47 położonego przy ul. Armii Krajowej 6B w Mysłowicach';
const FLAT_BODY =
  '<p>Prezydent Miasta Mys&#322;owice og&#322;asza I przetarg ustny nieograniczony na ' +
  'sprzeda&#380; lokalu mieszkalnego nr 47 po&#322;o&#380;onego przy ul. Armii Krajowej 6B. ' +
  'Lokal o powierzchni u&#380;ytkowej 47,30 m&sup2; po&#322;o&#380;ony jest na dzia&#322;ce ' +
  'o pow. 512 m2. Cena wywo&#322;awcza wynosi 215 000,00 z&#322;. ' +
  'Przetarg odb&#281;dzie si&#281; w dniu 23 kwietnia 2026 r. w sali 204 Urz&#281;du Miasta.</p>';

test('isFlatAuction keeps flat sales, drops land / rentals / bezprzetargowe', () => {
  assert.equal(isFlatAuction(FLAT_TITLE), true);
  assert.equal(
    isFlatAuction('Ogłoszenie o przetargu na sprzedaż nieruchomości niezabudowanej (działka nr 207/15)'),
    false,
  );
  assert.equal(
    isFlatAuction('Wykaz lokali mieszkalnych do sprzedaży bezprzetargowej na rzecz najemców'),
    false,
  );
  assert.equal(
    isFlatAuction('Przetarg ustny nieograniczony na najem lokalu mieszkalnego'),
    false,
  );
});

test('roundFromTitle reads the roman/word ordinal from the title', () => {
  assert.equal(roundFromTitle(FLAT_TITLE), 1); // "o I przetargu"
  assert.equal(roundFromTitle('Ogłoszenie o II przetargu na sprzedaż lokalu mieszkalnego'), 2);
  assert.equal(roundFromTitle('Ogłoszenie o III przetargu ustnym'), 3);
  assert.equal(roundFromTitle('Ogłoszenie o drugim przetargu na sprzedaż mieszkania'), 2);
  assert.equal(roundFromTitle('Ogłoszenie o przetargu ustnym nieograniczonym'), 1); // bare = 1
});

test('parseAnnouncement extracts address/area/price/date/round', () => {
  const r = parseAnnouncement(FLAT_TITLE, FLAT_BODY);
  assert.ok(r);
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'armii krajowej|6B|47');
  assert.equal(r.area_m2, 47.3); // flat usable area, NOT the 512 m² plot
  assert.equal(r.starting_price_pln, 215000);
  assert.equal(r.auction_date, '2026-04-23');
  assert.equal(r.round, 1);
});

test('htmlToText decodes numeric refs + &sup2;', () => {
  assert.equal(htmlToText('47,30 m&sup2;'), '47,30 m²');
  assert.equal(htmlToText('po&#322;o&#380;ony'), 'położony');
});

test('areaFromText prefers labelled flat area, rejects plot + cellar', () => {
  assert.equal(areaFromText('działka o pow. 512 m2, powierzchnia użytkowa lokalu: 47,30 m²'), 47.3);
  assert.equal(areaFromText('budynek na działce o pow. 488 m2'), null); // plot only → null
  assert.equal(areaFromText('komórka lokatorska 4,5 m²'), null); // implausible flat → null
});

test('priceFromText handles spaced thousands + grosze', () => {
  assert.equal(priceFromText('Cena wywoławcza wynosi 215 000,00 zł'), 215000);
  assert.equal(priceFromText('cena wywoławcza: 89 500 zł'), 89500);
});

test('auctionDateFromText: spelled month and numeric', () => {
  assert.equal(auctionDateFromText('Przetarg odbędzie się w dniu 23 kwietnia 2026 r.'), '2026-04-23');
  assert.equal(auctionDateFromText('Przetarg odbędzie się w dniu 06.09.2026 r.'), '2026-09-06');
});

test('parseIndexLinks harvests FINN /artykul/ + /Article/get/id, links', () => {
  const html = `
    <ul>
      <li><a href="/artykul/ogloszenie-o-i-przetargu-armii-krajowej-6b">x</a></li>
      <li><a href="https://bip.myslowice.pl/artykul/ogloszenie-o-przetargu-zielona-8-1">y</a></li>
      <li><a href="/Article/get/id,12345.html">z</a></li>
      <li><a href="/kontakt">skip</a></li>
      <li><a href="/artykul/ogloszenie-o-i-przetargu-armii-krajowej-6b">dup</a></li>
    </ul>`;
  const links = parseIndexLinks(html, 'https://bip.myslowice.pl');
  assert.deepEqual(links, [
    'https://bip.myslowice.pl/artykul/ogloszenie-o-i-przetargu-armii-krajowej-6b',
    'https://bip.myslowice.pl/artykul/ogloszenie-o-przetargu-zielona-8-1',
    'https://bip.myslowice.pl/Article/get/id,12345.html',
  ]);
});
