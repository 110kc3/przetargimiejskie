// Bytom v2 parser tests. The live BIP list and i-BIIP catalog can't be reached
// from CI sandboxes (DNS-restricted), so we exercise the two parsers against
// fixtures that reproduce the real markup observed in a browser (May-2026).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseBipList, parseCatalog, parseCatalogLand, attachmentUrlFromDetail } from '../src/cities/bytom/crawl.js';
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
${li({ date: '2026-05-13', href: 'https://www.bytom.pl/bip/zbycie-nieruchomosci-bytom/sprzedaz-lokali-mieszkalnych/ul.-Katowicka-448/idn:13500', addr: 'ul. Katowicka 44/8', desc: 'Prezydent Bytomia oglasza trzeci przetarg ustny nieograniczony na sprzedaz lokalu mieszkalnego z ulamkowa niewydzielona czescia dzialki gruntu, polozonego w Bytomiu przy ul. Katowickiej 44/8.' })}
${li({ date: '2026-05-22', href: 'https://www.bytom.pl/bip/zbycie-nieruchomosci-bytom/sprzedaz-lokali-niemieszkalnych/pl.-Wolskiego-69/idn:13490', addr: 'pl. Michala Wolskiego 6/9', desc: 'Prezydent Bytomia oglasza przetarg ustny nieograniczony na sprzedaz lokalu niemieszkalneg z ulamkowa niewydzielona czescia dzialki gruntu, polozonego w Bytomiu przy pl. Michala Wolskiego 6/9.' })}
${li({ date: '2026-03-09', href: 'https://www.bytom.pl/bip/zbycie-nieruchomosci-bytom/sprzedaz-lokali-mieszkalnych/ul.-Wyspianskiego-59/idn:13450', addr: 'ul. Wyspianskiego 5/9', desc: 'Prezydent Bytomia oglasza drugi przetarg ustny nieograniczony na sprzedaz lokalu mieszkalnego polozonego w Bytomiu przy ul. Wyspianskiego 5/9.' })}
${li({ date: '2026-05-29', href: 'https://www.bytom.pl/bip/zbycie-nieruchomosci-bytom/sprzedaz-nieruchomosci-niezabudowane/ul.-Zgrzebnioka-dzialka-1923182/idn:13424', addr: 'ul. Zgrzebnioka (dzialka 1923/182)', desc: 'Prezydent Bytomia oglasza drugi przetarg ustny nieograniczony na sprzedaz nieruchomosci gruntowej niezabudowanej polozonej w Bytomiu przy ul. Zgrzebnioka' })}
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

// Garage-plot SALES ("sprzedaż działki gruntu pod garażem") live ONLY on the
// BIP list (no i-BIIP catalog row). They were dropped twice: kindFromText
// returned null (no "mieszkaln"/"niemieszkaln") and the dz./działka address
// guard discarded the parcel-bearing title. Live examples (June 2026):
//   ul. Reja (działka gruntu nr 2237/14)  -- auction 2026-05-06
//   ul. Witczaka (dz. 3143/37)            -- auction 2026-02-13
const BIP_GARAGE_HTML = `<ul class="aktualnosci">
${li({ date: '2026-05-06', href: 'https://www.bytom.pl/bip/zbycie-nieruchomosci-bytom/sprzedaz-dzialki-pod-garazami/ul.-Reja-dzialka-gruntu-nr-223714/idn:13230', addr: 'ul. Reja (dzialka gruntu nr 2237/14)', desc: 'Prezydent Bytomia oglasza przetarg ustny ograniczony na sprzedaz dzialki gruntu pod garazem, polozonej w Bytomiu przy ul. Reja (dzialka gruntu nr 2237/14)' })}
${li({ date: '2026-02-13', href: 'https://www.bytom.pl/bip/zbycie-nieruchomosci-bytom/sprzedaz-dzialki-pod-garazami/ul.-Witczaka-dz.-314337/idn:12731', addr: 'ul. Witczaka (dz. 3143/37)', desc: 'Prezydent Bytomia oglasza przetarg ustny ograniczony na sprzedaz dzialki gruntu pod garazem, polozonej w Bytomiu przy ul. Witczaka (dzialka gruntu nr 3143/37)' })}
${li({ date: '2026-05-25', href: 'https://www.bytom.pl/bip/zbycie-nieruchomosci-bytom/sprzedaz-nieruchomosci-zabudowane/-ul.-Gleboka-20-w-Parzymiechach/idn:13385', addr: 'ul. Gleboka 20 w Parzymiechach', desc: 'Prezydent Bytomia oglasza drugi przetarg ustny ograniczony na sprzedaz nieruchomosci gruntowej zabudowanej polozonej w Gminie Lipie, w miejscowosci Parzymiechy przy ul. Glebokiej 20.' })}
</ul>`;

test('parseBipList captures a garage-plot sale as kind=garaz, parcel-keyed', () => {
  const items = parseBipList(BIP_GARAGE_HTML);
  const garages = items.filter((i) => i.kind === 'garaz');
  assert.equal(garages.length, 2, 'both garage-plot sales must be captured');

  const reja = garages.find((g) => g.address.key === 'reja|2237|14');
  assert.ok(reja, 'Reja garage-plot must survive the dz./dzialka guard');
  assert.equal(reja.kind, 'garaz');
  assert.equal(reja.address.street, 'Reja'); // street only, parenthetical stripped
  assert.equal(reja.round, 1); // bare "przetarg" = first
  assert.equal(reja.published_date, '2026-05-06');
  assert.match(reja.detail_url, /\/idn:13230$/);

  const witczaka = garages.find((g) => g.address.key === 'witczaka|3143|37');
  assert.ok(witczaka, 'Witczaka garage-plot must survive the dz./dzialka guard');
  assert.equal(witczaka.address.street, 'Witczaka');
});

test('parseBipList: garage branch does not pull in land or the out-of-gmina house', () => {
  const items = parseBipList(BIP_GARAGE_HTML);
  // The Parzymiechy house (Gmina Lipie) has no "garaz" in its description, so
  // it stays dropped (out of scope -- different gmina).
  assert.ok(!items.some((i) => /gleboka/.test(i.address.key)), 'Parzymiechy house excluded');
  // Plain land sales still come only from the i-BIIP catalog, never this list.
  const land = parseBipList(BIP_HTML).filter((i) => /zgrzebnioka/.test(i.address.key));
  assert.equal(land.length, 0, 'niezabudowana grunt parcel still excluded from the BIP list');
});

// ---- i-BIIP catalog (price/area enrichment, now a Map) --------------------

const CATALOG_HTML = `<main>
  <div><p><strong>ADRES:</strong> ul. Katowicka 44/8</p>
  <p><strong>TYP:</strong> lokal mieszkalny</p>
  <p><strong>ETAP SPRZEDAZY:</strong> III Przetarg</p>
  <p><strong>TERMIN PRZETARGU:</strong> 2026-06-16</p>
  <p><strong>CENA WYWOLAWCZA:</strong> 85000</p>
  <p><strong>POWIERZCHNIA:</strong> 53.77</p>
  <p><strong>LINK:</strong> <a href="https://www.bytom.pl/bip/download/Ogloszenie-przetargu-ul.-Katowicka-44-8,23643.doc">doc</a></p></div>
  <div><p><strong>ADRES:</strong> Matki Ewy dz. 5742/32</p>
  <p><strong>TYP:</strong> grunty niezabudowane</p>
  <p><strong>ETAP SPRZEDAZY:</strong> II Przetarg</p>
  <p><strong>TERMIN PRZETARGU:</strong> 2026-06-08</p>
  <p><strong>CENA WYWOLAWCZA:</strong> 15375</p>
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

// Spelled-out month, labelled area, cellar + plot present (must be ignored).
const DOC_WOLSKI = `PREZYDENT MIASTA BYTOMIA
oglasza drugi przetarg ustny nieograniczony na sprzedaz lokalu niemieszkalneg
(uzytkowego) polozonego w Bytomiu przy pl. Michala Wolskiego 6/9 o powierzchni
uzytkowej 84,30 m2 wraz z piwnica o powierzchni 12,50 m2 oraz udzialem w
nieruchomosci gruntowej (dzialka nr 1234/56 o powierzchni 350 m2).
Cena wywolawcza nieruchomosci wynosi 120 000,00 zl.
Wadium wynosi 12 000,00 zl.
Przetarg odbedzie sie w dniu 7 maja 2026 r. o godzinie 10:00 w siedzibie Urzedu.`;

// Numeric date, bare "przetarg" (round 1), unlabelled area (fallback path).
const DOC_TESTOWA = `Prezydent Miasta Bytomia oglasza przetarg ustny nieograniczony
na sprzedaz lokalu mieszkalnego polozonego przy ul. Testowa 1/2.
Powierzchnia lokalu 45,60 m2, piwnica 8,00 m2, dzialka 200 m2.
Cena wywolawcza: 88 000 zl. Wadium: 8 800 zl.
Przetarg odbedzie sie w dniu 15.06.2026 r.`;

test('parseAnnouncement: spelled-out date, labelled area, ignores cellar + plot', () => {
  const f = parseAnnouncement(DOC_WOLSKI);
  assert.equal(f.round, 2); // "drugi przetarg"
  assert.equal(f.auction_date, '2026-05-07'); // "7 maja 2026"
  assert.equal(f.area_m2, 84.3); // powierzchni uzytkowej, NOT piwnica/dzialka
  assert.equal(f.starting_price_pln, 120000);
});

test('parseAnnouncement: numeric date, bare przetarg=1, fallback area picks the flat', () => {
  const f = parseAnnouncement(DOC_TESTOWA);
  assert.equal(f.round, 1);
  assert.equal(f.auction_date, '2026-06-15');
  assert.equal(f.area_m2, 45.6); // 8,00 (piwnica) + 200 (dzialka) excluded
  assert.equal(f.starting_price_pln, 88000);
});

test('parser helpers: empty/garbled text yields nulls, never throws', () => {
  assert.equal(roundFromText(''), null);
  assert.equal(auctionDateFromText(''), null);
  assert.equal(priceFromText('brak ceny'), null);
  assert.equal(areaFromText('bez metrazу'), null);
});

test('priceFromText handles dotted thousands "85.000,00 zl"', () => {
  assert.equal(priceFromText('Cena wywolawcza: 85.000,00 zl'), 85000);
});

// Regression (June 2026 review): re-listed announcements carry the mandatory
// history clause "Pierwszy przetarg odbyl sie ... wynikiem negatywnym", which
// used to win the whole-text ordinal scan and mark every re-listed auction
// as round 1.
test('roundFromText: history clause does not override the operative round', () => {
  const second = `PREZYDENT MIASTA BYTOMIA
oglasza drugi przetarg ustny nieograniczony na sprzedaz lokalu mieszkalnego.
Pierwszy przetarg odbyl sie w dniu 11 marca 2026 r. i zakonczyl sie wynikiem
negatywnym. Przetarg odbedzie sie w dniu 16 czerwca 2026 r.`;
  assert.equal(roundFromText(second), 2);
  // history clause BEFORE the operative sentence
  const historyFirst = `Pierwszy przetarg odbyl sie w dniu 11.03.2026 r. i zakonczyl sie
wynikiem negatywnym. Drugi przetarg ustny nieograniczony odbedzie sie w dniu 16.06.2026 r.`;
  assert.equal(roundFromText(historyFirst), 2);
  // "pierwszenstwo" (right of first refusal) is not an ordinal
  assert.equal(
    roundFromText('osobom, ktorym przysluguje pierwszenstwo w nabyciu, oglasza przetarg ustny'),
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

// Joint-lot titles ("ul. Strazacka 3 i ul. Podgorna 6/1" -- one auction, one
// price): key on the FIRST address instead of swallowing the whole phrase
// into the street ("Strazacka 3 i ul. Podgorna", building 6).
test('joint two-address title keys on the first address', () => {
  const html = `<li class="aktualnosc__item">
    <span class="aktualnosci__data">2026-02-12</span>
    <a href="/bip/x/idn:12717">ul. Strazacka 3 i ul. Podgorna 6/1</a>
    <p class="aktualnosci__tresc">trzeci przetarg ustny nieograniczony na sprzedaz nieruchomosci zabudowanej i lokalu niemieszkalneg (uzytkowego)</p>
  </li>`;
  const items = parseBipList(html);
  assert.equal(items.length, 1);
  assert.equal(items[0].address.key, 'strazacka|3|');
  assert.equal(items[0].address.street, 'Strazacka');
  assert.equal(items[0].address_raw, 'ul. Strazacka 3 i ul. Podgorna 6/1');
});

// ---- parseCatalogLand (i-BIIP catalog land rows) --------------------------
//
// Fixtures reproduce the real <p><strong>LABEL:</strong> value</p> block
// structure observed in the i-BIIP catalog (June 2026).
//
// One "grunty niezabudowane" row (with dz. parcel in address)
// and one "grunty zabudowane" row (the previous bug: was silently dropped).
const CATALOG_LAND_HTML = `<main>
  <div>
    <p><strong>ADRES:</strong> Alfonsa Zgrzebnioka dz. 1922/182</p>
    <p><strong>TYP:</strong> grunty niezabudowane</p>
    <p><strong>ETAP SPRZEDAZY:</strong> II Przetarg</p>
    <p><strong>TERMIN PRZETARGU:</strong> 2026-07-02</p>
    <p><strong>CENA WYWOLAWCZA:</strong> 134 000</p>
    <p><strong>POWIERZCHNIA:</strong> 1451</p>
    <p><strong>LINK:</strong> <a href="https://www.bytom.pl/bip/zbycie-nieruchomosci-bytom/sprzedaz-nieruchomosci-niezabudowane/ul.-Zgrzebnioka-dzialka-nr-1922182/idn:13423">BIP</a></p>
    <a href="https://sitplan.um.bytom.pl/?profile=4939&amp;selection=3928711:GDB$G_NIER_DO_ZBYCIA_SOWA_N.e8be8caa">geoportal</a>
  </div>
  <div>
    <p><strong>ADRES:</strong> Boleslawa Prusa 31a</p>
    <p><strong>TYP:</strong> grunty zabudowane</p>
    <p><strong>ETAP SPRZEDAZY:</strong> II Przetarg</p>
    <p><strong>TERMIN PRZETARGU:</strong> 2026-07-06</p>
    <p><strong>CENA WYWOLAWCZA:</strong> 475 000</p>
    <p><strong>POWIERZCHNIA:</strong> 763</p>
    <p><strong>LINK:</strong> <a href="https://www.bytom.pl/bip/download/Ogloszenie-przetargu-ul.-Prusa-31a-ustny-II,23485.doc">doc</a></p>
    <a href="https://sitplan.um.bytom.pl/?profile=4939&amp;selection=3928711:GDB$G_NIER_DO_ZBYCIA_SOWA_N.8444961f">geoportal</a>
  </div>
  <div>
    <p><strong>ADRES:</strong> pl. Michala Wolskiego 6/9</p>
    <p><strong>TYP:</strong> lokal mieszkalny</p>
    <p><strong>ETAP SPRZEDAZY:</strong> I Przetarg</p>
    <p><strong>TERMIN PRZETARGU:</strong> 2026-06-16</p>
    <p><strong>CENA WYWOLAWCZA:</strong> 85000</p>
    <p><strong>POWIERZCHNIA:</strong> 53.77</p>
    <p><strong>LINK:</strong> <a href="https://www.bytom.pl/bip/download/x,1.doc">doc</a></p>
  </div>
</main>`;

test('parseCatalogLand returns both grunty niezabudowane AND grunty zabudowane rows', () => {
  const land = parseCatalogLand(CATALOG_LAND_HTML);
  assert.equal(land.length, 2, 'should include both niezabudowane and zabudowane; lokal mieszkalny excluded');
});

test('parseCatalogLand: grunty niezabudowane row -- parcel, street, price, area, round, zoning', () => {
  const land = parseCatalogLand(CATALOG_LAND_HTML);
  const zgrzeb = land.find((r) => r.dzialka_nr === '1922/182');
  assert.ok(zgrzeb, 'Zgrzebnioka parcel must be present');
  assert.equal(zgrzeb.kind, 'grunt');
  assert.equal(zgrzeb.street, 'Alfonsa Zgrzebnioka');
  assert.equal(zgrzeb.zoning, 'niezabudowana');
  assert.equal(zgrzeb.area_m2, 1451);
  assert.equal(zgrzeb.starting_price_pln, 134000);
  assert.equal(zgrzeb.auction_date, '2026-07-02');
  assert.equal(zgrzeb.round, 2);
  assert.match(zgrzeb.detail_url, /idn:13423/);
  assert.match(zgrzeb.geoportal_url, /sitplan\.um\.bytom\.pl/);
});

test('parseCatalogLand: grunty zabudowane row -- previously dropped, now included', () => {
  const land = parseCatalogLand(CATALOG_LAND_HTML);
  const prusa = land.find((r) => /prusa/i.test(r.street));
  assert.ok(prusa, 'Prusa 31a (grunty zabudowane) must NOT be dropped');
  assert.equal(prusa.kind, 'grunt');
  assert.equal(prusa.zoning, 'zabudowana');
  assert.equal(prusa.dzialka_nr, null); // no "dz." in the address
  assert.equal(prusa.starting_price_pln, 475000);
  assert.equal(prusa.area_m2, 763);
  assert.equal(prusa.round, 2);
  assert.match(prusa.detail_url, /Prusa-31a.*\.doc$/);
});

test('parseCatalogLand: empty HTML returns empty array without throwing', () => {
  assert.deepEqual(parseCatalogLand(''), []);
  assert.deepEqual(parseCatalogLand('<html><body>nothing here</body></html>'), []);
});
