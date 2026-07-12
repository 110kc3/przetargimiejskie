// Strzelce Opolskie (GZMK, gzmk.pl) parser tests. Fixtures are condensed-but-
// faithful copies of REAL notice pages fetched live from gzmk.pl (this Pi,
// 2026-07-12), wrapped in the site's actual fast4net article shell
// (<div id="text_content"> with <div class="mar3"><b>Label:</b></div> /
// <div class="mar10">value</div> field pairs, an inline "ZAWIADOMIENIE"
// prose result block on concluded notices, then <div class="table_file"> and
// the <div id="div_up"> registry). Every sentence/value that feeds a parsed
// field (status, address, parcel, area, price, date, round, outcome) is kept
// verbatim; long non-load-bearing boilerplate (zoning notes, wadium-handling
// procedure, KW/notarial clauses) is trimmed.
//
// Groundtruth (hand-verified against the live pages; ids are the gzmk.pl
// article ids in the `,14,<id>` URL tail):
//   x,14,1000 Kalinowice dz. 294/7 (grunt) — LIVE announce, Status: ogłoszony,
//             0,1660 ha, cena wyw. 110 000 zł netto, auction 12.08.2026, round I
//   x,14,900  Krakowska 13/6 (lokal mieszkalny nr 6, 46,42 m²) — round I,
//             cena wyw. 180 000 zł, auction 12.07.2023, INLINE result negatywny
//   x,14,911  Krakowska 13/6 — round II (18.09.2023), INLINE result negatywny;
//             the SAME flat as round I → must key identically (krakowska|13|6)
//   x,14,986  Szymiszów dz. 861/1 (grunt) — round I (15.01.2026), INLINE result
//             SOLD "za cenę 90.000 zł" (cena wyw. 85 000 → osiągnięta 90 000)
//   x,14,985  Grodzisko dz. 174/2 (grunt, przetarg OGRANICZONY) — SOLD 3.300 zł
//   x,14,991  Rozmierka ul. Strzelecka 33 (zabudowana) — round I (27.05.2026),
//             INLINE result negatywny (żadne wadium)
//   x,14,992  Kalinowice dz. 294/7 (grunt) — round I (12.05.2026), negatywny

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parsePLN,
  parseArea,
  parseDateText,
  roundFromTitle,
  extractOutcome,
  extractStatus,
  extractTextContent,
  extractPublishedDate,
  parseNotice,
  parseResultDoc,
} from '../src/cities/strzelce-opolskie/parse.js';

// --------------------------------------------------------------- fixtures

// Reproduce the real fast4net article shell: the ordered mar3/mar10 field pairs
// inside <div id="text_content">, an optional prose block, then the attachment
// table + registry footer (carrying "Informację wprowadził(a): … (DATE …)").
function gzmkPage({ title, fields, prose = '', pubDate = '2026-01-01' }) {
  const rows = [`<div class="mar10"><b>${title}</b></div>`];
  for (const [label, value] of fields) {
    rows.push(`<div class="mar3"><b>${label}:</b></div>`);
    const v = label === 'Status'
      ? `<span class="${value === 'ogłoszony' ? 'col_green' : 'col_red'}">${value}</span>`
      : value;
    rows.push(`<div class="mar10">${v}</div>`);
  }
  if (prose) rows.push(`<div class="mar10">${prose}</div>`);
  rows.push('<div class=""><strong><h3 class="col_text marup20 mar3">Pliki do pobrania:</h3></strong></div>');
  return `<!DOCTYPE html><html><head><title>Przetargi na sprzedaż nieruchomości - ${title} - BIP GZMK w Strzelcach Opolskich</title></head><body>
<div id="mid"><div id="tresc" class="mar20">
<div id="text_content"><div style="background:url('x.jpg')">
<div class="mar3"><b></b></div>
${rows.join('\n')}
</div>
<div class="mar5"></div></div>
<div class="table_file"><div class="table_file_a f_left"><a href="../pl/download.php?id=9999&amp;path=../files/docs/">${title} (PDF, 100 KB)</a></div></div>
</div>
<div id="div_up" class="sub_boxx"><div id="registry" class="f_left">Rejestr zmian podstrony Informację wprowadził(a): Katarzyna Zielińska (${pubDate} 07:57:45) Liczba odwiedzin: 42</div></div>
</div></body></html>`;
}

// x,14,1000 — LIVE land announcement (Status: ogłoszony), no result yet.
const KALINOWICE_LIVE = gzmkPage({
  title: 'I ustny przetarg nieograniczony na sprzedaż działki budowlanej położonej w Kalinowicach',
  fields: [
    ['Status', 'ogłoszony'],
    ['Adres', ', 47-100 Kalinowice'],
    ['Nr działki', '294/7'],
    ['Nr księgi wieczystej', 'OP1S/00044229/9'],
    ['Powierzchnia', '0,1660 ha'],
    ['Plan zagospodarowania przestrzennego', 'MN3-teren zabudowy mieszkaniowej jednorodzinnej'],
    ['Cena wywoławcza (netto)', '110 000,00 zł'],
    ['Data przetargu', '12 sierpień 2026'],
    ['Kwota wadium', '11 000,00 zł'],
    ['Data wniesienia wadium', '7 sierpień 2026, 14:00'],
  ],
  pubDate: '2026-07-01',
});

// x,14,900 — flat, round I, INLINE negative result.
const KRAKOWSKA1 = gzmkPage({
  title: 'I ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego nr 6 położonego w budynku przy ul. Krakowskiej 13 w Strzelcach Opolskich',
  fields: [
    ['Status', 'rozstrzygnięty'],
    ['Adres', 'Krakowska, 47-100 Strzelce Opolskie'],
    ['Nr działki', '1897/8 i 1897/7'],
    ['Nr księgi wieczystej', 'OP1S/00056112/3 i OP1S/00040527/0'],
    ['Powierzchnia', '0,0270ha i 0,0459ha'],
    ['Cena wywoławcza (netto)', '180 000,00 zł'],
    ['Data przetargu', '12 lipiec 2023, 10:00'],
    ['Kwota wadium', '18 000,00 zł'],
    ['Data wniesienia wadium', '6 lipiec 2023, 14:00'],
  ],
  prose:
    'ZAWIADOMIENIE BURMISTRZA STRZELEC OPOLSKICH Ogłoszony na dzień 12.07.2023r. i przeprowadzony w Urzędzie Miejskim w Strzelcach Opolskich, I ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego nr 6 o pow. użytkowej 46,42m² stanowiącego własność gminy Strzelce Opolskie, położonego na parterze budynku przy ul. Krakowskiej 13 w Strzelcach Opolskich wraz z przynależną piwnicą o pow. 5,10 m², zakończył się wynikiem negatywnym. Cena wywoławcza nieruchomości wynosiła 180.000 zł.',
  pubDate: '2023-06-07',
});

// x,14,911 — the SAME flat, round II, negative (must key identically).
const KRAKOWSKA2 = gzmkPage({
  title: 'II ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego przy ul. Krakowskiej 13/6 w Strzelcach Op.',
  fields: [
    ['Status', 'rozstrzygnięty'],
    ['Adres', 'ul. Krakowska 13, 47-100 Strzelce Opolskie'],
    ['Nr działki', '1897/8 w udziale 1043/10.000cz. 1897/7 w udziale 616/10.000cz.'],
    ['Nr księgi wieczystej', 'OP1S/00056112/3 i OP1S/00040527/0'],
    ['Powierzchnia', '0,0270ha i 0,0459ha'],
    ['Cena wywoławcza (netto)', '180 000,00 zł'],
    ['Data przetargu', '18 wrzesień 2023, 10:00'],
    ['Kwota wadium', '18 000,00 zł'],
    ['Data wniesienia wadium', '12 wrzesień 2023, 14:00'],
  ],
  prose:
    'ZAWIADOMIENIE BURMISTRZA STRZELEC OPOLSKICH Ogłoszony na dzień 18.09.2023r. i przeprowadzony w Urzędzie Miejskim w Strzelcach Opolskich, II ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego nr 6 o pow. użytkowej 46,42m² położonego na parterze budynku przy ul. Krakowskiej 13, zakończył się wynikiem negatywnym. W oznaczonym terminie wskazanym w ogłoszeniu, nie zostało wpłacone żadne wadium.',
  pubDate: '2023-08-16',
});

// x,14,986 — land, round I, INLINE SOLD result ("za cenę 90.000 zł").
const SZYMISZOW = gzmkPage({
  title: 'I ustny przetarg nieograniczony na sprzedaż działki nr 861/1 położonej w Szymiszowie',
  fields: [
    ['Status', 'rozstrzygnięty'],
    ['Adres', '1-go Maja, 47-100 Szymiszów'],
    ['Nr działki', '861/1'],
    ['Nr księgi wieczystej', 'OP1S/00029961/1'],
    ['Powierzchnia', '0,0902ha'],
    ['Cena wywoławcza (netto)', '85 000,00 zł'],
    ['Data przetargu', '15 styczeń 2026, 10:00'],
    ['Kwota wadium', '8 500,00 zł'],
    ['Data wniesienia wadium', '9 styczeń 2026, 14:00'],
  ],
  prose:
    'ZAWIADOMIENIE BURMISTRZA STRZELEC OPOLSKICH Ogłoszony na dzień 15 stycznia 2026r. i przeprowadzony I ustny przetarg nieograniczony na sprzedaż działki nr 861/1 położonej w Szymiszowie. Za nabywcę nieruchomości będącej przedmiotem przetargu uznano Pana Aleksandra Bugiel, za cenę 90.000 zł.',
  pubDate: '2025-12-09',
});

// x,14,985 — land, restricted tender (przetarg ograniczony), INLINE SOLD.
const GRODZISKO = gzmkPage({
  title: 'I ustny przetarg ograniczony na sprzedaż działki nr 174/2 położonej w Grodzisku',
  fields: [
    ['Status', 'rozstrzygnięty'],
    ['Adres', ', 47-100 Grodzisko'],
    ['Nr działki', '174/2'],
    ['Nr księgi wieczystej', 'OP1S/00054260/1'],
    ['Powierzchnia', '0,0048ha'],
    ['Cena wywoławcza', '3 000,00 zł'],
    ['Data przetargu', '14 styczeń 2026, 10:00'],
    ['Kwota wadium', '300,00 zł'],
    ['Data wniesienia wadium', '7 styczeń 2026, 14:00'],
  ],
  prose:
    'ZAWIADOMIENIE BURMISTRZA STRZELEC OPOLSKICH Ogłoszony na dzień 14 stycznia 2026r. i przeprowadzony I ustny przetarg ograniczony na sprzedaż działki nr 174/2 położonej w Grodzisku. Za nabywcę nieruchomości będącej przedmiotem przetargu uznano Pana Antoniego Graipel, za cenę 3.300 zł.',
  pubDate: '2025-12-08',
});

// x,14,991 — whole built property (zabudowana), round I, negative.
const ROZMIERKA = gzmkPage({
  title: 'I ustny przetarg nieograniczony na sprzedaż nieruchomości zabudowanej położonej w Rozmierce przy ul. Strzeleckiej 33 (byłe przedszkole)',
  fields: [
    ['Status', 'rozstrzygnięty'],
    ['Adres', 'ul. Strzelecka 33, 47-100 Rozmierka'],
    ['Nr działki', 'nr 102/4, nr 101/2, nr 101/3 i nr 99/2'],
    ['Nr księgi wieczystej', 'OP1S/00012341/7'],
    ['Powierzchnia', '0,0467ha'],
    ['Cena wywoławcza (netto)', '530 000,00 zł'],
    ['Data przetargu', '27 maj 2026, 10:00'],
    ['Kwota wadium', '53 000,00 zł'],
    ['Data wniesienia wadium', '21 maj 2026, 14:00'],
  ],
  prose:
    'ZAWIADOMIENIE BURMISTRZA STRZELEC OPOLSKICH Ogłoszony na dzień 27 maja 2026r. i przeprowadzony I ustny przetarg nieograniczony na sprzedaż nieruchomości zabudowanej położonej w Rozmierce przy ul. Strzeleckiej 33, zakończył się wynikiem negatywnym. W oznaczonym terminie nie zostało wpłacone żadne wadium.',
  pubDate: '2026-04-15',
});

// x,14,992 — land, round I, negative.
const KALINOWICE_NEG = gzmkPage({
  title: 'I ustny przetarg nieograniczony na sprzedaż nieruchomości gminnej położonej w Kalinowicach',
  fields: [
    ['Status', 'rozstrzygnięty'],
    ['Adres', ', 47-100 Kalinowice'],
    ['Nr działki', '294/7'],
    ['Nr księgi wieczystej', 'OP1S/00044229/9'],
    ['Powierzchnia', '0,1660'],
    ['Cena wywoławcza (netto)', '130 000,00 zł'],
    ['Data przetargu', '12 maj 2026, 10:00'],
    ['Kwota wadium', '13 000,00 zł'],
    ['Data wniesienia wadium', '6 maj 2026'],
  ],
  prose:
    'ZAWIADOMIENIE BURMISTRZA STRZELEC OPOLSKICH Ogłoszony na dzień 12 maja 2026r. i przeprowadzony I ustny przetarg nieograniczony na sprzedaż nieruchomości gminnej położonej w Kalinowicach oznaczonej działką nr 294/7 z mapy 2 o pow. 0,1660ha, zakończył się wynikiem negatywnym. Cena wywoławcza nieruchomości wynosiła 130.000zł. +23% Vat. W oznaczonym terminie wskazanym w ogłoszeniu, nie zostało wpłacone żadne wadium.',
  pubDate: '2026-04-09',
});

// -------------------------------------------------------------- unit funcs

test('parsePLN: space-thousands (netto price) and dot-thousands (inline hammer price)', () => {
  assert.equal(parsePLN('110 000,00'), 110000);
  assert.equal(parsePLN('180 000,00'), 180000);
  assert.equal(parsePLN('90.000'), 90000);
  assert.equal(parsePLN('3.300'), 3300);
  assert.equal(parsePLN('130.000'), 130000);
  assert.equal(parsePLN('brak'), null);
});

test('parseArea: comma/dot decimal separators (ha and m²)', () => {
  assert.equal(parseArea('0,1660'), 0.166);
  assert.equal(parseArea('46,42'), 46.42);
  assert.equal(parseArea('0.0467'), 0.0467);
});

test('parseDateText: nominative structured month, genitive prose month, numeric', () => {
  assert.equal(parseDateText('12 sierpień 2026'), '2026-08-12'); // nominative (structured field)
  assert.equal(parseDateText('18 wrzesień 2023, 10:00'), '2023-09-18');
  assert.equal(parseDateText('15 stycznia 2026r.'), '2026-01-15'); // genitive (prose)
  assert.equal(parseDateText('12.07.2023r.'), '2023-07-12'); // numeric
  assert.equal(parseDateText('brak daty'), null);
});

test('roundFromTitle: declension-tolerant "I/II ustny przetarg", null when no round', () => {
  assert.equal(roundFromTitle('I ustny przetarg nieograniczony na sprzedaż działki'), 1);
  assert.equal(roundFromTitle('II ustny przetarg nieograniczony na sprzedaż lokalu mieszkalnego'), 2);
  assert.equal(roundFromTitle('I ustny przetarg ograniczony na sprzedaż działki nr 174/2'), 1);
  assert.equal(roundFromTitle('Przetarg nieograniczony na sprzedaż nieruchomości gminnej'), null);
});

test('extractStatus / extractTextContent / extractPublishedDate: real fast4net container', () => {
  const body = extractTextContent(KALINOWICE_LIVE);
  assert.ok(body.includes('110 000,00 zł'), `expected price in body: ${body.slice(0, 160)}`);
  assert.equal(extractStatus(body), 'ogloszony');
  assert.equal(extractStatus(extractTextContent(KRAKOWSKA1)), 'rozstrzygniety');
  assert.equal(extractPublishedDate(KRAKOWSKA1), '2023-06-07');
});

test('extractOutcome: sold ("za cenę …"), negative ("wynikiem negatywnym"/"żadne wadium"), open', () => {
  assert.deepEqual(extractOutcome(extractTextContent(SZYMISZOW)), { outcome: 'sold', final_price_pln: 90000, unsold_reason: null });
  assert.deepEqual(extractOutcome(extractTextContent(GRODZISKO)), { outcome: 'sold', final_price_pln: 3300, unsold_reason: null });
  assert.deepEqual(extractOutcome(extractTextContent(KRAKOWSKA1)), { outcome: 'unsold', final_price_pln: null, unsold_reason: 'wynik negatywny' });
  assert.deepEqual(extractOutcome(extractTextContent(KALINOWICE_NEG)), { outcome: 'unsold', final_price_pln: null, unsold_reason: 'brak wadium' });
  assert.equal(extractOutcome(extractTextContent(KALINOWICE_LIVE)).outcome, 'open');
});

// ---------------------------------------------------------- parseNotice (announcements)

test('parseNotice: Kalinowice dz. 294/7 (x,14,1000) — LIVE land announce, grunt, parcel-keyed, ha→m², nominative-month date', () => {
  const r = parseNotice(KALINOWICE_LIVE, 'https://gzmk.pl/bw/x,14,1000');
  assert.equal(r.kind, 'grunt');
  assert.equal(r.status, 'ogloszony');
  assert.equal(r.address, null);
  assert.equal(r.dzialka_nr, '294/7');
  assert.equal(r.obreb, 'Kalinowice');
  assert.equal(r.area_m2, 1660); // 0,1660 ha × 10000
  assert.equal(r.starting_price_pln, 110000);
  assert.equal(r.auction_date, '2026-08-12');
  assert.equal(r.round, 1);
  assert.equal(r.published_date, '2026-07-01');
});

test('parseNotice: Krakowska 13/6 round I (x,14,900) — flat classified from BODY, street from Adres field, bldg+apt from title/prose, usable m² from prose', () => {
  const r = parseNotice(KRAKOWSKA1, 'https://gzmk.pl/bw/x,14,900');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.street, 'Krakowska');
  assert.equal(r.address.building, '13');
  assert.equal(r.address.apt, '6');
  assert.equal(r.address.key, 'krakowska|13|6');
  assert.equal(r.area_m2, 46.42); // prose "pow. użytkowej 46,42 m²", NOT the parcel share
  assert.equal(r.starting_price_pln, 180000);
  assert.equal(r.auction_date, '2023-07-12');
  assert.equal(r.round, 1);
});

test('parseNotice: Krakowska 13/6 round II (x,14,911) — SAME flat as round I → identical key; "13/6" bldg/apt + round II', () => {
  const r = parseNotice(KRAKOWSKA2, 'https://gzmk.pl/bw/x,14,911');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'krakowska|13|6');
  assert.equal(r.area_m2, 46.42);
  assert.equal(r.starting_price_pln, 180000);
  assert.equal(r.auction_date, '2023-09-18');
  assert.equal(r.round, 2);
});

test('parseNotice: Rozmierka ul. Strzelecka 33 (x,14,991) — whole built property classifies "zabudowana", address-keyed, area from structured Powierzchnia', () => {
  const r = parseNotice(ROZMIERKA, 'https://gzmk.pl/bw/x,14,991');
  assert.equal(r.kind, 'zabudowana');
  assert.equal(r.address.street, 'Strzelecka');
  assert.equal(r.address.building, '33');
  assert.equal(r.address.apt, null);
  assert.equal(r.address.key, 'strzelecka|33|');
  assert.equal(r.area_m2, 467); // 0,0467 ha × 10000
  assert.equal(r.starting_price_pln, 530000);
  assert.equal(r.auction_date, '2026-05-27');
  assert.equal(r.round, 1);
});

// ----------------------------------------------------------- parseResultDoc

test('parseResultDoc: Szymiszów dz. 861/1 (x,14,986) — INLINE SOLD land, parcel-keyed, hammer price 90 000 > starting 85 000', () => {
  const [r] = parseResultDoc(SZYMISZOW, null, 'https://gzmk.pl/bw/x,14,986');
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '861/1');
  assert.equal(r.obreb, 'Szymiszów');
  assert.equal(r.starting_price_pln, 85000);
  assert.equal(r.final_price_pln, 90000);
  assert.equal(r.outcome, 'sold');
  assert.equal(r.auction_date, '2026-01-15');
  assert.equal(r.source_pdf, 'https://gzmk.pl/bw/x,14,986');
});

test('parseResultDoc: Grodzisko dz. 174/2 (x,14,985) — restricted-tender SALE is a real result (SOLD 3 300 zł)', () => {
  const [r] = parseResultDoc(GRODZISKO, null, 'https://gzmk.pl/bw/x,14,985');
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '174/2');
  assert.equal(r.obreb, 'Grodzisko');
  assert.equal(r.starting_price_pln, 3000);
  assert.equal(r.final_price_pln, 3300);
  assert.equal(r.outcome, 'sold');
});

test('parseResultDoc: Krakowska 13/6 round I (x,14,900) — INLINE negative flat, real price/area/date, no fabricated final price', () => {
  const [r] = parseResultDoc(KRAKOWSKA1, null, 'https://gzmk.pl/bw/x,14,900');
  assert.equal(r.kind, 'mieszkalny');
  assert.equal(r.address.key, 'krakowska|13|6');
  assert.equal(r.area_m2, 46.42);
  assert.equal(r.starting_price_pln, 180000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.round, 1);
  assert.equal(r.auction_date, '2023-07-12');
});

test('parseResultDoc: Kalinowice dz. 294/7 (x,14,992) — negative land, "żadne wadium" reason', () => {
  const [r] = parseResultDoc(KALINOWICE_NEG, null, 'https://gzmk.pl/bw/x,14,992');
  assert.equal(r.kind, 'grunt');
  assert.equal(r.dzialka_nr, '294/7');
  assert.equal(r.obreb, 'Kalinowice');
  assert.equal(r.starting_price_pln, 130000);
  assert.equal(r.final_price_pln, null);
  assert.equal(r.outcome, 'unsold');
  assert.equal(r.unsold_reason, 'brak wadium');
  assert.equal(r.auction_date, '2026-05-12');
});

test('parseResultDoc: an OPEN announcement (Status: ogłoszony, no outcome) is NOT a result → []', () => {
  assert.deepEqual(parseResultDoc(KALINOWICE_LIVE, null, 'https://gzmk.pl/bw/x,14,1000'), []);
});

test('parseResultDoc: empty/null input returns []', () => {
  assert.deepEqual(parseResultDoc('', null, 'x'), []);
  assert.deepEqual(parseResultDoc(null, null, 'x'), []);
});
