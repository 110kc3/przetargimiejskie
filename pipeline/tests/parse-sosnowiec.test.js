// Sosnowiec parser tests. The live BIP JSON API can't be reached from CI
// sandboxes, so we exercise the parser against fixtures reproducing the real
// `content` HTML (entity-encoded) observed via the API (June 2026).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseAnnouncement,
  isFlatAuction,
  roundFromText,
  auctionDateFromText,
  areaFromText,
  priceFromText,
  htmlToText,
} from '../src/cities/sosnowiec/parse.js';

// A real flat-auction article body, entity-encoded like the API returns it
// (&#322;=ł, &#380;=ż, &sup2;=²). Includes the plot "o pow. 438 m2" to confirm
// it is NOT mistaken for the flat area.
const FLAT_TITLE =
  'Przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 15 położonego w budynku wielomieszkaniowym przy Alei Zwycięstwa 25';
const FLAT_CONTENT =
  '<p>PREZYDENT MIASTA SOSNOWCA og&#322;asza ustny przetarg nieograniczony na sprzeda&#380; ' +
  'lokalu mieszkalnego nr 15, po&#322;o&#380;onego na III pi&#281;trze przy Alei Zwyci&#281;stwa 25 w Sosnowcu. ' +
  'Budynek po&#322;o&#380;ony jest na dzia&#322;ce nr 2128 o pow. 438 m2. ' +
  'Wyposa&#380;enie: powierzchnia u&#380;ytkowa lokalu: 17,85 m&sup2;; pomieszczenia: pok&oacute;j. ' +
  'Cena wywo&#322;awcza do przetargu wynosi 77 000,00 z&#322;. ' +
  'Przetarg odb&#281;dzie si&#281; w dniu 23 stycznia 2026 r. w Urz&#281;dzie Miejskim.</p>';

test('isFlatAuction keeps flat auctions, drops land + bezprzetargowe', () => {
  assert.equal(isFlatAuction(FLAT_TITLE), true);
  assert.equal(
    isFlatAuction('Przetarg ustny nieograniczony na sprzedaż nieruchomości niezabudowanej przy ul. Klonowej'),
    false,
  );
  assert.equal(
    isFlatAuction('Wykaz lokali mieszkalnych przeznaczonych do sprzedaży bezprzetargowej na rzecz najemców'),
    false,
  );
  assert.equal(
    isFlatAuction('Przetarg ustny nieograniczony na sprzedaż prawa własności lokalu mieszkalnego nr 59'),
    true,
  );
});

test('parseAnnouncement extracts address/area/price/date/round', () => {
  const r = parseAnnouncement(FLAT_TITLE, FLAT_CONTENT);
  assert.ok(r);
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'alei zwyciestwa|25|15');
  assert.equal(r.area_m2, 17.85); // flat area, NOT the 438 m² plot
  assert.equal(r.starting_price_pln, 77000);
  assert.equal(r.auction_date, '2026-01-23');
  assert.equal(r.round, 1); // "ogłasza ustny przetarg" — no ordinal = first
});

test('htmlToText decodes numeric refs + &sup2;', () => {
  assert.equal(htmlToText('17,85 m&sup2;'), '17,85 m²');
  assert.equal(htmlToText('po&#322;o&#380;ony'), 'położony');
});

test('areaFromText prefers labelled flat area, rejects plot + cellar', () => {
  assert.equal(areaFromText('działka o pow. 438 m2, powierzchnia użytkowa lokalu: 40,15 m²'), 40.15);
  assert.equal(areaFromText('budynek na działce o pow. 488 m2'), null); // plot only → null
  assert.equal(areaFromText('komórka 4,5 m²'), null); // implausible flat → null
});

test('priceFromText handles spaced thousands + grosze', () => {
  assert.equal(priceFromText('Cena wywoławcza do przetargu wynosi 323 000,00 zł'), 323000);
});

test('auctionDateFromText: spelled month and numeric', () => {
  assert.equal(auctionDateFromText('Przetarg odbędzie się w dniu 23 stycznia 2026 r.'), '2026-01-23');
  assert.equal(auctionDateFromText('Przetarg odbędzie się w dniu 06.09.2024 r.'), '2024-09-06');
});

test('roundFromText reads the "ogłasza … przetarg" span, not history', () => {
  assert.equal(roundFromText('ogłasza ustny przetarg nieograniczony'), 1);
  assert.equal(roundFromText('ogłasza drugi ustny przetarg nieograniczony'), 2);
  assert.equal(roundFromText('ogłasza II ustny przetarg'), 2);
  // a "trzeci przetarg" buried in the history section must NOT win
  assert.equal(
    roundFromText('ogłasza ustny przetarg na sprzedaż. Wcześniej pierwszy i drugi i trzeci przetarg zakończyły się wynikiem negatywnym.'),
    1,
  );
});
