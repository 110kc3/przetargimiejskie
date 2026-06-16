// Gliwice city-BIP (bip.gliwice.eu) parser tests. crawl-bip.js reads the
// Prezydent Miasta sale board — clean server-rendered HTML, distinct from the
// ZGM Elementor board. Fixtures reproduce the real June/July 2026 markup
// (verified against the live pages): a bundled multi-lokal announcement, a
// single-lokal Skarb-Państwa page (title-only address), and działka pages
// (now each emit one 'grunt' LAND record routed to build-land.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseBipSaleDoc, stripBip, foldBipDuplicates } from '../src/cities/gliwice/crawl-bip.js';
import { parseAddress } from '../src/core/normalize.js';
import { landKey } from '../src/core/build-land.js';

// A bundled announcement: header date in word form, two lokale + one garaż.
// `m&sup2;` and `m<sup>2</sup>` both appear in the wild — exercise both, plus a
// genitive street name ("Świętojańskiej") and the missing-grosze price form.
const BUNDLE_HTML = `
<html><head><title>SPRZEDA&Zdot; – przetarg 6.07.2026 - ul. ŚWIĘTOJAŃSKA 39/3 - BIP Gliwice</title></head>
<body>
<h1>SPRZEDA&Zdot; – przetarg 6.07.2026</h1>
<p>Prezydent Miasta Gliwice</p>
<p>og&loz;asza</p>
<p>6 lipca 2026 r. w Zak&loz;adzie Gospodarki Mieszkaniowej przy pl. Inwalid&oacute;w Wojennych 3 (II piętro, pok&oacute;j nr 4) odbędą się przetargi na sprzedaż niżej wymienionych nieruchomości:</p>

<p>o godz. 9.00 rozpocznie się III ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego nr 10 usytuowanego w budynku przy ul. IGNACEGO DASZYŃSKIEGO 65</p>
<p>POWIERZCHNIA LOKALU: 51,59 m&sup2;</p>
<p>POWIERZCHNIA POMIESZCZENIA PRZYNALEŻNEGO – piwnica: 7,38 m<sup>2</sup></p>
<p>CENA WYWOŁAWCZA NIERUCHOMOŚCI: 214 080,00 zł</p>
<p>Wadium: 10 800,00 zł</p>

<p>o godz. 9.30 rozpocznie się II ustny przetarg nieograniczony na sprzedaż lokalu użytkowego nr 12 usytuowanego w budynku przy ul. CHORZOWSKIEJ 40</p>
<p>POWIERZCHNIA LOKALU: 49,00 m<sup>2</sup></p>
<p>CENA WYWOŁAWCZA NIERUCHOMOŚCI: 131 850,00 zł</p>

<p>o godz. 10.00 rozpocznie się II ustny przetarg nieograniczony na sprzedaż garażu nr 1 usytuowanego w budynku przy ul. KOZIELSKIEJ 13</p>
<p>POWIERZCHNIA GARAŻU: 16,92 m<sup>2</sup></p>
<p>CENA WYWOŁAWCZA NIERUCHOMOŚCI: 44 820,00 zł</p>

<p>o godz. 10.30 rozpocznie się II ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego nr 5 usytuowanego w budynku przy Al. PRZYJAŹNI 9</p>
<p>POWIERZCHNIA LOKALU: 40,00 m<sup>2</sup></p>
<p>CENA WYWOŁAWCZA NIERUCHOMOŚCI: 150 000,00 zł</p>
</body></html>`;

// Single lokal: address lives only in the title, price has no grosze.
const SINGLE_HTML = `
<html><head><title>SPRZEDAŻ – lokal mieszkalny przy ul. Chodkiewicza 12/11(własność Skarbu Państwa) - BIP Gliwice</title></head>
<body>
<p>21 sierpnia 1997 r. o gospodarce nieruchomościami</p>
<p>rozpocznie się 22 czerwca 2026 r. o godz. 14.00 w siedzibie Urzędu Miejskiego w Gliwicach I ustny przetarg nieograniczony na zbycie prawa własności lokalu mieszkalnego nr 11, stanowiącego własność Skarbu Państwa, o powierzchni użytkowej 24,34 m<sup>2</sup></p>
<p>o powierzchni 2,13 m<sup>2</sup> (piwnica)</p>
<p>Cena wywoławcza brutto za prawo własności nieruchomości: 180 557 zł</p>
</body></html>`;

// A działka (land) page — sale of "prawa własności nieruchomości" obejmującej a
// "(nie)zabudowaną działkę nr …", NO lokal. Emits one 'grunt' record (parcel +
// obręb + address from the title; price/round from the body) for build-land.js.
const DZIALKA_HTML = `
<html><head><title>SPRZEDAŻ – działka nr 736, obręb Sikornik, ul. Czajki 7 - BIP Gliwice</title></head>
<body>
<p>Prezydent Miasta Gliwice ogłasza I ustny przetarg nieograniczony na sprzedaż prawa własności nieruchomości</p>
<p>4 sierpnia 2026 r. … odbędą się przetargi … obejmującej zabudowaną działkę nr 736, obręb Sikornik, o powierzchni 0,0703 ha.</p>
<p>Cena wywoławcza nieruchomości (brutto): 691 100,00 zł</p>
</body></html>`;

// The live BIP-only plot the MSIP export misses (slug "sprzedaz-dz-nr-722-…",
// so isBipDetailUrl in crawl-land.js — which only matches "sprzedaz-dzialka-" —
// skips it). Title uses "dz. nr 72/2"; a prior attempt date (17 marca) must NOT
// win over the scheduled "rozpocznie się 14 lipca 2026".
const DZ722_HTML = `
<html><head><title>SPRZEDAŻ – dz. nr 72/2, obręb Nowe Gliwice, ul. Pszczyńska 204 - BIP Gliwice</title></head>
<body>
<p>Prezydent Miasta Gliwice … ogłasza II ustny przetarg nieograniczony na sprzedaż prawa własności nieruchomości</p>
<p>14 lipca 2026 r. … rozpocznie się II ustny przetarg nieograniczony na sprzedaż prawa własności części nieruchomości położonej w Gliwicach przy ul. Pszczyńskiej 204, obejmującej zabudowaną działkę nr 72/2, obręb Nowe Gliwice (identyfikator: 246601_1.0037.72/2), o powierzchni 0,0350 ha, stanowiącą własność Miasta Gliwice.</p>
<p>Cena wywoławcza nieruchomości (brutto): 601 000,00 zł</p>
<p>I ustny przetarg nieograniczony odbył się 17 marca 2026 r.</p>
<p>Przetarg rozpocznie się 14 lipca 2026 r.</p>
</body></html>`;

test('stripBip decodes entities including &sup2; and numeric refs', () => {
  const t = stripBip('Inwalid&oacute;w 51,59 m&sup2; &#8211; ok');
  assert.match(t, /Inwalidów/);
  assert.match(t, /m²/);
  assert.match(t, /–/);
});

test('bundled announcement → one listing per lokal, with figures and rounds', () => {
  const out = parseBipSaleDoc(BUNDLE_HTML, 'https://bip.gliwice.eu/sprzedaz-przetarg-6072026-x', 'SPRZEDAŻ – przetarg 6.07.2026 - x');
  assert.equal(out.length, 4);

  // "przy Al. Przyjaźni 9" (aleja, capitalised) must be captured, not dropped.
  const przy = out.find((l) => l.address.key === 'przyjazni|9|5');
  assert.ok(przy, 'al. Przyjaźni flat parsed');
  assert.equal(przy.starting_price_pln, 150000);

  const dasz = out.find((l) => l.address.key === 'ignacego daszynskiego|65|10');
  assert.ok(dasz, 'Daszyńskiego flat parsed');
  assert.equal(dasz.kind, 'mieszkalny');
  assert.equal(dasz.auction_date, '2026-07-06');
  assert.equal(dasz.round, 3);
  assert.equal(dasz.area_m2, 51.59); // lokal area, NOT the 7,38 m² basement
  assert.equal(dasz.starting_price_pln, 214080);
  assert.equal(dasz.detail_url, 'https://bip.gliwice.eu/sprzedaz-przetarg-6072026-x');

  const chorz = out.find((l) => l.kind === 'uzytkowy');
  assert.equal(chorz.address.key, 'chorzowskiej|40|12');
  assert.equal(chorz.round, 2);
  assert.equal(chorz.area_m2, 49);
  assert.equal(chorz.starting_price_pln, 131850);

  const garaz = out.find((l) => l.kind === 'garaz');
  assert.equal(garaz.address.key, 'kozielskiej|13|garaz-1');
  assert.equal(garaz.area_m2, 16.92);
  assert.equal(garaz.starting_price_pln, 44820);
});

test('single-lokal page → title address + integer (no-grosze) price', () => {
  const out = parseBipSaleDoc(SINGLE_HTML, 'https://bip.gliwice.eu/sprzedaz-lokal-mieszkalny-przy-ul-chodkiewicza-1211', 'SPRZEDAŻ – lokal mieszkalny przy ul. Chodkiewicza 12/11(własność Skarbu Państwa) - BIP Gliwice');
  assert.equal(out.length, 1);
  const l = out[0];
  assert.equal(l.address.key, 'chodkiewicza|12|11');
  assert.equal(l.kind, 'mieszkalny');
  assert.equal(l.auction_date, '2026-06-22'); // from "rozpocznie się 22 czerwca 2026", not the 1997 statute
  assert.equal(l.round, 1);
  assert.equal(l.area_m2, 24.34); // użytkowej area, not the 2,13 piwnica
  assert.equal(l.starting_price_pln, 180557);
});

test('działka (land) page → one grunt record (parcel + obręb + price)', () => {
  const out = parseBipSaleDoc(
    DZIALKA_HTML,
    'https://bip.gliwice.eu/sprzedaz-dzialka-nr-736-obreb-sikornik-ul-czajki-7-1',
    'SPRZEDAŻ – działka nr 736, obręb Sikornik, ul. Czajki 7 - BIP Gliwice',
  );
  assert.equal(out.length, 1);
  const g = out[0];
  assert.equal(g.kind, 'grunt');
  assert.equal(g.dzialka_nr, '736');
  assert.equal(g.obreb, 'Sikornik');
  assert.equal(g.address_raw, 'ul. Czajki 7');
  assert.equal(g.auction_date, '2026-08-04');
  assert.equal(g.starting_price_pln, 691100);
  assert.equal(g.round, 1);
  assert.equal(g.source, 'bip');
  assert.equal(g.detail_url, 'https://bip.gliwice.eu/sprzedaz-dzialka-nr-736-obreb-sikornik-ul-czajki-7-1');
  assert.ok(!('address' in g), 'land records carry address_raw only, no parsed address');
});

test('BIP-only działka (dz. nr 72/2, Pszczyńska 204) → grunt the MSIP export misses', () => {
  const out = parseBipSaleDoc(
    DZ722_HTML,
    'https://bip.gliwice.eu/sprzedaz-dz-nr-722-obreb-nowe-gliwice-ul-pszczynska-204',
    'SPRZEDAŻ – dz. nr 72/2, obręb Nowe Gliwice, ul. Pszczyńska 204 - BIP Gliwice',
  );
  assert.equal(out.length, 1);
  const g = out[0];
  assert.equal(g.kind, 'grunt');
  assert.equal(g.dzialka_nr, '72/2');
  assert.equal(g.obreb, 'Nowe Gliwice');
  assert.equal(g.address_raw, 'ul. Pszczyńska 204');
  assert.equal(g.starting_price_pln, 601000);
  assert.equal(g.auction_date, '2026-07-14'); // scheduled date, not the 17 marca prior attempt
  assert.equal(g.round, 2);
  assert.equal(g.source, 'bip');
  // build-land.js keys on dz|<obreb>|<parcel> → folds with the MSIP twin if present.
  assert.equal(landKey(g), 'dz|nowe gliwice|72/2');
});


const zgm = (raw, date, url) => ({
  kind: 'mieszkalny', address_raw: raw, address: parseAddress(raw),
  auction_date: date, area_m2: 50, starting_price_pln: 100000, round: 2, detail_url: url,
});
const bip = (raw, date, url) => ({ ...zgm(raw, date, url), source: 'bip', detail_url: url });

test('foldBipDuplicates: BIP twin of a ZGM auction becomes bip_url, not a row', () => {
  const out = foldBipDuplicates([
    zgm('Świętojańska 39/3', '2026-07-06', 'https://zgm-gliwice.pl/swietojanska-39-3'),
    bip('ŚWIĘTOJAŃSKIEJ 39/3', '2026-07-06', 'https://bip.gliwice.eu/sprzedaz-x'),
  ]);
  assert.equal(out.length, 1, 'duplicate folded, not doubled');
  assert.equal(out[0].detail_url, 'https://zgm-gliwice.pl/swietojanska-39-3'); // ZGM stays primary
  assert.equal(out[0].bip_url, 'https://bip.gliwice.eu/sprzedaz-x');           // BIP as secondary
});

test('foldBipDuplicates: bridges full-vs-short street name (Daszyńskiego)', () => {
  const out = foldBipDuplicates([
    zgm('Daszyńskiego 65/10', '2026-07-06', 'https://zgm-gliwice.pl/d'),
    bip('IGNACEGO DASZYŃSKIEGO 65/10', '2026-07-06', 'https://bip.gliwice.eu/b'),
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].bip_url, 'https://bip.gliwice.eu/b');
});

test('foldBipDuplicates: BIP-only auction (no ZGM twin) is kept as its own row', () => {
  const out = foldBipDuplicates([
    zgm('Zwycięstwa 8/12', '2026-07-06', 'https://zgm-gliwice.pl/z'),
    bip('Chodkiewicza 12/11', '2026-06-22', 'https://bip.gliwice.eu/c'),
  ]);
  assert.equal(out.length, 2);
  const ch = out.find((l) => l.address.key === 'chodkiewicza|12|11');
  assert.ok(ch && ch.source === 'bip' && !ch.bip_url);
});

test('foldBipDuplicates: same unit but different date stays a separate auction', () => {
  const out = foldBipDuplicates([
    zgm('Lompy 7/7', '2026-03-23', 'https://zgm-gliwice.pl/l'),
    bip('LOMPY 7/7', '2026-06-22', 'https://bip.gliwice.eu/l2'),
  ]);
  assert.equal(out.length, 2); // different dates → two real auctions
});
