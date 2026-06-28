// Gniezno parser tests.
//
// Fixtures grounded in LIVE data fetched from bip.gniezno.eu and gniezno.eu
// on 2026-06-27. The BIP and city site can't be reached from CI sandboxes, so
// the pure parsers are exercised against captured markup / article text.
//
// BIP HTML: IDcom.pl CMS — each entry is
//   <div class="contener"><p class="title"><a href="...">TITLE</a></p></div>
//   No inline date or description; filter is on title keyword only.
//
// gniezno.eu result notices (two real examples):
//   Sienkiewicza 19/8  — IV przetarg, sold, 106 885 zł (cena wywoławcza 105 825 zł)
//   Chrobrego 11/5A    — III przetarg, negative (brak wpłaty wadium)

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isFlatSaleTitle,
  parseBipList,
  roundFromTitle,
  pdfAttachmentUrlsFromDetail,
  parseResultNotice,
  parseResultDoc,
  parseAnnouncement,
} from '../src/cities/gniezno/parse.js';

// ---- isFlatSaleTitle --------------------------------------------------------

test('isFlatSaleTitle: flat-sale titles are accepted', () => {
  // "Sprzedaż - ul. X/N" shorthand (most common on bip.gniezno.eu)
  assert.equal(isFlatSaleTitle('Sprzedaż - ul. Wyszyńskiego 18/14 (WM.6840.21.2024)'), true);
  assert.equal(isFlatSaleTitle('Sprzedaż - ul. Chrobrego 11/5A (WM.6840.22.2024)'), true);
  // Long-form with "lokal mieszkalny"
  assert.equal(
    isFlatSaleTitle(
      'Ogłoszenie o pierwszym przetargu ustnym nieograniczonym na sprzedaż lokalu stanowiącego własność Miasta Gniezna - niewyodrębniony lokal mieszkalny nr 9 usytuowany w budynku położonym w Gnieźnie przy ul. Sienkiewicza 10 (WM.6840.26.2024)',
    ),
    true,
  );
});

test('isFlatSaleTitle: non-flat titles are rejected', () => {
  // Land / plots
  assert.equal(
    isFlatSaleTitle('Ogłoszenie o I przetargu ustnym nieograniczonym na sprzedaż nieruchomości niezabudowanych, położonych w Gnieźnie przy ulicy Leopolda Staffa i Marii Dąbrowskiej (WM.6840.9.2025)'),
    false,
  );
  assert.equal(
    isFlatSaleTitle('Ogłoszenie przy przetargu na sprzedaż działek przy ul. Staffa i Dąbrowskiej – WM.6840.9.2025'),
    false,
  );
  // Najem (rental)
  assert.equal(
    isFlatSaleTitle('Ogłoszenie o przetargu na najem lokali do remontu (WZ.7140.94.2025) - 23.10.2025'),
    false,
  );
  // Bezprzetargowy najem (direct / auto)
  assert.equal(
    isFlatSaleTitle('Ogłoszenie o bezprzetargowym najmie powierzchni na automaty w Hali Widowiskowo Sportowej II przy ul. Sportowej 5, 62 200 Gniezno'),
    false,
  );
  // Change notice for najem
  assert.equal(
    isFlatSaleTitle('Zmiana ogłoszenia o przetargu na najem lokali do remontu (WZ.7140.94.2025) - 23.10.2025'),
    false,
  );
});

// ---- parseBipList -----------------------------------------------------------

// Minimal BIP listing HTML reconstructed from the real IDcom.pl CMS markup
// observed on bip.gniezno.eu/wiadomosci/11287/lista/1/2025 (2026-06-27).
// Structure: <div class="contener"><p class="title"><a href="URL">TITLE</a></p></div>
const BIP_LISTING_HTML = `
<div id="Content">
  <div class="contener">
    <p class="title"><a href="https://bip.gniezno.eu/wiadomosci/11287/wiadomosc/857226/ogloszenie_przy_przetargu_na_sprzedaz_dzialek_przy_ul_staffa_i_d">Ogłoszenie przy przetargu na sprzedaż działek przy ul. Staffa i Dąbrowskiej – WM.6840.9.2025</a></p>
  </div>
  <div class="contener">
    <p class="title"><a href="https://bip.gniezno.eu/wiadomosci/11287/wiadomosc/805965/sprzedaz__ul_wyszynskiego_1814_wm6840212024">Sprzedaż - ul. Wyszyńskiego 18/14 (WM.6840.21.2024)</a></p>
  </div>
  <div class="contener">
    <p class="title"><a href="https://bip.gniezno.eu/wiadomosci/11287/wiadomosc/777722/sprzedaz__ul_chrobrego_115a_wm6840222024">Sprzedaż - ul. Chrobrego 11/5A (WM.6840.22.2024)</a></p>
  </div>
  <div class="contener">
    <p class="title"><a href="https://bip.gniezno.eu/wiadomosci/11287/wiadomosc/849996/ogloszenie_o_bezprzetargowym_najmie_powierzchni_na_automaty_w_ha">Ogłoszenie o bezprzetargowym najmie powierzchni na automaty w Hali Widowiskowo Sportowej II przy ul. Sportowej 5, 62 200 Gniezno</a></p>
  </div>
  <div class="contener">
    <p class="title"><a href="https://bip.gniezno.eu/wiadomosci/11287/wiadomosc/843600/ogloszenie_o_przetargu_na_najem_lokali_do_remontu">Ogłoszenie o przetargu na najem lokali do remontu (WZ.7140.94.2025) - 23.10.2025</a></p>
  </div>
  <div class="contener">
    <p class="title"><a href="https://bip.gniezno.eu/wiadomosci/11287/wiadomosc/832100/ogloszenie_o_pierwszym_przetargu_lokal_sienkiewicza">Ogłoszenie o pierwszym przetargu ustnym nieograniczonym na sprzedaż lokalu stanowiącego własność Miasta Gniezna - niewyodrębniony lokal mieszkalny nr 9 usytuowany w budynku położonym w Gnieźnie przy ul. Sienkiewicza 10 (WM.6840.26.2024)</a></p>
  </div>
  <div class="contener">
    <p class="title"><a href="https://bip.gniezno.eu/wiadomosci/11287/wiadomosc/857290/sprzedaz_nieruchomosci_niezabudowanej">Ogłoszenie o I przetargu ustnym nieograniczonym na sprzedaż nieruchomości niezabudowanych, położonych w Gnieźnie przy ulicy Leopolda Staffa i Marii Dąbrowskiej (WM.6840.9.2025)</a></p>
  </div>
</div>`;

test('parseBipList: keeps only flat-sale entries, drops land / najem / automaty', () => {
  const items = parseBipList(BIP_LISTING_HTML);
  assert.equal(items.length, 3, 'three flat-sale entries; land/najem/automaty dropped');
});

test('parseBipList: extracts correct URLs and titles', () => {
  const items = parseBipList(BIP_LISTING_HTML);
  const wys = items.find((i) => /Wyszyńskiego/.test(i.title));
  assert.ok(wys, 'Wyszyńskiego entry must be present');
  assert.equal(wys.detail_url, 'https://bip.gniezno.eu/wiadomosci/11287/wiadomosc/805965/sprzedaz__ul_wyszynskiego_1814_wm6840212024');

  const chr = items.find((i) => /Chrobrego/.test(i.title));
  assert.ok(chr, 'Chrobrego entry must be present');
  assert.equal(chr.detail_url, 'https://bip.gniezno.eu/wiadomosci/11287/wiadomosc/777722/sprzedaz__ul_chrobrego_115a_wm6840222024');

  const sie = items.find((i) => /Sienkiewicza/.test(i.title));
  assert.ok(sie, 'Sienkiewicza long-form entry must be present');
  assert.match(sie.detail_url, /wiadomosc\/832100/);
});

test('parseBipList: round from long-form "pierwszym" title = 1', () => {
  const items = parseBipList(BIP_LISTING_HTML);
  const sie = items.find((i) => /Sienkiewicza/.test(i.title));
  assert.equal(sie.round, 1);
});

test('parseBipList: round from "Sprzedaż - ul." shorthand title = null (multi-round, no ordinal)', () => {
  const items = parseBipList(BIP_LISTING_HTML);
  const wys = items.find((i) => /Wyszyńskiego/.test(i.title));
  // The "Sprzedaż - ul." entries don't carry an explicit round; null is correct.
  assert.equal(wys.round, null);
});

test('parseBipList: empty / non-matching HTML yields []', () => {
  assert.deepEqual(parseBipList(''), []);
  assert.deepEqual(parseBipList('<html><body>nic</body></html>'), []);
});

// ---- roundFromTitle ---------------------------------------------------------

test('roundFromTitle: Roman numerals in "X przetarg" pattern', () => {
  assert.equal(roundFromTitle('IV przetarg ustny nieograniczony na sprzedaż …'), 4);
  assert.equal(roundFromTitle('II przetarg …'), 2);
  assert.equal(roundFromTitle('III przetarg …'), 3);
  assert.equal(roundFromTitle('I przetarg …'), 1);
});

test('roundFromTitle: Polish ordinals', () => {
  assert.equal(roundFromTitle('Ogłoszenie o pierwszym przetargu ustnym nieograniczonym na sprzedaż lokalu'), 1);
  assert.equal(roundFromTitle('Ogłoszenie o drugim przetargu …'), 2);
  assert.equal(roundFromTitle('trzecim przetargu …'), 3);
  assert.equal(roundFromTitle('czwartym przetargu …'), 4);
});

test('roundFromTitle: no recognisable ordinal → null', () => {
  assert.equal(roundFromTitle('Sprzedaż - ul. Wyszyńskiego 18/14 (WM.6840.21.2024)'), null);
  assert.equal(roundFromTitle(''), null);
  assert.equal(roundFromTitle(null), null);
});

// ---- pdfAttachmentUrlsFromDetail --------------------------------------------

// Reconstructed from the real BIP detail page for ul. Wyszyńskiego 18/14
// (wiadomosc/805965), observed 2026-06-27. The page carries 8 attachments:
// alternating ogłoszenie/wynik PDFs from I to IV przetarg + unieważnienie.
const DETAIL_HTML = `
<section id="Attachments">
  <h2 class="section-title">Załączniki</h2>
  <a href="https://bip-v1-files.idcom-jst.pl/sites/47165/wiadomosci/805965/files/1._ogoszenie_o_i_przetargu-1.pdf">
    <span>412.64</span><span>pdf</span><span>Pobierz</span>
  </a>
  <a href="https://bip-v1-files.idcom-jst.pl/sites/47165/wiadomosci/805965/files/2._wynik_i_p.pdf">
    <span>72.5</span><span>pdf</span><span>Pobierz</span>
  </a>
  <a href="https://bip-v1-files.idcom-jst.pl/sites/47165/wiadomosci/805965/files/3._ogoszenie_o_ii_przetargu.pdf">
    <span>412.87</span><span>pdf</span><span>Pobierz</span>
  </a>
  <a href="https://bip-v1-files.idcom-jst.pl/sites/47165/wiadomosci/805965/files/4._wynik_ii_p.pdf">
    <span>72.63</span><span>pdf</span><span>Pobierz</span>
  </a>
  <a href="https://bip-v1-files.idcom-jst.pl/sites/47165/wiadomosci/805965/files/5._ogoszenie_o_iii_przetargu.pdf">
    <span>415.97</span><span>pdf</span><span>Pobierz</span>
  </a>
  <a href="https://bip-v1-files.idcom-jst.pl/sites/47165/wiadomosci/805965/files/6._wynik_iii_p.pdf">
    <span>72.88</span><span>pdf</span><span>Pobierz</span>
  </a>
  <a href="https://bip-v1-files.idcom-jst.pl/sites/47165/wiadomosci/805965/files/7._ogloszenie_o_iv_przetargu.pdf">
    <span>413.09</span><span>pdf</span><span>Pobierz</span>
  </a>
  <a href="https://bip-v1-files.idcom-jst.pl/sites/47165/wiadomosci/805965/files/uniewaznienie_przetargu.pdf">
    <span>72.81</span><span>pdf</span><span>Pobierz</span>
  </a>
</section>`;

test('pdfAttachmentUrlsFromDetail: extracts all 8 PDF URLs in document order', () => {
  const urls = pdfAttachmentUrlsFromDetail(DETAIL_HTML);
  assert.equal(urls.length, 8);
  assert.match(urls[0], /1\._ogoszenie_o_i_przetargu/);
  assert.match(urls[1], /2\._wynik_i_p/);
  assert.match(urls[6], /7\._ogloszenie_o_iv_przetargu/);
  assert.match(urls[7], /uniewaznienie_przetargu/);
});

test('pdfAttachmentUrlsFromDetail: no duplicate URLs', () => {
  const urls = pdfAttachmentUrlsFromDetail(DETAIL_HTML + DETAIL_HTML); // duped HTML
  assert.equal(urls.length, 8, 'dedup: only 8 unique URLs despite doubled HTML');
});

test('pdfAttachmentUrlsFromDetail: empty / non-BIP HTML → []', () => {
  assert.deepEqual(pdfAttachmentUrlsFromDetail(''), []);
  assert.deepEqual(pdfAttachmentUrlsFromDetail('<a href="/some/other.pdf">file</a>'), []);
});

test('pdfAttachmentUrlsFromDetail: decodes &amp; in href', () => {
  const html = '<a href="https://bip-v1-files.idcom-jst.pl/sites/47165/wiadomosci/1/files/x.pdf?a=1&amp;b=2">f</a>';
  const urls = pdfAttachmentUrlsFromDetail(html);
  assert.equal(urls.length, 1);
  assert.ok(!urls[0].includes('&amp;'), 'should decode &amp; to &');
});

// ---- parseResultNotice (gniezno.eu HTML result notices) ---------------------

// FIXTURE 1: Sold result — IV przetarg, Sienkiewicza 19/8 (WM.6840.26.2024)
// Source: https://www.gniezno.eu/wiadomosci/1/wiadomosc/237765/...
// Fetched live 2026-06-27. Article text extracted from <article> tag.
const RESULT_SOLD = `Przetarg na sprzedaż lokalu mieszkalnego przy ulicy Sienkiewicza - wynik

Prezydent Miasta Gniezna 24 czerwca 2025 roku ogłosił IV przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 8, położonego w Gnieźnie przy ulicy Sienkiewicza 19, stanowiącego własność Miasta Gniezna wraz z udziałem w nieruchomości gruntowej oznaczonej geodezyjnie jako działka nr 63 na ark. 28 dla której Sąd Rejonowy w Gnieźnie prowadzi księgę wieczystą pod oznaczeniem PO1G/00001656/5.

Wadium prawidłowo wpłaciła jedna osoba, która została dopuszczona do uczestnictwa w przetargu.

Cena wywoławcza wynosiła 105 825,00 zł. Najwyższa cena osiągnięta w przetargu wyniosła 106 885,00 zł.

Nabywcą został Pan Roman Stachowiak.

Przetarg zakończył się wynikiem pozytywnym.`;

// FIXTURE 2: Negative result — III przetarg, Chrobrego 11/5A (WM.6840.22.2024)
// Source: https://www.gniezno.eu/wiadomosci/1/wiadomosc/235852/...
// Fetched live 2026-06-27.
const RESULT_NEGATIVE = `Przetarg na sprzedaż lokalu mieszkalnego przy ulicy Chrobrego - wynik

Prezydent Miasta Gniezna 3 kwietnia 2025 roku ogłosił III przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 5A, położonego w Gnieźnie przy ulicy Chrobrego 11, wraz z udziałem w nieruchomości gruntowej oznaczonej geodezyjnie jako działka nr 14 na ark. 28 dla której Sąd Rejonowy w Gnieźnie prowadzi księgę wieczystą pod oznaczeniem PO1G/00029923/0.

Komisja ustaliła brak wpłaty wadium upoważniającego do wzięcia udziału w przetargu.

Przetarg zakończył się wynikiem negatywnym.`;

const SOLD_URL = 'https://www.gniezno.eu/wiadomosci/1/wiadomosc/237765/przetarg_na_sprzedaz_lokalu_mieszkalnego_przy_ulicy_sienkiewicza';
const NEG_URL = 'https://www.gniezno.eu/wiadomosci/1/wiadomosc/235852/przetarg_na_sprzedaz_lokalu_mieszkalnego_przy_ulicy_chrobrego__w';

test('parseResultNotice: sold — Sienkiewicza 19/8, round=4, prices, outcome=sold', () => {
  const recs = parseResultNotice(RESULT_SOLD, SOLD_URL);
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.auction_date, '2025-06-24');
  assert.equal(r.round, 4);
  assert.equal(r.address_raw, 'ul. Sienkiewicza 19/8');
  assert.ok(r.address, 'address must parse successfully');
  assert.equal(r.address.key, 'sienkiewicza|19|8');
  assert.equal(r.address.street, 'Sienkiewicza');
  assert.equal(r.address.building, '19');
  assert.equal(r.address.apt, '8');
  assert.equal(r.starting_price_pln, 105825);
  assert.equal(r.final_price_pln, 106885);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.unsold_reason, null);
  assert.equal(r.source_pdf, SOLD_URL);
  assert.equal(r.area_m2, null); // not in gniezno.eu notice
});

test('parseResultNotice: negative — Chrobrego 11/5A, round=3, outcome=unsold', () => {
  const recs = parseResultNotice(RESULT_NEGATIVE, NEG_URL);
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.auction_date, '2025-04-03');
  assert.equal(r.round, 3);
  assert.equal(r.address_raw, 'ul. Chrobrego 11/5A');
  assert.ok(r.address, 'address must parse successfully');
  assert.equal(r.address.key, 'chrobrego|11|5A');
  assert.equal(r.address.apt, '5A');
  assert.equal(r.starting_price_pln, null); // not stated on negative result notice
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'brak_uczestnikow');
  assert.equal(r.source_pdf, NEG_URL);
});

test('parseResultNotice: empty/garbled text returns []', () => {
  assert.deepEqual(parseResultNotice('', SOLD_URL), []);
  assert.deepEqual(parseResultNotice('Brak danych.', SOLD_URL), []);
});

// parseResultDoc is the contract wrapper for parseResultNotice
test('parseResultDoc delegates to parseResultNotice (same results)', () => {
  const fromNotice = parseResultNotice(RESULT_SOLD, SOLD_URL);
  const fromDoc = parseResultDoc(RESULT_SOLD, null, SOLD_URL);
  assert.deepEqual(fromDoc, fromNotice);
});

// ---- parseAnnouncement (ogłoszenie PDF text parser) -------------------------

// Synthetic ogłoszenie text in the standard Polish vocabulary.
// Gniezno announcements are text-PDFs; pdftotext -layout output is prose.
// This fixture combines real field patterns from the Gniezno format with
// the standard vocabulary shared across all Polish municipal flat auctions.
const ANNOUNCE_TEXT = `PREZYDENT MIASTA GNIEZNA
ogłasza II przetarg ustny nieograniczony na sprzedaż lokalu stanowiącego własność
Miasta Gniezna - niewyodrębniony lokal mieszkalny nr 8 usytuowany w budynku
położonym w Gnieźnie przy ul. Sienkiewicza 19, o powierzchni użytkowej 42,50 m2
wraz z udziałem w nieruchomości gruntowej.
Cena wywoławcza nieruchomości wynosi 105 825,00 zł.
Wadium wynosi 10 583,00 zł.
Przetarg odbędzie się w dniu 24.06.2025 r. o godz. 10:00 w siedzibie
Urzędu Miejskiego w Gnieźnie.`;

const ANNOUNCE_ORDINAL = `PREZYDENT MIASTA GNIEZNA
ogłasza trzeci przetarg ustny nieograniczony na sprzedaż lokalu mieszkalnego nr 5A
przy ul. Chrobrego 11 w Gnieźnie, o powierzchni użytkowej 38,20 m2 wraz z piwnicą
o powierzchni 6,40 m2 oraz udziałem w nieruchomości gruntowej (działka nr 14 o pow. 280 m2).
Cena wywoławcza lokalu wynosi 88 000,00 zł.
Przetarg odbędzie się w dniu 3 kwietnia 2025 r.`;

test('parseAnnouncement: round from Roman "II przetarg", numeric date, labelled area, price', () => {
  const f = parseAnnouncement(ANNOUNCE_TEXT);
  assert.equal(f.round, 2);
  assert.equal(f.auction_date, '2025-06-24');
  assert.equal(f.area_m2, 42.5);
  assert.equal(f.starting_price_pln, 105825);
});

test('parseAnnouncement: round from ordinal "trzeci przetarg"=3, spelled-out date, labelled area ignores cellar + plot', () => {
  const f = parseAnnouncement(ANNOUNCE_ORDINAL);
  assert.equal(f.round, 3);
  assert.equal(f.auction_date, '2025-04-03'); // "3 kwietnia 2025"
  assert.equal(f.area_m2, 38.2, 'flat area 38,20 — not cellar 6,40 nor plot 280');
  assert.equal(f.starting_price_pln, 88000);
});

test('parseAnnouncement: empty text returns all-null fields, never throws', () => {
  const f = parseAnnouncement('');
  assert.equal(f.round, null);
  assert.equal(f.auction_date, null);
  assert.equal(f.area_m2, null);
  assert.equal(f.starting_price_pln, null);
});

test('parseAnnouncement: address_raw extracted from "przy ul." pattern', () => {
  const f = parseAnnouncement(ANNOUNCE_TEXT);
  assert.ok(f.address_raw, 'address_raw should be extracted');
  assert.match(f.address_raw, /Sienkiewicza/);
});
