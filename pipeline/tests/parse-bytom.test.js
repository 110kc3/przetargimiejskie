// Bytom v2 parser tests. The live BIP list and i-BIIP catalog can't be reached
// from CI sandboxes (DNS-restricted), so we exercise the two parsers against
// fixtures that reproduce the real markup observed in a browser (May-2026).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseBipList, parseCatalog, attachmentUrlFromDetail } from '../src/cities/bytom/crawl.js';
import {
  parseAnnouncement,
  roundFromText,
  auctionDateFromText,
  priceFromText,
  areaFromText,
} from '../src/cities/bytom/parse.js';

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

//
// ---- .doc announcement parser (enrichActive recovery path) ---------------
// These fixtures reproduce the standard Polish ogłoszenie boilerplate the
// catdoc-converted .doc carries. No real .doc is reachable from CI (DNS), so
// the live fetch + catdoc conversion are validated on the first real refresh;
// here we pin the text-parsing logic.

// Spelled-out month, labelled area, cellar + plot present (must be ignored).
const DOC_WOLSKI = `PREZYDENT MIASTA BYTOMIA
ogłasza drugi przetarg ustny nieograniczony na sprzedaż lokalu niemieszkalnego
(użytkowego) położonego w Bytomiu przy pl. Michała Wolskiego 6/9 o powierzchni
użytkowej 84,30 m2 wraz z piwnicą o powierzchni 12,50 m2 oraz udziałem w
nieruchomości gruntowej (działka nr 1234/56 o powierzchni 350 m2).
Cena wywoławcza nieruchomości wynosi 120 000,00 zł.
Wadium wynosi 12 000,00 zł.
Przetarg odbędzie się w dniu 7 maja 2026 r. o godzinie 10:00 w siedzibie Urzędu.`;

// Numeric date, bare "przetarg" (round 1), unlabelled area (fallback path).
const DOC_TESTOWA = `Prezydent Miasta Bytomia ogłasza przetarg ustny nieograniczony
na sprzedaż lokalu mieszkalnego położonego przy ul. Testowa 1/2.
Powierzchnia lokalu 45,60 m2, piwnica 8,00 m2, działka 200 m2.
Cena wywoławcza: 88 000 zł. Wadium: 8 800 zł.
Przetarg odbędzie się w dniu 15.06.2026 r.`;

test('parseAnnouncement: spelled-out date, labelled area, ignores cellar + plot', () => {
  const f = parseAnnouncement(DOC_WOLSKI);
  assert.equal(f.round, 2); // "drugi przetarg"
  assert.equal(f.auction_date, '2026-05-07'); // "7 maja 2026"
  assert.equal(f.area_m2, 84.3); // powierzchni użytkowej, NOT piwnica/działka
  assert.equal(f.starting_price_pln, 120000);
});

test('parseAnnouncement: numeric date, bare przetarg=1, fallback area picks the flat', () => {
  const f = parseAnnouncement(DOC_TESTOWA);
  assert.equal(f.round, 1);
  assert.equal(f.auction_date, '2026-06-15');
  assert.equal(f.area_m2, 45.6); // 8,00 (piwnica) + 200 (działka) excluded
  assert.equal(f.starting_price_pln, 88000);
});

test('parser helpers: empty/garbled text yields nulls, never throws', () => {
  assert.equal(roundFromText(''), null);
  assert.equal(auctionDateFromText(''), null);
  assert.equal(priceFromText('brak ceny'), null);
  assert.equal(areaFromText('bez metrażu'), null);
});

test('priceFromText handles dotted thousands "85.000,00 zł"', () => {
  assert.equal(priceFromText('Cena wywoławcza: 85.000,00 zł'), 85000);
});

// Regression (June 2026 review): re-listed announcements carry the mandatory
// history clause "Pierwszy przetarg odbył się … wynikiem negatywnym", which
// used to win the whole-text ordinal scan and mark every re-listed auction
// as round 1.
test('roundFromText: history clause does not override the operative round', () => {
  const second = `PREZYDENT MIASTA BYTOMIA
ogłasza drugi przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego.
Pierwszy przetarg odbył się w dniu 11 marca 2026 r. i zakończył się wynikiem
negatywnym. Przetarg odbędzie się w dniu 16 czerwca 2026 r.`;
  assert.equal(roundFromText(second), 2);
  // history clause BEFORE the operative sentence
  const historyFirst = `Pierwszy przetarg odbył się w dniu 11.03.2026 r. i zakończył się
wynikiem negatywnym. Drugi przetarg ustny nieograniczony odbędzie się w dniu 16.06.2026 r.`;
  assert.equal(roundFromText(historyFirst), 2);
  // "pierwszeństwo" (right of first refusal) is not an ordinal
  assert.equal(
    roundFromText('osobom, którym przysługuje pierwszeństwo w nabyciu, ogłasza przetarg ustny'),
    1,
  );
});

// ---- attachment URL extraction from a /idn page --------------------------

test('attachmentUrlFromDetail prefers .doc and resolves a relative href', () => {
  const html = `<a href="/bip/download/Ogloszenie-przetargu-pl.-Wolskiego-6_9,23775.doc">pobierz</a>
                <a href="/bip/download/mapa,1.pdf">mapa</a>`;
  assert.equal(
    attachmentUrlFromDetail(html),
    'https://www.bytom.pl/bip/download/Ogloszenie-przetargu-pl.-Wolskiego-6_9,23775.doc',
  );
});

test('attachmentUrlFromDetail keeps an absolute href and falls back to .pdf', () => {
  assert.equal(
    attachmentUrlFromDetail('<a href="https://www.bytom.pl/x,2.pdf">x</a>'),
    'https://www.bytom.pl/x,2.pdf',
  );
  assert.equal(attachmentUrlFromDetail('<a href="/foo">no attachment</a>'), null);
});

// Joint-lot titles ("ul. Strażacka 3 i ul. Podgórna 6/1" — one auction, one
// price): key on the FIRST address instead of swallowing the whole phrase
// into the street ("Strażacka 3 i ul. Podgórna", building 6).
test('joint two-address title keys on the first address', () => {
  const html = `<li class="aktualnosc__item">
    <span class="aktualnosci__data">2026-02-12</span>
    <a href="/bip/x/idn:12717">ul. Strażacka 3 i ul. Podgórna 6/1</a>
    <p class="aktualnosci__tresc">trzeci przetarg ustny nieograniczony na sprzedaż nieruchomości zabudowanej i lokalu niemieszkalnego (użytkowego)</p>
  </li>`;
  const items = parseBipList(html);
  assert.equal(items.length, 1);
  assert.equal(items[0].address.key, 'strazacka|3|');
  assert.equal(items[0].address.street, 'Strażacka');
  assert.equal(items[0].address_raw, 'ul. Strażacka 3 i ul. Podgórna 6/1');
});
