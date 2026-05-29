// Bytom v2 parser tests. The live BIP list and i-BIIP catalog can't be reached
// from CI sandboxes (DNS-restricted), so we exercise the two parsers against
// fixtures that reproduce the real markup observed in a browser (May-2026).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseBipList, parseCatalog } from '../src/cities/bytom/crawl.js';

// ---- BIP list (primary source) -------------------------------------------

// One <li> exactly as bytom.pl/bip renders it.
function li({ date, href, addr, desc }) {
  return `<li class="aktualnosc__item">
    <span class="aktualnosci__data">${date}</span>
    <h3 class="aktualnosci__tytul">
      <a class="aktualnosci__link aktualnosc__link--more" href="${href}" title="Przejdź do: ${addr}">${addr}</a>
    </h3>
    <p class="aktualnosci__tresc">${desc}</p>
  </li>`;
}

const BIP_HTML = `<ul class="aktualnosci">
${li({ date: '2026-05-13', href: 'https://www.bytom.pl/bip/zbycie-nieruchomosci-bytom/sprzedaz-lokali-mieszkalnych/ul.-Katowicka-448/idn:13500', addr: 'ul. Katowicka 44/8', desc: 'Prezydent Bytomia ogłasza trzeci przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego z ułamkową niewydzieloną częścią działki gruntu, położonego w Bytomiu przy ul. Katowickiej 44/8.' })}
${li({ date: '2026-05-22', href: 'https://www.bytom.pl/bip/zbycie-nieruchomosci-bytom/sprzedaz-lokali-niemieszkalnych/pl.-Wolskiego-69/idn:13490', addr: 'pl. Michała Wolskiego 6/9', desc: 'Prezydent Bytomia ogłasza przetarg ustny nieograniczony na sprzedaż lokalu niemieszkalnego z ułamkową niewydzieloną częścią działki gruntu, położonego w Bytomiu przy pl. Michała Wolskiego 6/9.' })}
${li({ date: '2026-03-09', href: 'https://www.bytom.pl/bip/zbycie-nieruchomosci-bytom/sprzedaz-lokali-mieszkalnych/ul.-Wyspianskiego-59/idn:13450', addr: 'ul. Wyspiańskiego 5/9', desc: 'Prezydent Bytomia ogłasza drugi przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego położonego w Bytomiu przy ul. Wyspiańskiego 5/9.' })}
${li({ date: '2026-05-29', href: 'https://www.bytom.pl/bip/zbycie-nieruchomosci-bytom/sprzedaz-nieruchomosci-niezabudowane/ul.-Zgrzebnioka-dzialka-1923182/idn:13424', addr: 'ul. Zgrzebnioka (działka 1923/182)', desc: 'Prezydent Bytomia ogłasza drugi przetarg ustny nieograniczony na sprzedaż nieruchomości gruntowej niezabudowanej położonej w Bytomiu przy ul. Zgrzebnioka' })}
</ul>`;

test('parseBipList keeps flats + commercial, skips land', () => {
  const items = parseBipList(BIP_HTML);
  assert.equal(items.length, 3, 'the grunt parcel should be dropped');
  assert.deepEqual(items.map((i) => i.kind).sort(), ['mieszkalny', 'mieszkalny', 'uzytkowy']);
});

test('parseBipList extracts idn page URL, round, date and address', () => {
  const items = parseBipList(BIP_HTML);
  const kat = items.find((i) => i.address.key === 'katowicka|44|8');
  assert.ok(kat);
  assert.equal(kat.kind, 'mieszkalny');
  assert.equal(kat.round, 3); // "trzeci przetarg"
  assert.equal(kat.published_date, '2026-05-13');
  assert.match(kat.detail_url, /\/idn:13500$/);
  assert.equal(kat.detail_url.startsWith('https://www.bytom.pl/bip/'), true);
});

test('parseBipList round: bare "przetarg" = 1, "drugi" = 2', () => {
  const items = parseBipList(BIP_HTML);
  assert.equal(items.find((i) => i.address.key === 'michala wolskiego|6|9').round, 1);
  assert.equal(items.find((i) => i.address.key === 'wyspianskiego|5|9').round, 2);
});

test('parseBipList: empty / non-list HTML yields no items', () => {
  assert.deepEqual(parseBipList('<html><body>nic</body></html>'), []);
});

// ---- i-BIIP catalog (price/area enrichment, now a Map) --------------------

const CATALOG_HTML = `<main>
  <div><p><strong>ADRES:</strong> ul. Katowicka 44/8</p>
  <p><strong>TYP:</strong> lokal mieszkalny</p>
  <p><strong>ETAP SPRZEDAŻY:</strong> III Przetarg</p>
  <p><strong>TERMIN PRZETARGU:</strong> 2026-06-16</p>
  <p><strong>CENA WYWOŁAWCZA:</strong> 85000</p>
  <p><strong>POWIERZCHNIA:</strong> 53.77</p>
  <p><strong>LINK:</strong> <a href="https://www.bytom.pl/bip/download/Ogloszenie-przetargu-ul.-Katowicka-44-8,23643.doc">doc</a></p></div>
  <div><p><strong>ADRES:</strong> Matki Ewy dz. 5742/32</p>
  <p><strong>TYP:</strong> grunty niezabudowane</p>
  <p><strong>ETAP SPRZEDAŻY:</strong> II Przetarg</p>
  <p><strong>TERMIN PRZETARGU:</strong> 2026-06-08</p>
  <p><strong>CENA WYWOŁAWCZA:</strong> 15375</p>
  <p><strong>POWIERZCHNIA:</strong> 25</p>
  <p><strong>LINK:</strong> <a href="https://www.bytom.pl/bip/download/x,1.doc">doc</a></p></div>
</main>`;

test('parseCatalog returns an enrichment Map keyed by address, land skipped', () => {
  const map = parseCatalog(CATALOG_HTML);
  assert.equal(map.size, 1); // grunt dropped (dz. suffix)
  const kat = map.get('katowicka|44|8');
  assert.ok(kat);
  assert.equal(kat.auction_date, '2026-06-16');
  assert.equal(kat.starting_price_pln, 85000);
  assert.equal(kat.area_m2, 53.77);
  assert.match(kat.doc_url, /Katowicka-44-8,23643\.doc$/);
});
