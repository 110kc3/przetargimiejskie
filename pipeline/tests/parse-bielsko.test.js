// Bielsko-Biała parser tests. The live giełda (bielsko-biala.pl) can't be
// reached from CI sandboxes, so we exercise the parser against fixtures that
// reproduce the documented "Najważniejsze informacje" labelled block (June 2026,
// SPIKE-WAVE2.md "Bielsko-Biała"). Tune these against the first real refresh if
// the live markup differs.

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

import { parseIndexLinks } from '../src/cities/bielsko/crawl.js';

// A flat offer's detail node, Drupal-style label/value divs. Includes the
// structured `Powierzchnia` = PLOT area (438 m²) to confirm it is NOT taken as
// the flat area, and the real flat area (17,75 m²) in the description prose.
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

// A non-flat offer (działka / plot) — must be rejected by isFlat / parseNode.
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
  // "Cena" must not swallow "Cena wywoławcza"-style suffixes; here it's the
  // plain price.
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
  assert.equal(roundFromForma('Rokowania po drugim przetargu'), 2); // ordinal wins
  assert.equal(roundFromForma('Rokowania'), null); // negotiations, no round
  assert.equal(roundFromForma('przetarg pisemny'), 1); // bare → first
});

test('priceFrom reads the Cena field as integer PLN', () => {
  assert.equal(priceFrom(htmlToText(FLAT_NODE)), 92450);
});

test('auctionDateFrom parses dd.mm.yyyy → ISO', () => {
  assert.equal(auctionDateFrom(htmlToText(FLAT_NODE)), '2026-06-12');
});

test('areaFrom takes the flat usable area, not the plot or cellar', () => {
  const area = areaFrom(htmlToText(FLAT_NODE));
  assert.equal(area, 17.75); // not 438 (plot) and not 3.40 (cellar)
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

// ---- Land (działka) wiring (HL-1 Bielsko) ----
import { parseLandNode, plotAreaFrom } from '../src/cities/bielsko/parse.js';
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
  assert.equal(r.dzialka_nr, '1922/182'); // not "1922/182 Typ działki: budowlana"
  assert.equal(r.obreb, 'Lipnik');        // not "Lipnik Księga wieczysta: …"
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

// ---- joint-lot address (the Łukowa 15+17 CI sanity failure) ----
test('addressFrom keys a joint-lot ("ul. Łukowa 15, Łukowa 17") on the first, clean street', () => {
  const node = '<div><div class="label">Adres:</div><div class="val">ul. Łukowa 15, Łukowa 17</div></div>';
  const a = addressFrom(htmlToText(node));
  assert.ok(a, 'joint-lot still keyed');
  assert.equal(a.address.street_norm, 'lukowa');   // not "lukowa 15 lukowa"
  assert.equal(a.address.building, '15');
  assert.ok(!/\d/.test(a.address.street), 'street has no digits → passes the sanity gate');
});

test('addressFrom drops an address that can only resolve to a junk (digit) street', () => {
  const node = '<div><div class="label">Adres:</div><div class="val">działka 12/3 na terenie</div></div>';
  // no clean street → null (rather than emit a junk-street record that fails CI)
  assert.equal(addressFrom(htmlToText(node)), null);
});
