
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseNode,
  htmlToText,
  field,
  isFlat,
  roundFromForma,
  priceFrom,
  auctionDateFrom,
  areaFrom,
  addressFrom,
} from '../src/cities/bielsko/parse.js';

import { parseIndexLinks, classifyFallback } from '../src/cities/bielsko/crawl.js';

const FLAT_NODE = `
<article class="nieruchomosc">
  <h1>Lokal mieszkalny — ul. Stanisława Wyspiańskiego 32/9</h1>
  <div class="najwazniejsze">
    <div class="field"><div class="label">Adres:</div><div class="val">ul. Stanisława Wyspiańskiego 32/9</div></div>
    <div class="field"><div class="label">Cena:</div><div class="val">92&nbsp;450,00 zł</div></div>
    <div class="field"><div class="label">Rodzaj nieruchomości:</div><div class="val">lokal mieszkalny</div></div>
    <div class="field"><div class="label">Data przetargu / rokowań:</div><div class="val">12.06.2026 r.</div></div>
    <div class="field"><div class="label">Forma przetargu:</div><div class="val">Pierwszy przetarg pisemny nieograniczony</div></div>
    <div class="field"><div class="label">Status oferty:</div><div class="val">Przetarg ogłoszony</div></div>
    <div class="field"><div class="label">Wysokość wadium:</div><div class="val">9 245,00 zł</div></div>
    <div class="field"><div class="label">Obręb:</div><div class="val">Lipnik</div></div>
    <div class="field"><div class="label">Powierzchnia:</div><div class="val">438 m2</div></div>
  </div>
  <div class="opis">
    <p>Lokal mieszkalny położony na II piętrze. Powierzchnia użytkowa lokalu wynosi 17,75 m2.
    Do lokalu przynależy piwnica o powierzchni 3,40 m2.</p>
  </div>
</article>`;

const PLOT_NODE = `
<article>
  <div><div class="label">Adres:</div><div class="val">ul. Polna (działka)</div></div>
  <div><div class="label">Cena:</div><div class="val">250 000,00 zł</div></div>
  <div><div class="label">Rodzaj nieruchomości:</div><div class="val">działka niezabudowana</div></div>
  <div><div class="label">Forma przetargu:</div><div class="val">Drugi przetarg ustny nieograniczony</div></div>
  <div><div class="label">Powierzchnia:</div><div class="val">812 m2</div></div>
</article>`;

test('field() reads a labelled value up to the next label', () => {
  const t = htmlToText(FLAT_NODE);
  assert.equal(field(t, 'Adres'), 'ul. Stanisława Wyspiańskiego 32/9');
  assert.equal(field(t, 'Rodzaj nieruchomości'), 'lokal mieszkalny');
  assert.equal(field(t, 'Status oferty'), 'Przetarg ogłoszony');
  assert.equal(field(t, 'Forma przetargu'), 'Pierwszy przetarg pisemny nieograniczony');
  assert.equal(field(t, 'Cena'), '92 450,00 zł');
});

test('isFlat classifies on Rodzaj nieruchomości', () => {
  assert.equal(isFlat('lokal mieszkalny'), true);
  assert.equal(isFlat('Lokal mieszkalny'), true);
  assert.equal(isFlat('działka niezabudowana'), false);
  assert.equal(isFlat('lokal użytkowy'), false);
  assert.equal(isFlat('garaż'), false);
});

test('roundFromForma maps the ordinal in Forma przetargu', () => {
  assert.equal(roundFromForma('Pierwszy przetarg pisemny nieograniczony'), 1);
  assert.equal(roundFromForma('Drugi przetarg ustny nieograniczony'), 2);
  assert.equal(roundFromForma('Trzeci przetarg'), 3);
  assert.equal(roundFromForma('Rokowania po drugim przetargu'), 2);
  assert.equal(roundFromForma('Rokowania'), null);
  assert.equal(roundFromForma('przetarg pisemny'), 1);
});

test('priceFrom reads the Cena field as integer PLN', () => {
  assert.equal(priceFrom(htmlToText(FLAT_NODE)), 92450);
});

test('auctionDateFrom parses dd.mm.yyyy → ISO', () => {
  assert.equal(auctionDateFrom(htmlToText(FLAT_NODE)), '2026-06-12');
});

test('areaFrom takes the flat usable area, not the plot or cellar', () => {
  const area = areaFrom(htmlToText(FLAT_NODE));
  assert.equal(area, 17.75);
});

test('addressFrom keys the Adres field', () => {
  const a = addressFrom(htmlToText(FLAT_NODE));
  assert.ok(a);
  assert.equal(a.address.building, '32');
  assert.equal(a.address.apt, '9');
  assert.equal(a.address.street_norm, 'stanislawa wyspianskiego');
});

test('parseNode returns a full flat listing', () => {
  const l = parseNode(FLAT_NODE);
  assert.ok(l);
  assert.equal(l.kind, 'mieszkalny');
  assert.equal(l.starting_price_pln, 92450);
  assert.equal(l.area_m2, 17.75);
  assert.equal(l.round, 1);
  assert.equal(l.auction_date, '2026-06-12');
  assert.equal(l.status, 'Przetarg ogłoszony');
});

test('parseNode rejects non-flat offers (plot)', () => {
  assert.equal(parseNode(PLOT_NODE), null);
});

test('parseIndexLinks extracts unique /nieruchomosc node URLs', () => {
  const html = `
    <ul class="gielda">
      <li><a href="/nieruchomosc/wyspianskiego-32-9">…</a></li>
      <li><a href="/nieruchomosc/11-listopada-23-2">…</a></li>
      <li><a href="/nieruchomosc/wyspianskiego-32-9">dup</a></li>
      <li><a href="https://bielsko-biala.pl/nieruchomosc/modrzewskiego-2-5">abs</a></li>
      <li><a href="/gielda-nieruchomosci?page=1">pager — ignored</a></li>
    </ul>`;
  const links = parseIndexLinks(html);
  assert.deepEqual(links, [
    'https://bielsko-biala.pl/nieruchomosc/wyspianskiego-32-9',
    'https://bielsko-biala.pl/nieruchomosc/11-listopada-23-2',
    'https://bielsko-biala.pl/nieruchomosc/modrzewskiego-2-5',
  ]);
});

import { parseLandNode, plotAreaFrom, parseListingNode } from '../src/cities/bielsko/parse.js';
import { buildLand } from '../src/core/build-land.js';

const LAND_NODE = `
<article class="nieruchomosc">
  <h1>Działka niezabudowana — ul. Bukowa</h1>
  <div class="najwazniejsze">
    <div class="field"><div class="label">Adres:</div><div class="val">ul. Bukowa</div></div>
    <div class="field"><div class="label">Numer działki:</div><div class="val">1922/182</div></div>
    <div class="field"><div class="label">Typ działki:</div><div class="val">budowlana</div></div>
    <div class="field"><div class="label">Cena:</div><div class="val">670 000,00 zł</div></div>
    <div class="field"><div class="label">Rodzaj nieruchomości:</div><div class="val">nieruchomość niezabudowana</div></div>
    <div class="field"><div class="label">Forma przetargu:</div><div class="val">Pierwszy przetarg ustny nieograniczony</div></div>
    <div class="field"><div class="label">Obręb:</div><div class="val">Lipnik</div></div>
    <div class="field"><div class="label">Księga wieczysta:</div><div class="val">BB1B/00097805/6</div></div>
    <div class="field"><div class="label">Data przetargu / rokowań:</div><div class="val">15.07.2026 r.</div></div>
    <div class="field"><div class="label">Powierzchnia:</div><div class="val">1 234 m2</div></div>
  </div>
</article>`;

test('plotAreaFrom reads the structured Powierzchnia (plot) area', () => {
  assert.equal(plotAreaFrom(htmlToText(LAND_NODE)), 1234);
});

test('parseLandNode parses a działka into a parcel-shaped land record', () => {
  const r = parseLandNode(LAND_NODE, 'https://bielsko-biala.pl/nieruchomosc/bukowa-dz');
  assert.ok(r);
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '1922/182');
  assert.equal(r.obreb, 'Lipnik');
  assert.equal(r.zoning, 'budowlana');
  assert.equal(r.area_m2, 1234);
  assert.equal(r.starting_price_pln, 670000);
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2026-07-15');
});

test('parseLandNode returns null for an unkeyable plot (no parcel, no address)', () => {
  const node = '<div><div class="label">Rodzaj nieruchomości:</div><div class="val">działka</div></div>';
  assert.equal(parseLandNode(node, 'u'), null);
});

test('Bielsko land node flows through buildLand into a keyed plot + geoportal link', () => {
  const r = parseLandNode(LAND_NODE, 'u://x');
  const { plots } = buildLand([r], 'bielsko', { label: 'Bielsko-Biała' });
  assert.equal(plots.length, 1);
  assert.equal(plots[0].key, 'dz|lipnik|1922/182');
  assert.equal(plots[0].kind, 'grunt');
  assert.equal(plots[0].area_m2, 1234);
  assert.ok(plots[0].geoportal_url, 'geoportal_url resolved');
});

test('addressFrom keys a joint-lot ("ul. Łukowa 15, Łukowa 17") on the first, clean street', () => {
  const node = '<div><div class="label">Adres:</div><div class="val">ul. Łukowa 15, Łukowa 17</div></div>';
  const a = addressFrom(htmlToText(node));
  assert.ok(a, 'joint-lot still keyed');
  assert.equal(a.address.street_norm, 'lukowa');
  assert.equal(a.address.building, '15');
  assert.ok(!/\d/.test(a.address.street), 'street has no digits → passes the sanity gate');
});

test('addressFrom drops an address that can only resolve to a junk (digit) street', () => {
  const node = '<div><div class="label">Adres:</div><div class="val">działka 12/3 na terenie</div></div>';
  assert.equal(addressFrom(htmlToText(node)), null);
});

const FLAT_NODE_NO_RODZAJ = `
<article class="nieruchomosc">
  <h1>Ogłoszenie o przetargu — ul. Andrzeja Frycza Modrzewskiego 2/5</h1>
  <div class="kategoria">Kategoria: Mieszkania</div>
  <div class="najwazniejsze">
    <div class="field"><div class="label">Adres:</div><div class="val">ul. Andrzeja Frycza Modrzewskiego 2/5</div></div>
    <div class="field"><div class="label">Cena:</div><div class="val">768&nbsp;080,00 zł</div></div>
    <div class="field"><div class="label">Data przetargu / rokowań:</div><div class="val">14.07.2026 r.</div></div>
    <div class="field"><div class="label">Forma przetargu:</div><div class="val">Pierwszy przetarg ustny nieograniczony</div></div>
    <div class="field"><div class="label">Powierzchnia:</div><div class="val">512 m2</div></div>
  </div>
  <div class="opis">
    <p>Lokal mieszkalny położony na parterze budynku. Powierzchnia użytkowa lokalu wynosi 130,21 m2.</p>
  </div>
</article>`;

test('classifyFallback recovers a flat from a node with NO Rodzaj field (chip + prose)', () => {
  assert.equal(classifyFallback(htmlToText(FLAT_NODE_NO_RODZAJ)), 'mieszkalny');
});

test('classifyFallback reads the category chip even without body prose', () => {
  assert.equal(classifyFallback('Kategoria: Lokale użytkowe'), 'uzytkowy');
  assert.equal(classifyFallback('Kategoria: Domy'), 'zabudowana');
  assert.equal(classifyFallback('Kategoria: Działki'), 'grunt');
  assert.equal(classifyFallback('Kategoria: Mieszkania'), 'mieszkalny');
});

test('classifyFallback falls back to title+body prose when there is no chip', () => {
  assert.equal(
    classifyFallback('Przedmiotem przetargu jest lokal użytkowy o powierzchni 45 m2.'),
    'uzytkowy',
  );
  assert.equal(
    classifyFallback('Sprzedaż nieruchomości zabudowanej budynkiem mieszkalnym jednorodzinnym.'),
    'zabudowana',
  );
});

test('classifyFallback returns unknown when neither chip nor prose carries a kind', () => {
  assert.equal(classifyFallback('Ogłoszenie. Cena wywoławcza 100 000 zł. Termin 01.01.2027.'), 'unknown');
});

test('a missing-Rodzaj flat node is keyable as a listing via the fallback path', () => {
  const node = parseListingNode(FLAT_NODE_NO_RODZAJ, 'https://bielsko-biala.pl/nieruchomosc/modrzewskiego-2-5', 'mieszkalny');
  assert.ok(node, 'missing-Rodzaj flat still keyed');
  assert.equal(node.kind, 'mieszkalny');
  assert.equal(node.starting_price_pln, 768080);
  assert.equal(node.area_m2, 130.21);
  assert.equal(node.address.building, '2');
  assert.equal(node.address.apt, '5');
  assert.equal(node.auction_date, '2026-07-14');
});
