// Bytom catalog parser tests. The i-BIIP catalog page can't be reached from CI
// sandboxes (DNS-restricted), so we exercise parseCatalog() against a fixture
// that reproduces the catalog's labelled-field markup with real observed values
// (addresses, rounds, prices, areas) from the May-2026 spike.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseCatalog } from '../src/cities/bytom/crawl.js';

// Reproduces one catalog record as the d17 CMS renders it: bold labels, text
// values, <br> separators, a .doc announcement link, then the geoportal link.
function rec({ adres, typ, etap, termin, cena, pow, link }) {
  return `
  <div class="nieruchomosc">
    <p><strong>ADRES:</strong> ${adres}</p>
    <p><strong>TYP:</strong> ${typ}</p>
    <p><strong>ETAP SPRZEDAŻY:</strong> ${etap}</p>
    <p><strong>TERMIN PRZETARGU:</strong> ${termin}</p>
    <p><strong>CENA WYWOŁAWCZA:</strong> ${cena}</p>
    <p><strong>POWIERZCHNIA:</strong> ${pow}</p>
    <p><strong>LINK:</strong> <a href="${link}">${link}</a></p>
    <p><a href="https://sitplan.um.bytom.pl/?profile=4939">Przejdź do geoportalu</a></p>
  </div>`;
}

const FIXTURE = `<html><body><nav>menu</nav><main>
${rec({ adres: 'pl. Akademicki 11/12', typ: 'lokal mieszkalny', etap: 'III Przetarg', termin: '2026-06-15', cena: '97000', pow: '76.14', link: 'https://www.bytom.pl/bip/download/Ogloszenie-przetargu-pl.-Akademicki-11-12,23604.doc' })}
${rec({ adres: 'pl. Michała Wolskiego 6/9', typ: 'lokal użytkowy', etap: 'I Przetarg', termin: '2026-06-22', cena: '170000', pow: '88.43', link: 'https://www.bytom.pl/bip/download/Ogloszenie-przetargu-pl.-Wolskiego-6_9,23775.doc' })}
${rec({ adres: 'Marszałka Józefa Piłsudskiego 65/10', typ: 'lokal użytkowy', etap: 'II Przetarg', termin: '2026-06-11', cena: '75000', pow: '59.28', link: 'https://www.bytom.pl/bip/download/Ogloszenie-przetargu-ul.-Pilsudskiego-65_10,23532.doc' })}
${rec({ adres: 'al. Jana Nowaka-Jeziorańskiego; Hutnicza', typ: 'grunty niezabudowane', etap: 'I Przetarg', termin: '2026-04-21', cena: '1500000', pow: '9719', link: 'https://www.bytom.pl/download/Ogloszenie-przetargu-al.-Jezioranskiego-Hutnicza-ustny-I,7522.doc' })}
${rec({ adres: 'Matki Ewy dz. 5742/32', typ: 'grunty niezabudowane', etap: 'II Przetarg', termin: '2026-06-08', cena: '15375', pow: '25', link: 'https://www.bytom.pl/bip/download/Ogloszenie-przetargu-ul.-Matki-Ewy-dz.-5742_32,23505.doc' })}
</main><footer>Urząd Miasta Bytom, ul. Parkowa 2</footer></body></html>`;

test('keeps only flats + commercial units, skips land parcels', () => {
  const out = parseCatalog(FIXTURE);
  assert.equal(out.length, 3, 'two grunt parcels should be dropped');
  assert.deepEqual(
    out.map((l) => l.kind).sort(),
    ['mieszkalny', 'uzytkowy', 'uzytkowy'],
  );
});

test('extracts every field for a residential flat', () => {
  const flat = parseCatalog(FIXTURE).find((l) => l.kind === 'mieszkalny');
  assert.ok(flat);
  assert.equal(flat.address_raw, 'pl. Akademicki 11/12');
  assert.equal(flat.address.key, 'akademicki|11|12');
  assert.equal(flat.auction_date, '2026-06-15');
  assert.equal(flat.round, 3);
  assert.equal(flat.starting_price_pln, 97000);
  assert.equal(flat.area_m2, 76.14);
  assert.match(flat.detail_url, /Akademicki-11-12,23604\.doc$/);
});

test('parses round from I/II/III Przetarg', () => {
  const out = parseCatalog(FIXTURE);
  const byKey = Object.fromEntries(out.map((l) => [l.address.key, l.round]));
  assert.equal(byKey['akademicki|11|12'], 3);
  assert.equal(byKey['michala wolskiego|6|9'], 1);
  assert.equal(byKey['marszalka jozefa pilsudskiego|65|10'], 2);
});

test('handles Polish comma decimals and spaced thousands in prices/areas', () => {
  const html = `<main>${rec({ adres: 'Testowa 1/2', typ: 'lokal mieszkalny', etap: 'I Przetarg', termin: '2026-01-01', cena: '1 500 000', pow: '52,40', link: 'https://www.bytom.pl/bip/download/x,1.doc' })}</main>`;
  const [l] = parseCatalog(html);
  assert.equal(l.starting_price_pln, 1500000);
  assert.equal(l.area_m2, 52.4);
});

test('empty / non-catalog HTML yields no records', () => {
  assert.deepEqual(parseCatalog('<html><body>nothing here</body></html>'), []);
});
